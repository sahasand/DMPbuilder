// Clinical Research Management Platform Engine
// Central orchestrator for all platform services and modules

import { 
  PlatformConfig, 
  PlatformServices, 
  PlatformModule,
  ModulePlatformContext,
  WorkflowEngineService,
  WorkflowDefinition,
  WorkflowInstance,
  WorkflowParameters,
  WorkflowResult,
  StudyContext,
  UserSession
} from '../types/platform-types';

import { ModuleManager } from '../../modules/module-manager';
import { ModuleResult } from '../../types/module-types';
import { WorkflowEngine } from '../workflows/workflow-engine';
import { ServiceRegistry } from '../services/service-registry';
import { createPlatformLogger } from '../../utils/logger';

const logger = createPlatformLogger('platform-engine');

export class PlatformEngine {
  private config: PlatformConfig;
  private services: PlatformServices;
  private moduleManager: ModuleManager;
  private workflowEngine: WorkflowEngine;
  private serviceRegistry: ServiceRegistry;
  private initialized = false;

  constructor(config: PlatformConfig) {
    this.config = config;
    this.serviceRegistry = new ServiceRegistry(config.services);
    this.moduleManager = new ModuleManager(config.modules);
    this.workflowEngine = new WorkflowEngine(config.workflows);
    // Don't get services until initialized
    this.services = {} as PlatformServices;
  }

  // ============================================================================
  // PLATFORM LIFECYCLE
  // ============================================================================

  async initialize(): Promise<void> {
    if (this.initialized) {
      logger.warn('Platform engine already initialized');
      return;
    }

    logger.info('Initializing Clinical Research Management Platform...');

    try {
      // Initialize core services first
      await this.initializeServices();
      
      // Initialize workflow engine
      await this.initializeWorkflowEngine();
      
      // Initialize module system
      await this.initializeModuleSystem();
      
      // Register platform workflows
      await this.registerPlatformWorkflows();
      
      // Start platform modules
      await this.startPlatformModules();

      this.initialized = true;
      logger.info('Platform engine initialized successfully', {
        modules: this.moduleManager.getActiveModules().length,
        workflows: this.workflowEngine.getRegisteredWorkflows().length,
        services: Object.keys(this.services).length
      });

    } catch (error) {
      logger.error('Failed to initialize platform engine', error);
      throw error;
    }
  }

  async shutdown(): Promise<void> {
    if (!this.initialized) {
      logger.warn('Platform engine not initialized');
      return;
    }

    logger.info('Shutting down platform engine...');

    try {
      // Stop platform modules
      await this.stopPlatformModules();
      
      // Shutdown workflow engine
      await this.workflowEngine.shutdown();
      
      // Shutdown module system
      await this.moduleManager.destroy();
      
      // Shutdown services
      await this.serviceRegistry.shutdown();

      this.initialized = false;
      logger.info('Platform engine shutdown complete');

    } catch (error) {
      logger.error('Error during platform shutdown', error);
      throw error;
    }
  }

  // ============================================================================
  // MODULE ORCHESTRATION
  // ============================================================================

  async executeModule(
    moduleId: string, 
    context: Partial<ModulePlatformContext>
  ): Promise<ModuleResult> {
    this.ensureInitialized();

    const module = this.moduleManager.getModule(moduleId);
    if (!module) {
      throw new Error(`Module not found: ${moduleId}`);
    }

    // Create full platform context
    const platformContext: ModulePlatformContext = {
      ...context,
      services: this.services,
      metadata: {
        timestamp: new Date(),
        initiator: context.session?.user?.id || 'system',
        environment: this.config.environment
      }
    } as ModulePlatformContext;

    logger.info('Executing module', { 
      moduleId, 
      userId: platformContext.session?.user?.id,
      studyId: platformContext.study?.id 
    });

    try {
      const result = await module.execute(platformContext);
      
      // Log module execution
      await this.services.audit.log({
        entityType: 'module',
        entityId: moduleId,
        action: 'execute',
        userId: platformContext.session?.user?.id || 'system',
        changes: { 
          status: result.status,
          executionTime: result.metrics?.executionTime 
        }
      });

      logger.info('Module execution completed', {
        moduleId,
        status: result.status,
        executionTime: result.metrics?.executionTime
      });

      return result;

    } catch (error) {
      logger.error('Module execution failed', error, { moduleId });
      
      await this.services.audit.log({
        entityType: 'module',
        entityId: moduleId,
        action: 'execute_failed',
        userId: platformContext.session?.user?.id || 'system',
        changes: { error: error.message }
      });

      throw error;
    }
  }

