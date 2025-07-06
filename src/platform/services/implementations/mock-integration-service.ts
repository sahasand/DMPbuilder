// Mock Integration Hub Service Implementation

import {
  IntegrationHubService,
  IntegrationServiceConfig,
  Integration,
  IntegrationConfig,
  SyncResult
} from '../../types/platform-types';

export class MockIntegrationHubService implements IntegrationHubService {
  private config: IntegrationServiceConfig;
  private integrations: Map<string, Integration> = new Map();

  constructor(config: IntegrationServiceConfig) {
    this.config = config;
  }

  async initialize?(): Promise<void> {
    console.log('[mock-integration-service] Mock integration service initialized');
  }

  async shutdown?(): Promise<void> {
    this.integrations.clear();
    console.log('[mock-integration-service] Mock integration service shutdown');
  }

  async connect(system: string, config: IntegrationConfig): Promise<Integration> {
    const integration: Integration = {
      id: this.generateId(),
      name: system,
      type: system,
      status: 'active',
      config,
      lastSync: new Date()
    };

    this.integrations.set(integration.id, integration);

    console.log('[mock-integration-service] Integration connected', { system, id: integration.id });
    return integration;
  }

  async disconnect(integrationId: string): Promise<void> {
    const integration = this.integrations.get(integrationId);
    if (integration) {
      integration.status = 'inactive';
      console.log('[mock-integration-service] Integration disconnected', { integrationId });
    }
  }

  async getIntegrations(): Promise<Integration[]> {
    return Array.from(this.integrations.values());
  }

  async sync(integrationId: string): Promise<SyncResult> {
    const integration = this.integrations.get(integrationId);
    if (!integration) {
      throw new Error(`Integration not found: ${integrationId}`);
    }

    // Mock sync operation
    const result: SyncResult = {
      success: true,
      recordsProcessed: Math.floor(Math.random() * 100),
      errors: [],
      syncTime: new Date()
    };

    integration.lastSync = result.syncTime;

    console.log('[mock-integration-service] Sync completed', {
      integrationId,
      recordsProcessed: result.recordsProcessed
    });

    return result;
  }

  async healthCheck(): Promise<any> {
    const integrations = Array.from(this.integrations.values());
    return {
      status: 'healthy',
      totalIntegrations: integrations.length,
      activeIntegrations: integrations.filter(i => i.status === 'active').length,
      recentSyncs: integrations.filter(i => 
        i.lastSync && (Date.now() - i.lastSync.getTime()) < 24 * 60 * 60 * 1000
      ).length
    };
  }

  private generateId(): string {
    return `int_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}