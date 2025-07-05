import Anthropic from '@anthropic-ai/sdk';
import { config } from '../core/config';
import { createModuleLogger, measurePerformance } from '../utils/logger';
import { handleExternalAPIError } from '../utils/error-handler';
import { StudyProtocol, CRFSpecification, RiskAssessmentResult, TimelineResult } from '../types';
import { APIResponseValidator } from '../utils/api-response-validator';

const logger = createModuleLogger('anthropic-client');

export class AnthropicClient {
  private client: Anthropic;
  private requestCount = 0;
  private lastRequestTime = 0;
  private model: string = 'claude-3-5-sonnet-20241022'; // Latest Claude 3.5 Sonnet
  
  constructor(modelOverride?: string) {
    this.client = new Anthropic({
      apiKey: config.anthropicApiKey,
      timeout: config.apiTimeout,
    });
    if (modelOverride) {
      this.model = modelOverride;
    }
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
              model: this.model,
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
            // Use the validator to parse and validate the response
            const protocol = APIResponseValidator.parseAndValidate(
              content.text,
              APIResponseValidator.validateStudyProtocol,
              this.createFallbackProtocol() // Fallback if parsing fails
            );
            
            logger.info('Protocol processed and validated successfully');
            return protocol;
          } catch (parseError) {
            logger.error('Failed to parse protocol response', { error: parseError });
            throw new Error(`Failed to parse protocol analysis results: ${(parseError as Error).message}`);
          }
        }
        
        throw new Error('Unexpected response format from API');
      } catch (error) {
        throw handleExternalAPIError(error, 'Anthropic');
      }
    });
  }
  
  /**
   * Create a fallback protocol structure
   */
  private createFallbackProtocol(): StudyProtocol {
    return {
      studyTitle: 'Clinical Study (Title Not Extracted)',
      protocolNumber: 'PROTO-001',
      studyPhase: 'Phase 3',
      investigationalDrug: 'Not specified',
      sponsor: 'Sponsor Name Not Extracted',
      indication: 'Not specified',
      studyDesign: {
        type: 'open-label',
        duration: 'Not specified',
        numberOfArms: 1,
        description: 'Study design not specified'
      },
      objectives: {
        primary: [{ 
          description: 'Primary objectives not extracted',
          endpoints: ['Primary endpoints not extracted']
        }],
        secondary: [],
        exploratory: []
      },
      population: {
        targetEnrollment: 100,
        ageRange: '18 years and above',
        gender: 'all',
        condition: 'Not specified'
      },
      endpoints: {
        primary: [{
          name: 'Primary endpoint not extracted',
          description: 'Primary endpoint not extracted',
          timepoint: 'Not specified',
          method: 'Not specified'
        }],
        secondary: [],
        exploratory: []
      },
      visitSchedule: [{
        visitName: 'Baseline',
        visitNumber: 1,
        timepoint: 'Day 0',
        window: '± 0 days',
        procedures: []
      }],
      inclusionCriteria: ['Inclusion criteria not extracted'],
      exclusionCriteria: ['Exclusion criteria not extracted']
    };
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
              model: this.model,
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
            
            // Use the validator to parse and validate the response
            const crfs = APIResponseValidator.parseAndValidate(
              content.text,
              APIResponseValidator.validateCRFSpecifications,
              this.createFallbackCRFs() // Fallback if parsing fails
            );
            
            logger.info('CRF processed and validated successfully', { 
              formCount: crfs.length 
            });
            return crfs;
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
   * Create fallback CRF specifications
   */
  private createFallbackCRFs(): CRFSpecification[] {
    return [{
      formName: 'Demographics',
      formOID: 'DM',
      version: '1.0',
      fields: [
        {
          fieldName: 'Subject ID',
          fieldOID: 'SUBJID',
          fieldType: 'text',
          required: true,
          cdiscMapping: {
            domain: 'DM',
            variable: 'USUBJID'
          }
        },
        {
          fieldName: 'Date of Birth',
          fieldOID: 'BRTHDTC',
          fieldType: 'date',
          required: true,
          cdiscMapping: {
            domain: 'DM',
            variable: 'BRTHDTC'
          }
        }
      ],
      lastUpdated: new Date()
    }];
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
          model: this.model,
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
      const line = lines[i]?.trim() || '';
      
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

  /**
   * Enhanced section processing for critical clinical content
   * Used in hybrid processing pipeline for high-quality section enhancement
   */
  async enhanceSection(sectionContent: string, sectionType: string, context?: string): Promise<string> {
    return this.withRetry(async () => {
      await this.enforceRateLimit();

      const systemPrompt = this.getSystemPromptForSection(sectionType);
      const prompt = `${context ? `Context from previous sections:\n${context}\n\n` : ''}Enhance and structure the following ${sectionType} section for a clinical Data Management Plan:

${sectionContent}

Provide a comprehensive, well-structured version that:
1. Follows ICH-GCP and regulatory guidelines
2. Includes all necessary data management considerations
3. Addresses data quality, integrity, and compliance requirements
4. Is clear, specific, and actionable for data management teams`;

      try {
        const response = await measurePerformance(
          'anthropic.enhanceSection',
          async () => {
            return await this.client.messages.create({
              model: this.model,
              max_tokens: 4096,
              temperature: 0.1,
              system: systemPrompt,
              messages: [
                {
                  role: 'user',
                  content: prompt,
                },
              ],
            });
          },
          { sectionType, contentLength: sectionContent.length }
        );

        const content = response.content[0];
        if (content?.type === 'text') {
          return content.text;
        }

        throw new Error('Unexpected response format from API');
      } catch (error) {
        throw handleExternalAPIError(error, 'Anthropic');
      }
    });
  }

  /**
   * Get specialized system prompts for different section types
   */
  private getSystemPromptForSection(sectionType: string): string {
    const prompts: Record<string, string> = {
      'endpoints': 'You are a clinical endpoints and outcomes expert specializing in data management for clinical trials. Focus on endpoint definitions, data collection methods, derivation rules, and analysis considerations.',
      'safety': 'You are a clinical safety data management expert with deep knowledge of pharmacovigilance, adverse event coding (MedDRA), and safety reporting requirements per ICH E2A/E2B guidelines.',
      'regulatory': 'You are a regulatory compliance expert for clinical data management, well-versed in FDA 21 CFR Part 11, EMA guidelines, ICH-GCP, and global regulatory requirements for electronic data.',
      'statistics': 'You are a clinical biostatistics expert focusing on statistical analysis plans, data requirements for statistical endpoints, and ensuring data quality for valid statistical inference.',
      'data_standards': 'You are a CDISC standards expert specializing in SDTM, ADaM, and Define-XML implementation for clinical trial data standardization and regulatory submissions.',
      'inclusion_exclusion': 'You are a clinical trial eligibility expert focusing on operationalizing inclusion/exclusion criteria for data capture, screening logs, and protocol deviation management.',
      'procedures': 'You are a clinical operations expert specializing in study procedures, visit schedules, and ensuring complete and accurate data collection throughout the trial.',
      'default': 'You are a senior clinical data management expert with comprehensive knowledge of ICH-GCP, regulatory guidelines, and best practices for ensuring high-quality clinical trial data.'
    };

    return prompts[sectionType] || prompts['default'];
  }

  /**
   * Process multiple sections with intelligent batching
   */
  async enhanceMultipleSections(sections: Array<{ content: string; type: string; name: string }>): Promise<Map<string, string>> {
    const enhanced = new Map<string, string>();
    
    // Process critical sections with Claude
    const criticalSectionTypes = ['endpoints', 'safety', 'regulatory', 'inclusion_exclusion'];
    
    for (const section of sections) {
      if (criticalSectionTypes.includes(section.type)) {
        try {
          const enhancedContent = await this.enhanceSection(section.content, section.type);
          enhanced.set(section.name, enhancedContent);
        } catch (error) {
          logger.warn('Failed to enhance section with Claude', { 
            section: section.name, 
            error: error instanceof Error ? error.message : 'Unknown error' 
          });
          // Fallback to original content
          enhanced.set(section.name, section.content);
        }
      }
    }
    
    return enhanced;
  }
}

// Export singleton instance
export const anthropicClient = new AnthropicClient();