// Comprehensive Protocol Analysis Type Definitions
import { StudyProtocol, CRFSpecification } from '../../../types';

// Main Analysis Result Interface
export interface ComprehensiveAnalysisResult {
  analysisId: string;
  protocolInfo: ProtocolInfo;
  designAnalysis: StudyDesignAnalysis;
  endpointAssessment: EndpointAssessment;
  populationAnalysis: PopulationAnalysis;
  statisticalAnalysis: StatisticalAnalysis;
  timelineAnalysis: TimelineAnalysis;
  riskAssessment: RiskAssessmentMatrix;
  optimizationRecommendations: OptimizationRecommendations;
  executiveSummary: ExecutiveSummary;
  benchmarking?: BenchmarkingResults;
  generatedAt: Date;
  analysisVersion: string;
  processingTime: number;
}

// Protocol Information
export interface ProtocolInfo {
  protocolNumber: string;
  studyTitle: string;
  phase: string;
  therapeuticArea: string;
  sponsor: string;
  indication: string;
  studyType: string;
  targetEnrollment?: number;
  estimatedDuration?: string;
}

// Study Design Analysis
export interface StudyDesignAnalysis {
  designType: string;
  designClassification: DesignClassification;
  strengths: ClinicalStrength[];
  weaknesses: ClinicalWeakness[];
  complexity: ComplexityAssessment;
  feasibilityScore: number; // 0-100
  designRecommendations: DesignRecommendation[];
  comparativeAnalysis?: ComparativeDesignAnalysis;
}

export interface DesignClassification {
  primaryType: 'Interventional' | 'Observational' | 'Expanded Access';
  intervention?: string;
  allocation: 'Randomized' | 'Non-Randomized' | 'N/A';
  masking: 'Open Label' | 'Single Blind' | 'Double Blind' | 'Triple Blind' | 'Quadruple Blind';
  purpose: 'Treatment' | 'Prevention' | 'Diagnostic' | 'Supportive Care' | 'Screening' | 'Health Services Research' | 'Basic Science';
  phases: string[];
}

export interface ClinicalStrength {
  category: 'Design' | 'Endpoints' | 'Population' | 'Methodology' | 'Feasibility';
  description: string;
  impact: 'High' | 'Medium' | 'Low';
  evidence: string;
}

export interface ClinicalWeakness {
  category: 'Design' | 'Endpoints' | 'Population' | 'Methodology' | 'Feasibility';
  description: string;
  severity: 'Critical' | 'Major' | 'Minor';
  impact: string;
  recommendation: string;
}

export interface ComplexityAssessment {
  overall: 'Low' | 'Medium' | 'High' | 'Very High';
  factors: ComplexityFactor[];
  score: number; // 0-100
  driverAnalysis: string[];
}

export interface ComplexityFactor {
  factor: string;
  level: 'Low' | 'Medium' | 'High';
  weight: number;
  description: string;
}

// Endpoint Assessment
export interface EndpointAssessment {
  primaryEndpoints: EndpointEvaluation[];
  secondaryEndpoints: EndpointEvaluation[];
  exploratoryEndpoints?: EndpointEvaluation[];
  endpointHierarchy: EndpointHierarchyAnalysis;
  regulatoryAlignment: RegulatoryAlignment;
  recommendations: EndpointRecommendation[];
}

export interface EndpointEvaluation {
  endpoint: string;
  type: 'Efficacy' | 'Safety' | 'Pharmacokinetic' | 'Pharmacodynamic' | 'Quality of Life' | 'Economic';
  measurability: 'Excellent' | 'Good' | 'Fair' | 'Poor';
  clinicalRelevance: 'High' | 'Medium' | 'Low';
  regulatoryAcceptance: 'High' | 'Medium' | 'Low' | 'Unknown';
  measurementChallenges: string[];
  strengthsWeaknesses: {
    strengths: string[];
    weaknesses: string[];
  };
}

export interface EndpointHierarchyAnalysis {
  isAppropriate: boolean;
  issues: string[];
  suggestions: string[];
  multiplicity: MultiplicityConcerns;
}

export interface MultiplicityConcerns {
  hasMultiplicity: boolean;
  adjustmentNeeded: boolean;
  recommendedApproach?: string;
}

