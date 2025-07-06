// Risk Assessment Framework for Clinical Protocols
import {
  RiskAssessmentMatrix,
  RiskCategory,
  RiskFactor,
  RiskImpact,
  MitigationPlan,
  MitigationStrategy,
  ContingencyPlan,
  RiskMonitoringPlan,
  RiskIndicator,
  RiskThreshold,
  EscalationProcedure,
  ResponsibilityAssignment
} from '../types/comprehensive-analysis';
import { StudyProtocol, CRFSpecification } from '../../../types';
import { createModuleLogger, logInfo } from '../../../utils/logger';

const logger = createModuleLogger('risk-analyzer');

export class RiskAnalyzer {
  private riskIdCounter = 0;

  /**
   * Comprehensive risk assessment for clinical protocol
   */
  async assessRisks(
    protocol: StudyProtocol,
    crfs: CRFSpecification[],
    analysisContext?: any
  ): Promise<RiskAssessmentMatrix> {
    logInfo('Starting comprehensive risk assessment', {
      protocolNumber: protocol.protocolNumber,
      studyPhase: protocol.studyPhase,
      crfCount: crfs.length
    });

    // Assess individual risk categories
    const enrollmentRisks = this.assessEnrollmentRisks(protocol);
    const regulatoryRisks = this.assessRegulatoryRisks(protocol);
    const operationalRisks = this.assessOperationalRisks(protocol, crfs);
    const safetyRisks = this.assessSafetyRisks(protocol);
    const dataQualityRisks = this.assessDataQualityRisks(protocol, crfs);
    const financialRisks = this.assessFinancialRisks(protocol, crfs);
    const timelineRisks = this.assessTimelineRisks(protocol);

    // Calculate overall risk level and score
    const riskCategories = [
      enrollmentRisks, regulatoryRisks, operationalRisks, 
      safetyRisks, dataQualityRisks, financialRisks, timelineRisks
    ];

    const overallRiskScore = this.calculateOverallRiskScore(riskCategories);
    const overallRiskLevel = this.determineRiskLevel(overallRiskScore);

    // Generate mitigation plan
    const mitigation = this.generateMitigationPlan(riskCategories, protocol);

    // Create monitoring plan
    const monitoringPlan = this.createMonitoringPlan(riskCategories);

    return {
      overallRiskLevel,
      riskScore: overallRiskScore,
      enrollmentRisks,
      regulatoryRisks,
      operationalRisks,
      safetyRisks,
      dataQualityRisks,
      financialRisks,
      timelineRisks,
      mitigation,
      monitoringPlan
    };
  }

  /**
   * Assess enrollment-related risks
   */
  private assessEnrollmentRisks(protocol: StudyProtocol): RiskCategory {
    const factors: RiskFactor[] = [];

    // Target enrollment size risk
    const targetEnrollment = protocol.population?.targetEnrollment || 0;
    if (targetEnrollment > 500) {
      factors.push(this.createRiskFactor(
        'Large enrollment target',
        'High enrollment requirements may lead to recruitment challenges',
        'Medium',
        'High',
        'Enrollment',
        'Protocol design',
        'Medium'
      ));
    }

    // Inclusion/exclusion criteria complexity
    const inclusionCount = protocol.population?.inclusionCriteria?.length || 0;
    const exclusionCount = protocol.population?.exclusionCriteria?.length || 0;
    if (inclusionCount > 8 || exclusionCount > 12) {
      factors.push(this.createRiskFactor(
        'Complex eligibility criteria',
        'Restrictive criteria may limit patient pool',
        'Medium',
        'Medium',
        'Enrollment',
        'Protocol design',
        'High'
      ));
    }

    // Rare disease indication
    const indication = protocol.indication?.toLowerCase() || '';
    if (indication.includes('rare') || indication.includes('orphan')) {
      factors.push(this.createRiskFactor(
        'Rare disease indication',
        'Limited patient population available',
        'High',
        'High',
        'Enrollment',
        'Disease characteristics',
        'Low'
      ));
    }

    // Competitive landscape
    if (protocol.therapeuticArea?.toLowerCase().includes('oncology')) {
      factors.push(this.createRiskFactor(
        'Competitive therapeutic area',
        'High competition for patients in oncology',
        'Medium',
        'Medium',
        'Enrollment',
        'Market conditions',
        'Medium'
      ));
    }

    const score = this.calculateCategoryScore(factors);
    const level = this.determineRiskLevel(score);

    return {
      category: 'Enrollment',
      level,
      score,
      factors,
      impact: this.assessRiskImpact(factors, 'enrollment')
    };
  }

