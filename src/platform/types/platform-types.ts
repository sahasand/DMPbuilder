// Platform-wide type definitions for Clinical Research Management Platform
import { ClinicalModule, ModuleContext, ModuleResult } from '../../types/module-types';

// ============================================================================
// PLATFORM CORE TYPES
// ============================================================================

export interface PlatformConfig {
  name: string;
  version: string;
  environment: 'development' | 'production' | 'test';
  services: ServiceConfig;
  modules: ModuleManagerConfig;
  workflows: WorkflowConfig;
}

export interface ServiceConfig {
  workflow: WorkflowServiceConfig;
  data: DataServiceConfig;
  user: UserServiceConfig;
  document: DocumentServiceConfig;
  notification: NotificationServiceConfig;
  audit: AuditServiceConfig;
  integration: IntegrationServiceConfig;
  compliance: ComplianceServiceConfig;
}

// ============================================================================
// PLATFORM SERVICES INTERFACES
// ============================================================================

export interface PlatformServices {
  workflow: WorkflowEngineService;
  data: DataManagementService;
  user: UserManagementService;
  document: DocumentManagementService;
  notification: NotificationService;
  audit: AuditService;
  integration: IntegrationHubService;
  compliance: ComplianceService;
  logger: LoggingService;
  cache: CacheService;
  config: ConfigurationService;
}

// Workflow Engine Service
export interface WorkflowEngineService {
  // Workflow Management
  start(workflowId: string, parameters: WorkflowParameters): Promise<WorkflowInstance>;
  stop(instanceId: string): Promise<void>;
  pause(instanceId: string): Promise<void>;
  resume(instanceId: string): Promise<void>;
  
  // Workflow Queries
  getActiveWorkflows(studyId?: string): Promise<WorkflowInstance[]>;
  getWorkflowStatus(instanceId: string): Promise<WorkflowStatus>;
  getWorkflowHistory(instanceId: string): Promise<WorkflowHistory[]>;
  
  // Event Handling
  trigger(event: string, data: any): Promise<void>;
  subscribe(event: string, handler: EventHandler): void;
  unsubscribe(event: string, handler: EventHandler): void;
  
  // Workflow Registration
  register(workflowId: string, definition: WorkflowDefinition): void;
  unregister(workflowId: string): void;
  
  // Execution
  executeWorkflow(workflowId: string, context: WorkflowExecutionContext): Promise<WorkflowResult>;
}

// Data Management Service
export interface DataManagementService {
  // CRUD Operations
  save<T>(entity: string, data: T): Promise<T>;
  find<T>(entity: string, criteria: QueryCriteria): Promise<T[]>;
  findOne<T>(entity: string, id: string): Promise<T>;
  update<T>(entity: string, id: string, data: Partial<T>): Promise<T>;
  delete(entity: string, id: string): Promise<void>;
  
  // Complex Queries
  query<T>(entity: string, query: QueryBuilder): Promise<T[]>;
  aggregate(entity: string, pipeline: AggregationPipeline): Promise<any>;
  
  // Data Validation
  validate<T>(data: T, schema: string): Promise<ValidationResult>;
  
  // Bulk Operations
  bulkImport<T>(entity: string, data: T[]): Promise<ImportResult>;
  bulkUpdate<T>(entity: string, updates: BulkUpdate[]): Promise<UpdateResult>;
  
  // Relationships
  getStudyWithRelations(studyId: string, relations: string[]): Promise<Study>;
  
  // Audit and Versioning
  getAuditHistory(entity: string, id: string): Promise<AuditRecord[]>;
  getVersionHistory(entity: string, id: string): Promise<VersionRecord[]>;
}

// User Management Service
export interface UserManagementService {
  // Session Management
  getCurrentUser(): Promise<User>;
  getCurrentSession(): Promise<UserSession>;
  
  // Permissions
  hasPermission(permission: string): Promise<boolean>;
  hasRole(role: string): Promise<boolean>;
  getPermissions(): Promise<string[]>;
  
