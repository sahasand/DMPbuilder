// Endpoint Assessment Specialist
import {
  EndpointAssessment,
  EndpointEvaluation,
  EndpointHierarchyAnalysis,
  MultiplicityConcerns,
  RegulatoryAlignment,
  GuidanceAlignment,
  EndpointRecommendation,
  ImpactAssessment
} from '../types/comprehensive-analysis';
import { StudyProtocol } from '../../../types';
import { createModuleLogger, logInfo } from '../../../utils/logger';

const logger = createModuleLogger('endpoint-analyzer');

export class EndpointAnalyzer {

  /**
   * Comprehensive endpoint assessment
   */
  async assessEndpoints(
    protocol: StudyProtocol,
    regulatoryRegion: string = 'FDA'
  ): Promise<EndpointAssessment> {
    logInfo('Starting endpoint assessment', {
      protocolNumber: protocol.protocolNumber,
      primaryEndpoints: protocol.endpoints?.primary?.length || 0,
      secondaryEndpoints: protocol.endpoints?.secondary?.length || 0,
      regulatoryRegion
    });

    const primaryEndpoints = this.evaluateEndpoints(
      protocol.endpoints?.primary || [],
      'Primary',
      protocol
    );

    const secondaryEndpoints = this.evaluateEndpoints(
      protocol.endpoints?.secondary || [],
      'Secondary',
      protocol
    );

    const exploratoryEndpoints = protocol.endpoints?.exploratory?.length ? 
      this.evaluateEndpoints(protocol.endpoints.exploratory, 'Exploratory', protocol) : 
      undefined;

    const endpointHierarchy = this.analyzeEndpointHierarchy(protocol);
    const regulatoryAlignment = this.assessRegulatoryAlignment(protocol, regulatoryRegion);
    const recommendations = this.generateEndpointRecommendations(
      protocol, 
      primaryEndpoints, 
      secondaryEndpoints, 
      endpointHierarchy
    );

    return {
      primaryEndpoints,
      secondaryEndpoints,
      exploratoryEndpoints,
      endpointHierarchy,
      regulatoryAlignment,
      recommendations
    };
  }

  /**
   * Evaluate individual endpoints
   */
  private evaluateEndpoints(
    endpoints: any[],
    category: 'Primary' | 'Secondary' | 'Exploratory',
    protocol: StudyProtocol
  ): EndpointEvaluation[] {
    return endpoints.map(endpoint => {
      const endpointText = typeof endpoint === 'string' ? endpoint : 
                          endpoint.description || endpoint.name || 'Unknown endpoint';

      return {
        endpoint: endpointText,
        type: this.categorizeEndpointType(endpointText, protocol),
        measurability: this.assessMeasurability(endpointText),
        clinicalRelevance: this.assessClinicalRelevance(endpointText, category),
        regulatoryAcceptance: this.assessRegulatoryAcceptance(endpointText, protocol),
        measurementChallenges: this.identifyMeasurementChallenges(endpointText),
        strengthsWeaknesses: this.analyzeEndpointStrengthsWeaknesses(endpointText, category)
      };
    });
  }

  /**
   * Categorize endpoint type
   */
  private categorizeEndpointType(
    endpoint: string,
    protocol: StudyProtocol
  ): 'Efficacy' | 'Safety' | 'Pharmacokinetic' | 'Pharmacodynamic' | 'Quality of Life' | 'Economic' {
    const lower = endpoint.toLowerCase();

    // Safety indicators
    if (lower.includes('safety') || lower.includes('adverse') || lower.includes('tolerability') ||
        lower.includes('toxicity') || lower.includes('ae') || lower.includes('sae')) {
      return 'Safety';
    }

    // PK indicators
    if (lower.includes('pharmacokinetic') || lower.includes('pk') || lower.includes('concentration') ||
        lower.includes('clearance') || lower.includes('half-life') || lower.includes('bioavailability')) {
      return 'Pharmacokinetic';
    }

    // PD indicators
    if (lower.includes('pharmacodynamic') || lower.includes('pd') || lower.includes('biomarker') ||
        lower.includes('mechanism') || lower.includes('target engagement')) {
      return 'Pharmacodynamic';
    }

    // QoL indicators
    if (lower.includes('quality of life') || lower.includes('qol') || lower.includes('patient reported') ||
        lower.includes('prom') || lower.includes('functional') || lower.includes('symptom')) {
      return 'Quality of Life';
    }

    // Economic indicators
    if (lower.includes('cost') || lower.includes('economic') || lower.includes('resource') ||
        lower.includes('utilization') || lower.includes('budget')) {
      return 'Economic';
    }

    // Default to efficacy for primary outcomes
    return 'Efficacy';
  }

