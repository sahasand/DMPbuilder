// Clinical Research Management Platform - Main Export

export { PlatformEngine } from './engine/platform-engine';
export { WorkflowEngine } from './workflows/workflow-engine';
export { ServiceRegistry } from './services/service-registry';

// Export platform types
export * from './types/platform-types';

// Export service implementations
export { MockDataManagementService } from './services/implementations/mock-data-service';
export { MockUserManagementService } from './services/implementations/mock-user-service';
export { MockAuditService } from './services/implementations/mock-audit-service';
export { MockDocumentManagementService } from './services/implementations/mock-document-service';
export { MockNotificationService } from './services/implementations/mock-notification-service';
export { MockIntegrationHubService } from './services/implementations/mock-integration-service';
export { MockComplianceService } from './services/implementations/mock-compliance-service';
export { PlatformLoggingService } from './services/implementations/platform-logging-service';
export { InMemoryCacheService } from './services/implementations/memory-cache-service';
export { PlatformConfigurationService } from './services/implementations/platform-config-service';

// Utility function to create default platform configuration
export function createDefaultPlatformConfig(): any {
  return {
    name: 'Clinical Research Management Platform',
    version: '1.0.0',
    environment: (process.env.NODE_ENV || 'development') as 'development' | 'production' | 'test',
    services: {
      workflow: {
        enabled: true,
        maxConcurrentWorkflows: 10,
        defaultTimeout: 300000, // 5 minutes
        retryPolicy: {
          maxRetries: 3,
          backoffStrategy: 'exponential' as const,
          initialDelay: 1000,
          maxDelay: 10000
        }
      },
      data: {
        provider: 'memory' as const,
        caching: {
          enabled: true,
          ttl: 3600
        }
      },
      user: {
        authProvider: 'local' as const,
        sessionTimeout: 24 * 60 * 60 * 1000, // 24 hours
        permissions: {
          default: ['study.read'],
          admin: ['*']
        }
      },
      document: {
        storage: 'local' as const,
        maxFileSize: 50 * 1024 * 1024, // 50MB
        allowedTypes: ['pdf', 'docx', 'xlsx', 'txt']
      },
      notification: {
        channels: ['email', 'platform'],
        defaultChannel: 'platform',
        templates: {}
      },
      audit: {
        enabled: true,
        retentionDays: 2555, // 7 years
        encryptionKey: undefined
      },
      integration: {
        enabled: true,
        timeout: 30000,
        retryPolicy: {
          maxRetries: 3,
          backoffStrategy: 'exponential' as const,
          initialDelay: 1000
        }
      },
      compliance: {
        frameworks: ['GCP', '21CFR11', 'GDPR'],
        auditEnabled: true,
        signatureRequired: false
      }
    },
    modules: {
      autoDiscover: true,
      moduleDirectories: process.env.NODE_ENV === 'production' ? ['./dist/modules'] : ['./src/modules'],
      executionTimeout: 30000,
      maxConcurrentExecutions: 5,
      enablePerformanceMonitoring: true
    },
    workflows: {
      enabled: true,
      defaultWorkflows: ['dmp-generation'],
      maxConcurrentWorkflows: 10,
      executionTimeout: 300000
    }
  };
}