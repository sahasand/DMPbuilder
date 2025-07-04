import { 
  StudyProtocol, 
  CRFSpecification, 
  CRFField, 
  FieldValidation,
  NormalRange 
} from '../types';
import { createModuleLogger, logInfo, logWarn } from '../utils/logger';
import { ClinicalValidationError, ValidationError } from '../utils/error-handler';

const logger = createModuleLogger('data-validator');

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  summary: ValidationSummary;
}

export interface ValidationIssue {
  field?: string;
  form?: string;
  type: 'error' | 'warning';
  message: string;
  code: string;
  details?: any;
}

export interface ValidationSummary {
  totalForms: number;
  totalFields: number;
  validatedFields: number;
  cdiscMappedFields: number;
  issuesFound: number;
  validationScore: number; // 0-100
}

export class DataValidator {
  private readonly labNormalRanges: Record<string, NormalRange> = {
    // Hematology
    'HCT': { low: 35, high: 50, unit: '%' },
    'PLT': { low: 130, high: 400, unit: '10^3/µL' },
    'RBC': { low: 4.0, high: 6.0, unit: '10^6/µL' },
    'WBC': { low: 4.0, high: 11.0, unit: '10^3/µL' },
    'ANC': { low: 2.0, high: 7.0, unit: '10^3/µL' },
    'ALC': { low: 1.0, high: 3.0, unit: '10^3/µL' },
    
    // Chemistry
    'ALT': { low: 10, high: 50, unit: 'U/L' },
    'AST': { low: 10, high: 40, unit: 'U/L' },
    'TBIL': { low: 0.2, high: 1.2, unit: 'mg/dL' },
    'CREAT': { low: 0.6, high: 1.2, unit: 'mg/dL' },
    'BUN': { low: 7, high: 20, unit: 'mg/dL' },
    'GLUC': { low: 70, high: 100, unit: 'mg/dL' },
    
    // Vital Signs
    'SYSBP': { low: 90, high: 140, unit: 'mmHg' },
    'DIABP': { low: 60, high: 90, unit: 'mmHg' },
    'HR': { low: 60, high: 100, unit: 'bpm' },
    'TEMP': { low: 36.0, high: 37.5, unit: '°C' },
  };
  
  private readonly requiredCDISCDomains = ['DM', 'VS', 'AE', 'CM', 'MH', 'LB'];
  
  /**
   * Validate study protocol data
   */
  validateProtocol(protocol: StudyProtocol): ValidationResult {
    logInfo('Validating protocol data', {
      studyTitle: protocol.studyTitle,
      protocolNumber: protocol.protocolNumber,
    });
    
    const errors: ValidationIssue[] = [];
    const warnings: ValidationIssue[] = [];
    
    // Validate required fields
    if (!protocol.studyTitle) {
      errors.push(this.createIssue('error', 'PROTO_001', 'Study title is required'));
    }
    
    if (!protocol.protocolNumber) {
      errors.push(this.createIssue('error', 'PROTO_002', 'Protocol number is required'));
    }
    
    if (!protocol.studyPhase) {
      errors.push(this.createIssue('error', 'PROTO_003', 'Study phase is required'));
    } else if (!['1', '2', '3', '4'].includes(protocol.studyPhase)) {
      warnings.push(this.createIssue('warning', 'PROTO_004', 
        `Unusual study phase: ${protocol.studyPhase}`));
    }
    
    if (!protocol.sponsor) {
      errors.push(this.createIssue('error', 'PROTO_005', 'Sponsor is required'));
    }
    
    // Validate objectives and endpoints
    if (!protocol.objectives.primary || protocol.objectives.primary.length === 0) {
      errors.push(this.createIssue('error', 'PROTO_006', 
        'At least one primary objective is required'));
    }
    
    if (!protocol.endpoints.primary || protocol.endpoints.primary.length === 0) {
      errors.push(this.createIssue('error', 'PROTO_007', 
        'At least one primary endpoint is required'));
    }
    
    // Validate population
    if (!protocol.population.targetEnrollment || protocol.population.targetEnrollment <= 0) {
      errors.push(this.createIssue('error', 'PROTO_008', 
        'Target enrollment must be greater than 0'));
    }
    
    // Validate inclusion/exclusion criteria
    if (!protocol.inclusionCriteria || protocol.inclusionCriteria.length === 0) {
      errors.push(this.createIssue('error', 'PROTO_009', 
        'Inclusion criteria are required'));
    }
    
    if (!protocol.exclusionCriteria || protocol.exclusionCriteria.length === 0) {
      errors.push(this.createIssue('error', 'PROTO_010', 
        'Exclusion criteria are required'));
    }
    
    return this.createResult(errors, warnings, { totalFields: 10 });
  }
  
