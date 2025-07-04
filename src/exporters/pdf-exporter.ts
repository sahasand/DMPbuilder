import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { DMP, DMPSection } from '../types';
import { createModuleLogger, logInfo } from '../utils/logger';

const logger = createModuleLogger('pdf-exporter');

export interface PDFExportOptions {
  outputPath?: string;
  includeWatermark?: boolean;
  watermarkText?: string;
  includeHeaders?: boolean;
  includeFooters?: boolean;
  includePageNumbers?: boolean;
}

export class PDFExporter {
  private doc: PDFDocument;
  private pageNumber: number = 0;
  private tocEntries: Array<{ title: string; page: number; level: number }> = [];
  
  /**
   * Export DMP to PDF format
   */
  async exportToPDF(
    dmp: DMP,
    options: PDFExportOptions = {}
  ): Promise<Buffer> {
    logInfo('Exporting DMP to PDF', {
      studyTitle: dmp.studyInfo.studyTitle,
      protocolNumber: dmp.studyInfo.protocolNumber,
    });
    
    return new Promise((resolve, reject) => {
      try {
        this.initializeDocument();
        
        // Setup event handlers
        const chunks: Buffer[] = [];
        this.doc.on('data', chunk => chunks.push(chunk));
        this.doc.on('end', () => {
          const buffer = Buffer.concat(chunks);
          if (options.outputPath) {
            fs.writeFileSync(options.outputPath, buffer);
            logInfo('PDF saved to file', { path: options.outputPath });
          }
          resolve(buffer);
        });
        
        // Generate PDF content
        this.generatePDF(dmp, options);
        
        // Finalize document
        this.doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }
  
  /**
   * Initialize PDF document
   */
  private initializeDocument(): void {
    this.doc = new PDFDocument({
      size: 'A4',
      margins: {
        top: 72,
        bottom: 72,
        left: 72,
        right: 72,
      },
      info: {
        Title: 'Clinical Data Management Plan',
        Author: 'Clinical DMP Generator',
        Subject: 'Data Management Plan',
        Keywords: 'clinical trial, data management, DMP',
      },
    });
    
    this.pageNumber = 1; // Start at page 1
    this.tocEntries = [];
  }
  
  /**
   * Generate PDF content
   */
  private generatePDF(dmp: DMP, options: PDFExportOptions): void {
    // Setup page event handlers
    this.doc.on('pageAdded', () => {
      this.pageNumber++;
      if (options.includeHeaders || options.includeFooters) {
        this.addHeaderFooter(dmp, options);
      }
      if (options.includeWatermark) {
        this.addWatermark(options.watermarkText || 'DRAFT');
      }
    });
    
    // Title page (first page)
    this.generateTitlePage(dmp);
    
    // Table of contents placeholder
    this.doc.addPage();
    const tocPage = this.pageNumber;
    
    // Approval signatures
    this.doc.addPage();
    this.generateApprovals(dmp);
    
    // Abbreviations
    this.doc.addPage();
    this.generateAbbreviations(dmp);
    
    // Main sections
    this.generateSections(dmp.sections);
    
    // Go back and generate TOC
    this.generateTableOfContents(tocPage);
  }
  
  /**
   * Generate title page
   */
  private generateTitlePage(dmp: DMP): void {
    const centerX = this.doc.page.width / 2;
    
    // Logo placeholder
    this.doc.rect(centerX - 50, 100, 100, 100)
      .stroke();
    
    // Title
    this.doc.fontSize(24)
      .font('Helvetica-Bold')
      .text('CLINICAL DATA MANAGEMENT PLAN', 72, 250, {
        align: 'center',
      });
    
    // Study information
    this.doc.fontSize(14)
      .font('Helvetica')
      .moveDown(2);
    
    const studyInfo = [
      `Study Title: ${dmp.studyInfo.studyTitle}`,
      `Protocol Number: ${dmp.studyInfo.protocolNumber}`,
      `Study Phase: ${dmp.studyInfo.studyPhase}`,
      `Investigational Drug: ${dmp.studyInfo.investigationalDrug}`,
      `Sponsor: ${dmp.studyInfo.sponsor}`,
      ``,
      `DMP Version: ${dmp.version}`,
      `Effective Date: ${this.formatDate(dmp.effectiveDate)}`,
    ];
    
    studyInfo.forEach(line => {
      this.doc.text(line, 72, this.doc.y, { align: 'center' });
      this.doc.moveDown(0.5);
    });
    
    // Confidentiality notice
    this.doc.fontSize(10)
      .font('Helvetica-Oblique')
      .text(
        'CONFIDENTIAL: This document contains proprietary information and is intended solely for the use of the study team.',
        72,
        this.doc.page.height - 150,
        { align: 'center', width: this.doc.page.width - 144 }
      );
  }
  
  /**
   * Generate table of contents
   */
  private generateTableOfContents(tocPage: number): void {
    const currentPage = this.doc.bufferedPageRange();
    
    // Switch to TOC page (ensure page exists)
    if (tocPage > 0 && tocPage <= currentPage.count) {
      this.doc.switchToPage(tocPage - 1);
    } else {
      // If TOC page doesn't exist or is invalid, add a new page
      this.doc.addPage();
    }
    
    this.doc.fontSize(18)
      .font('Helvetica-Bold')
      .text('Table of Contents', 72, 72);
    
    this.doc.fontSize(12)
      .font('Helvetica')
      .moveDown(2);
    
    let y = this.doc.y;
    
    this.tocEntries.forEach(entry => {
      const indent = entry.level * 20;
      const dotLeader = this.generateDotLeader(
        entry.title,
        entry.page.toString(),
        this.doc.page.width - 144 - indent
      );
      
      this.doc.text(entry.title, 72 + indent, y);
      this.doc.text(dotLeader, 72 + indent + this.doc.widthOfString(entry.title), y);
      this.doc.text(entry.page.toString(), this.doc.page.width - 72 - 30, y);
      
      y += 20;
      
      if (y > this.doc.page.height - 100) {
        this.doc.addPage();
        y = 72;
      }
    });
    
    // Return to current page
    if (currentPage.start <= this.doc.bufferedPageRange().count) {
      this.doc.switchToPage(this.doc.bufferedPageRange().count - 1);
    }
  }
  
  /**
   * Generate approval signatures
   */
  private generateApprovals(dmp: DMP): void {
    this.addTOCEntry('Approval Signatures', 0);
    
    this.doc.fontSize(18)
      .font('Helvetica-Bold')
      .text('Approval Signatures', 72, 72);
    
    this.doc.fontSize(12)
      .font('Helvetica')
      .moveDown(2);
    
    // Table header
    const tableTop = this.doc.y;
    const col1Width = 300;
    const col2Width = 200;
    
    this.doc.font('Helvetica-Bold');
    this.doc.text('Name & Title', 72, tableTop);
    this.doc.text('Signature and Date', 72 + col1Width, tableTop);
    
    // Draw header line
    this.doc.moveTo(72, tableTop + 20)
      .lineTo(72 + col1Width + col2Width, tableTop + 20)
      .stroke();
    
    // Table rows
    this.doc.font('Helvetica');
    let y = tableTop + 30;
    
    dmp.approvals.forEach(approval => {
      this.doc.text(`${approval.name}: ${approval.title}`, 72, y);
      this.doc.text('_______________________', 72 + col1Width, y);
      y += 40;
      
      if (y > this.doc.page.height - 100) {
        this.doc.addPage();
        y = 72;
      }
    });
  }
  
  /**
   * Generate abbreviations
   */
  private generateAbbreviations(dmp: DMP): void {
    this.addTOCEntry('Abbreviations and Definitions', 0);
    
    this.doc.fontSize(18)
      .font('Helvetica-Bold')
      .text('Abbreviations and Definitions', 72, 72);
    
    this.doc.fontSize(11)
      .font('Helvetica')
      .moveDown(2);
    
    // Table setup
    const tableTop = this.doc.y;
    const col1Width = 150;
    const col2Width = 350;
    
    // Sort abbreviations
    const sorted = [...dmp.abbreviations].sort((a, b) => 
      a.abbreviation.localeCompare(b.abbreviation)
    );
    
    let y = tableTop;
    
    sorted.forEach((abbr, index) => {
      if (index % 2 === 0) {
        // Light gray background for alternating rows
        this.doc.rect(72, y - 2, col1Width + col2Width, 18)
          .fill('#f5f5f5');
      }
      
      this.doc.fillColor('black')
        .font('Helvetica-Bold')
        .text(abbr.abbreviation, 72, y, { width: col1Width });
      
      this.doc.font('Helvetica')
        .text(abbr.definition, 72 + col1Width, y, { width: col2Width });
      
      y += 20;
      
      if (y > this.doc.page.height - 100) {
        this.doc.addPage();
        y = 72;
      }
    });
  }
  
  /**
   * Generate sections
   */
  private generateSections(sections: DMPSection[], level: number = 0): void {
    sections.forEach(section => {
      if (level === 0) {
        this.doc.addPage();
      }
      
      this.addTOCEntry(
        `${section.sectionNumber}. ${section.title}`,
        level
      );
      
      // Section header
      const fontSize = level === 0 ? 18 : level === 1 ? 14 : 12;
      const font = level <= 1 ? 'Helvetica-Bold' : 'Helvetica';
      
      this.doc.fontSize(fontSize)
        .font(font)
        .text(`${section.sectionNumber}. ${section.title}`, 72, this.doc.y);
      
      this.doc.moveDown();
      
      // Section content
      if (section.content) {
        this.doc.fontSize(11)
          .font('Helvetica')
          .text(section.content, {
            align: 'left',
            lineGap: 2,
          });
        
        this.doc.moveDown();
      }
      
      // Subsections
      if (section.subsections && section.subsections.length > 0) {
        this.generateSections(section.subsections, level + 1);
      }
    });
  }
  
  /**
   * Add header and footer
   */
  private addHeaderFooter(dmp: DMP, options: PDFExportOptions): void {
    const oldY = this.doc.y;
    
    // Header
    if (options.includeHeaders) {
      this.doc.fontSize(9)
        .font('Helvetica')
        .text(
          `${dmp.studyInfo.protocolNumber} - Data Management Plan ${dmp.version}`,
          72,
          30,
          { align: 'center', width: this.doc.page.width - 144 }
        );
      
      // Header line
      this.doc.moveTo(72, 55)
        .lineTo(this.doc.page.width - 72, 55)
        .stroke();
    }
    
    // Footer
    if (options.includeFooters) {
      const footerY = this.doc.page.height - 50;
      
      // Footer line
      this.doc.moveTo(72, footerY - 5)
        .lineTo(this.doc.page.width - 72, footerY - 5)
        .stroke();
      
      this.doc.fontSize(9)
        .font('Helvetica')
        .text(
          'CONFIDENTIAL',
          72,
          footerY,
          { align: 'left', width: 100 }
        );
      
      if (options.includePageNumbers) {
        this.doc.text(
          `Page ${this.pageNumber}`,
          this.doc.page.width - 172,
          footerY,
          { align: 'right', width: 100 }
        );
      }
      
      this.doc.text(
        this.formatDate(new Date()),
        0,
        footerY,
        { align: 'center', width: this.doc.page.width }
      );
    }
    
    this.doc.y = oldY;
  }
  
  /**
   * Add watermark
   */
  private addWatermark(text: string): void {
    const oldOpacity = this.doc.opacity();
    const oldFontSize = this.doc.fontSize();
    
    this.doc.opacity(0.1)
      .fontSize(60)
      .rotate(45, { origin: [this.doc.page.width / 2, this.doc.page.height / 2] })
      .text(
        text,
        0,
        this.doc.page.height / 2 - 30,
        { align: 'center', width: this.doc.page.width }
      )
      .rotate(-45, { origin: [this.doc.page.width / 2, this.doc.page.height / 2] })
      .fontSize(oldFontSize)
      .opacity(oldOpacity);
  }
  
  /**
   * Add TOC entry
   */
  private addTOCEntry(title: string, level: number): void {
    this.tocEntries.push({
      title,
      page: this.pageNumber,
      level,
    });
  }
  
  /**
   * Generate dot leader
   */
  private generateDotLeader(
    leftText: string,
    rightText: string,
    availableWidth: number
  ): string {
    const leftWidth = this.doc.widthOfString(leftText);
    const rightWidth = this.doc.widthOfString(rightText);
    const dotWidth = this.doc.widthOfString('.');
    
    const dotsNeeded = Math.floor(
      (availableWidth - leftWidth - rightWidth - 20) / dotWidth
    );
    
    return ' ' + '.'.repeat(Math.max(dotsNeeded, 3)) + ' ';
  }
  
  /**
   * Format date
   */
  private formatDate(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                   'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    return `${d.getDate().toString().padStart(2, '0')}-${months[d.getMonth()]}-${d.getFullYear()}`;
  }
}

// Export singleton instance
export const pdfExporter = new PDFExporter();