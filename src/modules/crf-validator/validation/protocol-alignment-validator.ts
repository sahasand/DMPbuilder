import { createModuleLogger } from '../../../utils/logger';
import { StudyProtocol } from '../../../types/study-types';
import { CRFSpecification, ProtocolAlignmentResult, AlignmentIssue, EndpointCoverage } from '../types/crf-validation-types';

const logger = createModuleLogger('protocol-alignment-validator');

export interface AlignmentScoring {
  endpointCoverageScore: number;
  visitScheduleAlignmentScore: number;
  procedureAlignmentScore: number;
  populationCriteriaScore: number;
  overallAlignmentScore: number;
}

export class ProtocolAlignmentValidator {
  /**
   * Validates CRF alignment with protocol requirements
   */
  async validateAlignment(
    protocol: StudyProtocol, 
    crfSpec: CRFSpecification
  ): Promise<ProtocolAlignmentResult> {
    logger.info('Starting protocol-CRF alignment validation', {
      protocolId: protocol.protocolNumber,
      crfId: crfSpec.crfId
    });

    try {
      const scoring = await this.calculateAlignmentScores(protocol, crfSpec);
      const endpointCoverage = this.analyzeEndpointCoverage(protocol, crfSpec);
      const visitScheduleAlignment = this.analyzeVisitSchedule(protocol, crfSpec);
      const procedureAlignment = this.analyzeProcedureAlignment(protocol, crfSpec);
      const populationCriteria = this.analyzePopulationCriteria(protocol, crfSpec);
      const alignmentIssues = this.identifyAlignmentIssues(protocol, crfSpec);

      const result: ProtocolAlignmentResult = {
        validationId: `align-${Date.now()}`,
        protocolId: protocol.protocolNumber,
        crfId: crfSpec.crfId,
        alignmentScoring: scoring,
        endpointCoverage,
        visitScheduleAlignment,
        procedureAlignment,
        populationCriteria,
        alignmentIssues,
        alignmentStatus: this.determineAlignmentStatus(scoring.overallAlignmentScore),
        recommendations: this.generateAlignmentRecommendations(scoring, alignmentIssues),
        timestamp: new Date()
      };

      logger.info('Protocol-CRF alignment validation completed', {
        protocolId: protocol.protocolNumber,
        crfId: crfSpec.crfId,
        overallScore: scoring.overallAlignmentScore,
        alignmentStatus: result.alignmentStatus
      });

      return result;
    } catch (error) {
      logger.error('Failed to validate protocol-CRF alignment', {
        protocolId: protocol.protocolNumber,
        crfId: crfSpec.crfId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Calculate comprehensive alignment scores
   */
  private async calculateAlignmentScores(
    protocol: StudyProtocol, 
    crfSpec: CRFSpecification
  ): Promise<AlignmentScoring> {
    const endpointCoverageScore = this.calculateEndpointCoverageScore(protocol, crfSpec);
    const visitScheduleAlignmentScore = this.calculateVisitScheduleScore(protocol, crfSpec);
    const procedureAlignmentScore = this.calculateProcedureAlignmentScore(protocol, crfSpec);
    const populationCriteriaScore = this.calculatePopulationCriteriaScore(protocol, crfSpec);

    // Weighted overall score
    const overallAlignmentScore = Math.round(
      endpointCoverageScore * 0.35 +
      visitScheduleAlignmentScore * 0.25 +
      procedureAlignmentScore * 0.25 +
      populationCriteriaScore * 0.15
    );

    return {
      endpointCoverageScore,
      visitScheduleAlignmentScore,
      procedureAlignmentScore,
      populationCriteriaScore,
      overallAlignmentScore
    };
  }

  /**
   * Calculate endpoint coverage score
   */
  private calculateEndpointCoverageScore(protocol: StudyProtocol, crfSpec: CRFSpecification): number {
    const endpoints = [
      ...(protocol.primaryEndpoints || []),
      ...(protocol.secondaryEndpoints || []),
      ...(protocol.exploratoryEndpoints || [])
    ];

    if (endpoints.length === 0) return 100; // No endpoints to cover

    let coveredEndpoints = 0;
    const allFields = this.getAllCRFFields(crfSpec);

    for (const endpoint of endpoints) {
      if (this.isEndpointCovered(endpoint, allFields)) {
        coveredEndpoints++;
      }
    }

    return Math.round((coveredEndpoints / endpoints.length) * 100);
  }

  /**
   * Get all fields from all forms in CRF
   */
  private getAllCRFFields(crfSpec: CRFSpecification) {
    return (crfSpec.forms || []).flatMap(form => form.fields || []);
  }

  /**
   * Check if an endpoint is covered by CRF fields
   */
  private isEndpointCovered(endpoint: any, fields: any[]): boolean {
    if (!endpoint.description && !endpoint.name) return false;

    const endpointText = (endpoint.description || endpoint.name || '').toLowerCase();
    const endpointKeywords = this.extractEndpointKeywords(endpointText);

    return fields.some(field => {
      const fieldText = ((field.fieldName || '') + ' ' + 
                       (field.fieldLabel || '') + ' ' + 
                       (field.description || '')).toLowerCase();
      
      return endpointKeywords.some(keyword => 
        fieldText.includes(keyword) && keyword.length > 3
      );
    });
  }

  /**
   * Extract meaningful keywords from endpoint description
   */
  private extractEndpointKeywords(endpointText: string): string[] {
    const commonWords = new Set([
      'the', 'and', 'or', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
      'from', 'as', 'is', 'was', 'are', 'were', 'will', 'be', 'been', 'have',
      'has', 'had', 'do', 'does', 'did', 'can', 'could', 'should', 'would',
      'may', 'might', 'must', 'shall', 'this', 'that', 'these', 'those'
    ]);

    return endpointText
      .split(/\s+/)
      .map(word => word.replace(/[^\w]/g, '').toLowerCase())
      .filter(word => word.length > 2 && !commonWords.has(word))
      .slice(0, 10); // Limit to first 10 meaningful keywords
  }

  /**
   * Calculate visit schedule alignment score
   */
  private calculateVisitScheduleScore(protocol: StudyProtocol, crfSpec: CRFSpecification): number {
    const protocolVisits = this.extractProtocolVisits(protocol);
    const crfVisits = this.extractCRFVisits(crfSpec);

    if (protocolVisits.length === 0) return 100; // No visits to align

    let alignedVisits = 0;
    for (const protocolVisit of protocolVisits) {
      if (this.isVisitCovered(protocolVisit, crfVisits)) {
        alignedVisits++;
      }
    }

    return Math.round((alignedVisits / protocolVisits.length) * 100);
  }

  /**
   * Extract visit schedule from protocol
   */
  private extractProtocolVisits(protocol: StudyProtocol): string[] {
    const visits: string[] = [];
    
    // Extract from visit schedule if available
    if (protocol.visitSchedule) {
      visits.push(...protocol.visitSchedule);
    }

    // Extract from study design description
    if (protocol.studyDesign) {
      const visitMatches = protocol.studyDesign.match(/\b(?:visit|day|week|month)\s+\d+\b/gi);
      if (visitMatches) {
        visits.push(...visitMatches);
      }
    }

    // Add common clinical trial visits if none found
    if (visits.length === 0) {
      visits.push('Screening', 'Baseline', 'Follow-up');
    }

    return [...new Set(visits)]; // Remove duplicates
  }

  /**
   * Extract visit schedule from CRF specification
   */
  private extractCRFVisits(crfSpec: CRFSpecification): string[] {
    const visits = new Set<string>();

    for (const form of crfSpec.forms || []) {
      if (form.visitSchedule) {
        form.visitSchedule.forEach(visit => visits.add(visit));
      }
    }

    return Array.from(visits);
  }

  /**
   * Check if a protocol visit is covered in CRF
   */
  private isVisitCovered(protocolVisit: string, crfVisits: string[]): boolean {
    const protocolVisitLower = protocolVisit.toLowerCase();
    
    return crfVisits.some(crfVisit => {
      const crfVisitLower = crfVisit.toLowerCase();
      
      // Exact match
      if (protocolVisitLower === crfVisitLower) return true;
      
      // Partial match for common patterns
      if (protocolVisitLower.includes('screen') && crfVisitLower.includes('screen')) return true;
      if (protocolVisitLower.includes('baseline') && crfVisitLower.includes('baseline')) return true;
      if (protocolVisitLower.includes('follow') && crfVisitLower.includes('follow')) return true;
      
      // Day/week/month pattern matching
      const dayMatch = protocolVisitLower.match(/day\s*(\d+)/);
      const weekMatch = protocolVisitLower.match(/week\s*(\d+)/);
      const monthMatch = protocolVisitLower.match(/month\s*(\d+)/);
      
      if (dayMatch && crfVisitLower.includes(`day ${dayMatch[1]}`)) return true;
      if (weekMatch && crfVisitLower.includes(`week ${weekMatch[1]}`)) return true;
      if (monthMatch && crfVisitLower.includes(`month ${monthMatch[1]}`)) return true;
      
      return false;
    });
  }

  /**
   * Calculate procedure alignment score
   */
  private calculateProcedureAlignmentScore(protocol: StudyProtocol, crfSpec: CRFSpecification): number {
    const protocolProcedures = this.extractProtocolProcedures(protocol);
    const crfProcedures = this.extractCRFProcedures(crfSpec);

    if (protocolProcedures.length === 0) return 100; // No procedures to align

    let alignedProcedures = 0;
    for (const procedure of protocolProcedures) {
      if (this.isProcedureCovered(procedure, crfProcedures)) {
        alignedProcedures++;
      }
    }

    return Math.round((alignedProcedures / protocolProcedures.length) * 100);
  }

  /**
   * Extract procedures from protocol
   */
  private extractProtocolProcedures(protocol: StudyProtocol): string[] {
    const procedures: string[] = [];
    
    // Extract from study procedures if available
    if (protocol.studyProcedures) {
      procedures.push(...protocol.studyProcedures);
    }

    // Common clinical trial procedures
    const commonProcedures = [
      'vital signs', 'laboratory tests', 'adverse events', 'concomitant medications',
      'physical examination', 'medical history', 'demographics'
    ];

    if (procedures.length === 0) {
      procedures.push(...commonProcedures);
    }

    return procedures;
  }

  /**
   * Extract procedures from CRF specification
   */
  private extractCRFProcedures(crfSpec: CRFSpecification): string[] {
    const procedures: string[] = [];

    for (const form of crfSpec.forms || []) {
      if (form.formName) {
        procedures.push(form.formName);
      }
      
      // Extract from field names
      for (const field of form.fields || []) {
        if (field.fieldName) {
          procedures.push(field.fieldName);
        }
      }
    }

    return procedures;
  }

  /**
   * Check if a procedure is covered in CRF
   */
  private isProcedureCovered(procedure: string, crfProcedures: string[]): boolean {
    const procedureLower = procedure.toLowerCase();
    const procedureKeywords = procedureLower.split(/\s+/).filter(word => word.length > 2);

    return crfProcedures.some(crfProcedure => {
      const crfProcedureLower = crfProcedure.toLowerCase();
      
      // Check if any significant keyword matches
      return procedureKeywords.some(keyword => 
        crfProcedureLower.includes(keyword) && keyword.length > 3
      );
    });
  }

  /**
   * Calculate population criteria score
   */
  private calculatePopulationCriteriaScore(protocol: StudyProtocol, crfSpec: CRFSpecification): number {
    const allFields = this.getAllCRFFields(crfSpec);
    let criteriaScore = 0;
    let totalCriteria = 0;

    // Check for demographics coverage
    if (this.hasDemographicsFields(allFields)) criteriaScore += 25;
    totalCriteria += 25;

    // Check for medical history coverage
    if (this.hasMedicalHistoryFields(allFields)) criteriaScore += 25;
    totalCriteria += 25;

    // Check for inclusion criteria fields
    if (this.hasInclusionCriteriaFields(allFields, protocol)) criteriaScore += 25;
    totalCriteria += 25;

    // Check for exclusion criteria fields
    if (this.hasExclusionCriteriaFields(allFields, protocol)) criteriaScore += 25;
    totalCriteria += 25;

    return totalCriteria > 0 ? Math.round((criteriaScore / totalCriteria) * 100) : 0;
  }

  /**
   * Check if CRF has demographics fields
   */
  private hasDemographicsFields(fields: any[]): boolean {
    const demographicKeywords = ['age', 'gender', 'sex', 'race', 'ethnicity', 'birth', 'demographic'];
    
    return fields.some(field => {
      const fieldText = ((field.fieldName || '') + ' ' + (field.fieldLabel || '')).toLowerCase();
      return demographicKeywords.some(keyword => fieldText.includes(keyword));
    });
  }

  /**
   * Check if CRF has medical history fields
   */
  private hasMedicalHistoryFields(fields: any[]): boolean {
    const historyKeywords = ['medical history', 'history', 'prior', 'previous', 'past medical'];
    
    return fields.some(field => {
      const fieldText = ((field.fieldName || '') + ' ' + (field.fieldLabel || '')).toLowerCase();
      return historyKeywords.some(keyword => fieldText.includes(keyword));
    });
  }

  /**
   * Check if CRF has inclusion criteria fields
   */
  private hasInclusionCriteriaFields(fields: any[], protocol: StudyProtocol): boolean {
    const inclusionKeywords = ['inclusion', 'eligible', 'qualify', 'criteria'];
    
    return fields.some(field => {
      const fieldText = ((field.fieldName || '') + ' ' + (field.fieldLabel || '')).toLowerCase();
      return inclusionKeywords.some(keyword => fieldText.includes(keyword));
    });
  }

  /**
   * Check if CRF has exclusion criteria fields
   */
  private hasExclusionCriteriaFields(fields: any[], protocol: StudyProtocol): boolean {
    const exclusionKeywords = ['exclusion', 'exclude', 'prohibited', 'contraindication'];
    
    return fields.some(field => {
      const fieldText = ((field.fieldName || '') + ' ' + (field.fieldLabel || '')).toLowerCase();
      return exclusionKeywords.some(keyword => fieldText.includes(keyword));
    });
  }

  /**
   * Analyze endpoint coverage in detail
   */
  private analyzeEndpointCoverage(protocol: StudyProtocol, crfSpec: CRFSpecification): EndpointCoverage {
    const primaryEndpoints = protocol.primaryEndpoints || [];
    const secondaryEndpoints = protocol.secondaryEndpoints || [];
    const exploratoryEndpoints = protocol.exploratoryEndpoints || [];
    
    const allFields = this.getAllCRFFields(crfSpec);

    const primaryCoverage = this.calculateEndpointTypeCoverage(primaryEndpoints, allFields);
    const secondaryCoverage = this.calculateEndpointTypeCoverage(secondaryEndpoints, allFields);
    const exploratoryCoverage = this.calculateEndpointTypeCoverage(exploratoryEndpoints, allFields);

    return {
      primaryEndpoints: {
        total: primaryEndpoints.length,
        covered: primaryCoverage.covered,
        coveragePercentage: primaryCoverage.percentage,
        uncoveredEndpoints: primaryCoverage.uncovered
      },
      secondaryEndpoints: {
        total: secondaryEndpoints.length,
        covered: secondaryCoverage.covered,
        coveragePercentage: secondaryCoverage.percentage,
        uncoveredEndpoints: secondaryCoverage.uncovered
      },
      exploratoryEndpoints: {
        total: exploratoryEndpoints.length,
        covered: exploratoryCoverage.covered,
        coveragePercentage: exploratoryCoverage.percentage,
        uncoveredEndpoints: exploratoryCoverage.uncovered
      }
    };
  }

  /**
   * Calculate coverage for a specific endpoint type
   */
  private calculateEndpointTypeCoverage(endpoints: any[], fields: any[]) {
    if (endpoints.length === 0) {
      return { covered: 0, percentage: 100, uncovered: [] };
    }

    let covered = 0;
    const uncovered: string[] = [];

    for (const endpoint of endpoints) {
      if (this.isEndpointCovered(endpoint, fields)) {
        covered++;
      } else {
        uncovered.push(endpoint.description || endpoint.name || 'Unnamed endpoint');
      }
    }

    return {
      covered,
      percentage: Math.round((covered / endpoints.length) * 100),
      uncovered
    };
  }

  /**
   * Analyze visit schedule alignment in detail
   */
  private analyzeVisitSchedule(protocol: StudyProtocol, crfSpec: CRFSpecification) {
    const protocolVisits = this.extractProtocolVisits(protocol);
    const crfVisits = this.extractCRFVisits(crfSpec);

    const alignedVisits: string[] = [];
    const missingVisits: string[] = [];

    for (const protocolVisit of protocolVisits) {
      if (this.isVisitCovered(protocolVisit, crfVisits)) {
        alignedVisits.push(protocolVisit);
      } else {
        missingVisits.push(protocolVisit);
      }
    }

    return {
      protocolVisits: protocolVisits.length,
      crfVisits: crfVisits.length,
      alignedVisits: alignedVisits.length,
      missingVisits,
      extraCRFVisits: this.findExtraCRFVisits(protocolVisits, crfVisits),
      alignmentPercentage: protocolVisits.length > 0 ? 
        Math.round((alignedVisits.length / protocolVisits.length) * 100) : 100
    };
  }

  /**
   * Find CRF visits not mentioned in protocol
   */
  private findExtraCRFVisits(protocolVisits: string[], crfVisits: string[]): string[] {
    return crfVisits.filter(crfVisit => 
      !protocolVisits.some(protocolVisit => 
        this.isVisitCovered(protocolVisit, [crfVisit])
      )
    );
  }

  /**
   * Analyze procedure alignment in detail
   */
  private analyzeProcedureAlignment(protocol: StudyProtocol, crfSpec: CRFSpecification) {
    const protocolProcedures = this.extractProtocolProcedures(protocol);
    const crfProcedures = this.extractCRFProcedures(crfSpec);

    const alignedProcedures: string[] = [];
    const missingProcedures: string[] = [];

    for (const procedure of protocolProcedures) {
      if (this.isProcedureCovered(procedure, crfProcedures)) {
        alignedProcedures.push(procedure);
      } else {
        missingProcedures.push(procedure);
      }
    }

    return {
      protocolProcedures: protocolProcedures.length,
      crfForms: (crfSpec.forms || []).length,
      alignedProcedures: alignedProcedures.length,
      missingProcedures,
      alignmentPercentage: protocolProcedures.length > 0 ?
        Math.round((alignedProcedures.length / protocolProcedures.length) * 100) : 100
    };
  }

  /**
   * Analyze population criteria coverage
   */
  private analyzePopulationCriteria(protocol: StudyProtocol, crfSpec: CRFSpecification) {
    const allFields = this.getAllCRFFields(crfSpec);

    return {
      hasDemographics: this.hasDemographicsFields(allFields),
      hasMedicalHistory: this.hasMedicalHistoryFields(allFields),
      hasInclusionCriteria: this.hasInclusionCriteriaFields(allFields, protocol),
      hasExclusionCriteria: this.hasExclusionCriteriaFields(allFields, protocol),
      populationCoverageScore: this.calculatePopulationCriteriaScore(protocol, crfSpec)
    };
  }

  /**
   * Identify specific alignment issues
   */
  private identifyAlignmentIssues(protocol: StudyProtocol, crfSpec: CRFSpecification): AlignmentIssue[] {
    const issues: AlignmentIssue[] = [];

    // Check for missing primary endpoints
    const primaryEndpoints = protocol.primaryEndpoints || [];
    const allFields = this.getAllCRFFields(crfSpec);

    for (const endpoint of primaryEndpoints) {
      if (!this.isEndpointCovered(endpoint, allFields)) {
        issues.push({
          issueId: `endpoint-${Date.now()}-${Math.random()}`,
          category: 'Endpoint Coverage',
          severity: 'Critical',
          description: `Primary endpoint not adequately covered in CRF: ${endpoint.description || endpoint.name}`,
          impact: 'Missing primary endpoint data will prevent study objective achievement',
          recommendation: 'Add specific fields to capture primary endpoint data',
          affectedElements: [endpoint.description || endpoint.name || 'Unnamed endpoint']
        });
      }
    }

    // Check for missing visit schedule alignment
    const protocolVisits = this.extractProtocolVisits(protocol);
    const crfVisits = this.extractCRFVisits(crfSpec);

    for (const visit of protocolVisits) {
      if (!this.isVisitCovered(visit, crfVisits)) {
        issues.push({
          issueId: `visit-${Date.now()}-${Math.random()}`,
          category: 'Visit Schedule',
          severity: 'Major',
          description: `Protocol visit not covered in CRF: ${visit}`,
          impact: 'Data collection may not align with protocol schedule',
          recommendation: `Add visit schedule entry for ${visit}`,
          affectedElements: [visit]
        });
      }
    }

    // Check for missing population criteria
    if (!this.hasDemographicsFields(allFields)) {
      issues.push({
        issueId: `demo-${Date.now()}`,
        category: 'Population Criteria',
        severity: 'Major',
        description: 'Missing demographics fields in CRF',
        impact: 'Cannot verify patient eligibility and baseline characteristics',
        recommendation: 'Add demographic data collection fields (age, gender, race, etc.)',
        affectedElements: ['Demographics']
      });
    }

    return issues;
  }

  /**
   * Determine overall alignment status
   */
  private determineAlignmentStatus(overallScore: number): 'Fully Aligned' | 'Mostly Aligned' | 'Partially Aligned' | 'Misaligned' {
    if (overallScore >= 90) return 'Fully Aligned';
    if (overallScore >= 75) return 'Mostly Aligned';
    if (overallScore >= 50) return 'Partially Aligned';
    return 'Misaligned';
  }

  /**
   * Generate alignment improvement recommendations
   */
  private generateAlignmentRecommendations(
    scoring: AlignmentScoring, 
    issues: AlignmentIssue[]
  ): string[] {
    const recommendations: string[] = [];

    // Endpoint coverage recommendations
    if (scoring.endpointCoverageScore < 80) {
      recommendations.push(
        'Review primary and secondary endpoints to ensure all required data points are captured in CRF forms'
      );
    }

    // Visit schedule recommendations
    if (scoring.visitScheduleAlignmentScore < 80) {
      recommendations.push(
        'Align CRF visit schedule with protocol requirements to ensure proper data collection timing'
      );
    }

    // Procedure alignment recommendations
    if (scoring.procedureAlignmentScore < 80) {
      recommendations.push(
        'Add missing procedure forms or fields to cover all protocol-required assessments'
      );
    }

    // Population criteria recommendations
    if (scoring.populationCriteriaScore < 80) {
      recommendations.push(
        'Enhance population criteria coverage by adding demographic, medical history, and eligibility fields'
      );
    }

    // Critical issue recommendations
    const criticalIssues = issues.filter(issue => issue.severity === 'Critical');
    if (criticalIssues.length > 0) {
      recommendations.push(
        `Address ${criticalIssues.length} critical alignment issues before study initiation`
      );
    }

    // Major issue recommendations
    const majorIssues = issues.filter(issue => issue.severity === 'Major');
    if (majorIssues.length > 0) {
      recommendations.push(
        `Resolve ${majorIssues.length} major alignment issues to improve protocol compliance`
      );
    }

    return recommendations;
  }
}

export const protocolAlignmentValidator = new ProtocolAlignmentValidator();