  /**
   * Validate CRF specifications
   */
  validateCRFs(crfs: CRFSpecification[]): ValidationResult {
    logInfo('Validating CRF specifications', { formCount: crfs.length });
    
    const errors: ValidationIssue[] = [];
    const warnings: ValidationIssue[] = [];
    let totalFields = 0;
    let validatedFields = 0;
    let cdiscMappedFields = 0;
    
    // Check for required forms
    const formNames = crfs.map(crf => crf.formName.toLowerCase());
    const requiredForms = ['demographics', 'adverse events', 'medical history'];
    
    requiredForms.forEach(required => {
      if (!formNames.some(name => name.includes(required))) {
        errors.push(this.createIssue('error', 'CRF_001', 
          `Required form missing: ${required}`, undefined, required));
      }
    });
    
    // Validate each CRF
    crfs.forEach(crf => {
      const crfIssues = this.validateCRFForm(crf);
      errors.push(...crfIssues.errors);
      warnings.push(...crfIssues.warnings);
      
      totalFields += crf.fields.length;
      validatedFields += crf.fields.filter(f => f.validation).length;
      cdiscMappedFields += crf.fields.filter(f => f.cdiscMapping).length;
    });
    
    // Check CDISC coverage
    const cdiscCoverage = totalFields > 0 ? (cdiscMappedFields / totalFields) * 100 : 0;
    if (cdiscCoverage < 50) {
      warnings.push(this.createIssue('warning', 'CRF_002', 
        `Low CDISC mapping coverage: ${cdiscCoverage.toFixed(1)}%`));
    }
    
    return this.createResult(errors, warnings, {
      totalForms: crfs.length,
      totalFields,
      validatedFields,
      cdiscMappedFields,
    });
  }
  
  /**
   * Validate individual CRF form
   */
  private validateCRFForm(crf: CRFSpecification): { errors: ValidationIssue[], warnings: ValidationIssue[] } {
    const errors: ValidationIssue[] = [];
    const warnings: ValidationIssue[] = [];
    
    // Validate form metadata
    if (!crf.formName) {
      errors.push(this.createIssue('error', 'CRF_FORM_001', 
        'Form name is required', crf.formOID));
    }
    
    if (!crf.formOID) {
      warnings.push(this.createIssue('warning', 'CRF_FORM_002', 
        'Form OID is missing', crf.formName));
    }
    
    // Validate fields
    if (!crf.fields || crf.fields.length === 0) {
      errors.push(this.createIssue('error', 'CRF_FORM_003', 
        'Form has no fields defined', crf.formName));
    } else {
      crf.fields.forEach(field => {
        const fieldIssues = this.validateCRFField(field, crf.formName);
        errors.push(...fieldIssues.errors);
        warnings.push(...fieldIssues.warnings);
      });
    }
    
    // Check for duplicate field names
    const fieldNames = crf.fields.map(f => f.fieldName);
    const duplicates = fieldNames.filter((name, index) => fieldNames.indexOf(name) !== index);
    if (duplicates.length > 0) {
      errors.push(this.createIssue('error', 'CRF_FORM_004', 
        `Duplicate field names: ${duplicates.join(', ')}`, crf.formName));
    }
    
    return { errors, warnings };
  }
  
  /**
   * Validate individual CRF field
   */
  private validateCRFField(
    field: CRFField, 
    formName: string
  ): { errors: ValidationIssue[], warnings: ValidationIssue[] } {
    const errors: ValidationIssue[] = [];
    const warnings: ValidationIssue[] = [];
    
    // Basic field validation
    if (!field.fieldName) {
      errors.push(this.createIssue('error', 'CRF_FIELD_001', 
        'Field name is required', formName));
    }
    
    if (!field.fieldType) {
      errors.push(this.createIssue('error', 'CRF_FIELD_002', 
        'Field type is required', formName, field.fieldName));
    }
    
    // Validate field type
    const validTypes = ['text', 'number', 'date', 'select', 'checkbox', 'radio'];
    if (field.fieldType && !validTypes.includes(field.fieldType)) {
      errors.push(this.createIssue('error', 'CRF_FIELD_003', 
        `Invalid field type: ${field.fieldType}`, formName, field.fieldName));
    }
    
    // Validate field validation rules
    if (field.validation) {
      const validationIssues = this.validateFieldValidation(field.validation, field, formName);
      errors.push(...validationIssues.errors);
      warnings.push(...validationIssues.warnings);
    }
    
    // Validate normal ranges for lab fields
    if (field.normalRange && field.fieldType === 'number') {
      const rangeIssues = this.validateNormalRange(field.normalRange, field, formName);
      errors.push(...rangeIssues.errors);
      warnings.push(...rangeIssues.warnings);
    }
    
    // Validate CDISC mapping
    if (field.cdiscMapping) {
      const cdiscIssues = this.validateCDISCMapping(field.cdiscMapping, field, formName);
      errors.push(...cdiscIssues.errors);
      warnings.push(...cdiscIssues.warnings);
    }
    
    return { errors, warnings };
  }
  
