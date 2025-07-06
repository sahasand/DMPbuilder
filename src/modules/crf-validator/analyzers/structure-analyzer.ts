import { createModuleLogger } from '../../../utils/logger';
import { CRFSpecification, StructuralAnalysisResult, CRFForm, CRFField } from '../types/crf-validation-types';

const logger = createModuleLogger('crf-structure-analyzer');

export interface StructuralScoring {
  completenessScore: number;
  consistencyScore: number;
  organizationScore: number;
  efficiencyScore: number;
}

export class CRFStructureAnalyzer {
  /**
   * Analyzes the structural quality of CRF specifications
   */
  async analyzeStructure(crfSpec: CRFSpecification): Promise<StructuralAnalysisResult> {
    logger.info('Starting CRF structural analysis', {
      crfId: crfSpec.crfId,
      formCount: crfSpec.forms?.length || 0
    });

    try {
      const structuralScoring = await this.calculateStructuralScores(crfSpec);
      const organizationAnalysis = this.analyzeOrganization(crfSpec);
      const fieldAnalysis = this.analyzeFields(crfSpec);
      const navigationAnalysis = this.analyzeNavigation(crfSpec);

      const result: StructuralAnalysisResult = {
        analysisId: `struct-${Date.now()}`,
        crfId: crfSpec.crfId,
        structuralScoring,
        organizationAnalysis,
        fieldAnalysis,
        navigationAnalysis,
        recommendations: this.generateStructuralRecommendations(structuralScoring, crfSpec),
        timestamp: new Date()
      };

      logger.info('CRF structural analysis completed', {
        crfId: crfSpec.crfId,
        completenessScore: structuralScoring.completenessScore,
        consistencyScore: structuralScoring.consistencyScore
      });

      return result;
    } catch (error) {
      logger.error('Failed to analyze CRF structure', {
        crfId: crfSpec.crfId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Calculate structural quality scores
   */
  private async calculateStructuralScores(crfSpec: CRFSpecification): Promise<StructuralScoring> {
    const completenessScore = this.calculateCompletenessScore(crfSpec);
    const consistencyScore = this.calculateConsistencyScore(crfSpec);
    const organizationScore = this.calculateOrganizationScore(crfSpec);
    const efficiencyScore = this.calculateEfficiencyScore(crfSpec);

    return {
      completenessScore,
      consistencyScore,
      organizationScore,
      efficiencyScore
    };
  }

  /**
   * Calculate completeness score (0-100)
   */
  private calculateCompletenessScore(crfSpec: CRFSpecification): number {
    if (!crfSpec.forms || crfSpec.forms.length === 0) return 0;

    let totalScore = 0;
    let totalForms = crfSpec.forms.length;

    for (const form of crfSpec.forms) {
      let formScore = 0;
      let maxFormScore = 100;

      // Form metadata completeness (30 points)
      if (form.formName) formScore += 15;
      if (form.formDescription) formScore += 10;
      if (form.visitSchedule && form.visitSchedule.length > 0) formScore += 5;

      // Field completeness (50 points)
      if (form.fields && form.fields.length > 0) {
        const fieldScore = this.calculateFieldCompleteness(form.fields);
        formScore += fieldScore * 0.5;
      }

      // Validation rules (20 points)
      if (form.validationRules && form.validationRules.length > 0) {
        formScore += 20;
      }

      totalScore += (formScore / maxFormScore) * 100;
    }

    return Math.round(totalScore / totalForms);
  }

  /**
   * Calculate field completeness percentage
   */
  private calculateFieldCompleteness(fields: CRFField[]): number {
    if (fields.length === 0) return 0;

    let completeFields = 0;
    for (const field of fields) {
      let fieldScore = 0;
      
      if (field.fieldName) fieldScore += 25;
      if (field.dataType) fieldScore += 25;
      if (field.required !== undefined) fieldScore += 25;
      if (field.description || field.fieldLabel) fieldScore += 25;

      if (fieldScore >= 75) completeFields++;
    }

    return Math.round((completeFields / fields.length) * 100);
  }

  /**
   * Calculate consistency score across forms
   */
  private calculateConsistencyScore(crfSpec: CRFSpecification): number {
    if (!crfSpec.forms || crfSpec.forms.length < 2) return 100;

    let consistencyIssues = 0;
    let totalChecks = 0;

    // Check naming consistency
    const namingPatterns = this.analyzeNamingPatterns(crfSpec.forms);
    totalChecks += namingPatterns.totalChecks;
    consistencyIssues += namingPatterns.inconsistencies;

    // Check data type consistency for similar fields
    const dataTypeConsistency = this.analyzeDataTypeConsistency(crfSpec.forms);
    totalChecks += dataTypeConsistency.totalChecks;
    consistencyIssues += dataTypeConsistency.inconsistencies;

    if (totalChecks === 0) return 100;
    
    const consistencyRate = 1 - (consistencyIssues / totalChecks);
    return Math.round(consistencyRate * 100);
  }

  /**
   * Analyze naming pattern consistency
   */
  private analyzeNamingPatterns(forms: CRFForm[]): { totalChecks: number; inconsistencies: number } {
    const fieldNames = new Map<string, string[]>();
    let totalChecks = 0;
    let inconsistencies = 0;

    // Collect all field names and their patterns
    for (const form of forms) {
      if (form.fields) {
        for (const field of form.fields) {
          if (field.fieldName) {
            const basePattern = this.extractNamingPattern(field.fieldName);
            if (!fieldNames.has(basePattern)) {
              fieldNames.set(basePattern, []);
            }
            fieldNames.get(basePattern)!.push(field.fieldName);
          }
        }
      }
    }

    // Check for inconsistencies in similar field names
    for (const [pattern, names] of fieldNames.entries()) {
      if (names.length > 1) {
        totalChecks += names.length - 1;
        const variations = new Set(names.map(name => this.normalizeFieldName(name)));
        if (variations.size > 1) {
          inconsistencies += names.length - 1;
        }
      }
    }

    return { totalChecks, inconsistencies };
  }

  /**
   * Extract base naming pattern from field name
   */
  private extractNamingPattern(fieldName: string): string {
    // Remove common suffixes and numbers to find base pattern
    return fieldName
      .replace(/\d+$/, '')
      .replace(/_date$|_time$|_yn$|_text$/, '')
      .toLowerCase();
  }

  /**
   * Normalize field name for consistency checking
   */
  private normalizeFieldName(fieldName: string): string {
    return fieldName
      .toLowerCase()
      .replace(/[-_\s]/g, '')
      .replace(/\d+/g, 'N');
  }

  /**
   * Analyze data type consistency for similar fields
   */
  private analyzeDataTypeConsistency(forms: CRFForm[]): { totalChecks: number; inconsistencies: number } {
    const fieldTypes = new Map<string, Set<string>>();
    let totalChecks = 0;
    let inconsistencies = 0;

    // Collect field patterns and their data types
    for (const form of forms) {
      if (form.fields) {
        for (const field of form.fields) {
          if (field.fieldName && field.dataType) {
            const pattern = this.extractNamingPattern(field.fieldName);
            if (!fieldTypes.has(pattern)) {
              fieldTypes.set(pattern, new Set());
            }
            fieldTypes.get(pattern)!.add(field.dataType);
          }
        }
      }
    }

    // Check for data type inconsistencies
    for (const [pattern, types] of fieldTypes.entries()) {
      if (types.size > 1) {
        totalChecks++;
        inconsistencies++;
      }
    }

    return { totalChecks, inconsistencies };
  }

  /**
   * Calculate organization score
   */
  private calculateOrganizationScore(crfSpec: CRFSpecification): number {
    if (!crfSpec.forms || crfSpec.forms.length === 0) return 0;

    let organizationScore = 0;
    const forms = crfSpec.forms;

    // Logical grouping (40 points)
    const groupingScore = this.analyzeLogicalGrouping(forms);
    organizationScore += groupingScore * 0.4;

    // Visit schedule organization (30 points)
    const scheduleScore = this.analyzeVisitScheduleOrganization(forms);
    organizationScore += scheduleScore * 0.3;

    // Form flow (30 points)
    const flowScore = this.analyzeFormFlow(forms);
    organizationScore += flowScore * 0.3;

    return Math.round(organizationScore);
  }

  /**
   * Analyze logical grouping of forms and fields
   */
  private analyzeLogicalGrouping(forms: CRFForm[]): number {
    // Simple heuristic: check if forms have clear purposes
    let wellOrganizedForms = 0;

    for (const form of forms) {
      if (this.isWellOrganizedForm(form)) {
        wellOrganizedForms++;
      }
    }

    return forms.length > 0 ? Math.round((wellOrganizedForms / forms.length) * 100) : 0;
  }

  /**
   * Check if a form appears well-organized
   */
  private isWellOrganizedForm(form: CRFForm): boolean {
    if (!form.formName) return false;

    // Check for clear form purpose in name
    const purposeKeywords = [
      'demog', 'medical', 'history', 'vital', 'lab', 'ae', 'adverse',
      'conmed', 'medication', 'visit', 'screen', 'baseline', 'followup',
      'endpoint', 'efficacy', 'safety', 'pk', 'pharmacok'
    ];

    const formNameLower = form.formName.toLowerCase();
    const hasClearPurpose = purposeKeywords.some(keyword => 
      formNameLower.includes(keyword)
    );

    return hasClearPurpose;
  }

  /**
   * Analyze visit schedule organization
   */
  private analyzeVisitScheduleOrganization(forms: CRFForm[]): number {
    const formsWithSchedule = forms.filter(form => 
      form.visitSchedule && form.visitSchedule.length > 0
    );

    if (formsWithSchedule.length === 0) return 50; // Neutral score if no schedule info

    // Check for logical visit progression
    let wellScheduledForms = 0;
    for (const form of formsWithSchedule) {
      if (this.hasLogicalVisitProgression(form.visitSchedule || [])) {
        wellScheduledForms++;
      }
    }

    return Math.round((wellScheduledForms / formsWithSchedule.length) * 100);
  }

  /**
   * Check if visit schedule has logical progression
   */
  private hasLogicalVisitProgression(visitSchedule: string[]): boolean {
    // Simple check for common visit patterns
    const schedule = visitSchedule.join(' ').toLowerCase();
    const hasScreening = schedule.includes('screen');
    const hasBaseline = schedule.includes('baseline') || schedule.includes('day 1');
    const hasFollowup = schedule.includes('follow') || schedule.includes('week') || schedule.includes('month');

    return hasScreening || hasBaseline || hasFollowup;
  }

  /**
   * Analyze form flow logic
   */
  private analyzeFormFlow(forms: CRFForm[]): number {
    // Check if forms follow logical clinical workflow
    const formNames = forms.map(f => f.formName?.toLowerCase() || '');
    
    let flowScore = 50; // Base score

    // Bonus for logical ordering
    if (this.hasLogicalFormOrdering(formNames)) {
      flowScore += 30;
    }

    // Bonus for complete workflow coverage
    if (this.hasCompleteWorkflowCoverage(formNames)) {
      flowScore += 20;
    }

    return Math.min(100, flowScore);
  }

  /**
   * Check if forms follow logical clinical ordering
   */
  private hasLogicalFormOrdering(formNames: string[]): boolean {
    const expectedOrder = ['screen', 'demog', 'medical', 'baseline', 'vital', 'lab'];
    let lastFoundIndex = -1;

    for (const expectedForm of expectedOrder) {
      const foundIndex = formNames.findIndex((name, index) => 
        index > lastFoundIndex && name.includes(expectedForm)
      );
      if (foundIndex > lastFoundIndex) {
        lastFoundIndex = foundIndex;
      }
    }

    return lastFoundIndex > 0; // Found at least some logical ordering
  }

  /**
   * Check if workflow covers essential clinical areas
   */
  private hasCompleteWorkflowCoverage(formNames: string[]): boolean {
    const essentialAreas = ['demog', 'medical', 'vital', 'adverse', 'medication'];
    const coveredAreas = essentialAreas.filter(area =>
      formNames.some(name => name.includes(area))
    );

    return coveredAreas.length >= 3; // At least 3 essential areas covered
  }

  /**
   * Calculate efficiency score
   */
  private calculateEfficiencyScore(crfSpec: CRFSpecification): number {
    if (!crfSpec.forms || crfSpec.forms.length === 0) return 0;

    let efficiencyScore = 0;

    // Field density (40 points)
    const densityScore = this.calculateFieldDensity(crfSpec.forms);
    efficiencyScore += densityScore * 0.4;

    // Redundancy check (30 points)
    const redundancyScore = this.calculateRedundancyScore(crfSpec.forms);
    efficiencyScore += redundancyScore * 0.3;

    // Data entry efficiency (30 points)
    const entryScore = this.calculateDataEntryEfficiency(crfSpec.forms);
    efficiencyScore += entryScore * 0.3;

    return Math.round(efficiencyScore);
  }

  /**
   * Calculate field density efficiency
   */
  private calculateFieldDensity(forms: CRFForm[]): number {
    const totalFields = forms.reduce((sum, form) => 
      sum + (form.fields?.length || 0), 0
    );

    if (totalFields === 0) return 0;

    // Optimal range: 5-15 fields per form
    const avgFieldsPerForm = totalFields / forms.length;
    
    if (avgFieldsPerForm >= 5 && avgFieldsPerForm <= 15) {
      return 100;
    } else if (avgFieldsPerForm < 5) {
      return Math.max(0, (avgFieldsPerForm / 5) * 100);
    } else {
      return Math.max(0, 100 - ((avgFieldsPerForm - 15) * 5));
    }
  }

  /**
   * Calculate redundancy score (higher is better - less redundancy)
   */
  private calculateRedundancyScore(forms: CRFForm[]): number {
    const allFields = forms.flatMap(form => form.fields || []);
    if (allFields.length === 0) return 100;

    const fieldNames = allFields
      .map(field => field.fieldName?.toLowerCase())
      .filter(name => name);

    const uniqueFields = new Set(fieldNames).size;
    const redundancyRate = 1 - (uniqueFields / fieldNames.length);

    return Math.round((1 - redundancyRate) * 100);
  }

  /**
   * Calculate data entry efficiency
   */
  private calculateDataEntryEfficiency(forms: CRFForm[]): number {
    let efficiencyScore = 0;
    let totalFields = 0;

    for (const form of forms) {
      if (form.fields) {
        for (const field of form.fields) {
          totalFields++;
          
          // Bonus for efficient data types
          if (this.isEfficientDataType(field.dataType)) {
            efficiencyScore += 1;
          }

          // Bonus for controlled vocabularies
          if (field.controlledVocabulary && field.controlledVocabulary.length > 0) {
            efficiencyScore += 1;
          }

          // Bonus for appropriate field types
          if (this.hasAppropriateFieldType(field)) {
            efficiencyScore += 1;
          }
        }
      }
    }

    return totalFields > 0 ? Math.round((efficiencyScore / (totalFields * 3)) * 100) : 0;
  }

  /**
   * Check if data type is efficient for data entry
   */
  private isEfficientDataType(dataType?: string): boolean {
    if (!dataType) return false;
    
    const efficientTypes = ['dropdown', 'radio', 'checkbox', 'date', 'number'];
    return efficientTypes.includes(dataType.toLowerCase());
  }

  /**
   * Check if field has appropriate type for its purpose
   */
  private hasAppropriateFieldType(field: CRFField): boolean {
    if (!field.fieldName || !field.dataType) return false;

    const fieldNameLower = field.fieldName.toLowerCase();
    const dataTypeLower = field.dataType.toLowerCase();

    // Date fields should use date type
    if (fieldNameLower.includes('date') && dataTypeLower === 'date') return true;
    
    // Yes/No fields should use radio or dropdown
    if (fieldNameLower.includes('_yn') && ['radio', 'dropdown'].includes(dataTypeLower)) return true;
    
    // Numeric fields should use number type
    if ((fieldNameLower.includes('age') || fieldNameLower.includes('weight') || 
         fieldNameLower.includes('height')) && dataTypeLower === 'number') return true;

    return true; // Default to true if no specific pattern detected
  }

  /**
   * Analyze overall organization structure
   */
  private analyzeOrganization(crfSpec: CRFSpecification) {
    const forms = crfSpec.forms || [];
    
    return {
      totalForms: forms.length,
      formsWithDescription: forms.filter(f => f.formDescription).length,
      formsWithSchedule: forms.filter(f => f.visitSchedule && f.visitSchedule.length > 0).length,
      avgFieldsPerForm: forms.length > 0 ? 
        Math.round(forms.reduce((sum, f) => sum + (f.fields?.length || 0), 0) / forms.length) : 0,
      organizationIssues: this.identifyOrganizationIssues(forms)
    };
  }

  /**
   * Identify specific organization issues
   */
  private identifyOrganizationIssues(forms: CRFForm[]): string[] {
    const issues: string[] = [];

    if (forms.length === 0) {
      issues.push('No forms defined in CRF specification');
      return issues;
    }

    // Check for forms without names
    const unnamedForms = forms.filter(f => !f.formName).length;
    if (unnamedForms > 0) {
      issues.push(`${unnamedForms} forms missing names`);
    }

    // Check for forms without fields
    const emptyForms = forms.filter(f => !f.fields || f.fields.length === 0).length;
    if (emptyForms > 0) {
      issues.push(`${emptyForms} forms have no fields defined`);
    }

    // Check for very large forms
    const largeForms = forms.filter(f => f.fields && f.fields.length > 25).length;
    if (largeForms > 0) {
      issues.push(`${largeForms} forms may be too large (>25 fields) for efficient data entry`);
    }

    return issues;
  }

  /**
   * Analyze field characteristics across all forms
   */
  private analyzeFields(crfSpec: CRFSpecification) {
    const allFields = (crfSpec.forms || []).flatMap(form => form.fields || []);
    
    return {
      totalFields: allFields.length,
      fieldsWithValidation: allFields.filter(f => f.validationRules).length,
      requiredFields: allFields.filter(f => f.required === true).length,
      fieldsWithControlledVocab: allFields.filter(f => f.controlledVocabulary && f.controlledVocabulary.length > 0).length,
      dataTypeDistribution: this.analyzeDataTypeDistribution(allFields),
      fieldIssues: this.identifyFieldIssues(allFields)
    };
  }

  /**
   * Analyze distribution of data types
   */
  private analyzeDataTypeDistribution(fields: CRFField[]) {
    const distribution: Record<string, number> = {};
    
    for (const field of fields) {
      const dataType = field.dataType || 'unknown';
      distribution[dataType] = (distribution[dataType] || 0) + 1;
    }

    return distribution;
  }

  /**
   * Identify field-level issues
   */
  private identifyFieldIssues(fields: CRFField[]): string[] {
    const issues: string[] = [];

    const unnamedFields = fields.filter(f => !f.fieldName).length;
    if (unnamedFields > 0) {
      issues.push(`${unnamedFields} fields missing names`);
    }

    const unTypedFields = fields.filter(f => !f.dataType).length;
    if (unTypedFields > 0) {
      issues.push(`${unTypedFields} fields missing data types`);
    }

    const fieldsWithoutLabels = fields.filter(f => !f.fieldLabel && !f.description).length;
    if (fieldsWithoutLabels > 0) {
      issues.push(`${fieldsWithoutLabels} fields missing labels or descriptions`);
    }

    return issues;
  }

  /**
   * Analyze navigation and user experience aspects
   */
  private analyzeNavigation(crfSpec: CRFSpecification) {
    const forms = crfSpec.forms || [];
    
    return {
      estimatedCompletionTime: this.estimateCompletionTime(forms),
      navigationComplexity: this.calculateNavigationComplexity(forms),
      userExperienceScore: this.calculateUserExperienceScore(forms),
      navigationIssues: this.identifyNavigationIssues(forms)
    };
  }

  /**
   * Estimate time to complete CRF
   */
  private estimateCompletionTime(forms: CRFForm[]): string {
    let totalMinutes = 0;

    for (const form of forms) {
      const fieldCount = form.fields?.length || 0;
      // Estimate 30 seconds per field on average
      totalMinutes += fieldCount * 0.5;
    }

    const hours = Math.floor(totalMinutes / 60);
    const minutes = Math.round(totalMinutes % 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  }

  /**
   * Calculate navigation complexity score
   */
  private calculateNavigationComplexity(forms: CRFForm[]): 'Low' | 'Medium' | 'High' {
    const totalFields = forms.reduce((sum, form) => sum + (form.fields?.length || 0), 0);
    const formCount = forms.length;

    if (totalFields < 50 && formCount < 10) return 'Low';
    if (totalFields < 150 && formCount < 25) return 'Medium';
    return 'High';
  }

  /**
   * Calculate user experience score
   */
  private calculateUserExperienceScore(forms: CRFForm[]): number {
    let uxScore = 0;
    let totalForms = forms.length;

    if (totalForms === 0) return 0;

    for (const form of forms) {
      let formUxScore = 0;

      // Form has clear description (25 points)
      if (form.formDescription) formUxScore += 25;

      // Reasonable field count (25 points)
      const fieldCount = form.fields?.length || 0;
      if (fieldCount >= 3 && fieldCount <= 20) formUxScore += 25;

      // Good use of controlled vocabularies (25 points)
      const fieldsWithVocab = form.fields?.filter(f => 
        f.controlledVocabulary && f.controlledVocabulary.length > 0
      ).length || 0;
      const vocabUsageRate = fieldCount > 0 ? fieldsWithVocab / fieldCount : 0;
      formUxScore += vocabUsageRate * 25;

      // Clear field labels (25 points)
      const fieldsWithLabels = form.fields?.filter(f => 
        f.fieldLabel || f.description
      ).length || 0;
      const labelRate = fieldCount > 0 ? fieldsWithLabels / fieldCount : 0;
      formUxScore += labelRate * 25;

      uxScore += formUxScore;
    }

    return Math.round(uxScore / totalForms);
  }

  /**
   * Identify navigation-related issues
   */
  private identifyNavigationIssues(forms: CRFForm[]): string[] {
    const issues: string[] = [];

    // Check for very long forms
    const longForms = forms.filter(f => (f.fields?.length || 0) > 30);
    if (longForms.length > 0) {
      issues.push(`${longForms.length} forms have >30 fields, may impact user experience`);
    }

    // Check for forms without descriptions
    const formsWithoutDesc = forms.filter(f => !f.formDescription);
    if (formsWithoutDesc.length > 0) {
      issues.push(`${formsWithoutDesc.length} forms lack descriptions to guide users`);
    }

    // Check overall complexity
    const totalFields = forms.reduce((sum, f) => sum + (f.fields?.length || 0), 0);
    if (totalFields > 200) {
      issues.push('CRF may be too complex with >200 total fields');
    }

    return issues;
  }

  /**
   * Generate structural improvement recommendations
   */
  private generateStructuralRecommendations(
    scoring: StructuralScoring, 
    crfSpec: CRFSpecification
  ): string[] {
    const recommendations: string[] = [];

    // Completeness recommendations
    if (scoring.completenessScore < 70) {
      recommendations.push(
        'Improve CRF completeness by adding missing field descriptions, data types, and validation rules'
      );
    }

    // Consistency recommendations
    if (scoring.consistencyScore < 80) {
      recommendations.push(
        'Standardize field naming conventions and data types across similar fields in different forms'
      );
    }

    // Organization recommendations
    if (scoring.organizationScore < 75) {
      recommendations.push(
        'Reorganize forms to follow logical clinical workflow and group related fields together'
      );
    }

    // Efficiency recommendations
    if (scoring.efficiencyScore < 70) {
      recommendations.push(
        'Optimize data entry efficiency by using controlled vocabularies and appropriate field types'
      );
    }

    // Specific recommendations based on form analysis
    const forms = crfSpec.forms || [];
    const avgFieldsPerForm = forms.length > 0 ? 
      forms.reduce((sum, f) => sum + (f.fields?.length || 0), 0) / forms.length : 0;

    if (avgFieldsPerForm > 20) {
      recommendations.push(
        'Consider splitting large forms (>20 fields) into smaller, more manageable sections'
      );
    }

    if (avgFieldsPerForm < 5) {
      recommendations.push(
        'Consider consolidating very small forms to reduce navigation overhead'
      );
    }

    return recommendations;
  }
}

export const crfStructureAnalyzer = new CRFStructureAnalyzer();