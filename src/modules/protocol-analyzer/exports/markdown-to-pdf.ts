// Markdown to PDF converter for Protocol Analyzer reports
import puppeteer, { Browser, Page } from 'puppeteer';
import { createModuleLogger, logInfo, logError } from '../../../utils/logger';

const logger = createModuleLogger('markdown-to-pdf');

export interface PDFGenerationOptions {
  format?: 'A4' | 'Letter';
  margin?: {
    top?: string;
    right?: string;
    bottom?: string;
    left?: string;
  };
  headerTemplate?: string;
  footerTemplate?: string;
  displayHeaderFooter?: boolean;
  landscape?: boolean;
  quality?: number;
}

export class MarkdownToPDFConverter {
  private browser: Browser | null = null;

  /**
   * Convert markdown content to PDF
   */
  async convertToPDF(
    markdownContent: string,
    options: PDFGenerationOptions = {}
  ): Promise<Buffer> {
    logInfo('Starting markdown to PDF conversion', {
      contentLength: markdownContent.length,
      options
    });

    try {
      // Initialize browser if needed
      if (!this.browser) {
        await this.initializeBrowser();
      }

      if (!this.browser) {
        throw new Error('Failed to initialize browser for PDF generation');
      }

      const page = await this.browser.newPage();

      // Convert markdown to HTML
      const htmlContent = this.markdownToHTML(markdownContent);
      
      // Set page content
      await page.setContent(htmlContent, { 
        waitUntil: 'networkidle0',
        timeout: 30000 
      });

      // Generate PDF
      const pdfOptions = {
        format: options.format || 'A4' as const,
        margin: {
          top: '1in',
          right: '1in',
          bottom: '1in',
          left: '1in',
          ...options.margin
        },
        displayHeaderFooter: options.displayHeaderFooter || true,
        headerTemplate: options.headerTemplate || `
          <div style="font-size: 10px; width: 100%; text-align: center; margin-top: 10px;">
            Protocol Analysis Report - <span class="date"></span>
          </div>`,
        footerTemplate: options.footerTemplate || `
          <div style="font-size: 10px; width: 100%; text-align: center; margin-bottom: 10px;">
            Page <span class="pageNumber"></span> of <span class="totalPages"></span>
          </div>`,
        printBackground: true,
        landscape: options.landscape || false
      };

      const pdfBuffer = await page.pdf(pdfOptions);

      await page.close();

      // Convert Uint8Array to Buffer if needed
      const finalBuffer = Buffer.from(pdfBuffer);

      logInfo('PDF generation completed successfully', {
        pdfSize: finalBuffer.length,
        contentLength: markdownContent.length
      });

      return finalBuffer;

    } catch (error) {
      logError('PDF generation failed', error);
      throw new Error(`PDF generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Convert markdown content to HTML with styling
   */
  private markdownToHTML(markdown: string): string {
    // Basic markdown to HTML conversion
    let html = markdown
      // Headers
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      // Bold and Italic
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      // Links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
      // Line breaks
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>')
      // Horizontal rules
      .replace(/^---$/gim, '<hr>')
      // Lists (basic implementation)
      .replace(/^\- (.*$)/gim, '<li>$1</li>')
      .replace(/^(\d+)\. (.*$)/gim, '<li>$1. $2</li>');

    // Wrap in paragraphs
    html = '<p>' + html + '</p>';

    // Fix multiple p tags
    html = html.replace(/<\/p><p>/g, '</p>\n<p>');

    // Wrap lists in ul tags (basic implementation)
    html = html.replace(/(<li>.*?<\/li>)/g, (match) => {
      if (!match.includes('<ul>')) {
        return '<ul>' + match + '</ul>';
      }
      return match;
    });

    // Add CSS styling
    const styledHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Protocol Analysis Report</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: none;
      margin: 0;
      padding: 20px;
      background: white;
    }
    h1, h2, h3, h4, h5, h6 {
      color: #2c3e50;
      margin-top: 2em;
      margin-bottom: 0.5em;
      page-break-after: avoid;
    }
    h1 {
      font-size: 2.2em;
      border-bottom: 3px solid #3498db;
      padding-bottom: 0.3em;
      page-break-before: auto;
    }
    h2 {
      font-size: 1.8em;
      border-bottom: 2px solid #e74c3c;
      padding-bottom: 0.2em;
      page-break-before: avoid;
    }
    h3 {
      font-size: 1.4em;
      color: #e67e22;
    }
    p {
      margin-bottom: 1em;
      text-align: justify;
      orphans: 2;
      widows: 2;
    }
    ul, ol {
      margin-bottom: 1em;
      padding-left: 2em;
    }
    li {
      margin-bottom: 0.5em;
    }
    strong {
      color: #2c3e50;
      font-weight: 600;
    }
    em {
      font-style: italic;
      color: #7f8c8d;
    }
    hr {
      border: none;
      border-top: 2px solid #bdc3c7;
      margin: 2em 0;
    }
    .page-break {
      page-break-before: always;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 1em 0;
      page-break-inside: avoid;
    }
    th, td {
      border: 1px solid #ddd;
      padding: 8px;
      text-align: left;
    }
    th {
      background-color: #f8f9fa;
      font-weight: 600;
      color: #2c3e50;
    }
    blockquote {
      border-left: 4px solid #3498db;
      margin: 1em 0;
      padding-left: 1em;
      color: #7f8c8d;
      font-style: italic;
    }
    code {
      background-color: #f8f9fa;
      padding: 2px 4px;
      border-radius: 3px;
      font-family: 'Courier New', monospace;
      font-size: 0.9em;
    }
    .analysis-summary {
      background-color: #f8f9fa;
      border: 1px solid #dee2e6;
      border-radius: 8px;
      padding: 1.5em;
      margin: 1em 0;
      page-break-inside: avoid;
    }
    .risk-high {
      color: #dc3545;
      font-weight: 600;
    }
    .risk-medium {
      color: #fd7e14;
      font-weight: 600;
    }
    .risk-low {
      color: #28a745;
      font-weight: 600;
    }
    @media print {
      body {
        padding: 0;
      }
      h1, h2, h3 {
        page-break-after: avoid;
      }
      ul, ol, blockquote {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
${html}
</body>
</html>`;

    return styledHTML;
  }

  /**
   * Initialize Puppeteer browser
   */
  private async initializeBrowser(): Promise<void> {
    try {
      logInfo('Initializing Puppeteer browser for PDF generation');
      
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--no-first-run',
          '--no-zygote',
          '--disable-extensions'
        ]
      });

      logInfo('Puppeteer browser initialized successfully');
    } catch (error) {
      logError('Failed to initialize Puppeteer browser', error);
      throw error;
    }
  }

  /**
   * Close the browser instance
   */
  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      logInfo('Puppeteer browser closed');
    }
  }

  /**
   * Get browser instance status
   */
  isInitialized(): boolean {
    return this.browser !== null && this.browser.isConnected();
  }
}

// Export singleton instance
export const markdownToPDFConverter = new MarkdownToPDFConverter();