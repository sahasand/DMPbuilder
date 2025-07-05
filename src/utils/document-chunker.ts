import { encode } from 'gpt-tokenizer';

/**
 * Interface for tracking metadata about each document chunk
 */
export interface ChunkMetadata {
  chunkId: string;
  documentType: 'protocol' | 'crf';
  documentName: string;
  sectionName: string;
  sectionType?: string;
  position: {
    start: number;
    end: number;
    totalChunks: number;
    chunkIndex: number;
  };
  tokenCount: number;
  hasOverlap: boolean;
  overlapTokens?: number;
  suggestedModel: 'claude' | 'gemini';
  contentPreview: string;
  relatedSections?: string[];
}

/**
 * Configuration for chunking behavior
 */
interface ChunkingConfig {
  maxTokensPerChunk: number;
  overlapTokens: number;
  preserveSectionIntegrity: boolean;
  modelPreference: 'claude' | 'gemini' | 'auto';
}

/**
 * Section boundary markers for clinical documents
 */
interface SectionMarkers {
  protocol: string[];
  crf: string[];
}

/**
 * Document section with metadata
 */
interface DocumentSection {
  title: string;
  content: string;
  type?: string;
  subsections?: DocumentSection[];
  tokenCount: number;
}

export class DocumentChunker {
  private static readonly MODEL_LIMITS = {
    claude: {
      maxTokens: 100000,
      optimalTokens: 80000,
      contextWindow: 100000
    },
    gemini: {
      maxTokens: 2000000,
      optimalTokens: 1500000,
      contextWindow: 2097152
    }
  };

  private static readonly DEFAULT_CONFIG: ChunkingConfig = {
    maxTokensPerChunk: 80000,
    overlapTokens: 500,
    preserveSectionIntegrity: true,
    modelPreference: 'auto'
  };

  private static readonly SECTION_MARKERS: SectionMarkers = {
    protocol: [
      // Primary protocol sections
      'PROTOCOL SYNOPSIS',
      'STUDY OBJECTIVES',
      'STUDY DESIGN',
      'STUDY POPULATION',
      'INCLUSION CRITERIA',
      'EXCLUSION CRITERIA',
      'STUDY PROCEDURES',
      'STUDY ENDPOINTS',
      'STATISTICAL ANALYSIS',
      'SAFETY MONITORING',
      'DATA MANAGEMENT',
      'QUALITY ASSURANCE',
      'ETHICS AND REGULATORY',
      'REFERENCES',
      'APPENDICES',
      // Secondary markers
      'PRIMARY OBJECTIVE',
      'SECONDARY OBJECTIVE',
      'EXPLORATORY OBJECTIVE',
      'SAMPLE SIZE',
      'RANDOMIZATION',
      'BLINDING',
      'INTERVENTION',
      'CONCOMITANT MEDICATIONS',
      'ADVERSE EVENTS',
      'SERIOUS ADVERSE EVENTS',
      'DATA AND SAFETY MONITORING',
      'PROTOCOL AMENDMENTS'
    ],
    crf: [
      // CRF form sections
      'DEMOGRAPHICS',
      'MEDICAL HISTORY',
      'PHYSICAL EXAMINATION',
      'VITAL SIGNS',
      'LABORATORY TESTS',
      'CONCOMITANT MEDICATIONS',
      'ADVERSE EVENTS',
      'STUDY DRUG ADMINISTRATION',
      'EFFICACY ASSESSMENTS',
      'SAFETY ASSESSMENTS',
      'PROTOCOL DEVIATIONS',
      'STUDY COMPLETION',
      'EARLY TERMINATION',
      // Form-specific markers
      'VISIT',
      'SCREENING',
      'BASELINE',
      'TREATMENT',
      'FOLLOW-UP',
      'END OF STUDY',
      'UNSCHEDULED VISIT'
    ]
  };

  private config: ChunkingConfig;

  constructor(config: Partial<ChunkingConfig> = {}) {
    this.config = { ...DocumentChunker.DEFAULT_CONFIG, ...config };
  }

  /**
   * Chunk a clinical protocol document
   */
  public async chunkProtocol(
    content: string,
    documentName: string,
    options: Partial<ChunkingConfig> = {}
  ): Promise<ChunkMetadata[]> {
    const config = { ...this.config, ...options };
    const sections = this.extractSections(content, 'protocol');
    return this.createChunks(sections, documentName, 'protocol', config);
  }

