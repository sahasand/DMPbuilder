// Enhanced Protocol Analyzer Module
import { 
  ClinicalModule, 
  ModuleType, 
  ModuleContext, 
  ModuleResult, 
  ModuleConfig 
} from '../../types/module-types';
import { StudyProtocol, CRFSpecification } from '../../types';
import { protocolAnalyzerEngine } from './core/analyzer-engine';
import { ComprehensiveAnalysisResult, AnalysisOptions } from './types/comprehensive-analysis';
import { createModuleLogger, logInfo, logError } from '../../utils/logger';
import { ValidationError } from '../../utils/error-handler';

const logger = createModuleLogger('protocol-analyzer-module');

export interface ProtocolAnalyzerConfig extends ModuleConfig {
  defaultAnalysisDepth?: 'Basic' | 'Standard' | 'Comprehensive' | 'Expert';
  defaultRegion?: 'FDA' | 'EMA' | 'PMDA' | 'Global';
  enableBenchmarking?: boolean;
  maxProcessingTime?: number; // milliseconds
}

export interface ProtocolAnalyzerInput {
  protocol: StudyProtocol;
  crfs: CRFSpecification[];
  analysisOptions?: AnalysisOptions;
}

export interface ProtocolAnalyzerOutput {
  analysis: ComprehensiveAnalysisResult;
  summary: {
    overallFeasibility: number;
    riskLevel: string;
    complexity: string;
    recommendation: string;
    keyFindings: string[];
    criticalIssues: string[];
  };
  executionMetrics: {
    processingTime: number;
    analysisVersion: string;
    modulesUsed: string[];
  };
}

export class ProtocolAnalyzerModule implements ClinicalModule {
  // Module Identity
  public readonly id = 'protocol-analyzer';
  public readonly name = 'Protocol Analyzer';
  public readonly version = '1.0.0';
  public readonly description = 'Comprehensive protocol analysis for feasibility, risk assessment, and optimization';
  public readonly author = 'Clinical DMP Generator Team';
  public readonly type = ModuleType.PROTOCOL_ANALYZER;
  
  // Module configuration
  public config: ProtocolAnalyzerConfig = {
    enabled: true,
    defaultAnalysisDepth: 'Standard',
    defaultRegion: 'FDA',
    enableBenchmarking: false,
    maxProcessingTime: 300000 // 5 minutes
  };

  constructor(config?: Partial<ProtocolAnalyzerConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
  }

  /**
   * Module initialization
   */
  async initialize(): Promise<void> {
    logInfo('Initializing Protocol Analyzer module', {
      module: this.id,
      version: this.version,
      enabled: this.isEnabled()
    });

    logInfo('Protocol Analyzer module initialized successfully', {
      module: this.id
    });
  }

