import Anthropic from '@anthropic-ai/sdk';
import { config } from '../core/config';
import { createModuleLogger, measurePerformance } from '../utils/logger';
import { handleExternalAPIError } from '../utils/error-handler';
import { StudyProtocol, CRFSpecification, RiskAssessmentResult, TimelineResult } from '../types';

const logger = createModuleLogger('anthropic-client');

export class AnthropicClient {
  private client: Anthropic;
  private requestCount = 0;
  private lastRequestTime = 0;
  
  constructor() {
    this.client = new Anthropic({
      apiKey: config.anthropicApiKey,
      timeout: config.apiTimeout,
    });
  }
  
  /**
   * Rate limiting implementation
   */
  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    const minInterval = 60000 / config.apiRateLimit; // Convert to ms between requests
    
    if (timeSinceLastRequest < minInterval) {
      const waitTime = minInterval - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.lastRequestTime = Date.now();
    this.requestCount++;
  }
  
  /**
   * Retry logic with exponential backoff
   */
  private async withRetry<T>(operation: () => Promise<T>, maxRetries: number = 3): Promise<T> {
    let lastError: Error = new Error('Unknown error');
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        // Check if this is a retryable error
        if (this.isRetryableError(error)) {
          if (attempt < maxRetries) {
            const delay = this.calculateBackoffDelay(attempt);
            logger.warn(`API call failed, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries + 1})`, {
              error: (error as Error).message
            });
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
        }
        
        // If not retryable or max retries reached, throw the error
        throw error;
      }
    }
    
