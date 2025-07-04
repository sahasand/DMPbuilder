import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../core/config';
import { createModuleLogger, measurePerformance } from '../utils/logger';
import { handleExternalAPIError } from '../utils/error-handler';
import { StudyProtocol, CRFSpecification, RiskAssessmentResult, TimelineResult } from '../types';

const logger = createModuleLogger('gemini-client');

export class GeminiClient {
  private client: GoogleGenerativeAI;
  private requestCount = 0;
  private lastRequestTime = 0;
  
  constructor() {
    this.client = new GoogleGenerativeAI(config.geminiApiKey);
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
      return message.includes('rate limit') || 
             message.includes('quota') ||
             message.includes('timeout') ||
             message.includes('503') ||
             message.includes('429') ||
             message.includes('500');
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

Return ONLY valid JSON in this exact format:
{
  "studyTitle": "string",
  "protocolNumber": "string",
  "studyPhase": "string",
  "investigationalDrug": "string",
  "sponsor": "string",
  "indication": "string",
  "studyDesign": {
    "type": "string",
    "duration": "string",
    "numberOfArms": 1,
    "description": "string"
  },
  "objectives": {
    "primary": ["string"],
    "secondary": ["string"],
    "exploratory": ["string"]
  },
  "population": {
    "targetEnrollment": 100,
    "ageRange": "string",
    "gender": "string",
    "description": "string"
  },
  "endpoints": {
    "primary": ["string"],
    "secondary": ["string"],
    "exploratory": ["string"]
  },
  "visitSchedule": [
    {
      "visitName": "string",
      "timepoint": "string",
      "procedures": ["string"]
    }
  ],
  "inclusionCriteria": ["string"],
  "exclusionCriteria": ["string"]
}

Ensure all medical terminology is accurate and follow ICH-GCP guidelines for data extraction.`;
    
      try {
        const model = this.client.getGenerativeModel({ model: "gemini-1.5-pro" });
        
        const response = await measurePerformance(
          'gemini.processProtocol',
          async () => {
            return await model.generateContent(prompt);
          },
          { protocolLength: protocolText.length }
        );
        
        const text = response.response.text();
        
        try {
          // Extract JSON from the response
          const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
          const jsonText = jsonMatch ? jsonMatch[1] : text;
          
          // Clean up any markdown or extra text
          const cleanJson = jsonText.trim().replace(/^[^{]*/, '').replace(/[^}]*$/, '');
          const parsedData = JSON.parse(cleanJson);
          
          logger.info('Protocol processed successfully with Gemini');
          return this.mapToStudyProtocol(parsedData);
        } catch (parseError) {
          logger.error('Failed to parse protocol response from Gemini', { error: parseError });
          throw new Error('Failed to parse protocol analysis results');
        }
      } catch (error) {
        throw handleExternalAPIError(error, 'Gemini');
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
- Form name and OID  
- List of ONLY the key fields (limit to 5-10 most important fields per form)
- Field type and required status
- Basic CDISC mapping

Keep response concise. Return ONLY valid JSON:
[
  {
    "formName": "Visit Details", 
    "formOID": "VD01",
    "version": "1.0",
    "fields": [
      {
        "fieldName": "Site ID",
        "fieldOID": "SITEID", 
        "fieldType": "text",
        "required": true,
        "cdiscMapping": {
          "domain": "DM",
          "variable": "SITEID"
        }
      }
    ]
  }
]`;
      
      try {
        const model = this.client.getGenerativeModel({ model: "gemini-1.5-pro" });
        
        const response = await measurePerformance(
          'gemini.processCRF',
          async () => {
            return await model.generateContent(prompt);
          },
          { crfLength: crfText.length }
        );
        
        const text = response.response.text();
        
        try {
          logger.info('CRF API response received from Gemini', { responseLength: text.length });
          
          // Try to extract JSON from code blocks first
          const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
          let jsonText = jsonMatch ? jsonMatch[1] : text;
          
          // Clean up the text - remove any leading/trailing whitespace and text
          jsonText = jsonText?.trim() || '';
          
          // If it doesn't start with [ or {, try to find the JSON in the response
          if (!jsonText.startsWith('[') && !jsonText.startsWith('{')) {
            const jsonStart = text.indexOf('[');
            const jsonEnd = text.lastIndexOf(']');
            if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
              jsonText = text.substring(jsonStart, jsonEnd + 1);
            }
          }
          
          // Check if JSON appears to be truncated and try to repair it
          if (jsonText.endsWith(',') || jsonText.endsWith('"') || !jsonText.endsWith(']')) {
            logger.warn('JSON appears truncated, attempting to repair');
            
            // Try to find the last complete object
            const lastCompleteObject = jsonText.lastIndexOf('}');
            if (lastCompleteObject !== -1) {
              // Truncate at the last complete object and close the array
              jsonText = jsonText.substring(0, lastCompleteObject + 1) + ']';
            } else {
              // If no complete object found, create a minimal valid structure
              jsonText = '[{"formName": "Extracted Form", "formOID": "FORM01", "version": "1.0", "fields": []}]';
              logger.warn('Created minimal CRF structure due to parsing issues');
            }
          }
          
          logger.info('Attempting to parse CRF JSON from Gemini', { 
            jsonLength: jsonText.length,
            startsWithBracket: jsonText.startsWith('['),
            startsWithBrace: jsonText.startsWith('{')
          });
          
          const parsedData = JSON.parse(jsonText);
          
          logger.info('CRF processed successfully with Gemini');
          return Array.isArray(parsedData) ? parsedData : [parsedData];
        } catch (parseError) {
          logger.error('Failed to parse CRF response from Gemini', { 
            error: parseError,
            responseText: text.substring(0, 2000) + '...' // Log first 2000 chars to see more context
          });
          
          // As a fallback, create a basic CRF structure
          logger.warn('Creating fallback CRF structure');
          return [{
            formName: "Visit Details",
            formOID: "VD01", 
            version: "1.0",
            lastUpdated: new Date(),
            fields: [
              {
                fieldName: "Site ID",
                fieldOID: "SITEID",
                fieldType: "text" as const,
                required: true,
                cdiscMapping: {
                  domain: "DM",
                  variable: "SITEID"
                }
              },
              {
                fieldName: "Subject Number", 
                fieldOID: "SUBJNUM",
                fieldType: "text" as const,
                required: true,
                cdiscMapping: {
                  domain: "DM", 
                  variable: "SUBJID"
                }
              }
            ]
          }];
        }
      } catch (error) {
        throw handleExternalAPIError(error, 'Gemini');
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
- Mitigation strategy

Return ONLY valid JSON in this format:
{
  "risks": [
    {
      "category": "Data Quality",
      "risk": "Risk description",
      "impact": "medium",
      "likelihood": "low",
      "mitigation": "Mitigation strategy"
    }
  ],
  "summary": "Overall risk assessment summary",
  "overallRiskLevel": "medium",
  "recommendations": ["Recommendation 1", "Recommendation 2"]
}`;
      
      try {
        const model = this.client.getGenerativeModel({ model: "gemini-1.5-pro" });
        const response = await model.generateContent(prompt);
        const text = response.response.text();
        
        return this.parseRiskAssessment(text);
      } catch (error) {
        throw handleExternalAPIError(error, 'Gemini');
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

Consider typical timelines for ${protocol.studyPhase} studies in ${protocol.indication}.

Return ONLY valid JSON in this format:
{
  "milestones": [
    {
      "milestone": "Database build and UAT",
      "plannedDate": "2025-09-01",
      "duration": "2 months",
      "dependencies": []
    }
  ],
  "summary": "Timeline summary",
  "totalDuration": "18 months",
  "criticalPath": ["Database build", "FPFV", "LPLV"]
}`;
      
      try {
        const model = this.client.getGenerativeModel({ model: "gemini-1.5-pro" });
        const response = await model.generateContent(prompt);
        const text = response.response.text();
        
        return this.parseTimeline(text);
      } catch (error) {
        throw handleExternalAPIError(error, 'Gemini');
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
      let jsonText = jsonMatch ? jsonMatch[1] : text;
      
      // Clean up any markdown or extra text
      jsonText = jsonText.trim().replace(/^[^{]*/, '').replace(/[^}]*$/, '');
      
      if (jsonText.startsWith('{')) {
        const parsed = JSON.parse(jsonText);
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
      logger.error('Failed to parse risk assessment from Gemini', { error });
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
      let jsonText = jsonMatch ? jsonMatch[1] : text;
      
      // Clean up any markdown or extra text
      jsonText = jsonText.trim().replace(/^[^{]*/, '').replace(/[^}]*$/, '');
      
      if (jsonText.startsWith('{')) {
        const parsed = JSON.parse(jsonText);
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
      logger.error('Failed to parse timeline from Gemini', { error });
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
export const geminiClient = new GeminiClient();