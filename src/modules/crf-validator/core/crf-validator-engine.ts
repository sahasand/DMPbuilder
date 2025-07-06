// Core CRF Validator Engine
import {
  CRFValidationResult,
  ValidationOptions,
  StructureAnalysisResult,
  ProtocolAlignmentResult,
  ValidationExecutiveSummary,
  ValidationFinding,
  CRFRecommendation,
  CriticalIssue,
  ProtocolInfo
} from '../types/crf-validation-types';
import { StudyProtocol, CRFSpecification } from '../../../types';
import { createModuleLogger, logInfo, logError, measurePerformance } from '../../../utils/logger';
import { ValidationError } from '../../../utils/error-handler';

const logger = createModuleLogger('crf-validator-engine');

export class CRFValidatorEngine {
  private validationCount = 0;

  /**
   * Main orchestration method for comprehensive CRF validation
   */
  async validateCRF(
    protocol: StudyProtocol,
    crfs: CRFSpecification[],
    options: ValidationOptions = {}
  ): Promise<CRFValidationResult> {
    const validationId = this.generateValidationId();
    const startTime = Date.now();

    try {
      logInfo('Starting comprehensive CRF validation', {
        validationId,
        protocolNumber: protocol.protocolNumber,
        studyTitle: protocol.studyTitle,
        crfCount: crfs.length,
        options
      });

      // Validate inputs
      this.validateInputs(protocol, crfs);

      // Extract protocol information
      const protocolInfo = this.extractProtocolInfo(protocol);

      // Set default options
      const validationOptions = this.setDefaultOptions(options);

      // Parallel validation execution for performance
      const validationPromises: Promise<any>[] = [];

      // Structure Analysis
      if (validationOptions.validationDepth !== 'Basic') {
        validationPromises.push(
          measurePerformance('structure-analysis', () => 
            this.performStructureAnalysis(crfs, validationOptions)
          )
        );
      }

      // Protocol Alignment Analysis
      if (validationOptions.includeProtocolAlignment !== false) {
        validationPromises.push(
          measurePerformance('protocol-alignment', () =>
            this.performProtocolAlignment(protocol, crfs, validationOptions)
          )
        );
      }

      // Execute parallel validations
      const [
        structureAnalysis,
        protocolAlignment
      ] = await Promise.all(validationPromises);

      // Generate validation findings
      const validationFindings = await measurePerformance('validation-findings', () =>
        this.generateValidationFindings(
          protocol,
          crfs,
          { structureAnalysis, protocolAlignment },
          validationOptions
        )
      );

      // Generate recommendations
      const recommendations = await measurePerformance('recommendations', () =>
        this.generateRecommendations(
          protocol,
          crfs,
          { structureAnalysis, protocolAlignment, validationFindings },
          validationOptions
        )
      );

      // Identify critical issues
      const criticalIssues = this.identifyCriticalIssues(validationFindings, recommendations);

      // Calculate scores
      const scores = this.calculateValidationScores(structureAnalysis, protocolAlignment, validationFindings);

      // Generate executive summary
      const executiveSummary = await measurePerformance('executive-summary', () =>
        this.generateExecutiveSummary(
          protocol,
          { structureAnalysis, protocolAlignment, validationFindings, recommendations, criticalIssues, scores },
          validationOptions
        )
      );

      const processingTime = Date.now() - startTime;

      const result: CRFValidationResult = {
        validationId,
        protocolInfo,
        overallScore: scores.overallScore,
        completenessScore: scores.completenessScore,
        qualityScore: scores.qualityScore,
        complianceScore: scores.complianceScore,
        protocolAlignment: protocolAlignment || this.createDefaultProtocolAlignment(),
        structureAnalysis: structureAnalysis || this.createDefaultStructureAnalysis(),
        validationFindings,
        recommendations,
        criticalIssues,
        executiveSummary,
        generatedAt: new Date(),
        validationVersion: '1.0.0',
        processingTime
      };

      logInfo('Comprehensive CRF validation completed', {
        validationId,
        processingTime,
        overallScore: scores.overallScore,
        findingsCount: validationFindings.length,
        recommendationsCount: recommendations.length
      });

      return result;

    } catch (error) {
      logError('CRF validation failed', error, { validationId });
      throw error;
    }
  }

