// Clinical Validation Framework with Industry Benchmarks
import { 
  ComprehensiveAnalysisResult, 
  StudyDesignAnalysis, 
  EndpointAssessment,
  RiskAssessmentMatrix 
} from '../types/comprehensive-analysis';
import { StudyProtocol, CRFSpecification } from '../../../types';
import { createModuleLogger, logInfo, logWarning } from '../../../utils/logger';
import { TestCase } from '../testing/sample-protocols';

const logger = createModuleLogger('clinical-validator');

export interface ValidationResult {
  isValid: boolean;
  score: number; // 0-100
  category: 'Excellent' | 'Good' | 'Acceptable' | 'Poor' | 'Failed';
  findings: ValidationFinding[];
  benchmarkComparisons: BenchmarkComparison[];
  recommendations: ValidationRecommendation[];
  confidence: number; // 0-100
}

export interface ValidationFinding {
  category: 'Critical' | 'Major' | 'Minor' | 'Info';
  finding: string;
  evidence: string;
  impact: 'High' | 'Medium' | 'Low';
  clinicalSignificance: string;
}

export interface BenchmarkComparison {
  metric: string;
  studyValue: number | string;
  industryBenchmark: {
    p25: number;
    median: number;
    p75: number;
    best: number;
  };
  percentile: number;
  assessment: 'Above Average' | 'Average' | 'Below Average' | 'Poor';
  context: string;
}

export interface ValidationRecommendation {
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  category: string;
  recommendation: string;
  rationale: string;
  clinicalBenefit: string;
  implementationComplexity: 'Low' | 'Medium' | 'High';
}

export interface IndustryBenchmarks {
  enrollmentMetrics: {
    screenFailureRate: { median: 45, p25: 30, p75: 60, excellent: 25 };
    enrollmentRate: { median: 2.5, p25: 1.5, p75: 4.0, excellent: 5.0 }; // patients/site/month
    retentionRate: { median: 85, p25: 78, p75: 92, excellent: 95 };
  };
  operationalMetrics: {
    studyStartupTime: { median: 9, p25: 7, p75: 12, excellent: 6 }; // months
    dataQueryRate: { median: 15, p25: 8, p75: 25, excellent: 5 }; // queries per 100 data points
    protocolDeviationRate: { median: 8, p25: 5, p75: 12, excellent: 3 }; // per 100 patients
  };
  designMetrics: {
    primaryEndpointCount: { median: 1, p25: 1, p75: 2, excellent: 1 };
    visitCount: { median: 8, p25: 6, p75: 12, excellent: 6 };
    crfPageCount: { median: 150, p25: 100, p75: 250, excellent: 80 };
  };
  phaseSpecific: {
    phase1: {
      sampleSize: { median: 45, p25: 30, p75: 60, excellent: 30 };
      duration: { median: 18, p25: 15, p75: 24, excellent: 12 }; // months
    };
    phase2: {
      sampleSize: { median: 150, p25: 100, p75: 200, excellent: 100 };
      duration: { median: 24, p25: 18, p75: 30, excellent: 18 };
    };
    phase3: {
      sampleSize: { median: 600, p25: 400, p75: 1000, excellent: 300 };
      duration: { median: 36, p25: 30, p75: 48, excellent: 24 };
    };
  };
  therapeuticAreaSpecific: {
    oncology: {
      screenFailureRate: { median: 55, p25: 45, p75: 70, excellent: 35 };
      enrollmentChallenges: ['Patient availability', 'Competing studies', 'Restrictive criteria'];
    };
    cardiology: {
      screenFailureRate: { median: 40, p25: 30, p75: 50, excellent: 25 };
      enrollmentChallenges: ['Comorbidities', 'Age restrictions', 'Medication washouts'];
    };
    neurology: {
      screenFailureRate: { median: 50, p25: 40, p75: 65, excellent: 30 };
      enrollmentChallenges: ['Diagnosis complexity', 'Cognitive assessments', 'Caregiver requirements'];
    };
  };
}

export class ClinicalValidator {
  private industryBenchmarks: IndustryBenchmarks;

  constructor() {
    this.industryBenchmarks = this.initializeBenchmarks();
  }

