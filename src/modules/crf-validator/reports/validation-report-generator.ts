import { createModuleLogger } from '../../../utils/logger';
import { CRFValidationResult, ValidationReport, ValidationSummary } from '../types/crf-validation-types';

const logger = createModuleLogger('crf-validation-report-generator');

export interface ReportOptions {
  includeExecutiveSummary: boolean;
  includeDetailedFindings: boolean;
  includeRecommendations: boolean;
  includeBestPractices: boolean;
  includeRegulatoryGuidance: boolean;
  includeCharts: boolean;
  format: 'comprehensive' | 'executive' | 'technical';
}

export class ValidationReportGenerator {
  /**
   * Generate comprehensive validation report
   */
  async generateReport(
    validationResult: CRFValidationResult,
    options: ReportOptions = {
      includeExecutiveSummary: true,
      includeDetailedFindings: true,
      includeRecommendations: true,
      includeBestPractices: true,
      includeRegulatoryGuidance: true,
      includeCharts: false,
      format: 'comprehensive'
    }
  ): Promise<ValidationReport> {
    logger.info('Generating CRF validation report', {
      validationId: validationResult.validationId,
      format: options.format,
      overallScore: validationResult.overallScore
    });

    try {
      const summary = this.generateSummary(validationResult);
      const executiveSummary = options.includeExecutiveSummary ? 
        this.generateExecutiveSummary(validationResult, summary) : null;
      
      const sections = this.generateReportSections(validationResult, options);
      
      const report: ValidationReport = {
        reportId: `report-${validationResult.validationId}`,
        validationId: validationResult.validationId,
        reportType: options.format,
        summary,
        executiveSummary,
        sections,
        metadata: {
          generatedAt: new Date(),
          reportVersion: '1.0',
          includedSections: this.getIncludedSections(options),
          totalPages: this.estimatePageCount(validationResult, options)
        }
      };

      logger.info('CRF validation report generated successfully', {
        validationId: validationResult.validationId,
        reportId: report.reportId,
        sectionsCount: sections.length,
        estimatedPages: report.metadata.totalPages
      });

      return report;
    } catch (error) {
      logger.error('Failed to generate validation report', {
        validationId: validationResult.validationId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Generate validation summary
   */
  private generateSummary(validationResult: CRFValidationResult): ValidationSummary {
    const criticalIssues = validationResult.validationFindings?.filter(f => f.severity === 'Critical') || [];
    const majorIssues = validationResult.validationFindings?.filter(f => f.severity === 'Major') || [];
    const minorIssues = validationResult.validationFindings?.filter(f => f.severity === 'Minor') || [];
    const infoItems = validationResult.validationFindings?.filter(f => f.severity === 'Info') || [];

    const highPriorityRecs = validationResult.recommendations?.filter(r => r.priority === 'High') || [];
    const mediumPriorityRecs = validationResult.recommendations?.filter(r => r.priority === 'Medium') || [];
    const lowPriorityRecs = validationResult.recommendations?.filter(r => r.priority === 'Low') || [];

    return {
      overallScore: validationResult.overallScore,
      qualityLevel: this.determineQualityLevel(validationResult.overallScore),
      recommendation: this.generateOverallRecommendation(validationResult),
      keyMetrics: {
        completenessScore: validationResult.completenessScore || 0,
        qualityScore: validationResult.qualityScore || 0,
        complianceScore: validationResult.complianceScore || 0,
        protocolAlignment: validationResult.protocolAlignment?.alignmentStatus || 'Unknown'
      },
      issueBreakdown: {
        critical: criticalIssues.length,
        major: majorIssues.length,
        minor: minorIssues.length,
        info: infoItems.length,
        total: (validationResult.validationFindings || []).length
      },
      recommendationBreakdown: {
        high: highPriorityRecs.length,
        medium: mediumPriorityRecs.length,
        low: lowPriorityRecs.length,
        total: (validationResult.recommendations || []).length
      },
      topCriticalIssues: criticalIssues.slice(0, 5).map(issue => ({
        category: issue.category,
        description: issue.finding,
        impact: issue.impact
      })),
      topRecommendations: highPriorityRecs.slice(0, 5).map(rec => ({
        category: rec.category,
        description: rec.recommendation,
        impact: rec.impact
      }))
    };
  }

  /**
   * Determine quality level based on overall score
   */
  private determineQualityLevel(score: number): 'Excellent' | 'Good' | 'Fair' | 'Poor' {
    if (score >= 85) return 'Excellent';
    if (score >= 70) return 'Good';
    if (score >= 50) return 'Fair';
    return 'Poor';
  }

  /**
   * Generate overall recommendation
   */
  private generateOverallRecommendation(validationResult: CRFValidationResult): 'Approve' | 'Approve with Minor Changes' | 'Requires Revision' | 'Major Revision Required' {
    const score = validationResult.overallScore;
    const criticalIssues = validationResult.validationFindings?.filter(f => f.severity === 'Critical').length || 0;
    const majorIssues = validationResult.validationFindings?.filter(f => f.severity === 'Major').length || 0;

    if (criticalIssues > 0) return 'Major Revision Required';
    if (score < 50 || majorIssues > 5) return 'Major Revision Required';
    if (score < 70 || majorIssues > 2) return 'Requires Revision';
    if (score < 85 || majorIssues > 0) return 'Approve with Minor Changes';
    return 'Approve';
  }

  /**
   * Generate executive summary
   */
  private generateExecutiveSummary(validationResult: CRFValidationResult, summary: ValidationSummary): string {
    const sections: string[] = [];

    // Overall assessment
    sections.push(`## Executive Summary

The CRF validation analysis has been completed with an overall score of **${validationResult.overallScore}/100**, indicating **${summary.qualityLevel}** quality. The recommendation is to **${summary.recommendation}**.`);

    // Key findings
    if (summary.issueBreakdown.critical > 0) {
      sections.push(`### Critical Issues
${summary.issueBreakdown.critical} critical issues were identified that must be addressed before study initiation. These issues pose significant risks to data quality, regulatory compliance, or study objectives.`);
    }

    if (summary.issueBreakdown.major > 0) {
      sections.push(`### Major Concerns
${summary.issueBreakdown.major} major issues require attention to ensure optimal CRF performance and compliance.`);
    }

    // Protocol alignment
    if (validationResult.protocolAlignment) {
      sections.push(`### Protocol Alignment
The CRF demonstrates **${validationResult.protocolAlignment.alignmentStatus}** with the study protocol. Key alignment metrics:
- Endpoint Coverage: ${validationResult.protocolAlignment.endpointCoverage?.primaryEndpoints.coveragePercentage || 0}% of primary endpoints covered
- Visit Schedule: ${validationResult.protocolAlignment.visitScheduleAlignment?.alignmentPercentage || 0}% alignment with protocol visits`);
    }

    // Top recommendations
    if (summary.topRecommendations.length > 0) {
      sections.push(`### Priority Recommendations
${summary.topRecommendations.map((rec, index) => 
        `${index + 1}. **${rec.category}**: ${rec.description}`
      ).join('\n')}`);
    }

    // Next steps
    sections.push(`### Next Steps
Based on the validation results, the following actions are recommended:
${this.generateNextSteps(summary, validationResult)}`);

    return sections.join('\n\n');
  }

  /**
   * Generate next steps based on validation results
   */
  private generateNextSteps(summary: ValidationSummary, validationResult: CRFValidationResult): string {
    const steps: string[] = [];

    if (summary.issueBreakdown.critical > 0) {
      steps.push('1. **Immediate Action Required**: Address all critical issues before proceeding');
    }

    if (summary.issueBreakdown.major > 3) {
      steps.push('2. **Major Revision**: Comprehensive review and revision of CRF design');
    } else if (summary.issueBreakdown.major > 0) {
      steps.push('2. **Targeted Improvements**: Address major issues in affected forms');
    }

    if (validationResult.protocolAlignment?.endpointCoverage?.primaryEndpoints.coveragePercentage! < 90) {
      steps.push('3. **Endpoint Review**: Ensure all primary endpoints are adequately captured');
    }

    if (summary.recommendationBreakdown.high > 0) {
      steps.push('4. **Implementation Planning**: Prioritize high-impact recommendations');
    }

    steps.push('5. **Stakeholder Review**: Conduct review with clinical and data management teams');
    steps.push('6. **User Acceptance Testing**: Plan UAT before study initiation');

    return steps.join('\n');
  }

  /**
   * Generate report sections
   */
  private generateReportSections(validationResult: CRFValidationResult, options: ReportOptions): any[] {
    const sections: any[] = [];

    // Detailed findings section
    if (options.includeDetailedFindings) {
      sections.push({
        title: 'Detailed Validation Findings',
        type: 'findings',
        content: this.generateFindingsSection(validationResult)
      });
    }

    // Protocol alignment section
    if (validationResult.protocolAlignment) {
      sections.push({
        title: 'Protocol Alignment Analysis',
        type: 'alignment',
        content: this.generateAlignmentSection(validationResult.protocolAlignment)
      });
    }

    // Structural analysis section
    if (validationResult.structuralAnalysis) {
      sections.push({
        title: 'Structural Analysis',
        type: 'structural',
        content: this.generateStructuralSection(validationResult.structuralAnalysis)
      });
    }

    // CDISC compliance section
    if (validationResult.complianceStatus) {
      sections.push({
        title: 'CDISC Compliance Assessment',
        type: 'compliance',
        content: this.generateComplianceSection(validationResult.complianceStatus)
      });
    }

    // AI analysis section
    if (validationResult.aiAnalysis) {
      sections.push({
        title: 'AI-Powered Analysis Insights',
        type: 'ai-analysis',
        content: this.generateAIAnalysisSection(validationResult.aiAnalysis)
      });
    }

    // Recommendations section
    if (options.includeRecommendations && validationResult.recommendations) {
      sections.push({
        title: 'Improvement Recommendations',
        type: 'recommendations',
        content: this.generateRecommendationsSection(validationResult.recommendations)
      });
    }

    // Best practices section
    if (options.includeBestPractices && validationResult.aiAnalysis?.bestPractices) {
      sections.push({
        title: 'Industry Best Practices',
        type: 'best-practices',
        content: this.generateBestPracticesSection(validationResult.aiAnalysis.bestPractices)
      });
    }

    // Regulatory guidance section
    if (options.includeRegulatoryGuidance && validationResult.aiAnalysis?.regulatoryGuidance) {
      sections.push({
        title: 'Regulatory Guidance',
        type: 'regulatory',
        content: this.generateRegulatorySection(validationResult.aiAnalysis.regulatoryGuidance)
      });
    }

    return sections;
  }

  /**
   * Generate findings section content
   */
  private generateFindingsSection(validationResult: CRFValidationResult): string {
    const findings = validationResult.validationFindings || [];
    if (findings.length === 0) {
      return 'No validation findings identified.';
    }

    const sections: string[] = [];
    const severityGroups = this.groupFindingsBySeverity(findings);

    for (const [severity, severityFindings] of Object.entries(severityGroups)) {
      if (severityFindings.length > 0) {
        sections.push(`### ${severity} Issues (${severityFindings.length})`);
        
        const categoryGroups = this.groupFindingsByCategory(severityFindings);
        for (const [category, categoryFindings] of Object.entries(categoryGroups)) {
          sections.push(`#### ${category}`);
          categoryFindings.forEach((finding, index) => {
            sections.push(`**${index + 1}. ${finding.finding}**
- **Impact**: ${finding.impact}
- **Recommendation**: ${finding.recommendation}
- **Priority**: ${finding.priority}
${finding.formName ? `- **Affected Form**: ${finding.formName}` : ''}
${finding.fieldName ? `- **Affected Field**: ${finding.fieldName}` : ''}`);
          });
        }
      }
    }

    return sections.join('\n\n');
  }

  /**
   * Group findings by severity
   */
  private groupFindingsBySeverity(findings: any[]): Record<string, any[]> {
    return findings.reduce((groups, finding) => {
      const severity = finding.severity || 'Unknown';
      if (!groups[severity]) groups[severity] = [];
      groups[severity].push(finding);
      return groups;
    }, {} as Record<string, any[]>);
  }

  /**
   * Group findings by category
   */
  private groupFindingsByCategory(findings: any[]): Record<string, any[]> {
    return findings.reduce((groups, finding) => {
      const category = finding.category || 'General';
      if (!groups[category]) groups[category] = [];
      groups[category].push(finding);
      return groups;
    }, {} as Record<string, any[]>);
  }

  /**
   * Generate alignment section content
   */
  private generateAlignmentSection(alignment: any): string {
    const sections: string[] = [];

    sections.push(`**Overall Alignment Status**: ${alignment.alignmentStatus}
**Alignment Score**: ${alignment.alignmentScoring?.overallAlignmentScore || 0}/100`);

    if (alignment.endpointCoverage) {
      sections.push(`### Endpoint Coverage
- **Primary Endpoints**: ${alignment.endpointCoverage.primaryEndpoints.covered}/${alignment.endpointCoverage.primaryEndpoints.total} covered (${alignment.endpointCoverage.primaryEndpoints.coveragePercentage}%)
- **Secondary Endpoints**: ${alignment.endpointCoverage.secondaryEndpoints.covered}/${alignment.endpointCoverage.secondaryEndpoints.total} covered (${alignment.endpointCoverage.secondaryEndpoints.coveragePercentage}%)`);

      if (alignment.endpointCoverage.primaryEndpoints.uncoveredEndpoints.length > 0) {
        sections.push(`**Uncovered Primary Endpoints**:
${alignment.endpointCoverage.primaryEndpoints.uncoveredEndpoints.map((ep: string) => `- ${ep}`).join('\n')}`);
      }
    }

    if (alignment.visitScheduleAlignment) {
      sections.push(`### Visit Schedule Alignment
- **Protocol Visits**: ${alignment.visitScheduleAlignment.protocolVisits}
- **CRF Visits**: ${alignment.visitScheduleAlignment.crfVisits}
- **Aligned Visits**: ${alignment.visitScheduleAlignment.alignedVisits}
- **Alignment Percentage**: ${alignment.visitScheduleAlignment.alignmentPercentage}%`);

      if (alignment.visitScheduleAlignment.missingVisits.length > 0) {
        sections.push(`**Missing Visits**:
${alignment.visitScheduleAlignment.missingVisits.map((visit: string) => `- ${visit}`).join('\n')}`);
      }
    }

    return sections.join('\n\n');
  }

  /**
   * Generate structural section content
   */
  private generateStructuralSection(structural: any): string {
    const sections: string[] = [];

    if (structural.structuralScoring) {
      sections.push(`### Structural Quality Scores
- **Completeness**: ${structural.structuralScoring.completenessScore}/100
- **Consistency**: ${structural.structuralScoring.consistencyScore}/100
- **Organization**: ${structural.structuralScoring.organizationScore}/100
- **Efficiency**: ${structural.structuralScoring.efficiencyScore}/100`);
    }

    if (structural.organizationAnalysis) {
      sections.push(`### Organization Analysis
- **Total Forms**: ${structural.organizationAnalysis.totalForms}
- **Forms with Description**: ${structural.organizationAnalysis.formsWithDescription}
- **Average Fields per Form**: ${structural.organizationAnalysis.avgFieldsPerForm}`);

      if (structural.organizationAnalysis.organizationIssues?.length > 0) {
        sections.push(`**Organization Issues**:
${structural.organizationAnalysis.organizationIssues.map((issue: string) => `- ${issue}`).join('\n')}`);
      }
    }

    return sections.join('\n\n');
  }

  /**
   * Generate compliance section content
   */
  private generateComplianceSection(compliance: any): string {
    const sections: string[] = [];

    sections.push(`**Overall Compliance Score**: ${compliance.overallScore || 0}/100
**CDASH Compliance**: ${compliance.cdashCompliance || 'Not assessed'}
**SDTM Readiness**: ${compliance.sdtmReadiness || 'Not assessed'}`);

    if (compliance.complianceIssues?.length > 0) {
      sections.push(`### Compliance Issues
${compliance.complianceIssues.map((issue: any, index: number) => 
        `${index + 1}. **${issue.standard}**: ${issue.description}`
      ).join('\n')}`);
    }

    return sections.join('\n\n');
  }

  /**
   * Generate AI analysis section content
   */
  private generateAIAnalysisSection(aiAnalysis: any): string {
    const sections: string[] = [];

    sections.push(`**AI Quality Score**: ${aiAnalysis.qualityScore}/100
**Confidence Score**: ${aiAnalysis.confidenceScore}/100
**Analysis Provider**: ${aiAnalysis.aiProvider}
**Analysis Depth**: ${aiAnalysis.analysisDepth}`);

    if (aiAnalysis.aiFindings?.length > 0) {
      sections.push(`### AI-Identified Findings (${aiAnalysis.aiFindings.length})
${aiAnalysis.aiFindings.slice(0, 10).map((finding: any, index: number) => 
        `${index + 1}. **${finding.category}** (${finding.severity}): ${finding.finding}`
      ).join('\n')}`);
    }

    return sections.join('\n\n');
  }

  /**
   * Generate recommendations section content
   */
  private generateRecommendationsSection(recommendations: any[]): string {
    const sections: string[] = [];
    const priorityGroups = this.groupRecommendationsByPriority(recommendations);

    for (const [priority, priorityRecs] of Object.entries(priorityGroups)) {
      if (priorityRecs.length > 0) {
        sections.push(`### ${priority} Priority Recommendations (${priorityRecs.length})`);
        
        priorityRecs.forEach((rec, index) => {
          sections.push(`**${index + 1}. ${rec.recommendation}**
- **Category**: ${rec.category}
- **Rationale**: ${rec.rationale}
- **Impact**: ${rec.impact}
- **Implementation Effort**: ${rec.implementationEffort}
- **Timeline**: ${rec.timeline}
${rec.affectedForms?.length > 0 ? `- **Affected Forms**: ${rec.affectedForms.join(', ')}` : ''}`);
        });
      }
    }

    return sections.join('\n\n');
  }

  /**
   * Group recommendations by priority
   */
  private groupRecommendationsByPriority(recommendations: any[]): Record<string, any[]> {
    return recommendations.reduce((groups, rec) => {
      const priority = rec.priority || 'Medium';
      if (!groups[priority]) groups[priority] = [];
      groups[priority].push(rec);
      return groups;
    }, {} as Record<string, any[]>);
  }

  /**
   * Generate best practices section content
   */
  private generateBestPracticesSection(bestPractices: string[]): string {
    return bestPractices.map((practice, index) => `${index + 1}. ${practice}`).join('\n');
  }

  /**
   * Generate regulatory section content
   */
  private generateRegulatorySection(regulatoryGuidance: string[]): string {
    return regulatoryGuidance.map((guidance, index) => `${index + 1}. ${guidance}`).join('\n');
  }

  /**
   * Get list of included sections
   */
  private getIncludedSections(options: ReportOptions): string[] {
    const sections: string[] = [];
    
    if (options.includeExecutiveSummary) sections.push('Executive Summary');
    if (options.includeDetailedFindings) sections.push('Detailed Findings');
    if (options.includeRecommendations) sections.push('Recommendations');
    if (options.includeBestPractices) sections.push('Best Practices');
    if (options.includeRegulatoryGuidance) sections.push('Regulatory Guidance');
    
    return sections;
  }

  /**
   * Estimate page count for the report
   */
  private estimatePageCount(validationResult: CRFValidationResult, options: ReportOptions): number {
    let pages = 2; // Base pages for summary and metadata

    if (options.includeExecutiveSummary) pages += 1;
    if (options.includeDetailedFindings) {
      const findings = validationResult.validationFindings || [];
      pages += Math.ceil(findings.length / 10); // ~10 findings per page
    }
    if (options.includeRecommendations) {
      const recommendations = validationResult.recommendations || [];
      pages += Math.ceil(recommendations.length / 8); // ~8 recommendations per page
    }
    if (options.includeBestPractices) pages += 1;
    if (options.includeRegulatoryGuidance) pages += 1;

    return Math.max(pages, 3); // Minimum 3 pages
  }
}

export const validationReportGenerator = new ValidationReportGenerator();