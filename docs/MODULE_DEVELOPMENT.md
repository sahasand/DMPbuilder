# Module Development Guide

This guide provides comprehensive instructions for creating new clinical research modules for the DMP Generator system.

## Table of Contents

1. [Overview](#overview)
2. [Module Interface Requirements](#module-interface-requirements)
3. [Step-by-Step Module Creation](#step-by-step-module-creation)
4. [Code Examples and Templates](#code-examples-and-templates)
5. [Integration Patterns](#integration-patterns)
6. [Testing Guidelines](#testing-guidelines)
7. [Best Practices](#best-practices)

## Overview

The Clinical DMP Generator uses a modular architecture that allows you to extend functionality by creating specialized modules for different aspects of clinical research. Each module is self-contained and follows a standardized interface.

### Module Types Supported

- **Protocol Analyzer**: Analyzes study protocols for complexity, risk, and requirements
- **Data Validator**: Validates clinical data against standards and rules
- **Report Generator**: Generates specialized reports and documentation
- **Compliance Checker**: Checks compliance with regulatory requirements
- **Risk Assessor**: Assesses study risks and mitigation strategies
- **Timeline Planner**: Creates project timelines and milestones
- **Endpoint Analyzer**: Analyzes study endpoints and outcomes
- **Safety Monitor**: Monitors safety data and signals
- **Quality Controller**: Quality control and assurance checks
- **Regulatory Reviewer**: Reviews regulatory submission requirements

## Module Interface Requirements

### Core Interface

Every module must implement the `ClinicalModule` interface:

```typescript
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
```

### Required Methods

#### 1. `initialize(): Promise<void>`
- Called once when the module is loaded
- Used for setup, validation, and resource initialization
- Must complete successfully for module to be considered active

#### 2. `execute(context: ModuleContext): Promise<ModuleResult>`
- Main processing method called during DMP generation
- Receives context with protocol, CRFs, and metadata
- Returns structured results with data, recommendations, and modifications

#### 3. `destroy(): Promise<void>`
- Called during application shutdown
- Used for cleanup and resource deallocation

#### 4. `isEnabled(): boolean`
- Returns whether the module is currently enabled
- Used by the module manager for execution decisions

## Step-by-Step Module Creation

### Step 1: Create Module Directory Structure

```bash
src/modules/your-module-name/
├── index.ts           # Module export
├── module.json        # Module metadata
├── your-module.ts     # Main implementation
└── types.ts          # Module-specific types (optional)
```

### Step 2: Create Module Metadata (`module.json`)

```json
{
  "id": "your-module-name",
  "name": "Your Module Display Name",
  "version": "1.0.0",
  "description": "Brief description of what your module does",
  "author": "Your Name/Organization",
  "type": "your-module-type",
  "config": {
    "enabled": true,
    "priority": 5,
    "therapeuticAreas": ["all"],
    "studyPhases": ["Phase 1", "Phase 2", "Phase 3", "Phase 4"]
  },
  "capabilities": [
    "List of capabilities your module provides"
  ]
}
```

### Step 3: Implement the Module Class

```typescript
// your-module.ts
import { 
  ClinicalModule, 
  ModuleType, 
  ModuleConfig, 
  ModuleContext, 
  ModuleResult,
  DMPModification 
} from '../../types/module-types';
import { createModuleLogger } from '../../utils/logger';

const logger = createModuleLogger('your-module-name');

export class YourModule implements ClinicalModule {
  public readonly id: string;
  public readonly name: string;
  public readonly version: string;
  public readonly description: string;
  public readonly author: string;
  public readonly type: ModuleType;
  public config: ModuleConfig;

  private initialized = false;

  constructor(moduleInfo: any = {}) {
    this.id = moduleInfo.id || 'your-module-name';
    this.name = moduleInfo.name || 'Your Module Name';
    this.version = moduleInfo.version || '1.0.0';
    this.description = moduleInfo.description || 'Module description';
    this.author = moduleInfo.author || 'Your Name';
    this.type = ModuleType.YOUR_MODULE_TYPE;
    
    this.config = {
      enabled: true,
      priority: 5,
      settings: {
        // Your module-specific settings
      },
      ...moduleInfo.config
    };
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    logger.info(`Initializing ${this.name} module`, {
      version: this.version,
      enabled: this.config.enabled
    });

    // Perform initialization tasks
    await this.validateConfiguration();
    
    this.initialized = true;
    logger.info(`${this.name} module initialized successfully`);
  }

  async destroy(): Promise<void> {
    logger.info(`Destroying ${this.name} module`);
    this.initialized = false;
  }

  isEnabled(): boolean {
    return this.config.enabled && this.initialized;
  }

  async execute(context: ModuleContext): Promise<ModuleResult> {
    const startTime = Date.now();
    
    logger.info(`Executing ${this.name}`, {
      hasProtocol: !!context.protocol,
      hasCRFs: !!context.crfs,
      environment: context.metadata.environment
    });

    try {
      // Your main processing logic here
      const analysisResult = await this.processData(context);
      
      const executionTime = Date.now() - startTime;

      const result: ModuleResult = {
        moduleId: this.id,
        status: 'success',
        data: analysisResult,
        messages: [
          `Processing completed for ${context.protocol?.studyTitle || 'unknown study'}`
        ],
        warnings: [],
        errors: [],
        metrics: {
          executionTime,
          custom: {
            // Your custom metrics
          }
        },
        recommendations: this.generateRecommendations(analysisResult),
        dmpModifications: this.generateDMPModifications(analysisResult)
      };

      logger.info(`${this.name} completed successfully`, {
        executionTime
      });

      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      logger.error(`${this.name} execution failed`, error);

      return {
        moduleId: this.id,
        status: 'error',
        data: null,
        messages: [],
        warnings: [],
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        metrics: { executionTime },
        recommendations: []
      };
    }
  }

  private async processData(context: ModuleContext): Promise<any> {
    // Implement your main processing logic here
    const { protocol, crfs } = context;
    
    // Example processing
    return {
      processedAt: new Date(),
      findings: [],
      metrics: {}
    };
  }

  private generateRecommendations(data: any): string[] {
    // Generate recommendations based on your analysis
    return [];
  }

  private generateDMPModifications(data: any): DMPModification[] {
    // Generate DMP modifications based on your analysis
    return [];
  }

  private async validateConfiguration(): Promise<void> {
    // Validate your module configuration
    if (!this.config.settings) {
      throw new Error('Module configuration is missing required settings');
    }
  }
}
```

### Step 4: Create Module Export (`index.ts`)

```typescript
// index.ts
export { YourModule } from './your-module';
export type { YourModuleResult } from './types'; // if you have custom types

// Default export for module loading
export { YourModule as default } from './your-module';
```

### Step 5: Add Module Type to Enum

Update `src/types/module-types.ts`:

```typescript
export enum ModuleType {
  // ... existing types
  YOUR_MODULE_TYPE = 'your-module-type',
}
```

## Code Examples and Templates

### Basic Template

Use this template as a starting point for new modules:

```typescript
import { 
  ClinicalModule, 
  ModuleType, 
  ModuleContext, 
  ModuleResult 
} from '../../types/module-types';
import { createModuleLogger } from '../../utils/logger';

const logger = createModuleLogger('template-module');

export class TemplateModule implements ClinicalModule {
  public readonly id = 'template-module';
  public readonly name = 'Template Module';
  public readonly version = '1.0.0';
  public readonly description = 'Template for creating new modules';
  public readonly author = 'DMP Generator Team';
  public readonly type = ModuleType.DATA_VALIDATOR; // Change as needed
  
  public config = {
    enabled: true,
    priority: 5,
    settings: {}
  };

  private initialized = false;

  async initialize(): Promise<void> {
    this.initialized = true;
    logger.info('Template module initialized');
  }

  async destroy(): Promise<void> {
    this.initialized = false;
    logger.info('Template module destroyed');
  }

  isEnabled(): boolean {
    return this.config.enabled && this.initialized;
  }

  async execute(context: ModuleContext): Promise<ModuleResult> {
    const startTime = Date.now();
    
    // Your processing logic here
    
    return {
      moduleId: this.id,
      status: 'success',
      data: { processed: true },
      messages: ['Template processing complete'],
      warnings: [],
      errors: [],
      metrics: { executionTime: Date.now() - startTime },
      recommendations: []
    };
  }
}
```

### Data Validator Example

```typescript
export class DataValidatorModule implements ClinicalModule {
  // ... standard properties

  async execute(context: ModuleContext): Promise<ModuleResult> {
    const { protocol, crfs } = context;
    const validationResults = [];

    // Validate protocol completeness
    if (!protocol.studyTitle) {
      validationResults.push({
        field: 'studyTitle',
        issue: 'Missing study title',
        severity: 'error'
      });
    }

    // Validate CRF structure
    crfs?.forEach((crf, index) => {
      if (!crf.formName) {
        validationResults.push({
          field: `crf[${index}].formName`,
          issue: 'Missing form name',
          severity: 'warning'
        });
      }
    });

    return {
      moduleId: this.id,
      status: validationResults.some(r => r.severity === 'error') ? 'error' : 'success',
      data: { validationResults },
      messages: [`Validated ${crfs?.length || 0} CRFs`],
      warnings: validationResults.filter(r => r.severity === 'warning').map(r => r.issue),
      errors: validationResults.filter(r => r.severity === 'error').map(r => r.issue),
      metrics: { executionTime: Date.now() - startTime },
      recommendations: this.generateValidationRecommendations(validationResults)
    };
  }
}
```

## Integration Patterns

### DMP Modification Pattern

```typescript
private generateDMPModifications(data: any): DMPModification[] {
  const modifications: DMPModification[] = [];

  // Add new content to existing section
  modifications.push({
    section: 'Data Cleaning Plan',
    type: 'add',
    content: 'Additional validation procedures based on module analysis.',
    reason: 'Enhanced data quality measures recommended',
    priority: 'medium',
    required: false
  });

  // Modify existing section
  modifications.push({
    section: 'Overview',
    type: 'modify',
    content: 'Study complexity level: High',
    reason: 'Complexity analysis results',
    priority: 'low',
    required: false
  });

  return modifications;
}
```

### Context Usage Pattern

```typescript
async execute(context: ModuleContext): Promise<ModuleResult> {
  const { protocol, crfs, dmp, metadata } = context;

  // Access protocol data
  const studyPhase = protocol?.studyPhase;
  const indication = protocol?.indication;

  // Access CRF data
  const crfCount = crfs?.length || 0;
  const totalFields = crfs?.reduce((sum, crf) => sum + (crf.fields?.length || 0), 0);

  // Access existing DMP (if available)
  const existingSections = dmp?.sections?.length || 0;

  // Access metadata
  const environment = metadata.environment;
  const executionTime = metadata.timestamp;

  // Use module chain results (if available)
  const previousResults = context.moduleChain || [];
  
  // Your processing logic...
}
```

## Testing Guidelines

### Unit Testing

Create test files in the `test/modules/` directory:

```typescript
// test/modules/your-module.test.ts
import { YourModule } from '../../src/modules/your-module/your-module';
import { ModuleContext } from '../../src/types/module-types';

describe('YourModule', () => {
  let module: YourModule;

  beforeEach(() => {
    module = new YourModule();
  });

  it('should initialize successfully', async () => {
    await module.initialize();
    expect(module.isEnabled()).toBe(true);
  });

  it('should execute with mock context', async () => {
    await module.initialize();
    
    const mockContext: ModuleContext = {
      protocol: {
        studyTitle: 'Test Study',
        protocolNumber: 'TEST-001',
        studyPhase: 'Phase 2',
        // ... other required fields
      },
      crfs: [],
      metadata: {
        timestamp: new Date(),
        initiator: 'test',
        environment: 'test'
      }
    };

    const result = await module.execute(mockContext);
    
    expect(result.status).toBe('success');
    expect(result.moduleId).toBe(module.id);
  });
});
```

### Integration Testing

Test module integration with the module manager:

```typescript
import { ModuleManager } from '../../src/modules/module-manager';
import { YourModule } from '../../src/modules/your-module/your-module';

describe('YourModule Integration', () => {
  let moduleManager: ModuleManager;

  beforeEach(async () => {
    moduleManager = new ModuleManager();
    await moduleManager.initialize();
  });

  it('should register and execute through module manager', async () => {
    const module = new YourModule();
    await moduleManager.registerModule(module);

    const context = {
      // ... mock context
    };

    const results = await moduleManager.executeModules(context);
    expect(results).toHaveLength(1);
    expect(results[0].moduleId).toBe(module.id);
  });
});
```

## Best Practices

### 1. Error Handling

```typescript
async execute(context: ModuleContext): Promise<ModuleResult> {
  try {
    // Main logic
    return successResult;
  } catch (error) {
    logger.error('Module execution failed', error);
    
    return {
      moduleId: this.id,
      status: 'error',
      data: null,
      messages: [],
      warnings: [],
      errors: [error instanceof Error ? error.message : 'Unknown error'],
      metrics: { executionTime: Date.now() - startTime },
      recommendations: []
    };
  }
}
```

### 2. Configuration Validation

```typescript
private async validateConfiguration(): Promise<void> {
  const required = ['setting1', 'setting2'];
  
  for (const setting of required) {
    if (!this.config.settings[setting]) {
      throw new Error(`Missing required setting: ${setting}`);
    }
  }
}
```

### 3. Performance Monitoring

```typescript
async execute(context: ModuleContext): Promise<ModuleResult> {
  const startTime = Date.now();
  const memoryStart = process.memoryUsage();
  
  // Processing logic
  
  const executionTime = Date.now() - startTime;
  const memoryEnd = process.memoryUsage();
  const memoryUsed = memoryEnd.heapUsed - memoryStart.heapUsed;
  
  return {
    // ... other fields
    metrics: {
      executionTime,
      memoryUsage: memoryUsed,
      custom: {
        recordsProcessed: recordCount,
        complexityScore: complexity
      }
    }
  };
}
```

### 4. Logging Best Practices

```typescript
// Use structured logging
logger.info('Processing started', {
  protocolNumber: protocol.protocolNumber,
  crfCount: crfs.length,
  environment: context.metadata.environment
});

// Log important metrics
logger.info('Analysis completed', {
  complexityScore: result.complexity,
  recommendationsCount: recommendations.length,
  executionTime
});

// Log warnings and errors appropriately
logger.warn('Incomplete data detected', {
  missingFields: missingFields,
  impact: 'reduced analysis accuracy'
});
```

### 5. Module Independence

- Modules should not directly depend on other modules
- Use the module chain in context to access previous results if needed
- Keep modules focused on a single responsibility
- Make modules configurable through the config object

### 6. Resource Management

```typescript
async initialize(): Promise<void> {
  // Initialize resources
  this.database = await connectToDatabase();
  this.cache = new Map();
}

async destroy(): Promise<void> {
  // Clean up resources
  if (this.database) {
    await this.database.close();
  }
  this.cache?.clear();
}
```

This guide provides everything needed to create robust, well-integrated modules for the Clinical DMP Generator system. Follow these patterns and best practices to ensure your modules are reliable, maintainable, and provide value to the clinical research workflow.