  /**
   * Comprehensive validation of protocol analysis results
   */
  async validateAnalysis(
    protocol: StudyProtocol,
    crfs: CRFSpecification[],
    analysisResult: ComprehensiveAnalysisResult,
    testCase?: TestCase
  ): Promise<ValidationResult> {
    logInfo('Starting clinical validation', {
      protocolNumber: protocol.protocolNumber,
      studyPhase: protocol.studyPhase,
      hasTestCase: !!testCase
    });

    const findings: ValidationFinding[] = [];
    const benchmarkComparisons: BenchmarkComparison[] = [];
    const recommendations: ValidationRecommendation[] = [];

    // Validate against test case expectations if available
    if (testCase) {
      const testCaseFindings = this.validateAgainstTestCase(analysisResult, testCase);
      findings.push(...testCaseFindings);
    }

    // Clinical design validation
    const designFindings = this.validateStudyDesign(protocol, crfs, analysisResult.designAnalysis);
    findings.push(...designFindings.findings);
    benchmarkComparisons.push(...designFindings.benchmarks);

    // Endpoint validation
    const endpointFindings = this.validateEndpoints(protocol, analysisResult.endpointAssessment);
    findings.push(...endpointFindings.findings);
    benchmarkComparisons.push(...endpointFindings.benchmarks);

    // Risk assessment validation
    const riskFindings = this.validateRiskAssessment(protocol, analysisResult.riskAssessment);
    findings.push(...riskFindings.findings);

    // Cross-validation checks
    const crossValidationFindings = this.performCrossValidation(analysisResult);
    findings.push(...crossValidationFindings);

    // Generate recommendations
    const validationRecommendations = this.generateValidationRecommendations(findings, benchmarkComparisons);
    recommendations.push(...validationRecommendations);

    // Calculate overall validation score
    const score = this.calculateValidationScore(findings, benchmarkComparisons);
    const category = this.categorizeValidationResult(score);
    const confidence = this.calculateConfidence(findings, benchmarkComparisons);

    return {
      isValid: score >= 60, // Minimum acceptable threshold
      score,
      category,
      findings,
      benchmarkComparisons,
      recommendations,
      confidence
    };
  }

  /**
   * Validate against test case expectations
   */
  private validateAgainstTestCase(
    result: ComprehensiveAnalysisResult,
    testCase: TestCase
  ): ValidationFinding[] {
    const findings: ValidationFinding[] = [];
    const expected = testCase.expectedResults;

    // Feasibility score validation
    const feasibilityScore = result.executiveSummary.overallAssessment.feasibilityScore;
    if (feasibilityScore < expected.feasibilityScore.min || feasibilityScore > expected.feasibilityScore.max) {
      findings.push({
        category: 'Major',
        finding: `Feasibility score ${feasibilityScore} outside expected range [${expected.feasibilityScore.min}-${expected.feasibilityScore.max}]`,
        evidence: `Test case: ${testCase.name}`,
        impact: 'Medium',
        clinicalSignificance: 'Analysis may not accurately reflect protocol complexity'
      });
    }

    // Risk level validation
    if (result.executiveSummary.overallAssessment.riskLevel !== expected.riskLevel) {
      findings.push({
        category: 'Major',
        finding: `Risk level '${result.executiveSummary.overallAssessment.riskLevel}' does not match expected '${expected.riskLevel}'`,
        evidence: `Test case validation for ${testCase.id}`,
        impact: 'High',
        clinicalSignificance: 'Risk assessment may be inaccurate for this protocol type'
      });
    }

    // Critical issues count validation
    const actualCriticalIssues = result.executiveSummary.criticalIssues.filter(issue => issue.severity === 'Critical').length;
    if (Math.abs(actualCriticalIssues - expected.criticalIssues) > 1) {
      findings.push({
        category: 'Minor',
        finding: `Critical issues count ${actualCriticalIssues} differs from expected ${expected.criticalIssues}`,
        evidence: `Expected based on protocol characteristics`,
        impact: 'Low',
        clinicalSignificance: 'Issue detection sensitivity may need calibration'
      });
    }

    return findings;
  }

