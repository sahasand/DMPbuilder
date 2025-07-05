import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../core/config';
import { createModuleLogger, measurePerformance } from '../utils/logger';
import { handleExternalAPIError } from '../utils/error-handler';
import { StudyProtocol, CRFSpecification, RiskAssessmentResult, TimelineResult } from '../types';
import { APIResponseValidator } from '../utils/api-response-validator';

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
          // Use the validator to parse and validate the response
          const protocol = APIResponseValidator.parseAndValidate(
            text,
            APIResponseValidator.validateStudyProtocol,
            this.createFallbackProtocol() // Fallback if parsing fails
          );
          
          logger.info('Protocol processed and validated successfully with Gemini');
          return protocol;
        } catch (parseError) {
          logger.error('Failed to parse protocol response from Gemini', { error: parseError });
          throw new Error(`Failed to parse protocol analysis results: ${(parseError as Error).message}`);
        }
      } catch (error) {
        throw handleExternalAPIError(error, 'Gemini');
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
          
          // Use the validator to parse and validate the response
          const crfs = APIResponseValidator.parseAndValidate(
            text,
            APIResponseValidator.validateCRFSpecifications,
            this.createFallbackCRFs() // Fallback if parsing fails
          );
          
          logger.info('CRF processed and validated successfully with Gemini', { 
            formCount: crfs.length 
          });
          return crfs;
        } catch (parseError) {
          logger.error('Failed to parse CRF response from Gemini', { 
            error: parseError,
            responseText: text.substring(0, 2000) + '...' // Log first 2000 chars to see more context
          });
          
          // Re-throw to let withRetry handle it
          throw new Error(`Failed to parse CRF response: ${(parseError as Error).message}`);
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
   * Generic content generation method for DMP sections
   */
  async generateContent(prompt: string): Promise<string> {
    return this.withRetry(async () => {
      await this.enforceRateLimit();
      
      const model = this.client.getGenerativeModel({ model: "gemini-1.5-pro" });
      const response = await model.generateContent(prompt);
      return response.response.text();
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
      jsonText = (jsonText || '').trim().replace(/^[^{]*/, '').replace(/[^}]*$/, '');
      
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
      jsonText = (jsonText || '').trim().replace(/^[^{]*/, '').replace(/[^}]*$/, '');
      
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
}

// Export singleton instance
export const geminiClient = new GeminiClient();