import { DMP, DMPSection } from '../types';
import { createModuleLogger, logInfo } from '../utils/logger';
import fs from 'fs/promises';
import path from 'path';

const logger = createModuleLogger('word-exporter');

export interface WordExportOptions {
  outputPath?: string;
  includeTableOfContents?: boolean;
  includePageBreaks?: boolean;
  template?: 'default' | 'regulatory' | 'sponsor';
}

export class WordExporter {
  /**
   * Export DMP to Word-compatible HTML format
   */
  async exportToWord(
    dmp: DMP,
    options: WordExportOptions = {}
  ): Promise<string> {
    logInfo('Exporting DMP to Word format', {
      studyTitle: dmp.studyInfo.studyTitle,
      protocolNumber: dmp.studyInfo.protocolNumber,
    });
    
    const html = this.generateWordHTML(dmp, options);
    
    if (options.outputPath) {
      await this.saveToFile(html, options.outputPath);
    }
    
    return html;
  }
  
  /**
   * Generate Word-compatible HTML
   */
  private generateWordHTML(dmp: DMP, options: WordExportOptions): string {
    const styles = this.generateStyles();
    const body = this.generateBody(dmp, options);
    
    return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8">
  <title>Clinical Data Management Plan - ${dmp.studyInfo.protocolNumber}</title>
  <!--[if gte mso 9]>
  <xml>
    <w:WordDocument>
      <w:View>Print</w:View>
      <w:Zoom>100</w:Zoom>
      <w:DoNotOptimizeForBrowser/>
    </w:WordDocument>
  </xml>
  <![endif]-->
  ${styles}
</head>
<body>
  ${body}
</body>
</html>`;
  }
  
  /**
   * Generate CSS styles for Word
   */
  private generateStyles(): string {
    return `<style>
    @page {
      size: A4;
      margin: 2.54cm;
    }
    
    body {
      font-family: 'Times New Roman', Times, serif;
      font-size: 12pt;
      line-height: 1.5;
      color: #000000;
      background-color: #ffffff;
      margin: 0;
      padding: 0;
    }
    
    h1 {
      font-size: 18pt;
      font-weight: bold;
      margin-top: 24pt;
      margin-bottom: 12pt;
      page-break-after: avoid;
    }
    
    h2 {
      font-size: 16pt;
      font-weight: bold;
      margin-top: 18pt;
      margin-bottom: 12pt;
      page-break-after: avoid;
    }
    
    h3 {
      font-size: 14pt;
      font-weight: bold;
      margin-top: 12pt;
      margin-bottom: 6pt;
      page-break-after: avoid;
    }
    
    h4 {
      font-size: 12pt;
      font-weight: bold;
      margin-top: 12pt;
      margin-bottom: 6pt;
      page-break-after: avoid;
    }
    
    p {
      margin-top: 0;
      margin-bottom: 12pt;
      text-align: justify;
    }
    
    table {
      border-collapse: collapse;
      width: 100%;
      margin-top: 12pt;
      margin-bottom: 12pt;
    }
    
    th, td {
      border: 1px solid #000000;
      padding: 6pt;
      text-align: left;
      vertical-align: top;
    }
    
    th {
      background-color: #e6e6e6;
      font-weight: bold;
    }
    
    ul, ol {
      margin-top: 0;
      margin-bottom: 12pt;
      margin-left: 36pt;
    }
    
    li {
      margin-bottom: 6pt;
    }
    
    .page-break {
      page-break-before: always;
    }
    
    .title-page {
      text-align: center;
      page-break-after: always;
    }
    
    .title-page h1 {
      font-size: 24pt;
      margin-top: 72pt;
      margin-bottom: 36pt;
    }
    
    .toc {
      page-break-after: always;
    }
    
    .toc-entry {
      margin-bottom: 6pt;
    }
    
    .toc-entry-1 {
      margin-left: 0;
      font-weight: bold;
    }
    
    .toc-entry-2 {
      margin-left: 24pt;
    }
    
    .toc-entry-3 {
      margin-left: 48pt;
    }
    
    .approval-table {
      margin-top: 36pt;
    }
    
    .signature-line {
      border-bottom: 1px solid #000000;
      width: 200pt;
      display: inline-block;
    }
    
    .header {
      text-align: center;
      font-size: 10pt;
      margin-bottom: 12pt;
      border-bottom: 1px solid #000000;
      padding-bottom: 6pt;
    }
    
    .footer {
      text-align: center;
      font-size: 10pt;
      margin-top: 24pt;
      border-top: 1px solid #000000;
      padding-top: 6pt;
    }
    
    .confidential {
      font-style: italic;
      text-align: center;
      margin-top: 48pt;
      font-size: 10pt;
    }
  </style>`;
  }
  
  /**
   * Generate document body
   */
  private generateBody(dmp: DMP, options: WordExportOptions): string {
    let content = '';
    
    // Title page
    content += this.generateTitlePage(dmp);
    
    // Table of contents
    if (options.includeTableOfContents) {
      content += this.generateTableOfContents(dmp);
    }
    
    // Approval signatures
    content += this.generateApprovals(dmp);
    
    // Abbreviations
    content += this.generateAbbreviations(dmp);
    
    // Main sections
    content += this.generateSections(dmp.sections, options);
    
    return content;
  }
  
  /**
   * Generate title page
   */
  private generateTitlePage(dmp: DMP): string {
    return `
    <div class="title-page">
      <h1>CLINICAL DATA MANAGEMENT PLAN</h1>
      
      <div style="margin-top: 48pt;">
        <p><strong>Study Title:</strong><br/>${this.escapeHtml(dmp.studyInfo.studyTitle)}</p>
        <p><strong>Protocol Number:</strong> ${this.escapeHtml(dmp.studyInfo.protocolNumber)}</p>
        <p><strong>Study Phase:</strong> ${this.escapeHtml(dmp.studyInfo.studyPhase)}</p>
        <p><strong>Investigational Drug:</strong> ${this.escapeHtml(dmp.studyInfo.investigationalDrug)}</p>
        <p><strong>Sponsor:</strong> ${this.escapeHtml(dmp.studyInfo.sponsor)}</p>
      </div>
      
      <div style="margin-top: 72pt;">
        <p><strong>DMP Version:</strong> ${this.escapeHtml(dmp.version)}</p>
        <p><strong>Effective Date:</strong> ${this.formatDate(dmp.effectiveDate)}</p>
      </div>
      
      <div class="confidential">
        CONFIDENTIAL: This document contains proprietary information and is intended<br/>
        solely for the use of the study team.
      </div>
    </div>`;
  }
  
  /**
   * Generate table of contents
   */
  private generateTableOfContents(dmp: DMP): string {
    let content = '<div class="toc page-break">\n';
    content += '<h1>Table of Contents</h1>\n';
    
    const generateTOCEntries = (sections: DMPSection[], level: number = 1) => {
      sections.forEach(section => {
        content += `<div class="toc-entry toc-entry-${level}">${section.sectionNumber}. ${this.escapeHtml(section.title)}</div>\n`;
        
        if (section.subsections && section.subsections.length > 0) {
          generateTOCEntries(section.subsections, level + 1);
        }
      });
    };
    
    generateTOCEntries(dmp.sections);
    content += '</div>\n';
    
    return content;
  }
  
  /**
   * Generate approval signatures
   */
  private generateApprovals(dmp: DMP): string {
    let content = '<div class="page-break">\n';
    content += '<h1>Approval Signatures</h1>\n';
    
    content += '<table class="approval-table">\n';
    content += '<thead>\n';
    content += '<tr>\n';
    content += '<th>Name &amp; Title</th>\n';
    content += '<th>Signature and Date</th>\n';
    content += '</tr>\n';
    content += '</thead>\n';
    content += '<tbody>\n';
    
    dmp.approvals.forEach(approval => {
      content += '<tr>\n';
      content += `<td>${this.escapeHtml(approval.name)}: ${this.escapeHtml(approval.title)}</td>\n`;
      content += '<td><span class="signature-line"></span></td>\n';
      content += '</tr>\n';
    });
    
    content += '</tbody>\n';
    content += '</table>\n';
    content += '</div>\n';
    
    return content;
  }
  
  /**
   * Generate abbreviations
   */
  private generateAbbreviations(dmp: DMP): string {
    let content = '<div class="page-break">\n';
    content += '<h1>Abbreviations and Definitions</h1>\n';
    
    content += '<table>\n';
    content += '<thead>\n';
    content += '<tr>\n';
    content += '<th>Abbreviation</th>\n';
    content += '<th>Definition</th>\n';
    content += '</tr>\n';
    content += '</thead>\n';
    content += '<tbody>\n';
    
    // Sort abbreviations
    const sorted = [...dmp.abbreviations].sort((a, b) => 
      a.abbreviation.localeCompare(b.abbreviation)
    );
    
    sorted.forEach(abbr => {
      content += '<tr>\n';
      content += `<td>${this.escapeHtml(abbr.abbreviation)}</td>\n`;
      content += `<td>${this.escapeHtml(abbr.definition)}</td>\n`;
      content += '</tr>\n';
    });
    
    content += '</tbody>\n';
    content += '</table>\n';
    content += '</div>\n';
    
    return content;
  }
  
  /**
   * Generate sections
   */
  private generateSections(
    sections: DMPSection[], 
    options: WordExportOptions,
    level: number = 1
  ): string {
    let content = '';
    
    sections.forEach((section, index) => {
      // Page break for main sections
      if (level === 1 && options.includePageBreaks) {
        content += '<div class="page-break">\n';
      }
      
      // Section header
      const headerTag = `h${Math.min(level + 1, 4)}`;
      content += `<${headerTag}>${section.sectionNumber}. ${this.escapeHtml(section.title)}</${headerTag}>\n`;
      
      // Section content
      if (section.content) {
        content += this.formatContent(section.content);
      }
      
      // Subsections
      if (section.subsections && section.subsections.length > 0) {
        content += this.generateSections(section.subsections, options, level + 1);
      }
      
      if (level === 1 && options.includePageBreaks) {
        content += '</div>\n';
      }
    });
    
    return content;
  }
  
  /**
   * Format content with proper HTML
   */
  private formatContent(content: string): string {
    let formatted = this.escapeHtml(content);
    
    // Convert markdown-style formatting
    // Bold
    formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    
    // Italic
    formatted = formatted.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    
    // Lists
    const lines = formatted.split('\n');
    let inList = false;
    let listType = '';
    let processedLines: string[] = [];
    
    lines.forEach(line => {
      const trimmed = line.trim();
      
      // Bullet list
      if (trimmed.startsWith('- ')) {
        if (!inList || listType !== 'ul') {
          if (inList) processedLines.push(`</${listType}>`);
          processedLines.push('<ul>');
          inList = true;
          listType = 'ul';
        }
        processedLines.push(`<li>${trimmed.substring(2)}</li>`);
      }
      // Numbered list
      else if (trimmed.match(/^\d+\.\s/)) {
        if (!inList || listType !== 'ol') {
          if (inList) processedLines.push(`</${listType}>`);
          processedLines.push('<ol>');
          inList = true;
          listType = 'ol';
        }
        processedLines.push(`<li>${trimmed.replace(/^\d+\.\s/, '')}</li>`);
      }
      // Table
      else if (trimmed.includes('|') && trimmed.startsWith('|')) {
        // Simple table parsing - would need enhancement for complex tables
        if (!processedLines[processedLines.length - 1]?.includes('<table>')) {
          processedLines.push('<table>');
        }
        
        const cells = trimmed.split('|').filter(c => c.trim());
        if (trimmed.includes('---')) {
          // Skip separator rows
        } else if (!processedLines.some(l => l.includes('<tbody>'))) {
          processedLines.push('<thead><tr>');
          cells.forEach(cell => {
            processedLines.push(`<th>${cell.trim()}</th>`);
          });
          processedLines.push('</tr></thead><tbody>');
        } else {
          processedLines.push('<tr>');
          cells.forEach(cell => {
            processedLines.push(`<td>${cell.trim()}</td>`);
          });
          processedLines.push('</tr>');
        }
      }
      // Regular paragraph
      else {
        if (inList) {
          processedLines.push(`</${listType}>`);
          inList = false;
        }
        if (processedLines[processedLines.length - 1]?.includes('<table>') && 
            !processedLines[processedLines.length - 1]?.includes('</table>')) {
          processedLines.push('</tbody></table>');
        }
        if (trimmed) {
          processedLines.push(`<p>${trimmed}</p>`);
        }
      }
    });
    
    // Close any open lists or tables
    if (inList) {
      processedLines.push(`</${listType}>`);
    }
    if (processedLines[processedLines.length - 1]?.includes('<table>') && 
        !processedLines[processedLines.length - 1]?.includes('</table>')) {
      processedLines.push('</tbody></table>');
    }
    
    return processedLines.join('\n');
  }
  
  /**
   * Escape HTML special characters
   */
  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    
    return text.replace(/[&<>"']/g, char => map[char]);
  }
  
  /**
   * Format date
   */
  private formatDate(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
                   'July', 'August', 'September', 'October', 'November', 'December'];
    
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  }
  
  /**
   * Save Word HTML to file
   */
  private async saveToFile(content: string, outputPath: string): Promise<void> {
    try {
      // Ensure directory exists
      const dir = path.dirname(outputPath);
      await fs.mkdir(dir, { recursive: true });
      
      // Ensure .doc extension
      if (!outputPath.endsWith('.doc') && !outputPath.endsWith('.docx')) {
        outputPath += '.doc';
      }
      
      // Write file
      await fs.writeFile(outputPath, content, 'utf8');
      
      logInfo('Word document saved', { path: outputPath });
    } catch (error) {
      logger.error('Failed to save Word document', { error, path: outputPath });
      throw error;
    }
  }
}

// Export singleton instance
export const wordExporter = new WordExporter();