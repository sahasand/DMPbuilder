// Professional Report Template Engine for Protocol Analysis
import { ComprehensiveAnalysisResult } from '../types/comprehensive-analysis';
import { ValidationResult } from '../validation/clinical-validator';
import { PerformanceMetrics } from '../monitoring/performance-monitor';
import { createModuleLogger, logInfo } from '../../../utils/logger';

const logger = createModuleLogger('report-template-engine');

export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  targetAudience: 'Clinical Operations' | 'Regulatory Affairs' | 'Medical Affairs' | 'Executive' | 'Data Management' | 'Biostatistics';
  format: 'PDF' | 'Word' | 'PowerPoint' | 'HTML' | 'JSON';
  sections: ReportSection[];
  styling: ReportStyling;
  metadata: {
    version: string;
    lastUpdated: Date;
    approvedBy?: string;
    complianceLevel: 'GCP' | 'FDA' | 'EMA' | 'ICH' | 'Custom';
  };
}

export interface ReportSection {
  id: string;
  title: string;
  order: number;
  required: boolean;
  subsections?: ReportSection[];
  contentType: 'analysis' | 'summary' | 'recommendations' | 'charts' | 'tables' | 'appendix';
  dataSource: string; // Path to data in analysis result
  template: string; // Template string or function reference
  formatting?: {
    pageBreak?: boolean;
    fontSize?: number;
    bold?: boolean;
    italic?: boolean;
    color?: string;
    alignment?: 'left' | 'center' | 'right' | 'justify';
  };
}

export interface ReportStyling {
  headerLogo?: string;
  footerText?: string;
  colorScheme: {
    primary: string;
    secondary: string;
    accent: string;
    text: string;
    background: string;
  };
  fonts: {
    heading: string;
    body: string;
    monospace: string;
  };
  margins: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
}

export interface ReportGenerationOptions {
  templateId: string;
  includeValidation?: boolean;
  includePerformanceMetrics?: boolean;
  customSections?: ReportSection[];
  outputPath?: string;
  watermark?: string;
  confidentialityLevel?: 'Public' | 'Internal' | 'Confidential' | 'Restricted';
}

export class ReportTemplateEngine {
  private templates = new Map<string, ReportTemplate>();

  constructor() {
    this.initializeDefaultTemplates();
  }

  /**
   * Generate comprehensive analysis report
   */
  async generateReport(
    analysisResult: ComprehensiveAnalysisResult,
    options: ReportGenerationOptions,
    validationResult?: ValidationResult,
    performanceMetrics?: PerformanceMetrics
  ): Promise<{
    content: string;
    metadata: {
      templateUsed: string;
      generatedAt: Date;
      pageCount: number;
      wordCount: number;
      sections: string[];
    };
  }> {
    logInfo('Starting report generation', {
      templateId: options.templateId,
      analysisId: analysisResult.analysisId,
      includeValidation: options.includeValidation,
      includePerformance: options.includePerformanceMetrics
    });

    const template = this.templates.get(options.templateId);
    if (!template) {
      throw new Error(`Template not found: ${options.templateId}`);
    }

    // Prepare data context
    const context = this.prepareDataContext(
      analysisResult,
      validationResult,
      performanceMetrics,
      options
    );

    // Generate report content
    const content = await this.renderTemplate(template, context);

    // Calculate metadata
    const metadata = {
      templateUsed: template.name,
      generatedAt: new Date(),
      pageCount: this.estimatePageCount(content),
      wordCount: this.countWords(content),
      sections: template.sections.map(s => s.title)
    };

    logInfo('Report generation completed', {
      templateId: options.templateId,
      ...metadata
    });

    return { content, metadata };
  }

  /**
   * Register a custom template
   */
  registerTemplate(template: ReportTemplate): void {
    this.templates.set(template.id, template);
    logInfo('Custom template registered', {
      templateId: template.id,
      templateName: template.name
    });
  }

  /**
   * Get available templates
   */
  getAvailableTemplates(): ReportTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Get template by ID
   */
  getTemplate(templateId: string): ReportTemplate | undefined {
    return this.templates.get(templateId);
  }

