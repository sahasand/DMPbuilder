import { protocolParser } from '../parsers/protocol-parser';
import { crfParser } from '../parsers/crf-parser';
import { clinicalProcessor } from '../api/clinical-processor';
import { dmpGenerator, DMPGenerationOptions } from './dmp-generator';
import { createModuleLogger, logInfo, logError, measurePerformance } from '../utils/logger';
import { ValidationError } from '../utils/error-handler';
import { DMP, RiskAssessmentResult, TimelineResult, StudyProtocol, CRFSpecification } from '../types';

const logger = createModuleLogger('main-generator');

export interface GenerationInput {
  protocolFile?: string;
  protocolText?: string;
  crfFile?: string;
  crfText?: string;
  options?: DMPGenerationOptions;
}

export interface GenerationResult {
  dmp: DMP;
  metadata: {
    processingTime: number;
    protocolPages?: number;
    crfForms?: number;
    recommendations?: string[];
    warnings?: string[];
  };
}

export class MainGenerator {
  /**
   * Generate DMP from files
   */
  async generateFromFiles(
    protocolFile: string,
    crfFile: string,
    options: DMPGenerationOptions = {}
  ): Promise<GenerationResult> {
    logInfo('Starting DMP generation from files', { protocolFile, crfFile });
    
    try {
      return await measurePerformance('dmp.generation.complete', async () => {
        // Parse protocol
        logInfo('Parsing protocol file', { protocolFile });
        const protocolText = await measurePerformance(
          'protocol.parsing',
          async () => {
            try {
              return await protocolParser.parseFromPDF(protocolFile);
            } catch (error) {
              logError('Protocol parsing failed', error);
              throw new Error(`Failed to parse protocol file: ${error.message}`);
            }
          }
        );
        
        logInfo('Protocol parsed successfully', { textLength: protocolText.length });
        
        // Parse CRF
        logInfo('Parsing CRF file', { crfFile });
        const crfText = await measurePerformance(
          'crf.parsing',
          async () => {
            try {
              return await crfParser.parseFromPDF(crfFile);
            } catch (error) {
              logError('CRF parsing failed', error);
              throw new Error(`Failed to parse CRF file: ${error.message}`);
            }
          }
        );
        
        logInfo('CRF parsed successfully', { textLength: crfText.length });
        
        // Generate DMP
        logInfo('Starting DMP text generation');
        return this.generateFromText({
          protocolText,
          crfText,
          options,
        });
      });
    } catch (error) {
      logError('DMP generation from files failed', error);
      throw error;
    }
  }
  
  /**
   * Generate DMP from text
   */
  async generateFromText(input: GenerationInput): Promise<GenerationResult> {
    const startTime = Date.now();
    
    try {
      // Validate inputs
      this.validateInputs(input);
      
      // Process clinical documents
      // Validate required inputs
      if (!input.protocolText) {
        throw new ValidationError('Protocol text is required for DMP generation');
      }
      if (!input.crfText) {
        throw new ValidationError('CRF text is required for DMP generation');
      }
      
      const processingResult = await measurePerformance(
        'clinical.processing',
        () => clinicalProcessor.processStudyDocuments(
          input.protocolText,
          input.crfText,
          {
            includeRiskAssessment: input.options?.includeRiskAssessment,
            includeTimeline: input.options?.includeTimeline,
          }
        )
      );
      
      const { protocol, crfs, riskAssessment, timeline } = processingResult;
      
      // Generate recommendations
      const recommendations = clinicalProcessor.generateRecommendations(protocol, crfs);
      
      // Generate DMP
      const dmp = await measurePerformance(
        'dmp.generation',
        () => dmpGenerator.generateDMP(protocol, crfs, {
          ...input.options,
          includeRiskAssessment: !!riskAssessment,
          includeTimeline: !!timeline,
        })
      );
      
      // Add risk assessment and timeline to appendix if generated
      if (riskAssessment || timeline) {
        this.addSupplementalSections(dmp, riskAssessment, timeline);
      }
      
      const processingTime = Date.now() - startTime;
      
      logInfo('DMP generation completed', {
        studyTitle: dmp.studyInfo.studyTitle,
        protocolNumber: dmp.studyInfo.protocolNumber,
        sectionCount: dmp.sections.length,
        processingTime,
      });
      
      return {
        dmp,
        metadata: {
          processingTime,
          crfForms: crfs.length,
          recommendations,
          warnings: this.generateWarnings(protocol, crfs),
        },
      };
    } catch (error) {
      logError('DMP generation failed', error);
      throw error;
    }
  }
  
  /**
   * Generate DMP from mixed inputs
   */
  async generate(input: GenerationInput): Promise<GenerationResult> {
    // Determine input type and route accordingly
    if (input.protocolFile && input.crfFile) {
      return this.generateFromFiles(input.protocolFile, input.crfFile, input.options);
    } else if (input.protocolText && input.crfText) {
      return this.generateFromText(input);
    } else {
      throw new ValidationError('Invalid input: provide either file paths or text content for both protocol and CRF');
    }
  }
  
