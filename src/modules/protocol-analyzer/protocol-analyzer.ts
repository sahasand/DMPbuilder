import { 
  ClinicalModule, 
  ModuleType, 
  ModuleConfig, 
  ModuleContext, 
  ModuleResult,
  DMPModification 
} from '../../types/module-types';
import { StudyProtocol, CRFSpecification } from '../../types';
import { createModuleLogger, measurePerformance } from '../../utils/logger';

const logger = createModuleLogger('protocol-analyzer');

/**
 * Protocol analysis result interface
 */
export interface ProtocolAnalysisResult {
  complexity: {
    score: number;
    level: 'low' | 'medium' | 'high' | 'very-high';
    factors: string[];
  };
  riskAssessment: {
    overall: 'low' | 'medium' | 'high';
    factors: RiskFactor[];
  };
  therapeuticArea: {
    primary: string;
    secondary: string[];
    confidence: number;
  };
  regulatoryRequirements: {
    regions: string[];
    guidelines: string[];
    submissions: string[];
  };
  resourceEstimate: {
    estimatedDuration: string;
    dataManagerEffort: string;
    monitoringRequirement: 'low' | 'medium' | 'high';
  };
  recommendations: string[];
}

export interface RiskFactor {
  category: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  mitigation: string;
}

/**
 * Protocol Analyzer Module
 * Analyzes clinical protocols for various characteristics and provides insights
 */
export class ProtocolAnalyzer implements ClinicalModule {
  public readonly id: string;
  public readonly name: string;
  public readonly version: string;
  public readonly description: string;
  public readonly author: string;
  public readonly type: ModuleType;
  public config: ModuleConfig;

  private initialized = false;

  constructor(moduleInfo: any = {}) {
    this.id = moduleInfo.id || 'protocol-analyzer';
    this.name = moduleInfo.name || 'Protocol Analyzer';
    this.version = moduleInfo.version || '1.0.0';
    this.description = moduleInfo.description || 'Analyzes clinical protocols for complexity and requirements';
    this.author = moduleInfo.author || 'Clinical DMP Generator Team';
    this.type = ModuleType.PROTOCOL_ANALYZER;
    
    this.config = {
      enabled: true,
      priority: 1,
      therapeuticAreas: ['all'],
      studyPhases: ['Phase 1', 'Phase 2', 'Phase 3', 'Phase 4'],
      settings: {
        enableDetailedAnalysis: true,
        includeRiskAssessment: true,
        generateRecommendations: true,
        complexityThresholds: {
          low: 0.3,
          medium: 0.6,
          high: 0.8
        }
      },
      ...moduleInfo.config
    };
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    logger.info(`Initializing ${this.name} module`, {
      version: this.version,
      enabled: this.config.enabled
    });

    // Perform any initialization tasks
    await this.validateConfiguration();
    
    this.initialized = true;
    logger.info(`${this.name} module initialized successfully`);
  }

  async destroy(): Promise<void> {
    logger.info(`Destroying ${this.name} module`);
    this.initialized = false;
  }

  isEnabled(): boolean {
    return this.config.enabled && this.initialized;
  }

  async execute(context: ModuleContext): Promise<ModuleResult> {
    const startTime = Date.now();
    
    logger.info('Executing Protocol Analyzer', {
      hasProtocol: !!context.protocol,
      hasCRFs: !!context.crfs,
      environment: context.metadata.environment
    });

    try {
      const analysisResult = await measurePerformance(
        'protocol-analyzer.analysis',
        () => this.analyzeProtocol(context)
      );

      const executionTime = Date.now() - startTime;

      const result: ModuleResult = {
        moduleId: this.id,
        status: 'success',
        data: analysisResult,
        messages: [
          `Protocol analysis completed for ${context.protocol?.studyTitle || 'unknown study'}`,
          `Complexity level: ${analysisResult.complexity.level}`,
          `Risk level: ${analysisResult.riskAssessment.overall}`,
          `Primary therapeutic area: ${analysisResult.therapeuticArea.primary}`
        ],
        warnings: this.generateWarnings(analysisResult),
        errors: [],
        metrics: {
          executionTime,
          custom: {
            complexityScore: analysisResult.complexity.score,
            riskFactorsCount: analysisResult.riskAssessment.factors.length,
            recommendationsCount: analysisResult.recommendations.length
          }
        },
        recommendations: analysisResult.recommendations,
        dmpModifications: this.generateDMPModifications(analysisResult)
      };

      logger.info('Protocol analysis completed successfully', {
        complexityLevel: analysisResult.complexity.level,
        riskLevel: analysisResult.riskAssessment.overall,
        executionTime
      });

      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      logger.error('Protocol analysis failed', error);

      return {
        moduleId: this.id,
        status: 'error',
        data: null,
        messages: [],
        warnings: [],
        errors: [error instanceof Error ? error.message : 'Unknown analysis error'],
        metrics: { executionTime },
        recommendations: []
      };
    }
  }