// Population Analysis
export interface PopulationAnalysis {
  targetPopulation: PopulationAssessment;
  inclusionCriteria: CriteriaAnalysis;
  exclusionCriteria: CriteriaAnalysis;
  enrollmentFeasibility: EnrollmentFeasibility;
  demographicConsiderations: DemographicAnalysis;
  stratificationAnalysis?: StratificationAnalysis;
}

export interface PopulationAssessment {
  appropriateness: 'Excellent' | 'Good' | 'Fair' | 'Poor';
  size: 'Appropriate' | 'Too Large' | 'Too Small' | 'Uncertain';
  accessibility: 'High' | 'Medium' | 'Low';
  characterization: PopulationCharacterization;
}

export interface PopulationCharacterization {
  ageRange: string;
  diseaseStage?: string;
  comorbidities: string[];
  priorTreatments: string[];
  specialPopulations: string[];
}

export interface CriteriaAnalysis {
  appropriateness: 'Appropriate' | 'Too Restrictive' | 'Too Broad';
  clarity: 'Clear' | 'Ambiguous' | 'Unclear';
  measurability: 'Measurable' | 'Difficult to Measure' | 'Subjective';
  issues: string[];
  recommendations: string[];
}

export interface EnrollmentFeasibility {
  feasibilityScore: number; // 0-100
  estimatedEnrollmentRate: string;
  competitiveStudies: CompetitiveStudyAnalysis;
  geographicConsiderations: string[];
  seasonalFactors?: string[];
  mitigationStrategies: string[];
}

export interface CompetitiveStudyAnalysis {
  hasCompetition: boolean;
  competitorCount?: number;
  impact: 'High' | 'Medium' | 'Low';
  strategies: string[];
}

// Statistical Analysis
export interface StatisticalAnalysis {
  sampleSize: SampleSizeAnalysis;
  powerAnalysis: PowerAnalysis;
  statisticalMethods: StatisticalMethodsAssessment;
  interimAnalysis?: InterimAnalysisAssessment;
  missingData: MissingDataStrategy;
  recommendations: StatisticalRecommendation[];
}

export interface SampleSizeAnalysis {
  proposed: number;
  appropriateness: 'Appropriate' | 'Overpowered' | 'Underpowered' | 'Not Specified';
  assumptions: AssumptionAnalysis[];
  sensitivity: SensitivityAnalysis;
}

export interface PowerAnalysis {
  specifiedPower?: number;
  actualPower?: number;
  detectableEffect: string;
  assumptions: string[];
  robustness: 'Robust' | 'Moderate' | 'Weak';
}

// Timeline Analysis
export interface TimelineAnalysis {
  overallDuration: DurationAssessment;
  phaseBreakdown: PhaseTimeline[];
  criticalPath: CriticalPathAnalysis;
  feasibilityAssessment: TimelineFeasibility;
  optimizationOpportunities: TimelineOptimization[];
}

export interface DurationAssessment {
  proposed: string;
  realistic: string;
  comparison: 'Aggressive' | 'Realistic' | 'Conservative';
  factors: TimelineFactor[];
}

export interface PhaseTimeline {
  phase: string;
  estimatedDuration: string;
  feasibility: 'Feasible' | 'Challenging' | 'Unrealistic';
  dependencies: string[];
  risks: string[];
}

// Risk Assessment Framework
export interface RiskAssessmentMatrix {
  overallRiskLevel: 'Low' | 'Medium' | 'High' | 'Very High';
  riskScore: number; // 0-100
  enrollmentRisks: RiskCategory;
  regulatoryRisks: RiskCategory;
  operationalRisks: RiskCategory;
  safetyRisks: RiskCategory;
  dataQualityRisks: RiskCategory;
  financialRisks: RiskCategory;
  timelineRisks: RiskCategory;
  mitigation: MitigationPlan;
  monitoringPlan: RiskMonitoringPlan;
}

export interface RiskCategory {
  category: string;
  level: 'Low' | 'Medium' | 'High' | 'Very High';
  score: number; // 0-100
  factors: RiskFactor[];
  impact: RiskImpact;
}