  /**
   * Assess endpoint measurability
   */
  private assessMeasurability(endpoint: string): 'Excellent' | 'Good' | 'Fair' | 'Poor' {
    const lower = endpoint.toLowerCase();

    // Excellent measurability indicators
    if (lower.includes('mortality') || lower.includes('death') || lower.includes('survival') ||
        lower.includes('laboratory') || lower.includes('biomarker') || lower.includes('objective response')) {
      return 'Excellent';
    }

    // Good measurability indicators
    if (lower.includes('time to') || lower.includes('duration') || lower.includes('change from baseline') ||
        lower.includes('scale') || lower.includes('score') || lower.includes('imaging')) {
      return 'Good';
    }

    // Fair measurability indicators
    if (lower.includes('quality of life') || lower.includes('functional') || lower.includes('symptom') ||
        lower.includes('pain') || lower.includes('fatigue')) {
      return 'Fair';
    }

    // Poor measurability indicators
    if (lower.includes('well-being') || lower.includes('satisfaction') || lower.includes('global') ||
        lower.includes('overall') || lower.includes('general')) {
      return 'Poor';
    }

    return 'Good'; // Default
  }

  /**
   * Assess clinical relevance
   */
  private assessClinicalRelevance(
    endpoint: string,
    category: 'Primary' | 'Secondary' | 'Exploratory'
  ): 'High' | 'Medium' | 'Low' {
    const lower = endpoint.toLowerCase();

    // High clinical relevance indicators
    if (lower.includes('mortality') || lower.includes('survival') || lower.includes('death') ||
        lower.includes('cure') || lower.includes('remission') || lower.includes('disease progression') ||
        lower.includes('major adverse') || lower.includes('hospitalization')) {
      return 'High';
    }

    // Medium clinical relevance
    if (lower.includes('symptom') || lower.includes('function') || lower.includes('quality of life') ||
        lower.includes('pain') || lower.includes('response rate') || lower.includes('time to')) {
      return 'Medium';
    }

    // Category-based adjustment
    if (category === 'Primary') {
      return 'High'; // Primary endpoints should be clinically relevant
    } else if (category === 'Exploratory') {
      return 'Low'; // Exploratory endpoints are often less directly relevant
    }

    return 'Medium'; // Default for secondary endpoints
  }

  /**
   * Assess regulatory acceptance
   */
  private assessRegulatoryAcceptance(
    endpoint: string,
    protocol: StudyProtocol
  ): 'High' | 'Medium' | 'Low' | 'Unknown' {
    const lower = endpoint.toLowerCase();
    const phase = protocol.studyPhase;

    // High regulatory acceptance
    if (lower.includes('overall survival') || lower.includes('mortality') ||
        lower.includes('progression-free survival') || lower.includes('objective response') ||
        lower.includes('complete response') || lower.includes('pathological complete response')) {
      return 'High';
    }

    // Phase-specific considerations
    if (phase === '1') {
      if (lower.includes('safety') || lower.includes('toxicity') || lower.includes('dose') ||
          lower.includes('pharmacokinetic')) {
        return 'High';
      }
    }

    if (phase === '2') {
      if (lower.includes('response') || lower.includes('efficacy') || lower.includes('activity')) {
        return 'Medium';
      }
    }

    if (phase === '3') {
      if (lower.includes('clinical benefit') || lower.includes('quality of life') ||
          lower.includes('functional')) {
        return 'Medium';
      }
    }

    // Biomarker endpoints
    if (lower.includes('biomarker') || lower.includes('pharmacodynamic')) {
      return phase === '1' || phase === '2' ? 'Medium' : 'Low';
    }

    return 'Unknown';
  }

  /**
   * Identify measurement challenges
   */
  private identifyMeasurementChallenges(endpoint: string): string[] {
    const challenges: string[] = [];
    const lower = endpoint.toLowerCase();

    if (lower.includes('quality of life') || lower.includes('pain') || lower.includes('symptom')) {
      challenges.push('Subjective measurement dependent on patient reporting');
      challenges.push('Potential for recall bias');
    }

    if (lower.includes('biomarker') || lower.includes('laboratory')) {
      challenges.push('Assay validation and standardization required');
      challenges.push('Sample collection and storage considerations');
    }

    if (lower.includes('imaging')) {
      challenges.push('Inter-reader variability');
      challenges.push('Standardization of imaging protocols');
    }

    if (lower.includes('time to') || lower.includes('survival')) {
      challenges.push('Requires long-term follow-up');
      challenges.push('Potential for informative censoring');
    }

    if (lower.includes('composite')) {
      challenges.push('Multiple components may have different clinical importance');
      challenges.push('Complex interpretation of results');
    }

    return challenges;
  }

