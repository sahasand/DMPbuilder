import { anthropicClient } from './anthropic-client';
import { geminiClient } from './gemini-client';
import { StudyProtocol, CRFSpecification, RiskAssessmentResult, TimelineResult, StudyComplexity, DataCollectionPlan } from '../types';
import { createModuleLogger, logInfo, logError } from '../utils/logger';
import { ValidationError } from '../utils/error-handler';

const logger = createModuleLogger('clinical-processor');

export interface ProcessingOptions {
  includeRiskAssessment?: boolean;
  includeTimeline?: boolean;
  customPrompts?: Record<string, string>;
  preferredProvider?: 'gemini' | 'anthropic';
}

export interface ProcessingResult {
  protocol: StudyProtocol;
  crfs: CRFSpecification[];
  riskAssessment?: RiskAssessmentResult;
  timeline?: TimelineResult;
  metadata: {
    processingTime: number;
    version: string;
    timestamp: Date;
  };
}

export class ClinicalProcessor {
  /**
   * Process complete clinical study documentation
   */
  async processStudyDocuments(
    protocolText: string,
    crfText: string,
    options: ProcessingOptions = {}
  ): Promise<ProcessingResult> {
    const startTime = Date.now();
    
    try {
      logInfo('Starting clinical document processing', {
        protocolLength: protocolText.length,
        crfLength: crfText.length,
        options,
      });
      
      // Validate inputs
      this.validateInputs(protocolText, crfText);
      
      // Choose AI provider (prefer Gemini for large documents)
      const useGemini = options.preferredProvider === 'gemini' || 
                       options.preferredProvider !== 'anthropic';
      
      const aiClient = useGemini ? geminiClient : anthropicClient;
      const providerName = useGemini ? 'Gemini' : 'Anthropic';
      
      logInfo(`Using ${providerName} for document processing`, {
        protocolLength: protocolText.length,
        crfLength: crfText.length,
      });
      
      // Process protocol with fallback
      let protocol: StudyProtocol;
      try {
        protocol = await aiClient.processProtocol(protocolText);
        logInfo(`Protocol processed successfully with ${providerName}`, { 
          studyTitle: protocol.studyTitle,
          protocolNumber: protocol.protocolNumber,
        });
      } catch (error) {
        if (useGemini) {
          logInfo('Gemini failed, falling back to Anthropic for protocol');
          protocol = await anthropicClient.processProtocol(protocolText);
          logInfo('Protocol processed successfully with Anthropic fallback');
        } else {
          throw error;
        }
      }
      
      // Process CRFs with fallback
      let crfs: CRFSpecification[];
      try {
        crfs = await aiClient.processCRF(crfText);
        logInfo(`CRFs processed successfully with ${providerName}`, { 
          formCount: crfs.length,
          forms: crfs.map(crf => crf.formName),
        });
      } catch (error) {
        if (useGemini) {
          logInfo('Gemini CRF processing had issues, but should have returned fallback structure');
          // Gemini client should handle errors internally and return fallback structure
          // Don't fall back to Anthropic to avoid 529 errors
          throw error;
        } else {
          throw error;
        }
      }
      
      // Generate risk assessment if requested
      let riskAssessment;
      if (options.includeRiskAssessment) {
        try {
          riskAssessment = await aiClient.generateRiskAssessment(protocol, crfs);
          logInfo(`Risk assessment generated with ${providerName}`);
        } catch (error) {
          if (useGemini) {
            logInfo('Gemini failed, falling back to Anthropic for risk assessment');
            riskAssessment = await anthropicClient.generateRiskAssessment(protocol, crfs);
            logInfo('Risk assessment generated with Anthropic fallback');
          } else {
            throw error;
          }
        }
      }
      
      // Generate timeline if requested
      let timeline;
      if (options.includeTimeline) {
        try {
          timeline = await aiClient.generateTimeline(
            protocol,
            protocol.population.targetEnrollment || 100
          );
          logInfo(`Timeline generated with ${providerName}`);
        } catch (error) {
          if (useGemini) {
            logInfo('Gemini failed, falling back to Anthropic for timeline');
            timeline = await anthropicClient.generateTimeline(
              protocol,
              protocol.population.targetEnrollment || 100
            );
            logInfo('Timeline generated with Anthropic fallback');
          } else {
            throw error;
          }
        }
      }
      
      const processingTime = Date.now() - startTime;
      
      return {
        protocol,
        crfs,
        riskAssessment,
        timeline,
        metadata: {
          processingTime,
          version: '1.0.0',
          timestamp: new Date(),
        },
      };
    } catch (error) {
      logError('Clinical document processing failed', error);
      throw error;
    }
  }
  
  /**
   * Extract key study parameters for DMP generation
   */
  extractStudyParameters(protocol: StudyProtocol): DataCollectionPlan {
    return {
      visitSchedule: (protocol.visitSchedule || []).map(visit => ({
        name: visit.visitName || 'Unknown',
        timepoint: visit.timepoint || 'Unknown',
        procedures: visit.procedures?.length || 0,
      })),
      crfList: [], // Will be populated by analyzeCRFComplexity
      totalDataPoints: 0, // Will be calculated
      estimatedDataEntryTime: '0 hours', // Will be calculated
    };
  }
  
