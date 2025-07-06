// Mock Audit Service Implementation

import {
  AuditService,
  AuditServiceConfig,
  AuditEvent,
  AuditRecord,
  AuditSearchCriteria
} from '../../types/platform-types';

export class MockAuditService implements AuditService {
  private config: AuditServiceConfig;
  private auditLog: AuditRecord[] = [];

  constructor(config: AuditServiceConfig) {
    this.config = config;
  }

  async initialize?(): Promise<void> {
    console.log('[mock-audit-service] Mock audit service initialized');
  }

  async shutdown?(): Promise<void> {
    this.auditLog = [];
    console.log('[mock-audit-service] Mock audit service shutdown');
  }

  // ============================================================================
  // AUDIT LOGGING
  // ============================================================================

  async log(event: AuditEvent): Promise<void> {
    const auditRecord: AuditRecord = {
      id: this.generateId(),
      entityType: event.entityType,
      entityId: event.entityId,
      action: event.action,
      changes: event.changes || {},
      userId: event.userId,
      timestamp: new Date(),
      metadata: event.metadata || {}
    };

    this.auditLog.push(auditRecord);

    console.log('[mock-audit-service] Audit event logged', {
      id: auditRecord.id,
      entityType: event.entityType,
      action: event.action,
      userId: event.userId
    });

    // Apply retention policy
    this.applyRetentionPolicy();
  }

  // ============================================================================
  // AUDIT QUERIES
  // ============================================================================

  async getAuditTrail(entityId: string): Promise<AuditRecord[]> {
    const records = this.auditLog.filter(record => record.entityId === entityId);
    
    // Sort by timestamp descending (newest first)
    records.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    console.log(`[mock-audit-service] Retrieved ${records.length} audit records for entity ${entityId}`);
    return records;
  }

  async search(criteria: AuditSearchCriteria): Promise<AuditRecord[]> {
    let results = [...this.auditLog];

    // Apply filters
    if (criteria.entityType) {
      results = results.filter(record => record.entityType === criteria.entityType);
    }

    if (criteria.entityId) {
      results = results.filter(record => record.entityId === criteria.entityId);
    }

    if (criteria.action) {
      results = results.filter(record => record.action === criteria.action);
    }

    if (criteria.userId) {
      results = results.filter(record => record.userId === criteria.userId);
    }

    if (criteria.dateFrom) {
      results = results.filter(record => record.timestamp >= criteria.dateFrom!);
    }

    if (criteria.dateTo) {
      results = results.filter(record => record.timestamp <= criteria.dateTo!);
    }

    // Sort by timestamp descending
    results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    console.log(`[mock-audit-service] Search returned ${results.length} audit records`);
    return results;
  }

  // ============================================================================
  // AUDIT ANALYTICS
  // ============================================================================

  async getAuditSummary(entityType?: string, timeRange?: { from: Date; to: Date }): Promise<any> {
    let records = [...this.auditLog];

    // Filter by entity type
    if (entityType) {
      records = records.filter(record => record.entityType === entityType);
    }

    // Filter by time range
    if (timeRange) {
      records = records.filter(record => 
        record.timestamp >= timeRange.from && record.timestamp <= timeRange.to
      );
    }

    // Calculate summary statistics
    const summary = {
      totalEvents: records.length,
      uniqueUsers: new Set(records.map(r => r.userId)).size,
      uniqueEntities: new Set(records.map(r => `${r.entityType}:${r.entityId}`)).size,
      actionBreakdown: this.getActionBreakdown(records),
      entityTypeBreakdown: this.getEntityTypeBreakdown(records),
      userActivityBreakdown: this.getUserActivityBreakdown(records),
      timeRange: timeRange || {
        from: records.length > 0 ? Math.min(...records.map(r => r.timestamp.getTime())) : null,
        to: records.length > 0 ? Math.max(...records.map(r => r.timestamp.getTime())) : null
      }
    };

    return summary;
  }

  // ============================================================================
  // COMPLIANCE REPORTING
  // ============================================================================

  async generateComplianceReport(criteria: {
    entityType?: string;
    userId?: string;
    timeRange: { from: Date; to: Date };
  }): Promise<any> {
    const records = await this.search({
      entityType: criteria.entityType,
      userId: criteria.userId,
      dateFrom: criteria.timeRange.from,
      dateTo: criteria.timeRange.to
    });

    const report = {
      reportId: this.generateId(),
      generatedAt: new Date(),
      criteria,
      summary: {
        totalEvents: records.length,
        timespan: criteria.timeRange.to.getTime() - criteria.timeRange.from.getTime(),
        coverage: this.calculateCoverage(records, criteria.timeRange)
      },
      findings: this.analyzeComplianceFindings(records),
      recommendations: this.generateComplianceRecommendations(records)
    };

    console.log('[mock-audit-service] Compliance report generated', {
      reportId: report.reportId,
      totalEvents: report.summary.totalEvents
    });

    return report;
  }