  /**
   * Chunk a CRF document
   */
  public async chunkCRF(
    content: string,
    documentName: string,
    options: Partial<ChunkingConfig> = {}
  ): Promise<ChunkMetadata[]> {
    const config = { ...this.config, ...options };
    const sections = this.extractSections(content, 'crf');
    return this.createChunks(sections, documentName, 'crf', config);
  }

  /**
   * Extract sections from document based on markers
   */
  private extractSections(
    content: string,
    documentType: 'protocol' | 'crf'
  ): DocumentSection[] {
    const markers = DocumentChunker.SECTION_MARKERS[documentType];
    const sections: DocumentSection[] = [];
    
    // Create regex pattern for section detection
    const markerPattern = new RegExp(
      `^(${markers.map(m => this.escapeRegex(m)).join('|')})\\s*:?\\s*$`,
      'gmi'
    );

    const lines = content.split('\n');
    let currentSection: DocumentSection | null = null;
    let currentContent: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const match = line.match(markerPattern);

      if (match) {
        // Save previous section if exists
        if (currentSection) {
          currentSection.content = currentContent.join('\n').trim();
          currentSection.tokenCount = this.countTokens(currentSection.content);
          sections.push(currentSection);
        }

        // Start new section
        currentSection = {
          title: match[1],
          content: '',
          type: this.classifySection(match[1], documentType),
          tokenCount: 0
        };
        currentContent = [];
      } else if (currentSection) {
        currentContent.push(line);
      } else {
        // Content before first section marker
        if (sections.length === 0 && line.trim()) {
          sections.push({
            title: 'PREAMBLE',
            content: line,
            type: 'introduction',
            tokenCount: this.countTokens(line)
          });
        }
      }
    }

    // Save last section
    if (currentSection) {
      currentSection.content = currentContent.join('\n').trim();
      currentSection.tokenCount = this.countTokens(currentSection.content);
      sections.push(currentSection);
    }