  /**
   * Analyze CRF complexity for resource planning
   */
  analyzeCRFComplexity(crfs: CRFSpecification[], protocol?: StudyProtocol): StudyComplexity {
    const totalFields = crfs.reduce((sum, crf) => sum + crf.fields.length, 0);
    const avgFields = crfs.length > 0 ? Math.round(totalFields / crfs.length) : 0;
    
    const numberOfVisits = protocol?.visitSchedule?.length || 0;
    const numberOfPrimaryEndpoints = protocol?.endpoints?.primary?.length || 0;
    const numberOfSecondaryEndpoints = protocol?.endpoints?.secondary?.length || 0;
    const hasExploratoryEndpoints = (protocol?.endpoints?.exploratory?.length || 0) > 0;
    
    const crfComplexityScore = this.calculateComplexityScore(crfs);
    const protocolComplexityScore = this.calculateProtocolComplexity(protocol);
    const overallComplexityScore = (crfComplexityScore + protocolComplexityScore) / 2;
    
    let complexityRating: 'low' | 'medium' | 'high';
    if (overallComplexityScore < 0.3) {
      complexityRating = 'low';
    } else if (overallComplexityScore < 0.7) {
      complexityRating = 'medium';
    } else {
      complexityRating = 'high';
    }
    
    return {
      numberOfVisits,
      numberOfPrimaryEndpoints,
      numberOfSecondaryEndpoints,
      hasExploratoryEndpoints,
      numberOfCRFs: crfs.length,
      avgFieldsPerCRF: avgFields,
      crfComplexityScore,
      protocolComplexityScore,
      overallComplexityScore,
      complexityRating,
    };
  }
  
  /**
   * Generate study-specific recommendations
   */
  generateRecommendations(
    protocol: StudyProtocol,
    crfs: CRFSpecification[]
  ): string[] {
    const recommendations: string[] = [];
    const complexity = this.analyzeCRFComplexity(crfs, protocol);
    
    // Phase-specific recommendations
    if (protocol.studyPhase === '1' || protocol.studyPhase === '2') {
      recommendations.push(
        'Implement enhanced safety monitoring procedures for early-phase study',
        'Consider more frequent data reviews given the exploratory nature'
      );
    }
    
    // Complexity-based recommendations
    if (complexity.complexityRating === 'high') {
      recommendations.push(
        'High study complexity detected - recommend additional data management resources',
        'Consider phased UAT approach to manage complexity',
        'Implement enhanced monitoring for this complex study design'
      );
    }
    
    // Visit schedule recommendations
    if (complexity.numberOfVisits > 8) {
      recommendations.push(
        'High number of visits detected - ensure robust visit schedule management',
        'Consider visit window optimization strategies'
      );
    }
    
    // CRF complexity recommendations
    if (complexity.numberOfCRFs > 15) {
      recommendations.push(
        'Large number of CRFs - recommend structured training approach',
        'Consider CRF complexity reduction where possible'
      );
    }
    
    // Endpoint-based recommendations
    if (protocol.endpoints.primary.length > 3) {
      recommendations.push(
        'Multiple primary endpoints - ensure clear data review focus',
        'Consider endpoint-specific data review plans'
      );
    }
    
    return recommendations;
  }
  
  /**
   * Calculate complexity score for CRFs
   */
  private calculateComplexityScore(crfs: CRFSpecification[]): number {
    let score = 0;
    
    // Factor 1: Number of forms (normalized)
    score += Math.min(crfs.length / 20, 1) * 0.2;
    
    // Factor 2: Average fields per form
    const avgFields = crfs.reduce((sum, crf) => sum + crf.fields.length, 0) / crfs.length;
    score += Math.min(avgFields / 50, 1) * 0.3;
    
    // Factor 3: Validation complexity
    const validatedFields = crfs.flatMap(crf => crf.fields).filter(f => f.validation).length;
    const totalFields = crfs.reduce((sum, crf) => sum + crf.fields.length, 0);
    score += (validatedFields / totalFields) * 0.3;
    
    // Factor 4: Field type diversity
    const fieldTypes = new Set(
      crfs.flatMap(crf => crf.fields).map(f => f.fieldType)
    ).size;
    score += Math.min(fieldTypes / 6, 1) * 0.2;
    
    return score;
  }
  
  /**
   * Calculate protocol complexity score
   */
  private calculateProtocolComplexity(protocol?: StudyProtocol): number {
    if (!protocol) return 0;
    
    let score = 0;
    
    // Factor 1: Number of visits
    const visits = protocol.visitSchedule?.length || 0;
    score += Math.min(visits / 10, 1) * 0.3;
    
    // Factor 2: Number of endpoints
    const totalEndpoints = (protocol.endpoints?.primary?.length || 0) + 
                          (protocol.endpoints?.secondary?.length || 0) +
                          (protocol.endpoints?.exploratory?.length || 0);
    score += Math.min(totalEndpoints / 10, 1) * 0.3;
    
    // Factor 3: Study design complexity
    const hasMultipleArms = (protocol.studyDesign?.numberOfArms || 1) > 1;
    const isBlinded = protocol.studyDesign?.type.includes('blind');
    score += (hasMultipleArms ? 0.2 : 0) + (isBlinded ? 0.2 : 0);
    
    return score;
  }
  
  /**
   * Validate input documents
   */
  private validateInputs(protocolText: string, crfText: string): void {
    if (!protocolText || protocolText.trim().length < 100) {
      throw new ValidationError('Protocol text is too short or empty');
    }
    
    if (!crfText || crfText.trim().length < 50) {
      throw new ValidationError('CRF text is too short or empty');
    }
    
    // Check for common issues
    if (protocolText.includes('�')) {
      throw new ValidationError('Protocol contains invalid characters - check encoding');
    }
    
    if (crfText.includes('�')) {
      throw new ValidationError('CRF contains invalid characters - check encoding');
    }
  }
}

// Export singleton instance
export const clinicalProcessor = new ClinicalProcessor();