  /**
   * Validate study design analysis
   */
  private validateStudyDesign(
    protocol: StudyProtocol,
    crfs: CRFSpecification[],
    designAnalysis: StudyDesignAnalysis
  ): { findings: ValidationFinding[], benchmarks: BenchmarkComparison[] } {
    const findings: ValidationFinding[] = [];
    const benchmarks: BenchmarkComparison[] = [];

    // Sample size benchmark validation
    const targetEnrollment = protocol.population?.targetEnrollment || 0;
    const phase = protocol.studyPhase;
    
    if (phase && this.industryBenchmarks.phaseSpecific[`phase${phase}` as keyof typeof this.industryBenchmarks.phaseSpecific]) {
      const phaseBenchmark = this.industryBenchmarks.phaseSpecific[`phase${phase}` as keyof typeof this.industryBenchmarks.phaseSpecific];
      const percentile = this.calculatePercentile(targetEnrollment, phaseBenchmark.sampleSize);
      
      benchmarks.push({
        metric: `Phase ${phase} Sample Size`,
        studyValue: targetEnrollment,
        industryBenchmark: phaseBenchmark.sampleSize,
        percentile,
        assessment: this.assessPercentile(percentile),
        context: `Industry benchmark for Phase ${phase} studies`
      });

      if (percentile < 10) {
        findings.push({
          category: 'Major',
          finding: 'Sample size significantly below industry norms',
          evidence: `${targetEnrollment} patients vs industry median ${phaseBenchmark.sampleSize.median}`,
          impact: 'High',
          clinicalSignificance: 'May compromise statistical power and regulatory acceptance'
        });
      }
    }

    // CRF complexity validation
    const totalCrfPages = crfs.reduce((sum, crf) => sum + (crf.fields?.length || 0), 0);
    const crfPagePercentile = this.calculatePercentile(totalCrfPages, this.industryBenchmarks.designMetrics.crfPageCount);
    
    benchmarks.push({
      metric: 'CRF Complexity (Total Fields)',
      studyValue: totalCrfPages,
      industryBenchmark: this.industryBenchmarks.designMetrics.crfPageCount,
      percentile: crfPagePercentile,
      assessment: this.assessPercentile(crfPagePercentile),
      context: 'Total data collection burden'
    });

    if (crfPagePercentile > 75) {
      findings.push({
        category: 'Minor',
        finding: 'CRF complexity above industry average',
        evidence: `${totalCrfPages} fields vs industry median ${this.industryBenchmarks.designMetrics.crfPageCount.median}`,
        impact: 'Medium',
        clinicalSignificance: 'High data collection burden may impact site performance and data quality'
      });
    }

    // Visit schedule validation
    const visitCount = protocol.visitSchedule?.length || 0;
    const visitPercentile = this.calculatePercentile(visitCount, this.industryBenchmarks.designMetrics.visitCount);
    
    benchmarks.push({
      metric: 'Visit Schedule Complexity',
      studyValue: visitCount,
      industryBenchmark: this.industryBenchmarks.designMetrics.visitCount,
      percentile: visitPercentile,
      assessment: this.assessPercentile(visitPercentile),
      context: 'Number of protocol-defined visits'
    });

    // Feasibility score validation
    if (designAnalysis.feasibilityScore < 50) {
      findings.push({
        category: 'Critical',
        finding: 'Low feasibility score indicates significant execution challenges',
        evidence: `Feasibility score: ${designAnalysis.feasibilityScore}/100`,
        impact: 'High',
        clinicalSignificance: 'Study may face major operational difficulties and delays'
      });
    }

    // Design complexity validation
    if (designAnalysis.complexity.overall === 'Very High' && phase !== '1') {
      findings.push({
        category: 'Major',
        finding: 'Very high complexity for non-Phase 1 study',
        evidence: `Complexity assessment: ${designAnalysis.complexity.overall}`,
        impact: 'High',
        clinicalSignificance: 'Complex designs in later phases increase operational risk'
      });
    }

    return { findings, benchmarks };
  }

