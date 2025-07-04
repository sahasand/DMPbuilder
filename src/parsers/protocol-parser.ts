import { pdfExtractor } from './pdf-extractor';
import { createModuleLogger, logInfo, logWarn } from '../utils/logger';
import { ValidationError } from '../utils/error-handler';
import { StudyProtocol, StudyDesign, StudyObjectives, Objective } from '../types';

const logger = createModuleLogger('protocol-parser');

export interface ProtocolSection {
  title: string;
  content: string;
  pageStart?: number;
  pageEnd?: number;
}

export class ProtocolParser {
  /**
   * Parse protocol from PDF file
   */
  async parseFromPDF(filePath: string): Promise<string> {
    logInfo('Parsing protocol from PDF', { filePath });
    
    const extraction = await pdfExtractor.extractFromFile(filePath);
    const cleanedText = pdfExtractor.cleanText(extraction.text);
    
    // Extract and validate basic information
    const basicInfo = pdfExtractor.extractClinicalInfo(cleanedText);
    
    if (!basicInfo.protocolNumber) {
      logWarn('Protocol number not found in document');
    }
    
    return cleanedText;
  }
  
  /**
   * Parse protocol from text
   */
  parseFromText(text: string): Partial<StudyProtocol> {
    const sections = this.extractSections(text);
    
    return {
      studyTitle: this.extractStudyTitle(text, sections),
      protocolNumber: this.extractProtocolNumber(text, sections),
      studyPhase: this.extractStudyPhase(text, sections),
      investigationalDrug: this.extractInvestigationalDrug(text, sections),
      sponsor: this.extractSponsor(text, sections),
      indication: this.extractIndication(text, sections),
      studyDesign: this.extractStudyDesign(text, sections),
      objectives: this.extractObjectives(text, sections),
      inclusionCriteria: this.extractInclusionCriteria(text, sections),
      exclusionCriteria: this.extractExclusionCriteria(text, sections),
    };
  }
  
  /**
   * Extract protocol sections
   */
  extractSections(text: string): ProtocolSection[] {
    const sections: ProtocolSection[] = [];
    const lines = text.split('\n');
    
    // Common section headers in clinical protocols
    const sectionPatterns = [
      /^(?:\d+\.?\s*)?INTRODUCTION/i,
      /^(?:\d+\.?\s*)?BACKGROUND/i,
      /^(?:\d+\.?\s*)?OBJECTIVES?/i,
      /^(?:\d+\.?\s*)?STUDY DESIGN/i,
      /^(?:\d+\.?\s*)?STUDY POPULATION/i,
      /^(?:\d+\.?\s*)?INCLUSION CRITERIA/i,
      /^(?:\d+\.?\s*)?EXCLUSION CRITERIA/i,
      /^(?:\d+\.?\s*)?STUDY TREATMENTS?/i,
      /^(?:\d+\.?\s*)?STUDY PROCEDURES?/i,
      /^(?:\d+\.?\s*)?ENDPOINTS?/i,
      /^(?:\d+\.?\s*)?STATISTICAL/i,
      /^(?:\d+\.?\s*)?SAFETY/i,
      /^(?:\d+\.?\s*)?ETHICS/i,
    ];
    
    let currentSection: ProtocolSection | null = null;
    let contentLines: string[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const isHeader = sectionPatterns.some(pattern => pattern.test(line.trim()));
      
      if (isHeader) {
        // Save previous section
        if (currentSection) {
          currentSection.content = contentLines.join('\n').trim();
          sections.push(currentSection);
        }
        
        // Start new section
        currentSection = {
          title: line.trim(),
          content: '',
        };
        contentLines = [];
      } else if (currentSection) {
        contentLines.push(line);
      }
    }
    
    // Don't forget the last section
    if (currentSection) {
      currentSection.content = contentLines.join('\n').trim();
      sections.push(currentSection);
    }
    
    return sections;
  }
  
  /**
   * Extract study title
   */
  private extractStudyTitle(text: string, sections: ProtocolSection[]): string {
    // Try multiple patterns
    const patterns = [
      /Study Title:?\s*([^\n]+)/i,
      /Title:?\s*([^\n]+)/i,
      /Protocol Title:?\s*([^\n]+)/i,
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return this.cleanValue(match[1]);
      }
    }
    
