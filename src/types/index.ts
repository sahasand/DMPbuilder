export interface StudyProtocol {
  studyTitle: string;
  protocolNumber: string;
  studyPhase: string;
  investigationalDrug: string;
  sponsor: string;
  indication: string;
  studyDesign: StudyDesign;
  objectives: StudyObjectives;
  population: StudyPopulation;
  endpoints: StudyEndpoints;
  visitSchedule: VisitSchedule[];
  inclusionCriteria: string[];
  exclusionCriteria: string[];
}

export interface StudyDesign {
  type: 'open-label' | 'double-blind' | 'single-blind' | 'placebo-controlled';
  duration: string;
  numberOfArms: number;
  description: string;
  parts?: StudyPart[];
}

export interface StudyPart {
  name: string;
  description: string;
  cohorts?: number;
  participantsPerCohort?: string;
  dosing?: string;
}

export interface StudyObjectives {
  primary: Objective[];
  secondary: Objective[];
  exploratory?: Objective[];
}

export interface Objective {
  description: string;
  endpoints: string[];
}

export interface StudyPopulation {
  targetEnrollment: number;
  ageRange: string;
  gender: 'all' | 'male' | 'female';
  condition: string;
  keyInclusionCriteria?: string[];
  keyExclusionCriteria?: string[];
}

export interface StudyEndpoints {
  primary: Endpoint[];
  secondary: Endpoint[];
  exploratory?: Endpoint[];
}

export interface Endpoint {
  name: string;
  description: string;
  timepoint: string;
  method: string;
  crfSource?: string;
}

export interface VisitSchedule {
  visitName: string;
  visitNumber: number;
  timepoint: string;
  window: string;
  procedures: string[];
}

export interface CRFSpecification {
  formName: string;
  formOID: string;
  fields: CRFField[];
  version: string;
  lastUpdated: Date;
}

export interface CRFField {
  fieldName: string;
  fieldOID: string;
  fieldType: 'text' | 'number' | 'date' | 'select' | 'checkbox' | 'radio';
  required: boolean;
  validation?: FieldValidation;
  cdiscMapping?: CDISCMapping;
  normalRange?: NormalRange;
}

export interface FieldValidation {
  type: 'range' | 'regex' | 'list' | 'custom';
  value: string | number[] | string[];
  errorMessage: string;
}

export interface CDISCMapping {
  domain: string;
  variable: string;
  codelist?: string;
}

export interface NormalRange {
  low: number;
  high: number;
  unit: string;
}

export interface DMP {
  studyInfo: StudyInfo;
  version: string;
  effectiveDate: Date;
  sections: DMPSection[];
  approvals: Approval[];
  abbreviations: Abbreviation[];
  moduleAnalysis?: any; // Optional module analysis summary
}

export interface StudyInfo {
  studyTitle: string;
  protocolNumber: string;
  studyPhase: string;
  investigationalDrug: string;
  sponsor: string;
  indication: string;
}

export interface DMPSection {
  sectionNumber: string;
  title: string;
  content: string;
  subsections?: DMPSection[];
}

export interface Approval {
  name: string;
  title: string;
  signature?: string;
  date?: Date;
}

export interface Abbreviation {
  abbreviation: string;
  definition: string;
}

export interface DataManagementConfig {
  edcSystem: EDCSystem;
  dataReview: DataReviewConfig;
  queryManagement: QueryManagementConfig;
  medicalCoding: MedicalCodingConfig;
  protocolDeviation: ProtocolDeviationConfig;
  databaseLock: DatabaseLockConfig;
}

export interface EDCSystem {
  name: string;
  version: string;
  url: string;
  compliance: string[];
  userGroups: UserGroup[];
}

export interface UserGroup {
  role: string;
  activities: string[];
}

export interface DataReviewConfig {
  reviewTypes: string[];
  reviewFrequency: string;
  focusAreas: string[];
}

export interface QueryManagementConfig {
  siteResponseTime: number;
  closureTime: number;
  queryTypes: string[];
}

export interface MedicalCodingConfig {
  meddraDictionary: string;
  whodrugDictionary: string;
  codingFrequency: string;
  autoCodeEnabled: boolean;
}

export interface ProtocolDeviationConfig {
  categories: DeviationCategory[];
  classificationCriteria: ClassificationCriteria;
}

export interface DeviationCategory {
  name: string;
  examples: string[];
}

export interface ClassificationCriteria {
  major: string[];
  minor: string[];
}

export interface DatabaseLockConfig {
  softLockCriteria: string[];
  hardLockChecklist: string[];
  unlockProcess: string[];
}

export interface RiskAssessment {
  category: string;
  risk: string;
  impact: 'low' | 'medium' | 'high';
  likelihood: 'low' | 'medium' | 'high';
  mitigation: string;
}

export interface Timeline {
  milestone: string;
  plannedDate: Date;
  duration: string;
  dependencies: string[];
}

export interface ComplianceCheck {
  regulation: string;
  requirement: string;
  status: 'compliant' | 'non-compliant' | 'not-applicable';
  evidence: string;
}

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: Record<string, unknown>;
}

// Clinical Processing Result Types
export interface StudyComplexity {
  numberOfVisits: number;
  numberOfPrimaryEndpoints: number;
  numberOfSecondaryEndpoints: number;
  hasExploratoryEndpoints: boolean;
  numberOfCRFs: number;
  avgFieldsPerCRF: number;
  crfComplexityScore: number;
  protocolComplexityScore: number;
  overallComplexityScore: number;
  complexityRating: 'low' | 'medium' | 'high';
}

export interface DataCollectionPlan {
  visitSchedule: Array<{
    name: string;
    timepoint: string;
    procedures: number;
  }>;
  crfList: Array<{
    name: string;
    numberOfFields: number;
    estimatedCompletionTime: string;
  }>;
  totalDataPoints: number;
  estimatedDataEntryTime: string;
}

export interface ProcessingMetadata {
  processingTime: number;
  protocolLength: number;
  crfCount: number;
  warningsCount: number;
  timestamp: Date;
}

// PDF Processing Types
export interface PDFPageData {
  pageIndex: number;
  textContent: string;
  metadata?: Record<string, unknown>;
}

export interface PDFTextContent {
  items: Array<{
    str: string;
    transform: number[];
    width: number;
    height: number;
    fontName?: string;
  }>;
}

export interface PDFInfo {
  numPages: number;
  title?: string;
  author?: string;
  subject?: string;
  creator?: string;
  producer?: string;
  creationDate?: Date;
  modificationDate?: Date;
}

// Risk Assessment Types (enhanced)
export interface RiskAssessmentResult {
  risks: RiskAssessment[];
  summary: string;
  overallRiskLevel: 'low' | 'medium' | 'high';
  recommendations: string[];
}

// Timeline Types (enhanced)
export interface TimelineResult {
  milestones: Timeline[];
  summary: string;
  totalDuration: string;
  criticalPath: string[];
}

// Parser Section Types
export interface ProtocolSection {
  title: string;
  content: string;
  sectionNumber?: string;
  subsections?: ProtocolSection[];
}