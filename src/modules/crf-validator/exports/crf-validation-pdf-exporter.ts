import PDFDocument from 'pdfkit';
import { CRFValidationResult } from '../types/crf-validation-types';
import { createModuleLogger } from '../../../utils/logger';

const logger = createModuleLogger('crf-validation-pdf-exporter');

export interface CRFValidationPDFExportOptions {
  outputPath?: string;
  includeWatermark?: boolean;
  watermarkText?: string;
  includeHeaders?: boolean;
  includeFooters?: boolean;
  includePageNumbers?: boolean;
}

export class CRFValidationPDFExporter {
  private doc: PDFDocument;
  private pageNumber: number = 0;

  /**
   * Export CRF Validation Result to PDF format
   */
  async exportToPDF(
    validationResult: CRFValidationResult,
    options: CRFValidationPDFExportOptions = {}
  ): Promise<Buffer> {
    logger.info('Exporting CRF Validation to PDF', {
      validationId: validationResult.validationId,
      overallScore: validationResult.overallScore,
    });
    
    return new Promise((resolve, reject) => {
      try {
        this.initializeDocument();
        
        // Setup event handlers
        const chunks: Buffer[] = [];
        this.doc.on('data', chunk => chunks.push(chunk));
        this.doc.on('end', () => {
          const buffer = Buffer.concat(chunks);
          resolve(buffer);
        });
        
        // Generate PDF content
        this.generatePDF(validationResult, options);
        
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
        Title: 'CRF Validation Report',
        Author: 'Clinical DMP Generator',
        Subject: 'CRF Validation Report',
        Keywords: 'clinical trial, CRF, validation, report',
      },
    });
    
    this.pageNumber = 1;
  }