  // User Queries
  getUser(userId: string): Promise<User>;
  getUsersByRole(role: string): Promise<User[]>;
  
  // Study Access
  getStudyAccess(studyId: string): Promise<StudyAccess>;
  getUserStudies(): Promise<Study[]>;
}

// Document Management Service
export interface DocumentManagementService {
  // Document Operations
  store(document: Document): Promise<DocumentMetadata>;
  retrieve(documentId: string): Promise<Document>;
  update(documentId: string, document: Partial<Document>): Promise<DocumentMetadata>;
  delete(documentId: string): Promise<void>;
  
  // Version Control
  createVersion(documentId: string): Promise<DocumentVersion>;
  getVersions(documentId: string): Promise<DocumentVersion[]>;
  
  // Search and Discovery
  search(criteria: DocumentSearchCriteria): Promise<DocumentMetadata[]>;
  
  // Access Control
  setPermissions(documentId: string, permissions: DocumentPermissions): Promise<void>;
  getPermissions(documentId: string): Promise<DocumentPermissions>;
}

// Other service interfaces (simplified for brevity)
export interface NotificationService {
  send(notification: Notification): Promise<void>;
  subscribe(userId: string, channel: string): Promise<void>;
  getNotifications(userId: string): Promise<Notification[]>;
}

export interface AuditService {
  log(event: AuditEvent): Promise<void>;
  getAuditTrail(entityId: string): Promise<AuditRecord[]>;
  search(criteria: AuditSearchCriteria): Promise<AuditRecord[]>;
}

export interface IntegrationHubService {
  connect(system: string, config: IntegrationConfig): Promise<Integration>;
  disconnect(integrationId: string): Promise<void>;
  getIntegrations(): Promise<Integration[]>;
  sync(integrationId: string): Promise<SyncResult>;
}

export interface ComplianceService {
  validateGCPCompliance(data: any): Promise<ComplianceResult>;
  validate21CFRPart11(data: any): Promise<ComplianceResult>;
  validateGDPRCompliance(data: any): Promise<ComplianceResult>;
  createAuditTrail(action: string, data: any): Promise<AuditRecord>;
  createElectronicSignature(document: any, user: User): Promise<ElectronicSignature>;
}

export interface LoggingService {
  info(message: string, context?: any): void;
  warn(message: string, context?: any): void;
  error(message: string, error?: Error, context?: any): void;
  debug(message: string, context?: any): void;
}

export interface CacheService {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
}

export interface ConfigurationService {
  get<T>(key: string): T;
  set<T>(key: string, value: T): void;
  getAll(): Record<string, any>;
  reload(): Promise<void>;
}

// ============================================================================
// PLATFORM MODULE TYPES
// ============================================================================

export interface PlatformModule extends ClinicalModule {
  // Platform-specific properties
  platformVersion: string;
  permissions: ModulePermissions;
  dependencies: PlatformDependencies;
  
  // Platform lifecycle hooks
  onPlatformStart?(): Promise<void>;
  onPlatformStop?(): Promise<void>;
  onUserLogin?(session: UserSession): Promise<void>;
  onStudyLoad?(study: StudyContext): Promise<void>;
  
  // Platform integration
  registerWorkflows?(registry: WorkflowRegistry): void;
  registerDataModels?(registry: DataModelRegistry): void;
  registerEventHandlers?(registry: EventRegistry): void;
}

export interface ModulePlatformContext extends ModuleContext {
  services: PlatformServices;
  session: UserSession;
  study: StudyContext;
  workflow?: WorkflowContext;
  sharedData?: SharedDataContext;
  security?: ModuleSecurityContext;
}

export interface ModulePermissions {
  required: string[];
  optional: string[];
}

export interface PlatformDependencies {
  services: string[];
  modules: string[];
  minimumPlatformVersion: string;
}

// ============================================================================
// WORKFLOW TYPES
// ============================================================================

export interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  version: string;
  steps: WorkflowStep[];
  triggers: WorkflowTrigger[];
  conditions?: WorkflowCondition[];
  timeout?: number;
  retryPolicy?: RetryPolicy;
}

export interface WorkflowStep {
  id: string;
  name: string;
  type: 'module' | 'approval' | 'condition' | 'parallel' | 'sequential';
  moduleId?: string;
  inputs: WorkflowInput[];
  outputs: WorkflowOutput[];
  conditions?: WorkflowCondition[];
  permissions: string[];
  timeout?: number;
  retryPolicy?: RetryPolicy;
}

export interface WorkflowTrigger {
  type: 'event' | 'schedule' | 'manual';
  event?: string;
  schedule?: string;
  conditions?: WorkflowCondition[];
}

export interface WorkflowCondition {
  type: 'data' | 'user' | 'time' | 'custom';
  expression: string;
  value?: any;
}

export interface WorkflowInput {
  name: string;
  type: string;
  required: boolean;
  source: 'context' | 'previous_step' | 'user_input' | 'data_service';
  sourceKey?: string;
}

export interface WorkflowOutput {
  name: string;
  type: string;
  target: 'context' | 'data_service' | 'shared_data';
  targetKey?: string;
}

export interface WorkflowInstance {
  id: string;
  workflowId: string;
  status: WorkflowStatus;
  currentStep?: string;
  parameters: WorkflowParameters;
  context: WorkflowExecutionContext;
  history: WorkflowHistory[];
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

export interface WorkflowExecutionContext {
  studyId?: string;
  userId: string;
  environment: 'development' | 'production' | 'test';
  data: Record<string, any>;
  stepOutputs: Record<string, any>;
}

export interface WorkflowResult {
  instanceId: string;
  status: WorkflowStatus;
  outputs: Record<string, any>;
  errors?: string[];
  duration: number;
}

export interface WorkflowHistory {
  stepId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  startTime: Date;
  endTime?: Date;
  duration?: number;
  inputs?: any;
  outputs?: any;
  error?: string;
}

export type WorkflowStatus = 'pending' | 'running' | 'completed' | 'failed' | 'paused' | 'cancelled';

export interface WorkflowParameters {
  [key: string]: any;
}

export interface RetryPolicy {
  maxRetries: number;
  backoffStrategy: 'fixed' | 'exponential';
  initialDelay: number;
  maxDelay?: number;
}

// ============================================================================
// DATA MODEL TYPES
// ============================================================================

export interface StudyContext {
  id: string;
  protocolNumber: string;
  title: string;
  phase: StudyPhase;
  therapeuticArea: string;
  status: StudyStatus;
  permissions: StudyPermissions;
}

export interface UserSession {
  id: string;
  user: User;
  permissions: string[];
  roles: string[];
  studies: string[];
  loginTime: Date;
  lastActivity: Date;
}

export interface User {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: UserRole[];
  organization: string;
  permissions: string[];
}

export interface UserRole {
  id: string;
  name: string;
  permissions: string[];
}

export interface Study {
  id: string;
  protocolNumber: string;
  title: string;
  phase: StudyPhase;
  therapeuticArea: string;
  status: StudyStatus;
  sponsor: string;
  indication: string;
  startDate?: Date;
  endDate?: Date;
  
  // Related entities
  protocol?: Protocol;
  sites?: Site[];
  personnel?: Personnel[];
  timeline?: Timeline;
  
  // Module-generated data
  dmp?: DMP;
  riskAssessment?: RiskAssessment;
  qualityPlan?: QualityPlan;
  