  /**
   * Assess regulatory risks
   */
  private assessRegulatoryRisks(protocol: StudyProtocol): RiskCategory {
    const factors: RiskFactor[] = [];

    // Study phase considerations
    const phase = protocol.studyPhase;
    if (phase === '3' || phase === '4') {
      factors.push(this.createRiskFactor(
        'Late-phase regulatory scrutiny',
        'Higher regulatory expectations and oversight',
        'Medium',
        'High',
        'Regulatory',
        'Study phase',
        'High'
      ));
    }

    // Novel therapy/indication
    if (protocol.studyObjective?.toLowerCase().includes('first-in-human') ||
        protocol.studyObjective?.toLowerCase().includes('novel')) {
      factors.push(this.createRiskFactor(
        'Novel therapy or indication',
        'Unclear regulatory pathway and requirements',
        'Medium',
        'High',
        'Regulatory',
        'Innovation',
        'Low'
      ));
    }

    // Endpoint acceptability
    const primaryEndpoints = protocol.endpoints?.primary || [];
    const hasNovelEndpoint = primaryEndpoints.some(ep => {
      const epStr = typeof ep === 'string' ? ep.toLowerCase() : '';
      return epStr.includes('biomarker') || epStr.includes('surrogate') || epStr.includes('composite');
    });

    if (hasNovelEndpoint) {
      factors.push(this.createRiskFactor(
        'Novel or surrogate endpoints',
        'Regulatory acceptance may be uncertain',
        'Medium',
        'Medium',
        'Regulatory',
        'Endpoint selection',
        'Medium'
      ));
    }

    // Multiple regions
    if (protocol.studyLocations && protocol.studyLocations.length > 1) {
      const regions = protocol.studyLocations.map(loc => loc.country).filter((v, i, a) => a.indexOf(v) === i);
      if (regions.length > 2) {
        factors.push(this.createRiskFactor(
          'Multi-regional study',
          'Complex regulatory requirements across regions',
          'Medium',
          'Medium',
          'Regulatory',
          'Geographic scope',
          'Medium'
        ));
      }
    }

    const score = this.calculateCategoryScore(factors);
    const level = this.determineRiskLevel(score);

    return {
      category: 'Regulatory',
      level,
      score,
      factors,
      impact: this.assessRiskImpact(factors, 'regulatory')
    };
  }

  /**
   * Assess operational risks (protocol-focused)
   */
  private assessOperationalRisks(protocol: StudyProtocol, crfs: CRFSpecification[]): RiskCategory {
    const factors: RiskFactor[] = [];

    // Visit complexity
    const visitCount = protocol.visitSchedule?.length || 0;
    if (visitCount > 12) {
      factors.push(this.createRiskFactor(
        'Complex visit schedule',
        'Frequent visits may impact patient retention and site burden',
        'Medium',
        'Medium',
        'Operational',
        'Study design',
        'High'
      ));
    }

    // Site requirements based on enrollment
    const targetEnrollment = protocol.population?.targetEnrollment || 0;
    const estimatedSites = Math.ceil(targetEnrollment / 10); // Assuming 10 patients per site
    if (estimatedSites > 50) {
      factors.push(this.createRiskFactor(
        'Large site network required',
        'Managing many sites increases operational complexity',
        'Medium',
        'High',
        'Operational',
        'Site management',
        'Medium'
      ));
    }

    // Protocol complexity based on design
    if (protocol.studyDesign?.numberOfArms && protocol.studyDesign.numberOfArms > 3) {
      factors.push(this.createRiskFactor(
        'Multi-arm study design',
        'Multiple treatment arms increase operational complexity',
        'Medium',
        'Medium',
        'Operational',
        'Study design',
        'Medium'
      ));
    }

    // Duration-based risks
    if (protocol.studyDesign?.duration) {
      const durationYears = this.parseDurationToYears(protocol.studyDesign.duration);
      if (durationYears > 2) {
        factors.push(this.createRiskFactor(
          'Long study duration',
          'Extended duration increases retention and operational challenges',
          'Medium',
          'High',
          'Operational',
          'Timeline',
          'High'
        ));
      }
    }

    // Technology requirements
    const hasComplexProcedures = protocol.visitSchedule?.some(visit => 
      visit.procedures?.some(proc => 
        proc.toLowerCase().includes('imaging') || 
        proc.toLowerCase().includes('ecg') ||
        proc.toLowerCase().includes('holter')
      )
    ) || false;

    if (hasComplexProcedures) {
      factors.push(this.createRiskFactor(
        'Complex procedures/technology',
        'Specialized equipment may limit site selection',
        'Medium',
        'Medium',
        'Operational',
        'Technical requirements',
        'Medium'
      ));
    }

    const score = this.calculateCategoryScore(factors);
    const level = this.determineRiskLevel(score);

    return {
      category: 'Operational',
      level,
      score,
      factors,
      impact: this.assessRiskImpact(factors, 'operational')
    };
  }