    return sections;
  }

  /**
   * Create chunks from sections with intelligent grouping
   */
  private createChunks(
    sections: DocumentSection[],
    documentName: string,
    documentType: 'protocol' | 'crf',
    config: ChunkingConfig
  ): ChunkMetadata[] {
    const chunks: ChunkMetadata[] = [];
    let currentChunkSections: DocumentSection[] = [];
    let currentTokenCount = 0;
    let chunkIndex = 0;

    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];
      
      // Check if adding this section would exceed token limit
      if (currentTokenCount + section.tokenCount > config.maxTokensPerChunk && currentChunkSections.length > 0) {
        // Create chunk from current sections
        chunks.push(this.createChunkMetadata(
          currentChunkSections,
          documentName,
          documentType,
          chunkIndex,
          sections.length,
          config
        ));
        
        // Start new chunk with overlap if configured
        if (config.overlapTokens > 0 && currentChunkSections.length > 0) {
          const overlapContent = this.createOverlapContent(currentChunkSections, config.overlapTokens);
          currentChunkSections = [
            {
              title: 'CONTEXT_OVERLAP',
              content: overlapContent,
              tokenCount: this.countTokens(overlapContent)
            },
            section
          ];
          currentTokenCount = currentChunkSections[0].tokenCount + section.tokenCount;
        } else {
          currentChunkSections = [section];
          currentTokenCount = section.tokenCount;
        }
        
        chunkIndex++;
      } else {
        currentChunkSections.push(section);
        currentTokenCount += section.tokenCount;
      }
    }

    // Create final chunk
    if (currentChunkSections.length > 0) {
      chunks.push(this.createChunkMetadata(
        currentChunkSections,
        documentName,
        documentType,
        chunkIndex,
        sections.length,
        config
      ));
    }

    return chunks;
  }

  /**
   * Create metadata for a chunk
   */
  private createChunkMetadata(
    sections: DocumentSection[],
    documentName: string,
    documentType: 'protocol' | 'crf',
    chunkIndex: number,
    totalSections: number,
    config: ChunkingConfig
  ): ChunkMetadata {
    const content = sections.map(s => `${s.title}\n${s.content}`).join('\n\n');
    const tokenCount = this.countTokens(content);
    const hasOverlap = sections.some(s => s.title === 'CONTEXT_OVERLAP');
    
    return {
      chunkId: `${documentName}_${documentType}_chunk_${chunkIndex}`,
      documentType,
      documentName,
      sectionName: sections.filter(s => s.title !== 'CONTEXT_OVERLAP').map(s => s.title).join(', '),
      sectionType: this.determineSectionType(sections, documentType),
      position: {
        start: chunkIndex * config.maxTokensPerChunk,
        end: Math.min((chunkIndex + 1) * config.maxTokensPerChunk, totalSections * config.maxTokensPerChunk),
        totalChunks: Math.ceil(totalSections / config.maxTokensPerChunk),
        chunkIndex
      },
      tokenCount,
      hasOverlap,
      overlapTokens: hasOverlap ? config.overlapTokens : undefined,
      suggestedModel: this.determineOptimalModel(tokenCount, content, config),
      contentPreview: this.createContentPreview(content),
      relatedSections: this.identifyRelatedSections(sections, documentType)
    };
  }

  /**
   * Determine optimal model based on content characteristics
   */
  private determineOptimalModel(
    tokenCount: number,
    content: string,
    config: ChunkingConfig
  ): 'claude' | 'gemini' {
    if (config.modelPreference !== 'auto') {
      return config.modelPreference;
    }

    // Use Claude for smaller, more focused chunks
    if (tokenCount <= DocumentChunker.MODEL_LIMITS.claude.optimalTokens) {
      return 'claude';
    }

    // Use Gemini for large chunks or specific content types
    const complexPatterns = [
      /statistical\s+analysis/i,
      /sample\s+size\s+calculation/i,
      /pharmacokinetic/i,
      /biostatistical/i
    ];

    const hasComplexContent = complexPatterns.some(pattern => pattern.test(content));
    
    if (hasComplexContent || tokenCount > DocumentChunker.MODEL_LIMITS.claude.maxTokens) {
      return 'gemini';
    }

    return 'claude';
  }

  /**
   * Create overlap content from previous sections
   */
  private createOverlapContent(sections: DocumentSection[], overlapTokens: number): string {
    const content = sections.map(s => s.content).join('\n\n');
    const tokens = encode(content);
    const overlapStart = Math.max(0, tokens.length - overlapTokens);
    const overlapTokensSlice = tokens.slice(overlapStart);
    
    // Convert tokens back to approximate text (this is a simplified approach)
    return `[Previous context summary]\n${sections.map(s => s.title).join(', ')}`;
  }

  /**
   * Classify section type based on title
   */
  private classifySection(title: string, documentType: 'protocol' | 'crf'): string {
    const upperTitle = title.toUpperCase();
    
    if (documentType === 'protocol') {
      if (upperTitle.includes('OBJECTIVE')) return 'objectives';
      if (upperTitle.includes('DESIGN')) return 'design';
      if (upperTitle.includes('POPULATION') || upperTitle.includes('CRITERIA')) return 'population';
      if (upperTitle.includes('STATISTICAL') || upperTitle.includes('ANALYSIS')) return 'statistics';
      if (upperTitle.includes('SAFETY') || upperTitle.includes('ADVERSE')) return 'safety';
      if (upperTitle.includes('DATA')) return 'data-management';
    } else {
      if (upperTitle.includes('DEMOGRAPHICS')) return 'demographics';
      if (upperTitle.includes('MEDICAL') || upperTitle.includes('HISTORY')) return 'medical-history';
      if (upperTitle.includes('VITAL') || upperTitle.includes('LABORATORY')) return 'assessments';
      if (upperTitle.includes('ADVERSE') || upperTitle.includes('SAFETY')) return 'safety';
      if (upperTitle.includes('VISIT')) return 'visit';
    }
    
    return 'general';
  }

  /**
   * Determine primary section type for a chunk
   */
  private determineSectionType(sections: DocumentSection[], documentType: 'protocol' | 'crf'): string {
    const types = sections
      .filter(s => s.title !== 'CONTEXT_OVERLAP')
      .map(s => s.type || 'general');
    
    // Return most common type
    const typeCount = types.reduce((acc, type) => {
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(typeCount).sort((a, b) => b[1] - a[1])[0]?.[0] || 'general';
  }

  /**
   * Create content preview for chunk
   */
  private createContentPreview(content: string): string {
    const words = content.split(/\s+/).slice(0, 50);
    return words.join(' ') + (words.length >= 50 ? '...' : '');
  }

  /**
   * Identify related sections based on content
   */
  private identifyRelatedSections(sections: DocumentSection[], documentType: 'protocol' | 'crf'): string[] {
    const related: string[] = [];
    const sectionTitles = sections.map(s => s.title);
    
    if (documentType === 'protocol') {
      if (sectionTitles.some(t => t.includes('INCLUSION'))) {
        related.push('EXCLUSION CRITERIA', 'STUDY POPULATION');
      }
      if (sectionTitles.some(t => t.includes('STATISTICAL'))) {
        related.push('STUDY ENDPOINTS', 'SAMPLE SIZE');
      }
    } else {
      if (sectionTitles.some(t => t.includes('ADVERSE'))) {
        related.push('CONCOMITANT MEDICATIONS', 'SAFETY ASSESSMENTS');
      }
      if (sectionTitles.some(t => t.includes('VISIT'))) {
        related.push('STUDY PROCEDURES', 'ASSESSMENTS');
      }
    }
    
    return [...new Set(related)].filter(r => !sectionTitles.includes(r));
  }

  /**
   * Count tokens in text
   */
  private countTokens(text: string): number {
    return encode(text).length;
  }

  /**
   * Escape special regex characters
   */
  private escapeRegex(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Get optimal chunking configuration for a document
   */
  public getOptimalConfig(
    documentSize: number,
    documentType: 'protocol' | 'crf',
    preferredModel?: 'claude' | 'gemini'
  ): ChunkingConfig {
    const baseConfig = { ...this.config };
    
    if (preferredModel) {
      baseConfig.modelPreference = preferredModel;
      baseConfig.maxTokensPerChunk = DocumentChunker.MODEL_LIMITS[preferredModel].optimalTokens;
    } else {
      // Auto-select based on document size
      if (documentSize > DocumentChunker.MODEL_LIMITS.claude.maxTokens) {
        baseConfig.modelPreference = 'gemini';
        baseConfig.maxTokensPerChunk = DocumentChunker.MODEL_LIMITS.gemini.optimalTokens;
      } else {
        baseConfig.modelPreference = 'claude';
        baseConfig.maxTokensPerChunk = DocumentChunker.MODEL_LIMITS.claude.optimalTokens;
      }
    }
    
    // Adjust overlap based on document type
    if (documentType === 'protocol') {
      baseConfig.overlapTokens = 1000; // More overlap for complex protocols
    } else {
      baseConfig.overlapTokens = 500; // Less overlap for structured CRFs
    }
    
    return baseConfig;
  }

  /**
   * Analyze document and provide chunking recommendations
   */
  public analyzeDocument(content: string, documentType: 'protocol' | 'crf'): {
    totalTokens: number;
    estimatedChunks: number;
    recommendedModel: 'claude' | 'gemini';
    sections: number;
    complexity: 'low' | 'medium' | 'high';
  } {
    const totalTokens = this.countTokens(content);
    const sections = this.extractSections(content, documentType);
    const optimalConfig = this.getOptimalConfig(totalTokens, documentType);
    
    const estimatedChunks = Math.ceil(totalTokens / optimalConfig.maxTokensPerChunk);
    
    // Determine complexity based on content analysis
    let complexity: 'low' | 'medium' | 'high' = 'low';
    if (sections.length > 20 || totalTokens > 200000) {
      complexity = 'high';
    } else if (sections.length > 10 || totalTokens > 100000) {
      complexity = 'medium';
    }
    
    return {
      totalTokens,
      estimatedChunks,
      recommendedModel: optimalConfig.modelPreference as 'claude' | 'gemini',
      sections: sections.length,
      complexity
    };
  }
}

// Export additional utility functions
export function createDocumentChunker(config?: Partial<ChunkingConfig>): DocumentChunker {
  return new DocumentChunker(config);
}

export function analyzeChunkingRequirements(
  content: string,
  documentType: 'protocol' | 'crf'
): ReturnType<DocumentChunker['analyzeDocument']> {
  const chunker = new DocumentChunker();
  return chunker.analyzeDocument(content, documentType);
}