  /**
   * Validate field validation rules
   */
  private validateFieldValidation(
    validation: FieldValidation,
    field: CRFField,
    formName: string
  ): { errors: ValidationIssue[], warnings: ValidationIssue[] } {
    const errors: ValidationIssue[] = [];
    const warnings: ValidationIssue[] = [];
    
    if (!validation.type) {
      errors.push(this.createIssue('error', 'VALIDATION_001', 
        'Validation type is required', formName, field.fieldName));
    }
    
    // Type-specific validation
    switch (validation.type) {
      case 'range':
        if (!Array.isArray(validation.value) || validation.value.length !== 2) {
          errors.push(this.createIssue('error', 'VALIDATION_002', 
            'Range validation must have [min, max] values', formName, field.fieldName));
        }
        break;
        
      case 'regex':
        if (typeof validation.value !== 'string') {
          errors.push(this.createIssue('error', 'VALIDATION_003', 
            'Regex validation must have string pattern', formName, field.fieldName));
        } else {
          try {
            new RegExp(validation.value);
          } catch {
            errors.push(this.createIssue('error', 'VALIDATION_004', 
              'Invalid regex pattern', formName, field.fieldName));
          }
        }
        break;
        
      case 'list':
        if (!Array.isArray(validation.value) || validation.value.length === 0) {
          errors.push(this.createIssue('error', 'VALIDATION_005', 
            'List validation must have at least one value', formName, field.fieldName));
        }
        break;
    }
    
    if (!validation.errorMessage) {
      warnings.push(this.createIssue('warning', 'VALIDATION_006', 
        'Validation error message is missing', formName, field.fieldName));
    }
    
    return { errors, warnings };
  }
  
  /**
   * Validate normal range
   */
  private validateNormalRange(
    range: NormalRange,
    field: CRFField,
    formName: string
  ): { errors: ValidationIssue[], warnings: ValidationIssue[] } {
    const errors: ValidationIssue[] = [];
    const warnings: ValidationIssue[] = [];
    
    if (range.low >= range.high) {
      errors.push(this.createIssue('error', 'RANGE_001', 
        'Normal range low must be less than high', formName, field.fieldName));
    }
    
    if (!range.unit) {
      warnings.push(this.createIssue('warning', 'RANGE_002', 
        'Normal range unit is missing', formName, field.fieldName));
    }
    
    // Check against standard ranges if applicable
    const standardRange = this.labNormalRanges[field.fieldName.toUpperCase()];
    if (standardRange) {
      if (Math.abs(range.low - standardRange.low) > 0.1 || 
          Math.abs(range.high - standardRange.high) > 0.1) {
        warnings.push(this.createIssue('warning', 'RANGE_003', 
          `Normal range differs from standard: ${standardRange.low}-${standardRange.high} ${standardRange.unit}`,
          formName, field.fieldName));
      }
    }
    
    return { errors, warnings };
  }
  
  /**
   * Validate CDISC mapping
   */
  private validateCDISCMapping(
    mapping: any,
    field: CRFField,
    formName: string
  ): { errors: ValidationIssue[], warnings: ValidationIssue[] } {
    const errors: ValidationIssue[] = [];
    const warnings: ValidationIssue[] = [];
    
    if (!mapping.domain) {
      errors.push(this.createIssue('error', 'CDISC_001', 
        'CDISC domain is required', formName, field.fieldName));
    } else if (!this.requiredCDISCDomains.includes(mapping.domain)) {
      warnings.push(this.createIssue('warning', 'CDISC_002', 
        `Uncommon CDISC domain: ${mapping.domain}`, formName, field.fieldName));
    }
    
    if (!mapping.variable) {
      errors.push(this.createIssue('error', 'CDISC_003', 
        'CDISC variable is required', formName, field.fieldName));
    }
    
    return { errors, warnings };
  }
  
