import fs from 'fs/promises';
import path from 'path';
import pdfParse from 'pdf-parse';
import { createModuleLogger, logInfo, logError } from '../utils/logger';
import { ValidationError } from '../utils/error-handler';

const logger = createModuleLogger('pdf-extractor');

export interface PDFExtractionResult {
  text: string;
  pages: number;
  metadata: {
    title?: string;
    author?: string;
    subject?: string;
    keywords?: string;
    creationDate?: Date;
    modificationDate?: Date;
  };
  pageTexts: string[];
}

export class PDFExtractor {
  /**
   * Extract text from PDF file
   */
  async extractFromFile(filePath: string): Promise<PDFExtractionResult> {
    try {
      logInfo('Extracting PDF content', { filePath });
      
      // Validate file exists
      await this.validateFile(filePath);
      
      // Read PDF file
      const dataBuffer = await fs.readFile(filePath);
      
      // Parse PDF
      const result = await this.extractFromBuffer(dataBuffer);
      
      logInfo('PDF extraction completed', {
        filePath,
        pages: result.pages,
        textLength: result.text.length,
      });
      
      return result;
    } catch (error) {
      logError('PDF extraction failed', error, { filePath });
      throw error;
    }
  }
  
  /**
   * Extract text from PDF buffer
   */
  async extractFromBuffer(buffer: Buffer): Promise<PDFExtractionResult> {
    try {
      const options = {
        // Preserve whitespace and formatting
        normalizeWhitespace: false,
        // Return page texts separately
        pagerender: this.renderPage,
      };
      
      const data = await pdfParse(buffer, options);
      
      // Extract metadata
      const metadata = this.extractMetadata(data.info);
      
      // Split text by pages
      const pageTexts = this.splitByPages(data.text);
      
      return {
        text: data.text,
        pages: data.numpages,
        metadata,
        pageTexts,
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes('encrypted')) {
        throw new ValidationError('PDF is encrypted and cannot be processed');
      }
      throw new ValidationError('Failed to parse PDF: ' + (error as Error).message);
    }
  }
  
  /**
   * Extract text from specific pages
   */
  async extractPages(
    filePath: string,
    startPage: number,
    endPage?: number
  ): Promise<string> {
    const result = await this.extractFromFile(filePath);
    
    const start = Math.max(0, startPage - 1);
    const end = endPage ? Math.min(result.pageTexts.length, endPage) : start + 1;
    
    return result.pageTexts.slice(start, end).join('\n\n');
  }
  
  /**
   * Extract tables from PDF (basic implementation)
   */
  extractTables(text: string): string[][] {
    const tables: string[][] = [];
    const lines = text.split('\n');
    
    let currentTable: string[] = [];
    let inTable = false;
    
    for (const line of lines) {
      // Simple heuristic: lines with multiple spaces or tabs might be table rows
      if (line.includes('  ') || line.includes('\t')) {
        if (!inTable) {
          inTable = true;
          currentTable = [];
        }
        currentTable.push(line);
      } else if (inTable && line.trim() === '') {
        // Empty line might indicate end of table
        if (currentTable.length > 1) {
          tables.push([...currentTable]);
        }
        inTable = false;
        currentTable = [];
      }
    }
    
    // Don't forget the last table
    if (currentTable.length > 1) {
      tables.push(currentTable);
    }
    
    return tables;
  }
  
  /**
   * Clean extracted text
   */
  cleanText(text: string): string {
    return text
      // Remove excessive whitespace
      .replace(/\s+/g, ' ')
      // Remove page numbers (common patterns)
      .replace(/Page \d+ of \d+/gi, '')
      .replace(/\d+\s*\|\s*Page/gi, '')
      // Remove common headers/footers
      .replace(/CONFIDENTIAL/gi, '')
      // Fix common OCR issues
      .replace(/['']/g, "'")
      .replace(/[""]/g, '"')
      // Trim
      .trim();
  }
  
  /**
   * Extract clinical study information
   */
  extractClinicalInfo(text: string): Record<string, string> {
    const info: Record<string, string> = {};
    
    // Common patterns in clinical protocols
    const patterns = {
      protocolNumber: /Protocol\s*(?:Number|No\.?|#)?\s*:?\s*([A-Z0-9-]+)/i,
      studyTitle: /(?:Study\s*)?Title\s*:?\s*([^\n]+)/i,
      sponsor: /Sponsor\s*:?\s*([^\n]+)/i,
      phase: /Phase\s*:?\s*(I{1,3}|[1-4]|IV)/i,
      indication: /Indication\s*:?\s*([^\n]+)/i,
      investigationalProduct: /Investigational\s*(?:Product|Drug|Device)\s*:?\s*([^\n]+)/i,
    };
    
    for (const [key, pattern] of Object.entries(patterns)) {
      const match = text.match(pattern);
      if (match) {
        info[key] = match[1].trim();
      }
    }
    
    return info;
  }
  
  /**
   * Validate PDF file
   */
  private async validateFile(filePath: string): Promise<void> {
    try {
      const stats = await fs.stat(filePath);
      
      if (!stats.isFile()) {
        throw new ValidationError('Path is not a file');
      }
      
      if (stats.size === 0) {
        throw new ValidationError('PDF file is empty');
      }
      
      if (stats.size > 100 * 1024 * 1024) { // 100MB limit
        throw new ValidationError('PDF file is too large (max 100MB)');
      }
      
      const ext = path.extname(filePath).toLowerCase();
      if (ext !== '.pdf') {
        throw new ValidationError('File is not a PDF');
      }
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new ValidationError('File not found or not accessible');
    }
  }
  
  /**
   * Custom page renderer for pdf-parse
   */
  private renderPage(pageData: any): string {
    let render_options = {
      normalizeWhitespace: false,
      disableCombineTextItems: false,
    };
    
    return pageData.getTextContent(render_options)
      .then((textContent: any) => {
        let text = '';
        
        for (let item of textContent.items) {
          text += item.str;
          
          // Add space or newline based on position
          if (item.hasEOL) {
            text += '\n';
          } else {
            text += ' ';
          }
        }
        
        return text;
      });
  }
  
  /**
   * Extract metadata from PDF info
   */
  private extractMetadata(info: any): PDFExtractionResult['metadata'] {
    return {
      title: info.Title || undefined,
      author: info.Author || undefined,
      subject: info.Subject || undefined,
      keywords: info.Keywords || undefined,
      creationDate: info.CreationDate ? new Date(info.CreationDate) : undefined,
      modificationDate: info.ModDate ? new Date(info.ModDate) : undefined,
    };
  }
  
  /**
   * Split text into pages
   */
  private splitByPages(text: string): string[] {
    // This is a simple implementation
    // In practice, pdf-parse might provide better page separation
    const pageBreakPattern = /\f/g; // Form feed character
    let pages = text.split(pageBreakPattern);
    
    // If no form feeds, try other patterns
    if (pages.length === 1) {
      // Try common page number patterns
      pages = text.split(/(?=Page \d+\s*$)/gm);
    }
    
    return pages.filter(page => page.trim().length > 0);
  }
}

// Export singleton instance
export const pdfExtractor = new PDFExtractor();