export interface RiskFactor {
  id: string;
  description: string;
  likelihood: 'Low' | 'Medium' | 'High';
  impact: 'Low' | 'Medium' | 'High';
  riskScore: number;
  category: string;
  source: string;
  detectability: 'High' | 'Medium' | 'Low';
}

export interface RiskImpact {
  timeline: string;
  cost: string;
  quality: string;
  regulatory: string;
}

export interface MitigationPlan {
  strategies: MitigationStrategy[];
  contingencyPlans: ContingencyPlan[];
  responsibilityMatrix: ResponsibilityAssignment[];
}

export interface MitigationStrategy {
  riskId: string;
  strategy: string;
  implementation: string;
  timeline: string;
  resources: string;
  effectiveness: 'High' | 'Medium' | 'Low';
  cost: 'Low' | 'Medium' | 'High';
}

// Optimization Recommendations
export interface OptimizationRecommendations {
  protocolImprovements: ProtocolImprovement[];
  timelineOptimizations: TimelineOptimization[];
  costReductions: CostOptimization[];
  enrollmentEnhancements: EnrollmentEnhancement[];
  riskMitigations: RiskMitigation[];
  qualityImprovements: QualityImprovement[];
  prioritizedActions: PrioritizedAction[];
}

export interface ProtocolImprovement {
  category: 'Design' | 'Endpoints' | 'Population' | 'Procedures' | 'Assessments';
  current: string;
  recommended: string;
  rationale: string;
  impact: ImpactAssessment;
  implementation: ImplementationGuidance;
}

export interface ImpactAssessment {
  timeline: 'Positive' | 'Neutral' | 'Negative';
  cost: 'Reduction' | 'Neutral' | 'Increase';
  quality: 'Improvement' | 'Neutral' | 'Risk';
  enrollment: 'Improvement' | 'Neutral' | 'Risk';
  regulatory: 'Positive' | 'Neutral' | 'Risk';
}

export interface ImplementationGuidance {
  complexity: 'Low' | 'Medium' | 'High';
  timeline: string;
  resources: string[];
  dependencies: string[];
  approvals: string[];
}

// Executive Summary
export interface ExecutiveSummary {
  overallAssessment: OverallAssessment;
  keyFindings: KeyFinding[];
  criticalIssues: CriticalIssue[];
  topRecommendations: TopRecommendation[];
  successFactors: SuccessFactor[];
  nextSteps: NextStep[];
}

export interface OverallAssessment {
  feasibilityScore: number; // 0-100
  riskLevel: 'Low' | 'Medium' | 'High' | 'Very High';
  complexity: 'Low' | 'Medium' | 'High' | 'Very High';
  recommendation: 'Proceed' | 'Proceed with Modifications' | 'Significant Concerns' | 'Not Recommended';
  rationale: string;
}

export interface KeyFinding {
  category: string;
  finding: string;
  impact: 'High' | 'Medium' | 'Low';
  actionRequired: boolean;
}

export interface CriticalIssue {
  issue: string;
  severity: 'Critical' | 'Major' | 'Moderate';
  impact: string;
  recommendation: string;
  urgency: 'Immediate' | 'High' | 'Medium' | 'Low';
}

export interface TopRecommendation {
  priority: number;
  category: string;
  recommendation: string;
  benefit: string;
  effort: 'Low' | 'Medium' | 'High';
  timeline: string;
}

// Analysis Options
export interface AnalysisOptions {
  includeDesignAnalysis?: boolean;
  includeEndpointAssessment?: boolean;
  includePopulationAnalysis?: boolean;
  includeStatisticalAnalysis?: boolean;
  includeTimelineAnalysis?: boolean;
  includeRiskAssessment?: boolean;
  includeOptimization?: boolean;
  includeBenchmarking?: boolean;
  generateExecutiveSummary?: boolean;
  analysisDepth?: 'Basic' | 'Standard' | 'Comprehensive' | 'Expert';
  industry?: 'Pharmaceutical' | 'Biotechnology' | 'Medical Device' | 'Academic';
  regulatoryRegion?: 'FDA' | 'EMA' | 'PMDA' | 'Global';
  customParameters?: Record<string, any>;
}

// Supporting Types
export interface AssumptionAnalysis {
  assumption: string;
  validity: 'Valid' | 'Questionable' | 'Invalid';
  impact: 'High' | 'Medium' | 'Low';
  recommendation?: string;
}