  // Audit fields
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
  version: number;
}

export interface Protocol {
  id: string;
  studyId: string;
  version: string;
  title: string;
  objectives: string[];
  endpoints: Endpoint[];
  population: StudyPopulation;
  design: StudyDesign;
  timeline: ProtocolTimeline;
  content: string;
  parsedData?: any;
}

export type StudyPhase = 'Phase 1' | 'Phase 2' | 'Phase 3' | 'Phase 4' | 'Observational';
export type StudyStatus = 'planning' | 'active' | 'paused' | 'completed' | 'cancelled';

// ============================================================================
// SERVICE CONFIGURATION TYPES
// ============================================================================

export interface WorkflowServiceConfig {
  enabled: boolean;
  maxConcurrentWorkflows: number;
  defaultTimeout: number;
  retryPolicy: RetryPolicy;
}

export interface DataServiceConfig {
  provider: 'memory' | 'mongodb' | 'postgresql';
  connectionString?: string;
  database?: string;
  caching: {
    enabled: boolean;
    ttl: number;
  };
}

export interface UserServiceConfig {
  authProvider: 'local' | 'oauth' | 'saml';
  sessionTimeout: number;
  permissions: {
    default: string[];
    admin: string[];
  };
}

export interface DocumentServiceConfig {
  storage: 'local' | 's3' | 'azure';
  maxFileSize: number;
  allowedTypes: string[];
}

export interface NotificationServiceConfig {
  channels: string[];
  defaultChannel: string;
  templates: Record<string, NotificationTemplate>;
}

export interface AuditServiceConfig {
  enabled: boolean;
  retentionDays: number;
  encryptionKey?: string;
}

export interface IntegrationServiceConfig {
  enabled: boolean;
  timeout: number;
  retryPolicy: RetryPolicy;
}

export interface ComplianceServiceConfig {
  frameworks: string[];
  auditEnabled: boolean;
  signatureRequired: boolean;
}

export interface ModuleManagerConfig {
  autoDiscover: boolean;
  moduleDirectories: string[];
  executionTimeout: number;
  maxConcurrentExecutions: number;
  enablePerformanceMonitoring: boolean;
}

export interface WorkflowConfig {
  enabled: boolean;
  defaultWorkflows: string[];
  maxConcurrentWorkflows: number;
  executionTimeout: number;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export interface QueryCriteria {
  [key: string]: any;
}

export interface QueryBuilder {
  select?: string[];
  where?: Record<string, any>;
  orderBy?: Record<string, 'asc' | 'desc'>;
  limit?: number;
  offset?: number;
}

export interface AggregationPipeline {
  [key: string]: any;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ImportResult {
  totalRecords: number;
  successCount: number;
  failureCount: number;
  errors: string[];
}

export interface UpdateResult {
  modifiedCount: number;
  errors: string[];
}

export interface BulkUpdate {
  id: string;
  data: any;
}

export interface AuditRecord {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  changes: any;
  userId: string;
  timestamp: Date;
  metadata?: any;
}

export interface VersionRecord {
  id: string;
  entityType: string;
  entityId: string;
  version: number;
  data: any;
  createdAt: Date;
  createdBy: string;
}

export interface StudyAccess {
  studyId: string;
  permissions: string[];
  role: string;
}

export interface StudyPermissions {
  read: boolean;
  write: boolean;
  admin: boolean;
  modules: string[];
}

export interface Document {
  id: string;
  name: string;
  type: string;
  content: Buffer | string;
  metadata: DocumentMetadata;
}

export interface DocumentMetadata {
  id: string;
  name: string;
  type: string;
  size: number;
  contentType: string;
  version: number;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
  tags: string[];
  permissions: DocumentPermissions;
}

export interface DocumentVersion {
  version: number;
  documentId: string;
  createdAt: Date;
  createdBy: string;
  changes: string;
}

export interface DocumentSearchCriteria {
  name?: string;
  type?: string;
  tags?: string[];
  createdAfter?: Date;
  createdBefore?: Date;
  studyId?: string;
}

export interface DocumentPermissions {
  read: string[];
  write: string[];
  admin: string[];
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  data?: any;
  read: boolean;
  createdAt: Date;
}

export interface NotificationTemplate {
  subject: string;
  body: string;
  type: 'email' | 'sms' | 'push';
}

export interface AuditEvent {
  entityType: string;
  entityId: string;
  action: string;
  userId: string;
  changes?: any;
  metadata?: any;
}

export interface AuditSearchCriteria {
  entityType?: string;
  entityId?: string;
  action?: string;
  userId?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface Integration {
  id: string;
  name: string;
  type: string;
  status: 'active' | 'inactive' | 'error';
  config: IntegrationConfig;
  lastSync?: Date;
}

export interface IntegrationConfig {
  endpoint: string;
  credentials: any;
  settings: any;
}

export interface SyncResult {
  success: boolean;
  recordsProcessed: number;
  errors: string[];
  syncTime: Date;
}

export interface ComplianceResult {
  isCompliant: boolean;
  violations: string[];
  recommendations: string[];
  score: number;
}

export interface ElectronicSignature {
  id: string;
  documentId: string;
  userId: string;
  signatureData: string;
  timestamp: Date;
  reason: string;
}

// ============================================================================
// REGISTRIES
// ============================================================================

export interface WorkflowRegistry {
  register(workflowId: string, definition: WorkflowDefinition): void;
  unregister(workflowId: string): void;
  get(workflowId: string): WorkflowDefinition | undefined;
  getAll(): WorkflowDefinition[];
}

export interface DataModelRegistry {
  register(modelName: string, schema: any): void;
  unregister(modelName: string): void;
  get(modelName: string): any;
  getAll(): Record<string, any>;
}

export interface EventRegistry {
  register(eventType: string, handler: EventHandler): void;
  unregister(eventType: string, handler: EventHandler): void;
  getHandlers(eventType: string): EventHandler[];
}

export interface EventHandler {
  (event: PlatformEvent): Promise<void>;
}

export interface PlatformEvent {
  type: string;
  source: string;
  data: any;
  timestamp: Date;
  userId?: string;
  studyId?: string;
}

// ============================================================================
// CONTEXT TYPES
// ============================================================================

export interface WorkflowContext {
  workflowId: string;
  instanceId: string;
  currentStep: string;
  previousSteps: CompletedStep[];
  workflowData: WorkflowData;
  
