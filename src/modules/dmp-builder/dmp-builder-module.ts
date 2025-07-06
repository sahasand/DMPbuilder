// DMP Builder Module - Platform Module Implementation
// Transforms the existing DMP Generator into a platform module

import { 
  PlatformModule, 
  ModulePlatformContext, 
  ModulePermissions,
  PlatformDependencies,
  UserSession,
  StudyContext,
  WorkflowRegistry,
  DataModelRegistry,
  EventRegistry
} from '../../platform/types/platform-types';

import { 
  ModuleType, 
  ModuleResult, 
  DMPModification 
} from '../../types/module-types';

import { DMPGenerator, DMPGenerationOptions } from '../../generators/dmp-generator';
import { StudyProtocol, CRFSpecification, DMP } from '../../types';

export class DMPBuilderModule implements PlatformModule {
  // Module Identity
  public readonly id = 'dmp-builder';
  public readonly name = 'Data Management Plan Builder';
  public readonly version = '1.0.0';
  public readonly description = 'Generates comprehensive data management plans for clinical studies with AI-enhanced content and regulatory compliance';
  public readonly author = 'Clinical DMP Generator Team';
  public readonly type = ModuleType.REPORT_GENERATOR; // DMP is a type of report
  public readonly platformVersion = '1.0.0';

  // Platform-specific properties
  public readonly permissions: ModulePermissions = {
    required: ['study.read', 'dmp.create', 'dmp.read', 'dmp.write'],
    optional: ['dmp.admin', 'study.write']
  };

  public readonly dependencies: PlatformDependencies = {
    services: ['data', 'user', 'document', 'audit'],
    modules: [],
    minimumPlatformVersion: '1.0.0'
  };

  // Module configuration
  public config = {
    enabled: true,
    priority: 1,
    therapeuticAreas: ['all'],
    studyPhases: ['Phase 1', 'Phase 2', 'Phase 3', 'Phase 4', 'Observational'],
    settings: {
      useAIGeneration: true,
      includeRiskAssessment: true,
      includeTimeline: true,
      enableComplexityAnalysis: true,
      aiContentOptions: {
        enhanceExistingContent: true,
        generateMissingContent: true,
        validateMedicalTerminology: true,
        includeRegulatorySections: true
      },
      exportFormats: ['pdf', 'word', 'markdown'],
      complianceStandards: ['ICH-GCP', '21CFR11', 'GDPR']
    }
  };

  // Internal state
  private dmpGenerator: DMPGenerator;
  private initialized = false;

  constructor() {
    this.dmpGenerator = new DMPGenerator();
  }

  // ============================================================================
  // PLATFORM MODULE LIFECYCLE
  // ============================================================================

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Initialize the underlying DMP generator
      await this.dmpGenerator.initialize?.();
      