    throw lastError;
  }
  
  /**
   * Check if an error is retryable
   */
  private isRetryableError(error: any): boolean {
    if (error.message && typeof error.message === 'string') {
      const message = error.message.toLowerCase();
      return message.includes('overloaded') || 
             message.includes('rate limit') || 
             message.includes('timeout') ||
             message.includes('502') ||
             message.includes('503') ||
             message.includes('529');
    }
    return false;
  }
  
  /**
   * Calculate exponential backoff delay
   */
  private calculateBackoffDelay(attempt: number): number {
    const baseDelay = 1000; // 1 second
    const maxDelay = 30000; // 30 seconds
    const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
    // Add some jitter to prevent thundering herd
    return delay + Math.random() * 1000;
  }
  
  /**
   * Process clinical protocol document with retry logic
   */
  async processProtocol(protocolText: string): Promise<StudyProtocol> {
    return this.withRetry(async () => {
      await this.enforceRateLimit();
    
      const prompt = `You are a clinical data management expert. Analyze the following clinical study protocol and extract key information.

Protocol Text:
${protocolText}

Extract and structure the following information in JSON format:
1. Study title
2. Protocol number
3. Study phase
4. Investigational drug
5. Sponsor
6. Indication
7. Study design (type, duration, number of arms, description)
8. Primary objectives and endpoints
9. Secondary objectives and endpoints
10. Exploratory objectives and endpoints (if any)
11. Study population details
12. Visit schedule
13. Key inclusion criteria
14. Key exclusion criteria

Ensure all medical terminology is accurate and follow ICH-GCP guidelines for data extraction.`;
    
      try {
        const response = await measurePerformance(
          'anthropic.processProtocol',
          async () => {
            return await this.client.messages.create({
              model: 'claude-3-opus-20240229',
              max_tokens: 4096,
              temperature: 0,
              system: 'You are a clinical data management expert with extensive knowledge of ICH-GCP, FDA, and EMA guidelines. Provide accurate, structured clinical information.',
              messages: [
                {
                  role: 'user',
                  content: prompt,
                },
              ],
            });
          },
          { protocolLength: protocolText.length }
        );
        
        const content = response.content[0];
        if (content?.type === 'text') {
          try {
            // Extract JSON from the response
            const jsonMatch = content.text.match(/```json\n([\s\S]*?)\n```/);
            const jsonText = jsonMatch ? jsonMatch[1] : content.text;
            const parsedData = JSON.parse(jsonText);
            
            logger.info('Protocol processed successfully');
            return this.mapToStudyProtocol(parsedData);
          } catch (parseError) {
            logger.error('Failed to parse protocol response', { error: parseError });
            throw new Error('Failed to parse protocol analysis results');
          }
        }
        
        throw new Error('Unexpected response format from API');
      } catch (error) {
        throw handleExternalAPIError(error, 'Anthropic');
      }
    });
  }
  
  /**
   * Process CRF specifications
   */
  async processCRF(crfText: string): Promise<CRFSpecification[]> {
    return this.withRetry(async () => {
      await this.enforceRateLimit();
      
      const prompt = `You are a clinical data management expert. Analyze the following Case Report Form (CRF) specifications and extract structured information.

CRF Specifications:
${crfText}

Extract and structure the following for each CRF form in VALID JSON format:
1. Form name and OID
2. List of fields with:
   - Field name and OID
   - Field type (text, number, date, select, checkbox, radio)
   - Required status
   - Validation rules if any
   - CDISC mapping (domain, variable)
   - Normal ranges for lab values
3. Version information

Follow CDISC CDASH standards for field mapping where applicable.

IMPORTANT: Return ONLY valid JSON in the following structure:
[
  {
    "formName": "Demographics",
    "formOID": "DM",
    "version": "1.0",
    "fields": [
      {
        "fieldName": "Subject ID",
        "fieldOID": "SUBJID",
        "fieldType": "text",
        "required": true,
        "cdiscMapping": {
          "domain": "DM",
          "variable": "USUBJID"
        },
        "validation": null
      }
    ]
  }
]

Do not include any text before or after the JSON. Only return the JSON array.`;
      
      try {
        const response = await measurePerformance(
          'anthropic.processCRF',
          async () => {
            return await this.client.messages.create({
              model: 'claude-3-opus-20240229',
              max_tokens: 4096,
              temperature: 0,
              system: 'You are a clinical data standards expert with deep knowledge of CDISC SDTM, CDASH, and clinical data collection best practices.',
              messages: [
                {
                  role: 'user',
                  content: prompt,
                },
              ],
            });
          },
          { crfLength: crfText.length }
        );
        
        const content = response.content[0];
        if (content?.type === 'text') {
          try {
            logger.info('CRF API response received', { responseLength: content.text.length });
            
            // Try to extract JSON from code blocks first
            const jsonMatch = content.text.match(/```json\n([\s\S]*?)\n```/);
            let jsonText = jsonMatch ? jsonMatch[1] : content.text;
            
            // Clean up the text - remove any leading/trailing whitespace and text
            jsonText = jsonText?.trim() || '';
            
            // If it doesn't start with [ or {, try to find the JSON in the response
            if (!jsonText.startsWith('[') && !jsonText.startsWith('{')) {
              const jsonStart = content.text.indexOf('[');
              const jsonEnd = content.text.lastIndexOf(']');
              if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
                jsonText = content.text.substring(jsonStart, jsonEnd + 1);
              }
            }
            
            logger.info('Attempting to parse CRF JSON', { 
              jsonLength: jsonText.length,
              startsWithBracket: jsonText.startsWith('['),
              startsWithBrace: jsonText.startsWith('{')
            });
            
            const parsedData = JSON.parse(jsonText);
            
            logger.info('CRF processed successfully');
            return Array.isArray(parsedData) ? parsedData : [parsedData];
          } catch (parseError) {
            logger.error('Failed to parse CRF response', { 
              error: parseError,
              responseText: content.text.substring(0, 1000) + '...' // Log first 1000 chars
            });
            throw new Error(`Failed to parse CRF analysis results: ${(parseError as Error).message}`);
          }
        }
        
        throw new Error('Unexpected response format from API');
      } catch (error) {
        throw handleExternalAPIError(error, 'Anthropic');
      }
    });
  }
  
  /**
   * Generate risk assessment for the study
   */
  async generateRiskAssessment(
    protocol: StudyProtocol,
    crfs: CRFSpecification[]
  ): Promise<RiskAssessmentResult> {
    return this.withRetry(async () => {
      await this.enforceRateLimit();
      
      const prompt = `Based on the following study protocol and CRF specifications, generate a comprehensive data management risk assessment.

Study: ${protocol.studyTitle}
Phase: ${protocol.studyPhase}
Design: ${JSON.stringify(protocol.studyDesign)}
Population: ${JSON.stringify(protocol.population)}
Endpoints: ${JSON.stringify(protocol.endpoints)}

CRF Forms: ${crfs.map(crf => crf.formName).join(', ')}

Generate risk assessment covering:
1. Data quality risks
2. Timeline risks
3. Regulatory compliance risks
4. Technical/system risks
5. Resource risks

For each risk provide:
- Risk description
- Impact (low/medium/high)
- Likelihood (low/medium/high)
- Mitigation strategy`;
      
      try {
        const response = await this.client.messages.create({
          model: 'claude-3-opus-20240229',
          max_tokens: 2048,
          temperature: 0.2,
          system: 'You are a clinical data management risk assessment expert. Provide comprehensive, actionable risk assessments following ICH-GCP E6(R2) guidelines.',
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
        });
        
        const content = response.content[0];
        if (content?.type === 'text') {
          return this.parseRiskAssessment(content.text);
        }
        
        throw new Error('Unexpected response format from API');
      } catch (error) {
        throw handleExternalAPIError(error, 'Anthropic');
      }
    });
  }
  
  /**
   * Generate timeline estimation
   */
  async generateTimeline(
    protocol: StudyProtocol,
    enrollmentTarget: number
  ): Promise<TimelineResult> {
    return this.withRetry(async () => {
      await this.enforceRateLimit();
      
      const prompt = `Based on the following study information, generate a realistic data management timeline.

Study: ${protocol.studyTitle}
Phase: ${protocol.studyPhase}
Design: ${JSON.stringify(protocol.studyDesign)}
Target Enrollment: ${enrollmentTarget}
Visit Schedule: ${JSON.stringify(protocol.visitSchedule)}

Generate timeline milestones for:
1. Database build and UAT
2. First Patient First Visit (FPFV)
3. 50% enrollment
4. Last Patient First Visit (LPFV)
5. Last Patient Last Visit (LPLV)
6. Database soft lock
7. Database hard lock
8. Final data delivery

Consider typical timelines for ${protocol.studyPhase} studies in ${protocol.indication}.`;
      
      try {
        const response = await this.client.messages.create({
          model: 'claude-3-opus-20240229',
          max_tokens: 1024,
          temperature: 0.1,
          system: 'You are a clinical trial timeline expert. Provide realistic timelines based on industry standards and best practices.',
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
        });
        
        const content = response.content[0];
        if (content?.type === 'text') {
          return this.parseTimeline(content.text);
        }
        
        throw new Error('Unexpected response format from API');
      } catch (error) {
        throw handleExternalAPIError(error, 'Anthropic');
      }
    });
  }
  
  /**
   * Map parsed data to StudyProtocol type
   */
  private mapToStudyProtocol(data: any): StudyProtocol {
    return {
      studyTitle: data.studyTitle || '',
      protocolNumber: data.protocolNumber || '',
      studyPhase: data.studyPhase || '',
      investigationalDrug: data.investigationalDrug || '',
      sponsor: data.sponsor || '',
      indication: data.indication || '',
      studyDesign: data.studyDesign || {},
      objectives: data.objectives || { primary: [], secondary: [] },
      population: data.population || {},
      endpoints: data.endpoints || { primary: [], secondary: [] },
      visitSchedule: data.visitSchedule || [],
      inclusionCriteria: data.inclusionCriteria || [],
      exclusionCriteria: data.exclusionCriteria || [],
    };
  }
  
  /**
   * Parse risk assessment text into structured format
   */
  private parseRiskAssessment(text: string): RiskAssessmentResult {
    try {
      // Try to parse as JSON first
      const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch && jsonMatch[1]) {
        const parsed = JSON.parse(jsonMatch[1]);
        if (parsed.risks && Array.isArray(parsed.risks)) {
          return {
            risks: parsed.risks,
            summary: parsed.summary || text,
            overallRiskLevel: parsed.overallRiskLevel || 'medium',
            recommendations: parsed.recommendations || [],
          };
        }
      }
      
      // Fallback: Parse structured text manually
      const risks = this.extractRisksFromText(text);
      const overallRiskLevel = this.determineOverallRiskLevel(risks);
      const recommendations = this.extractRecommendationsFromText(text);
      
      return {
        risks,
        summary: text,
        overallRiskLevel,
        recommendations,
      };
    } catch (error) {
      logger.error('Failed to parse risk assessment', { error });
      // Return minimal structure on parse failure
      return {
        risks: [],
        summary: text,
        overallRiskLevel: 'medium',
        recommendations: ['Review risk assessment manually due to parsing errors'],
      };
    }
  }
  
  /**
   * Parse timeline text into structured format
   */
  private parseTimeline(text: string): TimelineResult {
    try {
      // Try to parse as JSON first
      const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch && jsonMatch[1]) {
        const parsed = JSON.parse(jsonMatch[1]);
        if (parsed.milestones && Array.isArray(parsed.milestones)) {
          return {
            milestones: parsed.milestones.map((m: any) => ({
              ...m,
              plannedDate: new Date(m.plannedDate),
            })),
            summary: parsed.summary || text,
            totalDuration: parsed.totalDuration || 'Unknown',
            criticalPath: parsed.criticalPath || [],
          };
        }
      }
      
      // Fallback: Parse structured text manually
      const milestones = this.extractMilestonesFromText(text);
      const totalDuration = this.calculateTotalDuration(milestones);
      const criticalPath = this.identifyCriticalPath(milestones);
      
      return {
        milestones,
        summary: text,
        totalDuration,
        criticalPath,
      };
    } catch (error) {
      logger.error('Failed to parse timeline', { error });
      // Return minimal structure on parse failure
      return {
        milestones: [],
        summary: text,
        totalDuration: 'Unknown',
        criticalPath: [],
      };
    }
  }
  
  /**
   * Extract risks from text manually
   */
  private extractRisksFromText(text: string): import('../types').RiskAssessment[] {
    const risks: import('../types').RiskAssessment[] = [];
    const lines = text.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Look for risk patterns like "1. Risk description"
      const riskMatch = line.match(/^\d+\.\s*(.+)/);
      if (riskMatch) {
        const description = riskMatch[1];
        const nextLines = lines.slice(i + 1, i + 4);
        
        let impact: 'low' | 'medium' | 'high' = 'medium';
        let likelihood: 'low' | 'medium' | 'high' = 'medium';
        let mitigation = 'Standard mitigation procedures should be applied.';
        
        // Look for impact and likelihood in following lines
        for (const nextLine of nextLines) {
          const impactMatch = nextLine.match(/impact:\s*(low|medium|high)/i);
          const likelihoodMatch = nextLine.match(/likelihood:\s*(low|medium|high)/i);
          const mitigationMatch = nextLine.match(/mitigation:\s*(.+)/i);
          
          if (impactMatch) impact = impactMatch[1]?.toLowerCase() as 'low' | 'medium' | 'high';
          if (likelihoodMatch) likelihood = likelihoodMatch[1]?.toLowerCase() as 'low' | 'medium' | 'high';
          if (mitigationMatch) mitigation = mitigationMatch[1] || mitigation;
        }
        
        risks.push({
          category: 'General',
          risk: description || 'Unknown risk',
          impact,
          likelihood,
          mitigation,
        });
      }
    }
    
    return risks.length > 0 ? risks : [{
      category: 'General',
      risk: 'Standard clinical trial risks apply',
      impact: 'medium',
      likelihood: 'medium',
      mitigation: 'Follow standard risk management procedures',
    }];
  }
  
  /**
   * Determine overall risk level from individual risks
   */
  private determineOverallRiskLevel(risks: import('../types').RiskAssessment[]): 'low' | 'medium' | 'high' {
    if (risks.length === 0) return 'medium';
    
    const hasHighRisk = risks.some(r => r.impact === 'high' || r.likelihood === 'high');
    const hasMediumRisk = risks.some(r => r.impact === 'medium' || r.likelihood === 'medium');
    
    if (hasHighRisk) return 'high';
    if (hasMediumRisk) return 'medium';
    return 'low';
  }
  
  /**
   * Extract recommendations from text
   */
  private extractRecommendationsFromText(text: string): string[] {
    const recommendations: string[] = [];
    const lines = text.split('\n');
    
    for (const line of lines) {
      if (line.toLowerCase().includes('recommend')) {
        recommendations.push(line.trim());
      }
    }
    
    return recommendations.length > 0 ? recommendations : [
      'Follow standard clinical data management practices',
      'Implement quality control measures',
      'Regular monitoring and review procedures'
    ];
  }
  
  /**
   * Extract milestones from text manually
   */
  private extractMilestonesFromText(text: string): import('../types').Timeline[] {
    const milestones: import('../types').Timeline[] = [];
    const lines = text.split('\n');
    
    for (const line of lines) {
      const milestoneMatch = line.match(/^\d+\.\s*(.+)/);
      if (milestoneMatch && milestoneMatch[1]) {
        const milestone = milestoneMatch[1];
        milestones.push({
          milestone,
          plannedDate: new Date(Date.now() + milestones.length * 30 * 24 * 60 * 60 * 1000), // 30 days apart
          duration: '1 month',
          dependencies: [],
        });
      }
    }
    
    return milestones.length > 0 ? milestones : [{
      milestone: 'Database build and UAT',
      plannedDate: new Date(),
      duration: '2 months',
      dependencies: [],
    }];
  }
  
  /**
   * Calculate total duration from milestones
   */
  private calculateTotalDuration(milestones: import('../types').Timeline[]): string {
    if (milestones.length === 0) return 'Unknown';
    
    const months = milestones.length * 1.5; // Rough estimate
    return `${Math.ceil(months)} months`;
  }
  
  /**
   * Identify critical path from milestones
   */
  private identifyCriticalPath(milestones: import('../types').Timeline[]): string[] {
    return milestones.map(m => m.milestone);
  }
}

// Export singleton instance
export const anthropicClient = new AnthropicClient();