// Study Design Analysis Specialist
import {
  StudyDesignAnalysis,
  DesignClassification,
  ClinicalStrength,
  ClinicalWeakness,
  ComplexityAssessment,
  ComplexityFactor,
  DesignRecommendation,
  ComparativeDesignAnalysis,
  AlternativeDesign,
  TradeoffAnalysis
} from '../types/comprehensive-analysis';
import { StudyProtocol, CRFSpecification } from '../../../types';
import { createModuleLogger, logInfo } from '../../../utils/logger';

const logger = createModuleLogger('design-analyzer');

export class DesignAnalyzer {
  
  /**
   * Analyze study design comprehensively
   */
  async analyzeDesign(
    protocol: StudyProtocol,
    crfs: CRFSpecification[]
  ): Promise<StudyDesignAnalysis> {
    logInfo('Starting study design analysis', {
      protocolNumber: protocol.protocolNumber,
      studyType: protocol.studyDesign?.type
    });

    const designClassification = this.classifyDesign(protocol);
    const strengths = this.identifyStrengths(protocol, crfs);
    const weaknesses = this.identifyWeaknesses(protocol, crfs);
    const complexity = this.assessComplexity(protocol, crfs);
    const feasibilityScore = this.calculateFeasibilityScore(protocol, crfs, complexity);
    const recommendations = this.generateDesignRecommendations(protocol, weaknesses, complexity);
    const comparativeAnalysis = this.performComparativeAnalysis(protocol);

    return {
      designType: this.determineDesignType(protocol),
      designClassification,
      strengths,
      weaknesses,
      complexity,
      feasibilityScore,
      designRecommendations: recommendations,
      comparativeAnalysis
    };
  }

  /**
   * Determine high-level design type
   */
  private determineDesignType(protocol: StudyProtocol): string {
    const design = protocol.studyDesign;
    if (!design) return 'Unspecified Design';

    if (design.type?.toLowerCase().includes('randomized')) {
      if (design.type.toLowerCase().includes('controlled')) {
        return 'Randomized Controlled Trial (RCT)';
      }
      return 'Randomized Trial';
    }

    if (design.type?.toLowerCase().includes('observational')) {
      return 'Observational Study';
    }

    if (design.type?.toLowerCase().includes('cohort')) {
      return 'Cohort Study';
    }

    if (design.type?.toLowerCase().includes('case-control')) {
      return 'Case-Control Study';
    }

    if (design.type?.toLowerCase().includes('crossover')) {
      return 'Crossover Trial';
    }

    return design.type || 'Unspecified Design';
  }

  /**
   * Classify design according to clinical trial standards
   */
  private classifyDesign(protocol: StudyProtocol): DesignClassification {
    const design = protocol.studyDesign;
    
    // Determine primary type
    let primaryType: 'Interventional' | 'Observational' | 'Expanded Access' = 'Interventional';
    if (design?.type?.toLowerCase().includes('observational')) {
      primaryType = 'Observational';
    } else if (design?.type?.toLowerCase().includes('expanded access')) {
      primaryType = 'Expanded Access';
    }

    // Determine allocation
    let allocation: 'Randomized' | 'Non-Randomized' | 'N/A' = 'N/A';
    if (design?.type?.toLowerCase().includes('randomized')) {
      allocation = 'Randomized';
    } else if (primaryType === 'Interventional') {
      allocation = 'Non-Randomized';
    }

    // Determine masking/blinding
    let masking: 'Open Label' | 'Single Blind' | 'Double Blind' | 'Triple Blind' | 'Quadruple Blind' = 'Open Label';
    const designText = design?.type?.toLowerCase() || '';
    if (designText.includes('quadruple') || designText.includes('quad')) {
      masking = 'Quadruple Blind';
    } else if (designText.includes('triple')) {
      masking = 'Triple Blind';
    } else if (designText.includes('double')) {
      masking = 'Double Blind';
    } else if (designText.includes('single') || designText.includes('blind')) {
      masking = 'Single Blind';
    }

    // Determine purpose
    let purpose: 'Treatment' | 'Prevention' | 'Diagnostic' | 'Supportive Care' | 'Screening' | 'Health Services Research' | 'Basic Science' = 'Treatment';
    if (protocol.studyObjective?.toLowerCase().includes('prevent')) {
      purpose = 'Prevention';
    } else if (protocol.studyObjective?.toLowerCase().includes('diagnos')) {
      purpose = 'Diagnostic';
    } else if (protocol.studyObjective?.toLowerCase().includes('screen')) {
      purpose = 'Screening';
    }

    // Determine phases
    const phases: string[] = [];
    if (protocol.studyPhase) {
      phases.push(`Phase ${protocol.studyPhase}`);
    }

    return {
      primaryType,
      intervention: design?.intervention || protocol.intervention,
      allocation,
      masking,
      purpose,
      phases
    };
  }

