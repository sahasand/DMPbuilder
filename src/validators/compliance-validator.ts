import { DMP, DMPSection, StudyProtocol, CRFSpecification, ComplianceCheck } from '../types';
import { createModuleLogger, logInfo, logWarn } from '../utils/logger';
import { ComplianceError, ValidationError } from '../utils/error-handler';

const logger = createModuleLogger('compliance-validator');

export interface ComplianceResult {
  isCompliant: boolean;
  checks: ComplianceCheck[];
  errors: string[];
  warnings: string[];
  score: number; // 0-100
}

export interface RegulatoryRequirement {
  id: string;
  regulation: string;
  requirement: string;
  category: string;
  mandatory: boolean;
  checkFunction: (dmp: DMP) => boolean;
}

export class ComplianceValidator {
  private requirements: RegulatoryRequirement[] = [
    // ICH-GCP Requirements
    {
      id: 'ICH-E6-5.0',
      regulation: 'ICH-GCP E6(R2)',
      requirement: 'Protocol identification and version control',
      category: 'study-info',
      mandatory: true,
      checkFunction: (dmp) => this.hasProtocolIdentification(dmp),
    },
    {
      id: 'ICH-E6-5.5',
      regulation: 'ICH-GCP E6(R2)',
      requirement: 'Data handling and record keeping procedures',
      category: 'data-management',
      mandatory: true,
      checkFunction: (dmp) => this.hasDataHandlingProcedures(dmp),
    },
    {
      id: 'ICH-E6-5.18',
      regulation: 'ICH-GCP E6(R2)',
      requirement: 'Safety reporting procedures',
      category: 'safety',
      mandatory: true,
      checkFunction: (dmp) => this.hasSafetyReportingProcedures(dmp),
    },
    
    // FDA 21 CFR Part 11 Requirements
    {
      id: 'FDA-11.10a',
      regulation: 'FDA 21 CFR Part 11',
      requirement: 'System validation and access controls',
      category: 'systems',
      mandatory: true,
      checkFunction: (dmp) => this.hasSystemValidation(dmp),
    },
    {
      id: 'FDA-11.10e',
      regulation: 'FDA 21 CFR Part 11',
      requirement: 'Audit trail requirements',
      category: 'systems',
      mandatory: true,
      checkFunction: (dmp) => this.hasAuditTrailRequirements(dmp),
    },
    {
      id: 'FDA-11.50',
      regulation: 'FDA 21 CFR Part 11',
      requirement: 'Electronic signature requirements',
      category: 'systems',
      mandatory: true,
      checkFunction: (dmp) => this.hasElectronicSignatureRequirements(dmp),
    },
    
    // EMA Requirements
    {
      id: 'EMA-DM-01',
      regulation: 'EMA Guidelines',
      requirement: 'Data management plan version control',
      category: 'documentation',
      mandatory: true,
      checkFunction: (dmp) => this.hasVersionControl(dmp),
    },
    {
      id: 'EMA-DM-02',
      regulation: 'EMA Guidelines',
      requirement: 'Medical coding dictionary specifications',
      category: 'coding',
      mandatory: true,
      checkFunction: (dmp) => this.hasMedicalCodingSpecs(dmp),
    },
    {
      id: 'EMA-DM-03',
      regulation: 'EMA Guidelines',
      requirement: 'Database lock procedures',
      category: 'database',
      mandatory: true,
      checkFunction: (dmp) => this.hasDatabaseLockProcedures(dmp),
    },
    
    // CDISC Requirements
    {
      id: 'CDISC-01',
      regulation: 'CDISC Standards',
      requirement: 'SDTM/CDASH mapping documentation',
      category: 'standards',
      mandatory: false,
      checkFunction: (dmp) => this.hasCDISCMapping(dmp),
    },
    {
      id: 'CDISC-02',
      regulation: 'CDISC Standards',
      requirement: 'Controlled terminology usage',
      category: 'standards',
      mandatory: false,
      checkFunction: (dmp) => this.hasControlledTerminology(dmp),
    },
  ];
  