export interface SensitivityAnalysis {
  keyParameters: string[];
  robustness: 'High' | 'Medium' | 'Low';
  scenarioAnalysis: ScenarioResult[];
}

export interface ScenarioResult {
  scenario: string;
  impact: string;
  probability: string;
}

export interface StatisticalMethodsAssessment {
  primaryAnalysis: MethodAssessment;
  secondaryAnalyses: MethodAssessment[];
  appropriateness: 'Appropriate' | 'Suboptimal' | 'Inappropriate';
  recommendations: string[];
}

export interface MethodAssessment {
  method: string;
  appropriateness: 'Appropriate' | 'Suboptimal' | 'Inappropriate';
  assumptions: string[];
  limitations: string[];
  alternatives?: string[];
}

export interface InterimAnalysisAssessment {
  planned: boolean;
  appropriate: boolean;
  methodology: string;
  stoppingRules: string[];
  alphaSpending: string;
  recommendations: string[];
}

export interface MissingDataStrategy {
  anticipated: string;
  strategy: string;
  appropriateness: 'Appropriate' | 'Suboptimal' | 'Inadequate';
  recommendations: string[];
}

export interface StatisticalRecommendation {
  category: string;
  recommendation: string;
  rationale: string;
  priority: 'High' | 'Medium' | 'Low';
}

export interface CriticalPathAnalysis {
  criticalActivities: CriticalActivity[];
  bottlenecks: Bottleneck[];
  dependencies: Dependency[];
  optimizationOpportunities: string[];
}

export interface CriticalActivity {
  activity: string;
  duration: string;
  flexibility: 'None' | 'Limited' | 'Moderate' | 'High';
  risks: string[];
}

export interface Bottleneck {
  activity: string;
  constraint: string;
  impact: string;
  solutions: string[];
}

export interface Dependency {
  dependent: string;
  prerequisite: string;
  type: 'Hard' | 'Soft';
  buffer?: string;
}

export interface TimelineFeasibility {
  feasibilityScore: number;
  challengingAspects: string[];
  accelerationOpportunities: string[];
  recommendations: string[];
}

export interface TimelineOptimization {
  phase: string;
  currentDuration: string;
  optimizedDuration: string;
  strategy: string;
  feasibility: 'High' | 'Medium' | 'Low';
  risks: string[];
  benefits: string[];
}

export interface TimelineFactor {
  factor: string;
  impact: 'Accelerating' | 'Neutral' | 'Delaying';
  magnitude: 'High' | 'Medium' | 'Low';
  mitigation?: string;
}

export interface DemographicAnalysis {
  ageDistribution: string;
  genderBalance: string;
  ethnicDiversity: string;
  geographicDistribution: string;
  socioeconomicFactors: string[];
  recommendations: string[];
}

export interface StratificationAnalysis {
  proposed: boolean;
  appropriate: boolean;
  factors: StratificationFactor[];
  recommendations: string[];
}

export interface StratificationFactor {
  factor: string;
  justification: string;
  impact: string;
  feasibility: 'High' | 'Medium' | 'Low';
}

export interface RegulatoryAlignment {
  region: string[];
  guidance: GuidanceAlignment[];
  recommendations: string[];
}

export interface GuidanceAlignment {
  guidance: string;
  alignment: 'Aligned' | 'Partial' | 'Misaligned';
  gaps: string[];
  recommendations: string[];
}

export interface EndpointRecommendation {
  type: 'Addition' | 'Modification' | 'Removal';
  endpoint: string;
  rationale: string;
  impact: ImpactAssessment;
  priority: 'High' | 'Medium' | 'Low';
}

export interface DesignRecommendation {
  aspect: string;
  current: string;
  recommended: string;
  rationale: string;
  impact: ImpactAssessment;
  feasibility: 'High' | 'Medium' | 'Low';
}

export interface ComparativeDesignAnalysis {
  alternativeDesigns: AlternativeDesign[];
  tradeoffAnalysis: TradeoffAnalysis[];
  recommendations: string[];
}

export interface AlternativeDesign {
  design: string;
  advantages: string[];
  disadvantages: string[];
  feasibility: 'High' | 'Medium' | 'Low';
}