  async executeModuleChain(
    moduleIds: string[],
    context: Partial<ModulePlatformContext>,
    options: {
      parallel?: boolean;
      continueOnError?: boolean;
      shareData?: boolean;
    } = {}
  ): Promise<ModuleResult[]> {
    this.ensureInitialized();

    const { parallel = false, continueOnError = true, shareData = true } = options;

    logger.info('Executing module chain', { 
      moduleIds, 
      parallel, 
      continueOnError,
      userId: context.session?.user?.id 
    });

    const results: ModuleResult[] = [];
    const sharedContext = { ...context };

    if (parallel) {
      // Execute modules in parallel
      const promises = moduleIds.map(moduleId => 
        this.executeModule(moduleId, sharedContext).catch(error => {
          if (continueOnError) {
            return {
              moduleId,
              status: 'error' as const,
              data: null,
              messages: [],
              warnings: [],
              errors: [error.message],
              metrics: { executionTime: 0 }
            };
          }
          throw error;
        })
      );

      const parallelResults = await Promise.all(promises);
      results.push(...parallelResults);

    } else {
      // Execute modules sequentially
      for (const moduleId of moduleIds) {
        try {
          if (shareData && results.length > 0) {
            // Add previous results to context for module chain
            sharedContext.moduleChain = results;
          }

          const result = await this.executeModule(moduleId, sharedContext);
          results.push(result);

        } catch (error) {
          if (continueOnError) {
            results.push({
              moduleId,
              status: 'error',
              data: null,
              messages: [],
              warnings: [],
              errors: [error.message],
              metrics: { executionTime: 0 }
            });
          } else {
            throw error;
          }
        }
      }
    }

    logger.info('Module chain execution completed', {
      totalModules: moduleIds.length,
      successCount: results.filter(r => r.status === 'success').length,
      errorCount: results.filter(r => r.status === 'error').length
    });

    return results;
  }

  // ============================================================================
  // WORKFLOW ORCHESTRATION
  // ============================================================================

  async executeWorkflow(
    workflowId: string,
    parameters: WorkflowParameters,
    context: {
      userId: string;
      studyId?: string;
      session?: UserSession;
    }
  ): Promise<WorkflowResult> {
    this.ensureInitialized();

    logger.info('Starting workflow execution', { 
      workflowId, 
      userId: context.userId,
      studyId: context.studyId 
    });

    try {
      // Create workflow execution context
      const workflowContext = {
        studyId: context.studyId,
        userId: context.userId,
        environment: this.config.environment,
        data: parameters,
        stepOutputs: {}
      };

      // Execute workflow through workflow engine
      const result = await this.workflowEngine.executeWorkflow(workflowId, workflowContext);

      // Log workflow execution
      await this.services.audit.log({
        entityType: 'workflow',
        entityId: workflowId,
        action: 'execute',
        userId: context.userId,
        changes: {
          instanceId: result.instanceId,
          status: result.status,
          duration: result.duration
        }
      });

      logger.info('Workflow execution completed', {
        workflowId,
        instanceId: result.instanceId,
        status: result.status,
        duration: result.duration
      });

      return result;

    } catch (error) {
      logger.error('Workflow execution failed', error, { workflowId });
      throw error;
    }
  }

  async getWorkflowStatus(instanceId: string): Promise<WorkflowInstance> {
    this.ensureInitialized();
    return await this.workflowEngine.getWorkflowStatus(instanceId);
  }