  /**
   * Validate generation inputs
   */
  private validateInputs(input: GenerationInput): void {
    if (!input.protocolText && !input.protocolFile) {
      throw new ValidationError('Protocol input is required');
    }
    
    if (!input.crfText && !input.crfFile) {
      throw new ValidationError('CRF input is required');
    }
    
    if (input.protocolText && input.protocolText.trim().length < 100) {
      throw new ValidationError('Protocol text is too short');
    }
    
    if (input.crfText && input.crfText.trim().length < 50) {
      throw new ValidationError('CRF text is too short');
    }
  }
  
  /**
   * Add supplemental sections to DMP
   */
  private addSupplementalSections(
    dmp: DMP,
    riskAssessment?: RiskAssessmentResult,
    timeline?: TimelineResult
  ): void {
    const appendixSection = dmp.sections.find(s => s.title === 'Appendix');
    
    if (!appendixSection) {
      return;
    }
    
    // Ensure subsections array exists
    if (!appendixSection.subsections) {
      appendixSection.subsections = [];
    }
    
    if (riskAssessment) {
      appendixSection.subsections.push({
        sectionNumber: `${appendixSection.sectionNumber}.${appendixSection.subsections.length + 1}`,
        title: 'Risk Assessment',
        content: this.formatRiskAssessment(riskAssessment),
        subsections: [],
      });
    }
    
    if (timeline) {
      appendixSection.subsections.push({
        sectionNumber: `${appendixSection.sectionNumber}.${appendixSection.subsections.length + 1}`,
        title: 'Data Management Timeline',
        content: this.formatTimeline(timeline),
        subsections: [],
      });
    }
  }
  
  /**
   * Format risk assessment for inclusion in DMP
   */
  private formatRiskAssessment(riskAssessment: RiskAssessmentResult): string {
    let formatted = `Risk Assessment Summary\n`;
    formatted += `Overall Risk Level: ${riskAssessment.overallRiskLevel.toUpperCase()}\n\n`;
    
    if (riskAssessment.risks.length > 0) {
      formatted += `Identified Risks:\n`;
      riskAssessment.risks.forEach((risk, index) => {
        formatted += `${index + 1}. ${risk.category}: ${risk.risk}\n`;
        formatted += `   Impact: ${risk.impact} | Likelihood: ${risk.likelihood}\n`;
        formatted += `   Mitigation: ${risk.mitigation}\n\n`;
      });
    }
    
    if (riskAssessment.recommendations.length > 0) {
      formatted += `Recommendations:\n`;
      riskAssessment.recommendations.forEach((rec, index) => {
        formatted += `${index + 1}. ${rec}\n`;
      });
    }
    
    return formatted;
  }
  
  /**
   * Format timeline for inclusion in DMP
   */
  private formatTimeline(timeline: TimelineResult): string {
    let formatted = `Data Management Timeline\n`;
    formatted += `Total Duration: ${timeline.totalDuration}\n\n`;
    
    if (timeline.milestones.length > 0) {
      formatted += `Key Milestones:\n`;
      timeline.milestones.forEach((milestone, index) => {
        formatted += `${index + 1}. ${milestone.milestone}\n`;
        formatted += `   Planned Date: ${milestone.plannedDate.toLocaleDateString()}\n`;
        formatted += `   Duration: ${milestone.duration}\n`;
        if (milestone.dependencies.length > 0) {
          formatted += `   Dependencies: ${milestone.dependencies.join(', ')}\n`;
        }
        formatted += `\n`;
      });
    }
    
    if (timeline.criticalPath.length > 0) {
      formatted += `Critical Path:\n${timeline.criticalPath.join(' → ')}\n`;
    }
    
    return formatted;
  }
  
  /**
   * Generate warnings based on analysis
   */
  private generateWarnings(protocol: StudyProtocol, crfs: CRFSpecification[]): string[] {
    const warnings: string[] = [];
    
    // Check for missing critical information
    if (!protocol.protocolNumber) {
      warnings.push('Protocol number not found - manual entry required');
    }
    
    if (!protocol.sponsor) {
      warnings.push('Sponsor information not found - manual entry required');
    }
    
    // Check CRF completeness
    if (crfs.length === 0) {
      warnings.push('No CRF forms identified - manual review required');
    }
    
    // Check for common forms
    const formNames = crfs.map(crf => crf.formName.toLowerCase());
    const requiredForms = ['demographics', 'adverse events', 'medical history'];
    
    requiredForms.forEach(required => {
      if (!formNames.some(name => name.includes(required))) {
        warnings.push(`${required} form not found - verify CRF completeness`);
      }
    });
    
    return warnings;
  }
}

// Export singleton instance
export const mainGenerator = new MainGenerator();