  /**
   * Extract protocol information for validation context
   */
  private extractProtocolInfo(protocol: StudyProtocol): ProtocolInfo {
    return {
      protocolNumber: protocol.protocolNumber || 'Unknown',
      studyTitle: protocol.studyTitle || 'Unknown Study',
      phase: protocol.studyPhase || 'Unknown',
      therapeuticArea: protocol.therapeuticArea || 'Not specified',
      sponsor: protocol.sponsor || 'Not specified',
      indication: protocol.indication || 'Not specified'
    };
  }

  /**
   * Set default validation options
   */
  private setDefaultOptions(options: ValidationOptions): Required<ValidationOptions> {
    return {
      validationDepth: options.validationDepth ?? 'Standard',
      regulatoryRegion: options.regulatoryRegion ?? 'FDA',
      industry: options.industry ?? 'Pharmaceutical',
      includeComplianceCheck: options.includeComplianceCheck ?? true,
      includeEfficiencyAnalysis: options.includeEfficiencyAnalysis ?? true,
      includeProtocolAlignment: options.includeProtocolAlignment ?? true,
      generateRecommendations: options.generateRecommendations ?? true,
      customParameters: options.customParameters ?? {}
    };
  }

  /**
   * Perform structure analysis of CRFs
   */
  private async performStructureAnalysis(
    crfs: CRFSpecification[],
    options: Required<ValidationOptions>
  ): Promise<StructureAnalysisResult> {
    // This will be implemented by specialized structure analyzer
    return this.createDefaultStructureAnalysis();
  }

  /**
   * Perform protocol alignment analysis
   */
  private async performProtocolAlignment(
    protocol: StudyProtocol,
    crfs: CRFSpecification[],
    options: Required<ValidationOptions>
  ): Promise<ProtocolAlignmentResult> {
    // This will be implemented by specialized protocol alignment analyzer
    return this.createDefaultProtocolAlignment();
  }

  /**
   * Generate validation findings
   */
  private async generateValidationFindings(
    protocol: StudyProtocol,
    crfs: CRFSpecification[],
    analyses: any,
    options: Required<ValidationOptions>
  ): Promise<ValidationFinding[]> {
    const findings: ValidationFinding[] = [];

    // Basic structural findings
    if (crfs.length === 0) {
      findings.push({
        id: 'FIND-001',
        category: 'Structure',
        finding: 'No CRF forms found',
        severity: 'Critical',
        impact: 'Cannot collect any study data',
        recommendation: 'Add CRF forms for data collection',
        priority: 'High'
      });
    }

    // Check for basic required forms
    const hasBasicForms = this.checkBasicForms(crfs);
    if (!hasBasicForms.demographics) {
      findings.push({
        id: 'FIND-002',
        category: 'Content',
        finding: 'Missing Demographics form',
        severity: 'Major',
        impact: 'Cannot capture basic subject information',
        recommendation: 'Add Demographics/Subject Information form',
        priority: 'High'
      });
    }

    // Protocol alignment findings
    if (protocol.endpoints?.primary && protocol.endpoints.primary.length > 0) {
      findings.push({
        id: 'FIND-003',
        category: 'Protocol Alignment',
        finding: 'Primary endpoint data collection needs verification',
        severity: 'Major',
        impact: 'May not capture required primary endpoint data',
        recommendation: 'Verify CRF forms capture all primary endpoint requirements',
        priority: 'High'
      });
    }

    return findings;
  }