  async getActiveWorkflows(studyId?: string): Promise<WorkflowInstance[]> {
    this.ensureInitialized();
    return await this.workflowEngine.getActiveWorkflows(studyId);
  }

  // ============================================================================
  // DMP GENERATION (Legacy Compatibility)
  // ============================================================================

  async generateDMP(
    protocolData: any,
    crfData: any,
    options: {
      useModules?: boolean;
      moduleIds?: string[];
      userId: string;
      studyId?: string;
      session?: UserSession;
    }
  ): Promise<any> {
    this.ensureInitialized();

    const { 
      useModules = true, 
      moduleIds = [], 
      userId, 
      studyId,
      session 
    } = options;

    logger.info('Generating DMP through platform', {
      useModules,
      moduleIds: moduleIds.length > 0 ? moduleIds : 'all',
      userId,
      studyId
    });

    try {
      // Create platform context
      const context: Partial<ModulePlatformContext> = {
        protocol: protocolData,
        crfs: crfData,
        session,
        study: studyId ? { 
          id: studyId,
          protocolNumber: protocolData?.protocolNumber || 'Unknown',
          title: protocolData?.studyTitle || 'Unknown Study',
          phase: protocolData?.phase || 'Phase 1',
          therapeuticArea: protocolData?.indication || 'Unknown',
          status: 'planning',
          permissions: { read: true, write: true, admin: false, modules: [] }
        } : undefined
      };

      if (useModules) {
        // Use workflow for DMP generation with modules
        const workflowParameters = {
          protocol: protocolData,
          crfs: crfData,
          moduleIds: moduleIds.length > 0 ? moduleIds : undefined
        };

        const workflowResult = await this.executeWorkflow(
          'dmp-generation',
          workflowParameters,
          { userId, studyId, session }
        );

        if (!workflowResult.outputs.dmp) {
          logger.error('Workflow completed but DMP output is missing', {
            outputs: workflowResult.outputs,
            errors: workflowResult.errors,
            workflowStatus: workflowResult.status
          });
          throw new Error('DMP generation workflow completed but DMP output is missing');
        }

        return workflowResult.outputs.dmp;

      } else {
        // Direct DMP generation without modules
        const dmpResult = await this.executeModule('dmp-builder', context);
        return dmpResult.data;
      }

    } catch (error) {
      logger.error('DMP generation failed', error);
      throw error;
    }
  }

  // ============================================================================
  // PLATFORM INFORMATION
  // ============================================================================

  getRegisteredModules(): PlatformModule[] {
    this.ensureInitialized();
    return this.moduleManager.getAllModules() as PlatformModule[];
  }

  getActiveModules(): PlatformModule[] {
    this.ensureInitialized();
    return this.moduleManager.getActiveModules() as PlatformModule[];
  }

  getRegisteredWorkflows(): WorkflowDefinition[] {
    this.ensureInitialized();
    return this.workflowEngine.getRegisteredWorkflows();
  }

  getPlatformServices(): PlatformServices {
    this.ensureInitialized();
    return this.services;
  }