  // State access
  getStepOutput(stepId: string): Promise<any>;
  setStepOutput(stepId: string, data: any): Promise<void>;
  
  // Flow control
  completeStep(outputs: StepOutput[]): Promise<void>;
  failStep(error: Error): Promise<void>;
  skipStep(reason: string): Promise<void>;
}

export interface CompletedStep {
  stepId: string;
  status: 'completed' | 'failed' | 'skipped';
  outputs: any;
  duration: number;
  completedAt: Date;
}

export interface WorkflowData {
  [key: string]: any;
}

export interface StepOutput {
  name: string;
  data: any;
}

export interface SharedDataContext {
  // Cross-module data access
  get<T>(key: string): Promise<T>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  
  // Module-specific namespaces
  getNamespace(moduleId: string): SharedDataNamespace;
  
  // Event-based sharing
  shareData(recipients: string[], data: any): Promise<void>;
  requestData(providerId: string, dataType: string): Promise<any>;
}

export interface SharedDataNamespace {
  get<T>(key: string): Promise<T>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
}

export interface ModuleSecurityContext {
  user: User;
  permissions: string[];
  studyAccess: StudyAccess;
  dataClassification: DataClassification;
  
  // Security operations
  checkPermission(permission: string): boolean;
  checkDataAccess(dataType: string, operation: string): boolean;
  
  // Audit logging
  logSecurityEvent(event: SecurityEvent): Promise<void>;
  