  /**
   * Main protocol analysis method
   */
  private async analyzeProtocol(context: ModuleContext): Promise<ProtocolAnalysisResult> {
    const { protocol, crfs } = context;

    if (!protocol) {
      throw new Error('No protocol provided for analysis');
    }

    // Parallel analysis of different aspects
    const [
      complexity,
      riskAssessment,
      therapeuticArea,
      regulatoryRequirements,
      resourceEstimate
    ] = await Promise.all([
      this.assessComplexity(protocol, crfs),
      this.assessRisk(protocol, crfs),
      this.classifyTherapeuticArea(protocol),
      this.analyzeRegulatoryRequirements(protocol),
      this.estimateResources(protocol, crfs)
    ]);

    const recommendations = this.generateRecommendations(
      complexity,
      riskAssessment,
      therapeuticArea,
      resourceEstimate
    );

    return {
      complexity,
      riskAssessment,
      therapeuticArea,
      regulatoryRequirements,
      resourceEstimate,
      recommendations
    };
  }

  /**
   * Assess protocol complexity
   */
  private async assessComplexity(
    protocol: StudyProtocol, 
    crfs?: CRFSpecification[]
  ): Promise<ProtocolAnalysisResult['complexity']> {
    let score = 0;
    const factors: string[] = [];

    // Phase complexity
    const phaseWeight = this.getPhaseComplexityWeight(protocol.studyPhase);
    score += phaseWeight * 0.2;
    if (phaseWeight > 0.7) {
      factors.push(`Complex study phase: ${protocol.studyPhase}`);
    }

    // Design complexity
    const designComplexity = this.assessDesignComplexity(protocol);
    score += designComplexity * 0.3;
    if (designComplexity > 0.6) {
      factors.push('Complex study design');
    }

    // Population complexity
    const populationComplexity = this.assessPopulationComplexity(protocol);
    score += populationComplexity * 0.2;
    if (populationComplexity > 0.6) {
      factors.push('Complex study population');
    }

    // Endpoints complexity
    const endpointsComplexity = this.assessEndpointsComplexity(protocol);
    score += endpointsComplexity * 0.2;
    if (endpointsComplexity > 0.6) {
      factors.push('Complex endpoints structure');
    }

    // CRF complexity
    if (crfs && crfs.length > 0) {
      const crfComplexity = this.assessCRFComplexity(crfs);
      score += crfComplexity * 0.1;
      if (crfComplexity > 0.7) {
        factors.push(`High CRF complexity (${crfs.length} forms)`);
      }
    }

    const thresholds = this.config.settings.complexityThresholds;
    let level: 'low' | 'medium' | 'high' | 'very-high';
    
    if (score < thresholds.low) level = 'low';
    else if (score < thresholds.medium) level = 'medium';
    else if (score < thresholds.high) level = 'high';
    else level = 'very-high';

    return { score, level, factors };
  }