export interface TradeoffAnalysis {
  aspect: string;
  options: TradeoffOption[];
  recommendation: string;
}

export interface TradeoffOption {
  option: string;
  benefits: string[];
  costs: string[];
  risks: string[];
}

export interface CostOptimization {
  category: 'Site Costs' | 'Patient Costs' | 'Monitoring' | 'Data Management' | 'Laboratory' | 'Technology';
  current: string;
  optimized: string;
  savings: CostSavings;
  feasibility: 'High' | 'Medium' | 'Low';
  risks: string[];
}

export interface CostSavings {
  amount: string;
  percentage: string;
  timeline: string;
  confidence: 'High' | 'Medium' | 'Low';
}

export interface EnrollmentEnhancement {
  strategy: string;
  rationale: string;
  implementation: string;
  expectedImpact: string;
  timeline: string;
  resources: string[];
  risks: string[];
}

export interface RiskMitigation {
  riskCategory: string;
  strategy: string;
  implementation: ImplementationGuidance;
  effectiveness: 'High' | 'Medium' | 'Low';
  cost: 'Low' | 'Medium' | 'High';
}

export interface QualityImprovement {
  area: string;
  current: string;
  improved: string;
  rationale: string;
  implementation: string;
  impact: QualityImpact;
}

export interface QualityImpact {
  dataQuality: 'Improvement' | 'Neutral' | 'Risk';
  patientSafety: 'Improvement' | 'Neutral' | 'Risk';
  regulatoryCompliance: 'Improvement' | 'Neutral' | 'Risk';
  scientificValidity: 'Improvement' | 'Neutral' | 'Risk';
}

export interface PrioritizedAction {
  rank: number;
  action: string;
  category: string;
  rationale: string;
  impact: 'High' | 'Medium' | 'Low';
  effort: 'Low' | 'Medium' | 'High';
  timeline: string;
  dependencies: string[];
}

export interface SuccessFactor {
  factor: string;
  importance: 'Critical' | 'Important' | 'Beneficial';
  currentStatus: 'Addressed' | 'Partial' | 'Missing';
  recommendations: string[];
}

export interface NextStep {
  step: string;
  timeline: string;
  responsibility: string;
  deliverable: string;
  dependencies: string[];
}

export interface BenchmarkingResults {
  industryComparisons: IndustryComparison[];
  bestPractices: BestPractice[];
  competitiveAnalysis: CompetitiveAnalysis[];
}

export interface IndustryComparison {
  metric: string;
  protocolValue: string;
  industryAverage: string;
  industryRange: string;
  percentile: number;
  assessment: 'Above Average' | 'Average' | 'Below Average';
}

export interface BestPractice {
  area: string;
  practice: string;
  applicability: 'High' | 'Medium' | 'Low';
  benefits: string[];
  implementation: string;
}

export interface CompetitiveAnalysis {
  competitor: string;
  similarities: string[];
  differences: string[];
  advantages: string[];
  disadvantages: string[];
}

export interface RiskMonitoringPlan {
  indicators: RiskIndicator[];
  thresholds: RiskThreshold[];
  escalationProcedures: EscalationProcedure[];
  reviewFrequency: string;
}

export interface RiskIndicator {
  name: string;
  description: string;
  measurement: string;
  frequency: string;
  responsibleParty: string;
}

export interface RiskThreshold {
  indicator: string;
  greenThreshold: string;
  yellowThreshold: string;
  redThreshold: string;
  actions: ThresholdAction[];
}

export interface ThresholdAction {
  threshold: 'Green' | 'Yellow' | 'Red';
  action: string;
  timeline: string;
  responsibility: string;
}

export interface EscalationProcedure {
  trigger: string;
  escalationPath: string[];
  timeline: string;
  decisionCriteria: string;
}

export interface ContingencyPlan {
  scenario: string;
  probability: 'High' | 'Medium' | 'Low';
  impact: 'High' | 'Medium' | 'Low';
  response: string;
  resources: string[];
  timeline: string;
}

export interface ResponsibilityAssignment {
  task: string;
  primaryOwner: string;
  secondaryOwners: string[];
  accountabilities: string[];
  timeline: string;
}