  // Data protection
  encryptData(data: any): Promise<string>;
  decryptData(encryptedData: string): Promise<any>;
}

export interface DataClassification {
  level: 'public' | 'internal' | 'confidential' | 'restricted';
  categories: string[];
  retentionPolicy: string;
}

export interface SecurityEvent {
  type: string;
  moduleId: string;
  userId: string;
  resource: string;
  action: string;
  success: boolean;
  details?: any;
}

// ============================================================================
// CLINICAL DATA TYPES
// ============================================================================

export interface Endpoint {
  id: string;
  type: 'primary' | 'secondary' | 'exploratory';
  name: string;
  description: string;
  measure: string;
  timepoint: string;
}

export interface StudyPopulation {
  targetEnrollment: number;
  ageRange: {
    min: number;
    max: number;
  };
  gender: 'male' | 'female' | 'both';
  inclusionCriteria: string[];
  exclusionCriteria: string[];
}

export interface StudyDesign {
  type: string;
  phase: StudyPhase;
  randomized: boolean;
  blinded: boolean;
  controlType: string;
  arms: StudyArm[];
}

export interface StudyArm {
  id: string;
  name: string;
  description: string;
  intervention: string;
  subjects: number;
}

export interface ProtocolTimeline {
  screeningPeriod: number;
  treatmentPeriod: number;
  followUpPeriod: number;
  totalDuration: number;
  visits: Visit[];
}

export interface Visit {
  id: string;
  name: string;
  day: number;
  window: number;
  procedures: string[];
}

export interface Site {
  id: string;
  name: string;
  address: string;
  principalInvestigator: string;
  status: 'active' | 'inactive' | 'pending';
  enrollmentTarget: number;
  enrollmentActual: number;
}

export interface Personnel {
  id: string;
  name: string;
  role: string;
  organization: string;
  email: string;
  phone: string;
}

export interface Timeline {
  id: string;
  studyId: string;
  milestones: Milestone[];
  criticalPath: string[];
  estimatedDuration: number;
  actualDuration?: number;
}

export interface Milestone {
  id: string;
  name: string;
  description: string;
  plannedDate: Date;
  actualDate?: Date;
  status: 'pending' | 'in-progress' | 'completed' | 'delayed';
  dependencies: string[];
}

export interface DMP {
  id: string;
  studyId: string;
  version: string;
  status: 'draft' | 'review' | 'approved' | 'active';
  sections: DMPSection[];
  metadata: DMPMetadata;
  approvals: DMPApproval[];
}

export interface DMPSection {
  id: string;
  title: string;
  content: string;
  order: number;
  moduleId?: string;
  lastModified: Date;
}

export interface DMPMetadata {
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
  templateVersion: string;
  complianceChecks: ComplianceCheck[];
}

export interface DMPApproval {
  id: string;
  approverRole: string;
  approverId: string;
  approvedAt: Date;
  comments?: string;
  signature?: ElectronicSignature;
}

export interface ComplianceCheck {
  framework: string;
  status: 'pass' | 'fail' | 'warning';
  details: string;
  checkedAt: Date;
}

export interface RiskAssessment {
  id: string;
  studyId: string;
  overallRisk: 'low' | 'medium' | 'high';
  riskFactors: RiskFactor[];
  mitigationStrategies: MitigationStrategy[];
  createdAt: Date;
  createdBy: string;
}

export interface RiskFactor {
  id: string;
  category: string;
  description: string;
  probability: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high';
  riskLevel: 'low' | 'medium' | 'high';
  source: string;
}

export interface MitigationStrategy {
  id: string;
  riskFactorId: string;
  strategy: string;
  owner: string;
  timeline: string;
  status: 'planned' | 'in-progress' | 'completed';
}

export interface QualityPlan {
  id: string;
  studyId: string;
  procedures: QualityProcedure[];
  checkpoints: QualityCheckpoint[];
  metrics: QualityMetric[];
  createdAt: Date;
  createdBy: string;
}

export interface QualityProcedure {
  id: string;
  name: string;
  description: string;
  frequency: string;
  responsible: string;
  documentation: string[];
}

export interface QualityCheckpoint {
  id: string;
  name: string;
  milestone: string;
  criteria: string[];
  approver: string;
}

export interface QualityMetric {
  id: string;
  name: string;
  target: number;
  actual?: number;
  unit: string;
  frequency: string;
}