  /**
   * Assess protocol risk factors
   */
  private async assessRisk(
    protocol: StudyProtocol, 
    crfs?: CRFSpecification[]
  ): Promise<ProtocolAnalysisResult['riskAssessment']> {
    const factors: RiskFactor[] = [];

    // Phase-related risks
    if (protocol.studyPhase === 'Phase 1') {
      factors.push({
        category: 'Safety',
        description: 'First-in-human study with unknown safety profile',
        severity: 'high',
        mitigation: 'Enhanced safety monitoring and frequent data review'
      });
    }

    // Population risks
    if (protocol.population?.ageRange?.includes('pediatric')) {
      factors.push({
        category: 'Regulatory',
        description: 'Pediatric population requires additional regulatory considerations',
        severity: 'medium',
        mitigation: 'Ensure pediatric investigation plan compliance'
      });
    }

    // Therapeutic area risks
    const therapeuticRisks = this.getTherapeuticAreaRisks(protocol);
    factors.push(...therapeuticRisks);

    // Design risks
    if (protocol.studyDesign?.type?.includes('open-label')) {
      factors.push({
        category: 'Data Quality',
        description: 'Open-label design may introduce bias',
        severity: 'medium',
        mitigation: 'Implement blinded endpoint assessment where possible'
      });
    }

    // Overall risk level
    const highRiskCount = factors.filter(f => f.severity === 'high').length;
    const mediumRiskCount = factors.filter(f => f.severity === 'medium').length;
    
    let overall: 'low' | 'medium' | 'high';
    if (highRiskCount > 0) overall = 'high';
    else if (mediumRiskCount > 2) overall = 'high';
    else if (mediumRiskCount > 0) overall = 'medium';
    else overall = 'low';

    return { overall, factors };
  }

  /**
   * Classify therapeutic area
   */
  private async classifyTherapeuticArea(protocol: StudyProtocol): Promise<ProtocolAnalysisResult['therapeuticArea']> {
    const indication = protocol.indication?.toLowerCase() || '';
    const title = protocol.studyTitle?.toLowerCase() || '';
    const combined = `${indication} ${title}`;

    const areas = [
      { name: 'Oncology', keywords: ['cancer', 'tumor', 'oncology', 'chemotherapy', 'radiation'] },
      { name: 'Cardiovascular', keywords: ['cardiac', 'heart', 'cardiovascular', 'hypertension', 'arrhythmia'] },
      { name: 'Neurology', keywords: ['neuro', 'brain', 'alzheimer', 'parkinson', 'dementia'] },
      { name: 'Infectious Disease', keywords: ['infection', 'viral', 'bacterial', 'antibiotic', 'vaccine'] },
      { name: 'Endocrinology', keywords: ['diabetes', 'hormone', 'thyroid', 'metabolic', 'insulin'] },
      { name: 'Respiratory', keywords: ['lung', 'respiratory', 'asthma', 'copd', 'pneumonia'] },
      { name: 'Immunology', keywords: ['immune', 'autoimmune', 'rheumatoid', 'lupus', 'immunology'] },
      { name: 'Psychiatry', keywords: ['depression', 'anxiety', 'psychiatric', 'mental', 'schizophrenia'] }
    ];

    const scores = areas.map(area => {
      const matches = area.keywords.filter(keyword => combined.includes(keyword)).length;
      const confidence = matches / area.keywords.length;
      return { area: area.name, confidence, matches };
    });

    scores.sort((a, b) => b.confidence - a.confidence);

    const primary = scores[0]?.area || 'General Medicine';
    const confidence = scores[0]?.confidence || 0;
    const secondary = scores.slice(1, 3)
      .filter(s => s.confidence > 0)
      .map(s => s.area);

    return { primary, secondary, confidence };
  }

  /**
   * Analyze regulatory requirements
   */
  private async analyzeRegulatoryRequirements(protocol: StudyProtocol): Promise<ProtocolAnalysisResult['regulatoryRequirements']> {
    const regions = ['FDA', 'EMA']; // Default regions
    const guidelines: string[] = [];
    const submissions: string[] = [];

    // ICH guidelines
    guidelines.push('ICH-GCP E6(R2)');
    
    // Phase-specific guidelines
    if (protocol.studyPhase === 'Phase 1') {
      guidelines.push('ICH M3(R2) - Nonclinical Safety Studies');
    }
    
    // Add therapeutic area specific guidelines
    guidelines.push('ICH E2A - Clinical Safety Data Management');
    guidelines.push('ICH E9 - Statistical Principles for Clinical Trials');

    // Submission requirements
    if (protocol.studyPhase === 'Phase 3') {
      submissions.push('Marketing Authorization Application');
    }
    submissions.push('Clinical Study Report');

    return { regions, guidelines, submissions };
  }

