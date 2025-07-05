import { DocumentChunker, ChunkMetadata } from '../utils/document-chunker';
import { AnthropicClient } from './anthropic-client';
import { GeminiClient } from './gemini-client';
import { createModuleLogger, measurePerformance } from '../utils/logger';
import { StudyProtocol, CRFSpecification } from '../types';

const logger = createModuleLogger('hybrid-processor');

export interface HybridProcessingOptions {
  preferredModel?: 'claude' | 'gemini';
  enhanceCriticalSections?: boolean;
  maxClaudeChunks?: number;
  chunkingStrategy?: 'auto' | 'conservative' | 'aggressive';
}

export interface ProcessingResult<T> {
  result: T;
  metadata: {
    totalChunks: number;
    modelUsage: {
      claude: number;
      gemini: number;
    };
    processingTime: number;
    enhancedSections?: string[];
  };
}

/**
 * Hybrid AI processor that intelligently routes document chunks to appropriate models
 */
export class HybridAIProcessor {
  private chunker: DocumentChunker;
  private claudeClient: AnthropicClient;
  private geminiClient: GeminiClient;
  
  constructor() {
    this.chunker = new DocumentChunker();
    this.claudeClient = new AnthropicClient();
    this.geminiClient = new GeminiClient();
  }
  
  /**
   * Process clinical protocol with hybrid approach
   */
  async processProtocol(
    protocolText: string, 
    documentName: string,
    options: HybridProcessingOptions = {}
  ): Promise<ProcessingResult<StudyProtocol>> {
    const startTime = Date.now();
    const modelUsage = { claude: 0, gemini: 0 };
    const enhancedSections: string[] = [];
    
    try {
      // Analyze document to determine processing strategy
      const analysis = this.chunker.analyzeDocument(protocolText, 'protocol');
      logger.info('Protocol analysis', {
        documentName,
        totalTokens: analysis.totalTokens,
        estimatedChunks: analysis.estimatedChunks,
        recommendedModel: analysis.recommendedModel
      });
      
      // For small documents, use Claude directly
      if (analysis.totalTokens < 80000 && options.preferredModel !== 'gemini') {
        logger.info('Using Claude for full protocol processing');
        modelUsage.claude = 1;
        
        const result = await measurePerformance(
          'hybrid.claude.protocol',
          () => this.claudeClient.processProtocol(protocolText)
        );
        
        return {
          result,
          metadata: {
            totalChunks: 1,
            modelUsage,
            processingTime: Date.now() - startTime,
          }
        };
      }
      
      // For large documents, use Gemini as primary processor
      logger.info('Using Gemini for full protocol processing');
      modelUsage.gemini = 1;
      
      const geminiResult = await measurePerformance(
        'hybrid.gemini.protocol',
        () => this.geminiClient.processProtocol(protocolText)
      );
      
      // Enhance critical sections with Claude if requested
      if (options.enhanceCriticalSections !== false) {
        const criticalEnhancements = await this.enhanceCriticalProtocolSections(
          geminiResult,
          protocolText,
          enhancedSections
        );
        
        if (criticalEnhancements.enhanced) {
          modelUsage.claude += criticalEnhancements.sectionsProcessed;
          Object.assign(geminiResult, criticalEnhancements.updates);
        }
      }
      
      return {
        result: geminiResult,
        metadata: {
          totalChunks: 1,
          modelUsage,
          processingTime: Date.now() - startTime,
          enhancedSections,
        }
      };
    } catch (error) {
      logger.error('Hybrid protocol processing failed', { error });
      throw error;
    }
  }
  
  /**
   * Process CRF with hybrid approach
   */
  async processCRF(
    crfText: string,
    documentName: string,
    options: HybridProcessingOptions = {}
  ): Promise<ProcessingResult<CRFSpecification[]>> {
    const startTime = Date.now();
    const modelUsage = { claude: 0, gemini: 0 };
    
    try {
      // Analyze document
      const analysis = this.chunker.analyzeDocument(crfText, 'crf');
      
      // For CRFs, prefer Gemini due to structured nature and potential size
      logger.info('Using Gemini for CRF processing');
      modelUsage.gemini = 1;
      
      const result = await measurePerformance(
        'hybrid.gemini.crf',
        () => this.geminiClient.processCRF(crfText)
      );
      
      return {
        result,
        metadata: {
          totalChunks: 1,
          modelUsage,
          processingTime: Date.now() - startTime,
        }
      };
    } catch (error) {
      logger.error('Hybrid CRF processing failed', { error });
      throw error;
    }
  }
  