  // ============================================================================
  // HEALTH CHECK
  // ============================================================================

  async healthCheck(): Promise<any> {
    return {
      status: 'healthy',
      totalRecords: this.auditLog.length,
      oldestRecord: this.auditLog.length > 0 ? 
        Math.min(...this.auditLog.map(r => r.timestamp.getTime())) : null,
      newestRecord: this.auditLog.length > 0 ? 
        Math.max(...this.auditLog.map(r => r.timestamp.getTime())) : null,
      retentionPolicy: {
        enabled: this.config.enabled,
        retentionDays: this.config.retentionDays
      }
    };
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private applyRetentionPolicy(): void {
    if (!this.config.enabled || !this.config.retentionDays) {
      return;
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionDays);

    const initialCount = this.auditLog.length;
    this.auditLog = this.auditLog.filter(record => record.timestamp >= cutoffDate);
    
    const removedCount = initialCount - this.auditLog.length;
    if (removedCount > 0) {
      console.log(`[mock-audit-service] Retention policy applied: removed ${removedCount} old records`);
    }
  }

  private getActionBreakdown(records: AuditRecord[]): Record<string, number> {
    const breakdown: Record<string, number> = {};
    records.forEach(record => {
      breakdown[record.action] = (breakdown[record.action] || 0) + 1;
    });
    return breakdown;
  }

  private getEntityTypeBreakdown(records: AuditRecord[]): Record<string, number> {
    const breakdown: Record<string, number> = {};
    records.forEach(record => {
      breakdown[record.entityType] = (breakdown[record.entityType] || 0) + 1;
    });
    return breakdown;
  }

  private getUserActivityBreakdown(records: AuditRecord[]): Record<string, number> {
    const breakdown: Record<string, number> = {};
    records.forEach(record => {
      breakdown[record.userId] = (breakdown[record.userId] || 0) + 1;
    });
    return breakdown;
  }

  private calculateCoverage(records: AuditRecord[], timeRange: { from: Date; to: Date }): number {
    if (records.length === 0) return 0;
    
    const totalTimespan = timeRange.to.getTime() - timeRange.from.getTime();
    const recordedTimespan = Math.max(...records.map(r => r.timestamp.getTime())) - 
                            Math.min(...records.map(r => r.timestamp.getTime()));
    
    return Math.min(1, recordedTimespan / totalTimespan);
  }

  private analyzeComplianceFindings(records: AuditRecord[]): any[] {
    const findings = [];

    // Check for suspicious patterns
    const userActions = this.getUserActivityBreakdown(records);
    for (const [userId, count] of Object.entries(userActions)) {
      if (count > 100) { // Arbitrary threshold
        findings.push({
          type: 'high_activity',
          severity: 'medium',
          description: `User ${userId} has unusually high activity (${count} actions)`,
          userId
        });
      }
    }

    // Check for missing audit trails
    const entityActions = new Map<string, Set<string>>();
    records.forEach(record => {
      const entityKey = `${record.entityType}:${record.entityId}`;
      if (!entityActions.has(entityKey)) {
        entityActions.set(entityKey, new Set());
      }
      entityActions.get(entityKey)!.add(record.action);
    });

    entityActions.forEach((actions, entityKey) => {
      if (actions.has('create') && !actions.has('read')) {
        findings.push({
          type: 'incomplete_trail',
          severity: 'low',
          description: `Entity ${entityKey} was created but never accessed`,
          entity: entityKey
        });
      }
    });

    return findings;
  }

  private generateComplianceRecommendations(records: AuditRecord[]): string[] {
    const recommendations = [];

    if (records.length === 0) {
      recommendations.push('No audit records found - ensure audit logging is properly configured');
    }

    const userCount = new Set(records.map(r => r.userId)).size;
    if (userCount === 1) {
      recommendations.push('Consider implementing multi-user reviews for critical operations');
    }

    const timeGaps = this.findTimeGaps(records);
    if (timeGaps.length > 0) {
      recommendations.push('Review periods with no audit activity to ensure system availability');
    }

    return recommendations;
  }

  private findTimeGaps(records: AuditRecord[]): any[] {
    // Simple gap detection - find periods > 24 hours with no activity
    const gaps = [];
    const sortedRecords = records.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    
    for (let i = 1; i < sortedRecords.length; i++) {
      const gap = sortedRecords[i].timestamp.getTime() - sortedRecords[i - 1].timestamp.getTime();
      if (gap > 24 * 60 * 60 * 1000) { // 24 hours
        gaps.push({
          from: sortedRecords[i - 1].timestamp,
          to: sortedRecords[i].timestamp,
          duration: gap
        });
      }
    }

    return gaps;
  }

  private generateId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}