  /**
   * Validate endpoint assessment
   */
  private validateEndpoints(
    protocol: StudyProtocol,
    endpointAssessment: EndpointAssessment
  ): { findings: ValidationFinding[], benchmarks: BenchmarkComparison[] } {
    const findings: ValidationFinding[] = [];
    const benchmarks: BenchmarkComparison[] = [];

    // Primary endpoint count validation
    const primaryCount = endpointAssessment.primaryEndpoints.length;
    const primaryPercentile = this.calculatePercentile(primaryCount, this.industryBenchmarks.designMetrics.primaryEndpointCount);
    
    benchmarks.push({
      metric: 'Primary Endpoint Count',
      studyValue: primaryCount,
      industryBenchmark: this.industryBenchmarks.designMetrics.primaryEndpointCount,
      percentile: primaryPercentile,
      assessment: this.assessPercentile(primaryPercentile),
      context: 'Number of primary endpoints'
    });

    if (primaryCount > 2) {
      findings.push({
        category: 'Major',
        finding: 'Multiple primary endpoints increase statistical complexity',
        evidence: `${primaryCount} primary endpoints identified`,
        impact: 'High',
        clinicalSignificance: 'Multiple primary endpoints require multiplicity adjustment and complicate interpretation'
      });
    }

    // Endpoint measurability validation
    const poorMeasurabilityEndpoints = [
      ...endpointAssessment.primaryEndpoints,
      ...endpointAssessment.secondaryEndpoints
    ].filter(ep => ep.measurability === 'Poor');

    if (poorMeasurabilityEndpoints.length > 0) {
      findings.push({
        category: 'Major',
        finding: 'Endpoints with poor measurability identified',
        evidence: `${poorMeasurabilityEndpoints.length} endpoints with poor measurability`,
        impact: 'High',
        clinicalSignificance: 'Poor measurability may compromise data quality and regulatory acceptance'
      });
    }

    // Regulatory acceptance validation
    const lowRegulatoryAcceptance = endpointAssessment.primaryEndpoints.filter(ep => ep.regulatoryAcceptance === 'Low');
    
    if (lowRegulatoryAcceptance.length > 0 && protocol.studyPhase === '3') {
      findings.push({
        category: 'Critical',
        finding: 'Primary endpoints with low regulatory acceptance in Phase 3 study',
        evidence: `${lowRegulatoryAcceptance.length} primary endpoints with low regulatory acceptance`,
        impact: 'High',
        clinicalSignificance: 'Phase 3 studies require endpoints with high regulatory acceptance for approval'
      });
    }

    // Multiplicity concerns validation
    if (endpointAssessment.endpointHierarchy.multiplicity.hasMultiplicity && 
        !endpointAssessment.endpointHierarchy.multiplicity.adjustmentNeeded) {
      findings.push({
        category: 'Major',
        finding: 'Multiplicity issues identified but adjustment not planned',
        evidence: 'Multiple endpoints without statistical adjustment strategy',
        impact: 'High',
        clinicalSignificance: 'Multiplicity without adjustment increases Type I error risk'
      });
    }

    return { findings, benchmarks };
  }

  /**
   * Validate risk assessment
   */
  private validateRiskAssessment(
    protocol: StudyProtocol,
    riskAssessment: RiskAssessmentMatrix
  ): { findings: ValidationFinding[] } {
    const findings: ValidationFinding[] = [];

    // Overall risk level validation
    if (riskAssessment.overallRiskLevel === 'Very High') {
      findings.push({
        category: 'Critical',
        finding: 'Very high overall risk level identified',
        evidence: `Risk score: ${riskAssessment.riskScore}/100`,
        impact: 'High',
        clinicalSignificance: 'Very high risk studies require extensive mitigation planning and oversight'
      });
    }

    // Enrollment risk validation
    if (riskAssessment.enrollmentRisks.level === 'High' || riskAssessment.enrollmentRisks.level === 'Very High') {
      const enrollmentTarget = protocol.population?.targetEnrollment || 0;
      findings.push({
        category: 'Major',
        finding: 'High enrollment risk identified',
        evidence: `Enrollment risk level: ${riskAssessment.enrollmentRisks.level}, Target: ${enrollmentTarget} patients`,
        impact: 'High',
        clinicalSignificance: 'High enrollment risk may lead to study delays and increased costs'
      });
    }

    // Safety risk validation for early phase
    if (protocol.studyPhase === '1' && riskAssessment.safetyRisks.level !== 'High') {
      findings.push({
        category: 'Minor',
        finding: 'Safety risk may be underestimated for Phase 1 study',
        evidence: `Phase 1 study with ${riskAssessment.safetyRisks.level} safety risk`,
        impact: 'Medium',
        clinicalSignificance: 'Phase 1 studies typically carry inherent high safety risks'
      });
    }

    // Mitigation plan validation
    if (riskAssessment.mitigation.strategies.length === 0 && riskAssessment.overallRiskLevel !== 'Low') {
      findings.push({
        category: 'Major',
        finding: 'No risk mitigation strategies identified for non-low risk study',
        evidence: `${riskAssessment.overallRiskLevel} risk with no mitigation strategies`,
        impact: 'High',
        clinicalSignificance: 'Risk mitigation strategies are essential for successful study execution'
      });
    }

    return { findings };
  }

