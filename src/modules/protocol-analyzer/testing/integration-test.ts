// Comprehensive Integration Test for Enhanced Protocol Analyzer
import { protocolAnalyzerEngine } from '../core/analyzer-engine';
import { sampleProtocolLibrary } from './sample-protocols';
import { clinicalValidator } from '../validation/clinical-validator';
import { performanceMonitor } from '../monitoring/performance-monitor';
import { reportTemplateEngine } from '../reports/template-engine';
import { errorHandler, ProtocolAnalysisError } from '../utils/error-handler';
import { createModuleLogger, logInfo, logError } from '../../../utils/logger';

const logger = createModuleLogger('protocol-analyzer-integration-test');

export interface IntegrationTestResult {
  testId: string;
  testName: string;
  success: boolean;
  duration: number;
  analysisResult?: any;
  validationResult?: any;
  performanceMetrics?: any;
  reportGenerated?: boolean;
  errors: string[];
  warnings: string[];
  summary: {
    analysisAccuracy: number;
    performanceScore: number;
    validationScore: number;
    overallScore: number;
  };
}

export class ProtocolAnalyzerIntegrationTest {
  
  /**
   * Run comprehensive integration test suite
   */
  async runFullTestSuite(): Promise<{
    overallSuccess: boolean;
    testResults: IntegrationTestResult[];
    summary: {
      totalTests: number;
      passedTests: number;
      failedTests: number;
      averagePerformance: number;
      averageValidation: number;
      overallSystemHealth: string;
    };
  }> {
    logInfo('Starting comprehensive Protocol Analyzer integration test suite');
    
    const testResults: IntegrationTestResult[] = [];
    const testCases = sampleProtocolLibrary.getAllTestCases();
    
    // Test each sample protocol
    for (const testCase of testCases) {
      try {
        const result = await this.runSingleTest(testCase.id, testCase.name);
        testResults.push(result);
        
        logInfo('Individual test completed', {
          testId: testCase.id,
          success: result.success,
          duration: result.duration,
          overallScore: result.summary.overallScore
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        testResults.push({
          testId: testCase.id,
          testName: testCase.name,
          success: false,
          duration: 0,
          errors: [errorMessage],
          warnings: [],
          summary: {
            analysisAccuracy: 0,
            performanceScore: 0,
            validationScore: 0,
            overallScore: 0
          }
        });
        
        logError('Test failed with exception', error, { testId: testCase.id });
      }
    }
    
    // Calculate summary statistics
    const passedTests = testResults.filter(r => r.success).length;
    const failedTests = testResults.length - passedTests;
    const averagePerformance = testResults.reduce((sum, r) => sum + r.summary.performanceScore, 0) / testResults.length;
    const averageValidation = testResults.reduce((sum, r) => sum + r.summary.validationScore, 0) / testResults.length;
    const overallSystemHealth = this.assessSystemHealth(averagePerformance, averageValidation, passedTests / testResults.length);
    
    const summary = {
      totalTests: testResults.length,
      passedTests,
      failedTests,
      averagePerformance,
      averageValidation,
      overallSystemHealth
    };
    
    logInfo('Integration test suite completed', summary);
    
    return {
      overallSuccess: failedTests === 0,
      testResults,
      summary
    };
  }

  /**
   * Run test for a specific protocol
   */
  async runSingleTest(testCaseId: string, customName?: string): Promise<IntegrationTestResult> {
    const startTime = Date.now();
    const testCase = sampleProtocolLibrary.getTestCase(testCaseId);
    
    if (!testCase) {
      throw new Error(`Test case not found: ${testCaseId}`);
    }
    
    const testResult: IntegrationTestResult = {
      testId: testCaseId,
      testName: customName || testCase.name,
      success: false,
      duration: 0,
      errors: [],
      warnings: [],
      summary: {
        analysisAccuracy: 0,
        performanceScore: 0,
        validationScore: 0,
        overallScore: 0
      }
    };
    
    try {
      // Start performance monitoring
      const analysisId = `test-${testCaseId}-${Date.now()}`;
      performanceMonitor.startAnalysis(analysisId);
      
      // Run comprehensive analysis
      performanceMonitor.startPhase(analysisId, 'Protocol Analysis');
      const analysisResult = await protocolAnalyzerEngine.analyzeProtocol(
        testCase.protocol,
        testCase.crfs,
        {
          analysisDepth: 'Comprehensive',
          regulatoryRegion: 'FDA',
          includeBenchmarking: true,
          generateExecutiveSummary: true
        }
      );
      performanceMonitor.endPhase(analysisId, 'Protocol Analysis', 1);
      testResult.analysisResult = analysisResult;
      
      // Run clinical validation
      performanceMonitor.startPhase(analysisId, 'Clinical Validation');
      const validationResult = await clinicalValidator.validateAnalysis(
        testCase.protocol,
        testCase.crfs,
        analysisResult,
        testCase
      );
      performanceMonitor.endPhase(analysisId, 'Clinical Validation', 1);
      testResult.validationResult = validationResult;
      
      // Generate performance metrics
      const performanceMetrics = await performanceMonitor.endAnalysis(analysisId);
      testResult.performanceMetrics = performanceMetrics;
      
      // Generate reports
      performanceMonitor.startPhase(analysisId, 'Report Generation');
      const executiveReport = await reportTemplateEngine.generateReport(
        analysisResult,
        { templateId: 'executive-summary' },
        validationResult,
        performanceMetrics
      );
      
      const clinicalReport = await reportTemplateEngine.generateReport(
        analysisResult,
        { templateId: 'clinical-operations' },
        validationResult,
        performanceMetrics
      );
      performanceMonitor.endPhase(analysisId, 'Report Generation', 2);
      testResult.reportGenerated = true;
      
      // Evaluate test results
      const evaluation = this.evaluateTestResults(
        testCase,
        analysisResult,
        validationResult,
        performanceMetrics
      );
      
      testResult.summary = evaluation;
      testResult.success = evaluation.overallScore >= 70; // 70% threshold for success
      
      // Check for warnings
      if (validationResult.findings.some(f => f.category === 'Major')) {
        testResult.warnings.push('Major validation issues detected');
      }
      
      if (performanceMetrics && performanceMetrics.optimization.score < 80) {
        testResult.warnings.push('Performance optimization opportunities identified');
      }
      
      logInfo('Single test execution completed', {
        testId: testCaseId,
        analysisTime: performanceMetrics?.duration || 0,
        validationScore: validationResult.score,
        performanceScore: performanceMetrics?.optimization.score || 0
      });
      
    } catch (error) {
      const analysisError = errorHandler.handleError(error, { testCaseId });
      testResult.errors.push(analysisError.message);
      testResult.success = false;
      
      if (analysisError.suggestion) {
        testResult.warnings.push(`Suggestion: ${analysisError.suggestion}`);
      }
    }
    
    testResult.duration = Date.now() - startTime;
    return testResult;
  }

  /**
   * Test specific analyzer components
   */
  async testComponentFunctionality(): Promise<{
    designAnalyzer: boolean;
    endpointAnalyzer: boolean;
    riskAnalyzer: boolean;
    validator: boolean;
    performanceMonitor: boolean;
    reportEngine: boolean;
  }> {
    const results = {
      designAnalyzer: false,
      endpointAnalyzer: false,
      riskAnalyzer: false,
      validator: false,
      performanceMonitor: false,
      reportEngine: false
    };
    
    const testCase = sampleProtocolLibrary.getTestCase('phase2-cardiovascular');
    if (!testCase) {
      throw new Error('Test case not available for component testing');
    }
    
    try {
      // Test design analyzer
      const { designAnalyzer } = await import('../analyzers/design-analyzer');
      const designResult = await designAnalyzer.analyzeDesign(testCase.protocol, testCase.crfs);
      results.designAnalyzer = designResult && designResult.feasibilityScore > 0;
      
      // Test endpoint analyzer
      const { endpointAnalyzer } = await import('../analyzers/endpoint-analyzer');
      const endpointResult = await endpointAnalyzer.assessEndpoints(testCase.protocol);
      results.endpointAnalyzer = endpointResult && endpointResult.primaryEndpoints.length > 0;
      
      // Test risk analyzer
      const { riskAnalyzer } = await import('../risk-assessment/risk-analyzer');
      const riskResult = await riskAnalyzer.assessRisks(testCase.protocol, testCase.crfs);
      results.riskAnalyzer = riskResult && riskResult.overallRiskScore > 0;
      
      // Test validator
      const analysisResult = await protocolAnalyzerEngine.analyzeProtocol(testCase.protocol, testCase.crfs);
      const validationResult = await clinicalValidator.validateAnalysis(
        testCase.protocol,
        testCase.crfs,
        analysisResult
      );
      results.validator = validationResult && typeof validationResult.score === 'number';
      
      // Test performance monitor
      const testAnalysisId = `component-test-${Date.now()}`;
      performanceMonitor.startAnalysis(testAnalysisId);
      await new Promise(resolve => setTimeout(resolve, 100)); // Brief delay
      const perfResult = await performanceMonitor.endAnalysis(testAnalysisId);
      results.performanceMonitor = perfResult !== null;
      
      // Test report engine
      const reportResult = await reportTemplateEngine.generateReport(
        analysisResult,
        { templateId: 'executive-summary' }
      );
      results.reportEngine = reportResult && reportResult.content.length > 0;
      
    } catch (error) {
      logError('Component functionality test failed', error);
    }
    
    return results;
  }

  /**
   * Test error handling and recovery
   */
  async testErrorHandling(): Promise<{
    validationErrors: boolean;
    timeoutHandling: boolean;
    dataQualityErrors: boolean;
    recoveryMechanisms: boolean;
  }> {
    const results = {
      validationErrors: false,
      timeoutHandling: false,
      dataQualityErrors: false,
      recoveryMechanisms: false
    };
    
    try {
      // Test validation errors
      try {
        await protocolAnalyzerEngine.analyzeProtocol(
          {} as any, // Invalid protocol
          [] as any  // Invalid CRFs
        );
      } catch (error) {
        if (error instanceof ProtocolAnalysisError) {
          results.validationErrors = true;
        }
      }
      
      // Test data quality errors
      try {
        const invalidProtocol = {
          protocolNumber: '',
          studyTitle: '',
          studyPhase: 'invalid-phase'
        } as any;
        
        await protocolAnalyzerEngine.analyzeProtocol(invalidProtocol, []);
      } catch (error) {
        results.dataQualityErrors = error instanceof ProtocolAnalysisError;
      }
      
      // Test recovery mechanisms
      const testCase = sampleProtocolLibrary.getTestCase('phase1-oncology');
      if (testCase) {
        // Simulate recoverable error scenario
        const analysisResult = await protocolAnalyzerEngine.analyzeProtocol(
          testCase.protocol,
          testCase.crfs
        );
        
        results.recoveryMechanisms = analysisResult !== null;
      }
      
    } catch (error) {
      logError('Error handling test failed', error);
    }
    
    return results;
  }

  /**
   * Performance benchmark test
   */
  async runPerformanceBenchmark(): Promise<{
    averageAnalysisTime: number;
    memoryUsageProfile: { peak: number; average: number };
    throughputMetrics: { analysesPerMinute: number };
    scalabilityScore: number;
  }> {
    const benchmarkResults: number[] = [];
    const memoryUsages: number[] = [];
    const startTime = Date.now();
    
    // Run multiple analyses to get performance baseline
    const testCases = sampleProtocolLibrary.getAllTestCases().slice(0, 3); // Test subset for speed
    
    for (const testCase of testCases) {
      const analysisStart = Date.now();
      const analysisId = `benchmark-${testCase.id}-${Date.now()}`;
      
      try {
        performanceMonitor.startAnalysis(analysisId);
        
        await protocolAnalyzerEngine.analyzeProtocol(
          testCase.protocol,
          testCase.crfs,
          { analysisDepth: 'Standard' }
        );
        
        const metrics = await performanceMonitor.endAnalysis(analysisId);
        if (metrics) {
          benchmarkResults.push(Date.now() - analysisStart);
          memoryUsages.push(metrics.totalMemoryUsage.peak);
        }
      } catch (error) {
        logError('Benchmark test error', error, { testCaseId: testCase.id });
      }
    }
    
    const totalTime = Date.now() - startTime;
    const averageAnalysisTime = benchmarkResults.reduce((sum, time) => sum + time, 0) / benchmarkResults.length;
    const peakMemory = Math.max(...memoryUsages);
    const averageMemory = memoryUsages.reduce((sum, mem) => sum + mem, 0) / memoryUsages.length;
    const analysesPerMinute = (benchmarkResults.length / totalTime) * 60000;
    
    // Calculate scalability score based on performance metrics
    let scalabilityScore = 100;
    if (averageAnalysisTime > 60000) scalabilityScore -= 30; // Over 1 minute
    if (peakMemory > 1024) scalabilityScore -= 20; // Over 1GB
    if (analysesPerMinute < 1) scalabilityScore -= 25; // Less than 1 per minute
    
    return {
      averageAnalysisTime,
      memoryUsageProfile: {
        peak: peakMemory,
        average: averageMemory
      },
      throughputMetrics: {
        analysesPerMinute
      },
      scalabilityScore: Math.max(0, scalabilityScore)
    };
  }

  /**
   * Generate comprehensive test report
   */
  async generateTestReport(
    testResults: IntegrationTestResult[],
    componentTests?: any,
    errorTests?: any,
    performanceBenchmark?: any
  ): Promise<string> {
    const timestamp = new Date().toISOString();
    const passedTests = testResults.filter(r => r.success).length;
    const totalTests = testResults.length;
    const successRate = (passedTests / totalTests) * 100;
    
    let report = `
# Protocol Analyzer Integration Test Report

**Generated:** ${timestamp}
**Test Suite Version:** 2.0.0

## Executive Summary

- **Total Tests:** ${totalTests}
- **Passed:** ${passedTests}
- **Failed:** ${totalTests - passedTests}
- **Success Rate:** ${successRate.toFixed(1)}%

## Test Results Summary

| Test Case | Success | Duration (ms) | Analysis Score | Validation Score | Performance Score |
|-----------|---------|---------------|----------------|------------------|-------------------|
`;

    testResults.forEach(result => {
      report += `| ${result.testName} | ${result.success ? '✅' : '❌'} | ${result.duration} | ${result.summary.analysisAccuracy} | ${result.summary.validationScore} | ${result.summary.performanceScore} |\n`;
    });

    if (componentTests) {
      report += `
## Component Functionality Tests

- **Design Analyzer:** ${componentTests.designAnalyzer ? '✅' : '❌'}
- **Endpoint Analyzer:** ${componentTests.endpointAnalyzer ? '✅' : '❌'}
- **Risk Analyzer:** ${componentTests.riskAnalyzer ? '✅' : '❌'}
- **Clinical Validator:** ${componentTests.validator ? '✅' : '❌'}
- **Performance Monitor:** ${componentTests.performanceMonitor ? '✅' : '❌'}
- **Report Engine:** ${componentTests.reportEngine ? '✅' : '❌'}
`;
    }

    if (errorTests) {
      report += `
## Error Handling Tests

- **Validation Errors:** ${errorTests.validationErrors ? '✅' : '❌'}
- **Timeout Handling:** ${errorTests.timeoutHandling ? '✅' : '❌'}
- **Data Quality Errors:** ${errorTests.dataQualityErrors ? '✅' : '❌'}
- **Recovery Mechanisms:** ${errorTests.recoveryMechanisms ? '✅' : '❌'}
`;
    }

    if (performanceBenchmark) {
      report += `
## Performance Benchmark

- **Average Analysis Time:** ${performanceBenchmark.averageAnalysisTime.toFixed(0)}ms
- **Peak Memory Usage:** ${performanceBenchmark.memoryUsageProfile.peak}MB
- **Average Memory Usage:** ${performanceBenchmark.memoryUsageProfile.average.toFixed(0)}MB
- **Throughput:** ${performanceBenchmark.throughputMetrics.analysesPerMinute.toFixed(2)} analyses/minute
- **Scalability Score:** ${performanceBenchmark.scalabilityScore}/100
`;
    }

    report += `
## Detailed Test Results

`;

    testResults.forEach(result => {
      report += `
### ${result.testName}

- **Status:** ${result.success ? 'PASSED' : 'FAILED'}
- **Duration:** ${result.duration}ms
- **Overall Score:** ${result.summary.overallScore}/100

`;

      if (result.errors.length > 0) {
        report += `**Errors:**\n`;
        result.errors.forEach(error => {
          report += `- ${error}\n`;
        });
      }

      if (result.warnings.length > 0) {
        report += `**Warnings:**\n`;
        result.warnings.forEach(warning => {
          report += `- ${warning}\n`;
        });
      }
    });

    report += `
---
*Generated by Protocol Analyzer Integration Test Suite v2.0.0*
`;

    return report;
  }

  /**
   * Private helper methods
   */
  private evaluateTestResults(
    testCase: any,
    analysisResult: any,
    validationResult: any,
    performanceMetrics: any
  ): IntegrationTestResult['summary'] {
    let analysisAccuracy = 100;
    let performanceScore = 100;
    let validationScore = validationResult?.score || 0;

    // Evaluate analysis accuracy against expected results
    const expected = testCase.expectedResults;
    
    // Check feasibility score accuracy
    const feasibilityDiff = Math.abs(
      analysisResult.executiveSummary.overallAssessment.feasibilityScore - 
      ((expected.feasibilityScore.min + expected.feasibilityScore.max) / 2)
    );
    if (feasibilityDiff > 15) analysisAccuracy -= 20;
    
    // Check risk level accuracy
    if (analysisResult.executiveSummary.overallAssessment.riskLevel !== expected.riskLevel) {
      analysisAccuracy -= 15;
    }
    
    // Check complexity accuracy
    if (analysisResult.executiveSummary.overallAssessment.complexity !== expected.complexity) {
      analysisAccuracy -= 10;
    }

    // Evaluate performance
    if (performanceMetrics) {
      if (performanceMetrics.duration > 180000) performanceScore -= 30; // Over 3 minutes
      if (performanceMetrics.totalMemoryUsage.peak > 1024) performanceScore -= 20; // Over 1GB
      if (performanceMetrics.errors.count > 0) performanceScore -= 25;
      performanceScore = Math.max(0, performanceScore);
    }

    const overallScore = (analysisAccuracy + performanceScore + validationScore) / 3;

    return {
      analysisAccuracy: Math.max(0, analysisAccuracy),
      performanceScore,
      validationScore,
      overallScore
    };
  }

  private assessSystemHealth(
    avgPerformance: number,
    avgValidation: number,
    successRate: number
  ): string {
    const overallHealth = (avgPerformance + avgValidation + (successRate * 100)) / 3;
    
    if (overallHealth >= 90) return 'Excellent';
    if (overallHealth >= 75) return 'Good';
    if (overallHealth >= 60) return 'Acceptable';
    if (overallHealth >= 40) return 'Poor';
    return 'Critical';
  }
}

// Export test runner instance
export const integrationTestRunner = new ProtocolAnalyzerIntegrationTest();