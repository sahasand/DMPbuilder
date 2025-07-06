import { Express, Request, Response } from 'express';
import express from 'express';
import multer from 'multer';
import path from 'path';
import { asyncHandler } from '../utils/error-handler';
import { logInfo, logError } from '../utils/logger';
import { mainGenerator } from '../generators/main-generator';
import { markdownExporter } from '../exporters/markdown-exporter';
import { pdfExporter } from '../exporters/pdf-exporter';
import { wordExporter } from '../exporters/word-exporter';
import { config } from './config';
import fs from 'fs/promises';
import { PlatformEngine } from '../platform';

// Protocol Analyzer imports
import { protocolAnalyzerEngine } from '../modules/protocol-analyzer/core/analyzer-engine';
import { clinicalValidator } from '../modules/protocol-analyzer/validation/clinical-validator';
import { performanceMonitor } from '../modules/protocol-analyzer/monitoring/performance-monitor';
import { reportTemplateEngine } from '../modules/protocol-analyzer/reports/template-engine';
import { errorHandler, ProtocolAnalysisError } from '../modules/protocol-analyzer/utils/error-handler';
import { protocolParser } from '../parsers/protocol-parser';
import { crfParser } from '../parsers/crf-parser';
import { clinicalProcessor } from '../api/clinical-processor';
import { markdownToPDFConverter } from '../modules/protocol-analyzer/exports/markdown-to-pdf';

// CRF Validator imports
import { crfValidatorEngine } from '../modules/crf-validator/core/crf-validator-engine';
import { ValidationOptions } from '../modules/crf-validator/types/crf-validation-types';

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