  /**
   * Perform cross-validation checks across analysis components
   */
  private performCrossValidation(result: ComprehensiveAnalysisResult): ValidationFinding[] {
    const findings: ValidationFinding[] = [];

    // Consistency between feasibility and risk
    const feasibility = result.executiveSummary.overallAssessment.feasibilityScore;
    const riskLevel = result.executiveSummary.overallAssessment.riskLevel;

    if (feasibility > 80 && (riskLevel === 'High' || riskLevel === 'Very High')) {
      findings.push({
        category: 'Minor',
        finding: 'High feasibility score inconsistent with high risk level',
        evidence: `Feasibility: ${feasibility}, Risk: ${riskLevel}`,
        impact: 'Low',
        clinicalSignificance: 'Analysis components may not be well-calibrated'
      });
    }

    // Consistency between complexity and recommendations
    const complexity = result.designAnalysis.complexity.overall;
    const recommendationCount = result.optimizationRecommendations.prioritizedActions.length;

    if (complexity === 'Very High' && recommendationCount < 3) {
      findings.push({
        category: 'Minor',
        finding: 'Few recommendations for very high complexity study',
        evidence: `${complexity} complexity with only ${recommendationCount} recommendations`,
        impact: 'Medium',
        clinicalSignificance: 'Complex studies typically require more optimization recommendations'
      });
    }

    // Executive summary consistency
    const criticalIssues = result.executiveSummary.criticalIssues.length;
    const recommendation = result.executiveSummary.overallAssessment.recommendation;

    if (criticalIssues > 2 && recommendation === 'Proceed') {
      findings.push({
        category: 'Major',
        finding: 'Recommendation to proceed despite multiple critical issues',
        evidence: `${criticalIssues} critical issues with 'Proceed' recommendation`,
        impact: 'High',
        clinicalSignificance: 'Critical issues should be addressed before proceeding with study'
      });
    }

    return findings;
  }

  /**
   * Generate validation-based recommendations
   */
  private generateValidationRecommendations(
    findings: ValidationFinding[],
    benchmarks: BenchmarkComparison[]
  ): ValidationRecommendation[] {
    const recommendations: ValidationRecommendation[] = [];

    // Critical findings recommendations
    findings.filter(f => f.category === 'Critical').forEach(finding => {
      recommendations.push({
        priority: 'Critical',
        category: 'Protocol Design',
        recommendation: `Address critical finding: ${finding.finding}`,
        rationale: finding.clinicalSignificance,
        clinicalBenefit: 'Prevents major execution issues and regulatory concerns',
        implementationComplexity: 'High'
      });
    });

    // Benchmark-based recommendations
    benchmarks.filter(b => b.assessment === 'Poor').forEach(benchmark => {
      recommendations.push({
        priority: 'High',
        category: 'Industry Alignment',
        recommendation: `Optimize ${benchmark.metric.toLowerCase()} to align with industry standards`,
        rationale: `Current value at ${benchmark.percentile}th percentile vs industry`,
        clinicalBenefit: 'Improves study competitiveness and execution likelihood',
        implementationComplexity: 'Medium'
      });
    });

    // Statistical recommendations
    const statisticalFindings = findings.filter(f => 
      f.finding.toLowerCase().includes('multiplicity') ||
      f.finding.toLowerCase().includes('endpoint') ||
      f.finding.toLowerCase().includes('sample size')
    );

    if (statisticalFindings.length > 0) {
      recommendations.push({
        priority: 'High',
        category: 'Statistical Design',
        recommendation: 'Review statistical design with biostatistician',
        rationale: 'Statistical issues identified that may impact study validity',
        clinicalBenefit: 'Ensures robust statistical inference and regulatory acceptance',
        implementationComplexity: 'Medium'
      });
    }

    return recommendations;
  }