  /**
   * Assess safety risks
   */
  private assessSafetyRisks(protocol: StudyProtocol): RiskCategory {
    const factors: RiskFactor[] = [];

    // First-in-human or early phase
    if (protocol.studyPhase === '1' || 
        protocol.studyObjective?.toLowerCase().includes('first-in-human')) {
      factors.push(this.createRiskFactor(
        'Early phase safety uncertainty',
        'Limited safety data for investigational product',
        'High',
        'High',
        'Safety',
        'Development stage',
        'Low'
      ));
    }

    // High-risk population
    const indication = protocol.indication?.toLowerCase() || '';
    if (indication.includes('cancer') || indication.includes('oncology')) {
      factors.push(this.createRiskFactor(
        'High-risk patient population',
        'Cancer patients may have multiple comorbidities',
        'Medium',
        'High',
        'Safety',
        'Patient population',
        'Medium'
      ));
    }

    // Complex intervention
    if (protocol.intervention?.toLowerCase().includes('combination') ||
        protocol.intervention?.toLowerCase().includes('multiple')) {
      factors.push(this.createRiskFactor(
        'Complex intervention',
        'Multiple agents may increase interaction risks',
        'Medium',
        'Medium',
        'Safety',
        'Treatment design',
        'Medium'
      ));
    }

    // Blinding challenges
    if (protocol.studyDesign?.type?.toLowerCase().includes('open') ||
        protocol.studyDesign?.type?.toLowerCase().includes('unblinded')) {
      factors.push(this.createRiskFactor(
        'Unblinded study design',
        'Open-label design may affect safety assessment',
        'Low',
        'Medium',
        'Safety',
        'Study design',
        'High'
      ));
    }

    const score = this.calculateCategoryScore(factors);
    const level = this.determineRiskLevel(score);

    return {
      category: 'Safety',
      level,
      score,
      factors,
      impact: this.assessRiskImpact(factors, 'safety')
    };
  }

  /**
   * Assess data quality risks (protocol-focused)
   */
  private assessDataQualityRisks(protocol: StudyProtocol, crfs: CRFSpecification[]): RiskCategory {
    const factors: RiskFactor[] = [];

    // Endpoint complexity
    const primaryEndpointCount = protocol.endpoints?.primary?.length || 0;
    const secondaryEndpointCount = protocol.endpoints?.secondary?.length || 0;
    const totalEndpoints = primaryEndpointCount + secondaryEndpointCount;
    
    if (totalEndpoints > 10) {
      factors.push(this.createRiskFactor(
        'High endpoint burden',
        'Large number of endpoints may impact data quality and analysis',
        'Medium',
        'Medium',
        'Data Quality',
        'Endpoint design',
        'High'
      ));
    }

    // Visit frequency and data collection burden
    const visitCount = protocol.visitSchedule?.length || 0;
    if (visitCount > 15) {
      factors.push(this.createRiskFactor(
        'Frequent data collection',
        'High visit frequency increases data entry burden and error risk',
        'Medium',
        'Medium',
        'Data Quality',
        'Collection frequency',
        'Medium'
      ));
    }

    // Subjective assessments based on endpoints
    const hasSubjectiveData = protocol.endpoints?.primary?.some(ep => {
      const epStr = typeof ep === 'string' ? ep.toLowerCase() : '';
      return epStr.includes('pain') || epStr.includes('quality of life') || epStr.includes('symptom');
    }) || false;

    if (hasSubjectiveData) {
      factors.push(this.createRiskFactor(
        'Subjective endpoint assessments',
        'Patient-reported outcomes may have variability',
        'Medium',
        'Low',
        'Data Quality',
        'Endpoint design',
        'High'
      ));
    }

    // Multi-site coordination
    const targetEnrollment = protocol.population?.targetEnrollment || 0;
    if (targetEnrollment > 100) { // Likely multi-site
      factors.push(this.createRiskFactor(
        'Multi-site data coordination',
        'Data consistency across sites may be challenging',
        'Medium',
        'Medium',
        'Data Quality',
        'Site coordination',
        'Medium'
      ));
    }

    const score = this.calculateCategoryScore(factors);
    const level = this.determineRiskLevel(score);

    return {
      category: 'Data Quality',
      level,
      score,
      factors,
      impact: this.assessRiskImpact(factors, 'data_quality')
    };
  }

