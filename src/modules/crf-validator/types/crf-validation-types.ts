// CRF Validator Types and Interfaces
export interface ValidationOptions {
  validationDepth?: 'Basic' | 'Standard' | 'Comprehensive' | 'Expert';
  regulatoryRegion?: 'FDA' | 'EMA' | 'PMDA' | 'Global';
  industry?: 'Pharmaceutical' | 'Biotechnology' | 'Medical Device' | 'Academic';
  includeComplianceCheck?: boolean;
  includeEfficiencyAnalysis?: boolean;
  includeProtocolAlignment?: boolean;
  generateRecommendations?: boolean;
  customParameters?: Record<string, any>;
}

export interface CRFValidationResult {
  validationId: string;
  protocolInfo: ProtocolInfo;
  overallScore: number;
  completenessScore: number;
  qualityScore: number;
  complianceScore: number;
  protocolAlignment: ProtocolAlignmentResult;
  structureAnalysis: StructureAnalysisResult;
  validationFindings: ValidationFinding[];
  recommendations: CRFRecommendation[];
  criticalIssues: CriticalIssue[];
  executiveSummary: ValidationExecutiveSummary;
  generatedAt: Date;
  validationVersion: string;
  processingTime: number;
}

export interface ProtocolInfo {
  protocolNumber: string;
  studyTitle: string;
  phase: string;
  therapeuticArea: string;
  sponsor: string;
  indication: string;
}

export interface ProtocolAlignmentResult {
  overallAlignmentScore: number;
  endpointCoverage: EndpointCoverage[];
  visitScheduleAlignment: VisitAlignment[];
  populationCriteriaCoverage: CriteriaCoverage;
  missingRequirements: string[];
  redundantCollections: string[];
  dataFlowIssues: DataFlowIssue[];
}

export interface EndpointCoverage {
  endpointName: string;
  endpointType: 'Primary' | 'Secondary' | 'Exploratory';
  coverageStatus: 'Fully Covered' | 'Partially Covered' | 'Not Covered';
  coveredBy: string[];
  missingFields: string[];
  recommendations: string[];
}

export interface VisitAlignment {
  visitName: string;
  protocolVisit: string;
  crfVisit: string;
  alignmentStatus: 'Aligned' | 'Partial' | 'Misaligned' | 'Missing';
  timepoint: string;
  procedures: ProcedureAlignment[];
  issues: string[];
}

export interface ProcedureAlignment {
  procedureName: string;
  requiredByProtocol: boolean;
  capturedInCRF: boolean;
  fieldMapping: string[];
  completeness: number;
}

export interface CriteriaCoverage {
  inclusionCriteria: CriteriaAlignment[];
  exclusionCriteria: CriteriaAlignment[];
  overallCoverage: number;
  missingCriteria: string[];
}

export interface CriteriaAlignment {
  criterion: string;
  covered: boolean;
  crfFields: string[];
  adequacy: 'Adequate' | 'Partial' | 'Inadequate';
}

export interface DataFlowIssue {
  issue: string;
  severity: 'Critical' | 'Major' | 'Minor';
  affectedForms: string[];
  description: string;
  impact: string;
  recommendation: string;
}

export interface StructureAnalysisResult {
  formsCount: number;
  fieldsCount: number;
  validationRulesCount: number;
  structuralScore: number;
  formAnalysis: FormAnalysis[];
  structuralIssues: StructuralIssue[];
  recommendations: string[];
}

export interface FormAnalysis {
  formName: string;
  formOID: string;
  fieldCount: number;
  requiredFieldCount: number;
  validationRuleCount: number;
  completenessScore: number;
  qualityScore: number;
  issues: string[];
  strengths: string[];
}

export interface StructuralIssue {
  formName: string;
  issueType: 'Missing Field' | 'Invalid Validation' | 'Inconsistent Naming' | 'Poor Structure';
  severity: 'Critical' | 'Major' | 'Minor';
  description: string;
  recommendation: string;
}

export interface ValidationFinding {
  id: string;
  category: 'Structure' | 'Content' | 'Compliance' | 'Protocol Alignment' | 'Efficiency';
  finding: string;
  severity: 'Critical' | 'Major' | 'Minor' | 'Info';
  impact: string;
  formName?: string;
  fieldName?: string;
  recommendation: string;
  priority: 'High' | 'Medium' | 'Low';
}

export interface CRFRecommendation {
  id: string;
  category: 'Structure' | 'Content' | 'Compliance' | 'Efficiency' | 'Protocol Alignment';
  priority: 'High' | 'Medium' | 'Low';
  recommendation: string;
  rationale: string;
  impact: string;
  implementationEffort: 'Low' | 'Medium' | 'High';
  timeline: string;
  businessRationale: string;
  affectedForms: string[];
}

export interface CriticalIssue {
  issue: string;
  impact: string;
  recommendation: string;
  severity: 'Critical' | 'Major' | 'Minor';
  urgency: 'Immediate' | 'High' | 'Medium' | 'Low';
  issueCategory: 'Regulatory' | 'Clinical' | 'Operational' | 'Data Quality';
  affectedComponents: string[];
}

export interface ValidationExecutiveSummary {
  overallAssessment: {
    validationScore: number;
    qualityLevel: 'Excellent' | 'Good' | 'Fair' | 'Poor';
    protocolAlignment: 'Fully Aligned' | 'Mostly Aligned' | 'Partially Aligned' | 'Misaligned';
    recommendation: 'Approve' | 'Approve with Minor Changes' | 'Requires Revision' | 'Major Revision Required';
    rationale: string;
  };
  keyFindings: ValidationFinding[];
  criticalIssues: CriticalIssue[];
  topRecommendations: CRFRecommendation[];
  complianceStatus: {
    cdiscCompliance: 'Compliant' | 'Mostly Compliant' | 'Non-Compliant';
    regulatoryCompliance: 'Compliant' | 'Mostly Compliant' | 'Non-Compliant';
    protocolCompliance: 'Compliant' | 'Mostly Compliant' | 'Non-Compliant';
  };
  nextSteps: {
    step: string;
    timeline: string;
    responsibility: string;
    deliverable: string;
    dependencies: string[];
  }[];
}

// Analysis Context Types
export interface ValidationContext {
  session?: {
    id: string;
    user?: string;
    timestamp: Date;
  };
  protocol: any; // StudyProtocol from main types
  crfs: any[]; // CRFSpecification[] from main types  
  options: ValidationOptions;
  metadata?: Record<string, any>;
}

// Export and Report Types
export interface ValidationReport {
  validationId: string;
  protocol: ProtocolInfo;
  validation: CRFValidationResult;
  performance?: {
    processingTime: number;
    validationScore: number;
    memoryUsage: number;
  };
}

export interface ValidationResponse {
  validationId: string;
  status: string;
  validation: {
    overallScore: number;
    qualityLevel: string;
    protocolAlignment: string;
    recommendation: string;
    keyFindings: ValidationFinding[];
    criticalIssues: CriticalIssue[];
    topRecommendations: CRFRecommendation[];
  };
  timestamp: string;
  metadata: {
    processingTime: number;
    protocolPages: number;
    crfPages: number;
    validationComponents: string[];
  };
}

export interface ValidationStatus {
  status: 'healthy' | 'busy' | 'error';
  activeValidations: number;
  queuedValidations: number;
  systemLoad: number;
  lastValidation: string;
}