    // Try to find in title page or first section
    const firstSection = sections[0];
    if (firstSection) {
      const lines = firstSection.content.split('\n').filter(l => l.trim());
      if (lines.length > 0) {
        return this.cleanValue(lines[0]);
      }
    }
    
    return '';
  }
  
  /**
   * Extract protocol number
   */
  private extractProtocolNumber(text: string, sections: ProtocolSection[]): string {
    const patterns = [
      /Protocol\s*(?:Number|No\.?|#)?\s*:?\s*([A-Z0-9][\w-]+)/i,
      /Study\s*(?:Number|No\.?|#)?\s*:?\s*([A-Z0-9][\w-]+)/i,
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return this.cleanValue(match[1]);
      }
    }
    
    return '';
  }
  
  /**
   * Extract study phase
   */
  private extractStudyPhase(text: string, sections: ProtocolSection[]): string {
    const patterns = [
      /Phase\s*:?\s*(I{1,3}|[1-4]|IV)/i,
      /Study Phase\s*:?\s*(I{1,3}|[1-4]|IV)/i,
      /Phase\s*(I{1,3}|[1-4]|IV)\s+(?:Study|Trial)/i,
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        // Normalize phase format
        const phase = match[1].toUpperCase();
        if (phase.match(/^I+$/)) {
          return phase.length.toString(); // Convert I, II, III to 1, 2, 3
        }
        return phase;
      }
    }
    
    return '';
  }
  
  /**
   * Extract investigational drug
   */
  private extractInvestigationalDrug(text: string, sections: ProtocolSection[]): string {
    const patterns = [
      /Investigational\s*(?:Product|Drug|Device|Medicinal Product)\s*:?\s*([^\n]+)/i,
      /Study\s*(?:Drug|Medication)\s*:?\s*([^\n]+)/i,
      /IMP\s*:?\s*([^\n]+)/i,
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return this.cleanValue(match[1]);
      }
    }
    
    return '';
  }
  
  /**
   * Extract sponsor
   */
  private extractSponsor(text: string, sections: ProtocolSection[]): string {
    const patterns = [
      /Sponsor\s*:?\s*([^\n]+)/i,
      /Study Sponsor\s*:?\s*([^\n]+)/i,
      /Sponsored by\s*:?\s*([^\n]+)/i,
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return this.cleanValue(match[1]);
      }
    }
    
    return '';
  }
  
  /**
   * Extract indication
   */
  private extractIndication(text: string, sections: ProtocolSection[]): string {
    const patterns = [
      /Indication\s*:?\s*([^\n]+)/i,
      /Disease\s*:?\s*([^\n]+)/i,
      /Condition\s*:?\s*([^\n]+)/i,
      /Treatment of\s+([^\n]+)/i,
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return this.cleanValue(match[1]);
      }
    }
    
    return '';
  }
  
  /**
   * Extract study design
   */
  private extractStudyDesign(text: string, sections: ProtocolSection[]): Partial<StudyDesign> {
    const designSection = sections.find(s => 
      /study design/i.test(s.title) || /design/i.test(s.title)
    );
    
    const content = designSection?.content || text;
    
    return {
      type: this.extractDesignType(content),
      duration: this.extractStudyDuration(content),
      description: designSection?.content.substring(0, 500) || '',
    };
  }
  
  /**
   * Extract design type
   */
  private extractDesignType(text: string): StudyDesign['type'] {
    if (/open[\s-]label/i.test(text)) return 'open-label';
    if (/double[\s-]blind/i.test(text)) return 'double-blind';
    if (/single[\s-]blind/i.test(text)) return 'single-blind';
    if (/placebo[\s-]controlled/i.test(text)) return 'placebo-controlled';
    return 'open-label'; // default
  }
  
  /**
   * Extract study duration
   */
  private extractStudyDuration(text: string): string {
    const patterns = [
      /duration\s*:?\s*(\d+\s*(?:weeks?|months?|days?))/i,
      /(\d+\s*(?:weeks?|months?|days?))\s*study/i,
      /study period\s*:?\s*(\d+\s*(?:weeks?|months?|days?))/i,
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return match[1];
      }
    }
    
    return '';
  }
  
  /**
   * Extract objectives
   */
  private extractObjectives(text: string, sections: ProtocolSection[]): Partial<StudyObjectives> {
    const objectiveSection = sections.find(s => /objectives?/i.test(s.title));
    const content = objectiveSection?.content || text;
    
    return {
      primary: this.extractPrimaryObjectives(content),
      secondary: this.extractSecondaryObjectives(content),
    };
  }
  
  /**
   * Extract primary objectives
   */
  private extractPrimaryObjectives(text: string): Objective[] {
    const objectives: Objective[] = [];
    
    // Find primary objectives section
    const primaryMatch = text.match(/Primary\s*Objectives?\s*:?\s*([^]*?)(?=Secondary|Exploratory|^\d+\.|$)/im);
    
    if (primaryMatch) {
      const content = primaryMatch[1];
      const items = this.extractListItems(content);
      
      items.forEach(item => {
        objectives.push({
          description: this.cleanValue(item),
          endpoints: [], // Will be populated later
        });
      });
    }
    
    return objectives;
  }
  
  /**
   * Extract secondary objectives
   */
  private extractSecondaryObjectives(text: string): Objective[] {
    const objectives: Objective[] = [];
    
    // Find secondary objectives section
    const secondaryMatch = text.match(/Secondary\s*Objectives?\s*:?\s*([^]*?)(?=Exploratory|^\d+\.|$)/im);
    
    if (secondaryMatch) {
      const content = secondaryMatch[1];
      const items = this.extractListItems(content);
      
      items.forEach(item => {
        objectives.push({
          description: this.cleanValue(item),
          endpoints: [], // Will be populated later
        });
      });
    }
    
    return objectives;
  }
  
  /**
   * Extract inclusion criteria
   */
  private extractInclusionCriteria(text: string, sections: ProtocolSection[]): string[] {
    const inclusionSection = sections.find(s => /inclusion/i.test(s.title));
    const content = inclusionSection?.content || '';
    
    if (!content) {
      // Try to find in main text
      const match = text.match(/Inclusion\s*Criteria\s*:?\s*([^]*?)(?=Exclusion|^\d+\.|$)/im);
      if (match) {
        return this.extractListItems(match[1]);
      }
    }
    
    return this.extractListItems(content);
  }
  
  /**
   * Extract exclusion criteria
   */
  private extractExclusionCriteria(text: string, sections: ProtocolSection[]): string[] {
    const exclusionSection = sections.find(s => /exclusion/i.test(s.title));
    const content = exclusionSection?.content || '';
    
    if (!content) {
      // Try to find in main text
      const match = text.match(/Exclusion\s*Criteria\s*:?\s*([^]*?)(?=^\d+\.|$)/im);
      if (match) {
        return this.extractListItems(match[1]);
      }
    }
    
    return this.extractListItems(content);
  }
  
  /**
   * Extract list items from text
   */
  private extractListItems(text: string): string[] {
    const items: string[] = [];
    const lines = text.split('\n');
    
    let currentItem = '';
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Check if this is a list item
      if (trimmed.match(/^[\d•·\-\*]\s*\.?\s*/)) {
        // Save previous item
        if (currentItem) {
          items.push(this.cleanValue(currentItem));
        }
        // Start new item
        currentItem = trimmed.replace(/^[\d•·\-\*]\s*\.?\s*/, '');
      } else if (trimmed && currentItem) {
        // Continue current item
        currentItem += ' ' + trimmed;
      }
    }
    
    // Don't forget the last item
    if (currentItem) {
      items.push(this.cleanValue(currentItem));
    }
    
    return items.filter(item => item.length > 10); // Filter out very short items
  }
  
  /**
   * Clean extracted value
   */
  private cleanValue(value: string): string {
    return value
      .replace(/\s+/g, ' ')
      .replace(/[""]/g, '"')
      .replace(/['']/g, "'")
      .trim();
  }
}

// Export singleton instance
export const protocolParser = new ProtocolParser();