  /**
   * Assess financial risks
   */
  private assessFinancialRisks(protocol: StudyProtocol, crfs: CRFSpecification[]): RiskCategory {
    const factors: RiskFactor[] = [];

    // Large study size
    const targetEnrollment = protocol.population?.targetEnrollment || 0;
    if (targetEnrollment > 300) {
      factors.push(this.createRiskFactor(
        'Large study budget',
        'High enrollment increases overall study costs',
        'Medium',
        'High',
        'Financial',
        'Study size',
        'Medium'
      ));
    }

    // Complex procedures
    const hasExpensiveProcedures = protocol.visitSchedule?.some(visit =>
      visit.procedures?.some(proc =>
        proc.toLowerCase().includes('mri') ||
        proc.toLowerCase().includes('pet') ||
        proc.toLowerCase().includes('biopsy')
      )
    ) || false;

    if (hasExpensiveProcedures) {
      factors.push(this.createRiskFactor(
        'Expensive procedures',
        'Costly imaging or procedures increase per-patient costs',
        'Medium',
        'Medium',
        'Financial',
        'Procedure complexity',
        'Medium'
      ));
    }

    // Geographic scope
    if (protocol.studyLocations && protocol.studyLocations.length > 1) {
      const countries = new Set(protocol.studyLocations.map(loc => loc.country));
      if (countries.size > 3) {
        factors.push(this.createRiskFactor(
          'Multi-country study',
          'International studies have higher operational costs',
          'Medium',
          'Medium',
          'Financial',
          'Geographic scope',
          'Medium'
        ));
      }
    }

    // Long duration
    if (protocol.studyDuration) {
      const durationStr = protocol.studyDuration.toLowerCase();
      if (durationStr.includes('year') && !durationStr.includes('1 year')) {
        factors.push(this.createRiskFactor(
          'Long study duration',
          'Extended studies increase total operational costs',
          'Medium',
          'Medium',
          'Financial',
          'Study duration',
          'Medium'
        ));
      }
    }

    const score = this.calculateCategoryScore(factors);
    const level = this.determineRiskLevel(score);

    return {
      category: 'Financial',
      level,
      score,
      factors,
      impact: this.assessRiskImpact(factors, 'financial')
    };
  }

  /**
   * Assess timeline risks
   */
  private assessTimelineRisks(protocol: StudyProtocol): RiskCategory {
    const factors: RiskFactor[] = [];

    // Recruitment timeline
    const targetEnrollment = protocol.population?.targetEnrollment || 0;
    if (targetEnrollment > 200) {
      factors.push(this.createRiskFactor(
        'Recruitment timeline pressure',
        'Large enrollment may extend recruitment period',
        'Medium',
        'Medium',
        'Timeline',
        'Enrollment target',
        'High'
      ));
    }

    // Regulatory approval timeline
    if (protocol.studyPhase === '3') {
      factors.push(this.createRiskFactor(
        'Regulatory review complexity',
        'Phase 3 studies may have longer approval timelines',
        'Medium',
        'Medium',
        'Timeline',
        'Regulatory requirements',
        'Medium'
      ));
    }

    // Site activation complexity
    const estimatedSites = Math.ceil(targetEnrollment / 10);
    if (estimatedSites > 30) {
      factors.push(this.createRiskFactor(
        'Site activation timeline',
        'Many sites require sequential activation',
        'Medium',
        'Medium',
        'Timeline',
        'Site management',
        'Medium'
      ));
    }

    // Data analysis complexity
    const totalEndpoints = (protocol.endpoints?.primary?.length || 0) +
                          (protocol.endpoints?.secondary?.length || 0) +
                          (protocol.endpoints?.exploratory?.length || 0);
    if (totalEndpoints > 10) {
      factors.push(this.createRiskFactor(
        'Complex analysis timeline',
        'Multiple endpoints may extend analysis period',
        'Low',
        'Medium',
        'Timeline',
        'Analysis complexity',
        'High'
      ));
    }

    const score = this.calculateCategoryScore(factors);
    const level = this.determineRiskLevel(score);

    return {
      category: 'Timeline',
      level,
      score,
      factors,
      impact: this.assessRiskImpact(factors, 'timeline')
    };
  }

