// In-Memory Cache Service Implementation

import { CacheService } from '../../types/platform-types';

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class InMemoryCacheService implements CacheService {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  async initialize?(): Promise<void> {
    // Start cleanup interval every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);

    console.log('[memory-cache-service] In-memory cache service initialized');
  }

  async shutdown?(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.cache.clear();
    console.log('[memory-cache-service] In-memory cache service shutdown');
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.value;
  }

  async set<T>(key: string, value: T, ttl: number = 3600): Promise<void> {
    const expiresAt = Date.now() + (ttl * 1000);
    
    this.cache.set(key, {
      value,
      expiresAt
    });
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }

  async healthCheck(): Promise<any> {
    const now = Date.now();
    const activeEntries = Array.from(this.cache.values()).filter(entry => entry.expiresAt > now);
    const expiredEntries = this.cache.size - activeEntries.length;

    return {
      status: 'healthy',
      totalEntries: this.cache.size,
      activeEntries: activeEntries.length,
      expiredEntries
    };
  }

  // Cache statistics
  getStats(): any {
    const now = Date.now();
    const entries = Array.from(this.cache.values());
    const activeEntries = entries.filter(entry => entry.expiresAt > now);
    const expiredEntries = entries.length - activeEntries.length;

    return {
      totalEntries: this.cache.size,
      activeEntries: activeEntries.length,
      expiredEntries,
      memoryUsage: this.estimateMemoryUsage()
    };
  }

  private cleanup(): void {
    const now = Date.now();
    let removedCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        removedCount++;
      }
    }

    if (removedCount > 0) {
      console.log(`[memory-cache-service] Cleaned up ${removedCount} expired cache entries`);
    }
  }

  private estimateMemoryUsage(): number {
    // Simple memory usage estimation
    let totalSize = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      totalSize += key.length * 2; // UTF-16 encoding
      totalSize += this.estimateObjectSize(entry.value);
      totalSize += 8; // expiresAt timestamp
    }

    return totalSize;
  }

  private estimateObjectSize(obj: any): number {
    const type = typeof obj;
    
    switch (type) {
      case 'string':
        return obj.length * 2; // UTF-16 encoding
      case 'number':
        return 8;
      case 'boolean':
        return 4;
      case 'object':
        if (obj === null) return 4;
        if (Array.isArray(obj)) {
          return obj.reduce((sum, item) => sum + this.estimateObjectSize(item), 0);
        }
        return Object.entries(obj).reduce((sum, [key, value]) => {
          return sum + key.length * 2 + this.estimateObjectSize(value);
        }, 0);
      default:
        return 8; // fallback
    }
  }
}