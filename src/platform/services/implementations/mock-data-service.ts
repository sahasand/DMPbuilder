// Mock Data Management Service Implementation
// In-memory implementation for development and testing

import {
  DataManagementService,
  DataServiceConfig,
  QueryCriteria,
  QueryBuilder,
  AggregationPipeline,
  ValidationResult,
  ImportResult,
  UpdateResult,
  BulkUpdate,
  AuditRecord,
  VersionRecord,
  Study,
  StudyAccess
} from '../../types/platform-types';

export class MockDataManagementService implements DataManagementService {
  private config: DataServiceConfig;
  private data: Map<string, Map<string, any>> = new Map();
  private auditHistory: Map<string, AuditRecord[]> = new Map();
  private versionHistory: Map<string, VersionRecord[]> = new Map();

  constructor(config: DataServiceConfig) {
    this.config = config;
    this.initializeDefaultData();
  }

  async initialize?(): Promise<void> {
    console.log('[mock-data-service] Mock data service initialized');
  }

  async shutdown?(): Promise<void> {
    this.data.clear();
    this.auditHistory.clear();
    this.versionHistory.clear();
    console.log('[mock-data-service] Mock data service shutdown');
  }

  // ============================================================================
  // CRUD OPERATIONS
  // ============================================================================

  async save<T>(entity: string, data: T): Promise<T> {
    if (!this.data.has(entity)) {
      this.data.set(entity, new Map());
    }

    const entityData = this.data.get(entity)!;
    const id = (data as any).id || this.generateId();
    const timestamp = new Date();

    const savedData = {
      ...data,
      id,
      createdAt: (data as any).createdAt || timestamp,
      updatedAt: timestamp,
      version: ((data as any).version || 0) + 1
    };

    entityData.set(id, savedData);

    console.log(`[mock-data-service] Saved ${entity}`, { id });
    return savedData;
  }

  async find<T>(entity: string, criteria: QueryCriteria): Promise<T[]> {
    const entityData = this.data.get(entity);
    if (!entityData) {
      return [];
    }

    let results = Array.from(entityData.values());

    // Apply simple criteria filtering
    if (Object.keys(criteria).length > 0) {
      results = results.filter(item => {
        return Object.entries(criteria).every(([key, value]) => {
          return item[key] === value;
        });
      });
    }

    console.log(`[mock-data-service] Found ${results.length} ${entity} records`);
    return results;
  }

  async findOne<T>(entity: string, id: string): Promise<T> {
    const entityData = this.data.get(entity);
    if (!entityData) {
      throw new Error(`Entity not found: ${entity}`);
    }

    const item = entityData.get(id);
    if (!item) {
      throw new Error(`${entity} not found: ${id}`);
    }

    console.log(`[mock-data-service] Found ${entity}`, { id });
    return item;
  }

  async update<T>(entity: string, id: string, data: Partial<T>): Promise<T> {
    const existing = await this.findOne<T>(entity, id);
    
    const updated = {
      ...existing,
      ...data,
      id,
      updatedAt: new Date(),
      version: ((existing as any).version || 0) + 1
    };

    const entityData = this.data.get(entity)!;
    entityData.set(id, updated);

    console.log(`[mock-data-service] Updated ${entity}`, { id });
    return updated;
  }

  async delete(entity: string, id: string): Promise<void> {
    const entityData = this.data.get(entity);
    if (!entityData) {
      throw new Error(`Entity not found: ${entity}`);
    }

    if (!entityData.has(id)) {
      throw new Error(`${entity} not found: ${id}`);
    }

    entityData.delete(id);
    console.log(`[mock-data-service] Deleted ${entity}`, { id });
  }

  // ============================================================================
  // COMPLEX QUERIES
  // ============================================================================

