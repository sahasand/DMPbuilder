// CRF Validator Module Implementation
import { 
  ClinicalModule, 
  ModuleType, 
  ModuleContext, 
  ModuleResult, 
  ModuleConfig 
} from '../../types/module-types';
import { createModuleLogger, logInfo, logError } from '../../utils/logger';
import { crfValidatorEngine } from './core/crf-validator-engine';
import { ValidationOptions } from './types/crf-validation-types';
import { StudyProtocol, CRFSpecification } from '../../types';

const logger = createModuleLogger('crf-validator-module');

export interface CRFValidatorConfig extends ModuleConfig {
  validationDepth?: 'Basic' | 'Standard' | 'Comprehensive' | 'Expert';
  regulatoryRegion?: 'FDA' | 'EMA' | 'PMDA' | 'Global';
  industry?: 'Pharmaceutical' | 'Biotechnology' | 'Medical Device' | 'Academic';
  enableCDISCCompliance?: boolean;
  maxProcessingTime?: number; // milliseconds
}

export class CRFValidatorModule implements ClinicalModule {
  // Module Identity
  public readonly id = 'crf-validator';
  public readonly name = 'CRF Validator';
  public readonly version = '1.0.0';
  public readonly description = 'Validates CRFs for completeness, quality, and protocol alignment with improvement recommendations';
  public readonly author = 'Clinical DMP Generator Team';
  public readonly type = ModuleType.DATA_VALIDATOR;
  
  // Module configuration
  public config: CRFValidatorConfig = {
    enabled: true,
    validationDepth: 'Standard',
    regulatoryRegion: 'FDA',
    industry: 'Pharmaceutical',
    enableCDISCCompliance: true,
    maxProcessingTime: 300000 // 5 minutes
  };

  constructor(config?: Partial<CRFValidatorConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
  }

  /**
   * Module initialization
   */
  async initialize(): Promise<void> {
    logInfo('Initializing CRF Validator module', {
      module: this.id,
      version: this.version,
      enabled: this.isEnabled()
    });

    // Perform any module-specific initialization
    await this.setupValidationComponents();

    logInfo('CRF Validator module initialized successfully', {
      module: this.id
    });
  }

  /**
   * Module cleanup
   */
  async destroy(): Promise<void> {
    logInfo('Destroying CRF Validator module', {
      module: this.id
    });

    // Perform any necessary cleanup
    logInfo('CRF Validator module destroyed', {
      module: this.id
    });
  }

  /**
   * Check if module is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled === true;
  }

  /**
   * Execute CRF validation
   */
  async execute(context: ModuleContext): Promise<ModuleResult> {
    const startTime = Date.now();

    try {
      // Extract inputs from context
      const { protocol, crfs, options } = this.extractInputs(context);

      // Validate inputs
      this.validateInputs(protocol, crfs);

      // Execute CRF validation
      const validationResult = await crfValidatorEngine.validateCRF(
        protocol,
        crfs,
        options
      );

      // Return execution result
      const executionTime = Date.now() - startTime;
      return {
        moduleId: this.id,
        status: 'success',
        data: validationResult,
        messages: [`CRF validation completed successfully in ${executionTime}ms`],
        warnings: validationResult.validationFindings
          .filter(f => f.severity === 'Minor')
          .map(f => f.finding),
        errors: validationResult.criticalIssues.map(ci => ci.issue),
        metrics: {
          executionTime,
          custom: {
            overallScore: validationResult.overallScore,
            criticalIssuesCount: validationResult.criticalIssues.length,
            recommendationsCount: validationResult.recommendations.length
          }
        },
        recommendations: validationResult.recommendations.slice(0, 5).map(r => r.recommendation)
      };
    } catch (error) {
      logError('CRF validation execution failed', error);
      
      const executionTime = Date.now() - startTime;
      return {
        moduleId: this.id,
        status: 'error',
        data: null,
        messages: [],
        warnings: [],
        errors: [error instanceof Error ? error.message : 'Unknown error occurred'],
        metrics: {
          executionTime
        }
      };
    }
  }

  /**
   * Setup validation components
   */
  private async setupValidationComponents(): Promise<void> {
    // Initialize any validation components if needed
    // This could include loading validation rules, templates, etc.
  }

  /**
   * Extract inputs from execution context
   */
  private extractInputs(context: ModuleContext): {
    protocol: StudyProtocol;
    crfs: CRFSpecification[];
    options: ValidationOptions;
  } {
    const { input } = context;

    // Extract protocol
    const protocol = input.protocol as StudyProtocol;
    if (!protocol) {
      throw new Error('Protocol is required for CRF validation');
    }

    // Extract CRFs
    const crfs = input.crfs as CRFSpecification[];
    if (!crfs || !Array.isArray(crfs)) {
      throw new Error('CRFs must be provided as an array');
    }

    // Extract validation options
    const options: ValidationOptions = {
      validationDepth: input.validationDepth || this.config.validationDepth || 'Standard',
      regulatoryRegion: input.regulatoryRegion || this.config.regulatoryRegion || 'FDA',
      industry: input.industry || this.config.industry || 'Pharmaceutical',
      includeComplianceCheck: input.includeComplianceCheck !== false,
      includeEfficiencyAnalysis: input.includeEfficiencyAnalysis !== false,
      includeProtocolAlignment: input.includeProtocolAlignment !== false,
      generateRecommendations: input.generateRecommendations !== false,
      customParameters: input.customParameters || {}
    };

    return { protocol, crfs, options };
  }

  /**
   * Validate inputs
   */
  private validateInputs(protocol: StudyProtocol, crfs: CRFSpecification[]): void {
    if (!protocol.studyTitle && !protocol.protocolNumber) {
      throw new Error('Protocol must have either a study title or protocol number');
    }

    if (crfs.length === 0) {
      logInfo('Warning: No CRFs provided for validation', { module: this.id });
    }
  }

  /**
   * Get module status
   */
  getStatus(): string {
    return this.isEnabled() ? 'active' : 'inactive';
  }
}