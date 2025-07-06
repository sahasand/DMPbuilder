// Workflow Engine for Clinical Research Management Platform
// Orchestrates multi-module clinical research workflows

import {
  WorkflowEngineService,
  WorkflowDefinition,
  WorkflowInstance,
  WorkflowParameters,
  WorkflowResult,
  WorkflowExecutionContext,
  WorkflowStatus,
  WorkflowHistory,
  WorkflowStep,
  WorkflowRegistry,
  EventRegistry,
  EventHandler,
  PlatformEvent,
  PlatformServices,
  WorkflowConfig,
  RetryPolicy
} from '../types/platform-types';

import { ModuleManager } from '../../modules/module-manager';
import { ModuleResult } from '../../types/module-types';

export class WorkflowEngine implements WorkflowEngineService {
  private config: WorkflowConfig;
  private services: PlatformServices | null = null;
  private moduleManager: ModuleManager | null = null;
  private workflows: Map<string, WorkflowDefinition> = new Map();
  private instances: Map<string, WorkflowInstance> = new Map();
  private eventHandlers: Map<string, EventHandler[]> = new Map();
  private initialized = false;

  constructor(config: WorkflowConfig) {
    this.config = config;
  }

  // ============================================================================
  // LIFECYCLE
  // ============================================================================

  async initialize(services: PlatformServices, moduleManager: ModuleManager): Promise<void> {
    if (this.initialized) {
      return;
    }

    this.services = services;
    this.moduleManager = moduleManager;
    this.initialized = true;

    console.log('[workflow-engine] Workflow engine initialized');
  }

  async shutdown(): Promise<void> {
    if (!this.initialized) {
      return;
    }

    // Cancel all running workflows
    for (const instance of this.instances.values()) {
      if (instance.status === 'running') {
        await this.stop(instance.id);
      }
    }

    this.workflows.clear();
    this.instances.clear();
    this.eventHandlers.clear();
    this.initialized = false;

    console.log('[workflow-engine] Workflow engine shutdown');
  }

  // ============================================================================
  // WORKFLOW MANAGEMENT
  // ============================================================================