  /**
   * Validate template structure
   */
  validateTemplate(template: ReportTemplate): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!template.id) errors.push('Template ID is required');
    if (!template.name) errors.push('Template name is required');
    if (!template.sections || template.sections.length === 0) {
      errors.push('Template must have at least one section');
    }

    // Validate section structure
    template.sections.forEach((section, index) => {
      if (!section.id) errors.push(`Section ${index} missing ID`);
      if (!section.title) errors.push(`Section ${index} missing title`);
      if (typeof section.order !== 'number') errors.push(`Section ${index} missing order`);
      if (!section.template) errors.push(`Section ${index} missing template`);
    });

    // Check for duplicate section IDs
    const sectionIds = template.sections.map(s => s.id).filter(Boolean);
    const duplicateIds = sectionIds.filter((id, index) => sectionIds.indexOf(id) !== index);
    if (duplicateIds.length > 0) {
      errors.push(`Duplicate section IDs found: ${duplicateIds.join(', ')}`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Private helper methods
   */
  private initializeDefaultTemplates(): void {
    // Clinical Executive Summary Template
    this.templates.set('executive-summary', {
      id: 'executive-summary',
      name: 'Clinical Development Executive Summary',
      description: 'Strategic clinical development overview for senior leadership and decision makers',
      targetAudience: 'Executive',
      format: 'PDF',
      sections: [
        {
          id: 'cover',
          title: 'Executive Summary',
          order: 1,
          required: true,
          contentType: 'summary',
          dataSource: 'executiveSummary',
          template: this.getExecutiveCoverTemplate()
        },
        {
          id: 'overall-assessment',
          title: 'Overall Assessment',
          order: 2,
          required: true,
          contentType: 'summary',
          dataSource: 'executiveSummary.overallAssessment',
          template: this.getOverallAssessmentTemplate()
        },
        {
          id: 'key-findings',
          title: 'Key Findings',
          order: 3,
          required: true,
          contentType: 'summary',
          dataSource: 'executiveSummary.keyFindings',
          template: this.getKeyFindingsTemplate()
        },
        {
          id: 'critical-issues',
          title: 'Critical Issues',
          order: 4,
          required: true,
          contentType: 'summary',
          dataSource: 'executiveSummary.criticalIssues',
          template: this.getCriticalIssuesTemplate()
        },
        {
          id: 'recommendations',
          title: 'Top Recommendations',
          order: 5,
          required: true,
          contentType: 'recommendations',
          dataSource: 'executiveSummary.topRecommendations',
          template: this.getTopRecommendationsTemplate()
        }
      ],
      styling: this.getExecutiveStyling(),
      metadata: {
        version: '1.0',
        lastUpdated: new Date(),
        complianceLevel: 'GCP'
      }
    });

    // Clinical Operations Template
    this.templates.set('clinical-operations', {
      id: 'clinical-operations',
      name: 'Clinical Operations Analysis',
      description: 'Detailed operational analysis for clinical teams',
      targetAudience: 'Clinical Operations',
      format: 'PDF',
      sections: [
        {
          id: 'protocol-info',
          title: 'Protocol Information',
          order: 1,
          required: true,
          contentType: 'summary',
          dataSource: 'protocolInfo',
          template: this.getProtocolInfoTemplate()
        },
        {
          id: 'design-analysis',
          title: 'Study Design Analysis',
          order: 2,
          required: true,
          contentType: 'analysis',
          dataSource: 'designAnalysis',
          template: this.getDesignAnalysisTemplate()
        },
        {
          id: 'risk-assessment',
          title: 'Risk Assessment',
          order: 3,
          required: true,
          contentType: 'analysis',
          dataSource: 'riskAssessment',
          template: this.getRiskAssessmentTemplate()
        },
        {
          id: 'timeline-analysis',
          title: 'Timeline Analysis',
          order: 4,
          required: true,
          contentType: 'analysis',
          dataSource: 'timelineAnalysis',
          template: this.getTimelineAnalysisTemplate()
        },
        {
          id: 'optimization',
          title: 'Optimization Recommendations',
          order: 5,
          required: true,
          contentType: 'recommendations',
          dataSource: 'optimizationRecommendations',
          template: this.getOptimizationTemplate()
        }
      ],
      styling: this.getClinicalStyling(),
      metadata: {
        version: '1.0',
        lastUpdated: new Date(),
        complianceLevel: 'GCP'
      }
    });

    // Regulatory Strategy Template
    this.templates.set('regulatory-strategy', {
      id: 'regulatory-strategy',
      name: 'Regulatory Strategy & Pathway Analysis',
      description: 'Comprehensive regulatory pathway analysis with submission strategy',
      targetAudience: 'Regulatory Affairs',
      format: 'PDF',
      sections: [
        {
          id: 'regulatory-summary',
          title: 'Regulatory Summary',
          order: 1,
          required: true,
          contentType: 'summary',
          dataSource: 'executiveSummary',
          template: this.getRegulatorySummaryTemplate()
        },
        {
          id: 'endpoint-assessment',
          title: 'Endpoint Assessment',
          order: 2,
          required: true,
          contentType: 'analysis',
          dataSource: 'endpointAssessment',
          template: this.getEndpointAssessmentTemplate()
        },
        {
          id: 'regulatory-alignment',
          title: 'Regulatory Alignment',
          order: 3,
          required: true,
          contentType: 'analysis',
          dataSource: 'endpointAssessment.regulatoryAlignment',
          template: this.getRegulatoryAlignmentTemplate()
        },
        {
          id: 'population-analysis',
          title: 'Population Analysis',
          order: 4,
          required: true,
          contentType: 'analysis',
          dataSource: 'populationAnalysis',
          template: this.getPopulationAnalysisTemplate()
        },
        {
          id: 'statistical-considerations',
          title: 'Statistical Considerations',
          order: 5,
          required: true,
          contentType: 'analysis',
          dataSource: 'statisticalAnalysis',
          template: this.getStatisticalConsiderationsTemplate()
        }
      ],
      styling: this.getRegulatoryStyling(),
      metadata: {
        version: '1.0',
        lastUpdated: new Date(),
        complianceLevel: 'FDA'
      }
    });

    // Operational Feasibility Template
    this.templates.set('operational-feasibility', {
      id: 'operational-feasibility',
      name: 'Operational Feasibility Assessment',
      description: 'Comprehensive operational analysis for clinical operations teams',
      targetAudience: 'Clinical Operations',
      format: 'PDF',
      sections: [
        {
          id: 'feasibility-overview',
          title: 'Operational Feasibility Overview',
          order: 1,
          required: true,
          contentType: 'summary',
          dataSource: 'executiveSummary.overallAssessment',
          template: this.getOperationalOverviewTemplate()
        },
        {
          id: 'site-requirements',
          title: 'Site Requirements & Distribution',
          order: 2,
          required: true,
          contentType: 'analysis',
          dataSource: 'designAnalysis',
          template: this.getSiteRequirementsTemplate()
        },
        {
          id: 'recruitment-analysis',
          title: 'Patient Recruitment Analysis',
          order: 3,
          required: true,
          contentType: 'analysis',
          dataSource: 'populationAnalysis',
          template: this.getRecruitmentAnalysisTemplate()
        },
        {
          id: 'timeline-feasibility',
          title: 'Timeline & Resource Feasibility',
          order: 4,
          required: true,
          contentType: 'analysis',
          dataSource: 'timelineAnalysis',
          template: this.getTimelineFeasibilityTemplate()
        },
        {
          id: 'risk-mitigation',
          title: 'Operational Risk Mitigation',
          order: 5,
          required: true,
          contentType: 'recommendations',
          dataSource: 'riskAssessment',
          template: this.getOperationalRiskTemplate()
        }
      ],
      styling: this.getClinicalStyling(),
      metadata: {
        version: '1.0',
        lastUpdated: new Date(),
        complianceLevel: 'GCP'
      }
    });
  }

  private prepareDataContext(
    analysisResult: ComprehensiveAnalysisResult,
    validationResult?: ValidationResult,
    performanceMetrics?: PerformanceMetrics,
    options?: ReportGenerationOptions
  ): any {
    const context = {
      analysis: analysisResult,
      validation: validationResult,
      performance: performanceMetrics,
      options,
      generation: {
        timestamp: new Date(),
        version: '2.0.0',
        confidentiality: options?.confidentialityLevel || 'Internal'
      },
      // Helper functions for templates
      helpers: {
        formatDate: (date: Date) => date.toLocaleDateString(),
        formatDateTime: (date: Date) => date.toLocaleString(),
        formatNumber: (num: number, decimals = 2) => num.toFixed(decimals),
        formatPercent: (num: number) => `${(num * 100).toFixed(1)}%`,
        getRiskColor: (level: string) => {
          const colors = { Low: '#28a745', Medium: '#ffc107', High: '#fd7e14', 'Very High': '#dc3545' };
          return colors[level as keyof typeof colors] || '#6c757d';
        },
        getComplexityIcon: (level: string) => {
          const icons = { Low: '🟢', Medium: '🟡', High: '🟠', 'Very High': '🔴' };
          return icons[level as keyof typeof icons] || '⚪';
        }
      }
    };

    return context;
  }

  private async renderTemplate(template: ReportTemplate, context: any): Promise<string> {
    const sortedSections = template.sections.sort((a, b) => a.order - b.order);
    const renderedSections: string[] = [];

    // Render header
    renderedSections.push(this.renderHeader(template, context));

    // Render each section
    for (const section of sortedSections) {
      // Extract data from analysis portion of context
      const sectionData = this.extractDataByPath(context.analysis, section.dataSource);
      const renderedSection = this.renderSection(section, sectionData, context);
      renderedSections.push(renderedSection);
    }

    // Render footer
    renderedSections.push(this.renderFooter(template, context));

    return renderedSections.join('\n\n');
  }

  private renderHeader(template: ReportTemplate, context: any): string {
    return `
# ${template.name}

**Protocol:** ${context.analysis.protocolInfo.protocolNumber} - ${context.analysis.protocolInfo.studyTitle}
**Generated:** ${context.helpers.formatDateTime(context.generation.timestamp)}
**Analysis ID:** ${context.analysis.analysisId}
**Confidentiality:** ${context.generation.confidentiality}

---
`;
  }

  private renderSection(section: ReportSection, data: any, context: any): string {
    // Debug logging for section data
    console.log('Section data:', {
      sectionId: section.id,
      sectionTitle: section.title,
      dataSource: section.dataSource,
      hasData: !!data,
      dataKeys: data ? Object.keys(data) : null,
      dataPreview: data ? JSON.stringify(data, null, 2).substring(0, 500) : 'null'
    });
    
    logInfo('Rendering section', {
      sectionId: section.id,
      sectionTitle: section.title,
      dataSource: section.dataSource,
      hasData: !!data,
      isRequired: section.required
    });

    if (!data && section.required) {
      logInfo('No data available for required section', { 
        sectionId: section.id, 
        dataSource: section.dataSource 
      });
      return `\n## ${section.title}\n\n*Data not available for this section.*\n`;
    }

    if (!data) {
      logInfo('No data available for optional section', { 
        sectionId: section.id, 
        dataSource: section.dataSource 
      });
      return '';
    }

    try {
      const renderedContent = this.processTemplate(section.template, { data, context, helpers: context.helpers });
      logInfo('Section rendered successfully', {
        sectionId: section.id,
        contentLength: renderedContent.length
      });
      return renderedContent;
    } catch (error) {
      logInfo('Error rendering section', {
        sectionId: section.id,
        error: error instanceof Error ? error.message : String(error)
      });
      return `\n## ${section.title}\n\n*Error rendering this section.*\n`;
    }
  }

  private renderFooter(template: ReportTemplate, context: any): string {
    return `
---

**Report Information**
- Template: ${template.name} (${template.id})
- Generated by: Protocol Analyzer v${context.generation.version}
- Compliance Level: ${template.metadata.complianceLevel}
- Target Audience: ${template.targetAudience}

${template.styling.footerText || ''}
`;
  }

  private processTemplate(template: string, context: any): string {
    // Simple template processing - in production would use a proper template engine
    return template.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
      try {
        const value = this.extractDataByPath(context, path.trim());
        return String(value ?? '');
      } catch {
        return match; // Return original if evaluation fails
      }
    });
  }

  private extractDataByPath(obj: any, path: string): any {
    console.log('Extracting data by path:', {
      path,
      hasObj: !!obj,
      objKeys: obj ? Object.keys(obj) : null
    });
    
    const result = path.split('.').reduce((current, key) => {
      console.log('Path traversal:', {
        key,
        hasCurrent: !!current,
        currentKeys: current ? Object.keys(current) : null,
        hasKey: current && current[key] !== undefined
      });
      return current && current[key] !== undefined ? current[key] : null;
    }, obj);
    
    console.log('Path extraction result:', {
      path,
      hasResult: !!result,
      resultType: typeof result,
      result: result ? JSON.stringify(result, null, 2).substring(0, 200) : 'null'
    });
    
    return result;
  }

  private estimatePageCount(content: string): number {
    // Rough estimation: 500 words per page
    const wordCount = this.countWords(content);
    return Math.ceil(wordCount / 500);
  }

  private countWords(content: string): number {
    return content.split(/\s+/).filter(word => word.length > 0).length;
  }

  // Template content methods
  private getExecutiveCoverTemplate(): string {
    return `
## Clinical Development Executive Summary

### Protocol Overview
- **Study:** {{context.analysis.protocolInfo.studyTitle}}
- **Protocol Number:** {{context.analysis.protocolInfo.protocolNumber}}
- **Phase:** {{context.analysis.protocolInfo.phase}}
- **Therapeutic Area:** {{context.analysis.protocolInfo.therapeuticArea}}
- **Indication:** {{context.analysis.protocolInfo.indication}}
- **Sponsor:** {{context.analysis.protocolInfo.sponsor}}
- **Target Enrollment:** {{context.analysis.protocolInfo.targetEnrollment}}

### Strategic Assessment
- **Clinical Viability Score:** {{data.overallAssessment.feasibilityScore}}/100
- **Regulatory Risk:** {{data.overallAssessment.riskLevel}}
- **Operational Feasibility:** {{data.overallAssessment.complexity}}
- **Go/No-Go Recommendation:** {{data.overallAssessment.recommendation}}

### Key Metrics
- **Critical Issues Identified:** {{data.criticalIssues.length}}
- **Strategic Recommendations:** {{data.topRecommendations.length}}
- **Success Factors:** {{data.successFactors.length}}

### Strategic Rationale
{{data.overallAssessment.rationale}}
`;
  }

  private getOverallAssessmentTemplate(): string {
    return `
## Overall Assessment

**Feasibility Score:** {{data.feasibilityScore}}/100
**Risk Level:** {{data.riskLevel}}
**Complexity:** {{data.complexity}}
**Recommendation:** {{data.recommendation}}

**Rationale:** {{data.rationale}}
`;
  }

  private getKeyFindingsTemplate(): string {
    return `
## Key Findings

{{#each data}}
- **{{this.category}}:** {{this.finding}} (Impact: {{this.impact}})
{{/each}}
`;
  }

  private getCriticalIssuesTemplate(): string {
    return `
## Critical Issues

{{#each data}}
### {{this.issue}}
- **Severity:** {{this.severity}}
- **Impact:** {{this.impact}}
- **Recommendation:** {{this.recommendation}}
- **Urgency:** {{this.urgency}}

{{/each}}
`;
  }

  private getTopRecommendationsTemplate(): string {
    return `
## Top Recommendations

{{#each data}}
### {{this.priority}}. {{this.recommendation}}
- **Category:** {{this.category}}
- **Benefit:** {{this.benefit}}
- **Effort:** {{this.effort}}
- **Timeline:** {{this.timeline}}

{{/each}}
`;
  }

  private getProtocolInfoTemplate(): string {
    return `
## Protocol Information

| Field | Value |
|-------|-------|
| Protocol Number | {{data.protocolNumber}} |
| Study Title | {{data.studyTitle}} |
| Phase | {{data.phase}} |
| Therapeutic Area | {{data.therapeuticArea}} |
| Sponsor | {{data.sponsor}} |
| Indication | {{data.indication}} |
| Study Type | {{data.studyType}} |
| Target Enrollment | {{data.targetEnrollment}} |
| Estimated Duration | {{data.estimatedDuration}} |
`;
  }

  private getDesignAnalysisTemplate(): string {
    return `
## Study Design Analysis

### Design Classification
- **Design Type:** {{data.designType}}
- **Primary Type:** {{data.designClassification.primaryType}}
- **Allocation:** {{data.designClassification.allocation}}
- **Masking:** {{data.designClassification.masking}}
- **Purpose:** {{data.designClassification.purpose}}

### Complexity Assessment
- **Overall Complexity:** {{data.complexity.overall}}
- **Complexity Score:** {{data.complexity.score}}/100
- **Feasibility Score:** {{data.feasibilityScore}}/100

### Strengths
{{#each data.strengths}}
- **{{this.category}}:** {{this.description}} (Impact: {{this.impact}})
{{/each}}

### Weaknesses
{{#each data.weaknesses}}
- **{{this.category}}:** {{this.description}} (Severity: {{this.severity}})
  - **Impact:** {{this.impact}}
  - **Recommendation:** {{this.recommendation}}
{{/each}}
`;
  }

  private getRiskAssessmentTemplate(): string {
    return `
## Risk Assessment

### Overall Risk Profile
- **Risk Level:** {{data.overallRiskLevel}}
- **Risk Score:** {{data.riskScore}}/100

### Risk Categories

#### Enrollment Risks
- **Level:** {{data.enrollmentRisks.level}}
- **Score:** {{data.enrollmentRisks.score}}/100

#### Regulatory Risks
- **Level:** {{data.regulatoryRisks.level}}
- **Score:** {{data.regulatoryRisks.score}}/100

#### Operational Risks
- **Level:** {{data.operationalRisks.level}}
- **Score:** {{data.operationalRisks.score}}/100

#### Safety Risks
- **Level:** {{data.safetyRisks.level}}
- **Score:** {{data.safetyRisks.score}}/100

### Mitigation Strategies
{{#each data.mitigation.strategies}}
- **Risk:** {{this.riskId}}
- **Strategy:** {{this.strategy}}
- **Implementation:** {{this.implementation}}
- **Timeline:** {{this.timeline}}
- **Effectiveness:** {{this.effectiveness}}
{{/each}}
`;
  }

  private getTimelineAnalysisTemplate(): string {
    return `
## Timeline Analysis

### Duration Assessment
- **Proposed Duration:** {{data.overallDuration.proposed}}
- **Realistic Duration:** {{data.overallDuration.realistic}}
- **Assessment:** {{data.overallDuration.comparison}}

### Feasibility
- **Feasibility Score:** {{data.feasibilityAssessment.feasibilityScore}}/100

### Challenging Aspects
{{#each data.feasibilityAssessment.challengingAspects}}
- {{this}}
{{/each}}

### Optimization Opportunities
{{#each data.optimizationOpportunities}}
- **Phase:** {{this.phase}}
- **Current Duration:** {{this.currentDuration}}
- **Optimized Duration:** {{this.optimizedDuration}}
- **Strategy:** {{this.strategy}}
- **Feasibility:** {{this.feasibility}}
{{/each}}
`;
  }

  private getOptimizationTemplate(): string {
    return `
## Optimization Recommendations

### Prioritized Actions
{{#each data.prioritizedActions}}
### {{this.rank}}. {{this.action}}
- **Category:** {{this.category}}
- **Rationale:** {{this.rationale}}
- **Impact:** {{this.impact}}
- **Effort:** {{this.effort}}
- **Timeline:** {{this.timeline}}

{{/each}}

### Protocol Improvements
{{#each data.protocolImprovements}}
- **Category:** {{this.category}}
- **Current:** {{this.current}}
- **Recommended:** {{this.recommended}}
- **Rationale:** {{this.rationale}}
{{/each}}
`;
  }

  private getRegulatorySummaryTemplate(): string {
    return `
## Regulatory Summary

### Overall Assessment
- **Recommendation:** {{data.overallAssessment.recommendation}}
- **Risk Level:** {{data.overallAssessment.riskLevel}}
- **Feasibility:** {{data.overallAssessment.feasibilityScore}}/100

### Regulatory Considerations
- **Study Phase:** {{context.analysis.protocolInfo.phase}}
- **Therapeutic Area:** {{context.analysis.protocolInfo.therapeuticArea}}
- **Indication:** {{context.analysis.protocolInfo.indication}}

### Critical Issues for Regulatory Review
{{#each data.criticalIssues}}
- **{{this.issue}}** ({{this.severity}})
  - Impact: {{this.impact}}
  - Urgency: {{this.urgency}}
{{/each}}
`;
  }

  private getEndpointAssessmentTemplate(): string {
    return `
## Endpoint Assessment

### Primary Endpoints
{{#each data.primaryEndpoints}}
- **Endpoint:** {{this.endpoint}}
- **Type:** {{this.type}}
- **Measurability:** {{this.measurability}}
- **Clinical Relevance:** {{this.clinicalRelevance}}
- **Regulatory Acceptance:** {{this.regulatoryAcceptance}}
{{/each}}

### Secondary Endpoints
{{#each data.secondaryEndpoints}}
- **Endpoint:** {{this.endpoint}}
- **Type:** {{this.type}}
- **Measurability:** {{this.measurability}}
{{/each}}

### Endpoint Hierarchy Analysis
- **Appropriate Hierarchy:** {{data.endpointHierarchy.isAppropriate}}
- **Multiplicity Concerns:** {{data.endpointHierarchy.multiplicity.hasMultiplicity}}
- **Adjustment Needed:** {{data.endpointHierarchy.multiplicity.adjustmentNeeded}}

### Recommendations
{{#each data.recommendations}}
- **Type:** {{this.type}} - {{this.endpoint}}
- **Rationale:** {{this.rationale}}
- **Priority:** {{this.priority}}
{{/each}}
`;
  }

  private getRegulatoryAlignmentTemplate(): string {
    return `
## Regulatory Alignment

### Regions
{{#each data.region}}
- {{this}}
{{/each}}

### Guidance Alignment
{{#each data.guidance}}
#### {{this.guidance}}
- **Alignment:** {{this.alignment}}
- **Gaps:** {{#each this.gaps}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}
- **Recommendations:** {{#each this.recommendations}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}
{{/each}}
`;
  }

  private getPopulationAnalysisTemplate(): string {
    return `
## Population Analysis

### Target Population
- **Appropriateness:** {{data.targetPopulation.appropriateness}}
- **Size Assessment:** {{data.targetPopulation.size}}
- **Accessibility:** {{data.targetPopulation.accessibility}}

### Inclusion Criteria
- **Appropriateness:** {{data.inclusionCriteria.appropriateness}}
- **Clarity:** {{data.inclusionCriteria.clarity}}
- **Measurability:** {{data.inclusionCriteria.measurability}}

### Exclusion Criteria
- **Appropriateness:** {{data.exclusionCriteria.appropriateness}}
- **Clarity:** {{data.exclusionCriteria.clarity}}
- **Measurability:** {{data.exclusionCriteria.measurability}}

### Enrollment Feasibility
- **Feasibility Score:** {{data.enrollmentFeasibility.feasibilityScore}}/100
- **Estimated Enrollment Rate:** {{data.enrollmentFeasibility.estimatedEnrollmentRate}}
- **Competitive Studies Impact:** {{data.enrollmentFeasibility.competitiveStudies.impact}}
`;
  }

  private getStatisticalConsiderationsTemplate(): string {
    return `
## Statistical Considerations

### Sample Size Analysis
- **Proposed Sample Size:** {{data.sampleSize.proposed}}
- **Appropriateness:** {{data.sampleSize.appropriateness}}

### Power Analysis
- **Specified Power:** {{data.powerAnalysis.specifiedPower}}%
- **Detectable Effect:** {{data.powerAnalysis.detectableEffect}}
- **Robustness:** {{data.powerAnalysis.robustness}}

### Statistical Methods
- **Primary Analysis:** {{data.statisticalMethods.primaryAnalysis.method}}
- **Appropriateness:** {{data.statisticalMethods.appropriateness}}

### Missing Data Strategy
- **Anticipated:** {{data.missingData.anticipated}}
- **Strategy:** {{data.missingData.strategy}}
- **Appropriateness:** {{data.missingData.appropriateness}}
`;
  }

  // New operational template methods
  private getOperationalOverviewTemplate(): string {
    return `
## Operational Feasibility Overview

### Feasibility Assessment
- **Clinical Viability Score:** {{data.feasibilityScore}}/100
- **Operational Complexity:** {{data.complexity}}
- **Overall Recommendation:** {{data.recommendation}}

### Executive Summary
{{data.rationale}}

### Key Operational Metrics
- **Estimated Study Duration:** To be determined based on analysis
- **Site Requirements:** To be assessed
- **Patient Population Accessibility:** {{data.complexity}} complexity level
`;
  }

  private getSiteRequirementsTemplate(): string {
    return `
## Site Requirements & Distribution

### Study Design Requirements
- **Design Type:** {{data.designType}}
- **Study Complexity:** {{data.complexity.overall}}
- **Complexity Score:** {{data.complexity.score}}/100

### Site Selection Criteria
- **Estimated Sites Needed:** Based on enrollment targets
- **Specialty Requirements:** Determined by indication
- **Geographic Considerations:** Global/regional distribution

### Operational Strengths
{{#each data.strengths}}
- **{{this.category}}:** {{this.description}}
{{/each}}

### Operational Challenges
{{#each data.weaknesses}}
- **{{this.category}}:** {{this.description}}
  - **Mitigation:** {{this.recommendation}}
{{/each}}
`;
  }

  private getRecruitmentAnalysisTemplate(): string {
    return `
## Patient Recruitment Analysis

### Target Population Assessment
- **Population Appropriateness:** {{data.targetPopulation.appropriateness}}
- **Population Size:** {{data.targetPopulation.size}}
- **Accessibility:** {{data.targetPopulation.accessibility}}

### Recruitment Feasibility
- **Feasibility Score:** {{data.enrollmentFeasibility.feasibilityScore}}/100
- **Estimated Timeline:** {{data.enrollmentFeasibility.estimatedEnrollmentRate}}
- **Competition Impact:** {{data.enrollmentFeasibility.competitiveStudies.impact}}

### Inclusion/Exclusion Criteria
- **Inclusion Appropriateness:** {{data.inclusionCriteria.appropriateness}}
- **Exclusion Appropriateness:** {{data.exclusionCriteria.appropriateness}}

### Mitigation Strategies
{{#each data.enrollmentFeasibility.mitigationStrategies}}
- {{this}}
{{/each}}
`;
  }

  private getTimelineFeasibilityTemplate(): string {
    return `
## Timeline & Resource Feasibility

### Duration Assessment
- **Proposed Duration:** {{data.overallDuration.proposed}}
- **Realistic Assessment:** {{data.overallDuration.comparison}}

### Feasibility Metrics
- **Timeline Feasibility Score:** {{data.feasibilityAssessment.feasibilityScore}}/100

### Critical Path Analysis
{{#each data.criticalPath.criticalActivities}}
- **Activity:** {{this}}
{{/each}}

### Optimization Opportunities
{{#each data.optimizationOpportunities}}
- **Phase:** {{this.phase}}
- **Current Duration:** {{this.currentDuration}}
- **Optimized Duration:** {{this.optimizedDuration}}
- **Strategy:** {{this.strategy}}
{{/each}}
`;
  }

  private getOperationalRiskTemplate(): string {
    return `
## Operational Risk Mitigation

### Overall Risk Profile
- **Risk Level:** {{data.overallRiskLevel}}
- **Risk Score:** {{data.riskScore}}/100

### Operational Risk Categories

#### Enrollment Risks
- **Risk Level:** {{data.enrollmentRisks.level}}
- **Risk Score:** {{data.enrollmentRisks.score}}/100

#### Timeline Risks
- **Risk Level:** {{data.timelineRisks.level}}
- **Risk Score:** {{data.timelineRisks.score}}/100

### Mitigation Strategies
{{#each data.mitigation.strategies}}
- **Risk:** {{this.riskId}}
- **Strategy:** {{this.strategy}}
- **Timeline:** {{this.timeline}}
- **Effectiveness:** {{this.effectiveness}}
{{/each}}

### Monitoring Plan
- **Review Frequency:** {{data.monitoringPlan.reviewFrequency}}
- **Key Indicators:** Operational KPIs to be monitored
`;
  }

  // Styling configurations
  private getExecutiveStyling(): ReportStyling {
    return {
      colorScheme: {
        primary: '#2E86AB',
        secondary: '#A23B72',
        accent: '#F18F01',
        text: '#2D3436',
        background: '#FFFFFF'
      },
      fonts: {
        heading: 'Arial Bold',
        body: 'Arial',
        monospace: 'Courier New'
      },
      margins: { top: 25, bottom: 25, left: 25, right: 25 }
    };
  }

  private getClinicalStyling(): ReportStyling {
    return {
      colorScheme: {
        primary: '#0F3460',
        secondary: '#16537e',
        accent: '#E94560',
        text: '#2D3436',
        background: '#FFFFFF'
      },
      fonts: {
        heading: 'Calibri Bold',
        body: 'Calibri',
        monospace: 'Consolas'
      },
      margins: { top: 20, bottom: 20, left: 20, right: 20 }
    };
  }

  private getRegulatoryStyling(): ReportStyling {
    return {
      colorScheme: {
        primary: '#1A237E',
        secondary: '#3F51B5',
        accent: '#FF5722',
        text: '#212121',
        background: '#FFFFFF'
      },
      fonts: {
        heading: 'Times New Roman Bold',
        body: 'Times New Roman',
        monospace: 'Courier New'
      },
      margins: { top: 30, bottom: 30, left: 30, right: 30 }
    };
  }
}

// Export singleton instance
export const reportTemplateEngine = new ReportTemplateEngine();