  /**
   * Identify design strengths
   */
  private identifyStrengths(protocol: StudyProtocol, crfs: CRFSpecification[]): ClinicalStrength[] {
    const strengths: ClinicalStrength[] = [];

    // Randomization strength
    if (protocol.studyDesign?.type?.toLowerCase().includes('randomized')) {
      strengths.push({
        category: 'Design',
        description: 'Randomized design reduces selection bias and confounding',
        impact: 'High',
        evidence: 'Gold standard for establishing causality in clinical research'
      });
    }

    // Blinding strength
    if (protocol.studyDesign?.type?.toLowerCase().includes('double')) {
      strengths.push({
        category: 'Design',
        description: 'Double-blind design minimizes bias from participants and investigators',
        impact: 'High',
        evidence: 'Reduces performance and detection bias'
      });
    }

    // Sample size strength
    if (protocol.population?.targetEnrollment && protocol.population.targetEnrollment >= 100) {
      strengths.push({
        category: 'Population',
        description: 'Adequate sample size for statistical power',
        impact: 'Medium',
        evidence: `Target enrollment of ${protocol.population.targetEnrollment} subjects`
      });
    }

    // Endpoint strength
    if (protocol.endpoints?.primary?.length === 1) {
      strengths.push({
        category: 'Endpoints',
        description: 'Single primary endpoint provides clear focus',
        impact: 'Medium',
        evidence: 'Avoids multiplicity issues and ensures clear study objectives'
      });
    }

    // CRF design strength
    if (crfs.length > 0 && crfs.length <= 15) {
      strengths.push({
        category: 'Feasibility',
        description: 'Manageable number of CRFs for data collection',
        impact: 'Medium',
        evidence: `${crfs.length} CRFs identified - appropriate for study complexity`
      });
    }

    return strengths;
  }

