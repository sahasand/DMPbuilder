import dotenv from 'dotenv';
import { z } from 'zod';
import path from 'path';

// Load environment variables
dotenv.config();

// Define configuration schema
const ConfigSchema = z.object({
  // API Configuration
  anthropicApiKey: z.string().min(1, 'ANTHROPIC_API_KEY is required'),
  geminiApiKey: z.string().min(1, 'GEMINI_API_KEY is required'),
  
  // Server Configuration
  port: z.number().int().positive().default(3000),
  nodeEnv: z.enum(['development', 'production', 'test']).default('development'),
  
  // Application Configuration
  appName: z.string().default('Clinical DMP Generator'),
  version: z.string().default('1.0.0'),
  
  // File Paths
  outputDir: z.string().default(path.join(process.cwd(), 'output')),
  tempDir: z.string().default(path.join(process.cwd(), 'temp')),
  
  // Clinical Standards
  meddraDictionary: z.string().default('27.0'),
  whodrugDictionary: z.string().default('GLOBALB3Mar24'),
  
  // Data Management Configuration
  queryResponseTime: z.number().default(5), // days
  queryClosureTime: z.number().default(10), // days
  
  // API Rate Limiting
  apiRateLimit: z.number().default(10), // requests per minute
  apiTimeout: z.number().default(300000), // 5 minutes in milliseconds
  
  // Security
  enableCors: z.boolean().default(true),
  allowedOrigins: z.array(z.string()).default(['http://localhost:3000']),
  
  // Logging
  logLevel: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  logDir: z.string().default(path.join(process.cwd(), 'logs')),
});

// Type for the configuration
export type Config = z.infer<typeof ConfigSchema>;

// Create configuration object from environment variables
const createConfig = (): Config => {
  try {
    const config = ConfigSchema.parse({
      // API Configuration
      anthropicApiKey: process.env.ANTHROPIC_API_KEY,
      geminiApiKey: process.env.GEMINI_API_KEY,
      
      // Server Configuration
      port: process.env.PORT ? parseInt(process.env.PORT, 10) : undefined,
      nodeEnv: process.env.NODE_ENV,
      
      // Application Configuration
      appName: process.env.APP_NAME,
      version: process.env.VERSION,
      
      // File Paths
      outputDir: process.env.OUTPUT_DIR,
      tempDir: process.env.TEMP_DIR,
      
      // Clinical Standards
      meddraDictionary: process.env.MEDDRA_VERSION,
      whodrugDictionary: process.env.WHODRUG_VERSION,
      
      // Data Management Configuration
      queryResponseTime: process.env.QUERY_RESPONSE_TIME 
        ? parseInt(process.env.QUERY_RESPONSE_TIME, 10) 
        : undefined,
      queryClosureTime: process.env.QUERY_CLOSURE_TIME 
        ? parseInt(process.env.QUERY_CLOSURE_TIME, 10) 
        : undefined,
      
      // API Rate Limiting
      apiRateLimit: process.env.API_RATE_LIMIT 
        ? parseInt(process.env.API_RATE_LIMIT, 10) 
        : undefined,
      apiTimeout: process.env.API_TIMEOUT 
        ? parseInt(process.env.API_TIMEOUT, 10) 
        : undefined,
      
      // Security
      enableCors: process.env.ENABLE_CORS === 'true',
      allowedOrigins: process.env.ALLOWED_ORIGINS 
        ? process.env.ALLOWED_ORIGINS.split(',') 
        : undefined,
      
      // Logging
      logLevel: process.env.LOG_LEVEL as Config['logLevel'],
      logDir: process.env.LOG_DIR,
    });
    
    return config;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`);
      throw new Error(`Configuration validation failed:\n${issues.join('\n')}`);
    }
    throw error;
  }
};

// Export singleton configuration
export const config = createConfig();

// Helper function to validate configuration at runtime
export const validateConfig = (): void => {
  try {
    ConfigSchema.parse(config);
    console.log('Configuration validated successfully');
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Configuration validation failed:', error.errors);
      process.exit(1);
    }
  }
};

// Helper function to get config value with fallback
export const getConfigValue = <K extends keyof Config>(
  key: K,
  fallback?: Config[K]
): Config[K] => {
  const value = config[key];
  if (value === undefined && fallback !== undefined) {
    return fallback;
  }
  return value;
};

// Helper function to check if running in production
export const isProduction = (): boolean => config.nodeEnv === 'production';

// Helper function to check if running in development
export const isDevelopment = (): boolean => config.nodeEnv === 'development';

// Helper function to check if running in test
export const isTest = (): boolean => config.nodeEnv === 'test';

// Export clinical standards configuration
export const clinicalStandards = {
  meddra: {
    version: config.meddraDictionary,
    name: 'Medical Dictionary for Regulatory Activities',
  },
  whodrug: {
    version: config.whodrugDictionary,
    name: 'World Health Organization Drug Dictionary',
  },
  cdisc: {
    sdtm: '3.4',
    cdash: '2.1',
    adam: '1.1',
  },
};

// Export data management configuration
export const dataManagementConfig = {
  query: {
    responseTimeDays: config.queryResponseTime,
    closureTimeDays: config.queryClosureTime,
  },
  review: {
    frequency: 'continuous',
    types: ['endpoint', 'comprehensive', 'safety'],
  },
  sae: {
    reportingTimeframe: 24, // hours
    notificationEmails: true,
  },
};