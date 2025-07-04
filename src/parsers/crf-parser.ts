import { pdfExtractor } from './pdf-extractor';
import { createModuleLogger, logInfo, logWarn } from '../utils/logger';
import { CRFSpecification, CRFField, FieldValidation, CDISCMapping } from '../types';

const logger = createModuleLogger('crf-parser');

export interface CRFForm {
  name: string;
  fields: CRFFieldInfo[];
  visit?: string;
  timing?: string;
}

export interface CRFFieldInfo {
  name: string;
  label: string;
  type: string;
  required: boolean;
  format?: string;
  length?: number;
  codelist?: string[];
  units?: string;
  normalRange?: { low: number; high: number; unit: string };
}

export class CRFParser {
  /**
   * Parse CRF from PDF file
   */
  async parseFromPDF(filePath: string): Promise<string> {
    logInfo('Parsing CRF from PDF', { filePath });
    
    const extraction = await pdfExtractor.extractFromFile(filePath);
    const cleanedText = pdfExtractor.cleanText(extraction.text);
    
    // Extract tables which often contain CRF specifications
    const tables = pdfExtractor.extractTables(extraction.text);
    logInfo('Extracted tables from CRF', { tableCount: tables.length });
    
    return cleanedText;
  }
  
  /**
   * Parse CRF specifications from text
   */
  parseFromText(text: string): CRFSpecification[] {
    const forms = this.extractForms(text);
    const specifications: CRFSpecification[] = [];
    
    forms.forEach((form, index) => {
      specifications.push({
        formName: form.name,
        formOID: this.generateOID(form.name, index),
        fields: this.convertToFields(form.fields),
        version: '1.0',
        lastUpdated: new Date(),
      });
    });
    
    return specifications;
  }
  
  /**
   * Extract forms from CRF text
   */
  extractForms(text: string): CRFForm[] {
    const forms: CRFForm[] = [];
    const sections = this.splitIntoFormSections(text);
    
    sections.forEach(section => {
      const form = this.parseFormSection(section);
      if (form && form.fields.length > 0) {
        forms.push(form);
      }
    });
    
    // If no forms found, try alternative parsing
    if (forms.length === 0) {
      logWarn('No forms found using section parsing, trying alternative method');
      const alternativeForms = this.parseAlternativeFormat(text);
      forms.push(...alternativeForms);
    }
    
    return forms;
  }
  
  /**
   * Split text into form sections
   */
  private splitIntoFormSections(text: string): string[] {
    const sections: string[] = [];
    
    // Common CRF form headers
    const formPatterns = [
      /^(?:CRF\s*)?Form\s*:?\s*(.+)$/im,
      /^(?:\d+\.?\s*)?([A-Z][^:]+)\s+Form$/im,
      /^(?:\d+\.?\s*)?([A-Z][^:]+)\s+CRF$/im,
      /^Page\s*:?\s*(.+)$/im,
    ];
    
    const lines = text.split('\n');
    let currentSection = '';
    let inForm = false;
    
    for (const line of lines) {
      const isFormHeader = formPatterns.some(pattern => pattern.test(line));
      
      if (isFormHeader) {
        if (currentSection) {
          sections.push(currentSection);
        }
        currentSection = line + '\n';
        inForm = true;
      } else if (inForm) {
        currentSection += line + '\n';
      }
    }
    
    // Don't forget the last section
    if (currentSection) {
      sections.push(currentSection);
    }
    
    return sections;
  }
  
  /**
   * Parse a form section
   */
  private parseFormSection(section: string): CRFForm | null {
    const lines = section.split('\n');
    const formName = this.extractFormName(lines[0]);
    
    if (!formName) {
      return null;
    }
    
    const fields = this.extractFields(section);
    
    return {
      name: formName,
      fields,
      visit: this.extractVisit(section),
      timing: this.extractTiming(section),
    };
  }
  
  /**
   * Extract form name
   */
  private extractFormName(headerLine: string): string {
    const patterns = [
      /Form\s*:?\s*(.+)$/i,
      /([A-Z][^:]+)\s+Form$/i,
      /([A-Z][^:]+)\s+CRF$/i,
      /Page\s*:?\s*(.+)$/i,
    ];
    
    for (const pattern of patterns) {
      const match = headerLine.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }
    
    return '';
  }
  
  /**
   * Extract fields from form section
   */
  private extractFields(section: string): CRFFieldInfo[] {
    const fields: CRFFieldInfo[] = [];
    const lines = section.split('\n');
    
    // Look for field definitions
    const fieldPatterns = [
      /^([A-Z][A-Z0-9_]+)\s+(.+?)\s+(Text|Number|Date|Select|Checkbox|YesNo)/i,
      /^(?:\d+\.?\s*)?([^\s]+)\s+\[([^\]]+)\]/,
      /^Variable:\s*([^\s]+)\s+Label:\s*(.+)$/i,
    ];
    
    for (const line of lines) {
      for (const pattern of fieldPatterns) {
        const match = line.match(pattern);
        if (match) {
          fields.push(this.parseFieldDefinition(line));
          break;
        }
      }
    }
    
