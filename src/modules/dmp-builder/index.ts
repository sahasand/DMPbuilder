// DMP Builder Module - Main Export

export { DMPBuilderModule } from './dmp-builder-module';

// Export types specific to DMP Builder
export interface DMPBuilderResult {
  dmp: any; // DMP type from existing types
  generationMetrics: {
    sectionCount: number;
    aiGenerated: boolean;
    modulesUsed: boolean;
    executionTime: number;
  };
  recommendations: string[];
}

// Default export for module loading
export { DMPBuilderModule as default } from './dmp-builder-module';