  /**
   * Identify design weaknesses
   */
  private identifyWeaknesses(protocol: StudyProtocol, crfs: CRFSpecification[]): ClinicalWeakness[] {
    const weaknesses: ClinicalWeakness[] = [];

    // No randomization
    if (!protocol.studyDesign?.type?.toLowerCase().includes('randomized') && 
        !protocol.studyDesign?.type?.toLowerCase().includes('observational')) {
      weaknesses.push({
        category: 'Design',
        description: 'Non-randomized design may introduce selection bias',
        severity: 'Major',
        impact: 'Reduces ability to establish causal relationships',
        recommendation: 'Consider randomization if feasible, or implement robust matching/stratification'
      });
    }

    // Open-label design
    if (!protocol.studyDesign?.type?.toLowerCase().includes('blind')) {
      weaknesses.push({
        category: 'Design',
        description: 'Open-label design may introduce bias',
        severity: 'Minor',
        impact: 'Potential for performance and detection bias',
        recommendation: 'Implement blinded outcome assessment where possible'
      });
    }

    // Multiple primary endpoints
    if (protocol.endpoints?.primary?.length && protocol.endpoints.primary.length > 1) {
      weaknesses.push({
        category: 'Endpoints',
        description: 'Multiple primary endpoints create multiplicity concerns',
        severity: 'Major',
        impact: 'Increases risk of Type I error and complicates interpretation',
        recommendation: 'Implement hierarchical testing or adjust alpha levels'
      });
    }

    // Small sample size
    if (protocol.population?.targetEnrollment && protocol.population.targetEnrollment < 30) {
      weaknesses.push({
        category: 'Population',
        description: 'Small sample size may limit statistical power',
        severity: 'Critical',
        impact: 'Insufficient power to detect clinically meaningful differences',
        recommendation: 'Recalculate sample size or consider interim analyses'
      });
    }

    // Too many CRFs
    if (crfs.length > 20) {
      weaknesses.push({
        category: 'Methodology',
        description: 'High number of CRFs may impact data quality',
        severity: 'Minor',
        impact: 'Increased burden on sites and potential for errors',
        recommendation: 'Review CRF necessity and consider consolidation'
      });
    }

    // Missing critical information
    if (!protocol.studyPhase) {
      weaknesses.push({
        category: 'Design',
        description: 'Study phase not clearly specified',
        severity: 'Minor',
        impact: 'Unclear regulatory requirements and expectations',
        recommendation: 'Clearly specify study phase for regulatory alignment'
      });
    }

    return weaknesses;
  }

  /**
   * Assess overall study complexity
   */
  private assessComplexity(protocol: StudyProtocol, crfs: CRFSpecification[]): ComplexityAssessment {
    const factors: ComplexityFactor[] = [];

    // Design complexity
    const designComplexity = this.assessDesignComplexity(protocol);
    factors.push({
      factor: 'Study Design',
      level: designComplexity.level,
      weight: 0.25,
      description: designComplexity.description
    });

    // Population complexity
    const populationComplexity = this.assessPopulationComplexity(protocol);
    factors.push({
      factor: 'Target Population',
      level: populationComplexity.level,
      weight: 0.20,
      description: populationComplexity.description
    });

    // Endpoints complexity
    const endpointsComplexity = this.assessEndpointsComplexity(protocol);
    factors.push({
      factor: 'Endpoints',
      level: endpointsComplexity.level,
      weight: 0.20,
      description: endpointsComplexity.description
    });

    // Data collection complexity
    const dataComplexity = this.assessDataCollectionComplexity(crfs, protocol);
    factors.push({
      factor: 'Data Collection',
      level: dataComplexity.level,
      weight: 0.20,
      description: dataComplexity.description
    });

    // Regulatory complexity
    const regulatoryComplexity = this.assessRegulatoryComplexity(protocol);
    factors.push({
      factor: 'Regulatory Requirements',
      level: regulatoryComplexity.level,
      weight: 0.15,
      description: regulatoryComplexity.description
    });

    // Calculate weighted score
    const score = factors.reduce((sum, factor) => {
      const levelScore = factor.level === 'Low' ? 1 : factor.level === 'Medium' ? 2 : 3;
      return sum + (levelScore * factor.weight);
    }, 0);

    // Normalize to 0-100 scale
    const normalizedScore = Math.round(((score - 1) / 2) * 100);

    // Determine overall complexity
    let overall: 'Low' | 'Medium' | 'High' | 'Very High';
    if (normalizedScore < 25) {
      overall = 'Low';
    } else if (normalizedScore < 50) {
      overall = 'Medium';
    } else if (normalizedScore < 75) {
      overall = 'High';
    } else {
      overall = 'Very High';
    }

    // Generate driver analysis
    const driverAnalysis = factors
      .filter(f => f.level === 'High')
      .map(f => `${f.factor}: ${f.description}`);

    return {
      overall,
      factors,
      score: normalizedScore,
      driverAnalysis
    };
  }

