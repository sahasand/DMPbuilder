import { StudyProtocol, CRFSpecification, Objective, StudyDesign, VisitSchedule, Endpoint } from '../types';
import { createModuleLogger } from './logger';

const logger = createModuleLogger('api-response-validator');

export interface ValidationResult<T> {
  isValid: boolean;
  data?: T;
  errors: string[];
  warnings: string[];
}

/**
 * Validates and sanitizes API responses to ensure they match expected formats
 */
export class APIResponseValidator {
  /**
   * Detects if response is plain text instead of JSON
   */
  static isPlainTextResponse(text: string): boolean {
    if (!text || typeof text !== 'string') return false;
    
    const trimmed = text.trim();
    
    // First check if it starts with JSON brackets/braces
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      return false;
    }
    
    // Check for common plain text response patterns
    const plainTextIndicators = [
      'here is the structured',
      'here\'s the structured',
      'here is the extracted',
      'here\'s the extracted',
      'the following is',
      'i\'ve extracted',
      'i have extracted',
      'based on the analysis',
      'after analyzing',
      'based on the provided',
      'from the protocol',
      'from the crf',
      'the study protocol',
      'analysis of the'
    ];
    
    const lowerText = text.toLowerCase().trim();
    
    // Check if any indicator appears in the first 200 characters
    const firstPart = lowerText.substring(0, 200);
    const hasIndicator = plainTextIndicators.some(indicator => 
      firstPart.includes(indicator)
    );
    
    // Also check if the response doesn't contain JSON-like structures
    const hasJsonStructure = text.includes('": "') || text.includes('": {') || text.includes('": [');
    