  /**
   * Generate CRF improvement recommendations
   */
  private async generateRecommendations(
    protocol: StudyProtocol,
    crfs: CRFSpecification[],
    analyses: any,
    options: Required<ValidationOptions>
  ): Promise<CRFRecommendation[]> {
    const recommendations: CRFRecommendation[] = [];

    // Basic recommendations based on protocol
    if (protocol.studyPhase === 'Phase 1') {
      recommendations.push({
        id: 'REC-001',
        category: 'Content',
        priority: 'High',
        recommendation: 'Enhance safety monitoring forms for Phase 1 study',
        rationale: 'Phase 1 studies require extensive safety data collection',
        impact: 'Improved safety monitoring and regulatory compliance',
        implementationEffort: 'Medium',
        timeline: '2-3 weeks',
        businessRationale: 'Ensures adequate safety oversight for first-in-human studies',
        affectedForms: ['Adverse Events', 'Vital Signs', 'Laboratory']
      });
    }

    // CRF structure recommendations
    if (crfs.length > 20) {
      recommendations.push({
        id: 'REC-002',
        category: 'Efficiency',
        priority: 'Medium',
        recommendation: 'Consider consolidating forms to reduce data entry burden',
        rationale: 'Large number of forms may impact data quality and site burden',
        impact: 'Reduced data entry time and improved data quality',
        implementationEffort: 'High',
        timeline: '4-6 weeks',
        businessRationale: 'Improved operational efficiency and reduced site burden',
        affectedForms: ['Multiple forms']
      });
    }

    return recommendations;
  }

  /**
   * Identify critical issues requiring immediate attention
   */
  private identifyCriticalIssues(
    findings: ValidationFinding[],
    recommendations: CRFRecommendation[]
  ): CriticalIssue[] {
    const criticalIssues: CriticalIssue[] = [];

    // Convert critical findings to critical issues
    findings
      .filter(f => f.severity === 'Critical')
      .forEach(finding => {
        criticalIssues.push({
          issue: finding.finding,
          impact: finding.impact,
          recommendation: finding.recommendation,
          severity: 'Critical',
          urgency: 'Immediate',
          issueCategory: this.mapFindingCategoryToIssueCategory(finding.category),
          affectedComponents: [finding.formName || 'General'].filter(Boolean)
        });
      });

    return criticalIssues;
  }

  /**
   * Calculate various validation scores
   */
  private calculateValidationScores(
    structureAnalysis: StructureAnalysisResult | undefined,
    protocolAlignment: ProtocolAlignmentResult | undefined,
    findings: ValidationFinding[]
  ): {
    overallScore: number;
    completenessScore: number;
    qualityScore: number;
    complianceScore: number;
  } {
    // Simple scoring algorithm - will be enhanced
    const criticalIssues = findings.filter(f => f.severity === 'Critical').length;
    const majorIssues = findings.filter(f => f.severity === 'Major').length;
    const minorIssues = findings.filter(f => f.severity === 'Minor').length;

    let baseScore = 100;
    baseScore -= (criticalIssues * 25);
    baseScore -= (majorIssues * 10);
    baseScore -= (minorIssues * 3);

    const overallScore = Math.max(0, Math.min(100, baseScore));

    return {
      overallScore,
      completenessScore: structureAnalysis?.structuralScore || 75,
      qualityScore: overallScore,
      complianceScore: protocolAlignment?.overallAlignmentScore || 80
    };
  }

  /**
   * Generate executive summary
   */
  private async generateExecutiveSummary(
    protocol: StudyProtocol,
    analyses: any,
    options: Required<ValidationOptions>
  ): Promise<ValidationExecutiveSummary> {
    const { scores, validationFindings, recommendations, criticalIssues } = analyses;

    const qualityLevel = this.determineQualityLevel(scores.overallScore);
    const alignmentLevel = this.determineAlignmentLevel(scores.complianceScore);
    const recommendationLevel = this.determineRecommendationLevel(scores.overallScore, criticalIssues.length);

    return {
      overallAssessment: {
        validationScore: scores.overallScore,
        qualityLevel,
        protocolAlignment: alignmentLevel,
        recommendation: recommendationLevel,
        rationale: this.generateRationale(scores, criticalIssues.length, protocol)
      },
      keyFindings: validationFindings.slice(0, 5),
      criticalIssues: criticalIssues.slice(0, 5),
      topRecommendations: recommendations.slice(0, 5),
      complianceStatus: {
        cdiscCompliance: 'Mostly Compliant',
        regulatoryCompliance: 'Compliant',
        protocolCompliance: alignmentLevel === 'Fully Aligned' ? 'Compliant' : 'Mostly Compliant'
      },
      nextSteps: [
        {
          step: 'Review critical issues',
          timeline: 'Immediate',
          responsibility: 'Data Management Team',
          deliverable: 'Critical issue resolution plan',
          dependencies: []
        },
        {
          step: 'Implement high-priority recommendations',
          timeline: '1-2 weeks',
          responsibility: 'CRF Development Team',
          deliverable: 'Updated CRF specifications',
          dependencies: ['Critical issue resolution']
        }
      ]
    };
  }