  /**
   * Calculate feasibility score
   */
  private calculateFeasibilityScore(
    protocol: StudyProtocol,
    crfs: CRFSpecification[],
    complexity: ComplexityAssessment
  ): number {
    let score = 100; // Start with perfect score

    // Complexity penalty
    score -= (complexity.score * 0.3);

    // Sample size feasibility
    const targetEnrollment = protocol.population?.targetEnrollment || 0;
    if (targetEnrollment > 1000) {
      score -= 20; // Large studies are harder
    } else if (targetEnrollment < 30) {
      score -= 15; // Very small studies may have power issues
    }

    // Design feasibility
    if (!protocol.studyDesign?.type?.includes('randomized') && 
        !protocol.studyDesign?.type?.includes('observational')) {
      score -= 10; // Unclear designs are harder to execute
    }

    // Endpoint feasibility
    const totalEndpoints = (protocol.endpoints?.primary?.length || 0) + 
                          (protocol.endpoints?.secondary?.length || 0);
    if (totalEndpoints > 10) {
      score -= 15; // Too many endpoints
    }

    // CRF feasibility
    if (crfs.length > 25) {
      score -= 10; // Too many forms
    }

    // Ensure score stays within bounds
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Generate design-specific recommendations
   */
  private generateDesignRecommendations(
    protocol: StudyProtocol,
    weaknesses: ClinicalWeakness[],
    complexity: ComplexityAssessment
  ): DesignRecommendation[] {
    const recommendations: DesignRecommendation[] = [];

    // Address critical weaknesses
    weaknesses.filter(w => w.severity === 'Critical').forEach(weakness => {
      recommendations.push({
        aspect: weakness.category,
        current: weakness.description,
        recommended: weakness.recommendation,
        rationale: `Critical issue: ${weakness.impact}`,
        impact: {
          timeline: 'Positive',
          cost: 'Neutral',
          quality: 'Improvement',
          enrollment: 'Improvement',
          regulatory: 'Positive'
        },
        feasibility: 'High'
      });
    });

    // Complexity-based recommendations
    if (complexity.overall === 'Very High') {
      recommendations.push({
        aspect: 'Study Design',
        current: 'Very high complexity study',
        recommended: 'Simplify design where possible without compromising objectives',
        rationale: 'High complexity increases operational risk and costs',
        impact: {
          timeline: 'Positive',
          cost: 'Reduction',
          quality: 'Improvement',
          enrollment: 'Improvement',
          regulatory: 'Neutral'
        },
        feasibility: 'Medium'
      });
    }

    return recommendations;
  }

  /**
   * Perform comparative design analysis
   */
  private performComparativeAnalysis(protocol: StudyProtocol): ComparativeDesignAnalysis {
    const alternativeDesigns: AlternativeDesign[] = [];
    const tradeoffAnalysis: TradeoffAnalysis[] = [];

    // Only generate alternatives for interventional studies
    if (protocol.studyDesign?.type?.toLowerCase().includes('interventional') ||
        protocol.studyDesign?.type?.toLowerCase().includes('randomized')) {
      
      // Alternative 1: Adaptive design
      alternativeDesigns.push({
        design: 'Adaptive Design',
        advantages: [
          'Allows modifications based on interim data',
          'Potentially more efficient use of resources',
          'Can stop early for efficacy or futility'
        ],
        disadvantages: [
          'More complex to design and implement',
          'Requires specialized statistical expertise',
          'Regulatory discussions may be more complex'
        ],
        feasibility: 'Medium'
      });

      // Alternative 2: Platform trial
      if (protocol.studyPhase === '2' || protocol.studyPhase === '3') {
        alternativeDesigns.push({
          design: 'Platform Trial',
          advantages: [
            'Shared control group',
            'Efficient use of infrastructure',
            'Flexibility to add/drop arms'
          ],
          disadvantages: [
            'Complex operational setup',
            'Requires multiple sponsors/collaborators',
            'Statistical complexity'
          ],
          feasibility: 'Low'
        });
      }

      // Tradeoff analysis
      tradeoffAnalysis.push({
        aspect: 'Study Design Complexity',
        options: [
          {
            option: 'Simple parallel group design',
            benefits: ['Easy to implement', 'Clear interpretation', 'Lower cost'],
            costs: ['Less efficient', 'Fixed sample size'],
            risks: ['May miss opportunities for optimization']
          },
          {
            option: 'Adaptive design',
            benefits: ['Flexible', 'Potentially more efficient', 'Learning opportunities'],
            costs: ['Higher upfront investment', 'Complex infrastructure'],
            risks: ['Regulatory challenges', 'Implementation complexity']
          }
        ],
        recommendation: 'Consider adaptive elements for Phase 2 studies with high uncertainty'
      });
    }

    return {
      alternativeDesigns,
      tradeoffAnalysis,
      recommendations: [
        'Consider simpler alternatives if feasibility is a concern',
        'Evaluate adaptive design elements for studies with high uncertainty',
        'Assess platform trial opportunities for competitive therapeutic areas'
      ]
    };
  }

  // Helper methods for complexity assessment
  private assessDesignComplexity(protocol: StudyProtocol): { level: 'Low' | 'Medium' | 'High', description: string } {
    const arms = protocol.studyDesign?.numberOfArms || 1;
    const isBlinded = protocol.studyDesign?.type?.toLowerCase().includes('blind') || false;
    const isRandomized = protocol.studyDesign?.type?.toLowerCase().includes('randomized') || false;

    if (arms > 4 || (isBlinded && isRandomized)) {
      return { level: 'High', description: 'Complex multi-arm or blinded randomized design' };
    } else if (arms > 2 || isRandomized) {
      return { level: 'Medium', description: 'Standard randomized or multi-arm design' };
    } else {
      return { level: 'Low', description: 'Simple single-arm or observational design' };
    }
  }

  private assessPopulationComplexity(protocol: StudyProtocol): { level: 'Low' | 'Medium' | 'High', description: string } {
    const enrollment = protocol.population?.targetEnrollment || 0;
    
    if (enrollment > 500) {
      return { level: 'High', description: 'Large study requiring multiple sites' };
    } else if (enrollment > 100) {
      return { level: 'Medium', description: 'Moderate-sized study' };
    } else {
      return { level: 'Low', description: 'Small study suitable for single or few sites' };
    }
  }

  private assessEndpointsComplexity(protocol: StudyProtocol): { level: 'Low' | 'Medium' | 'High', description: string } {
    const totalEndpoints = (protocol.endpoints?.primary?.length || 0) + 
                          (protocol.endpoints?.secondary?.length || 0);
    
    if (totalEndpoints > 8) {
      return { level: 'High', description: 'High number of endpoints requiring complex analysis' };
    } else if (totalEndpoints > 3) {
      return { level: 'Medium', description: 'Moderate number of endpoints' };
    } else {
      return { level: 'Low', description: 'Few endpoints with focused objectives' };
    }
  }

  private assessDataCollectionComplexity(crfs: CRFSpecification[], protocol: StudyProtocol): { level: 'Low' | 'Medium' | 'High', description: string } {
    const formCount = crfs.length;
    const visitCount = protocol.visitSchedule?.length || 0;
    
    if (formCount > 20 || visitCount > 10) {
      return { level: 'High', description: 'Extensive data collection requirements' };
    } else if (formCount > 10 || visitCount > 5) {
      return { level: 'Medium', description: 'Moderate data collection burden' };
    } else {
      return { level: 'Low', description: 'Minimal data collection requirements' };
    }
  }

  private assessRegulatoryComplexity(protocol: StudyProtocol): { level: 'Low' | 'Medium' | 'High', description: string } {
    const phase = protocol.studyPhase;
    
    if (phase === '3' || phase === '4') {
      return { level: 'High', description: 'Late-phase study with high regulatory oversight' };
    } else if (phase === '2') {
      return { level: 'Medium', description: 'Mid-phase study with standard requirements' };
    } else {
      return { level: 'Low', description: 'Early-phase study with basic requirements' };
    }
  }
}

// Export singleton instance
export const designAnalyzer = new DesignAnalyzer();