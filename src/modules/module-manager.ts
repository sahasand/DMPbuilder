import { 
  ClinicalModule, 
  ModuleRegistryEntry, 
  ModuleManagerConfig, 
  ModuleContext, 
  ModuleResult, 
  ModuleExecutionOptions, 
  ModuleDiscoveryResult,
  ModuleType 
} from '../types/module-types';
import { logInfo, logError, logWarn, measurePerformance } from '../utils/logger';
import { DMPBuilderModule } from './dmp-builder/dmp-builder-module';
import path from 'path';
import fs from 'fs/promises';

// const logger = createModuleLogger('module-manager'); // Removed for compilation

/**
 * Central module manager for clinical research platform
 * Handles module discovery, registration, and execution
 */
export class ModuleManager {
  private registry: Map<string, ModuleRegistryEntry> = new Map();
  private config: ModuleManagerConfig;
  private initialized = false;

  constructor(config?: Partial<ModuleManagerConfig>) {
    // Default to src/modules in development, dist/modules in production
    const defaultModuleDir = process.env.NODE_ENV === 'production' 
      ? path.join(__dirname)  // Will be dist/modules in production
      : path.resolve(__dirname, '..', '..', 'src', 'modules'); // src/modules in development
    
    this.config = {
      autoDiscover: true,
      executionTimeout: 30000, // 30 seconds
      maxConcurrentExecutions: 5,
      enablePerformanceMonitoring: true,
      moduleDirectories: [defaultModuleDir],
      ...config
    };
  }

  /**
   * Initialize the module manager
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    logInfo('Initializing Module Manager', {
      autoDiscover: this.config.autoDiscover,
      moduleDirectories: this.config.moduleDirectories
    });

    try {
      // Register core modules first
      await this.registerCoreModules();

      if (this.config.autoDiscover) {
        await this.discoverModules();
      }

      await this.initializeRegisteredModules();
      this.initialized = true;

      logInfo('Module Manager initialized successfully', {
        totalModules: this.registry.size,
        activeModules: this.getActiveModules().length
      });
    } catch (error) {
      logError('Failed to initialize Module Manager', error);
      throw error;
    }
  }

  /**
   * Register core modules that are always available
   */
  private async registerCoreModules(): Promise<void> {
    logInfo('Registering core platform modules...');

    try {
      // Register DMP Builder module
      const dmpBuilderModule = new DMPBuilderModule();
      await this.registerModule(dmpBuilderModule);
      
      logInfo('Core modules registered successfully');
      
    } catch (error) {
      logError('Failed to register core modules', error);
      throw error;
    }
  }