    // Try table format
    if (fields.length === 0) {
      const tableFields = this.parseTableFormat(section);
      fields.push(...tableFields);
    }
    
    return fields;
  }
  
  /**
   * Parse field definition from line
   */
  private parseFieldDefinition(line: string): CRFFieldInfo {
    // Default field
    const field: CRFFieldInfo = {
      name: '',
      label: '',
      type: 'text',
      required: false,
    };
    
    // Try different patterns
    const patterns = {
      standard: /^([A-Z][A-Z0-9_]+)\s+(.+?)\s+(Text|Number|Date|Select|Checkbox|YesNo)(?:\s+\[(.+)\])?/i,
      labeled: /^Variable:\s*([^\s]+)\s+Label:\s*(.+?)(?:\s+Type:\s*(\w+))?$/i,
      bracketed: /^([^\s]+)\s+\[([^\]]+)\](?:\s+(\w+))?/,
    };
    
    for (const [name, pattern] of Object.entries(patterns)) {
      const match = line.match(pattern);
      if (match) {
        field.name = match[1].trim();
        field.label = match[2].trim();
        if (match[3]) {
          field.type = this.normalizeFieldType(match[3]);
        }
        if (match[4]) {
          // Additional info in brackets
          this.parseFieldAttributes(match[4], field);
        }
        break;
      }
    }
    
    // Check if required
    if (line.includes('Required') || line.includes('Mandatory') || line.includes('*')) {
      field.required = true;
    }
    
    return field;
  }
  
  /**
   * Parse table format CRFs
   */
  private parseTableFormat(section: string): CRFFieldInfo[] {
    const fields: CRFFieldInfo[] = [];
    const lines = section.split('\n');
    
    // Find header row
    let headerIndex = -1;
    const headerPatterns = [
      /Variable.*Label.*Type/i,
      /Field.*Description.*Format/i,
      /Name.*Label.*Data.*Type/i,
    ];
    
    for (let i = 0; i < lines.length; i++) {
      if (headerPatterns.some(p => p.test(lines[i]))) {
        headerIndex = i;
        break;
      }
    }
    
    if (headerIndex === -1) {
      return fields;
    }
    
    // Parse data rows
    for (let i = headerIndex + 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || line.startsWith('---')) continue;
      
      // Simple column splitting (could be improved with proper CSV parsing)
      const columns = line.split(/\s{2,}|\t/);
      
      if (columns.length >= 2) {
        fields.push({
          name: columns[0].trim(),
          label: columns[1].trim(),
          type: columns[2] ? this.normalizeFieldType(columns[2]) : 'text',
          required: line.includes('*') || line.includes('Required'),
        });
      }
    }
    
    return fields;
  }
  
  /**
   * Parse alternative CRF format
   */
  private parseAlternativeFormat(text: string): CRFForm[] {
    const forms: CRFForm[] = [];
    
    // Look for common clinical forms
    const commonForms = [
      { name: 'Demographics', keywords: ['age', 'sex', 'gender', 'race', 'ethnicity'] },
      { name: 'Medical History', keywords: ['medical', 'history', 'diagnosis', 'condition'] },
      { name: 'Vital Signs', keywords: ['blood pressure', 'heart rate', 'temperature', 'weight'] },
      { name: 'Laboratory', keywords: ['lab', 'chemistry', 'hematology', 'urinalysis'] },
      { name: 'Adverse Events', keywords: ['adverse', 'event', 'ae', 'sae'] },
      { name: 'Concomitant Medications', keywords: ['medication', 'drug', 'conmed'] },
    ];
    
    for (const formDef of commonForms) {
      const hasForm = formDef.keywords.some(keyword => 
        new RegExp(keyword, 'i').test(text)
      );
      
      if (hasForm) {
        forms.push({
          name: formDef.name,
          fields: this.getStandardFields(formDef.name),
        });
      }
    }
    
    return forms;
  }
  
  /**
   * Get standard fields for common forms
   */
  private getStandardFields(formName: string): CRFFieldInfo[] {
    const standardFields: Record<string, CRFFieldInfo[]> = {
      'Demographics': [
        { name: 'SUBJID', label: 'Subject ID', type: 'text', required: true },
        { name: 'AGE', label: 'Age', type: 'number', required: true },
        { name: 'SEX', label: 'Sex', type: 'select', required: true, codelist: ['M', 'F'] },
        { name: 'RACE', label: 'Race', type: 'select', required: true },
        { name: 'ETHNIC', label: 'Ethnicity', type: 'select', required: true },
      ],
      'Vital Signs': [
        { name: 'VSDAT', label: 'Date', type: 'date', required: true },
        { name: 'SYSTBP', label: 'Systolic BP', type: 'number', required: true, units: 'mmHg' },
        { name: 'DIABP', label: 'Diastolic BP', type: 'number', required: true, units: 'mmHg' },
        { name: 'HR', label: 'Heart Rate', type: 'number', required: true, units: 'bpm' },
        { name: 'TEMP', label: 'Temperature', type: 'number', required: false, units: '°C' },
      ],
      'Adverse Events': [
        { name: 'AETERM', label: 'AE Term', type: 'text', required: true },
        { name: 'AESTDAT', label: 'Start Date', type: 'date', required: true },
        { name: 'AEENDAT', label: 'End Date', type: 'date', required: false },
        { name: 'AESEV', label: 'Severity', type: 'select', required: true, codelist: ['Mild', 'Moderate', 'Severe'] },
        { name: 'AEREL', label: 'Relationship', type: 'select', required: true },
      ],
    };
    
    return standardFields[formName] || [];
  }
  
  /**
   * Convert field info to CRF field
   */
  private convertToFields(fieldInfos: CRFFieldInfo[]): CRFField[] {
    return fieldInfos.map((info, index) => {
      const field: CRFField = {
        fieldName: info.name,
        fieldOID: this.generateOID(info.name, index),
        fieldType: this.mapFieldType(info.type),
        required: info.required,
      };
      
      // Add validation
      if (info.codelist) {
        field.validation = {
          type: 'list',
          value: info.codelist,
          errorMessage: `Value must be one of: ${info.codelist.join(', ')}`,
        };
      }
      
      // Add CDISC mapping
      field.cdiscMapping = this.generateCDISCMapping(info.name);
      
      // Add normal range for lab values
      if (info.normalRange) {
        field.normalRange = info.normalRange;
      }
      
      return field;
    });
  }
  
  /**
   * Normalize field type
   */
  private normalizeFieldType(type: string): string {
    const normalized = type.toLowerCase();
    
    if (normalized.includes('text') || normalized.includes('char')) return 'text';
    if (normalized.includes('num') || normalized.includes('int') || normalized.includes('float')) return 'number';
    if (normalized.includes('date')) return 'date';
    if (normalized.includes('select') || normalized.includes('choice')) return 'select';
    if (normalized.includes('check')) return 'checkbox';
    if (normalized.includes('yes') || normalized.includes('no')) return 'select';
    
    return 'text';
  }
  
  /**
   * Map field type to CRF field type
   */
  private mapFieldType(type: string): CRFField['fieldType'] {
    const typeMap: Record<string, CRFField['fieldType']> = {
      'text': 'text',
      'number': 'number',
      'date': 'date',
      'select': 'select',
      'checkbox': 'checkbox',
      'yesno': 'radio',
    };
    
    return typeMap[type] || 'text';
  }
  
  /**
   * Generate OID for form or field
   */
  private generateOID(name: string, index: number): string {
    const cleanName = name.replace(/[^A-Z0-9]/gi, '').toUpperCase();
    return `OID_${cleanName}_${index + 1}`;
  }
  
  /**
   * Generate CDISC mapping based on field name
   */
  private generateCDISCMapping(fieldName: string): CDISCMapping | undefined {
    // Common CDISC mappings
    const mappings: Record<string, CDISCMapping> = {
      'SUBJID': { domain: 'DM', variable: 'SUBJID' },
      'AGE': { domain: 'DM', variable: 'AGE' },
      'SEX': { domain: 'DM', variable: 'SEX' },
      'RACE': { domain: 'DM', variable: 'RACE' },
      'ETHNIC': { domain: 'DM', variable: 'ETHNIC' },
      'VSDAT': { domain: 'VS', variable: 'VSDAT' },
      'SYSTBP': { domain: 'VS', variable: 'VSORRES', codelist: 'VSTEST' },
      'DIABP': { domain: 'VS', variable: 'VSORRES', codelist: 'VSTEST' },
      'HR': { domain: 'VS', variable: 'VSORRES', codelist: 'VSTEST' },
      'AETERM': { domain: 'AE', variable: 'AETERM' },
      'AESTDAT': { domain: 'AE', variable: 'AESTDTC' },
      'AEENDAT': { domain: 'AE', variable: 'AEENDTC' },
    };
    
    return mappings[fieldName.toUpperCase()];
  }
  
  /**
   * Parse field attributes from bracketed text
   */
  private parseFieldAttributes(attributes: string, field: CRFFieldInfo): void {
    // Parse format
    const formatMatch = attributes.match(/format:\s*([^,;]+)/i);
    if (formatMatch) {
      field.format = formatMatch[1].trim();
    }
    
    // Parse length
    const lengthMatch = attributes.match(/(?:length|max):\s*(\d+)/i);
    if (lengthMatch) {
      field.length = parseInt(lengthMatch[1]);
    }
    
    // Parse units
    const unitsMatch = attributes.match(/units?:\s*([^,;]+)/i);
    if (unitsMatch) {
      field.units = unitsMatch[1].trim();
    }
  }
  
  /**
   * Extract visit information
   */
  private extractVisit(section: string): string | undefined {
    const visitMatch = section.match(/Visit\s*:?\s*([^\n]+)/i);
    return visitMatch ? visitMatch[1].trim() : undefined;
  }
  
  /**
   * Extract timing information
   */
  private extractTiming(section: string): string | undefined {
    const timingMatch = section.match(/(?:Timing|Timepoint)\s*:?\s*([^\n]+)/i);
    return timingMatch ? timingMatch[1].trim() : undefined;
  }
}

// Export singleton instance
export const crfParser = new CRFParser();