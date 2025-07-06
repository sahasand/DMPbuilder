# Clinical Research Modules

This directory contains the modular extension system for the Clinical DMP Generator. Each module provides specialized functionality for clinical research workflows.

## Quick Start

### Using Existing Modules

The system automatically discovers and loads modules from this directory. Currently available:

- **Protocol Analyzer** (`protocol-analyzer/`) - Analyzes study protocols for complexity and requirements

### Creating New Modules

1. **Create module directory**: `your-module-name/`
2. **Add metadata**: `module.json` with module information
3. **Implement module**: `your-module-name.ts` implementing `ClinicalModule` interface
4. **Export module**: `index.ts` with proper exports
5. **Test integration**: Verify module loads and executes correctly

## Module Structure

```
src/modules/
├── module-manager.ts          # Core module management system
├── protocol-analyzer/         # Example module
│   ├── index.ts              # Module exports
│   ├── module.json           # Module metadata
│   └── protocol-analyzer.ts  # Module implementation
└── your-new-module/          # Your module here
    ├── index.ts
    ├── module.json
    └── your-new-module.ts
```

## Core Interface

All modules must implement the `ClinicalModule` interface:

```typescript
interface ClinicalModule {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly description: string;
  readonly author: string;
  readonly type: ModuleType;
  config?: ModuleConfig;
  
  initialize(): Promise<void>;
  destroy(): Promise<void>;
  isEnabled(): boolean;
  execute(context: ModuleContext): Promise<ModuleResult>;
}
```

## Module Types

Available module types (add to `ModuleType` enum):

- `PROTOCOL_ANALYZER` - Protocol analysis and complexity assessment
- `DATA_VALIDATOR` - Data validation and quality checks
- `REPORT_GENERATOR` - Specialized report generation
- `COMPLIANCE_CHECKER` - Regulatory compliance verification
- `RISK_ASSESSOR` - Risk assessment and mitigation
- `TIMELINE_PLANNER` - Project timeline planning
- `ENDPOINT_ANALYZER` - Endpoint analysis and optimization
- `SAFETY_MONITOR` - Safety monitoring and signal detection
- `QUALITY_CONTROLLER` - Quality control procedures
- `REGULATORY_REVIEWER` - Regulatory submission requirements

## Basic Module Template

```typescript
import { 
  ClinicalModule, 
  ModuleType, 
  ModuleContext, 
  ModuleResult 
} from '../../types/module-types';

export class YourModule implements ClinicalModule {
  public readonly id = 'your-module-id';
  public readonly name = 'Your Module Name';
  public readonly version = '1.0.0';
  public readonly description = 'Module description';
  public readonly author = 'Your Name';
  public readonly type = ModuleType.YOUR_MODULE_TYPE;
  
  public config = { enabled: true, priority: 5, settings: {} };
  private initialized = false;

  async initialize(): Promise<void> {
    this.initialized = true;
  }

  async destroy(): Promise<void> {
    this.initialized = false;
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
      data: { /* your results */ },
      messages: ['Processing complete'],
      warnings: [],
      errors: [],
      metrics: { executionTime: Date.now() - startTime },
      recommendations: []
    };
  }
}
```

## Module Metadata Template

```json
{
  "id": "your-module-id",
  "name": "Your Module Name",
  "version": "1.0.0",
  "description": "Brief description of module functionality",
  "author": "Your Name/Organization",
  "type": "your-module-type",
  "config": {
    "enabled": true,
    "priority": 5,
    "therapeuticAreas": ["all"],
    "studyPhases": ["Phase 1", "Phase 2", "Phase 3", "Phase 4"]
  },
  "capabilities": [
    "List of module capabilities"
  ]
}
```

## Export Template

```typescript
// index.ts
export { YourModule } from './your-module';
export type { YourModuleResult } from './types'; // if you have custom types

// Default export for module loading
export { YourModule as default } from './your-module';
```

## Integration with DMP Generation

Modules are automatically integrated into the DMP generation process:

1. **Discovery**: Modules auto-discovered on startup
2. **Registration**: Active modules registered with ModuleManager
3. **Execution**: Modules run during DMP generation (if enabled)
4. **Enhancement**: Module results enhance generated DMPs

### Module Context

Your module receives a `ModuleContext` with:

```typescript
interface ModuleContext {
  protocol?: StudyProtocol;     // Parsed protocol data
  crfs?: CRFSpecification[];    // CRF specifications
  dmp?: DMP;                    // Current DMP (if available)
  metadata: {
    timestamp: Date;
    initiator: string;
    environment: 'development' | 'production' | 'test';
  };
  moduleChain?: ModuleResult[]; // Results from previous modules
}
```

