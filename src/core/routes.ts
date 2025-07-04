import { Express, Request, Response } from 'express';
import express from 'express';
import multer from 'multer';
import path from 'path';
import { asyncHandler } from '../utils/error-handler';
import { logInfo } from '../utils/logger';
import { mainGenerator } from '../generators/main-generator';
import { markdownExporter } from '../exporters/markdown-exporter';
import { pdfExporter } from '../exporters/pdf-exporter';
import { wordExporter } from '../exporters/word-exporter';
import { config } from './config';
import fs from 'fs/promises';

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(config.tempDir, 'uploads');
    await fs.mkdir(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  },
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB
  }
});

export const setupRoutes = (app: Express): void => {
  // API version prefix
  const apiV1 = '/api/v1';
  
  // Root endpoint
  app.get('/', (req: Request, res: Response) => {
    res.json({
      name: 'Clinical DMP Generator API',
      version: '1.0.0',
      endpoints: {
        health: '/health',
        api: {
          generate: `${apiV1}/dmp/generate`,
          parse: {
            protocol: `${apiV1}/parse/protocol`,
            crf: `${apiV1}/parse/crf`,
          },
          validate: `${apiV1}/validate/dmp`,
          export: `${apiV1}/export/:format`,
        },
      },
    });
  });
  
  // DMP Generation endpoint
  app.post(
    `${apiV1}/dmp/generate`,
    upload.fields([
      { name: 'protocol', maxCount: 1 },
      { name: 'crf', maxCount: 1 }
    ]),
    asyncHandler(async (req: Request, res: Response) => {
      logInfo('DMP generation requested via API');
      
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      
      if (!files.protocol || !files.crf) {
        return res.status(400).json({
          error: 'Both protocol and CRF files are required'
        });
      }
      
      const protocolFile = files.protocol[0];
      const crfFile = files.crf[0];
      
      // Validate files exist
      if (!protocolFile) {
        return res.status(400).json({
          error: 'Protocol file is missing'
        });
      }
      
      if (!crfFile) {
        return res.status(400).json({
          error: 'CRF file is missing'
        });
      }
      
      // Parse options from request
      const options = {
        includeRiskAssessment: req.body.includeRisk === 'true',
        includeTimeline: req.body.includeTimeline === 'true',
      };
      
      try {
        logInfo('Starting DMP generation with files', { 
          protocolFile: protocolFile.path, 
          crfFile: crfFile.path,
          options 
        });
        
        // Generate DMP
        const result = await mainGenerator.generateFromFiles(
          protocolFile.path,
          crfFile.path,
          options
        );
        
        logInfo('DMP generation completed successfully');
        
        // Save generated files
        const outputDir = path.join(config.outputDir, result.dmp.studyInfo.protocolNumber);
        await fs.mkdir(outputDir, { recursive: true });
        
        // Generate all formats
        const formats = ['pdf', 'word', 'markdown'] as const;
        const downloadLinks: Record<string, string> = {};
        
        for (const format of formats) {
          const filename = `DMP_${result.dmp.studyInfo.protocolNumber}.${format === 'word' ? 'doc' : format === 'markdown' ? 'md' : format}`;
          const outputPath = path.join(outputDir, filename);
          
          if (format === 'pdf') {
            await pdfExporter.exportToPDF(result.dmp, { outputPath });
          } else if (format === 'word') {
            await wordExporter.exportToWord(result.dmp, { outputPath });
          } else if (format === 'markdown') {
            await markdownExporter.exportToMarkdown(result.dmp, { outputPath });
          }
          
          downloadLinks[format] = `/api/v1/dmp/download/${result.dmp.studyInfo.protocolNumber}?format=${format}`;
        }
        
        // Cleanup uploaded files
        await fs.unlink(protocolFile.path);
        await fs.unlink(crfFile.path);
        
        res.json({
          studyInfo: result.dmp.studyInfo,
          metadata: result.metadata,
          downloadLinks,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const errorStack = error instanceof Error ? error.stack : undefined;
        
        logInfo('DMP generation failed', { 
          error: errorMessage, 
          stack: errorStack,
          protocolFile: protocolFile.path,
          crfFile: crfFile.path 
        });
        
        // Cleanup on error
        try {
          await fs.unlink(protocolFile.path);
          await fs.unlink(crfFile.path);
        } catch (cleanupError) {
          const cleanupMessage = cleanupError instanceof Error ? cleanupError.message : 'Unknown cleanup error';
          logInfo('Cleanup error', { error: cleanupMessage });
        }
        
        // Return detailed error response
        return res.status(500).json({
          error: 'Failed to generate DMP',
          details: errorMessage,
          timestamp: new Date().toISOString()
        });
      }
    })
  );
  
  // Protocol parsing endpoint
  app.post(
    `${apiV1}/parse/protocol`,
    asyncHandler(async (req: Request, res: Response) => {
      logInfo('Protocol parsing requested');
      
      // TODO: Implement protocol parsing logic
      res.json({
        message: 'Protocol parsing endpoint - implementation pending',
      });
    })
  );
  
  // CRF parsing endpoint
  app.post(
    `${apiV1}/parse/crf`,
    asyncHandler(async (req: Request, res: Response) => {
      logInfo('CRF parsing requested');
      
      // TODO: Implement CRF parsing logic
      res.json({
        message: 'CRF parsing endpoint - implementation pending',
      });
    })
  );
  
  // DMP validation endpoint
  app.post(
    `${apiV1}/validate/dmp`,
    asyncHandler(async (req: Request, res: Response) => {
      logInfo('DMP validation requested');
      
      // TODO: Implement DMP validation logic
      res.json({
        message: 'DMP validation endpoint - implementation pending',
      });
    })
  );
  
  // Export endpoint
  app.post(
    `${apiV1}/export/:format`,
    asyncHandler(async (req: Request, res: Response) => {
      const { format } = req.params;
      logInfo('Export requested', { format });
      
      // TODO: Implement export logic
      res.json({
        message: `Export to ${format} - implementation pending`,
      });
    })
  );
  
  // Clinical standards reference endpoint
  app.get(
    `${apiV1}/standards`,
    asyncHandler(async (req: Request, res: Response) => {
      res.json({
        meddra: {
          version: '27.0',
          description: 'Medical Dictionary for Regulatory Activities',
        },
        whodrug: {
          version: 'GLOBALB3Mar24',
          description: 'World Health Organization Drug Dictionary',
        },
        cdisc: {
          sdtm: {
            version: '3.4',
            description: 'Study Data Tabulation Model',
          },
          cdash: {
            version: '2.1',
            description: 'Clinical Data Acquisition Standards Harmonization',
          },
          adam: {
            version: '1.1',
            description: 'Analysis Data Model',
          },
        },
      });
    })
  );
  
  // Template sections endpoint
  app.get(
    `${apiV1}/templates/sections`,
    asyncHandler(async (req: Request, res: Response) => {
      res.json({
        sections: [
          'Study Information',
          'Roles and Responsibilities',
          'Network Directories',
          'EDC System',
          'Data Cleaning Plan',
          'Reporting of AEs and SAEs',
          'Medical Coding Process',
          'Clinical Data Management Tasks',
          'Protocol Deviation',
          'Database Lock',
          'Appendix',
        ],
      });
    })
  );
  
  // DMP Download endpoint
  app.get(
    `${apiV1}/dmp/download/:protocolNumber`,
    asyncHandler(async (req: Request, res: Response) => {
      const { protocolNumber } = req.params;
      const formatParam = req.query.format;
      const format = typeof formatParam === 'string' ? formatParam : 'pdf';
      
      const validFormats = ['pdf', 'word', 'markdown'];
      if (!validFormats.includes(format)) {
        return res.status(400).json({ error: 'Invalid format' });
      }
      
      if (!protocolNumber) {
        return res.status(400).json({ error: 'Protocol number is required' });
      }
      
      const extension = format === 'word' ? 'doc' : format === 'markdown' ? 'md' : format;
      const filename = `DMP_${protocolNumber}.${extension}`;
      const filePath = path.join(config.outputDir, protocolNumber, filename);
      
      try {
        await fs.access(filePath);
        res.download(filePath, filename);
      } catch (error) {
        res.status(404).json({ error: 'File not found' });
      }
    })
  );
  
  // Serve static files in production
  if (config.nodeEnv === 'production') {
    const frontendBuildPath = path.join(__dirname, '../../frontend/build');
    app.use(express.static(frontendBuildPath));
    
    // Catch all handler for React routes
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(frontendBuildPath, 'index.html'));
    });
  }
};