  /**
   * Discover modules in configured directories
   */
  async discoverModules(): Promise<ModuleDiscoveryResult> {
    const startTime = Date.now();
    const result: ModuleDiscoveryResult = {
      modules: [],
      errors: [],
      warnings: [],
      discoveryTime: 0
    };

    logInfo('Starting module discovery', {
      directories: this.config.moduleDirectories
    });

    for (const directory of this.config.moduleDirectories) {
      try {
        const discoveredModules = await this.discoverModulesInDirectory(directory);
        result.modules.push(...discoveredModules);
        
        // Auto-register discovered modules
        for (const module of discoveredModules) {
          try {
            await this.registerModule(module);
          } catch (error) {
            logWarn(`Failed to register discovered module: ${module.id}`, { 
              error: error instanceof Error ? error.message : 'Unknown error' 
            });
          }
        }
      } catch (error) {
        const errorMessage = `Failed to discover modules in ${directory}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        logError(errorMessage, error);
        result.errors.push(errorMessage);
      }
    }

    result.discoveryTime = Date.now() - startTime;

    logInfo('Module discovery completed', {
      modulesFound: result.modules.length,
      errors: result.errors.length,
      warnings: result.warnings.length,
      discoveryTime: result.discoveryTime
    });

    return result;
  }

  /**
   * Discover modules in a specific directory
   */
  private async discoverModulesInDirectory(directory: string): Promise<ClinicalModule[]> {
    const modules: ClinicalModule[] = [];

    try {
      const entries = await fs.readdir(directory, { withFileTypes: true });
      
      for (const entry of entries) {
        if (entry.isDirectory() && !entry.name.startsWith('.')) {
          const modulePath = path.join(directory, entry.name);
          
          try {
            const module = await this.loadModuleFromDirectory(modulePath);
            if (module) {
              modules.push(module);
            }
          } catch (error) {
            logWarn(`Failed to load module from ${modulePath}`, { error: error instanceof Error ? error.message : 'Unknown error' });
          }
        }
      }
    } catch (error) {
      logError(`Cannot read directory ${directory}`, error);
    }

    return modules;
  }

  /**
   * Load a module from a directory
   */
  private async loadModuleFromDirectory(modulePath: string): Promise<ClinicalModule | null> {
    // Try .js first (compiled), then .ts (source)
    const indexPathJs = path.join(modulePath, 'index.js');
    const indexPathTs = path.join(modulePath, 'index.ts');
    const packagePath = path.join(modulePath, 'module.json');
    
    let indexPath = indexPathJs;
    let isTypeScript = false;
    
    try {
      await fs.access(indexPathJs);
    } catch {
      try {
        await fs.access(indexPathTs);
        indexPath = indexPathTs;
        isTypeScript = true;
      } catch {
        return null; // Neither file exists
      }
    }

    try {
      // Load module package info if available
      let moduleInfo: any = {};
      try {
        const packageContent = await fs.readFile(packagePath, 'utf-8');
        moduleInfo = JSON.parse(packageContent);
      } catch {
        // Package file is optional
      }

      // Dynamically import the module
      let moduleExport;
      
      if (isTypeScript && process.env.NODE_ENV !== 'production') {
        // In development mode with TypeScript files, use require() instead of import()
        // because ts-node handles require() for .ts files but not dynamic import()
        try {
          const absolutePath = path.resolve(indexPath);
          // Use require for TypeScript files in development
          delete require.cache[absolutePath]; // Clear cache to allow reloading
          moduleExport = require(absolutePath);
        } catch (requireError) {
          // If require fails, try using import with registered ts-node loader
          try {
            const absolutePath = path.resolve(indexPath);
            moduleExport = await import(absolutePath);
          } catch (importError) {
            throw new Error(`Failed to load TypeScript module: ${requireError.message || importError.message}`);
          }
        }
      } else {
        // For JavaScript files or production, use regular import with absolute path
        const absolutePath = path.resolve(indexPath);
        moduleExport = await import(absolutePath);
      }
      
      const exportKeys = Object.keys(moduleExport);
      const ModuleClass = moduleExport.default || (exportKeys.length > 0 && exportKeys[0] ? moduleExport[exportKeys[0]] : null);

      if (!ModuleClass) {
        throw new Error('No default export found in module');
      }

      const module: ClinicalModule = new ModuleClass(moduleInfo);

      logInfo(`Discovered module: ${module.name}`, {
        id: module.id,
        version: module.version,
        type: module.type,
        loadedFrom: isTypeScript ? 'TypeScript' : 'JavaScript'
      });

      return module;
    } catch (error) {
      logWarn(`Failed to load module from ${modulePath}`, { 
        error: error instanceof Error ? error.message : 'Unknown error',
        indexPath,
        isTypeScript
      });
      return null;
    }
  }

  /**
   * Register a module manually
   */
  async registerModule(module: ClinicalModule): Promise<void> {
    if (this.registry.has(module.id)) {
      throw new Error(`Module with ID '${module.id}' is already registered`);
    }

    const registryEntry: ModuleRegistryEntry = {
      module,
      registeredAt: new Date(),
      status: 'registered',
      stats: {
        totalExecutions: 0,
        successCount: 0,
        errorCount: 0,
        avgExecutionTime: 0
      }
    };

    this.registry.set(module.id, registryEntry);

    logInfo(`Module registered: ${module.name}`, {
      id: module.id,
      version: module.version,
      type: module.type
    });
  }

  /**
   * Initialize all registered modules
   */
  private async initializeRegisteredModules(): Promise<void> {
    const modules = Array.from(this.registry.values());
    
    for (const entry of modules) {
      try {
        await entry.module.initialize();
        entry.status = 'initialized';
        
        if (entry.module.isEnabled()) {
          entry.status = 'active';
        }

        logInfo(`Module initialized: ${entry.module.name}`, {
          id: entry.module.id,
          status: entry.status
        });
      } catch (error) {
        entry.status = 'error';
        logError(`Failed to initialize module: ${entry.module.name}`, error);
      }
    }
  }

  /**
   * Execute modules with given context
   */
  async executeModules(
    context: ModuleContext, 
    options: ModuleExecutionOptions = { continueOnError: true, parallel: false }
  ): Promise<ModuleResult[]> {
    const results: ModuleResult[] = [];
    const modulesToExecute = this.getModulesToExecute(options.modules);

    if (modulesToExecute.length === 0) {
      logInfo('No modules to execute');
      return results;
    }

    logInfo(`Executing ${modulesToExecute.length} modules`, {
      modules: modulesToExecute.map(m => m.id),
      parallel: options.parallel
    });

    if (options.parallel) {
      const promises = modulesToExecute.map(module => 
        this.executeModule(module, context, options.timeout)
      );
      
      const settledResults = await Promise.allSettled(promises);
      
      settledResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          const module = modulesToExecute[index];
          results.push({
            moduleId: module?.id || 'unknown',
            status: 'error',
            data: null,
            messages: [],
            warnings: [],
            errors: [result.reason?.message || 'Unknown execution error'],
            metrics: { executionTime: 0 },
            recommendations: []
          });
        }
      });
    } else {
      // Sequential execution
      for (const module of modulesToExecute) {
        try {
          const result = await this.executeModule(module, context, options.timeout);
          results.push(result);
          
          // Update context with previous results for module chaining
          context.moduleChain = [...(context.moduleChain || []), result];
          
          if (result.status === 'error' && !options.continueOnError) {
            logError(`Module execution failed, stopping chain: ${module.id}`);
            break;
          }
        } catch (error) {
          const errorResult: ModuleResult = {
            moduleId: module.id,
            status: 'error',
            data: null,
            messages: [],
            warnings: [],
            errors: [error instanceof Error ? error.message : 'Unknown execution error'],
            metrics: { executionTime: 0 },
            recommendations: []
          };
          
          results.push(errorResult);
          
          if (!options.continueOnError) {
            break;
          }
        }
      }
    }

    logInfo('Module execution completed', {
      totalModules: modulesToExecute.length,
      successCount: results.filter(r => r.status === 'success').length,
      errorCount: results.filter(r => r.status === 'error').length
    });

    return results;
  }

  /**
   * Execute a single module
   */
  private async executeModule(
    module: ClinicalModule, 
    context: ModuleContext, 
    timeout?: number
  ): Promise<ModuleResult> {
    const entry = this.registry.get(module.id);
    if (!entry) {
      throw new Error(`Module not found in registry: ${module.id}`);
    }

    const executionTimeout = timeout || this.config.executionTimeout;

    try {
      const result = await measurePerformance(
        `module.${module.id}.execution`,
        async () => {
          const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error(`Module execution timeout: ${module.id}`)), executionTimeout);
          });

          const executionPromise = module.execute(context);

          return Promise.race([executionPromise, timeoutPromise]);
        }
      );

      // Update statistics
      entry.stats.totalExecutions++;
      entry.stats.successCount++;
      entry.lastExecuted = new Date();
      
      // Update average execution time
      const totalTime = entry.stats.avgExecutionTime * (entry.stats.totalExecutions - 1) + result.metrics.executionTime;
      entry.stats.avgExecutionTime = totalTime / entry.stats.totalExecutions;

      logInfo(`Module executed successfully: ${module.id}`, {
        executionTime: result.metrics.executionTime,
        status: result.status,
        messagesCount: result.messages.length,
        warningsCount: result.warnings.length,
        errorsCount: result.errors.length
      });

      return result;
    } catch (error) {
      // Update error statistics
      entry.stats.totalExecutions++;
      entry.stats.errorCount++;
      entry.lastExecuted = new Date();

      logError(`Module execution failed: ${module.id}`, error);
      throw error;
    }
  }

  /**
   * Get modules to execute based on options
   */
  private getModulesToExecute(moduleIds?: string[]): ClinicalModule[] {
    const activeModules = this.getActiveModules();
    
    if (!moduleIds || moduleIds.length === 0) {
      return activeModules;
    }

    return activeModules.filter(module => moduleIds.includes(module.id));
  }

  /**
   * Get all active modules sorted by priority
   */
  getActiveModules(): ClinicalModule[] {
    return Array.from(this.registry.values())
      .filter(entry => entry.status === 'active' && entry.module.isEnabled())
      .map(entry => entry.module)
      .sort((a, b) => (a.config?.priority || 999) - (b.config?.priority || 999));
  }

  /**
   * Get module by ID
   */
  getModule(moduleId: string): ClinicalModule | undefined {
    return this.registry.get(moduleId)?.module;
  }

  /**
   * Get all registered modules
   */
  getAllModules(): ClinicalModule[] {
    return Array.from(this.registry.values()).map(entry => entry.module);
  }

  /**
   * Get modules by type
   */
  getModulesByType(type: ModuleType): ClinicalModule[] {
    return this.getAllModules().filter(module => module.type === type);
  }

  /**
   * Get module statistics
   */
  getModuleStats(moduleId: string): ModuleRegistryEntry['stats'] | undefined {
    return this.registry.get(moduleId)?.stats;
  }

  /**
   * Get all module statistics
   */
  getAllModuleStats(): Record<string, ModuleRegistryEntry['stats']> {
    const stats: Record<string, ModuleRegistryEntry['stats']> = {};
    
    for (const [moduleId, entry] of this.registry) {
      stats[moduleId] = entry.stats;
    }
    
    return stats;
  }

  /**
   * Enable/disable a module
   */
  async setModuleEnabled(moduleId: string, enabled: boolean): Promise<void> {
    const entry = this.registry.get(moduleId);
    if (!entry) {
      throw new Error(`Module not found: ${moduleId}`);
    }

    if (entry.module.config) {
      entry.module.config.enabled = enabled;
      entry.status = enabled ? 'active' : 'disabled';
      
      logInfo(`Module ${enabled ? 'enabled' : 'disabled'}: ${moduleId}`);
    }
  }

  /**
   * Cleanup and destroy all modules
   */
  async destroy(): Promise<void> {
    logInfo('Destroying Module Manager');

    const destroyPromises = Array.from(this.registry.values()).map(async entry => {
      try {
        await entry.module.destroy();
        logInfo(`Module destroyed: ${entry.module.id}`);
      } catch (error) {
        logError(`Failed to destroy module: ${entry.module.id}`, error);
      }
    });

    await Promise.all(destroyPromises);
    
    this.registry.clear();
    this.initialized = false;
    
    logInfo('Module Manager destroyed');
  }
}

// Export singleton instance
export const moduleManager = new ModuleManager();