  getPlatformConfig(): PlatformConfig {
    return this.config;
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private async initializeServices(): Promise<void> {
    logger.info('Initializing platform services...');
    await this.serviceRegistry.initialize();
    this.services = this.serviceRegistry.getServices();
    logger.info('Platform services initialized');
  }

  private async initializeWorkflowEngine(): Promise<void> {
    logger.info('Initializing workflow engine...');
    await this.workflowEngine.initialize(this.services, this.moduleManager);
    logger.info('Workflow engine initialized');
  }

  private async initializeModuleSystem(): Promise<void> {
    logger.info('Initializing module system...');
    await this.moduleManager.initialize();
    
    const modules = this.moduleManager.getActiveModules();
    logger.info(`Module system initialized with ${modules.length} active modules`, {
      modules: modules.map(m => ({ id: m.id, name: m.name, type: m.type }))
    });
  }

  private async registerPlatformWorkflows(): Promise<void> {
    logger.info('Registering platform workflows...');

    // Register DMP generation workflow
    this.workflowEngine.registerWorkflow('dmp-generation', {
      id: 'dmp-generation',
      name: 'Data Management Plan Generation',
      description: 'Complete DMP generation workflow with module integration',
      version: '1.0.0',
      steps: [
        {
          id: 'protocol-analysis',
          name: 'Protocol Analysis',
          type: 'module',
          moduleId: 'protocol-analyzer',
          inputs: [
            { name: 'protocol', type: 'StudyProtocol', required: true, source: 'context', sourceKey: 'protocol' }
          ],
          outputs: [
            { name: 'analysis', type: 'ProtocolAnalysis', target: 'context', targetKey: 'protocolAnalysis' }
          ],
          permissions: ['study.read', 'protocol.analyze']
        },
        {
          id: 'dmp-generation',
          name: 'DMP Generation',
          type: 'module',
          moduleId: 'dmp-builder',
          inputs: [
            { name: 'protocol', type: 'StudyProtocol', required: true, source: 'context', sourceKey: 'protocol' },
            { name: 'analysis', type: 'ProtocolAnalysis', required: false, source: 'context', sourceKey: 'protocolAnalysis' }
          ],
          outputs: [
            { name: 'dmp', type: 'DMP', target: 'context', targetKey: 'dmp' }
          ],
          permissions: ['study.read', 'dmp.create']
        }
      ],
      triggers: [
        { type: 'manual' },
        { type: 'event', event: 'protocol-uploaded' }
      ]
    });

    logger.info('Platform workflows registered');
  }

  private async startPlatformModules(): Promise<void> {
    logger.info('Starting platform modules...');

    const modules = this.moduleManager.getAllModules() as PlatformModule[];
    
    for (const module of modules) {
      try {
        if (module.onPlatformStart) {
          await module.onPlatformStart();
          logger.debug('Platform start hook executed', { moduleId: module.id });
        }

        // Register module workflows if provided
        if (module.registerWorkflows) {
          const workflowRegistry = this.workflowEngine.getWorkflowRegistry();
          module.registerWorkflows(workflowRegistry);
          logger.debug('Module workflows registered', { moduleId: module.id });
        }

        // Register data models if provided
        if (module.registerDataModels) {
          const dataModelRegistry = this.services.data.getDataModelRegistry?.();
          if (dataModelRegistry) {
            module.registerDataModels(dataModelRegistry);
            logger.debug('Module data models registered', { moduleId: module.id });
          }
        }

        // Register event handlers if provided
        if (module.registerEventHandlers) {
          const eventRegistry = this.workflowEngine.getEventRegistry();
          module.registerEventHandlers(eventRegistry);
          logger.debug('Module event handlers registered', { moduleId: module.id });
        }

      } catch (error) {
        logger.error('Failed to start platform module', error, { moduleId: module.id });
        // Continue with other modules
      }
    }

    logger.info('Platform modules started');
  }

  private async stopPlatformModules(): Promise<void> {
    logger.info('Stopping platform modules...');

    const modules = this.moduleManager.getAllModules() as PlatformModule[];
    
    for (const module of modules) {
      try {
        if (module.onPlatformStop) {
          await module.onPlatformStop();
          logger.debug('Platform stop hook executed', { moduleId: module.id });
        }
      } catch (error) {
        logger.error('Error stopping platform module', error, { moduleId: module.id });
        // Continue with other modules
      }
    }

    logger.info('Platform modules stopped');
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('Platform engine not initialized. Call initialize() first.');
    }
  }
}

// Utility function to create platform logger
function createPlatformLogger(component: string) {
  return {
    info: (message: string, context?: any) => console.log(`[${component}] INFO: ${message}`, context || ''),
    warn: (message: string, context?: any) => console.warn(`[${component}] WARN: ${message}`, context || ''),
    error: (message: string, error?: Error, context?: any) => console.error(`[${component}] ERROR: ${message}`, error || '', context || ''),
    debug: (message: string, context?: any) => console.debug(`[${component}] DEBUG: ${message}`, context || '')
  };
}