  /**
   * Process documents in chunks with intelligent model routing
   */
  async processWithChunking<T>(
    text: string,
    documentType: 'protocol' | 'crf',
    documentName: string,
    processFunc: (chunk: string, metadata: ChunkMetadata) => Promise<Partial<T>>,
    mergeFunc: (results: Partial<T>[]) => T,
    options: HybridProcessingOptions = {}
  ): Promise<ProcessingResult<T>> {
    const startTime = Date.now();
    const modelUsage = { claude: 0, gemini: 0 };
    
    try {
      // Create chunks based on document type
      const chunks = documentType === 'protocol' 
        ? await this.chunker.chunkProtocol(text, documentName, {
            maxTokensPerChunk: options.chunkingStrategy === 'conservative' ? 50000 : 80000,
            modelPreference: options.preferredModel
          })
        : await this.chunker.chunkCRF(text, documentName, {
            maxTokensPerChunk: options.chunkingStrategy === 'conservative' ? 50000 : 80000,
            modelPreference: options.preferredModel
          });
      
      logger.info('Document chunked', {
        documentName,
        totalChunks: chunks.length,
        chunkSizes: chunks.map(c => c.tokenCount)
      });
      
      // Process chunks in parallel where possible
      const results: Partial<T>[] = [];
      const maxClaudeChunks = options.maxClaudeChunks ?? 3;
      let claudeChunksUsed = 0;
      
      for (const chunk of chunks) {
        // Determine which model to use
        const useClaudeForChunk = this.shouldUseClaudeForChunk(
          chunk,
          claudeChunksUsed,
          maxClaudeChunks,
          options.preferredModel
        );
        
        if (useClaudeForChunk) {
          modelUsage.claude++;
          claudeChunksUsed++;
        } else {
          modelUsage.gemini++;
        }
        
        const result = await processFunc(chunk.content, chunk);
        results.push(result);
      }
      
      // Merge results
      const finalResult = mergeFunc(results);
      
      return {
        result: finalResult,
        metadata: {
          totalChunks: chunks.length,
          modelUsage,
          processingTime: Date.now() - startTime,
        }
      };
    } catch (error) {
      logger.error('Chunked processing failed', { error });
      throw error;
    }
  }
  
  /**
   * Enhance critical protocol sections with Claude
   */
  private async enhanceCriticalProtocolSections(
    protocol: StudyProtocol,
    originalText: string,
    enhancedSections: string[]
  ): Promise<{ enhanced: boolean; sectionsProcessed: number; updates: Partial<StudyProtocol> }> {
    const updates: Partial<StudyProtocol> = {};
    let sectionsProcessed = 0;
    
    try {
      // Extract critical sections from original text
      const sections = this.extractProtocolSections(originalText);
      
      // Enhance endpoints
      if (sections.endpoints) {
        const enhanced = await this.claudeClient.enhanceSection(
          sections.endpoints,
          'endpoints',
          `Study: ${protocol.studyTitle}\nPhase: ${protocol.studyPhase}`
        );
        
        // Parse enhanced endpoints back into structure
        const enhancedEndpoints = this.parseEnhancedEndpoints(enhanced);
        if (enhancedEndpoints) {
          updates.endpoints = enhancedEndpoints;
          enhancedSections.push('endpoints');
          sectionsProcessed++;
        }
      }
      
      // Enhance inclusion/exclusion criteria
      if (sections.criteria) {
        const enhanced = await this.claudeClient.enhanceSection(
          sections.criteria,
          'inclusion_exclusion',
          `Study Population: ${protocol.population?.description || 'Not specified'}`
        );
        
        const enhancedCriteria = this.parseEnhancedCriteria(enhanced);
        if (enhancedCriteria) {
          updates.inclusionCriteria = enhancedCriteria.inclusion;
          updates.exclusionCriteria = enhancedCriteria.exclusion;
          enhancedSections.push('inclusion_exclusion');
          sectionsProcessed++;
        }
      }
      
      return { 
        enhanced: sectionsProcessed > 0, 
        sectionsProcessed,
        updates 
      };
    } catch (error) {
      logger.warn('Failed to enhance critical sections', { error });
      return { enhanced: false, sectionsProcessed: 0, updates: {} };
    }
  }
  