  /**
   * Generate comprehensive mitigation plan
   */
  private generateMitigationPlan(riskCategories: RiskCategory[], protocol: StudyProtocol): MitigationPlan {
    const strategies: MitigationStrategy[] = [];
    const contingencyPlans: ContingencyPlan[] = [];
    const responsibilityMatrix: ResponsibilityAssignment[] = [];

    // Generate strategies for high-risk factors
    riskCategories.forEach(category => {
      category.factors.forEach(factor => {
        if (factor.likelihood === 'High' || factor.impact === 'High') {
          strategies.push(this.generateMitigationStrategy(factor));
        }
      });
    });

    // Generate contingency plans for critical scenarios
    contingencyPlans.push({
      scenario: 'Slow enrollment',
      probability: 'Medium',
      impact: 'High',
      response: 'Activate additional sites, modify inclusion criteria if appropriate, implement patient referral program',
      resources: ['Clinical Operations', 'Medical Affairs', 'Regulatory'],
      timeline: 'Immediate assessment at 25% enrollment milestone'
    });

    if (protocol.studyPhase === '3') {
      contingencyPlans.push({
        scenario: 'Regulatory feedback requiring protocol amendment',
        probability: 'Medium',
        impact: 'Medium',
        response: 'Engage regulatory consultants, prepare amendment documentation, communicate with ethics committees',
        resources: ['Regulatory Affairs', 'Clinical Operations', 'Legal'],
        timeline: '30-60 days depending on amendment scope'
      });
    }

    // Create responsibility matrix
    responsibilityMatrix.push(
      {
        task: 'Risk monitoring and reporting',
        primaryOwner: 'Clinical Operations Manager',
        secondaryOwners: ['Study Manager', 'Risk Management Team'],
        accountabilities: ['Weekly risk dashboard updates', 'Monthly risk review meetings'],
        timeline: 'Ongoing throughout study'
      },
      {
        task: 'Enrollment tracking and mitigation',
        primaryOwner: 'Clinical Operations Manager',
        secondaryOwners: ['Principal Investigators', 'Site Coordinators'],
        accountabilities: ['Weekly enrollment reports', 'Site performance monitoring'],
        timeline: 'Ongoing during recruitment period'
      }
    );

    return {
      strategies,
      contingencyPlans,
      responsibilityMatrix
    };
  }