  /**
   * Calculate overall validation score
   */
  private calculateValidationScore(
    findings: ValidationFinding[],
    benchmarks: BenchmarkComparison[]
  ): number {
    let score = 100;

    // Deduct for findings
    findings.forEach(finding => {
      switch (finding.category) {
        case 'Critical':
          score -= 25;
          break;
        case 'Major':
          score -= 15;
          break;
        case 'Minor':
          score -= 5;
          break;
        case 'Info':
          score -= 1;
          break;
      }
    });

    // Adjust for benchmark performance
    const benchmarkScore = benchmarks.reduce((sum, benchmark) => {
      switch (benchmark.assessment) {
        case 'Above Average':
          return sum + 5;
        case 'Average':
          return sum + 0;
        case 'Below Average':
          return sum - 5;
        case 'Poor':
          return sum - 10;
        default:
          return sum;
      }
    }, 0);

    score += benchmarkScore / benchmarks.length;

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Categorize validation result
   */
  private categorizeValidationResult(score: number): 'Excellent' | 'Good' | 'Acceptable' | 'Poor' | 'Failed' {
    if (score >= 90) return 'Excellent';
    if (score >= 80) return 'Good';
    if (score >= 60) return 'Acceptable';
    if (score >= 40) return 'Poor';
    return 'Failed';
  }

  /**
   * Calculate confidence in validation
   */
  private calculateConfidence(
    findings: ValidationFinding[],
    benchmarks: BenchmarkComparison[]
  ): number {
    let confidence = 100;

    // Reduce confidence for lack of benchmarks
    if (benchmarks.length < 3) {
      confidence -= 20;
    }

    // Reduce confidence for inconsistent findings
    const inconsistentFindings = findings.filter(f => 
      f.finding.toLowerCase().includes('inconsistent') ||
      f.finding.toLowerCase().includes('differs from expected')
    );
    
    confidence -= inconsistentFindings.length * 10;

    return Math.max(0, Math.min(100, confidence));
  }

  /**
   * Helper methods
   */
  private calculatePercentile(value: number, benchmark: { p25: number, median: number, p75: number }): number {
    if (value <= benchmark.p25) return 25;
    if (value <= benchmark.median) return 50;
    if (value <= benchmark.p75) return 75;
    return 90;
  }

  private assessPercentile(percentile: number): 'Above Average' | 'Average' | 'Below Average' | 'Poor' {
    if (percentile >= 75) return 'Above Average';
    if (percentile >= 50) return 'Average';
    if (percentile >= 25) return 'Below Average';
    return 'Poor';
  }

  /**
   * Initialize industry benchmarks
   */
  private initializeBenchmarks(): IndustryBenchmarks {
    return {
      enrollmentMetrics: {
        screenFailureRate: { median: 45, p25: 30, p75: 60, excellent: 25 },
        enrollmentRate: { median: 2.5, p25: 1.5, p75: 4.0, excellent: 5.0 },
        retentionRate: { median: 85, p25: 78, p75: 92, excellent: 95 }
      },
      operationalMetrics: {
        studyStartupTime: { median: 9, p25: 7, p75: 12, excellent: 6 },
        dataQueryRate: { median: 15, p25: 8, p75: 25, excellent: 5 },
        protocolDeviationRate: { median: 8, p25: 5, p75: 12, excellent: 3 }
      },
      designMetrics: {
        primaryEndpointCount: { median: 1, p25: 1, p75: 2, excellent: 1 },
        visitCount: { median: 8, p25: 6, p75: 12, excellent: 6 },
        crfPageCount: { median: 150, p25: 100, p75: 250, excellent: 80 }
      },
      phaseSpecific: {
        phase1: {
          sampleSize: { median: 45, p25: 30, p75: 60, excellent: 30 },
          duration: { median: 18, p25: 15, p75: 24, excellent: 12 }
        },
        phase2: {
          sampleSize: { median: 150, p25: 100, p75: 200, excellent: 100 },
          duration: { median: 24, p25: 18, p75: 30, excellent: 18 }
        },
        phase3: {
          sampleSize: { median: 600, p25: 400, p75: 1000, excellent: 300 },
          duration: { median: 36, p25: 30, p75: 48, excellent: 24 }
        }
      },
      therapeuticAreaSpecific: {
        oncology: {
          screenFailureRate: { median: 55, p25: 45, p75: 70, excellent: 35 },
          enrollmentChallenges: ['Patient availability', 'Competing studies', 'Restrictive criteria']
        },
        cardiology: {
          screenFailureRate: { median: 40, p25: 30, p75: 50, excellent: 25 },
          enrollmentChallenges: ['Comorbidities', 'Age restrictions', 'Medication washouts']
        },
        neurology: {
          screenFailureRate: { median: 50, p25: 40, p75: 65, excellent: 30 },
          enrollmentChallenges: ['Diagnosis complexity', 'Cognitive assessments', 'Caregiver requirements']
        }
      }
    };
  }
}

// Export singleton instance
export const clinicalValidator = new ClinicalValidator();