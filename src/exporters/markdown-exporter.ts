import { DMP, DMPSection, Approval, Abbreviation } from '../types';
import { createModuleLogger, logInfo } from '../utils/logger';
import fs from 'fs/promises';
import path from 'path';

const logger = createModuleLogger('markdown-exporter');

export interface MarkdownExportOptions {
  includeTableOfContents?: boolean;
  includePageBreaks?: boolean;
  includeMetadata?: boolean;
  outputPath?: string;
}

export class MarkdownExporter {
  /**
   * Export DMP to Markdown format
   */
  async exportToMarkdown(
    dmp: DMP,
    options: MarkdownExportOptions = {}
  ): Promise<string> {
    logInfo('Exporting DMP to Markdown', {
      studyTitle: dmp.studyInfo.studyTitle,
      protocolNumber: dmp.studyInfo.protocolNumber,
    });
    
    const markdown = this.generateMarkdown(dmp, options);
    
    if (options.outputPath) {
      await this.saveToFile(markdown, options.outputPath);
    }
    
    return markdown;
  }
  
  /**
   * Generate Markdown content
   */
  private generateMarkdown(dmp: DMP, options: MarkdownExportOptions): string {
    let content = '';
    
    // Title page
    content += this.generateTitlePage(dmp);
    
    if (options.includePageBreaks) {
      content += '\n\n---\n\n';
    }
    
    // Table of Contents
    if (options.includeTableOfContents) {
      content += this.generateTableOfContents(dmp);
      if (options.includePageBreaks) {
        content += '\n\n---\n\n';
      }
    }
    
    // Approval signatures
    content += this.generateApprovals(dmp);
    
    if (options.includePageBreaks) {
      content += '\n\n---\n\n';
    }
    
    // Abbreviations
    content += this.generateAbbreviations(dmp);
    
    if (options.includePageBreaks) {
      content += '\n\n---\n\n';
    }
    
    // Main sections
    content += this.generateSections(dmp.sections, options);
    
    // Metadata
    if (options.includeMetadata) {
      content += '\n\n---\n\n';
      content += this.generateMetadata(dmp);
    }
    
    return content;
  }
  
  /**
   * Generate title page
   */
  private generateTitlePage(dmp: DMP): string {
    let content = '# Clinical Data Management Plan\n\n';
    
    content += `## Study Information\n`;
    content += `- **Study Title**: ${dmp.studyInfo.studyTitle}\n`;
    content += `- **Protocol Number**: ${dmp.studyInfo.protocolNumber}\n`;
    content += `- **Study Phase**: ${dmp.studyInfo.studyPhase}\n`;
    content += `- **Investigational Drug**: ${dmp.studyInfo.investigationalDrug}\n`;
    content += `- **Sponsor**: ${dmp.studyInfo.sponsor}\n`;
    content += `- **DMP Version**: ${dmp.version}\n`;
    content += `- **Effective Date**: ${this.formatDate(dmp.effectiveDate)}\n`;
    
    return content + '\n';
  }
  
  /**
   * Generate table of contents
   */
  private generateTableOfContents(dmp: DMP): string {
    let content = '## Table of Contents\n';
    
    const addToTOC = (sections: DMPSection[], level: number = 0) => {
      sections.forEach(section => {
        const indent = '  '.repeat(level);
        const linkId = this.generateLinkId(section.title);
        content += `${indent}${section.sectionNumber}. [${section.title}](#${linkId})\n`;
        
        if (section.subsections && section.subsections.length > 0) {
          addToTOC(section.subsections, level + 1);
        }
      });
    };
    
    addToTOC(dmp.sections);
    
    return content + '\n';
  }
  
  /**
   * Generate approval signatures section
   */
  private generateApprovals(dmp: DMP): string {
    let content = '## Approval Signatures\n\n';
    
    content += '| Name & Title | Signature and Date |\n';
    content += '|---|---|\n';
    
    dmp.approvals.forEach(approval => {
      const signature = approval.signature || '';
      const date = approval.date ? this.formatDate(approval.date) : '';
      content += `| ${approval.name}: ${approval.title} | ${signature} ${date} |\n`;
    });
    
    return content + '\n';
  }
  
  /**
   * Generate abbreviations section
   */
  private generateAbbreviations(dmp: DMP): string {
    let content = '## Abbreviations and Definitions\n\n';
    
    content += '| Abbreviation | Definition |\n';
    content += '|---|---|\n';
    
    // Sort abbreviations alphabetically
    const sorted = [...dmp.abbreviations].sort((a, b) => 
      a.abbreviation.localeCompare(b.abbreviation)
    );
    
    sorted.forEach(abbr => {
      content += `| ${abbr.abbreviation} | ${abbr.definition} |\n`;
    });
    
    return content + '\n';
  }
  