  /**
   * Create risk monitoring plan
   */
  private createMonitoringPlan(riskCategories: RiskCategory[]): RiskMonitoringPlan {
    const indicators: RiskIndicator[] = [
      {
        name: 'Enrollment Rate',
        description: 'Weekly enrollment versus target',
        measurement: 'Patients enrolled per week',
        frequency: 'Weekly',
        responsibleParty: 'Clinical Operations'
      },
      {
        name: 'Screen Failure Rate',
        description: 'Percentage of screened patients not enrolled',
        measurement: 'Screen failures / total screened * 100',
        frequency: 'Bi-weekly',
        responsibleParty: 'Clinical Operations'
      },
      {
        name: 'Data Query Rate',
        description: 'Number of queries per CRF page',
        measurement: 'Total queries / total CRF pages',
        frequency: 'Monthly',
        responsibleParty: 'Data Management'
      },
      {
        name: 'Protocol Deviation Rate',
        description: 'Protocol deviations per patient',
        measurement: 'Total deviations / enrolled patients',
        frequency: 'Monthly',
        responsibleParty: 'Clinical Quality Assurance'
      }
    ];

    const thresholds = indicators.map(indicator => ({
      indicator: indicator.name,
      greenThreshold: this.getGreenThreshold(indicator.name),
      yellowThreshold: this.getYellowThreshold(indicator.name),
      redThreshold: this.getRedThreshold(indicator.name),
      actions: [
        { threshold: 'Green' as const, action: 'Continue monitoring', timeline: 'Ongoing', responsibility: indicator.responsibleParty },
        { threshold: 'Yellow' as const, action: 'Implement corrective actions', timeline: '1 week', responsibility: indicator.responsibleParty },
        { threshold: 'Red' as const, action: 'Escalate to management and implement immediate intervention', timeline: 'Immediate', responsibility: 'Study Director' }
      ]
    }));

    const escalationProcedures: EscalationProcedure[] = [
      {
        trigger: 'Red threshold breach',
        escalationPath: ['Study Manager', 'Clinical Operations Director', 'Study Director', 'VP Clinical Development'],
        timeline: 'Within 24 hours',
        decisionCriteria: 'Impact on study objectives and timeline'
      },
      {
        trigger: 'Multiple yellow thresholds',
        escalationPath: ['Study Manager', 'Clinical Operations Director'],
        timeline: 'Within 48 hours',
        decisionCriteria: 'Trend analysis and cumulative impact'
      }
    ];

    return {
      indicators,
      thresholds,
      escalationProcedures,
      reviewFrequency: 'Weekly for operational metrics, monthly for comprehensive review'
    };
  }

  // Helper methods
  
  /**
   * Parse duration string to years
   */
  private parseDurationToYears(duration: string): number {
    const durationLower = duration.toLowerCase();
    
    if (durationLower.includes('year')) {
      const yearMatch = durationLower.match(/(\d+(\.\d+)?)\s*years?/);
      if (yearMatch) return parseFloat(yearMatch[1]);
    }
    
    if (durationLower.includes('month')) {
      const monthMatch = durationLower.match(/(\d+)\s*months?/);
      if (monthMatch) return parseInt(monthMatch[1]) / 12;
    }
    
    if (durationLower.includes('week')) {
      const weekMatch = durationLower.match(/(\d+)\s*weeks?/);
      if (weekMatch) return parseInt(weekMatch[1]) / 52;
    }
    
    // Default to 1 year if can't parse
    return 1;
  }

  private createRiskFactor(
    description: string,
    rationale: string,
    likelihood: 'Low' | 'Medium' | 'High',
    impact: 'Low' | 'Medium' | 'High',
    category: string,
    source: string,
    detectability: 'High' | 'Medium' | 'Low'
  ): RiskFactor {
    const likelihoodScore = likelihood === 'Low' ? 1 : likelihood === 'Medium' ? 2 : 3;
    const impactScore = impact === 'Low' ? 1 : impact === 'Medium' ? 2 : 3;
    const detectabilityScore = detectability === 'High' ? 1 : detectability === 'Medium' ? 2 : 3;
    
    return {
      id: `RISK-${String(++this.riskIdCounter).padStart(3, '0')}`,
      description,
      likelihood,
      impact,
      riskScore: likelihoodScore * impactScore * detectabilityScore,
      category,
      source,
      detectability
    };
  }

  private calculateCategoryScore(factors: RiskFactor[]): number {
    if (factors.length === 0) return 0;
    
    const totalScore = factors.reduce((sum, factor) => sum + factor.riskScore, 0);
    const maxPossibleScore = factors.length * 27; // 3 * 3 * 3
    return Math.round((totalScore / maxPossibleScore) * 100);
  }

  private calculateOverallRiskScore(categories: RiskCategory[]): number {
    const weights = {
      'Enrollment': 0.25,
      'Regulatory': 0.20,
      'Operational': 0.15,
      'Safety': 0.15,
      'Data Quality': 0.10,
      'Financial': 0.10,
      'Timeline': 0.05
    };

    const weightedScore = categories.reduce((sum, category) => {
      const weight = weights[category.category as keyof typeof weights] || 0.1;
      return sum + (category.score * weight);
    }, 0);

    return Math.round(weightedScore);
  }

  private determineRiskLevel(score: number): 'Low' | 'Medium' | 'High' | 'Very High' {
    if (score < 25) return 'Low';
    if (score < 50) return 'Medium';
    if (score < 75) return 'High';
    return 'Very High';
  }

