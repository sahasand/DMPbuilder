// Mock Compliance Service Implementation

import {
  ComplianceService,
  ComplianceServiceConfig,
  ComplianceResult,
  AuditRecord,
  ElectronicSignature,
  User
} from '../../types/platform-types';

export class MockComplianceService implements ComplianceService {
  private config: ComplianceServiceConfig;
  private auditTrails: Map<string, AuditRecord[]> = new Map();
  private signatures: Map<string, ElectronicSignature[]> = new Map();

  constructor(config: ComplianceServiceConfig) {
    this.config = config;
  }

  async initialize?(): Promise<void> {
    console.log('[mock-compliance-service] Mock compliance service initialized');
  }

  async shutdown?(): Promise<void> {
    this.auditTrails.clear();
    this.signatures.clear();
    console.log('[mock-compliance-service] Mock compliance service shutdown');
  }

  async validateGCPCompliance(data: any): Promise<ComplianceResult> {
    // Mock GCP compliance validation
    const violations: string[] = [];
    const recommendations: string[] = [];

    // Check for basic GCP requirements
    if (!data.protocol) {
      violations.push('Protocol document is required for GCP compliance');
    }

    if (!data.auditTrail || data.auditTrail.length === 0) {
      violations.push('Audit trail is required for GCP compliance');
    }

    if (!data.investigators || data.investigators.length === 0) {
      recommendations.push('Consider documenting principal investigators');
    }

    const score = Math.max(0, 1 - (violations.length * 0.3) - (recommendations.length * 0.1));

    return {
      isCompliant: violations.length === 0,
      violations,
      recommendations,
      score
    };
  }

  async validate21CFRPart11(data: any): Promise<ComplianceResult> {
    // Mock 21 CFR Part 11 compliance validation
    const violations: string[] = [];
    const recommendations: string[] = [];

    // Check for electronic signature requirements
    if (this.config.signatureRequired && !data.electronicSignature) {
      violations.push('Electronic signature is required for 21 CFR Part 11 compliance');
    }

    // Check for audit trail requirements
    if (!data.auditTrail) {
      violations.push('Complete audit trail is required for 21 CFR Part 11 compliance');
    }

    // Check for data integrity
    if (!data.dataIntegrityChecks) {
      recommendations.push('Implement data integrity validation checks');
    }

    const score = Math.max(0, 1 - (violations.length * 0.4) - (recommendations.length * 0.1));

    return {
      isCompliant: violations.length === 0,
      violations,
      recommendations,
      score
    };
  }

  async validateGDPRCompliance(data: any): Promise<ComplianceResult> {
    // Mock GDPR compliance validation
    const violations: string[] = [];
    const recommendations: string[] = [];

    // Check for consent management
    if (!data.consentRecords) {
      violations.push('Consent records are required for GDPR compliance');
    }

    // Check for data retention policies
    if (!data.retentionPolicy) {
      violations.push('Data retention policy is required for GDPR compliance');
    }

    // Check for data subject rights
    if (!data.dataSubjectRights) {
      recommendations.push('Document data subject rights procedures');
    }

    // Check for privacy by design
    if (!data.privacyByDesign) {
      recommendations.push('Implement privacy by design principles');
    }

    const score = Math.max(0, 1 - (violations.length * 0.3) - (recommendations.length * 0.1));

    return {
      isCompliant: violations.length === 0,
      violations,
      recommendations,
      score
    };
  }

  async createAuditTrail(action: string, data: any): Promise<AuditRecord> {
    const auditRecord: AuditRecord = {
      id: this.generateId(),
      entityType: data.entityType || 'unknown',
      entityId: data.entityId || 'unknown',
      action,
      changes: data.changes || {},
      userId: data.userId || 'system',
      timestamp: new Date(),
      metadata: {
        ipAddress: '127.0.0.1',
        userAgent: 'Platform Engine',
        sessionId: data.sessionId || 'unknown'
      }
    };

    const entityKey = `${auditRecord.entityType}:${auditRecord.entityId}`;
    if (!this.auditTrails.has(entityKey)) {
      this.auditTrails.set(entityKey, []);
    }
    this.auditTrails.get(entityKey)!.push(auditRecord);

    console.log('[mock-compliance-service] Audit trail record created', {
      id: auditRecord.id,
      action,
      entityType: auditRecord.entityType
    });

    return auditRecord;
  }

  async createElectronicSignature(document: any, user: User): Promise<ElectronicSignature> {
    const signature: ElectronicSignature = {
      id: this.generateId(),
      documentId: document.id || 'unknown',
      userId: user.id,
      signatureData: this.generateSignatureData(document, user),
      timestamp: new Date(),
      reason: document.signatureReason || 'Document approval'
    };

    if (!this.signatures.has(signature.documentId)) {
      this.signatures.set(signature.documentId, []);
    }
    this.signatures.get(signature.documentId)!.push(signature);

    console.log('[mock-compliance-service] Electronic signature created', {
      id: signature.id,
      documentId: signature.documentId,
      userId: user.id
    });

    return signature;
  }

  async validateElectronicSignature(signature: ElectronicSignature): Promise<boolean> {
    // Mock signature validation
    const documentSignatures = this.signatures.get(signature.documentId) || [];
    const storedSignature = documentSignatures.find(s => s.id === signature.id);

    if (!storedSignature) {
      return false;
    }

    // Simple validation - check if signature data matches
    const isValid = storedSignature.signatureData === signature.signatureData;

    console.log('[mock-compliance-service] Electronic signature validated', {
      signatureId: signature.id,
      isValid
    });

    return isValid;
  }

  async getComplianceSummary(entityId: string): Promise<any> {
    const auditRecords = this.auditTrails.get(entityId) || [];
    const signatures = this.signatures.get(entityId) || [];

    return {
      entityId,
      auditTrailCount: auditRecords.length,
      signatureCount: signatures.length,
      lastActivity: auditRecords.length > 0 ? 
        Math.max(...auditRecords.map(r => r.timestamp.getTime())) : null,
      complianceChecks: {
        gcp: await this.validateGCPCompliance({ auditTrail: auditRecords }),
        cfr21: await this.validate21CFRPart11({ 
          auditTrail: auditRecords, 
          electronicSignature: signatures.length > 0 
        }),
        gdpr: await this.validateGDPRCompliance({ 
          auditTrail: auditRecords,
          consentRecords: true, // Mock
          retentionPolicy: true // Mock
        })
      }
    };
  }

  async healthCheck(): Promise<any> {
    return {
      status: 'healthy',
      totalAuditTrails: this.auditTrails.size,
      totalSignatures: Array.from(this.signatures.values())
        .reduce((sum, sigs) => sum + sigs.length, 0),
      complianceFrameworks: this.config.frameworks || ['GCP', '21CFR11', 'GDPR']
    };
  }

  private generateSignatureData(document: any, user: User): string {
    // Generate a mock signature hash
    const data = `${document.id}:${user.id}:${Date.now()}`;
    return Buffer.from(data).toString('base64');
  }

  private generateId(): string {
    return `comp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}