export const setupRoutes = (app: Express, platformEngine?: PlatformEngine): void => {
  // API version prefix
  const apiV1 = '/api/v1';
  
  // Root endpoint
  app.get('/', (req: Request, res: Response) => {
    res.json({
      name: 'Clinical DMP Generator API',
      version: '2.0.0',
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
          protocolAnalyzer: {
            analyze: `${apiV1}/protocol-analyzer/analyze`,
            reports: `${apiV1}/protocol-analyzer/reports/:id`,
            export: `${apiV1}/protocol-analyzer/export`,
            templates: `${apiV1}/protocol-analyzer/templates`,
            status: `${apiV1}/protocol-analyzer/status`
          },
          crfValidator: {
            validate: `${apiV1}/crf-validator/validate`,
            reports: `${apiV1}/crf-validator/reports/:id`,
            export: `${apiV1}/crf-validator/export`,
            status: `${apiV1}/crf-validator/status`
          }
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
        useModules: req.body.useModules !== 'false', // Default to true
        moduleOptions: {
          parallel: req.body.moduleParallel === 'true',
          continueOnError: req.body.moduleContinueOnError !== 'false', // Default to true
          specificModules: req.body.moduleIds ? req.body.moduleIds.split(',') : undefined
        }
      };
      
      try {
        logInfo('Starting DMP generation with files', { 
          protocolFile: protocolFile.path, 
          crfFile: crfFile.path,
          options 
        });
        
        let result;
        
        if (platformEngine) {
          // Use platform engine for DMP generation
          result = await generateDMPViaPlatform(
            platformEngine,
            protocolFile.path,
            crfFile.path,
            options,
            req
          );
        } else {
          // Fallback to legacy generator
          result = await mainGenerator.generateFromFiles(
            protocolFile.path,
            crfFile.path,
            options
          );
        }
        
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

  // Platform and Module API endpoints
  if (platformEngine) {
    // Get all registered modules
    app.get(
      `${apiV1}/modules`,
      asyncHandler(async (req: Request, res: Response) => {
        const modules = platformEngine.getRegisteredModules();
        const activeModules = platformEngine.getActiveModules();
        res.json({
          totalModules: modules.length,
          activeModules: activeModules.length,
          modules: modules.map(m => ({
            id: m.id,
            name: m.name,
            version: m.version,
            description: m.description,
            type: m.type,
            enabled: m.isEnabled()
          }))
        });
      })
    );

    // Get platform information
    app.get(
      `${apiV1}/platform/info`,
      asyncHandler(async (req: Request, res: Response) => {
        const modules = platformEngine.getRegisteredModules();
        const workflows = platformEngine.getRegisteredWorkflows();
        const services = platformEngine.getPlatformServices();
        const config = platformEngine.getPlatformConfig();
        
        res.json({
          platform: {
            name: config.name,
            version: config.version,
            environment: config.environment
          },
          modules: {
            total: modules.length,
            active: platformEngine.getActiveModules().length,
            list: modules.map(m => ({ id: m.id, name: m.name, version: m.version, type: m.type }))
          },
          workflows: {
            total: workflows.length,
            list: workflows.map(w => ({ id: w.id, name: w.name, version: w.version }))
          },
          services: {
            available: Object.keys(services)
          }
        });
      })
    );

    // Get specific module details
    app.get(
      `${apiV1}/modules/:moduleId`,
      asyncHandler(async (req: Request, res: Response) => {
        const modules = platformEngine.getRegisteredModules();
        const module = modules.find(m => m.id === req.params.moduleId);
        if (!module) {
          return res.status(404).json({ error: 'Module not found' });
        }
        res.json({
          id: module.id,
          name: module.name,
          version: module.version,
          description: module.description,
          type: module.type,
          config: module.config,
          enabled: module.isEnabled()
        });
      })
    );

    // Enable/disable module
    app.patch(
      `${apiV1}/modules/:moduleId/toggle`,
      asyncHandler(async (req: Request, res: Response) => {
        const { enabled } = req.body;
        if (typeof enabled !== 'boolean') {
          return res.status(400).json({ error: 'enabled field must be boolean' });
        }

        try {
          // TODO: Implement module enable/disable in platform engine
          res.json({ 
            success: true, 
            enabled,
            message: 'Module enable/disable functionality will be implemented in platform engine' 
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          res.status(404).json({ error: errorMessage });
        }
      })
    );
  }

  // ===============================================
  // PROTOCOL ANALYZER STANDALONE API ENDPOINTS
  // ===============================================

  // In-memory storage for analysis results (in production, use database)
  const analysisResults = new Map<string, any>();
  const reportCache = new Map<string, { content: string; format: string; generatedAt: Date }>();

  // 1. POST /api/v1/protocol-analyzer/analyze
  app.post(
    `${apiV1}/protocol-analyzer/analyze`,
    upload.single('protocol'),
    asyncHandler(async (req: Request, res: Response) => {
      logInfo('Protocol Analyzer analysis requested via API');

      try {
        let protocolText: string;

        // Handle file upload or text input
        if (req.file) {
          // File upload mode
          const protocolFile = req.file;

          logInfo('Processing uploaded protocol file', {
            protocolFile: protocolFile.originalname,
            size: protocolFile.size
          });

          // Parse protocol file
          protocolText = await protocolParser.parseFromPDF(protocolFile.path);

          // Cleanup uploaded file
          await fs.unlink(protocolFile.path);

        } else if (req.body.protocolText) {
          // Text input mode
          protocolText = req.body.protocolText;
          
          logInfo('Processing protocol text input', {
            protocolLength: protocolText.length
          });

        } else {
          return res.status(400).json({
            error: 'Either upload a protocol file or provide protocolText in request body'
          });
        }

        // Parse analysis options
        const analysisOptions = {
          analysisDepth: req.body.analysisDepth || 'Standard',
          regulatoryRegion: req.body.regulatoryRegion || 'FDA',
          industry: req.body.industry || 'Pharmaceutical',
          includeBenchmarking: req.body.includeBenchmarking === 'true',
          includeDesignAnalysis: req.body.includeDesignAnalysis !== 'false',
          includeEndpointAssessment: req.body.includeEndpointAssessment !== 'false',
          includePopulationAnalysis: req.body.includePopulationAnalysis !== 'false',
          includeStatisticalAnalysis: req.body.includeStatisticalAnalysis !== 'false',
          includeTimelineAnalysis: req.body.includeTimelineAnalysis !== 'false',
          includeRiskAssessment: req.body.includeRiskAssessment !== 'false',
          includeOptimization: req.body.includeOptimization !== 'false',
          generateExecutiveSummary: req.body.generateExecutiveSummary !== 'false'
        };

        // Log extracted content before AI processing
        logInfo('Extracted protocol content for analysis', {
          protocolTextLength: protocolText.length,
          protocolPreview: protocolText.substring(0, 300)
        });

        // Process protocol document
        const processingResult = await clinicalProcessor.processProtocolOnly(
          protocolText,
          {
            includeRiskAssessment: analysisOptions.includeRiskAssessment,
            includeTimeline: analysisOptions.includeTimelineAnalysis,
            preferredProvider: 'hybrid'
          }
        );

        // Log processed protocol data
        logInfo('Protocol processing completed', {
          protocolNumber: processingResult.protocol.protocolNumber,
          studyTitle: processingResult.protocol.studyTitle,
          studyPhase: processingResult.protocol.studyPhase,
          indication: processingResult.protocol.indication,
          primaryEndpoints: processingResult.protocol.endpoints?.primary,
          processingTime: processingResult.metadata.processingTime
        });

        if (!processingResult.protocol.protocolNumber) {
          processingResult.protocol.protocolNumber = `PA-${Date.now()}`;
        }

        // Run comprehensive analysis
        logInfo('Starting Protocol Analyzer engine analysis', {
          analysisOptions
        });

        const analysisResult = await protocolAnalyzerEngine.analyzeProtocol(
          processingResult.protocol,
          [], // No CRFs needed for protocol-focused analysis
          analysisOptions
        );

        // Use the analyzer engine's generated ID
        const analysisId = analysisResult.analysisId;
        
        // Start performance monitoring with the correct ID
        performanceMonitor.startAnalysis(analysisId);

        // Log analysis results
        logInfo('Protocol analysis completed', {
          analysisId: analysisResult.analysisId,
          feasibilityScore: analysisResult.executiveSummary?.overallAssessment?.feasibilityScore,
          riskLevel: analysisResult.executiveSummary?.overallAssessment?.riskLevel,
          complexity: analysisResult.executiveSummary?.overallAssessment?.complexity,
          recommendation: analysisResult.executiveSummary?.overallAssessment?.recommendation,
          keyFindingsCount: analysisResult.executiveSummary?.keyFindings?.length,
          criticalIssuesCount: analysisResult.executiveSummary?.criticalIssues?.length,
          processingTime: analysisResult.processingTime
        });

        // Run validation if requested
        let validationResult;
        if (req.body.includeValidation !== 'false') {
          validationResult = await clinicalValidator.validateAnalysis(
            processingResult.protocol,
            [], // No CRFs for protocol-focused validation
            analysisResult
          );
        }

        // Get performance metrics
        const performanceMetrics = await performanceMonitor.endAnalysis(analysisId);

        // Store results for later retrieval
        const completeResult = {
          analysisId,
          analysisResult,
          validationResult,
          performanceMetrics,
          protocol: processingResult.protocol,
          analysisOptions,
          generatedAt: new Date(),
          status: 'completed'
        };

        analysisResults.set(analysisId, completeResult);

        // Return comprehensive response
        res.json({
          analysisId,
          status: 'completed',
          analysis: {
            protocolInfo: analysisResult.protocolInfo,
            executiveSummary: analysisResult.executiveSummary,
            feasibilityScore: analysisResult.executiveSummary.overallAssessment.feasibilityScore,
            riskLevel: analysisResult.executiveSummary.overallAssessment.riskLevel,
            complexity: analysisResult.executiveSummary.overallAssessment.complexity,
            recommendation: analysisResult.executiveSummary.overallAssessment.recommendation,
            keyFindings: analysisResult.executiveSummary.keyFindings,
            criticalIssues: analysisResult.executiveSummary.criticalIssues,
            topRecommendations: analysisResult.executiveSummary.topRecommendations
          },
          validation: validationResult ? {
            isValid: validationResult.isValid,
            score: validationResult.score,
            category: validationResult.category,
            confidence: validationResult.confidence,
            findingsCount: validationResult.findings.length,
            benchmarksCount: validationResult.benchmarkComparisons.length
          } : null,
          performance: performanceMetrics ? {
            processingTime: performanceMetrics.duration,
            optimizationScore: performanceMetrics.optimization.score,
            memoryUsage: performanceMetrics.totalMemoryUsage.peak
          } : null,
          availableReports: [
            { templateId: 'executive-summary', name: 'Clinical Development Executive Summary' },
            { templateId: 'clinical-operations', name: 'Clinical Operations Analysis' },
            { templateId: 'regulatory-strategy', name: 'Regulatory Strategy & Pathway Analysis' },
            { templateId: 'operational-feasibility', name: 'Operational Feasibility Assessment' }
          ],
          generatedAt: completeResult.generatedAt,
          api: {
            getFullResults: `${apiV1}/protocol-analyzer/reports/${analysisId}`,
            exportReport: `${apiV1}/protocol-analyzer/export`,
            reportTemplates: `${apiV1}/protocol-analyzer/templates`
          }
        });

        logInfo('Protocol analysis completed successfully', {
          analysisId,
          processingTime: performanceMetrics?.duration || 0,
          feasibilityScore: analysisResult.executiveSummary.overallAssessment.feasibilityScore,
          riskLevel: analysisResult.executiveSummary.overallAssessment.riskLevel
        });

      } catch (error) {
        const analysisError = errorHandler.handleError(error, {
          endpoint: 'analyze',
          requestBody: JSON.stringify(req.body).substring(0, 200)
        });

        logInfo('Protocol analysis failed', {
          error: analysisError.message,
          code: analysisError.code,
          category: analysisError.category
        });

        // Return structured error response
        res.status(analysisError.severity === 'Critical' ? 500 : 400).json({
          error: 'Protocol analysis failed',
          code: analysisError.code,
          message: analysisError.message,
          category: analysisError.category,
          severity: analysisError.severity,
          suggestion: analysisError.suggestion,
          retryable: analysisError.retryable,
          timestamp: new Date().toISOString()
        });
      }
    })
  );

  // 2. GET /api/v1/protocol-analyzer/reports/:id
  app.get(
    `${apiV1}/protocol-analyzer/reports/:id`,
    asyncHandler(async (req: Request, res: Response) => {
      const { id } = req.params;
      const format = req.query.format as string || 'json';

      logInfo('Protocol analysis report requested', { analysisId: id, format });

      const result = analysisResults.get(id);
      if (!result) {
        return res.status(404).json({
          error: 'Analysis not found',
          analysisId: id
        });
      }

      try {
        if (format === 'json') {
          // Return full JSON results
          res.json({
            analysisId: id,
            status: result.status,
            generatedAt: result.generatedAt,
            analysisOptions: result.analysisOptions,
            analysis: result.analysisResult,
            validation: result.validationResult,
            performance: result.performanceMetrics,
            protocol: {
              protocolNumber: result.protocol.protocolNumber,
              studyTitle: result.protocol.studyTitle,
              studyPhase: result.protocol.studyPhase,
              therapeuticArea: result.protocol.therapeuticArea
            }
          });
        } else {
          // Generate formatted report
          const templateId = req.query.template as string || 'executive-summary';
          const cacheKey = `${id}-${templateId}-${format}`;
          
          let reportContent: string;
          
          // Check cache first
          const cached = reportCache.get(cacheKey);
          if (cached && Date.now() - cached.generatedAt.getTime() < 3600000) { // 1 hour cache
            reportContent = cached.content;
          } else {
            // Generate new report
            const reportResult = await reportTemplateEngine.generateReport(
              result.analysisResult,
              { templateId },
              result.validationResult,
              result.performanceMetrics
            );
            
            reportContent = reportResult.content;
            reportCache.set(cacheKey, {
              content: reportContent,
              format,
              generatedAt: new Date()
            });
          }

          // Set appropriate content type
          if (format === 'html') {
            res.set('Content-Type', 'text/html');
          } else {
            res.set('Content-Type', 'text/plain');
          }

          res.send(reportContent);
        }

      } catch (error) {
        const analysisError = errorHandler.handleError(error, { analysisId: id, format });
        
        res.status(500).json({
          error: 'Failed to generate report',
          analysisId: id,
          message: analysisError.message,
          timestamp: new Date().toISOString()
        });
      }
    })
  );

  // 3. POST /api/v1/protocol-analyzer/export
  app.post(
    `${apiV1}/protocol-analyzer/export`,
    asyncHandler(async (req: Request, res: Response) => {
      const { analysisId, format, templateId } = req.body;

      if (!analysisId || !format) {
        return res.status(400).json({
          error: 'analysisId and format are required'
        });
      }

      logInfo('Protocol analysis export requested', { analysisId, format, templateId });

      // Debug: Log available analysis IDs
      const availableIds = Array.from(analysisResults.keys());
      logInfo('Available analysis IDs in cache', { 
        availableIds, 
        requestedId: analysisId,
        cacheSize: analysisResults.size 
      });

      const result = analysisResults.get(analysisId);
      if (!result) {
        logError('Analysis not found in cache', {
          analysisId,
          availableIds,
          cacheSize: analysisResults.size
        });
        return res.status(404).json({
          error: 'Analysis not found',
          analysisId,
          availableAnalysisIds: availableIds
        });
      }

      // Debug: Log analysis data before report generation
      logInfo('Analysis data retrieved for export', {
        analysisId,
        hasAnalysisResult: !!result.analysisResult,
        hasExecutiveSummary: !!result.analysisResult?.executiveSummary,
        keyFindingsCount: result.analysisResult?.executiveSummary?.keyFindings?.length,
        criticalIssuesCount: result.analysisResult?.executiveSummary?.criticalIssues?.length,
        feasibilityScore: result.analysisResult?.executiveSummary?.overallAssessment?.feasibilityScore
      });

      console.log('Analysis data for report:', {
        analysisId: result.analysisId,
        protocolInfo: result.analysisResult?.protocolInfo,
        executiveSummary: result.analysisResult?.executiveSummary,
        designAnalysis: result.analysisResult?.designAnalysis
      });

      // Enhanced debugging for data structure
      console.log('Full analysis result structure:', {
        hasExecutiveSummary: !!result.analysisResult?.executiveSummary,
        executiveSummaryKeys: result.analysisResult?.executiveSummary ? Object.keys(result.analysisResult.executiveSummary) : null,
        hasOverallAssessment: !!result.analysisResult?.executiveSummary?.overallAssessment,
        overallAssessmentData: result.analysisResult?.executiveSummary?.overallAssessment,
        hasKeyFindings: !!result.analysisResult?.executiveSummary?.keyFindings,
        keyFindingsData: result.analysisResult?.executiveSummary?.keyFindings,
        protocolInfoKeys: result.analysisResult?.protocolInfo ? Object.keys(result.analysisResult.protocolInfo) : null
      });

      try {
        const template = templateId || 'executive-summary';
        const reportResult = await reportTemplateEngine.generateReport(
          result.analysisResult,
          { templateId: template },
          result.validationResult,
          result.performanceMetrics
        );

        const filename = `protocol-analysis-${analysisId}-${template}.${format === 'word' ? 'doc' : format === 'pdf' ? 'pdf' : 'md'}`;
        
        // Set download headers
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        
        if (format === 'pdf') {
          // Convert markdown to PDF using Puppeteer
          logInfo('Converting markdown to PDF', { 
            analysisId, 
            contentLength: reportResult.content.length 
          });
          
          try {
            const pdfBuffer = await markdownToPDFConverter.convertToPDF(reportResult.content, {
              format: 'A4',
              displayHeaderFooter: true,
              headerTemplate: `
                <div style="font-size: 10px; width: 100%; text-align: center; margin-top: 10px;">
                  Protocol Analysis Report - ${result.analysisResult?.protocolInfo?.protocolNumber || 'Unknown'} - <span class="date"></span>
                </div>`,
              footerTemplate: `
                <div style="font-size: 10px; width: 100%; text-align: center; margin-bottom: 10px;">
                  Page <span class="pageNumber"></span> of <span class="totalPages"></span>
                </div>`
            });
            
            res.setHeader('Content-Type', 'application/pdf');
            res.send(pdfBuffer);
            
            logInfo('PDF conversion completed successfully', { 
              analysisId, 
              pdfSize: pdfBuffer.length 
            });
            
          } catch (pdfError) {
            logError('PDF conversion failed', pdfError, { analysisId });
            
            // Fallback to markdown if PDF conversion fails
            res.setHeader('Content-Type', 'text/plain');
            res.setHeader('Content-Disposition', `attachment; filename="protocol-analysis-${analysisId}-${template}.txt"`);
            res.send(`PDF generation failed. Here is the content in text format:\n\n${reportResult.content}`);
          }
        } else if (format === 'word') {
          // In a real implementation, convert to Word document
          res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
          res.send(Buffer.from(reportResult.content)); // Placeholder
        } else if (format === 'json') {
          res.setHeader('Content-Type', 'application/json');
          res.json({
            analysisId,
            report: reportResult.content,
            metadata: reportResult.metadata,
            generatedAt: new Date()
          });
        } else {
          // Default to markdown
          res.setHeader('Content-Type', 'text/markdown');
          res.send(reportResult.content);
        }

        logInfo('Protocol analysis export completed', { 
          analysisId, 
          format, 
          templateId: template,
          contentLength: reportResult.content.length
        });

      } catch (error) {
        const analysisError = errorHandler.handleError(error, { analysisId, format, templateId });
        
        res.status(500).json({
          error: 'Export failed',
          message: analysisError.message,
          timestamp: new Date().toISOString()
        });
      }
    })
  );

  // 4. GET /api/v1/protocol-analyzer/templates
  app.get(
    `${apiV1}/protocol-analyzer/templates`,
    asyncHandler(async (req: Request, res: Response) => {
      logInfo('Protocol analysis templates requested');

      try {
        const templates = reportTemplateEngine.getAvailableTemplates();
        
        res.json({
          templates: templates.map(template => ({
            id: template.id,
            name: template.name,
            description: template.description,
            targetAudience: template.targetAudience,
            format: template.format,
            sections: template.sections.map(section => ({
              id: section.id,
              title: section.title,
              contentType: section.contentType,
              required: section.required
            })),
            metadata: {
              version: template.metadata.version,
              complianceLevel: template.metadata.complianceLevel
            }
          })),
          totalTemplates: templates.length,
          supportedFormats: ['PDF', 'Word', 'HTML', 'JSON', 'Markdown'],
          supportedAudiences: ['Clinical Operations', 'Regulatory Affairs', 'Medical Affairs', 'Executive', 'Data Management', 'Biostatistics']
        });

      } catch (error) {
        const analysisError = errorHandler.handleError(error, { endpoint: 'templates' });
        
        res.status(500).json({
          error: 'Failed to retrieve templates',
          message: analysisError.message,
          timestamp: new Date().toISOString()
        });
      }
    })
  );

  // 5. GET /api/v1/protocol-analyzer/status
  app.get(
    `${apiV1}/protocol-analyzer/status`,
    asyncHandler(async (req: Request, res: Response) => {
      logInfo('Protocol analyzer status requested');

      try {
        const performanceSummary = performanceMonitor.getCurrentPerformanceSummary();
        const errorStats = errorHandler.getErrorStatistics();
        const availableTemplates = reportTemplateEngine.getAvailableTemplates();

        res.json({
          status: 'operational',
          version: '2.0.0',
          capabilities: {
            analysisTypes: [
              'Study Design Analysis',
              'Endpoint Assessment', 
              'Population Analysis',
              'Statistical Analysis',
              'Timeline Analysis',
              'Risk Assessment',
              'Optimization Recommendations'
            ],
            supportedPhases: ['1', '2', '3', '4', 'N/A'],
            supportedRegions: ['FDA', 'EMA', 'PMDA', 'Global'],
            analysisDepths: ['Basic', 'Standard', 'Comprehensive', 'Expert'],
            reportFormats: ['PDF', 'Word', 'HTML', 'JSON', 'Markdown']
          },
          performance: {
            systemHealth: performanceSummary.systemHealth,
            activeAnalyses: performanceSummary.activeAnalyses,
            averageAnalysisTime: Math.round(performanceSummary.averageAnalysisTime),
            averageOptimizationScore: Math.round(performanceSummary.averageOptimizationScore)
          },
          statistics: {
            totalAnalyses: analysisResults.size,
            totalErrors: errorStats.totalErrors,
            availableTemplates: availableTemplates.length,
            cacheSize: reportCache.size
          },
          limits: {
            maxFileSize: '100MB',
            maxAnalysisTime: '5 minutes',
            maxConcurrentAnalyses: 10,
            cacheRetention: '1 hour'
          },
          endpoints: {
            analyze: `${apiV1}/protocol-analyzer/analyze`,
            reports: `${apiV1}/protocol-analyzer/reports/:id`,
            export: `${apiV1}/protocol-analyzer/export`,
            templates: `${apiV1}/protocol-analyzer/templates`,
            status: `${apiV1}/protocol-analyzer/status`
          },
          documentation: {
            apiDocs: '/api/docs',
            examples: '/api/examples',
            support: 'https://github.com/anthropics/claude-code/issues'
          },
          lastUpdated: new Date().toISOString()
        });

      } catch (error) {
        const analysisError = errorHandler.handleError(error, { endpoint: 'status' });
        
        res.status(500).json({
          status: 'error',
          error: 'Failed to retrieve status',
          message: analysisError.message,
          timestamp: new Date().toISOString()
        });
      }
    })
  );

  // Cleanup endpoint (for development/testing)
  app.delete(
    `${apiV1}/protocol-analyzer/cache`,
    asyncHandler(async (req: Request, res: Response) => {
      logInfo('Protocol analyzer cache cleanup requested');
      
      const analysisCount = analysisResults.size;
      const reportCount = reportCache.size;
      
      analysisResults.clear();
      reportCache.clear();
      
      res.json({
        message: 'Cache cleared successfully',
        cleared: {
          analyses: analysisCount,
          reports: reportCount
        },
        timestamp: new Date().toISOString()
      });
    })
  );
  
  // ===============================================
  // CRF VALIDATOR API ENDPOINTS
  // ===============================================

  // In-memory storage for validation results (in production, use database)
  const validationResults = new Map<string, any>();
  const validationReportCache = new Map<string, { content: string; format: string; generatedAt: Date }>();

  // 1. POST /api/v1/crf-validator/validate
  app.post(
    `${apiV1}/crf-validator/validate`,
    upload.fields([
      { name: 'protocol', maxCount: 1 },
      { name: 'crf', maxCount: 1 }
    ]),
    asyncHandler(async (req: Request, res: Response) => {
      logInfo('CRF Validator validation requested via API');

      try {
        const files = req.files as { [fieldname: string]: Express.Multer.File[] };
        
        if (!files.protocol || !files.crf) {
          return res.status(400).json({
            error: 'Both protocol and CRF files are required'
          });
        }

        const protocolFile = files.protocol[0];
        const crfFile = files.crf[0];

        logInfo('Processing uploaded files for CRF validation', {
          protocolFile: protocolFile.originalname,
          crfFile: crfFile.originalname,
          protocolSize: protocolFile.size,
          crfSize: crfFile.size
        });

        // Parse protocol file
        const protocolText = await protocolParser.parseFromPDF(protocolFile.path);
        
        // Parse CRF file  
        const crfText = await crfParser.parseFromPDF(crfFile.path);
        const crfSpecifications = crfParser.parseFromText(crfText);

        // Process protocol document
        const processingResult = await clinicalProcessor.processProtocolOnly(
          protocolText,
          {
            includeRiskAssessment: true,
            includeTimeline: true,
            preferredProvider: 'hybrid'
          }
        );

        // Parse validation options
        const validationOptions: ValidationOptions = {
          validationDepth: req.body.validationDepth || 'Standard',
          regulatoryRegion: req.body.regulatoryRegion || 'FDA',
          industry: req.body.industry || 'Pharmaceutical',
          includeComplianceCheck: req.body.includeComplianceCheck !== 'false',
          includeEfficiencyAnalysis: req.body.includeEfficiencyAnalysis !== 'false',
          includeProtocolAlignment: req.body.includeProtocolAlignment !== 'false',
          generateRecommendations: req.body.generateRecommendations !== 'false',
          customParameters: req.body.customParameters ? JSON.parse(req.body.customParameters) : {}
        };

        logInfo('Starting CRF validation', {
          protocolNumber: processingResult.protocol.protocolNumber,
          studyTitle: processingResult.protocol.studyTitle,
          crfCount: crfSpecifications.length,
          validationOptions
        });

        // Run comprehensive CRF validation
        const validationResult = await crfValidatorEngine.validateCRF(
          processingResult.protocol,
          crfSpecifications,
          validationOptions
        );

        // Store results for later retrieval
        validationResults.set(validationResult.validationId, {
          validationResult,
          protocol: processingResult.protocol,
          crfs: crfSpecifications,
          validationOptions,
          timestamp: new Date()
        });

        // Cleanup uploaded files
        await fs.unlink(protocolFile.path);
        await fs.unlink(crfFile.path);

        logInfo('CRF validation completed successfully', {
          validationId: validationResult.validationId,
          overallScore: validationResult.overallScore,
          criticalIssues: validationResult.criticalIssues.length,
          recommendations: validationResult.recommendations.length
        });

        // Return comprehensive validation response
        res.json({
          validationId: validationResult.validationId,
          status: 'completed',
          validation: {
            overallScore: validationResult.overallScore,
            completenessScore: validationResult.completenessScore,
            qualityScore: validationResult.qualityScore,
            complianceScore: validationResult.complianceScore,
            qualityLevel: validationResult.executiveSummary.overallAssessment.qualityLevel,
            protocolAlignment: validationResult.executiveSummary.overallAssessment.protocolAlignment,
            recommendation: validationResult.executiveSummary.overallAssessment.recommendation,
            keyFindings: validationResult.validationFindings.slice(0, 10),
            criticalIssues: validationResult.criticalIssues,
            topRecommendations: validationResult.recommendations.slice(0, 5),
            complianceStatus: validationResult.executiveSummary.complianceStatus
          },
          timestamp: new Date().toISOString(),
          metadata: {
            processingTime: validationResult.processingTime,
            protocolPages: Math.ceil(protocolText.length / 2000),
            crfPages: Math.ceil(crfText.length / 2000),
            validationComponents: ['Structure Analysis', 'Protocol Alignment', 'CDISC Compliance']
          }
        });

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logError('CRF validation failed', error);

        res.status(500).json({
          error: 'Failed to validate CRF',
          details: errorMessage,
          timestamp: new Date().toISOString()
        });
      }
    })
  );

  // 2. GET /api/v1/crf-validator/reports/:id
  app.get(
    `${apiV1}/crf-validator/reports/:id`,
    asyncHandler(async (req: Request, res: Response) => {
      const { id } = req.params;
      const format = req.query.format as string || 'json';

      const storedResult = validationResults.get(id);
      if (!storedResult) {
        return res.status(404).json({ error: 'Validation result not found' });
      }

      if (format === 'json') {
        res.json(storedResult.validationResult);
      } else {
        res.status(400).json({ error: 'Only JSON format is currently supported' });
      }
    })
  );

  // 3. POST /api/v1/crf-validator/export
  app.post(
    `${apiV1}/crf-validator/export`,
    asyncHandler(async (req: Request, res: Response) => {
      const { validationId, format = 'pdf' } = req.body;

      const storedResult = validationResults.get(validationId);
      if (!storedResult) {
        return res.status(404).json({ error: 'Validation result not found' });
      }

      if (format === 'json') {
        res.json({
          export: storedResult.validationResult,
          exportedAt: new Date().toISOString(),
          format: 'json'
        });
      } else if (format === 'pdf') {
        try {
          // Start with the minimal PDF exporter (safest option)
          logInfo('Attempting minimal PDF export (safe mode)', { validationId });
          const { minimalCRFPdfExporter } = await import('../modules/crf-validator/exports/minimal-pdf-exporter');
          
          const minimalPdfBuffer = await minimalCRFPdfExporter.exportToPDF(storedResult.validationResult);
          
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Disposition', `attachment; filename="CRF_Validation_Report_${validationId}_Minimal.pdf"`);
          res.setHeader('Content-Length', minimalPdfBuffer.length);
          res.send(minimalPdfBuffer);
        } catch (minimalError) {
          logInfo('Minimal PDF failed, trying simple PDF', { 
            validationId, 
            error: minimalError instanceof Error ? minimalError.message : 'Unknown error' 
          });
          
          // Try simple PDF exporter as fallback
          try {
            const { simpleCRFPdfExporter } = await import('../modules/crf-validator/exports/simple-pdf-exporter');
            
            const simplePdfBuffer = await simpleCRFPdfExporter.exportToPDF(storedResult.validationResult);
            
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="CRF_Validation_Report_${validationId}_Simple.pdf"`);
            res.setHeader('Content-Length', simplePdfBuffer.length);
            res.send(simplePdfBuffer);
          } catch (simplePdfError) {
            logInfo('Simple PDF also failed, trying full PDF with timeout', { 
              validationId,
              simplePdfError: simplePdfError instanceof Error ? simplePdfError.message : 'Unknown error'
            });
            
            // Last PDF attempt with full exporter and timeout
            try {
              const pdfPromise = (async () => {
                const { crfValidationPdfExporter } = await import('../modules/crf-validator/exports/crf-validation-pdf-exporter');
                
                return await crfValidationPdfExporter.exportToPDF(storedResult.validationResult, {
                  includeHeaders: false, // Disable problematic features
                  includeFooters: false,
                  includePageNumbers: false,
                  includeWatermark: false
                });
              })();
              
              // Short timeout for full exporter
              const timeoutPromise = new Promise<never>((_, reject) => {
                setTimeout(() => reject(new Error('PDF generation timeout')), 10000);
              });
              
              const pdfBuffer = await Promise.race([pdfPromise, timeoutPromise]);
              
              res.setHeader('Content-Type', 'application/pdf');
              res.setHeader('Content-Disposition', `attachment; filename="CRF_Validation_Report_${validationId}.pdf"`);
              res.setHeader('Content-Length', pdfBuffer.length);
              res.send(pdfBuffer);
            } catch (fullPdfError) {
              // Final fallback to JSON export
              logInfo('All PDF options failed, falling back to JSON', { 
                validationId,
                minimalError: minimalError instanceof Error ? minimalError.message : 'Unknown error',
                simplePdfError: simplePdfError instanceof Error ? simplePdfError.message : 'Unknown error',
                fullPdfError: fullPdfError instanceof Error ? fullPdfError.message : 'Unknown error'
              });
              
              res.setHeader('Content-Type', 'application/json');
              res.setHeader('Content-Disposition', `attachment; filename="CRF_Validation_Report_${validationId}.json"`);
              res.json({
                error: 'PDF generation failed in all modes, providing JSON export instead',
                fallbackReasons: {
                  minimal: minimalError instanceof Error ? minimalError.message : 'Unknown error',
                  simple: simplePdfError instanceof Error ? simplePdfError.message : 'Unknown error',
                  full: fullPdfError instanceof Error ? fullPdfError.message : 'Unknown error'
                },
                export: storedResult.validationResult,
                exportedAt: new Date().toISOString(),
                format: 'json'
              });
            }
          }
        }
      } else {
        res.status(400).json({ 
          error: 'Unsupported export format',
          supportedFormats: ['json', 'pdf']
        });
      }
    })
  );

  // 4. GET /api/v1/crf-validator/status
  app.get(
    `${apiV1}/crf-validator/status`,
    asyncHandler(async (req: Request, res: Response) => {
      const activeValidations = 0; // In real implementation, track active validations
      const queuedValidations = 0; // In real implementation, track queued validations
      
      res.json({
        status: 'healthy',
        activeValidations,
        queuedValidations,
        systemLoad: Math.round(Math.random() * 100), // Mock system load
        lastValidation: Array.from(validationResults.values()).pop()?.timestamp?.toISOString() || null,
        totalValidations: validationResults.size,
        cacheSize: validationReportCache.size
      });
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

// Helper function to generate DMP via platform engine
async function generateDMPViaPlatform(
  platformEngine: PlatformEngine,
  protocolFilePath: string,
  crfFilePath: string,
  options: any,
  req: Request
): Promise<any> {
  const { protocolParser } = await import('../parsers/protocol-parser');
  const { crfParser } = await import('../parsers/crf-parser');
  const { clinicalProcessor } = await import('../api/clinical-processor');
  
  // Parse protocol and CRF files to text
  const protocolText = await protocolParser.parseFromPDF(protocolFilePath);
  const crfText = await crfParser.parseFromPDF(crfFilePath);
  
  // Process text into StudyProtocol and CRF objects
  const processingResult = await clinicalProcessor.processStudyDocuments(
    protocolText,
    crfText,
    {
      includeRiskAssessment: options.includeRiskAssessment,
      includeTimeline: options.includeTimeline,
      preferredProvider: 'hybrid'
    }
  );
  
  const protocolData = processingResult.protocol;
  const crfData = processingResult.crfs;
  
  // Validate that protocol has required fields
  if (!protocolData.protocolNumber) {
    throw new Error('Protocol processing failed: Missing protocolNumber');
  }
  
  if (!protocolData.studyTitle) {
    throw new Error('Protocol processing failed: Missing studyTitle');
  }
  
  // Create a mock user session for the platform with all required permissions
  const userSession = {
    id: 'api-session',
    user: {
      id: 'api-user',
      username: 'api',
      email: 'api@system.com',
      firstName: 'API',
      lastName: 'User',
      roles: [{ 
        id: 'api', 
        name: 'api', 
        permissions: [
          '*', 
          'study.read', 
          'study.write', 
          'dmp.create', 
          'dmp.read', 
          'dmp.write', 
          'dmp.admin',
          'protocol.analyze'
        ] 
      }],
      organization: 'System',
      permissions: [
        '*', 
        'study.read', 
        'study.write', 
        'dmp.create', 
        'dmp.read', 
        'dmp.write', 
        'dmp.admin',
        'protocol.analyze'
      ]
    },
    permissions: [
      '*', 
      'study.read', 
      'study.write', 
      'dmp.create', 
      'dmp.read', 
      'dmp.write', 
      'dmp.admin',
      'protocol.analyze'
    ],
    roles: ['api'],
    studies: [],
    loginTime: new Date(),
    lastActivity: new Date()
  };
  
  // Generate DMP through platform engine
  const dmp = await platformEngine.generateDMP(
    protocolData, 
    crfData, 
    {
      useModules: options.useModules,
      moduleIds: options.moduleOptions?.specificModules,
      userId: userSession.user.id,
      session: userSession
    }
  );
  
  // Validate DMP structure for backward compatibility
  if (!dmp || typeof dmp !== 'object') {
    throw new Error('Invalid DMP generated: DMP is null or not an object');
  }
  
  if (!dmp.studyInfo || !dmp.studyInfo.protocolNumber) {
    throw new Error('Invalid DMP generated: Missing studyInfo.protocolNumber');
  }
  
  // Return result in expected format for backward compatibility
  return {
    dmp,
    protocol: protocolData,
    crfs: crfData,
    generatedAt: new Date(),
    metadata: {
      platform: true,
      moduleCount: 2,
      generationType: 'platform-workflow'
    }
  };
}