  /**
   * Estimate resource requirements
   */
  private async estimateResources(
    protocol: StudyProtocol, 
    crfs?: CRFSpecification[]
  ): Promise<ProtocolAnalysisResult['resourceEstimate']> {
    const complexity = await this.assessComplexity(protocol, crfs);
    const enrollment = protocol.population?.targetEnrollment || 100;
    const visits = protocol.visitSchedule?.length || 5;

    // Base duration estimation
    let baseDuration = 12; // months
    
    if (protocol.studyPhase === 'Phase 1') baseDuration = 6;
    else if (protocol.studyPhase === 'Phase 2') baseDuration = 12;
    else if (protocol.studyPhase === 'Phase 3') baseDuration = 24;

    // Adjust for complexity
    const complexityMultiplier = 1 + (complexity.score * 0.5);
    const estimatedDuration = `${Math.round(baseDuration * complexityMultiplier)} months`;

    // Data manager effort
    const baseEffort = enrollment * visits * 0.1; // base hours
    const adjustedEffort = baseEffort * complexityMultiplier;
    let dmEffort: string;
    
    if (adjustedEffort < 100) dmEffort = '0.5 FTE';
    else if (adjustedEffort < 300) dmEffort = '1.0 FTE';
    else if (adjustedEffort < 600) dmEffort = '1.5 FTE';
    else dmEffort = '2.0+ FTE';

    // Monitoring requirement
    let monitoringRequirement: 'low' | 'medium' | 'high';
    if (complexity.level === 'low') monitoringRequirement = 'low';
    else if (complexity.level === 'medium') monitoringRequirement = 'medium';
    else monitoringRequirement = 'high';

    return {
      estimatedDuration,
      dataManagerEffort: dmEffort,
      monitoringRequirement
    };
  }

  /**
   * Generate recommendations based on analysis
   */
  private generateRecommendations(
    complexity: ProtocolAnalysisResult['complexity'],
    riskAssessment: ProtocolAnalysisResult['riskAssessment'],
    therapeuticArea: ProtocolAnalysisResult['therapeuticArea'],
    resourceEstimate: ProtocolAnalysisResult['resourceEstimate']
  ): string[] {
    const recommendations: string[] = [];

    // Complexity-based recommendations
    if (complexity.level === 'high' || complexity.level === 'very-high') {
      recommendations.push('Consider phased UAT approach due to high complexity');
      recommendations.push('Implement enhanced data review procedures');
      recommendations.push('Plan for additional data management resources');
    }

    // Risk-based recommendations
    if (riskAssessment.overall === 'high') {
      recommendations.push('Implement enhanced safety monitoring procedures');
      recommendations.push('Consider more frequent data review cycles');
    }

    // Therapeutic area recommendations
    if (therapeuticArea.primary === 'Oncology') {
      recommendations.push('Implement RECIST criteria for tumor assessments');
      recommendations.push('Ensure robust adverse event monitoring');
    } else if (therapeuticArea.primary === 'Cardiovascular') {
      recommendations.push('Implement cardiac safety monitoring procedures');
      recommendations.push('Consider ECG central reading');
    }

    // Resource recommendations
    if (resourceEstimate.monitoringRequirement === 'high') {
      recommendations.push('Plan for intensive monitoring strategy');
      recommendations.push('Consider centralized monitoring components');
    }

    return recommendations;
  }

  /**
   * Generate warnings based on analysis
   */
  private generateWarnings(analysis: ProtocolAnalysisResult): string[] {
    const warnings: string[] = [];

    if (analysis.complexity.level === 'very-high') {
      warnings.push('Very high complexity detected - consider protocol simplification');
    }

    if (analysis.riskAssessment.overall === 'high') {
      warnings.push('High risk factors identified - review mitigation strategies');
    }

    if (analysis.therapeuticArea.confidence < 0.3) {
      warnings.push('Therapeutic area classification uncertain - manual review recommended');
    }

    return warnings;
  }