  /**
   * Determine if Claude should be used for a specific chunk
   */
  private shouldUseClaudeForChunk(
    chunk: ChunkMetadata,
    claudeChunksUsed: number,
    maxClaudeChunks: number,
    preferredModel?: 'claude' | 'gemini'
  ): boolean {
    // Respect max Claude chunks limit
    if (claudeChunksUsed >= maxClaudeChunks) {
      return false;
    }
    
    // Respect preferred model if specified
    if (preferredModel === 'gemini') {
      return false;
    }
    
    // Use Claude for small, critical chunks
    if (chunk.tokenCount <= 80000) {
      const criticalSections = ['endpoints', 'safety', 'inclusion', 'exclusion', 'primary', 'secondary'];
      const isCritical = criticalSections.some(section => 
        chunk.sectionName.toLowerCase().includes(section)
      );
      
      if (isCritical || preferredModel === 'claude') {
        return true;
      }
    }
    
    // Default to Gemini for large chunks
    return false;
  }
  
  /**
   * Extract key sections from protocol text
   */
  private extractProtocolSections(text: string): Record<string, string> {
    const sections: Record<string, string> = {};
    const lines = text.split('\n');
    
    let currentSection = '';
    let currentContent: string[] = [];
    
    const sectionMarkers = {
      endpoints: /^(\d+\.?\s*)?(primary|secondary|endpoints|outcome)/i,
      criteria: /^(\d+\.?\s*)?(inclusion|exclusion|eligibility|criteria)/i,
      safety: /^(\d+\.?\s*)?(safety|adverse|pharmacovigilance)/i,
      procedures: /^(\d+\.?\s*)?(procedures|assessments|visits)/i,
    };
    
    for (const line of lines) {
      for (const [section, pattern] of Object.entries(sectionMarkers)) {
        if (pattern.test(line)) {
          // Save previous section
          if (currentSection && currentContent.length > 0) {
            sections[currentSection] = currentContent.join('\n').trim();
          }
          
          currentSection = section;
          currentContent = [line];
          break;
        }
      }
      
      if (currentSection) {
        currentContent.push(line);
      }
    }
    
    // Save last section
    if (currentSection && currentContent.length > 0) {
      sections[currentSection] = currentContent.join('\n').trim();
    }
    
    return sections;
  }
  
  /**
   * Parse enhanced endpoints from Claude's response
   */
  private parseEnhancedEndpoints(enhanced: string): StudyProtocol['endpoints'] | null {
    try {
      // Simple parsing - in production, use more sophisticated parsing
      const endpoints: StudyProtocol['endpoints'] = {
        primary: [],
        secondary: [],
        exploratory: []
      };
      
      const lines = enhanced.split('\n');
      let currentType: 'primary' | 'secondary' | 'exploratory' = 'primary';
      
      for (const line of lines) {
        if (line.toLowerCase().includes('primary')) {
          currentType = 'primary';
        } else if (line.toLowerCase().includes('secondary')) {
          currentType = 'secondary';
        } else if (line.toLowerCase().includes('exploratory')) {
          currentType = 'exploratory';
        } else if (line.trim() && !line.startsWith('#')) {
          endpoints[currentType].push({
            name: line.trim(),
            description: line.trim(),
            timepoint: 'As specified in protocol'
          });
        }
      }
      
      return endpoints;
    } catch (error) {
      logger.error('Failed to parse enhanced endpoints', { error });
      return null;
    }
  }
  
  /**
   * Parse enhanced criteria from Claude's response
   */
  private parseEnhancedCriteria(enhanced: string): { inclusion: string[]; exclusion: string[] } | null {
    try {
      const criteria = {
        inclusion: [] as string[],
        exclusion: [] as string[]
      };
      
      const lines = enhanced.split('\n');
      let currentType: 'inclusion' | 'exclusion' = 'inclusion';
      
      for (const line of lines) {
        if (line.toLowerCase().includes('inclusion')) {
          currentType = 'inclusion';
        } else if (line.toLowerCase().includes('exclusion')) {
          currentType = 'exclusion';
        } else if (line.trim() && !line.startsWith('#')) {
          criteria[currentType].push(line.trim());
        }
      }
      
      return criteria;
    } catch (error) {
      logger.error('Failed to parse enhanced criteria', { error });
      return null;
    }
  }
}

// Export singleton instance
export const hybridProcessor = new HybridAIProcessor();

// Export factory function for custom configurations
export function createHybridProcessor(): HybridAIProcessor {
  return new HybridAIProcessor();
}