  async start(workflowId: string, parameters: WorkflowParameters): Promise<WorkflowInstance> {
    this.ensureInitialized();

    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    const instanceId = this.generateInstanceId();
    const instance: WorkflowInstance = {
      id: instanceId,
      workflowId,
      status: 'pending',
      parameters,
      context: {
        studyId: parameters.studyId,
        userId: parameters.userId || 'system',
        environment: parameters.environment || 'production',
        data: { ...parameters },
        stepOutputs: {}
      },
      history: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.instances.set(instanceId, instance);

    console.log('[workflow-engine] Workflow started', { workflowId, instanceId });

    // Start workflow execution asynchronously
    this.executeWorkflowInstance(instance).catch(error => {
      console.error('[workflow-engine] Workflow execution failed', error, { workflowId, instanceId });
      instance.status = 'failed';
      instance.updatedAt = new Date();
    });

    return instance;
  }

  async stop(instanceId: string): Promise<void> {
    const instance = this.instances.get(instanceId);
    if (!instance) {
      throw new Error(`Workflow instance not found: ${instanceId}`);
    }

    if (instance.status === 'running') {
      instance.status = 'cancelled';
      instance.updatedAt = new Date();
      instance.completedAt = new Date();
    }

    console.log('[workflow-engine] Workflow stopped', { instanceId });
  }

  async pause(instanceId: string): Promise<void> {
    const instance = this.instances.get(instanceId);
    if (!instance) {
      throw new Error(`Workflow instance not found: ${instanceId}`);
    }

    if (instance.status === 'running') {
      instance.status = 'paused';
      instance.updatedAt = new Date();
    }

    console.log('[workflow-engine] Workflow paused', { instanceId });
  }

  async resume(instanceId: string): Promise<void> {
    const instance = this.instances.get(instanceId);
    if (!instance) {
      throw new Error(`Workflow instance not found: ${instanceId}`);
    }

    if (instance.status === 'paused') {
      instance.status = 'running';
      instance.updatedAt = new Date();
      
      // Resume execution
      this.executeWorkflowInstance(instance).catch(error => {
        console.error('[workflow-engine] Workflow resume failed', error, { instanceId });
        instance.status = 'failed';
        instance.updatedAt = new Date();
      });
    }

    console.log('[workflow-engine] Workflow resumed', { instanceId });
  }

  // ============================================================================
  // WORKFLOW QUERIES
  // ============================================================================

  async getActiveWorkflows(studyId?: string): Promise<WorkflowInstance[]> {
    const activeStatuses: WorkflowStatus[] = ['pending', 'running', 'paused'];
    const activeWorkflows = Array.from(this.instances.values()).filter(instance => {
      const isActive = activeStatuses.includes(instance.status);
      const matchesStudy = !studyId || instance.context.studyId === studyId;
      return isActive && matchesStudy;
    });

    return activeWorkflows;
  }

  async getWorkflowStatus(instanceId: string): Promise<WorkflowStatus> {
    const instance = this.instances.get(instanceId);
    if (!instance) {
      throw new Error(`Workflow instance not found: ${instanceId}`);
    }

    return instance.status;
  }

  async getWorkflowHistory(instanceId: string): Promise<WorkflowHistory[]> {
    const instance = this.instances.get(instanceId);
    if (!instance) {
      throw new Error(`Workflow instance not found: ${instanceId}`);
    }

    return instance.history;
  }

  // ============================================================================
  // EVENT HANDLING
  // ============================================================================

  async trigger(event: string, data: any): Promise<void> {
    console.log('[workflow-engine] Event triggered', { event, data });

    const handlers = this.eventHandlers.get(event) || [];
    
    const platformEvent: PlatformEvent = {
      type: event,
      source: 'workflow-engine',
      data,
      timestamp: new Date(),
      userId: data.userId,
      studyId: data.studyId
    };

    // Execute event handlers
    for (const handler of handlers) {
      try {
        await handler(platformEvent);
      } catch (error) {
        console.error('[workflow-engine] Event handler failed', error, { event });
      }
    }

    // Check for workflow triggers
    for (const workflow of this.workflows.values()) {
      for (const trigger of workflow.triggers) {
        if (trigger.type === 'event' && trigger.event === event) {
          try {
            // Check trigger conditions if any
            if (trigger.conditions && !this.evaluateConditions(trigger.conditions, data)) {
              continue;
            }

            // Start workflow
            await this.start(workflow.id, data);
            console.log('[workflow-engine] Workflow triggered by event', { 
              workflowId: workflow.id, 
              event 
            });

          } catch (error) {
            console.error('[workflow-engine] Failed to trigger workflow', error, { 
              workflowId: workflow.id, 
              event 
            });
          }
        }
      }
    }
  }

  subscribe(event: string, handler: EventHandler): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
    console.log('[workflow-engine] Event handler subscribed', { event });
  }

