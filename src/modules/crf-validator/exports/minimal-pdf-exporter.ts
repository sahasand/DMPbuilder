import PDFDocument from 'pdfkit';
import { CRFValidationResult } from '../types/crf-validation-types';
import { createModuleLogger } from '../../../utils/logger';

const logger = createModuleLogger('minimal-crf-pdf-exporter');

/**
 * Minimal PDF exporter - no event handlers, no complex processing
 * Designed to never cause stack overflow
 */
export class MinimalCRFPDFExporter {
  /**
   * Generate a minimal PDF report with only basic information
   */
  async exportToPDF(validationResult: CRFValidationResult): Promise<Buffer> {
    logger.info('Generating minimal CRF validation PDF (safe mode)', {
      validationId: validationResult.validationId,
      overallScore: validationResult.overallScore,
    });
    
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margins: { top: 50, bottom: 50, left: 50, right: 50 }
        });
        
        const chunks: Buffer[] = [];
        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        
        // NO EVENT HANDLERS - this was the source of the recursive loop!
        
        // Simple title
        doc.fontSize(18)
          .text('CRF Validation Report', 50, 50);
        
        doc.moveDown(2);
        
        // Basic info only
        doc.fontSize(12)
          .text(`Validation ID: ${validationResult.validationId || 'N/A'}`)
          .text(`Overall Score: ${validationResult.overallScore || 0}/100`)
          .text(`Generated: ${new Date().toLocaleDateString()}`);
        
        doc.moveDown(2);
        
        // Summary scores
        doc.text('Scores:')
          .text(`  Completeness: ${validationResult.completenessScore || 'N/A'}`)
          .text(`  Quality: ${validationResult.qualityScore || 'N/A'}`)
          .text(`  Compliance: ${validationResult.complianceScore || 'N/A'}`);
        
        doc.moveDown(2);
        
        // Basic counts
        const findingsCount = validationResult.validationFindings?.length || 0;
        const criticalCount = validationResult.validationFindings?.filter(f => f.severity === 'Critical').length || 0;
        const recommendationsCount = validationResult.recommendations?.length || 0;
        
        doc.text('Summary:')
          .text(`  Total Findings: ${findingsCount}`)
          .text(`  Critical Issues: ${criticalCount}`)
          .text(`  Recommendations: ${recommendationsCount}`);
        
        doc.moveDown(2);
        
        // Only show first 5 critical findings if any
        if (criticalCount > 0) {
          doc.text('Critical Issues (First 5):');
          const criticalFindings = validationResult.validationFindings
            ?.filter(f => f.severity === 'Critical')
            .slice(0, 5);
          
          criticalFindings?.forEach((finding, index) => {
            const text = `${index + 1}. ${(finding.finding || 'No description').substring(0, 80)}...`;
            doc.fontSize(10).text(text, 60);
          });
        }
        
        doc.moveDown(2);
        
        // Footer
        doc.fontSize(8)
          .text('Note: This is a minimal report. Use JSON export for complete details.', 50, doc.page.height - 80);
        
        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }
}

export const minimalCRFPdfExporter = new MinimalCRFPDFExporter();