  /**
   * Generate main sections
   */
  private generateSections(
    sections: DMPSection[], 
    options: MarkdownExportOptions,
    level: number = 2
  ): string {
    let content = '';
    
    sections.forEach((section, index) => {
      // Add page break between main sections if requested
      if (options.includePageBreaks && level === 2 && index > 0) {
        content += '\n---\n\n';
      }
      
      // Section header
      const headerLevel = '#'.repeat(Math.min(level, 6));
      content += `${headerLevel} ${section.sectionNumber}. ${section.title}\n\n`;
      
      // Section content
      if (section.content) {
        content += this.formatContent(section.content) + '\n\n';
      }
      
      // Subsections
      if (section.subsections && section.subsections.length > 0) {
        content += this.generateSections(section.subsections, options, level + 1);
      }
    });
    
    return content;
  }
  
  /**
   * Format content with proper markdown
   */
  private formatContent(content: string): string {
    // Ensure proper line breaks
    let formatted = content.replace(/\n/g, '\n\n');
    
    // Fix list formatting
    formatted = formatted.replace(/^(\s*)-\s*/gm, '$1- ');
    formatted = formatted.replace(/^(\s*)\d+\.\s*/gm, '$11. ');
    
    // Ensure tables are properly formatted
    formatted = this.formatTables(formatted);
    
    return formatted.trim();
  }
  
  /**
   * Format tables in content
   */
  private formatTables(content: string): string {
    // Simple table detection and formatting
    const lines = content.split('\n');
    let inTable = false;
    let tableLines: string[] = [];
    let result: string[] = [];
    
    lines.forEach(line => {
      if (line.includes('|') && line.trim().startsWith('|')) {
        if (!inTable) {
          inTable = true;
          tableLines = [];
        }
        tableLines.push(line);
      } else if (inTable) {
        // Process accumulated table
        result.push(...this.processTable(tableLines));
        result.push(line);
        inTable = false;
        tableLines = [];
      } else {
        result.push(line);
      }
    });
    
    // Don't forget the last table
    if (inTable && tableLines.length > 0) {
      result.push(...this.processTable(tableLines));
    }
    
    return result.join('\n');
  }
  
  /**
   * Process table lines to ensure proper formatting
   */
  private processTable(lines: string[]): string[] {
    if (lines.length < 2) return lines;
    
    // Check if separator line exists
    const hasSeparator = lines.some(line => 
      line.trim().match(/^\|[\s\-:]+\|/)
    );
    
    if (!hasSeparator && lines.length >= 1) {
      // Add separator after first line
      const firstLine = lines[0];
      const columnCount = (firstLine.match(/\|/g) || []).length - 1;
      const separator = '|' + Array(columnCount).fill('---|').join('') + '\n';
      lines.splice(1, 0, separator);
    }
    
    return lines;
  }
  
  /**
   * Generate metadata section
   */
  private generateMetadata(dmp: DMP): string {
    let content = '## Document Metadata\n\n';
    
    content += '```yaml\n';
    content += `document_type: Clinical Data Management Plan\n`;
    content += `version: ${dmp.version}\n`;
    content += `effective_date: ${this.formatDate(dmp.effectiveDate)}\n`;
    content += `study:\n`;
    content += `  title: "${dmp.studyInfo.studyTitle}"\n`;
    content += `  protocol: ${dmp.studyInfo.protocolNumber}\n`;
    content += `  phase: ${dmp.studyInfo.studyPhase}\n`;
    content += `  sponsor: ${dmp.studyInfo.sponsor}\n`;
    content += `  drug: ${dmp.studyInfo.investigationalDrug}\n`;
    content += `  indication: ${dmp.studyInfo.indication || 'Not specified'}\n`;
    content += `sections: ${dmp.sections.length}\n`;
    content += `generated: ${new Date().toISOString()}\n`;
    content += '```\n';
    
    return content;
  }
  
  /**
   * Generate link ID from title
   */
  private generateLinkId(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }
  
  /**
   * Format date
   */
  private formatDate(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                   'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const day = d.getDate().toString().padStart(2, '0');
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    
    return `${day}${month}${year}`;
  }
  
  /**
   * Save markdown to file
   */
  private async saveToFile(content: string, outputPath: string): Promise<void> {
    try {
      // Ensure directory exists
      const dir = path.dirname(outputPath);
      await fs.mkdir(dir, { recursive: true });
      
      // Write file
      await fs.writeFile(outputPath, content, 'utf8');
      
      logInfo('Markdown file saved', { path: outputPath });
    } catch (error) {
      logger.error('Failed to save markdown file', { error, path: outputPath });
      throw error;
    }
  }
  
  /**
   * Generate filename for DMP
   */
  generateFilename(dmp: DMP, extension: string = 'md'): string {
    const protocolNumber = dmp.studyInfo.protocolNumber.replace(/[^A-Z0-9]/gi, '_');
    const version = dmp.version.replace(/[^A-Z0-9]/gi, '_');
    const date = this.formatDate(dmp.effectiveDate).replace(/[^A-Z0-9]/gi, '');
    
    return `DMP_${protocolNumber}_${version}_${date}.${extension}`;
  }
}

// Export singleton instance
export const markdownExporter = new MarkdownExporter();