  /**
   * Generate DMP modifications based on analysis
   */
  private generateDMPModifications(analysis: ProtocolAnalysisResult): DMPModification[] {
    const modifications: DMPModification[] = [];

    // Add complexity-specific content
    if (analysis.complexity.level === 'high') {
      modifications.push({
        section: 'Data Cleaning Plan',
        type: 'add',
        content: `Additional data validation procedures recommended due to high study complexity (score: ${analysis.complexity.score.toFixed(2)}).`,
        reason: 'High complexity study requires enhanced data quality measures',
        priority: 'medium',
        required: false
      });
    }

    // Add therapeutic area specific content
    modifications.push({
      section: 'Overview',
      type: 'modify',
      content: `This study is classified as ${analysis.therapeuticArea.primary} with specific requirements for this therapeutic area.`,
      reason: 'Therapeutic area classification adds context',
      priority: 'low',
      required: false
    });

    return modifications;
  }

  // Helper methods for complexity assessment
  private getPhaseComplexityWeight(phase: string): number {
    switch (phase) {
      case 'Phase 1': return 0.8;
      case 'Phase 2': return 0.6;
      case 'Phase 3': return 0.9;
      case 'Phase 4': return 0.4;
      default: return 0.5;
    }
  }

  private assessDesignComplexity(protocol: StudyProtocol): number {
    let complexity = 0;
    
    if (protocol.studyDesign?.numberOfArms && protocol.studyDesign.numberOfArms > 2) {
      complexity += 0.3;
    }
    
    if (protocol.studyDesign?.type?.includes('blind')) {
      complexity += 0.2;
    }
    
    if (protocol.studyDesign?.type?.includes('crossover')) {
      complexity += 0.4;
    }

    return Math.min(complexity, 1.0);
  }

  private assessPopulationComplexity(protocol: StudyProtocol): number {
    let complexity = 0;
    
    const enrollment = protocol.population?.targetEnrollment || 0;
    if (enrollment > 500) complexity += 0.3;
    else if (enrollment > 100) complexity += 0.1;
    
    if (protocol.population?.ageRange?.includes('pediatric')) {
      complexity += 0.4;
    }

    return Math.min(complexity, 1.0);
  }

  private assessEndpointsComplexity(protocol: StudyProtocol): number {
    let complexity = 0;
    
    const primaryCount = protocol.endpoints?.primary?.length || 0;
    const secondaryCount = protocol.endpoints?.secondary?.length || 0;
    const exploratoryCount = protocol.endpoints?.exploratory?.length || 0;
    
    complexity += Math.min(primaryCount * 0.2, 0.4);
    complexity += Math.min(secondaryCount * 0.1, 0.3);
    complexity += Math.min(exploratoryCount * 0.05, 0.3);

    return Math.min(complexity, 1.0);
  }

  private assessCRFComplexity(crfs: CRFSpecification[]): number {
    let complexity = 0;
    
    complexity += Math.min(crfs.length / 20, 0.5);
    
    const totalFields = crfs.reduce((sum, crf) => sum + (crf.fields?.length || 0), 0);
    complexity += Math.min(totalFields / 200, 0.5);

    return Math.min(complexity, 1.0);
  }

  private getTherapeuticAreaRisks(protocol: StudyProtocol): RiskFactor[] {
    const risks: RiskFactor[] = [];
    const indication = protocol.indication?.toLowerCase() || '';

    if (indication.includes('cancer') || indication.includes('oncology')) {
      risks.push({
        category: 'Safety',
        description: 'Oncology studies have elevated safety monitoring requirements',
        severity: 'medium',
        mitigation: 'Implement enhanced AE monitoring and reporting procedures'
      });
    }

    if (indication.includes('cardiac') || indication.includes('cardiovascular')) {
      risks.push({
        category: 'Safety',
        description: 'Cardiovascular studies require cardiac safety monitoring',
        severity: 'medium',
        mitigation: 'Implement ECG monitoring and cardiac biomarker assessment'
      });
    }

    return risks;
  }

  private async validateConfiguration(): Promise<void> {
    // Validate configuration settings
    const thresholds = this.config.settings.complexityThresholds;
    if (thresholds.low >= thresholds.medium || thresholds.medium >= thresholds.high) {
      throw new Error('Invalid complexity thresholds configuration');
    }
  }
}