  /**
   * Validate data integrity between protocol and CRFs
   */
  validateDataIntegrity(
    protocol: StudyProtocol,
    crfs: CRFSpecification[]
  ): ValidationResult {
    logInfo('Validating data integrity between protocol and CRFs');
    
    const errors: ValidationIssue[] = [];
    const warnings: ValidationIssue[] = [];
    
    // Check if all endpoints have corresponding CRF fields
    const allEndpoints = [
      ...protocol.endpoints.primary,
      ...protocol.endpoints.secondary,
      ...(protocol.endpoints.exploratory || [])
    ];
    
    const crfFieldNames = crfs.flatMap(crf => 
      crf.fields.map(f => f.fieldName.toLowerCase())
    );
    
    allEndpoints.forEach(endpoint => {
      // Simple check - in reality would need more sophisticated mapping
      const hasRelatedField = crfFieldNames.some(field => 
        endpoint.name.toLowerCase().includes(field) ||
        field.includes(endpoint.name.toLowerCase())
      );
      
      if (!hasRelatedField) {
        warnings.push(this.createIssue('warning', 'INTEGRITY_001', 
          `Endpoint "${endpoint.name}" may not have corresponding CRF field`));
      }
    });
    
    // Check visit schedule alignment
    if (protocol.visitSchedule && protocol.visitSchedule.length > 0) {
      const visitNames = protocol.visitSchedule.map(v => v.visitName.toLowerCase());
      const hasVisitFields = crfFieldNames.some(field => 
        field.includes('visit') || field.includes('vsdat')
      );
      
      if (!hasVisitFields) {
        warnings.push(this.createIssue('warning', 'INTEGRITY_002', 
          'No visit-related fields found in CRFs'));
      }
    }
    
    return this.createResult(errors, warnings, { totalFields: 0 });
  }
  
  /**
   * Create validation issue
   */
  private createIssue(
    type: 'error' | 'warning',
    code: string,
    message: string,
    form?: string,
    field?: string
  ): ValidationIssue {
    return {
      type,
      code,
      message,
      form,
      field,
    };
  }
  
  /**
   * Create validation result
   */
  private createResult(
    errors: ValidationIssue[],
    warnings: ValidationIssue[],
    stats: Partial<ValidationSummary>
  ): ValidationResult {
    const totalIssues = errors.length + warnings.length;
    const totalChecks = stats.totalFields || 1;
    const validationScore = Math.max(0, 100 - (totalIssues / totalChecks * 100));
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      summary: {
        totalForms: stats.totalForms || 0,
        totalFields: stats.totalFields || 0,
        validatedFields: stats.validatedFields || 0,
        cdiscMappedFields: stats.cdiscMappedFields || 0,
        issuesFound: totalIssues,
        validationScore,
      },
    };
  }
  
  /**
   * Generate validation report
   */
  generateValidationReport(result: ValidationResult): string {
    let report = '# Data Validation Report\n\n';
    
    report += `## Summary\n`;
    report += `- **Validation Status**: ${result.isValid ? 'PASSED' : 'FAILED'}\n`;
    report += `- **Validation Score**: ${result.summary.validationScore.toFixed(1)}%\n`;
    report += `- **Total Forms**: ${result.summary.totalForms}\n`;
    report += `- **Total Fields**: ${result.summary.totalFields}\n`;
    report += `- **Validated Fields**: ${result.summary.validatedFields}\n`;
    report += `- **CDISC Mapped**: ${result.summary.cdiscMappedFields}\n`;
    report += `- **Issues Found**: ${result.summary.issuesFound}\n\n`;
    
    if (result.errors.length > 0) {
      report += `## Errors (${result.errors.length})\n`;
      result.errors.forEach(error => {
        report += `- **[${error.code}]** ${error.message}`;
        if (error.form) report += ` (Form: ${error.form}`;
        if (error.field) report += `, Field: ${error.field}`;
        if (error.form) report += ')';
        report += '\n';
      });
      report += '\n';
    }
    
    if (result.warnings.length > 0) {
      report += `## Warnings (${result.warnings.length})\n`;
      result.warnings.forEach(warning => {
        report += `- **[${warning.code}]** ${warning.message}`;
        if (warning.form) report += ` (Form: ${warning.form}`;
        if (warning.field) report += `, Field: ${warning.field}`;
        if (warning.form) report += ')';
        report += '\n';
      });
    }
    
    return report;
  }
}

// Export singleton instance
export const dataValidator = new DataValidator();