  private assessRiskImpact(factors: RiskFactor[], riskType: string): RiskImpact {
    // Simplified impact assessment - would be more sophisticated in real implementation
    return {
      timeline: factors.some(f => f.impact === 'High') ? 'Significant delay possible' : 'Minimal impact',
      cost: factors.some(f => f.impact === 'High') ? 'Potential cost increase' : 'Minimal cost impact',
      quality: factors.some(f => f.category.includes('Quality')) ? 'Quality at risk' : 'Quality maintained',
      regulatory: factors.some(f => f.category === 'Regulatory') ? 'Regulatory impact possible' : 'No regulatory impact'
    };
  }

  private generateMitigationStrategy(factor: RiskFactor): MitigationStrategy {
    return {
      riskId: factor.id,
      strategy: this.getMitigationStrategy(factor.category, factor.description),
      implementation: this.getImplementationPlan(factor.category),
      timeline: this.getImplementationTimeline(factor.impact),
      resources: this.getRequiredResources(factor.category),
      effectiveness: factor.detectability === 'High' ? 'High' : 'Medium',
      cost: factor.impact === 'High' ? 'Medium' : 'Low'
    };
  }

  // Helper methods for mitigation strategies
  private getMitigationStrategy(category: string, description: string): string {
    const strategies: Record<string, string> = {
      'Enrollment': 'Implement patient recruitment initiatives, optimize site selection, consider protocol amendments',
      'Regulatory': 'Engage early with regulatory authorities, implement robust quality systems',
      'Operational': 'Develop comprehensive training programs, implement technology solutions',
      'Safety': 'Enhance safety monitoring, implement risk evaluation and mitigation strategies',
      'Data Quality': 'Implement data quality monitoring, provide enhanced training',
      'Financial': 'Implement cost control measures, negotiate favorable vendor contracts',
      'Timeline': 'Develop realistic timelines with buffers, implement milestone tracking'
    };
    return strategies[category] || 'Implement standard risk mitigation measures';
  }

  private getImplementationPlan(category: string): string {
    return `Develop detailed ${category.toLowerCase()} mitigation plan with specific actions, timelines, and responsibilities`;
  }

  private getImplementationTimeline(impact: string): string {
    return impact === 'High' ? 'Immediate (within 1 week)' : 'Short-term (within 1 month)';
  }

  private getRequiredResources(category: string): string {
    const resources: Record<string, string> = {
      'Enrollment': 'Clinical Operations, Medical Affairs, Site Management',
      'Regulatory': 'Regulatory Affairs, Legal, Quality Assurance',
      'Operational': 'Clinical Operations, Technology, Training',
      'Safety': 'Pharmacovigilance, Medical Affairs, Regulatory',
      'Data Quality': 'Data Management, Clinical Operations, Quality Assurance',
      'Financial': 'Finance, Procurement, Operations',
      'Timeline': 'Project Management, Clinical Operations, Leadership'
    };
    return resources[category] || 'Cross-functional team';
  }

  // Threshold helper methods
  private getGreenThreshold(metric: string): string {
    const thresholds: Record<string, string> = {
      'Enrollment Rate': '≥ Target rate',
      'Screen Failure Rate': '< 50%',
      'Data Query Rate': '< 2 per CRF page',
      'Protocol Deviation Rate': '< 0.5 per patient'
    };
    return thresholds[metric] || 'Within acceptable range';
  }

  private getYellowThreshold(metric: string): string {
    const thresholds: Record<string, string> = {
      'Enrollment Rate': '80-99% of target',
      'Screen Failure Rate': '50-70%',
      'Data Query Rate': '2-3 per CRF page',
      'Protocol Deviation Rate': '0.5-1.0 per patient'
    };
    return thresholds[metric] || 'Approaching limits';
  }

  private getRedThreshold(metric: string): string {
    const thresholds: Record<string, string> = {
      'Enrollment Rate': '< 80% of target',
      'Screen Failure Rate': '> 70%',
      'Data Query Rate': '> 3 per CRF page',
      'Protocol Deviation Rate': '> 1.0 per patient'
    };
    return thresholds[metric] || 'Exceeds acceptable limits';
  }
}

// Export singleton instance
export const riskAnalyzer = new RiskAnalyzer();