    return hasIndicator && !hasJsonStructure;
  }

  /**
   * Extracts JSON from various response formats
   */
  static extractJSON(text: string): string | null {
    if (!text || typeof text !== 'string') {
      logger.warn('No text provided for JSON extraction');
      return null;
    }

    logger.info('Attempting to extract JSON', {
      textLength: text.length,
      startsWithBrace: text.trim().startsWith('{'),
      startsWithBracket: text.trim().startsWith('['),
      containsCodeBlock: text.includes('```')
    });

    // Try to extract from code blocks first
    const codeBlockMatch = text.match(/```(?:json)?\n?([\s\S]*?)\n?```/);
    if (codeBlockMatch && codeBlockMatch[1]) {
      logger.info('Found JSON in code block');
      return codeBlockMatch[1].trim();
    }

    // Try to find complete JSON structures
    // First, find all potential JSON start/end positions
    const trimmed = text.trim();
    
    // If the entire text is already valid JSON
    if ((trimmed.startsWith('[') && trimmed.endsWith(']')) ||
        (trimmed.startsWith('{') && trimmed.endsWith('}'))) {
      logger.info('Entire text appears to be JSON');
      return trimmed;
    }

    // Look for JSON array
    let jsonStart = text.indexOf('[');
    if (jsonStart !== -1) {
      let bracketCount = 0;
      let inString = false;
      let escaped = false;
      
      for (let i = jsonStart; i < text.length; i++) {
        const char = text[i];
        
        if (!escaped) {
          if (char === '"' && !inString) {
            inString = true;
          } else if (char === '"' && inString) {
            inString = false;
          } else if (!inString) {
            if (char === '[') bracketCount++;
            else if (char === ']') {
              bracketCount--;
              if (bracketCount === 0) {
                const extracted = text.substring(jsonStart, i + 1);
                logger.info('Extracted JSON array', { length: extracted.length });
                return extracted;
              }
            }
          }
          
          escaped = char === '\\' && inString;
        } else {
          escaped = false;
        }
      }
    }

    // Look for JSON object
    jsonStart = text.indexOf('{');
    if (jsonStart !== -1) {
      let braceCount = 0;
      let inString = false;
      let escaped = false;
      
      for (let i = jsonStart; i < text.length; i++) {
        const char = text[i];
        
        if (!escaped) {
          if (char === '"' && !inString) {
            inString = true;
          } else if (char === '"' && inString) {
            inString = false;
          } else if (!inString) {
            if (char === '{') braceCount++;
            else if (char === '}') {
              braceCount--;
              if (braceCount === 0) {
                const extracted = text.substring(jsonStart, i + 1);
                logger.info('Extracted JSON object', { length: extracted.length });
                return extracted;
              }
            }
          }
          
          escaped = char === '\\' && inString;
        } else {
          escaped = false;
        }
      }
    }

    logger.warn('Could not extract valid JSON structure');
    return null;
  }

  /**
   * Validates StudyProtocol structure
   */
  static validateStudyProtocol(data: any): ValidationResult<StudyProtocol> {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!data || typeof data !== 'object') {
      errors.push('Protocol data must be an object');
      return { isValid: false, errors, warnings };
    }

    // Required fields
    if (!data.studyTitle || typeof data.studyTitle !== 'string') {
      errors.push('studyTitle is required and must be a string');
    }

    if (!data.protocolNumber || typeof data.protocolNumber !== 'string') {
      errors.push('protocolNumber is required and must be a string');
    }

    // Validate nested structures with defaults
    const protocol: StudyProtocol = {
      studyTitle: data.studyTitle || 'Unknown Study',
      protocolNumber: data.protocolNumber || 'UNKNOWN-001',
      studyPhase: data.studyPhase || data.phase || 'Phase 3',
      investigationalDrug: data.investigationalDrug || 'Not specified',
      sponsor: data.sponsor || data.sponsorName || 'Unknown Sponsor',
      indication: data.indication || 'Not specified',
      
      studyDesign: APIResponseValidator.validateStudyDesign(data.studyDesign || data.design),
      objectives: APIResponseValidator.validateObjectives(data.objectives),
      population: APIResponseValidator.validatePopulation(data.population),
      endpoints: APIResponseValidator.validateEndpoints(data.endpoints),
      visitSchedule: APIResponseValidator.validateVisitSchedule(data.visitSchedule),
      inclusionCriteria: Array.isArray(data.inclusionCriteria) ? data.inclusionCriteria : ['Not specified'],
      exclusionCriteria: Array.isArray(data.exclusionCriteria) ? data.exclusionCriteria : ['Not specified']
    };

    if (errors.length === 0 && !data.objectives) {
      warnings.push('No objectives found in protocol');
    }

    if (errors.length === 0 && !data.endpoints) {
      warnings.push('No endpoints found in protocol');
    }

    return {
      isValid: errors.length === 0,
      data: errors.length === 0 ? protocol : undefined,
      errors,
      warnings
    };
  }

  private static validateStudyDesign(design: any): StudyDesign {
    return {
      type: ['open-label', 'double-blind', 'single-blind', 'placebo-controlled'].includes(design?.type) 
        ? design.type 
        : 'open-label',
      duration: design?.duration || 'Not specified',
      numberOfArms: design?.numberOfArms || 1,
      description: design?.description || 'Study design not specified',
      parts: Array.isArray(design?.parts) ? design.parts : undefined
    };
  }

  private static validateObjectives(objectives: any): StudyProtocol['objectives'] {
    const defaultObjective: Objective = { 
      description: 'Not specified',
      endpoints: ['Not specified']
    };
    
    return {
      primary: Array.isArray(objectives?.primary) 
        ? objectives.primary.map((obj: any) => APIResponseValidator.validateObjective(obj))
        : [defaultObjective],
      secondary: Array.isArray(objectives?.secondary)
        ? objectives.secondary.map((obj: any) => APIResponseValidator.validateObjective(obj))
        : [],
      exploratory: Array.isArray(objectives?.exploratory)
        ? objectives.exploratory.map((obj: any) => APIResponseValidator.validateObjective(obj))
        : []
    };
  }

  private static validateObjective(obj: any): Objective {
    if (typeof obj === 'string') {
      return { 
        description: obj,
        endpoints: []
      };
    }
    
    return {
      description: obj?.description || 'Not specified',
      endpoints: Array.isArray(obj?.endpoints) ? obj.endpoints : []
    };
  }

  private static validateEndpoints(endpoints: any): StudyProtocol['endpoints'] {
    return {
      primary: Array.isArray(endpoints?.primary) 
        ? endpoints.primary.map((ep: any) => APIResponseValidator.validateEndpoint(ep))
        : [],
      secondary: Array.isArray(endpoints?.secondary) 
        ? endpoints.secondary.map((ep: any) => APIResponseValidator.validateEndpoint(ep))
        : [],
      exploratory: Array.isArray(endpoints?.exploratory) 
        ? endpoints.exploratory.map((ep: any) => APIResponseValidator.validateEndpoint(ep))
        : []
    };
  }

  private static validateEndpoint(endpoint: any): Endpoint {
    if (typeof endpoint === 'string') {
      return {
        name: endpoint,
        description: endpoint,
        timepoint: 'Not specified',
        method: 'Not specified'
      };
    }

    return {
      name: endpoint?.name || 'Not specified',
      description: endpoint?.description || 'Not specified',
      timepoint: endpoint?.timepoint || 'Not specified',
      method: endpoint?.method || 'Not specified',
      crfSource: endpoint?.crfSource
    };
  }

  private static validatePopulation(population: any): StudyProtocol['population'] {
    return {
      targetEnrollment: typeof population?.targetEnrollment === 'number' 
        ? population.targetEnrollment 
        : 100,
      ageRange: population?.ageRange || '18 years and above',
      gender: ['all', 'male', 'female'].includes(population?.gender) 
        ? population.gender 
        : 'all',
      condition: population?.condition || 'Not specified',
      keyInclusionCriteria: Array.isArray(population?.keyInclusionCriteria)
        ? population.keyInclusionCriteria
        : undefined,
      keyExclusionCriteria: Array.isArray(population?.keyExclusionCriteria)
        ? population.keyExclusionCriteria
        : undefined
    };
  }

  private static validateVisitSchedule(schedule: any): VisitSchedule[] {
    if (!Array.isArray(schedule)) {
      return [{
        visitName: 'Screening',
        visitNumber: 1,
        timepoint: 'Day -28 to -1',
        window: '± 0 days',
        procedures: []
      }];
    }

    return schedule.map((visit, index) => ({
      visitName: visit?.visitName || `Visit ${index + 1}`,
      visitNumber: visit?.visitNumber || index + 1,
      timepoint: visit?.timepoint || 'Not specified',
      window: visit?.window || '± 0 days',
      procedures: Array.isArray(visit?.procedures) ? visit.procedures : []
    }));
  }

  /**
   * Validates CRF specifications
   */
  static validateCRFSpecifications(data: any): ValidationResult<CRFSpecification[]> {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!data) {
      errors.push('CRF data is null or undefined');
      return { isValid: false, errors, warnings };
    }

    // Handle both array and single object
    const crfArray = Array.isArray(data) ? data : [data];
    
    const validatedCRFs: CRFSpecification[] = [];

    for (let i = 0; i < crfArray.length; i++) {
      const crf = crfArray[i];
      
      if (!crf || typeof crf !== 'object') {
        warnings.push(`CRF at index ${i} is not a valid object`);
        continue;
      }

      // Validate required fields
      if (!crf.formName || typeof crf.formName !== 'string') {
        warnings.push(`CRF at index ${i} missing formName`);
        crf.formName = `Form_${i + 1}`;
      }

      // Create validated CRF with defaults
      const validatedCRF: CRFSpecification = {
        formName: crf.formName,
        formOID: crf.formOID || `FORM_${crf.formName.toUpperCase().replace(/\s+/g, '_')}`,
        version: crf.version || '1.0',
        fields: APIResponseValidator.validateCRFFields(crf.fields, crf.formName),
        lastUpdated: crf.lastUpdated ? new Date(crf.lastUpdated) : new Date()
      };

      validatedCRFs.push(validatedCRF);
    }

    if (validatedCRFs.length === 0) {
      errors.push('No valid CRF specifications found');
    }

    return {
      isValid: errors.length === 0,
      data: errors.length === 0 ? validatedCRFs : undefined,
      errors,
      warnings
    };
  }

  private static validateCRFFields(fields: any, formName: string): CRFSpecification['fields'] {
    if (!Array.isArray(fields)) {
      return [{
        fieldName: 'DEFAULT_FIELD',
        fieldOID: 'DEFAULT_OID',
        fieldType: 'text',
        required: false,
        cdiscMapping: {
          domain: 'DM',
          variable: 'USUBJID'
        }
      }];
    }

    return fields.map((field, index) => ({
      fieldName: field?.fieldName || `Field_${index + 1}`,
      fieldOID: field?.fieldOID || `${formName}_FIELD_${index + 1}`,
      fieldType: field?.fieldType || 'text',
      required: field?.required === true,
      cdiscMapping: field?.cdiscMapping || {
        domain: 'DM',
        variable: 'UNKNOWN'
      },
      validation: field?.validation,
      codeList: field?.codeList
    }));
  }

  /**
   * Converts plain text response to structured data based on content
   */
  private static convertPlainTextToStructured(text: string, expectedType: 'protocol' | 'crf'): any {
    logger.info('Converting plain text response to structured data', { 
      type: expectedType,
      textLength: text.length,
      firstLine: text.split('\n')[0]?.substring(0, 100)
    });

    // First, try to find JSON embedded in the text
    const jsonMatch = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        logger.info('Found and parsed embedded JSON in plain text');
        return parsed;
      } catch (e) {
        logger.warn('Found JSON-like content but failed to parse', { error: e });
      }
    }

    if (expectedType === 'protocol') {
      // Enhanced protocol extraction with more patterns
      const protocol: any = {
        studyTitle: this.extractValue(text, ['study title:', 'title:', 'study name:', 'study:']) || 'Unknown Study',
        protocolNumber: this.extractValue(text, ['protocol number:', 'protocol:', 'study number:', 'protocol #:']) || 'UNKNOWN-001',
        studyPhase: this.extractValue(text, ['phase:', 'study phase:', 'clinical phase:']) || 'Phase 3',
        investigationalDrug: this.extractValue(text, ['drug:', 'investigational product:', 'study drug:', 'investigational drug:']) || 'Not specified',
        sponsor: this.extractValue(text, ['sponsor:', 'sponsor name:', 'sponsored by:']) || 'Unknown Sponsor',
        indication: this.extractValue(text, ['indication:', 'disease:', 'condition:', 'therapeutic area:']) || 'Not specified'
      };

      // Extract study design
      const designType = this.extractValue(text, ['design type:', 'study design:', 'design:']);
      const duration = this.extractValue(text, ['duration:', 'study duration:', 'treatment duration:']);
      const numberOfArms = this.extractNumberValue(text, ['arms:', 'number of arms:', 'treatment arms:']);
      
      protocol.studyDesign = {
        type: this.normalizeDesignType(designType) || 'open-label',
        duration: duration || 'Not specified',
        numberOfArms: numberOfArms || 1,
        description: this.extractValue(text, ['design description:', 'study description:']) || 'Study design not specified'
      };

      // Extract objectives
      const objectives = this.extractObjectives(text);
      if (objectives) {
        protocol.objectives = objectives;
      }

      // Extract population
      protocol.population = {
        targetEnrollment: this.extractNumberValue(text, ['enrollment:', 'target enrollment:', 'sample size:', 'subjects:']) || 100,
        ageRange: this.extractValue(text, ['age range:', 'age:', 'ages:']) || '18 years and above',
        gender: this.extractValue(text, ['gender:', 'sex:']) || 'all',
        condition: protocol.indication
      };

      // Extract endpoints
      const endpoints = this.extractEndpoints(text);
      if (endpoints) {
        protocol.endpoints = endpoints;
      }

      // Extract visit schedule
      const visitSchedule = this.extractVisitSchedule(text);
      if (visitSchedule.length > 0) {
        protocol.visitSchedule = visitSchedule;
      }

      // Extract criteria
      protocol.inclusionCriteria = this.extractCriteria(text, 'inclusion');
      protocol.exclusionCriteria = this.extractCriteria(text, 'exclusion');

      logger.info('Extracted protocol from plain text', { protocol });
      return protocol;
    } else {
      // Enhanced CRF extraction
      const forms = this.extractCRFForms(text);
      
      logger.info('Extracted CRFs from plain text', { formCount: forms.length });
      return forms.length > 0 ? forms : null;
    }
  }

  /**
   * Extracts a value from text based on possible labels
   */
  private static extractValue(text: string, labels: string[]): string | null {
    
    for (const label of labels) {
      // Try different patterns
      const patterns = [
        new RegExp(`${label.toLowerCase()}\\s*[:=]?\\s*([^\\n]+)`, 'i'),
        new RegExp(`${label.toLowerCase()}\\s+is\\s+([^\\n]+)`, 'i'),
        new RegExp(`"${label.toLowerCase()}"\\s*[:=]\\s*"([^"]+)"`, 'i')
      ];
      
      for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match && match[1]) {
          const value = match[1].trim();
          // Clean up the value
          if (value && value.length > 0 && value.length < 500) {
            // Remove trailing punctuation and quotes
            return value.replace(/[,;.]$/, '').replace(/^["']|["']$/g, '');
          }
        }
      }
    }
    
    return null;
  }

  /**
   * Extracts a numeric value from text
   */
  private static extractNumberValue(text: string, labels: string[]): number | null {
    const value = this.extractValue(text, labels);
    if (value) {
      const num = parseInt(value.replace(/[^0-9]/g, ''), 10);
      return isNaN(num) ? null : num;
    }
    return null;
  }

  /**
   * Normalizes study design type
   */
  private static normalizeDesignType(type: string | null): 'open-label' | 'double-blind' | 'single-blind' | 'placebo-controlled' | null {
    if (!type) return null;
    const lower = type.toLowerCase();
    if (lower.includes('open')) return 'open-label';
    if (lower.includes('double')) return 'double-blind';
    if (lower.includes('single')) return 'single-blind';
    if (lower.includes('placebo')) return 'placebo-controlled';
    return null;
  }

  /**
   * Extracts objectives from text
   */
  private static extractObjectives(text: string): StudyProtocol['objectives'] | null {
    const primary = this.extractListItems(text, ['primary objective:', 'primary objectives:']);
    const secondary = this.extractListItems(text, ['secondary objective:', 'secondary objectives:']);
    const exploratory = this.extractListItems(text, ['exploratory objective:', 'exploratory objectives:']);

    if (primary.length > 0 || secondary.length > 0) {
      return {
        primary: primary.map(desc => ({ description: desc, endpoints: [] })),
        secondary: secondary.map(desc => ({ description: desc, endpoints: [] })),
        exploratory: exploratory.map(desc => ({ description: desc, endpoints: [] }))
      };
    }
    return null;
  }

  /**
   * Extracts endpoints from text
   */
  private static extractEndpoints(text: string): StudyProtocol['endpoints'] | null {
    const primary = this.extractListItems(text, ['primary endpoint:', 'primary endpoints:']);
    const secondary = this.extractListItems(text, ['secondary endpoint:', 'secondary endpoints:']);
    const exploratory = this.extractListItems(text, ['exploratory endpoint:', 'exploratory endpoints:']);

    if (primary.length > 0 || secondary.length > 0) {
      return {
        primary: primary.map(name => ({
          name,
          description: name,
          timepoint: 'Not specified',
          method: 'Not specified'
        })),
        secondary: secondary.map(name => ({
          name,
          description: name,
          timepoint: 'Not specified',
          method: 'Not specified'
        })),
        exploratory: exploratory.map(name => ({
          name,
          description: name,
          timepoint: 'Not specified',
          method: 'Not specified'
        }))
      };
    }
    return null;
  }

  /**
   * Extracts list items following a label
   */
  private static extractListItems(text: string, labels: string[]): string[] {
    const items: string[] = [];
    const lowerText = text.toLowerCase();
    
    for (const label of labels) {
      const index = lowerText.indexOf(label.toLowerCase());
      if (index !== -1) {
        const afterLabel = text.substring(index + label.length);
        const lines = afterLabel.split('\n');
        
        for (let i = 0; i < lines.length && i < 10; i++) {
          const line = lines[i]?.trim() || '';
          // Look for bullet points or numbered items
          const itemMatch = line.match(/^[•\-\*\d+\.\)]\s*(.+)/);
          if (itemMatch && itemMatch[1]) {
            items.push(itemMatch[1].trim());
          } else if (i === 0 && line && !line.includes(':')) {
            // First line after label might be the item itself
            items.push(line);
          } else if (line === '' || line.includes(':')) {
            // Empty line or new section, stop
            break;
          }
        }
      }
    }
    
    return items;
  }

  /**
   * Extracts visit schedule from text
   */
  private static extractVisitSchedule(text: string): VisitSchedule[] {
    const visits: VisitSchedule[] = [];
    const visitPattern = /visit\s*(\d+|[a-z]+)[:\s]+([^\n]+)/gi;
    const matches = text.matchAll(visitPattern);
    
    let visitNumber = 1;
    for (const match of matches) {
      visits.push({
        visitName: match[0].split(':')[0]?.trim() || `Visit ${visitNumber}`,
        visitNumber: visitNumber++,
        timepoint: match[2]?.trim() || 'Not specified',
        window: '± 3 days',
        procedures: []
      });
    }
    
    return visits;
  }

  /**
   * Extracts inclusion or exclusion criteria
   */
  private static extractCriteria(text: string, type: 'inclusion' | 'exclusion'): string[] {
    const labels = type === 'inclusion' 
      ? ['inclusion criteria:', 'inclusion:', 'key inclusion criteria:']
      : ['exclusion criteria:', 'exclusion:', 'key exclusion criteria:'];
    
    const criteria = this.extractListItems(text, labels);
    return criteria.length > 0 ? criteria : [`${type} criteria not specified`];
  }

  /**
   * Extracts CRF forms from text
   */
  private static extractCRFForms(text: string): CRFSpecification[] {
    const forms: CRFSpecification[] = [];
    
    // Look for form listings
    const formSections = text.split(/(?=form\s*\d*[:\s])/i);
    
    for (const section of formSections) {
      const formNameMatch = section.match(/form\s*(\d*)[:\s]*([^\n]+)/i);
      if (formNameMatch && formNameMatch[2]) {
        const formName = formNameMatch[2].trim();
        const fields = this.extractCRFFields(section);
        
        forms.push({
          formName,
          formOID: `FORM_${formName.toUpperCase().replace(/\s+/g, '_')}`,
          version: '1.0',
          fields: fields.length > 0 ? fields : [{
            fieldName: 'DEFAULT_FIELD',
            fieldOID: 'DEFAULT_OID',
            fieldType: 'text',
            required: false,
            cdiscMapping: {
              domain: 'DM',
              variable: 'USUBJID'
            }
          }],
          lastUpdated: new Date()
        });
      }
    }
    
    // If no forms found, try to extract any mentioned forms
    if (forms.length === 0) {
      const formNames = [
        'Demographics', 'Medical History', 'Vital Signs', 'Laboratory',
        'Adverse Events', 'Concomitant Medications', 'Physical Examination'
      ];
      
      for (const formName of formNames) {
        if (text.toLowerCase().includes(formName.toLowerCase())) {
          forms.push({
            formName,
            formOID: `FORM_${formName.toUpperCase().replace(/\s+/g, '_')}`,
            version: '1.0',
            fields: [{
              fieldName: 'DEFAULT_FIELD',
              fieldOID: 'DEFAULT_OID',
              fieldType: 'text',
              required: false,
              cdiscMapping: {
                domain: 'DM',
                variable: 'USUBJID'
              }
            }],
            lastUpdated: new Date()
          });
        }
      }
    }
    
    return forms;
  }

  /**
   * Extracts CRF fields from a form section
   */
  private static extractCRFFields(text: string): CRFSpecification['fields'] {
    const fields: CRFSpecification['fields'] = [];
    const fieldPattern = /field[:\s]*([^\n]+)/gi;
    const matches = text.matchAll(fieldPattern);
    
    for (const match of matches) {
      const fieldName = match[1]?.trim();
      if (fieldName) {
        fields.push({
          fieldName,
          fieldOID: fieldName.toUpperCase().replace(/\s+/g, '_'),
          fieldType: 'text',
          required: false,
          cdiscMapping: {
            domain: 'DM',
            variable: 'UNKNOWN'
          }
        });
      }
    }
    
    return fields;
  }

  /**
   * Attempts to parse and validate an API response
   */
  static parseAndValidate<T>(
    responseText: string,
    validator: (data: any) => ValidationResult<T>,
    fallbackData?: T
  ): T {
    logger.info('Attempting to parse API response', { 
      responseLength: responseText?.length || 0,
      firstChars: responseText?.substring(0, 50),
      lastChars: responseText?.substring(Math.max(0, responseText?.length - 50))
    });

    // Log the actual response for debugging
    if (responseText && responseText.length < 1000) {
      logger.info('Full response text', { responseText });
    }

    // Check if it's a plain text response
    if (this.isPlainTextResponse(responseText)) {
      logger.warn('Detected plain text response instead of JSON');
      
      // Try to convert plain text to structured data
      try {
        const expectedType = validator === APIResponseValidator.validateStudyProtocol ? 'protocol' : 'crf';
        const structuredData = this.convertPlainTextToStructured(responseText, expectedType);
        
        if (structuredData) {
          logger.info('Successfully converted plain text to structured data');
          const validation = validator(structuredData);
          
          if (validation.isValid) {
            logger.info('Validation successful for converted data');
            return validation.data!;
          } else {
            logger.warn('Validation failed for converted data', { errors: validation.errors });
          }
        }
      } catch (conversionError) {
        logger.error('Failed to convert plain text to structured data', { error: conversionError });
      }
      
      // If conversion failed, use fallback
      if (fallbackData) {
        logger.info('Using fallback data after plain text conversion failed');
        return fallbackData;
      }
      throw new Error('API returned plain text instead of JSON format and conversion failed');
    }

    // Try to extract JSON
    const jsonText = this.extractJSON(responseText);
    if (!jsonText) {
      logger.error('Failed to extract JSON from response', {
        responsePreview: responseText?.substring(0, 200)
      });
      if (fallbackData) {
        logger.info('Using fallback data');
        return fallbackData;
      }
      throw new Error('Could not extract valid JSON from API response');
    }

    try {
      logger.info('Attempting to parse extracted JSON', { 
        jsonLength: jsonText.length,
        jsonPreview: jsonText.substring(0, 100)
      });
      
      const parsedData = JSON.parse(jsonText);
      const validation = validator(parsedData);

      if (!validation.isValid) {
        logger.error('Validation failed', { errors: validation.errors });
        if (fallbackData) {
          logger.info('Using fallback data due to validation errors');
          return fallbackData;
        }
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      if (validation.warnings.length > 0) {
        logger.warn('Validation warnings', { warnings: validation.warnings });
      }

      logger.info('Successfully parsed and validated response');
      return validation.data!;
    } catch (error) {
      logger.error('JSON parsing failed', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        jsonText: jsonText?.substring(0, 200)
      });
      if (fallbackData) {
        logger.info('Using fallback data due to parsing error');
        return fallbackData;
      }
      throw error;
    }
  }
}