  /**
   * Generate PDF content
   */
  private generatePDF(validationResult: CRFValidationResult, options: CRFValidationPDFExportOptions): void {
    try {
      // Validate and sanitize input data to prevent stack overflow
      const sanitizedResult = this.sanitizeValidationResult(validationResult);
      
      // DO NOT use pageAdded event handlers - they cause recursive loops!
      // Instead, manually add headers/footers when creating new pages

      // Title page
      this.generateTitlePage(sanitizedResult);
      this.addHeaderFooterSafe(sanitizedResult, options);
      
      // Executive Summary
      this.doc.addPage();
      this.pageNumber++;
      this.addHeaderFooterSafe(sanitizedResult, options);
      this.generateExecutiveSummary(sanitizedResult);
      
      // Detailed Findings (with pagination for large datasets)
      this.doc.addPage();
      this.pageNumber++;
      this.addHeaderFooterSafe(sanitizedResult, options);
      this.generateDetailedFindings(sanitizedResult, options);
      
      // Recommendations (with pagination for large datasets)
      this.doc.addPage();
      this.pageNumber++;
      this.addHeaderFooterSafe(sanitizedResult, options);
      this.generateRecommendations(sanitizedResult, options);
    } catch (error) {
      logger.error('Error generating PDF content', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        validationId: validationResult.validationId 
      });
      throw error;
    }
  }

  /**
   * Sanitize validation result to prevent stack overflow
   */
  private sanitizeValidationResult(result: CRFValidationResult): CRFValidationResult {
    const MAX_FINDINGS = 100; // Limit findings to prevent overflow
    const MAX_RECOMMENDATIONS = 50; // Limit recommendations
    const MAX_STRING_LENGTH = 1000; // Limit string lengths
    
    return {
      ...result,
      validationFindings: (result.validationFindings || [])
        .slice(0, MAX_FINDINGS)
        .map(finding => ({
          ...finding,
          finding: this.truncateString(finding.finding, MAX_STRING_LENGTH),
          impact: this.truncateString(finding.impact, MAX_STRING_LENGTH),
          recommendation: this.truncateString(finding.recommendation, MAX_STRING_LENGTH)
        })),
      recommendations: (result.recommendations || [])
        .slice(0, MAX_RECOMMENDATIONS)
        .map(rec => ({
          ...rec,
          recommendation: this.truncateString(rec.recommendation, MAX_STRING_LENGTH),
          rationale: this.truncateString(rec.rationale, MAX_STRING_LENGTH),
          impact: this.truncateString(rec.impact, MAX_STRING_LENGTH)
        }))
    };
  }

  /**
   * Safely truncate strings to prevent overflow
   */
  private truncateString(str: string, maxLength: number): string {
    if (!str || typeof str !== 'string') return '';
    if (str.length <= maxLength) return str;
    return str.substring(0, maxLength - 3) + '...';
  }

  /**
   * Generate title page
   */
  private generateTitlePage(validationResult: CRFValidationResult): void {
    const centerX = this.doc.page.width / 2;
    
    // Title
    this.doc.fontSize(24)
      .font('Helvetica-Bold')
      .text('CRF VALIDATION REPORT', 72, 200, {
        align: 'center',
      });
    
    // Validation information
    this.doc.fontSize(14)
      .font('Helvetica')
      .moveDown(3);
    
    const validationInfo = [
      `Validation ID: ${validationResult.validationId}`,
      `Overall Score: ${validationResult.overallScore}/100`,
      `Quality Level: ${validationResult.qualityLevel || 'N/A'}`,
      `Protocol Alignment: ${validationResult.protocolAlignment?.alignmentStatus || 'N/A'}`,
      `Recommendation: ${validationResult.recommendation || 'N/A'}`,
      ``,
      `Generated: ${new Date().toLocaleDateString()}`,
    ];
    
    validationInfo.forEach(line => {
      this.doc.text(line, 72, this.doc.y, { align: 'center' });
      this.doc.moveDown(0.7);
    });

    // Score visual
    this.generateScoreVisual(validationResult);
    
    // Confidentiality notice
    this.doc.fontSize(10)
      .font('Helvetica-Oblique')
      .text(
        'CONFIDENTIAL: This validation report contains sensitive information and is intended for authorized personnel only.',
        72,
        this.doc.page.height - 100,
        { align: 'center', width: this.doc.page.width - 144 }
      );
  }

  /**
   * Generate score visual on title page
   */
  private generateScoreVisual(validationResult: CRFValidationResult): void {
    const centerX = this.doc.page.width / 2;
    const y = this.doc.y + 30;
    
    // Overall score circle
    const radius = 50;
    this.doc.circle(centerX, y, radius)
      .lineWidth(8)
      .stroke(this.getScoreColor(validationResult.overallScore));
    
    this.doc.fontSize(32)
      .font('Helvetica-Bold')
      .fillColor(this.getScoreColor(validationResult.overallScore))
      .text(validationResult.overallScore.toString(), centerX - 25, y - 15);
    
    this.doc.fontSize(12)
      .fillColor('black')
      .text('Overall Score', centerX - 40, y + 20);
  }

  /**
   * Generate executive summary
   */
  private generateExecutiveSummary(validationResult: CRFValidationResult): void {
    this.doc.fontSize(18)
      .font('Helvetica-Bold')
      .fillColor('black')
      .text('Executive Summary', 72, 72);
    
    this.doc.fontSize(12)
      .font('Helvetica')
      .moveDown(2);

    // Scores table
    this.generateScoresTable(validationResult);
    
    // Key highlights
    this.doc.moveDown(2);
    this.doc.fontSize(14)
      .font('Helvetica-Bold')
      .text('Key Highlights');
    
    this.doc.fontSize(11)
      .font('Helvetica')
      .moveDown(0.5);
    
    const highlights = [
      `• Overall validation score: ${validationResult.overallScore}/100`,
      `• Quality assessment: ${validationResult.qualityLevel || 'Not assessed'}`,
      `• Protocol alignment: ${validationResult.protocolAlignment?.alignmentStatus || 'Not assessed'}`,
      `• Total findings: ${validationResult.validationFindings?.length || 0}`,
      `• Critical issues: ${validationResult.validationFindings?.filter(f => f.severity === 'Critical').length || 0}`,
      `• Recommendations provided: ${validationResult.recommendations?.length || 0}`,
    ];
    
    highlights.forEach(highlight => {
      this.doc.text(highlight, 72, this.doc.y);
      this.doc.moveDown(0.3);
    });
  }

  /**
   * Generate scores table
   */
  private generateScoresTable(validationResult: CRFValidationResult): void {
    const tableTop = this.doc.y;
    const colWidth = 120;
    const rowHeight = 25;
    
    const scores = [
      { label: 'Overall Score', value: validationResult.overallScore },
      { label: 'Completeness', value: validationResult.completenessScore || 0 },
      { label: 'Quality', value: validationResult.qualityScore || 0 },
      { label: 'Compliance', value: validationResult.complianceScore || 0 },
    ];
    
    // Table header
    this.doc.font('Helvetica-Bold')
      .text('Metric', 72, tableTop)
      .text('Score', 72 + colWidth, tableTop)
      .text('Rating', 72 + colWidth * 2, tableTop);
    
    // Header line
    this.doc.moveTo(72, tableTop + 15)
      .lineTo(72 + colWidth * 3, tableTop + 15)
      .stroke();
    
    let y = tableTop + 25;
    
    scores.forEach(score => {
      this.doc.font('Helvetica')
        .text(score.label, 72, y)
        .text(score.value.toString(), 72 + colWidth, y)
        .fillColor(this.getScoreColor(score.value))
        .text(this.getScoreRating(score.value), 72 + colWidth * 2, y)
        .fillColor('black');
      
      y += rowHeight;
    });
  }

  /**
   * Generate detailed findings
   */
  private generateDetailedFindings(validationResult: CRFValidationResult, options?: CRFValidationPDFExportOptions): void {
    this.doc.fontSize(18)
      .font('Helvetica-Bold')
      .text('Detailed Findings', 72, 72);
    
    this.doc.fontSize(12)
      .font('Helvetica')
      .moveDown(2);

    if (!validationResult.validationFindings || validationResult.validationFindings.length === 0) {
      this.doc.text('No specific findings to report.', 72, this.doc.y);
      return;
    }
    
    // Add note if findings were truncated
    if (validationResult.validationFindings.length >= 100) {
      this.doc.fontSize(10)
        .fillColor('#FF9800')
        .text('Note: Showing first 100 findings. Full details available in JSON export.', 72, this.doc.y);
      this.doc.moveDown(1)
        .fillColor('black');
    }
    
    // Group findings by severity
    const findingsBySeverity = {
      Critical: validationResult.validationFindings.filter(f => f.severity === 'Critical'),
      Major: validationResult.validationFindings.filter(f => f.severity === 'Major'),
      Minor: validationResult.validationFindings.filter(f => f.severity === 'Minor'),
      Info: validationResult.validationFindings.filter(f => f.severity === 'Info'),
    };
    
    Object.entries(findingsBySeverity).forEach(([severity, findings]) => {
      if (findings.length === 0) return;
      
      try {
        this.doc.fontSize(14)
          .font('Helvetica-Bold')
          .fillColor(this.getSeverityColor(severity))
          .text(`${severity} Issues (${findings.length})`, 72, this.doc.y);
        
        this.doc.fontSize(11)
          .font('Helvetica')
          .fillColor('black')
          .moveDown(0.5);
        
        // Process findings in chunks to prevent stack overflow
        this.processFindingsInChunks(findings, validationResult, options);
        
        this.doc.moveDown(1);
      } catch (error) {
        logger.warn('Error processing findings for severity', { 
          severity, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
        // Continue with next severity level
      }
    });
  }

  /**
   * Process findings in small chunks to prevent stack overflow
   */
  private processFindingsInChunks(findings: any[], validationResult: CRFValidationResult, options?: CRFValidationPDFExportOptions): void {
    const CHUNK_SIZE = 10; // Process 10 findings at a time
    
    for (let i = 0; i < findings.length; i += CHUNK_SIZE) {
      const chunk = findings.slice(i, i + CHUNK_SIZE);
      
      chunk.forEach((finding, chunkIndex) => {
        const globalIndex = i + chunkIndex;
        
        if (this.doc.y > this.doc.page.height - 150) {
          this.doc.addPage();
          this.pageNumber++;
          if (options) {
            this.addHeaderFooterSafe(validationResult, options);
          }
        }
        
        try {
          this.doc.text(`${globalIndex + 1}. ${finding.finding || 'No description'}`, 72, this.doc.y, {
            indent: 20,
            width: this.doc.page.width - 144
          });
          
          if (finding.impact) {
            this.doc.fontSize(10)
              .fillColor('#666666')
              .text(`Impact: ${finding.impact}`, 92, this.doc.y, {
                width: this.doc.page.width - 164
              });
          }
          
          if (finding.recommendation) {
            this.doc.fillColor('#0066cc')
              .text(`Recommendation: ${finding.recommendation}`, 92, this.doc.y, {
                width: this.doc.page.width - 164
              });
          }
          
          this.doc.fontSize(11)
            .fillColor('black')
            .moveDown(0.8);
        } catch (error) {
          logger.warn('Error rendering finding', { 
            index: globalIndex, 
            error: error instanceof Error ? error.message : 'Unknown error' 
          });
          // Skip this finding and continue
        }
      });
      
      // Small delay to prevent blocking
      if (i + CHUNK_SIZE < findings.length) {
        // Allow event loop to breathe between chunks
        process.nextTick(() => {});
      }
    }
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(validationResult: CRFValidationResult, options?: CRFValidationPDFExportOptions): void {
    this.doc.fontSize(18)
      .font('Helvetica-Bold')
      .text('Recommendations', 72, 72);
    
    this.doc.fontSize(12)
      .font('Helvetica')
      .moveDown(2);

    if (!validationResult.recommendations || validationResult.recommendations.length === 0) {
      this.doc.text('No specific recommendations at this time.', 72, this.doc.y);
      return;
    }
    
    // Add note if recommendations were truncated
    if (validationResult.recommendations.length >= 50) {
      this.doc.fontSize(10)
        .fillColor('#FF9800')
        .text('Note: Showing first 50 recommendations. Full details available in JSON export.', 72, this.doc.y);
      this.doc.moveDown(1)
        .fillColor('black');
    }
    
    // Group recommendations by priority
    const recsByPriority = {
      High: validationResult.recommendations.filter(r => r.priority === 'High'),
      Medium: validationResult.recommendations.filter(r => r.priority === 'Medium'),
      Low: validationResult.recommendations.filter(r => r.priority === 'Low'),
    };
    
    Object.entries(recsByPriority).forEach(([priority, recs]) => {
      if (recs.length === 0) return;
      
      try {
        this.doc.fontSize(14)
          .font('Helvetica-Bold')
          .fillColor(this.getPriorityColor(priority))
          .text(`${priority} Priority (${recs.length})`, 72, this.doc.y);
        
        this.doc.fontSize(11)
          .font('Helvetica')
          .fillColor('black')
          .moveDown(0.5);
        
        // Process recommendations in chunks to prevent stack overflow
        this.processRecommendationsInChunks(recs, validationResult, options);
        
        this.doc.moveDown(1);
      } catch (error) {
        logger.warn('Error processing recommendations for priority', { 
          priority, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
        // Continue with next priority level
      }
    });
  }

  /**
   * Process recommendations in small chunks to prevent stack overflow
   */
  private processRecommendationsInChunks(recommendations: any[], validationResult: CRFValidationResult, options?: CRFValidationPDFExportOptions): void {
    const CHUNK_SIZE = 5; // Process 5 recommendations at a time
    
    for (let i = 0; i < recommendations.length; i += CHUNK_SIZE) {
      const chunk = recommendations.slice(i, i + CHUNK_SIZE);
      
      chunk.forEach((rec, chunkIndex) => {
        const globalIndex = i + chunkIndex;
        
        if (this.doc.y > this.doc.page.height - 150) {
          this.doc.addPage();
          this.pageNumber++;
          if (options) {
            this.addHeaderFooterSafe(validationResult, options);
          }
        }
        
        try {
          this.doc.text(`${globalIndex + 1}. ${rec.recommendation || 'No recommendation'}`, 72, this.doc.y, {
            indent: 20,
            width: this.doc.page.width - 144
          });
          
          if (rec.rationale) {
            this.doc.fontSize(10)
              .fillColor('#666666')
              .text(`Rationale: ${rec.rationale}`, 92, this.doc.y, {
                width: this.doc.page.width - 164
              });
          }
          
          if (rec.implementationEffort && rec.timeline) {
            this.doc.fillColor('#0066cc')
              .text(`Effort: ${rec.implementationEffort} | Timeline: ${rec.timeline}`, 92, this.doc.y, {
                width: this.doc.page.width - 164
              });
          }
          
          this.doc.fontSize(11)
            .fillColor('black')
            .moveDown(0.8);
        } catch (error) {
          logger.warn('Error rendering recommendation', { 
            index: globalIndex, 
            error: error instanceof Error ? error.message : 'Unknown error' 
          });
          // Skip this recommendation and continue
        }
      });
      
      // Small delay to prevent blocking
      if (i + CHUNK_SIZE < recommendations.length) {
        // Allow event loop to breathe between chunks
        process.nextTick(() => {});
      }
    }
  }

  /**
   * Add header and footer safely without triggering events
   */
  private addHeaderFooterSafe(validationResult: CRFValidationResult, options: CRFValidationPDFExportOptions): void {
    if (!options.includeHeaders && !options.includeFooters) return;
    
    const oldY = this.doc.y;
    const oldFontSize = this.doc.fontSize();
    const oldFont = this.doc.font();
    
    try {
      // Header
      if (options.includeHeaders) {
        this.doc.fontSize(9)
          .font('Helvetica');
        
        // Use simple text positioning to avoid complex text rendering
        const headerText = `CRF Validation Report - ${validationResult.validationId || 'N/A'}`;
        const headerY = 30;
        this.doc.text(headerText, 72, headerY, { width: this.doc.page.width - 144 });
      }
      
      // Footer
      if (options.includeFooters) {
        const footerY = this.doc.page.height - 50;
        
        this.doc.fontSize(8)
          .font('Helvetica');
        
        // Simple footer without complex positioning
        if (options.includePageNumbers) {
          this.doc.text(`Page ${this.pageNumber}`, this.doc.page.width - 100, footerY);
        }
        
        this.doc.text('Generated by Clinical DMP Generator', 72, footerY);
      }
    } catch (error) {
      logger.warn('Error adding header/footer', { error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      // Restore original settings
      this.doc.fontSize(oldFontSize).font(oldFont);
      this.doc.y = oldY;
    }
  }

  /**
   * Add header and footer (deprecated - use addHeaderFooterSafe)
   */
  private addHeaderFooter(validationResult: CRFValidationResult, options: CRFValidationPDFExportOptions): void {
    // Redirect to safe version
    this.addHeaderFooterSafe(validationResult, options);
  }

  /**
   * Add watermark
   */
  private addWatermark(text: string): void {
    const oldOpacity = this.doc.opacity();
    
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
      .opacity(oldOpacity);
  }

  /**
   * Get color for score
   */
  private getScoreColor(score: number): string {
    if (score >= 85) return '#4CAF50'; // Green
    if (score >= 70) return '#FF9800'; // Orange
    return '#F44336'; // Red
  }

  /**
   * Get score rating
   */
  private getScoreRating(score: number): string {
    if (score >= 85) return 'Excellent';
    if (score >= 70) return 'Good';
    if (score >= 50) return 'Fair';
    return 'Poor';
  }

  /**
   * Get color for severity
   */
  private getSeverityColor(severity: string): string {
    switch (severity) {
      case 'Critical': return '#F44336';
      case 'Major': return '#FF9800';
      case 'Minor': return '#2196F3';
      default: return '#4CAF50';
    }
  }

  /**
   * Get color for priority
   */
  private getPriorityColor(priority: string): string {
    switch (priority) {
      case 'High': return '#F44336';
      case 'Medium': return '#FF9800';
      default: return '#4CAF50';
    }
  }
}

// Export singleton instance
export const crfValidationPdfExporter = new CRFValidationPDFExporter();