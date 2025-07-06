import { anthropicClient } from './anthropic-client';
import { geminiClient } from './gemini-client';
import { hybridProcessor } from './hybrid-processor';
import { StudyProtocol, CRFSpecification, RiskAssessmentResult, TimelineResult, StudyComplexity, DataCollectionPlan } from '../types';
import { createModuleLogger, logInfo, logError } from '../utils/logger';
import { ValidationError } from '../utils/error-handler';

const logger = createModuleLogger('clinical-processor');

export interface ProcessingOptions {
  includeRiskAssessment?: boolean;
  includeTimeline?: boolean;
  customPrompts?: Record<string, string>;
  preferredProvider?: 'gemini' | 'anthropic' | 'hybrid';
  useHybridProcessing?: boolean;
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

export interface ProtocolOnlyResult {
  protocol: StudyProtocol;
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
      
      // Choose processing approach
      const useHybrid = options.useHybridProcessing !== false && 
                       (options.preferredProvider === 'hybrid' || 
                        protocolText.length + crfText.length > 100000);
      
      let protocol: StudyProtocol;
      let crfs: CRFSpecification[];
      let processingMetadata: any = {};
      
      if (useHybrid) {
        logInfo('Using hybrid AI processing', {
          protocolLength: protocolText.length,
          crfLength: crfText.length,
        });
        
        // Process protocol with hybrid approach
        const protocolResult = await hybridProcessor.processProtocol(
          protocolText, 
          'Protocol',
          {
            preferredModel: options.preferredProvider === 'anthropic' ? 'claude' : 'gemini',
            enhanceCriticalSections: true,
          }
        );
        
        protocol = protocolResult.result;
        processingMetadata.protocolProcessing = protocolResult.metadata;
        
        logInfo('Protocol processed with hybrid approach', { 
          studyTitle: protocol.studyTitle,
          protocolNumber: protocol.protocolNumber,
          modelUsage: protocolResult.metadata.modelUsage,
          enhancedSections: protocolResult.metadata.enhancedSections,
        });
        
        // Process CRF with hybrid approach
        const crfResult = await hybridProcessor.processCRF(crfText, 'CRF');
        crfs = crfResult.result;
        processingMetadata.crfProcessing = crfResult.metadata;
        
      } else {
        // Original single-model processing
        const useGemini = options.preferredProvider === 'gemini' || 
                         options.preferredProvider !== 'anthropic';
        
        const aiClient = useGemini ? geminiClient : anthropicClient;
        const providerName = useGemini ? 'Gemini' : 'Anthropic';
        
        logInfo(`Using ${providerName} for document processing`, {
          protocolLength: protocolText.length,
          crfLength: crfText.length,
        });
        
        // Process protocol with fallback
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
      try {
        crfs = await aiClient.processCRF(crfText);
        logInfo(`CRFs processed successfully with ${providerName}`, { 
          formCount: crfs?.length || 0,
          forms: (crfs || []).map(crf => crf.formName),
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
      } // End of else block for non-hybrid processing
      
      // Generate risk assessment if requested
      let riskAssessment;
      if (options.includeRiskAssessment) {
        if (useHybrid) {
          // For hybrid, prefer Claude for risk assessment (expertise in safety)
          try {
            riskAssessment = await anthropicClient.generateRiskAssessment(protocol, crfs);
            logInfo('Risk assessment generated with Claude (hybrid mode)');
          } catch (error) {
            logInfo('Claude failed, falling back to Gemini for risk assessment');
            riskAssessment = await geminiClient.generateRiskAssessment(protocol, crfs);
            logInfo('Risk assessment generated with Gemini fallback');
          }
        } else {
          // Original single-model approach
          const useGeminiForRisk = options.preferredProvider === 'gemini' || options.preferredProvider !== 'anthropic';
          const aiClient = useGeminiForRisk ? geminiClient : anthropicClient;
          const providerName = useGeminiForRisk ? 'Gemini' : 'Anthropic';
          
          try {
            riskAssessment = await aiClient.generateRiskAssessment(protocol, crfs);
            logInfo(`Risk assessment generated with ${providerName}`);
          } catch (error) {
            if (useGeminiForRisk) {
              logInfo('Gemini failed, falling back to Anthropic for risk assessment');
              riskAssessment = await anthropicClient.generateRiskAssessment(protocol, crfs);
              logInfo('Risk assessment generated with Anthropic fallback');
            } else {
              throw error;
            }
          }
        }
      }
      
      // Generate timeline if requested
      let timeline;
      if (options.includeTimeline) {
        if (useHybrid) {
          // For hybrid, use Gemini for timeline (good at structured data)
          try {
            timeline = await geminiClient.generateTimeline(
              protocol,
              protocol.population?.targetEnrollment || 100
            );
            logInfo('Timeline generated with Gemini (hybrid mode)');
          } catch (error) {
            logInfo('Gemini failed, falling back to Claude for timeline');
            timeline = await anthropicClient.generateTimeline(
              protocol,
              protocol.population?.targetEnrollment || 100
            );
            logInfo('Timeline generated with Claude fallback');
          }
        } else {
          // Original single-model approach
          const useGeminiForTimeline = options.preferredProvider === 'gemini' || options.preferredProvider !== 'anthropic';
          const aiClient = useGeminiForTimeline ? geminiClient : anthropicClient;
          const providerName = useGeminiForTimeline ? 'Gemini' : 'Anthropic';
          
          try {
            timeline = await aiClient.generateTimeline(
              protocol,
              protocol.population?.targetEnrollment || 100
            );
            logInfo(`Timeline generated with ${providerName}`);
          } catch (error) {
            if (useGeminiForTimeline) {
              logInfo('Gemini failed, falling back to Anthropic for timeline');
              timeline = await anthropicClient.generateTimeline(
                protocol,
                protocol.population?.targetEnrollment || 100
              );
              logInfo('Timeline generated with Anthropic fallback');
            } else {
              throw error;
            }
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
          ...(useHybrid && processingMetadata ? { hybridProcessing: processingMetadata } : {}),
        },
      };
    } catch (error) {
      logError('Clinical document processing failed', error);
      throw error;
    }
  }

  /**
   * Process protocol document only (no CRF required)
   */
  async processProtocolOnly(
    protocolText: string,
    options: ProcessingOptions = {}
  ): Promise<ProtocolOnlyResult> {
    const startTime = Date.now();
    
    try {
      logInfo('Starting protocol-only processing', {
        protocolLength: protocolText.length,
        options,
      });
      
      // Validate protocol input
      if (!protocolText || protocolText.length < 100) {
        throw new ValidationError('Protocol text must be at least 100 characters');
      }
      
      // Choose processing approach
      const useHybrid = options.useHybridProcessing !== false && 
                       (options.preferredProvider === 'hybrid' || 
                        protocolText.length > 50000);
      
      let protocol: StudyProtocol;
      let processingMetadata: any = {};
      
      if (useHybrid) {
        logInfo('Using hybrid AI processing for protocol', {
          protocolLength: protocolText.length,
        });
        
        // Process protocol with hybrid approach
        const protocolResult = await hybridProcessor.processProtocol(
          protocolText, 
          'Protocol',
          {
            preferredModel: options.preferredProvider === 'anthropic' ? 'claude' : 'gemini',
            enhanceCriticalSections: true,
          }
        );
        
        protocol = protocolResult.result;
        processingMetadata.protocolProcessing = protocolResult.metadata;
        
        logInfo('Protocol processed with hybrid approach', { 
          studyTitle: protocol.studyTitle,
          protocolNumber: protocol.protocolNumber,
          modelUsage: protocolResult.metadata.modelUsage,
          enhancedSections: protocolResult.metadata.enhancedSections,
        });
        
      } else {
        // Original single-model processing
        const useGemini = options.preferredProvider === 'gemini' || 
                         options.preferredProvider !== 'anthropic';
        
        const aiClient = useGemini ? geminiClient : anthropicClient;
        const providerName = useGemini ? 'Gemini' : 'Anthropic';
        
        logInfo(`Using ${providerName} for protocol processing`);
        
        try {
          protocol = await aiClient.processProtocol(protocolText);
          logInfo(`Protocol processed successfully with ${providerName}`, {
            studyTitle: protocol.studyTitle,
            protocolNumber: protocol.protocolNumber
          });
        } catch (error) {
          if (useGemini) {
            logInfo('Gemini failed, falling back to Anthropic for protocol');
            protocol = await anthropicClient.processProtocol(protocolText);
            logInfo('Protocol processed with Anthropic fallback');
          } else {
            throw error;
          }
        }
      }
      
      // Generate risk assessment if requested
      let riskAssessment;
      if (options.includeRiskAssessment) {
        try {
          // For protocol-only analysis, use protocol-focused risk assessment
          const aiClient = options.preferredProvider === 'anthropic' ? anthropicClient : geminiClient;
          riskAssessment = await aiClient.generateRiskAssessment(protocol, []);
          logInfo('Protocol-focused risk assessment generated');
        } catch (error) {
          logInfo('Risk assessment failed, continuing without it', { error: error instanceof Error ? error.message : 'Unknown error' });
        }
      }
      
      // Generate timeline if requested
      let timeline;
      if (options.includeTimeline) {
        try {
          const aiClient = options.preferredProvider === 'anthropic' ? anthropicClient : geminiClient;
          timeline = await aiClient.generateTimeline(
            protocol,
            protocol.population?.targetEnrollment || 100
          );
          logInfo('Timeline generated for protocol');
        } catch (error) {
          logInfo('Timeline generation failed, continuing without it', { error: error instanceof Error ? error.message : 'Unknown error' });
        }
      }
      
      const processingTime = Date.now() - startTime;
      
      return {
        protocol,
        riskAssessment,
        timeline,
        metadata: {
          processingTime,
          version: '1.0.0',
          timestamp: new Date(),
          ...(useHybrid && processingMetadata ? { hybridProcessing: processingMetadata } : {}),
        },
      };
    } catch (error) {
      logError('Protocol-only processing failed', error);
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
    const totalFields = (crfs || []).reduce((sum, crf) => sum + (crf.fields?.length || 0), 0);
    const avgFields = (crfs?.length || 0) > 0 ? Math.round(totalFields / crfs.length) : 0;
    
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
      numberOfCRFs: crfs?.length || 0,
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
    if (!crfs || crfs.length === 0) return 0;
    
    let score = 0;
    
    // Factor 1: Number of forms (normalized)
    score += Math.min(crfs.length / 20, 1) * 0.2;
    
    // Factor 2: Average fields per form
    const totalFields = crfs.reduce((sum, crf) => sum + (crf.fields?.length || 0), 0);
    const avgFields = totalFields / crfs.length;
    score += Math.min(avgFields / 50, 1) * 0.3;
    
    // Factor 3: Validation complexity
    const validatedFields = crfs.flatMap(crf => crf.fields || []).filter(f => f?.validation).length;
    score += totalFields > 0 ? (validatedFields / totalFields) * 0.3 : 0;
    
    // Factor 4: Field type diversity
    const fieldTypes = new Set(
      crfs.flatMap(crf => crf.fields || []).map(f => f?.fieldType).filter(Boolean)
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
    const isBlinded = protocol.studyDesign?.type?.includes('blind') || false;
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