  /**
   * Analyze endpoint strengths and weaknesses
   */
  private analyzeEndpointStrengthsWeaknesses(
    endpoint: string,
    category: 'Primary' | 'Secondary' | 'Exploratory'
  ): { strengths: string[], weaknesses: string[] } {
    const strengths: string[] = [];
    const weaknesses: string[] = [];
    const lower = endpoint.toLowerCase();

    // Survival endpoints
    if (lower.includes('survival') || lower.includes('mortality')) {
      strengths.push('Clinically meaningful and objective');
      strengths.push('High regulatory acceptance');
      strengths.push('Clear interpretation');
      weaknesses.push('May require large sample sizes');
      weaknesses.push('Long follow-up period needed');
    }

    // Response endpoints
    if (lower.includes('response') || lower.includes('remission')) {
      strengths.push('Objective and measurable');
      strengths.push('Clinically relevant');
      if (lower.includes('objective')) {
        strengths.push('Well-established criteria available');
      }
      weaknesses.push('May not capture long-term benefit');
    }

    // Laboratory/biomarker endpoints
    if (lower.includes('laboratory') || lower.includes('biomarker')) {
      strengths.push('Objective and quantitative');
      strengths.push('Can provide mechanistic insights');
      weaknesses.push('Clinical relevance may be unclear');
      weaknesses.push('Assay validation required');
    }

    // Patient-reported outcomes
    if (lower.includes('patient reported') || lower.includes('quality of life')) {
      strengths.push('Captures patient perspective');
      strengths.push('Important for regulatory submissions');
      weaknesses.push('Subjective and variable');
      weaknesses.push('Potential for bias');
    }

    // Time-to-event endpoints
    if (lower.includes('time to')) {
      strengths.push('Incorporates timing information');
      strengths.push('Handles censoring appropriately');
      weaknesses.push('Requires careful event definition');
      weaknesses.push('May be influenced by follow-up intensity');
    }

    return { strengths, weaknesses };
  }

  /**
   * Analyze endpoint hierarchy and multiplicity
   */
  private analyzeEndpointHierarchy(protocol: StudyProtocol): EndpointHierarchyAnalysis {
    const primaryCount = protocol.endpoints?.primary?.length || 0;
    const secondaryCount = protocol.endpoints?.secondary?.length || 0;
    const totalCount = primaryCount + secondaryCount + (protocol.endpoints?.exploratory?.length || 0);

    const issues: string[] = [];
    const suggestions: string[] = [];

    // Multiple primary endpoints
    if (primaryCount > 1) {
      issues.push('Multiple primary endpoints create multiplicity concerns');
      suggestions.push('Consider hierarchical testing procedure');
      suggestions.push('Adjust significance levels using Bonferroni or other methods');
    }

    // Too many secondary endpoints
    if (secondaryCount > 8) {
      issues.push('Large number of secondary endpoints may lead to interpretation challenges');
      suggestions.push('Prioritize secondary endpoints by clinical importance');
      suggestions.push('Consider moving some endpoints to exploratory category');
    }

    // No primary endpoint
    if (primaryCount === 0) {
      issues.push('No primary endpoint specified');
      suggestions.push('Define clear primary endpoint for study success criteria');
    }

    // Total endpoint burden
    if (totalCount > 15) {
      issues.push('High total number of endpoints may impact study conduct');
      suggestions.push('Review endpoint necessity and clinical relevance');
    }

    const multiplicity: MultiplicityConcerns = {
      hasMultiplicity: primaryCount > 1 || secondaryCount > 3,
      adjustmentNeeded: primaryCount > 1,
      recommendedApproach: primaryCount > 1 ? 
        'Hierarchical testing or alpha adjustment' : 
        secondaryCount > 3 ? 'Consider adjustment for key secondary endpoints' : undefined
    };

    return {
      isAppropriate: issues.length === 0,
      issues,
      suggestions,
      multiplicity
    };
  }

  /**
   * Assess regulatory alignment
   */
  private assessRegulatoryAlignment(
    protocol: StudyProtocol,
    region: string
  ): RegulatoryAlignment {
    const guidance: GuidanceAlignment[] = [];
    const recommendations: string[] = [];

    // FDA-specific guidance
    if (region === 'FDA') {
      // Check for FDA preferred endpoints by therapeutic area
      const therapeuticArea = protocol.therapeuticArea?.toLowerCase() || '';
      
      if (therapeuticArea.includes('oncology') || therapeuticArea.includes('cancer')) {
        guidance.push({
          guidance: 'FDA Guidance for Clinical Trial Endpoints for Oncology',
          alignment: this.assessOncologyEndpointAlignment(protocol),
          gaps: this.identifyOncologyGaps(protocol),
          recommendations: this.getOncologyRecommendations(protocol)
        });
      }

      if (therapeuticArea.includes('cardiovascular') || therapeuticArea.includes('cardiac')) {
        guidance.push({
          guidance: 'FDA Guidance for Cardiovascular Outcomes Trials',
          alignment: 'Partial',
          gaps: ['Need to verify MACE endpoint definition'],
          recommendations: ['Consider standardized cardiovascular endpoint definitions']
        });
      }
    }

    // EMA-specific guidance
    if (region === 'EMA') {
      guidance.push({
        guidance: 'EMA Guideline on Clinical Investigation of Medicinal Products',
        alignment: 'Aligned',
        gaps: [],
        recommendations: ['Ensure compliance with EU clinical trial regulation']
      });
    }

    // General recommendations
    if (guidance.length === 0) {
      recommendations.push('Review therapeutic area-specific guidance documents');
      recommendations.push('Consider patient-reported outcome measures for patient-relevant endpoints');
      recommendations.push('Align endpoint definitions with regulatory precedent');
    }

    return {
      region: [region],
      guidance,
      recommendations
    };
  }