  /**
   * Module cleanup
   */
  async destroy(): Promise<void> {
    logInfo('Destroying Protocol Analyzer module', {
      module: this.id
    });

    logInfo('Protocol Analyzer module destroyed', {
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
   * Main module execution for protocol analysis
   */
  async execute(context: ModuleContext): Promise<ModuleResult> {
    const startTime = Date.now();

    try {
      logInfo('Starting enhanced protocol analysis', {
        moduleId: this.id,
        sessionId: context.session?.id,
        inputKeys: Object.keys(context.input)
      });

      // Validate and extract inputs
      const { protocol, crfs, analysisOptions } = this.validateAndExtractInputs(context);

      // Set up analysis options with module configuration
      const effectiveOptions: AnalysisOptions = {
        analysisDepth: this.config.defaultAnalysisDepth,
        regulatoryRegion: this.config.defaultRegion,
        includeBenchmarking: this.config.enableBenchmarking,
        ...analysisOptions
      };

      // Check processing time limit
      const processingTimeLimit = this.config.maxProcessingTime || 300000;
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Analysis timeout exceeded')), processingTimeLimit);
      });

      // Execute comprehensive analysis with timeout
      const analysisPromise = protocolAnalyzerEngine.analyzeProtocol(protocol, crfs, effectiveOptions);
      const analysis = await Promise.race([analysisPromise, timeoutPromise]) as ComprehensiveAnalysisResult;

      // Generate summary for quick consumption
      const summary = this.generateSummary(analysis);

      // Prepare execution metrics
      const processingTime = Date.now() - startTime;
      const executionMetrics = {
        processingTime,
        analysisVersion: analysis.analysisVersion,
        modulesUsed: ['design-analyzer', 'endpoint-analyzer'] // Will be expanded as more analyzers are added
      };

      const output: ProtocolAnalyzerOutput = {
        analysis,
        summary,
        executionMetrics
      };

      logInfo('Protocol analysis completed successfully', {
        moduleId: this.id,
        analysisId: analysis.analysisId,
        processingTime,
        feasibilityScore: summary.overallFeasibility,
        riskLevel: summary.riskLevel
      });

      return {
        moduleId: this.id,
        status: 'success',
        data: output,
        messages: [`Protocol analysis completed successfully in ${processingTime}ms`],
        warnings: [],
        errors: [],
        metrics: {
          executionTime: processingTime,
          custom: {
            feasibilityScore: summary.overallFeasibility,
            analysisDepth: effectiveOptions.analysisDepth === 'Expert' ? 4 : 
                          effectiveOptions.analysisDepth === 'Comprehensive' ? 3 :
                          effectiveOptions.analysisDepth === 'Standard' ? 2 : 1
          }
        },
        recommendations: summary.keyFindings
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      logError('Protocol analysis failed', error, {
        moduleId: this.id,
        processingTime,
        sessionId: context.session?.id
      });

      return {
        moduleId: this.id,
        status: 'error',
        data: null,
        messages: [],
        warnings: [],
        errors: [error instanceof Error ? error.message : 'Unknown analysis error'],
        metrics: {
          executionTime: processingTime,
          custom: {
            errorType: error instanceof ValidationError ? 1 : 0
          }
        }
      };
    }
  }

  /**
   * Validate and extract inputs from module context
   */
  private validateAndExtractInputs(context: ModuleContext): ProtocolAnalyzerInput {
    const { input } = context;

    if (!input || typeof input !== 'object') {
      throw new ValidationError('Module input is required');
    }

    const protocol = input.protocol as StudyProtocol;
    if (!protocol) {
      throw new ValidationError('Protocol is required for analysis');
    }

    if (!protocol.studyTitle && !protocol.protocolNumber) {
      throw new ValidationError('Protocol must have either a study title or protocol number');
    }

    const crfs = input.crfs as CRFSpecification[];
    if (!Array.isArray(crfs)) {
      throw new ValidationError('CRFs must be provided as an array');
    }

    const analysisOptions = input.analysisOptions as AnalysisOptions;

    return { protocol, crfs, analysisOptions };
  }

  /**
   * Generate executive summary for quick consumption
   */
  private generateSummary(analysis: ComprehensiveAnalysisResult): ProtocolAnalyzerOutput['summary'] {
    return {
      overallFeasibility: analysis.executiveSummary.overallAssessment.feasibilityScore,
      riskLevel: analysis.executiveSummary.overallAssessment.riskLevel,
      complexity: analysis.executiveSummary.overallAssessment.complexity,
      recommendation: analysis.executiveSummary.overallAssessment.recommendation,
      keyFindings: analysis.executiveSummary.keyFindings.map(f => f.finding),
      criticalIssues: analysis.executiveSummary.criticalIssues.map(i => i.issue)
    };
  }

  /**
   * Check if module can execute with given input
   */
  canExecute(context: ModuleContext): boolean {
    try {
      this.validateAndExtractInputs(context);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get module capabilities and configuration options
   */
  getCapabilities(): object {
    return {
      analysisTypes: [
        'Study Design Analysis',
        'Endpoint Assessment',
        'Population Analysis',
        'Statistical Analysis',
        'Timeline Analysis',
        'Risk Assessment',
        'Optimization Recommendations'
      ],
      supportedDepths: ['Basic', 'Standard', 'Comprehensive', 'Expert'],
      supportedRegions: ['FDA', 'EMA', 'PMDA', 'Global'],
      features: {
        benchmarking: this.config.enableBenchmarking,
        executiveSummary: true,
        riskAssessment: true,
        optimizationRecommendations: true,
        comparativeAnalysis: true
      },
      performance: {
        maxProcessingTime: this.config.maxProcessingTime,
        parallelAnalysis: true,
        memoryOptimized: true
      }
    };
  }

  /**
   * Get analysis status for monitoring
   */
  async getAnalysisStatus(analysisId: string): Promise<object | null> {
    // This would integrate with a tracking system if implemented
    // For now, return basic status
    return {
      analysisId,
      status: 'completed', // Would be dynamic in real implementation
      moduleVersion: this.version,
      timestamp: new Date()
    };
  }

  /**
   * Validate analysis options
   */
  validateOptions(options: AnalysisOptions): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (options.analysisDepth && 
        !['Basic', 'Standard', 'Comprehensive', 'Expert'].includes(options.analysisDepth)) {
      errors.push('Invalid analysis depth specified');
    }

    if (options.regulatoryRegion && 
        !['FDA', 'EMA', 'PMDA', 'Global'].includes(options.regulatoryRegion)) {
      errors.push('Invalid regulatory region specified');
    }

    if (options.industry && 
        !['Pharmaceutical', 'Biotechnology', 'Medical Device', 'Academic'].includes(options.industry)) {
      errors.push('Invalid industry type specified');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get configuration schema for UI
   */
  getConfigSchema(): object {
    return {
      type: 'object',
      properties: {
        defaultAnalysisDepth: {
          type: 'string',
          enum: ['Basic', 'Standard', 'Comprehensive', 'Expert'],
          default: 'Standard',
          description: 'Default depth of analysis to perform'
        },
        defaultRegion: {
          type: 'string',
          enum: ['FDA', 'EMA', 'PMDA', 'Global'],
          default: 'FDA',
          description: 'Default regulatory region for guidance alignment'
        },
        enableBenchmarking: {
          type: 'boolean',
          default: false,
          description: 'Enable industry benchmarking analysis'
        },
        maxProcessingTime: {
          type: 'number',
          default: 300000,
          minimum: 60000,
          maximum: 600000,
          description: 'Maximum processing time in milliseconds'
        }
      }
    };
  }
}

// Export the module class and create default instance
export const protocolAnalyzerModule = new ProtocolAnalyzerModule();