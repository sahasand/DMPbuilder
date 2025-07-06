import { StudyProtocol, CRFSpecification, DMP } from './index';

/**
 * Module interface for clinical research platform extensions
 */
export interface ClinicalModule {
  /** Unique module identifier */
  id: string;
  
  /** Human-readable module name */
  name: string;
  
  /** Module version */
  version: string;
  
  /** Module description */
  description: string;
  
  /** Module author/organization */
  author: string;
  
  /** Supported module types */
  type: ModuleType;
  
  /** Module configuration */
  config?: ModuleConfig;
  
  /** Module initialization */
  initialize(): Promise<void>;
  
  /** Module cleanup */
  destroy(): Promise<void>;
  
  /** Check if module is enabled */
  isEnabled(): boolean;
  
  /** Module execution method */
  execute(context: ModuleContext): Promise<ModuleResult>;
}

/**
 * Types of clinical modules
 */
export enum ModuleType {
  PROTOCOL_ANALYZER = 'protocol-analyzer',
  DATA_VALIDATOR = 'data-validator', 
  REPORT_GENERATOR = 'report-generator',
  COMPLIANCE_CHECKER = 'compliance-checker',
  RISK_ASSESSOR = 'risk-assessor',
  TIMELINE_PLANNER = 'timeline-planner',
  ENDPOINT_ANALYZER = 'endpoint-analyzer',
  SAFETY_MONITOR = 'safety-monitor',
  QUALITY_CONTROLLER = 'quality-controller',
  REGULATORY_REVIEWER = 'regulatory-reviewer'
}

/**
 * Module configuration interface
 */
export interface ModuleConfig {
  /** Is module enabled by default */
  enabled: boolean;
  
  /** Module-specific settings */
  settings: Record<string, any>;
  
  /** Dependencies on other modules */
  dependencies?: string[];
  
  /** Module execution priority (lower = higher priority) */
  priority?: number;
  
  /** Supported therapeutic areas */
  therapeuticAreas?: string[];
  
  /** Required study phases */
  studyPhases?: string[];
}

/**
 * Context provided to modules during execution
 */
export interface ModuleContext {
  /** Study protocol data */
  protocol?: StudyProtocol;
  
  /** CRF specifications */
  crfs?: CRFSpecification[];
  
  /** Current DMP being generated */
  dmp?: DMP;
  
  /** Module execution metadata */
  metadata: {
    /** Timestamp of execution */
    timestamp: Date;
    
    /** User/system initiating the module */
    initiator: string;
    
    /** Execution environment */
    environment: 'development' | 'production' | 'test';
    
    /** Additional context data */
    context?: Record<string, any>;
  };
  
  /** Module chain context (for modules that depend on others) */
  moduleChain?: ModuleResult[];
}

/**
 * Result returned by module execution
 */
export interface ModuleResult {
  /** Module that generated this result */
  moduleId: string;
  
  /** Execution status */
  status: 'success' | 'warning' | 'error';
  
  /** Result data */
  data?: any;
  
  /** Human-readable messages */
  messages: string[];
  
  /** Warnings (non-blocking issues) */
  warnings: string[];
  
  /** Errors (blocking issues) */
  errors: string[];
  
  /** Execution metrics */
  metrics: {
    /** Execution time in milliseconds */
    executionTime: number;
    
    /** Memory usage in bytes */
    memoryUsage?: number;
    
    /** Custom metrics */
    custom?: Record<string, number>;
  };
  
  /** Recommendations or suggestions */
  recommendations?: string[];
  
  /** Modification suggestions for DMP */
  dmpModifications?: DMPModification[];
}

/**
 * DMP modification suggestion from modules
 */
export interface DMPModification {
  /** Section to modify */
  section: string;
  
  /** Type of modification */
  type: 'add' | 'modify' | 'delete' | 'replace';
  
  /** Modification content */
  content: string;
  
  /** Reason for modification */
  reason: string;
  
  /** Priority level */
  priority: 'low' | 'medium' | 'high' | 'critical';
  
  /** Whether this is a required or optional modification */
  required: boolean;
}

/**
 * Module registry entry
 */
export interface ModuleRegistryEntry {
  /** Module instance */
  module: ClinicalModule;
  
  /** Registration timestamp */
  registeredAt: Date;
  
  /** Registration status */
  status: 'registered' | 'initialized' | 'active' | 'disabled' | 'error';
  
  /** Last execution time */
  lastExecuted?: Date;
  
  /** Execution statistics */
  stats: {
    /** Total executions */
    totalExecutions: number;
    
    /** Successful executions */
    successCount: number;
    
    /** Failed executions */
    errorCount: number;
    
    /** Average execution time */
    avgExecutionTime: number;
  };
}

/**
 * Module manager configuration
 */
export interface ModuleManagerConfig {
  /** Auto-discover modules in modules directory */
  autoDiscover: boolean;
  
  /** Module execution timeout in milliseconds */
  executionTimeout: number;
  
  /** Maximum concurrent module executions */
  maxConcurrentExecutions: number;
  
  /** Enable module performance monitoring */
  enablePerformanceMonitoring: boolean;
  
  /** Module directories to scan */
  moduleDirectories: string[];
}

/**
 * Module execution options
 */
export interface ModuleExecutionOptions {
  /** Specific modules to execute (if empty, executes all enabled) */
  modules?: string[];
  
  /** Execution timeout override */
  timeout?: number;
  
  /** Whether to continue on module errors */
  continueOnError: boolean;
  
  /** Whether to execute modules in parallel */
  parallel: boolean;
  
  /** Additional context to pass to modules */
  additionalContext?: Record<string, any>;
}

/**
 * Module discovery result
 */
export interface ModuleDiscoveryResult {
  /** Discovered modules */
  modules: ClinicalModule[];
  
  /** Discovery errors */
  errors: string[];
  
  /** Discovery warnings */
  warnings: string[];
  
  /** Discovery time */
  discoveryTime: number;
}