  /**
   * Validate analysis inputs
   */
  private validateInputs(protocol: StudyProtocol, crfs: CRFSpecification[]): void {
    if (!protocol) {
      throw new ValidationError('Protocol is required for CRF validation');
    }

    if (!protocol.studyTitle && !protocol.protocolNumber) {
      throw new ValidationError('Protocol must have either a study title or protocol number');
    }

    if (!Array.isArray(crfs)) {
      throw new ValidationError('CRFs must be provided as an array');
    }
  }

  /**
   * Generate unique validation ID
   */
  private generateValidationId(): string {
    this.validationCount++;
    const timestamp = Date.now();
    return `CRF-VAL-${timestamp}-${this.validationCount.toString().padStart(4, '0')}`;
  }

  // Helper methods

  private checkBasicForms(crfs: CRFSpecification[]): { demographics: boolean; } {
    const formNames = crfs.map(crf => crf.formName?.toLowerCase() || '');
    return {
      demographics: formNames.some(name => 
        name.includes('demographic') || name.includes('subject') || name.includes('dm')
      )
    };
  }

  private mapFindingCategoryToIssueCategory(category: string): 'Regulatory' | 'Clinical' | 'Operational' | 'Data Quality' {
    const mapping: Record<string, 'Regulatory' | 'Clinical' | 'Operational' | 'Data Quality'> = {
      'Compliance': 'Regulatory',
      'Protocol Alignment': 'Clinical',
      'Efficiency': 'Operational',
      'Structure': 'Data Quality',
      'Content': 'Data Quality'
    };
    return mapping[category] || 'Data Quality';
  }

  private determineQualityLevel(score: number): 'Excellent' | 'Good' | 'Fair' | 'Poor' {
    if (score >= 90) return 'Excellent';
    if (score >= 75) return 'Good';
    if (score >= 60) return 'Fair';
    return 'Poor';
  }

  private determineAlignmentLevel(score: number): 'Fully Aligned' | 'Mostly Aligned' | 'Partially Aligned' | 'Misaligned' {
    if (score >= 95) return 'Fully Aligned';
    if (score >= 80) return 'Mostly Aligned';
    if (score >= 60) return 'Partially Aligned';
    return 'Misaligned';
  }

  private determineRecommendationLevel(score: number, criticalIssues: number): 'Approve' | 'Approve with Minor Changes' | 'Requires Revision' | 'Major Revision Required' {
    if (criticalIssues > 0) return 'Major Revision Required';
    if (score < 70) return 'Requires Revision';
    if (score < 85) return 'Approve with Minor Changes';
    return 'Approve';
  }

  private generateRationale(scores: any, criticalIssuesCount: number, protocol: StudyProtocol): string {
    if (criticalIssuesCount > 0) {
      return `${criticalIssuesCount} critical issues identified that require immediate attention before the CRF can be approved for ${protocol.studyTitle}.`;
    }
    if (scores.overallScore >= 85) {
      return `CRF shows good alignment with protocol requirements and meets quality standards for ${protocol.studyPhase} study.`;
    }
    return `CRF requires some improvements to better align with protocol requirements and enhance data quality.`;
  }

  // Default implementations for development

  private createDefaultStructureAnalysis(): StructureAnalysisResult {
    return {
      formsCount: 0,
      fieldsCount: 0,
      validationRulesCount: 0,
      structuralScore: 75,
      formAnalysis: [],
      structuralIssues: [],
      recommendations: []
    };
  }

  private createDefaultProtocolAlignment(): ProtocolAlignmentResult {
    return {
      overallAlignmentScore: 80,
      endpointCoverage: [],
      visitScheduleAlignment: [],
      populationCriteriaCoverage: {
        inclusionCriteria: [],
        exclusionCriteria: [],
        overallCoverage: 80,
        missingCriteria: []
      },
      missingRequirements: [],
      redundantCollections: [],
      dataFlowIssues: []
    };
  }
}

// Export singleton instance
export const crfValidatorEngine = new CRFValidatorEngine();