### Module Results

Return a structured `ModuleResult`:

```typescript
interface ModuleResult {
  moduleId: string;
  status: 'success' | 'warning' | 'error';
  data?: any;                   // Your analysis results
  messages: string[];           // Success/info messages
  warnings: string[];           // Non-blocking warnings
  errors: string[];             // Error messages
  metrics: {
    executionTime: number;
    memoryUsage?: number;
    custom?: Record<string, number>;
  };
  recommendations?: string[];   // Actionable recommendations
  dmpModifications?: DMPModification[]; // DMP enhancement suggestions
}
```

## DMP Modifications

Enhance generated DMPs by returning modifications:

```typescript
const modifications: DMPModification[] = [
  {
    section: 'Data Cleaning Plan',
    type: 'add',
    content: 'Additional procedures recommended based on analysis.',
    reason: 'Module analysis indicates enhanced quality measures needed',
    priority: 'medium',
    required: false
  }
];
```

## Testing Your Module

### Unit Testing

```typescript
import { YourModule } from './your-module';

describe('YourModule', () => {
  let module: YourModule;

  beforeEach(() => {
    module = new YourModule();
  });

  it('should initialize successfully', async () => {
    await module.initialize();
    expect(module.isEnabled()).toBe(true);
  });

  it('should execute with valid context', async () => {
    await module.initialize();
    
    const context = {
      protocol: { /* mock protocol */ },
      crfs: [],
      metadata: {
        timestamp: new Date(),
        initiator: 'test',
        environment: 'test'
      }
    };

    const result = await module.execute(context);
    expect(result.status).toBe('success');
  });
});
```

### Integration Testing

Test with the module manager:

```typescript
import { ModuleManager } from '../module-manager';

describe('Module Integration', () => {
  it('should load and execute through module manager', async () => {
    const moduleManager = new ModuleManager();
    await moduleManager.initialize();
    
    const activeModules = moduleManager.getActiveModules();
    expect(activeModules.length).toBeGreaterThan(0);
    
    const results = await moduleManager.executeModules(context);
    expect(results).toHaveLength(activeModules.length);
  });
});
```

## API Access

### Check Module Status

```bash
# List all modules
curl http://localhost:3000/api/v1/modules

# Get specific module
curl http://localhost:3000/api/v1/modules/your-module-id

# Get module statistics
curl http://localhost:3000/api/v1/modules/stats
```

### Control Modules

```bash
# Disable module
curl -X PATCH http://localhost:3000/api/v1/modules/your-module-id/toggle \
  -H "Content-Type: application/json" \
  -d '{"enabled": false}'

# Enable module
curl -X PATCH http://localhost:3000/api/v1/modules/your-module-id/toggle \
  -H "Content-Type: application/json" \
  -d '{"enabled": true}'
```

## Best Practices

### 1. Error Handling
- Always wrap main logic in try-catch
- Return appropriate error status and messages
- Log errors for debugging

### 2. Performance
- Monitor execution time
- Use caching for expensive operations
- Consider memory usage for large datasets

### 3. Configuration
- Make modules configurable
- Validate configuration on initialization
- Support runtime configuration changes

### 4. Logging
- Use structured logging with context
- Log important milestones and metrics
- Avoid logging sensitive data

### 5. Testing
- Write comprehensive unit tests
- Test error conditions
- Verify integration with module manager

## Debugging

### Common Issues

1. **Module not loading**: Check `module.json` syntax and exports
2. **Execution errors**: Verify input validation and error handling
3. **Performance issues**: Monitor execution time and memory usage

### Logging

Enable detailed logging:

```typescript
import { createModuleLogger } from '../../utils/logger';

const logger = createModuleLogger('your-module');

logger.info('Processing started', { protocolId: protocol.id });
logger.warn('Incomplete data detected', { missingFields });
logger.error('Processing failed', error);
```

## Resources

- **Full Documentation**: `docs/MODULE_DEVELOPMENT.md`
- **Architecture Guide**: `docs/MODULE_ARCHITECTURE.md`
- **Existing Modules**: `docs/EXISTING_MODULES.md`
- **Type Definitions**: `types/module-types.ts`

## Support

For questions or issues with module development:

1. Review the comprehensive documentation in the `docs/` directory
2. Check existing module implementations for examples
3. Ensure proper TypeScript types are used
4. Test thoroughly before deployment

Happy module development! 🚀