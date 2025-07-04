import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { config, validateConfig } from './config';
import { logInfo, logError, createModuleLogger } from '../utils/logger';
import { errorHandler } from '../utils/error-handler';
import { setupRoutes } from './routes';

const logger = createModuleLogger('app');

export class ClinicalDMPGenerator {
  private app: Express;
  
  constructor() {
    this.app = express();
    this.initialize();
  }
  
  private initialize(): void {
    // Validate configuration
    validateConfig();
    
    // Setup middleware
    this.setupMiddleware();
    
    // Setup routes
    this.setupRoutes();
    
    // Setup error handling
    this.setupErrorHandling();
  }
  
  private setupMiddleware(): void {
    // Body parsing
    this.app.use(express.json({ limit: '50mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '50mb' }));
    
    // CORS
    if (config.enableCors) {
      this.app.use(cors({
        origin: config.allowedOrigins,
        credentials: true,
      }));
    }
    
    // Request logging
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      const start = Date.now();
      const { method, url, ip } = req;
      
      res.on('finish', () => {
        const duration = Date.now() - start;
        logInfo(`${method} ${url} ${res.statusCode} ${duration}ms`, {
          ip,
          userAgent: req.get('user-agent'),
          statusCode: res.statusCode,
          duration,
        });
      });
      
      next();
    });
    
    // Health check endpoint
    this.app.get('/health', (req: Request, res: Response) => {
      res.json({
        status: 'healthy',
        version: config.version,
        timestamp: new Date().toISOString(),
      });
    });
  }
  
  private setupRoutes(): void {
    setupRoutes(this.app);
  }
  
  private setupErrorHandling(): void {
    // 404 handler
    this.app.use((req: Request, res: Response) => {
      res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.method} ${req.url} not found`,
      });
    });
    
    // Global error handler
    this.app.use(errorHandler);
  }
  
  public async start(): Promise<void> {
    try {
      const server = this.app.listen(config.port, () => {
        logInfo(`${config.appName} v${config.version} started on port ${config.port}`, {
          environment: config.nodeEnv,
          pid: process.pid,
        });
      });
      
      // Graceful shutdown
      process.on('SIGTERM', () => {
        logInfo('SIGTERM received, shutting down gracefully');
        server.close(() => {
          logInfo('Server closed');
          process.exit(0);
        });
      });
      
      process.on('SIGINT', () => {
        logInfo('SIGINT received, shutting down gracefully');
        server.close(() => {
          logInfo('Server closed');
          process.exit(0);
        });
      });
      
    } catch (error) {
      logError('Failed to start server', error);
      process.exit(1);
    }
  }
}

// Start the application if this is the main module
if (require.main === module) {
  const app = new ClinicalDMPGenerator();
  app.start().catch((error) => {
    logError('Application startup failed', error);
    process.exit(1);
  });
}

export default ClinicalDMPGenerator;