  async query<T>(entity: string, query: QueryBuilder): Promise<T[]> {
    let results = await this.find<T>(entity, query.where || {});

    // Apply ordering
    if (query.orderBy) {
      const [[field, direction]] = Object.entries(query.orderBy);
      results.sort((a, b) => {
        const aVal = (a as any)[field];
        const bVal = (b as any)[field];
        if (direction === 'desc') {
          return bVal > aVal ? 1 : -1;
        }
        return aVal > bVal ? 1 : -1;
      });
    }

    // Apply pagination
    if (query.offset) {
      results = results.slice(query.offset);
    }
    if (query.limit) {
      results = results.slice(0, query.limit);
    }

    // Apply field selection
    if (query.select) {
      results = results.map(item => {
        const selected: any = {};
        query.select!.forEach(field => {
          selected[field] = (item as any)[field];
        });
        return selected;
      });
    }

    return results;
  }

  async aggregate(entity: string, pipeline: AggregationPipeline): Promise<any> {
    // Simple aggregation implementation
    const data = await this.find(entity, {});
    
    // For now, just return count
    return {
      count: data.length,
      data: data.slice(0, 10) // Return first 10 items
    };
  }

  // ============================================================================
  // VALIDATION
  // ============================================================================

  async validate<T>(data: T, schema: string): Promise<ValidationResult> {
    // Simple validation - always pass for mock
    return {
      isValid: true,
      errors: [],
      warnings: []
    };
  }

  // ============================================================================
  // BULK OPERATIONS
  // ============================================================================

  async bulkImport<T>(entity: string, data: T[]): Promise<ImportResult> {
    let successCount = 0;
    const errors: string[] = [];

    for (const item of data) {
      try {
        await this.save(entity, item);
        successCount++;
      } catch (error) {
        errors.push(error.message);
      }
    }

    return {
      totalRecords: data.length,
      successCount,
      failureCount: data.length - successCount,
      errors
    };
  }

  async bulkUpdate<T>(entity: string, updates: BulkUpdate[]): Promise<UpdateResult> {
    let modifiedCount = 0;
    const errors: string[] = [];

    for (const update of updates) {
      try {
        await this.update(entity, update.id, update.data);
        modifiedCount++;
      } catch (error) {
        errors.push(error.message);
      }
    }

    return {
      modifiedCount,
      errors
    };
  }

  // ============================================================================
  // RELATIONSHIPS
  // ============================================================================

  async getStudyWithRelations(studyId: string, relations: string[]): Promise<Study> {
    const study = await this.findOne<Study>('Study', studyId);
    
    // Load related entities
    for (const relation of relations) {
      switch (relation) {
        case 'protocol':
          try {
            const protocols = await this.find('Protocol', { studyId });
            study.protocol = protocols[0];
          } catch (error) {
            // Relation not found
          }
          break;
        
        case 'sites':
          try {
            study.sites = await this.find('Site', { studyId });
          } catch (error) {
            study.sites = [];
          }
          break;
        
        case 'personnel':
          try {
            study.personnel = await this.find('Personnel', { studyId });
          } catch (error) {
            study.personnel = [];
          }
          break;
        
        case 'timeline':
          try {
            const timelines = await this.find('Timeline', { studyId });
            study.timeline = timelines[0];
          } catch (error) {
            // Timeline not found
          }
          break;
      }
    }

    return study;
  }

  // ============================================================================
  // AUDIT AND VERSIONING
  // ============================================================================

  async getAuditHistory(entity: string, id: string): Promise<AuditRecord[]> {
    const key = `${entity}:${id}`;
    return this.auditHistory.get(key) || [];
  }

  async getVersionHistory(entity: string, id: string): Promise<VersionRecord[]> {
    const key = `${entity}:${id}`;
    return this.versionHistory.get(key) || [];
  }

  // ============================================================================
  // HEALTH CHECK
  // ============================================================================

  async healthCheck(): Promise<any> {
    return {
      status: 'healthy',
      entities: this.data.size,
      totalRecords: Array.from(this.data.values()).reduce((sum, entityMap) => sum + entityMap.size, 0)
    };
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private initializeDefaultData(): void {
    // Initialize with some default data for testing
    this.data.set('Study', new Map());
    this.data.set('Protocol', new Map());
    this.data.set('DMP', new Map());
    this.data.set('RiskAssessment', new Map());
    this.data.set('Timeline', new Map());
    this.data.set('QualityPlan', new Map());
    
    console.log('[mock-data-service] Default data structures initialized');
  }

  private generateId(): string {
    return `id_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}