  /**
   * Validate DMP for regulatory compliance
   */
  async validateCompliance(dmp: DMP): Promise<ComplianceResult> {
    logInfo('Starting compliance validation', {
      studyTitle: dmp.studyInfo.studyTitle,
      protocolNumber: dmp.studyInfo.protocolNumber,
    });
    
    const checks: ComplianceCheck[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Run all compliance checks
    for (const requirement of this.requirements) {
      try {
        const isCompliant = requirement.checkFunction(dmp);
        
        checks.push({
          regulation: requirement.regulation,
          requirement: requirement.requirement,
          status: isCompliant ? 'compliant' : 
                  requirement.mandatory ? 'non-compliant' : 'not-applicable',
          evidence: isCompliant ? 
            `Requirement met in DMP section(s)` : 
            `Requirement not met - review needed`,
        });
        
        if (!isCompliant) {
          if (requirement.mandatory) {
            errors.push(`${requirement.regulation}: ${requirement.requirement}`);
          } else {
            warnings.push(`${requirement.regulation}: ${requirement.requirement} (recommended)`);
          }
        }
      } catch (error) {
        logWarn('Compliance check failed', {
          requirement: requirement.id,
          error: error instanceof Error ? error.message : String(error),
        });
        
        checks.push({
          regulation: requirement.regulation,
          requirement: requirement.requirement,
          status: 'not-applicable',
          evidence: 'Check could not be performed',
        });
      }
    }
    
    // Calculate compliance score
    const mandatoryChecks = checks.filter(c => 
      this.requirements.find(r => r.requirement === c.requirement)?.mandatory
    );
    const compliantMandatory = mandatoryChecks.filter(c => c.status === 'compliant').length;
    const score = mandatoryChecks.length > 0 ? 
      (compliantMandatory / mandatoryChecks.length) * 100 : 0;
    
    const result: ComplianceResult = {
      isCompliant: errors.length === 0,
      checks,
      errors,
      warnings,
      score,
    };
    
    logInfo('Compliance validation completed', {
      isCompliant: result.isCompliant,
      score: result.score,
      errorCount: errors.length,
      warningCount: warnings.length,
    });
    
    return result;
  }
  
  /**
   * Validate DMP structure
   */
  validateStructure(dmp: DMP): string[] {
    const errors: string[] = [];
    
    // Check required sections
    const requiredSections = [
      'Overview of Project',
      'Roles and Responsibilities',
      'EDC System',
      'Data Cleaning Plan',
      'Reporting of AEs and SAEs',
      'Medical Coding Process',
      'Protocol Deviation',
      'Database Lock',
    ];
    
    const sectionTitles = dmp.sections.map(s => s.title);
    
    requiredSections.forEach(required => {
      if (!sectionTitles.some(title => title.includes(required))) {
        errors.push(`Missing required section: ${required}`);
      }
    });
    
    // Check study info completeness
    if (!dmp.studyInfo.studyTitle) errors.push('Study title is missing');
    if (!dmp.studyInfo.protocolNumber) errors.push('Protocol number is missing');
    if (!dmp.studyInfo.sponsor) errors.push('Sponsor information is missing');
    if (!dmp.studyInfo.studyPhase) errors.push('Study phase is missing');
    
    // Check version and date
    if (!dmp.version) errors.push('DMP version is missing');
    if (!dmp.effectiveDate) errors.push('Effective date is missing');
    
    // Check approvals
    if (!dmp.approvals || dmp.approvals.length === 0) {
      errors.push('Approval signatures section is missing');
    }
    
    return errors;
  }
  
  /**
   * Validate content quality
   */
  validateContent(dmp: DMP): string[] {
    const warnings: string[] = [];
    
    // Check section content depth
    dmp.sections.forEach(section => {
      if (section.content.length < 50 && (!section.subsections || section.subsections.length === 0)) {
        warnings.push(`Section "${section.title}" appears to have insufficient content`);
      }
      
      // Check for placeholder text
      if (section.content.includes('[To be') || section.content.includes('TBD')) {
        warnings.push(`Section "${section.title}" contains placeholder text`);
      }
    });
    
    // Check abbreviations
    if (dmp.abbreviations.length < 10) {
      warnings.push('Abbreviations list may be incomplete');
    }
    
    return warnings;
  }
  
  // Helper methods for specific compliance checks
  
  private hasProtocolIdentification(dmp: DMP): boolean {
    return !!(dmp.studyInfo.protocolNumber && dmp.studyInfo.studyTitle && dmp.version);
  }
  
  private hasDataHandlingProcedures(dmp: DMP): boolean {
    const dataSection = this.findSection(dmp, 'Data Cleaning Plan');
    return dataSection !== null && dataSection.content.length > 100;
  }
  
  private hasSafetyReportingProcedures(dmp: DMP): boolean {
    const safetySection = this.findSection(dmp, 'Reporting of AEs and SAEs');
    return safetySection !== null && 
           safetySection.content.includes('24') && // 24-hour reporting
           safetySection.content.toLowerCase().includes('sae');
  }
  
  private hasSystemValidation(dmp: DMP): boolean {
    const edcSection = this.findSection(dmp, 'EDC System');
    return edcSection !== null && 
           edcSection.content.toLowerCase().includes('21 cfr part 11');
  }
  
  private hasAuditTrailRequirements(dmp: DMP): boolean {
    const edcSection = this.findSection(dmp, 'EDC System');
    return edcSection !== null && 
           edcSection.content.toLowerCase().includes('audit trail');
  }
  
  private hasElectronicSignatureRequirements(dmp: DMP): boolean {
    const edcSection = this.findSection(dmp, 'EDC System');
    return edcSection !== null && 
           edcSection.content.toLowerCase().includes('electronic signature');
  }
  
  private hasVersionControl(dmp: DMP): boolean {
    return !!(dmp.version && dmp.effectiveDate);
  }
  
  private hasMedicalCodingSpecs(dmp: DMP): boolean {
    const codingSection = this.findSection(dmp, 'Medical Coding Process');
    return codingSection !== null && 
           codingSection.content.includes('MedDRA') && 
           codingSection.content.includes('WHODrug');
  }
  
  private hasDatabaseLockProcedures(dmp: DMP): boolean {
    const dblSection = this.findSection(dmp, 'Database Lock');
    return dblSection !== null && 
           dblSection.content.toLowerCase().includes('soft lock') &&
           dblSection.content.toLowerCase().includes('hard lock');
  }
  
  private hasCDISCMapping(dmp: DMP): boolean {
    const content = this.getAllContent(dmp);
    return content.toLowerCase().includes('cdisc') && 
           (content.toLowerCase().includes('sdtm') || content.toLowerCase().includes('cdash'));
  }
  
  private hasControlledTerminology(dmp: DMP): boolean {
    const content = this.getAllContent(dmp);
    return content.includes('MedDRA') && content.includes('WHODrug');
  }
  
  /**
   * Find section by title
   */
  private findSection(dmp: DMP, titlePart: string): DMPSection | null {
    return this.findSectionRecursive(dmp.sections, titlePart);
  }
  
  private findSectionRecursive(sections: DMPSection[], titlePart: string): DMPSection | null {
    for (const section of sections) {
      if (section.title.includes(titlePart)) {
        return section;
      }
      if (section.subsections) {
        const found = this.findSectionRecursive(section.subsections, titlePart);
        if (found) return found;
      }
    }
    return null;
  }
  
  /**
   * Get all content from DMP
   */
  private getAllContent(dmp: DMP): string {
    let content = '';
    
    const collectContent = (sections: DMPSection[]) => {
      sections.forEach(section => {
        content += section.title + ' ' + section.content + ' ';
        if (section.subsections) {
          collectContent(section.subsections);
        }
      });
    };
    
    collectContent(dmp.sections);
    return content;
  }
  
  /**
   * Generate compliance report
   */
  generateComplianceReport(result: ComplianceResult): string {
    let report = '# DMP Compliance Report\n\n';
    
    report += `## Summary\n`;
    report += `- **Overall Compliance**: ${result.isCompliant ? 'COMPLIANT' : 'NON-COMPLIANT'}\n`;
    report += `- **Compliance Score**: ${result.score.toFixed(1)}%\n`;
    report += `- **Total Checks**: ${result.checks.length}\n`;
    report += `- **Errors**: ${result.errors.length}\n`;
    report += `- **Warnings**: ${result.warnings.length}\n\n`;
    
    if (result.errors.length > 0) {
      report += `## Critical Issues\n`;
      result.errors.forEach(error => {
        report += `- ❌ ${error}\n`;
      });
      report += '\n';
    }
    
    if (result.warnings.length > 0) {
      report += `## Recommendations\n`;
      result.warnings.forEach(warning => {
        report += `- ⚠️ ${warning}\n`;
      });
      report += '\n';
    }
    
    report += `## Detailed Compliance Checks\n\n`;
    
    // Group by regulation
    const byRegulation = new Map<string, ComplianceCheck[]>();
    result.checks.forEach(check => {
      const existing = byRegulation.get(check.regulation) || [];
      existing.push(check);
      byRegulation.set(check.regulation, existing);
    });
    
    byRegulation.forEach((checks, regulation) => {
      report += `### ${regulation}\n`;
      checks.forEach(check => {
        const icon = check.status === 'compliant' ? '✅' : 
                     check.status === 'non-compliant' ? '❌' : '➖';
        report += `- ${icon} ${check.requirement}\n`;
      });
      report += '\n';
    });
    
    return report;
  }
}

// Export singleton instance
export const complianceValidator = new ComplianceValidator();