  /**
   * Generate endpoint recommendations
   */
  private generateEndpointRecommendations(
    protocol: StudyProtocol,
    primaryEndpoints: EndpointEvaluation[],
    secondaryEndpoints: EndpointEvaluation[],
    hierarchy: EndpointHierarchyAnalysis
  ): EndpointRecommendation[] {
    const recommendations: EndpointRecommendation[] = [];

    // Address hierarchy issues
    if (!hierarchy.isAppropriate) {
      hierarchy.issues.forEach(issue => {
        if (issue.includes('Multiple primary endpoints')) {
          recommendations.push({
            type: 'Modification',
            endpoint: 'Primary endpoint hierarchy',
            rationale: 'Multiple primary endpoints require multiplicity adjustment',
            impact: {
              timeline: 'Neutral',
              cost: 'Neutral',
              quality: 'Improvement',
              enrollment: 'Neutral',
              regulatory: 'Positive'
            },
            priority: 'High'
          });
        }
      });
    }

    // Poor measurability recommendations
    [...primaryEndpoints, ...secondaryEndpoints].forEach(endpoint => {
      if (endpoint.measurability === 'Poor') {
        recommendations.push({
          type: 'Modification',
          endpoint: endpoint.endpoint,
          rationale: 'Poor measurability may impact study interpretability',
          impact: {
            timeline: 'Positive',
            cost: 'Neutral',
            quality: 'Improvement',
            enrollment: 'Neutral',
            regulatory: 'Positive'
          },
          priority: 'Medium'
        });
      }
    });

    // Low regulatory acceptance recommendations
    primaryEndpoints.forEach(endpoint => {
      if (endpoint.regulatoryAcceptance === 'Low') {
        recommendations.push({
          type: 'Modification',
          endpoint: endpoint.endpoint,
          rationale: 'Low regulatory acceptance may impact approval pathway',
          impact: {
            timeline: 'Positive',
            cost: 'Neutral',
            quality: 'Improvement',
            enrollment: 'Neutral',
            regulatory: 'Positive'
          },
          priority: 'High'
        });
      }
    });

    return recommendations;
  }

  // Helper methods for regulatory assessment
  private assessOncologyEndpointAlignment(protocol: StudyProtocol): 'Aligned' | 'Partial' | 'Misaligned' {
    const primaryEndpoints = protocol.endpoints?.primary || [];
    const hasOS = primaryEndpoints.some(ep => 
      typeof ep === 'string' ? ep.toLowerCase().includes('overall survival') : false
    );
    const hasPFS = primaryEndpoints.some(ep => 
      typeof ep === 'string' ? ep.toLowerCase().includes('progression-free survival') : false
    );
    const hasORR = primaryEndpoints.some(ep => 
      typeof ep === 'string' ? ep.toLowerCase().includes('response rate') : false
    );

    if (hasOS || hasPFS || hasORR) {
      return 'Aligned';
    }
    return 'Partial';
  }

  private identifyOncologyGaps(protocol: StudyProtocol): string[] {
    const gaps: string[] = [];
    const primaryEndpoints = protocol.endpoints?.primary || [];
    
    if (primaryEndpoints.length === 0) {
      gaps.push('No primary endpoint specified');
    }

    const hasValidatedEndpoint = primaryEndpoints.some(ep => {
      const epStr = typeof ep === 'string' ? ep.toLowerCase() : '';
      return epStr.includes('survival') || epStr.includes('response');
    });

    if (!hasValidatedEndpoint) {
      gaps.push('Primary endpoint may not align with FDA oncology guidance');
    }

    return gaps;
  }

  private getOncologyRecommendations(protocol: StudyProtocol): string[] {
    return [
      'Consider overall survival or progression-free survival for late-phase trials',
      'Ensure response criteria follow RECIST guidelines',
      'Include patient-reported outcome measures for symptom assessment'
    ];
  }
}

// Export singleton instance
export const endpointAnalyzer = new EndpointAnalyzer();