      this.initialized = true;
      console.log('[dmp-builder-module] DMP Builder module initialized');

    } catch (error) {
      console.error('[dmp-builder-module] Failed to initialize DMP Builder module', error);
      throw error;
    }
  }

  async destroy(): Promise<void> {
    if (!this.initialized) {
      return;
    }

    try {
      // Clean up resources
      await this.dmpGenerator.destroy?.();
      
      this.initialized = false;
      console.log('[dmp-builder-module] DMP Builder module destroyed');

    } catch (error) {
      console.error('[dmp-builder-module] Error destroying DMP Builder module', error);
      throw error;
    }
  }

  isEnabled(): boolean {
    return this.config.enabled && this.initialized;
  }

  // ============================================================================
  // PLATFORM LIFECYCLE HOOKS
  // ============================================================================

  async onPlatformStart(): Promise<void> {
    console.log('[dmp-builder-module] Platform start hook executed');
    // Perform any platform-specific initialization
  }

  async onPlatformStop(): Promise<void> {
    console.log('[dmp-builder-module] Platform stop hook executed');
    // Perform any platform-specific cleanup
  }

  async onUserLogin(session: UserSession): Promise<void> {
    console.log('[dmp-builder-module] User login hook executed', { userId: session.user.id });
    // Handle user login events if needed
  }

  async onStudyLoad(study: StudyContext): Promise<void> {
    console.log('[dmp-builder-module] Study load hook executed', { studyId: study.id });
    // Handle study load events if needed
  }

  // ============================================================================
  // PLATFORM INTEGRATION
  // ============================================================================

  registerWorkflows(registry: WorkflowRegistry): void {
    // Register DMP Builder specific workflows (not the main dmp-generation workflow)
    // The main dmp-generation workflow is registered by the platform engine
    
    registry.register('dmp-builder-only', {
      id: 'dmp-builder-only',
      name: 'DMP Builder Only Workflow',
      description: 'Direct DMP generation without protocol analysis',
      version: '1.0.0',
      steps: [
        {
          id: 'dmp-generation-direct',
          name: 'Generate DMP Directly',
          type: 'module',
          moduleId: this.id,
          inputs: [
            { name: 'protocol', type: 'StudyProtocol', required: true, source: 'context', sourceKey: 'protocol' },
            { name: 'crfs', type: 'CRFSpecification[]', required: false, source: 'context', sourceKey: 'crfs' },
            { name: 'options', type: 'DMPGenerationOptions', required: false, source: 'context', sourceKey: 'options' }
          ],
          outputs: [
            { name: 'dmp', type: 'DMP', target: 'context', targetKey: 'dmp' }
          ],
          permissions: this.permissions.required
        }
      ],
      triggers: [
        { type: 'manual' },
        { type: 'event', event: 'dmp-direct-generation-requested' }
      ]
    });

    console.log('[dmp-builder-module] Workflows registered');
  }

  registerDataModels(registry: DataModelRegistry): void {
    // Register DMP-related data models
    registry.register('DMP', {
      type: 'object',
      properties: {
        studyInfo: { type: 'object' },
        version: { type: 'string' },
        effectiveDate: { type: 'string', format: 'date' },
        sections: { type: 'array' },
        approvals: { type: 'array' },
        abbreviations: { type: 'array' }
      },
      required: ['studyInfo', 'version', 'sections']
    });

    registry.register('DMPSection', {
      type: 'object',
      properties: {
        title: { type: 'string' },
        content: { type: 'string' },
        order: { type: 'number' },
        generated: { type: 'boolean' }
      },
      required: ['title', 'content', 'order']
    });

    console.log('[dmp-builder-module] Data models registered');
  }

  registerEventHandlers(registry: EventRegistry): void {
    // Register event handlers
    registry.register('protocol-uploaded', async (event) => {
      console.log('[dmp-builder-module] Protocol uploaded event received', { 
        studyId: event.studyId 
      });
      // Could trigger automatic DMP generation
    });

    registry.register('study-status-changed', async (event) => {
      console.log('[dmp-builder-module] Study status changed event received', { 
        studyId: event.studyId,
        newStatus: event.data.status 
      });
      // Could trigger DMP updates based on study status
    });

    console.log('[dmp-builder-module] Event handlers registered');
  }

  // ============================================================================
  // MODULE EXECUTION
  // ============================================================================

  async execute(context: ModulePlatformContext): Promise<ModuleResult> {
    const startTime = Date.now();

    try {
      // Validate module is enabled and initialized
      if (!this.isEnabled()) {
        throw new Error('DMP Builder module is not enabled or not initialized');
      }

      // Check permissions
      await this.validatePermissions(context);

      // Extract input data
      const { protocol, crfs, options } = this.extractInputs(context);

      // Log execution start
      console.log('[dmp-builder-module] Starting DMP generation', {
        studyId: context.study?.id,
        userId: context.session?.user?.id,
        protocolTitle: protocol?.studyTitle,
        crfCount: crfs?.length || 0
      });

      // Generate DMP using existing generator
      const dmp = await this.generateDMP(protocol, crfs, options, context);

      // Store DMP in platform data service
      if (context.services?.data && context.study?.id) {
        await this.storeDMP(dmp, context);
      }

      // Create audit record
      await this.createAuditRecord(dmp, context);

      // Calculate execution metrics
      const executionTime = Date.now() - startTime;

      const result: ModuleResult = {
        moduleId: this.id,
        status: 'success',
        data: dmp,
        messages: [
          'DMP generated successfully',
          `Generated ${dmp.sections.length} sections`,
          `Used ${dmp.moduleAnalysis ? 'enhanced' : 'standard'} generation mode`
        ],
        warnings: [],
        errors: [],
        metrics: {
          executionTime,
          custom: {
            sectionCount: dmp.sections.length,
            aiGenerated: options?.useAIGeneration ? 1 : 0,
            modulesUsed: dmp.moduleAnalysis ? 1 : 0
          }
        },
        recommendations: this.generateRecommendations(dmp, context),
        dmpModifications: [] // DMP Builder is the primary generator, no modifications needed
      };

      console.log('[dmp-builder-module] DMP generation completed successfully', {
        executionTime,
        sectionCount: dmp.sections.length
      });

      return result;

    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      console.error('[dmp-builder-module] DMP generation failed', error);

      return {
        moduleId: this.id,
        status: 'error',
        data: null,
        messages: [],
        warnings: [],
        errors: [error.message],
        metrics: {
          executionTime,
          custom: {
            errorType: error.constructor.name
          }
        }
      };
    }
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private async validatePermissions(context: ModulePlatformContext): Promise<void> {
    if (!context.services?.user) {
      throw new Error('User service not available');
    }

    // Check required permissions
    for (const permission of this.permissions.required) {
      const hasPermission = await context.services.user.hasPermission(permission);
      if (!hasPermission) {
        throw new Error(`Missing required permission: ${permission}`);
      }
    }
  }

  private extractInputs(context: ModulePlatformContext): {
    protocol: StudyProtocol;
    crfs: CRFSpecification[];
    options: DMPGenerationOptions;
  } {
    const protocol = context.protocol;
    if (!protocol) {
      throw new Error('Protocol is required for DMP generation');
    }

    const crfs = context.crfs || [];
    
    // Build generation options from context and module configuration
    const options: DMPGenerationOptions = {
      useAIGeneration: this.config.settings.useAIGeneration,
      includeRiskAssessment: this.config.settings.includeRiskAssessment,
      includeTimeline: this.config.settings.includeTimeline,
      aiOptions: this.config.settings.aiContentOptions,
      useModules: false, // Prevent recursive module execution
      ...context.options // Allow context to override defaults
    };

    return { protocol, crfs, options };
  }

  private async generateDMP(
    protocol: StudyProtocol,
    crfs: CRFSpecification[],
    options: DMPGenerationOptions,
    context: ModulePlatformContext
  ): Promise<DMP> {
    // Use the existing DMP generator
    return await this.dmpGenerator.generateDMP(protocol, crfs, options);
  }

  private async storeDMP(dmp: DMP, context: ModulePlatformContext): Promise<void> {
    if (!context.services?.data || !context.study?.id) {
      return;
    }

    try {
      const dmpRecord = {
        id: `dmp-${context.study.id}-${Date.now()}`,
        studyId: context.study.id,
        version: dmp.version,
        status: 'draft',
        content: dmp,
        createdAt: new Date(),
        createdBy: context.session?.user?.id || 'system',
        updatedAt: new Date(),
        updatedBy: context.session?.user?.id || 'system'
      };

      await context.services.data.save('DMP', dmpRecord);
      console.log('[dmp-builder-module] DMP stored in data service', { 
        dmpId: dmpRecord.id,
        studyId: context.study.id 
      });

    } catch (error) {
      console.warn('[dmp-builder-module] Failed to store DMP in data service', error);
      // Don't fail the whole operation if storage fails
    }
  }

  private async createAuditRecord(dmp: DMP, context: ModulePlatformContext): Promise<void> {
    if (!context.services?.audit) {
      return;
    }

    try {
      await context.services.audit.log({
        entityType: 'DMP',
        entityId: context.study?.id || 'unknown',
        action: 'generated',
        userId: context.session?.user?.id || 'system',
        changes: {
          version: dmp.version,
          sectionCount: dmp.sections.length,
          generatedAt: dmp.effectiveDate
        },
        metadata: {
          moduleId: this.id,
          studyTitle: dmp.studyInfo.studyTitle,
          protocolNumber: dmp.studyInfo.protocolNumber
        }
      });

    } catch (error) {
      console.warn('[dmp-builder-module] Failed to create audit record', error);
      // Don't fail the whole operation if audit logging fails
    }
  }

  private generateRecommendations(dmp: DMP, context: ModulePlatformContext): string[] {
    const recommendations: string[] = [];

    // Check for completeness
    if (dmp.sections.length < 8) {
      recommendations.push('Consider adding more comprehensive sections to the DMP');
    }

    // Check for AI enhancement
    if (!this.config.settings.useAIGeneration) {
      recommendations.push('Enable AI content generation for enhanced DMP quality');
    }

    // Check for risk assessment
    if (!this.config.settings.includeRiskAssessment) {
      recommendations.push('Include risk assessment analysis for better study planning');
    }

    // Check for approvals
    if (!dmp.approvals || dmp.approvals.length === 0) {
      recommendations.push('Define approval workflow for DMP finalization');
    }

    // Study-specific recommendations
    if (context.study?.phase === 'Phase 3' && dmp.sections.length < 10) {
      recommendations.push('Phase 3 studies typically require more detailed DMPs');
    }

    return recommendations;
  }
}