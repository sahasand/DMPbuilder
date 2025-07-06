// Mock Document Management Service Implementation

import {
  DocumentManagementService,
  DocumentServiceConfig,
  Document,
  DocumentMetadata,
  DocumentVersion,
  DocumentSearchCriteria,
  DocumentPermissions
} from '../../types/platform-types';

export class MockDocumentManagementService implements DocumentManagementService {
  private config: DocumentServiceConfig;
  private documents: Map<string, Document> = new Map();
  private metadata: Map<string, DocumentMetadata> = new Map();
  private versions: Map<string, DocumentVersion[]> = new Map();

  constructor(config: DocumentServiceConfig) {
    this.config = config;
  }

  async initialize?(): Promise<void> {
    console.log('[mock-document-service] Mock document service initialized');
  }

  async shutdown?(): Promise<void> {
    this.documents.clear();
    this.metadata.clear();
    this.versions.clear();
    console.log('[mock-document-service] Mock document service shutdown');
  }

  async store(document: Document): Promise<DocumentMetadata> {
    const id = document.id || this.generateId();
    const now = new Date();

    const metadata: DocumentMetadata = {
      id,
      name: document.name,
      type: document.type,
      size: this.calculateSize(document.content),
      contentType: document.type,
      version: 1,
      createdAt: now,
      createdBy: 'system',
      updatedAt: now,
      updatedBy: 'system',
      tags: [],
      permissions: { read: ['*'], write: ['admin'], admin: ['admin'] }
    };

    this.documents.set(id, { ...document, id });
    this.metadata.set(id, metadata);
    this.versions.set(id, []);

    console.log('[mock-document-service] Document stored', { id, name: document.name });
    return metadata;
  }

  async retrieve(documentId: string): Promise<Document> {
    const document = this.documents.get(documentId);
    if (!document) {
      throw new Error(`Document not found: ${documentId}`);
    }
    return document;
  }

  async update(documentId: string, document: Partial<Document>): Promise<DocumentMetadata> {
    const existing = await this.retrieve(documentId);
    const existingMetadata = this.metadata.get(documentId)!;

    const updated = { ...existing, ...document };
    const updatedMetadata = {
      ...existingMetadata,
      version: existingMetadata.version + 1,
      updatedAt: new Date(),
      updatedBy: 'system'
    };

    this.documents.set(documentId, updated);
    this.metadata.set(documentId, updatedMetadata);

    return updatedMetadata;
  }

  async delete(documentId: string): Promise<void> {
    this.documents.delete(documentId);
    this.metadata.delete(documentId);
    this.versions.delete(documentId);
    console.log('[mock-document-service] Document deleted', { documentId });
  }

  async createVersion(documentId: string): Promise<DocumentVersion> {
    const metadata = this.metadata.get(documentId);
    if (!metadata) {
      throw new Error(`Document not found: ${documentId}`);
    }

    const version: DocumentVersion = {
      version: metadata.version,
      documentId,
      createdAt: new Date(),
      createdBy: 'system',
      changes: 'Version created'
    };

    if (!this.versions.has(documentId)) {
      this.versions.set(documentId, []);
    }
    this.versions.get(documentId)!.push(version);

    return version;
  }

  async getVersions(documentId: string): Promise<DocumentVersion[]> {
    return this.versions.get(documentId) || [];
  }

  async search(criteria: DocumentSearchCriteria): Promise<DocumentMetadata[]> {
    let results = Array.from(this.metadata.values());

    if (criteria.name) {
      results = results.filter(doc => doc.name.includes(criteria.name!));
    }

    if (criteria.type) {
      results = results.filter(doc => doc.type === criteria.type);
    }

    if (criteria.tags && criteria.tags.length > 0) {
      results = results.filter(doc => 
        criteria.tags!.some(tag => doc.tags.includes(tag))
      );
    }

    if (criteria.createdAfter) {
      results = results.filter(doc => doc.createdAt >= criteria.createdAfter!);
    }

    if (criteria.createdBefore) {
      results = results.filter(doc => doc.createdAt <= criteria.createdBefore!);
    }

    return results;
  }

  async setPermissions(documentId: string, permissions: DocumentPermissions): Promise<void> {
    const metadata = this.metadata.get(documentId);
    if (!metadata) {
      throw new Error(`Document not found: ${documentId}`);
    }

    metadata.permissions = permissions;
    console.log('[mock-document-service] Permissions updated', { documentId });
  }

  async getPermissions(documentId: string): Promise<DocumentPermissions> {
    const metadata = this.metadata.get(documentId);
    if (!metadata) {
      throw new Error(`Document not found: ${documentId}`);
    }

    return metadata.permissions;
  }

  async healthCheck(): Promise<any> {
    return {
      status: 'healthy',
      totalDocuments: this.documents.size,
      totalVersions: Array.from(this.versions.values()).reduce((sum, versions) => sum + versions.length, 0)
    };
  }

  private calculateSize(content: Buffer | string): number {
    if (Buffer.isBuffer(content)) {
      return content.length;
    }
    return Buffer.byteLength(content, 'utf8');
  }

  private generateId(): string {
    return `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}