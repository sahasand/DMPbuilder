// Service Registry for Clinical Research Management Platform
// Manages all platform services and their lifecycle

import {
  PlatformServices,
  ServiceConfig,
  WorkflowEngineService,
  DataManagementService,
  UserManagementService,
  DocumentManagementService,
  NotificationService,
  AuditService,
  IntegrationHubService,
  ComplianceService,
  LoggingService,
  CacheService,
  ConfigurationService
} from '../types/platform-types';

// Import service implementations
import { MockDataManagementService } from './implementations/mock-data-service';
import { MockUserManagementService } from './implementations/mock-user-service';
import { MockDocumentManagementService } from './implementations/mock-document-service';
import { MockNotificationService } from './implementations/mock-notification-service';
import { MockAuditService } from './implementations/mock-audit-service';
import { MockIntegrationHubService } from './implementations/mock-integration-service';
import { MockComplianceService } from './implementations/mock-compliance-service';
import { PlatformLoggingService } from './implementations/platform-logging-service';
import { InMemoryCacheService } from './implementations/memory-cache-service';
import { PlatformConfigurationService } from './implementations/platform-config-service';

export class ServiceRegistry {
  private config: ServiceConfig;
  private services: Partial<PlatformServices> = {};
  private initialized = false;

  constructor(config: ServiceConfig) {
    this.config = config;
  }

  // ============================================================================
  // LIFECYCLE
  // ============================================================================

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    console.log('[service-registry] Initializing platform services...');

    try {
      // Initialize core services
      await this.initializeLoggingService();
      await this.initializeCacheService();
      await this.initializeConfigurationService();
      
      // Initialize business services
      await this.initializeDataManagementService();
      await this.initializeUserManagementService();
      await this.initializeDocumentManagementService();
      await this.initializeNotificationService();
      await this.initializeAuditService();
      await this.initializeIntegrationHubService();
      await this.initializeComplianceService();

      this.initialized = true;
      console.log('[service-registry] Platform services initialized successfully');

    } catch (error) {
      console.error('[service-registry] Failed to initialize platform services', error);
      throw error;
    }
  }

  async shutdown(): Promise<void> {
    if (!this.initialized) {
      return;
    }

    console.log('[service-registry] Shutting down platform services...');

    try {
      // Shutdown services in reverse order
      for (const [serviceName, service] of Object.entries(this.services)) {
        try {
          if (service && typeof (service as any).shutdown === 'function') {
            await (service as any).shutdown();
            console.log(`[service-registry] ${serviceName} service shutdown`);
          }
        } catch (error) {
          console.error(`[service-registry] Error shutting down ${serviceName} service`, error);
        }
      }

      this.services = {};
      this.initialized = false;
      console.log('[service-registry] Platform services shutdown complete');

    } catch (error) {
      console.error('[service-registry] Error during service shutdown', error);
      throw error;
    }
  }

  // ============================================================================
  // SERVICE ACCESS
  // ============================================================================

  getServices(): PlatformServices {
    if (!this.initialized) {
      throw new Error('Service registry not initialized');
    }

    return this.services as PlatformServices;
  }

  getService<T>(serviceName: keyof PlatformServices): T {
    if (!this.initialized) {
      throw new Error('Service registry not initialized');
    }

    const service = this.services[serviceName];
    if (!service) {
      throw new Error(`Service not found: ${serviceName}`);
    }

    return service as T;
  }

  // ============================================================================
  // SERVICE INITIALIZATION
  // ============================================================================

  private async initializeLoggingService(): Promise<void> {
    console.log('[service-registry] Initializing logging service...');
    this.services.logger = new PlatformLoggingService();
    await this.services.logger.initialize?.();
  }

  private async initializeCacheService(): Promise<void> {
    console.log('[service-registry] Initializing cache service...');
    this.services.cache = new InMemoryCacheService();
    await this.services.cache.initialize?.();
  }

  private async initializeConfigurationService(): Promise<void> {
    console.log('[service-registry] Initializing configuration service...');
    this.services.config = new PlatformConfigurationService();
    await this.services.config.initialize?.();
  }

  private async initializeDataManagementService(): Promise<void> {
    console.log('[service-registry] Initializing data management service...');
    
    // Use appropriate implementation based on config
    switch (this.config.data.provider) {
      case 'memory':
        this.services.data = new MockDataManagementService(this.config.data);
        break;
      case 'mongodb':
        // TODO: Implement MongoDB data service
        this.services.data = new MockDataManagementService(this.config.data);
        break;
      case 'postgresql':
        // TODO: Implement PostgreSQL data service
        this.services.data = new MockDataManagementService(this.config.data);
        break;
      default:
        this.services.data = new MockDataManagementService(this.config.data);
    }

    await this.services.data.initialize?.();
  }

  private async initializeUserManagementService(): Promise<void> {
    console.log('[service-registry] Initializing user management service...');
    this.services.user = new MockUserManagementService(this.config.user);
    await this.services.user.initialize?.();
  }

  private async initializeDocumentManagementService(): Promise<void> {
    console.log('[service-registry] Initializing document management service...');
    this.services.document = new MockDocumentManagementService(this.config.document);
    await this.services.document.initialize?.();
  }

  private async initializeNotificationService(): Promise<void> {
    console.log('[service-registry] Initializing notification service...');
    this.services.notification = new MockNotificationService(this.config.notification);
    await this.services.notification.initialize?.();
  }

  private async initializeAuditService(): Promise<void> {
    console.log('[service-registry] Initializing audit service...');
    this.services.audit = new MockAuditService(this.config.audit);
    await this.services.audit.initialize?.();
  }

  private async initializeIntegrationHubService(): Promise<void> {
    console.log('[service-registry] Initializing integration hub service...');
    this.services.integration = new MockIntegrationHubService(this.config.integration);
    await this.services.integration.initialize?.();
  }

  private async initializeComplianceService(): Promise<void> {
    console.log('[service-registry] Initializing compliance service...');
    this.services.compliance = new MockComplianceService(this.config.compliance);
    await this.services.compliance.initialize?.();
  }

  // ============================================================================
  // SERVICE HEALTH CHECK
  // ============================================================================

  async healthCheck(): Promise<Record<string, any>> {
    const healthStatus: Record<string, any> = {};

    for (const [serviceName, service] of Object.entries(this.services)) {
      try {
        if (service && typeof (service as any).healthCheck === 'function') {
          healthStatus[serviceName] = await (service as any).healthCheck();
        } else {
          healthStatus[serviceName] = { status: 'healthy', message: 'No health check available' };
        }
      } catch (error) {
        healthStatus[serviceName] = { 
          status: 'unhealthy', 
          error: error.message 
        };
      }
    }

    return healthStatus;
  }

  // ============================================================================
  // SERVICE REGISTRATION (for dynamic services)
  // ============================================================================

  registerService<T>(serviceName: keyof PlatformServices, service: T): void {
    if (this.services[serviceName]) {
      console.warn(`[service-registry] Overriding existing service: ${serviceName}`);
    }

    this.services[serviceName] = service as any;
    console.log(`[service-registry] Service registered: ${serviceName}`);
  }

  unregisterService(serviceName: keyof PlatformServices): void {
    if (this.services[serviceName]) {
      delete this.services[serviceName];
      console.log(`[service-registry] Service unregistered: ${serviceName}`);
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  isInitialized(): boolean {
    return this.initialized;
  }

  getServiceNames(): string[] {
    return Object.keys(this.services);
  }

  getServiceCount(): number {
    return Object.keys(this.services).length;
  }
}