  unsubscribe(event: string, handler: EventHandler): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
        console.log('[workflow-engine] Event handler unsubscribed', { event });
      }
    }
  }

  // ============================================================================
  // WORKFLOW REGISTRATION
  // ============================================================================

  register(workflowId: string, definition: WorkflowDefinition): void {
    this.workflows.set(workflowId, definition);
    console.log('[workflow-engine] Workflow registered', { workflowId });
  }

  unregister(workflowId: string): void {
    this.workflows.delete(workflowId);
    console.log('[workflow-engine] Workflow unregistered', { workflowId });
  }

  registerWorkflow(workflowId: string, definition: WorkflowDefinition): void {
    this.register(workflowId, definition);
  }

  // ============================================================================
  // WORKFLOW EXECUTION
  // ============================================================================

  async executeWorkflow(workflowId: string, context: WorkflowExecutionContext): Promise<WorkflowResult> {
    const startTime = Date.now();
    
    const instance = await this.start(workflowId, {
      ...context.data,
      userId: context.userId,
      studyId: context.studyId,
      environment: context.environment
    });

    // Wait for completion
    while (instance.status === 'pending' || instance.status === 'running') {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    const duration = Date.now() - startTime;

    return {
      instanceId: instance.id,
      status: instance.status,
      outputs: instance.context.stepOutputs,
      errors: instance.history
        .filter(h => h.error)
        .map(h => h.error!),
      duration
    };
  }

  // ============================================================================
  // REGISTRY ACCESS
  // ============================================================================

  getWorkflowRegistry(): WorkflowRegistry {
    return {
      register: (workflowId: string, definition: WorkflowDefinition) => {
        this.register(workflowId, definition);
      },
      unregister: (workflowId: string) => {
        this.unregister(workflowId);
      },
      get: (workflowId: string) => {
        return this.workflows.get(workflowId);
      },
      getAll: () => {
        return Array.from(this.workflows.values());
      }
    };
  }

  getEventRegistry(): EventRegistry {
    return {
      register: (eventType: string, handler: EventHandler) => {
        this.subscribe(eventType, handler);
      },
      unregister: (eventType: string, handler: EventHandler) => {
        this.unsubscribe(eventType, handler);
      },
      getHandlers: (eventType: string) => {
        return this.eventHandlers.get(eventType) || [];
      }
    };
  }

  getRegisteredWorkflows(): WorkflowDefinition[] {
    return Array.from(this.workflows.values());
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private async executeWorkflowInstance(instance: WorkflowInstance): Promise<void> {
    const workflow = this.workflows.get(instance.workflowId);
    if (!workflow) {
      throw new Error(`Workflow definition not found: ${instance.workflowId}`);
    }

    instance.status = 'running';
    instance.updatedAt = new Date();

    console.log('[workflow-engine] Executing workflow', { 
      workflowId: instance.workflowId,
      instanceId: instance.id 
    });

    try {
      for (const step of workflow.steps) {
        if (instance.status !== 'running') {
          break; // Workflow was stopped or paused
        }

        await this.executeWorkflowStep(instance, step);
      }

      if (instance.status === 'running') {
        instance.status = 'completed';
        instance.completedAt = new Date();
      }

    } catch (error) {
      console.error('[workflow-engine] Workflow execution failed', error);
      instance.status = 'failed';
      instance.completedAt = new Date();
      
      // Add error to history
      instance.history.push({
        stepId: 'workflow',
        status: 'failed',
        startTime: new Date(),
        endTime: new Date(),
        error: error.message
      });
    }

    instance.updatedAt = new Date();
    console.log('[workflow-engine] Workflow execution completed', { 
      instanceId: instance.id,
      status: instance.status 
    });
  }

  private async executeWorkflowStep(instance: WorkflowInstance, step: WorkflowStep): Promise<void> {
    const stepStartTime = new Date();
    
    console.log('[workflow-engine] Executing step', { 
      instanceId: instance.id,
      stepId: step.id,
      type: step.type 
    });

    const historyEntry: WorkflowHistory = {
      stepId: step.id,
      status: 'running',
      startTime: stepStartTime
    };

    instance.history.push(historyEntry);
    instance.currentStep = step.id;

    try {
      // Evaluate step conditions if any
      if (step.conditions && !this.evaluateConditions(step.conditions, instance.context.data)) {
        historyEntry.status = 'skipped';
        historyEntry.endTime = new Date();
        console.log('[workflow-engine] Step skipped due to conditions', { stepId: step.id });
        return;
      }

      // Prepare step inputs
      const stepInputs = await this.prepareStepInputs(step, instance);
      historyEntry.inputs = stepInputs;

      let stepResult: any;

      switch (step.type) {
        case 'module':
          stepResult = await this.executeModuleStep(step, stepInputs, instance);
          break;
        
        case 'approval':
          stepResult = await this.executeApprovalStep(step, stepInputs, instance);
          break;
        
        case 'condition':
          stepResult = await this.executeConditionStep(step, stepInputs, instance);
          break;
        
        case 'parallel':
          stepResult = await this.executeParallelStep(step, stepInputs, instance);
          break;
        
        case 'sequential':
          stepResult = await this.executeSequentialStep(step, stepInputs, instance);
          break;
        
        default:
          throw new Error(`Unknown step type: ${step.type}`);
      }

      // Process step outputs
      await this.processStepOutputs(step, stepResult, instance);
      
      historyEntry.status = 'completed';
      historyEntry.outputs = stepResult;
      historyEntry.endTime = new Date();
      historyEntry.duration = historyEntry.endTime.getTime() - stepStartTime.getTime();

      console.log('[workflow-engine] Step completed', { 
        stepId: step.id,
        duration: historyEntry.duration 
      });

    } catch (error) {
      historyEntry.status = 'failed';
      historyEntry.error = error.message;
      historyEntry.endTime = new Date();
      historyEntry.duration = historyEntry.endTime.getTime() - stepStartTime.getTime();

      console.error('[workflow-engine] Step failed', error, { stepId: step.id });
      
      // Apply retry policy if configured
      if (step.retryPolicy && this.shouldRetryStep(step, instance)) {
        console.log('[workflow-engine] Retrying step', { stepId: step.id });
        await this.delay(step.retryPolicy.initialDelay);
        return this.executeWorkflowStep(instance, step);
      }

      throw error;
    }
  }

  private async executeModuleStep(
    step: WorkflowStep, 
    inputs: any, 
    instance: WorkflowInstance
  ): Promise<ModuleResult> {
    if (!step.moduleId) {
      throw new Error(`Module ID required for module step: ${step.id}`);
    }

    if (!this.moduleManager) {
      throw new Error('Module manager not initialized');
    }

    const module = this.moduleManager.getModule(step.moduleId);
    if (!module) {
      throw new Error(`Module not found: ${step.moduleId}`);
    }

    // Create module context
    const moduleContext = {
      ...inputs,
      services: this.services!,
      metadata: {
        timestamp: new Date(),
        initiator: instance.context.userId,
        environment: instance.context.environment
      }
    };

    // Execute module
    const result = await module.execute(moduleContext);
    return result;
  }

  private async executeApprovalStep(
    step: WorkflowStep, 
    inputs: any, 
    instance: WorkflowInstance
  ): Promise<any> {
    // TODO: Implement approval step logic
    // For now, simulate approval
    return { approved: true, approver: 'system', timestamp: new Date() };
  }

  private async executeConditionStep(
    step: WorkflowStep, 
    inputs: any, 
    instance: WorkflowInstance
  ): Promise<any> {
    // TODO: Implement condition step logic
    return { conditionMet: true };
  }

  private async executeParallelStep(
    step: WorkflowStep, 
    inputs: any, 
    instance: WorkflowInstance
  ): Promise<any> {
    // TODO: Implement parallel step logic
    return { parallelResults: [] };
  }

  private async executeSequentialStep(
    step: WorkflowStep, 
    inputs: any, 
    instance: WorkflowInstance
  ): Promise<any> {
    // TODO: Implement sequential step logic
    return { sequentialResults: [] };
  }

  private async prepareStepInputs(step: WorkflowStep, instance: WorkflowInstance): Promise<any> {
    const inputs: any = {};

    for (const input of step.inputs) {
      let value: any;

      switch (input.source) {
        case 'context':
          value = instance.context.data[input.sourceKey || input.name];
          break;
        
        case 'previous_step':
          value = instance.context.stepOutputs[input.sourceKey || input.name];
          break;
        
        case 'user_input':
          // TODO: Handle user input
          value = null;
          break;
        
        case 'data_service':
          // TODO: Fetch from data service
          value = null;
          break;
        
        default:
          value = null;
      }

      if (input.required && (value === null || value === undefined)) {
        throw new Error(`Required input missing: ${input.name} for step ${step.id}`);
      }

      inputs[input.name] = value;
    }

    return inputs;
  }

  private async processStepOutputs(
    step: WorkflowStep, 
    stepResult: any, 
    instance: WorkflowInstance
  ): Promise<void> {
    for (const output of step.outputs) {
      let value: any;

      // Extract value from step result
      if (stepResult && typeof stepResult === 'object') {
        // For module steps, the result is a ModuleResult with data field
        if (stepResult.data !== undefined) {
          // If looking for specific property in data, check data[output.name]
          if (stepResult.data && typeof stepResult.data === 'object' && stepResult.data[output.name] !== undefined) {
            value = stepResult.data[output.name];
          } else {
            // Otherwise, use the entire data as the output value
            value = stepResult.data;
          }
        } else if (stepResult[output.name] !== undefined) {
          value = stepResult[output.name];
        } else {
          value = stepResult;
        }
      } else {
        value = stepResult;
      }

      // Store value in target
      switch (output.target) {
        case 'context':
          instance.context.stepOutputs[output.targetKey || output.name] = value;
          break;
        
        case 'data_service':
          // TODO: Store in data service
          break;
        
        case 'shared_data':
          // TODO: Store in shared data
          break;
      }
    }
  }

  private evaluateConditions(conditions: any[], data: any): boolean {
    // TODO: Implement proper condition evaluation
    // For now, always return true
    return true;
  }

  private shouldRetryStep(step: WorkflowStep, instance: WorkflowInstance): boolean {
    if (!step.retryPolicy) {
      return false;
    }

    const stepHistory = instance.history.filter(h => h.stepId === step.id);
    const failedAttempts = stepHistory.filter(h => h.status === 'failed').length;
    
    return failedAttempts < step.retryPolicy.maxRetries;
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private generateInstanceId(): string {
    return `wf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('Workflow engine not initialized');
    }
  }
}