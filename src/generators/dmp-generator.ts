import { 
  StudyProtocol, 
  CRFSpecification, 
  DMP, 
  DMPSection, 
  StudyInfo,
  DataManagementConfig,
  RiskAssessment,
  Timeline,
  Approval,
  Abbreviation 
} from '../types';
import { createModuleLogger, logInfo } from '../utils/logger';
import { clinicalProcessor } from '../api/clinical-processor';
import { config, clinicalStandards, dataManagementConfig } from '../core/config';
import { AIContentGenerator, SectionContext, ContentGenerationOptions } from './ai-content-generator';
import { ModuleManager } from '../modules/module-manager';
import { ModuleContext, ModuleResult, DMPModification } from '../types/module-types';

const logger = createModuleLogger('dmp-generator');

export interface DMPGenerationOptions {
  includeRiskAssessment?: boolean;
  includeTimeline?: boolean;
  customSections?: DMPSection[];
  approvers?: Approval[];
  useAIGeneration?: boolean;
  aiOptions?: ContentGenerationOptions;
  useModules?: boolean;
  moduleOptions?: {
    parallel?: boolean;
    continueOnError?: boolean;
    specificModules?: string[];
  };
}

export class DMPGenerator {
  private aiContentGenerator: AIContentGenerator;
  private moduleManager: ModuleManager;
  
  constructor() {
    this.aiContentGenerator = new AIContentGenerator();
    this.moduleManager = new ModuleManager();
  }
  
  private standardAbbreviations: Abbreviation[] = [
    { abbreviation: 'AE', definition: 'Adverse Event' },
    { abbreviation: 'CCG', definition: 'CRF completion guidelines' },
    { abbreviation: 'CDM', definition: 'Clinical Data Management' },
    { abbreviation: 'CM', definition: 'Concomitant Medication' },
    { abbreviation: 'CRF/eCRF', definition: 'Electronic Case Report Form' },
    { abbreviation: 'CRA', definition: 'Clinical Research Associate' },
    { abbreviation: 'DBL', definition: 'Database Lock' },
    { abbreviation: 'DMP', definition: 'Data Management Plan' },
    { abbreviation: 'EDC', definition: 'Electronic Data Capture' },
    { abbreviation: 'eTMF', definition: 'Electronic Trial Master File' },
    { abbreviation: 'FPFV', definition: 'First Patient First Visit' },
    { abbreviation: 'LPFV', definition: 'Last Patient First Visit' },
    { abbreviation: 'LPLV', definition: 'Last Patient Last Visit' },
    { abbreviation: 'MedDRA', definition: 'Medical Dictionary for Regulatory Activities' },
    { abbreviation: 'PD', definition: 'Pharmacodynamics' },
    { abbreviation: 'PI', definition: 'Principal Investigator' },
    { abbreviation: 'PK', definition: 'Pharmacokinetics' },
    { abbreviation: 'SAE', definition: 'Serious Adverse Event' },
    { abbreviation: 'SAP', definition: 'Statistical Analysis Plan' },
    { abbreviation: 'SDV', definition: 'Source Data Verified' },
    { abbreviation: 'TFLs', definition: 'Tables, Figures, Listings' },
    { abbreviation: 'UAT', definition: 'User Acceptance Testing' },
    { abbreviation: 'WHODrug', definition: 'World Health Organization Drug Dictionary' },
  ];
  
  /**
   * Generate complete DMP from protocol and CRF specifications
   */
  async generateDMP(
    protocol: StudyProtocol,
    crfs: CRFSpecification[],
    options: DMPGenerationOptions = {}
  ): Promise<DMP> {
    logInfo('Generating DMP', {
      studyTitle: protocol.studyTitle,
      protocolNumber: protocol.protocolNumber,
      crfCount: crfs.length,
      useModules: options.useModules,
    });
    
    const studyInfo = this.createStudyInfo(protocol);
    let sections = await this.generateSections(protocol, crfs, options);
    
    // Execute modules if enabled
    let moduleResults: ModuleResult[] = [];
    if (options.useModules !== false) { // Default to true
      try {
        moduleResults = await this.executeModules(protocol, crfs, options);
        sections = this.applyModuleEnhancements(sections, moduleResults);
      } catch (error) {
        logInfo('Module execution failed, continuing with standard DMP generation', { error: error instanceof Error ? error.message : 'Unknown error' });
      }
    }
    
    const dmp: DMP = {
      studyInfo,
      version: 'v1.0',
      effectiveDate: new Date(),
      sections,
      approvals: options.approvers || this.generateDefaultApprovals(),
      abbreviations: this.standardAbbreviations,
      moduleAnalysis: moduleResults.length > 0 ? this.summarizeModuleResults(moduleResults) : undefined,
    };
    
    logInfo('DMP generated successfully', {
      sectionCount: sections.length,
      version: dmp.version,
      modulesExecuted: moduleResults.length,
    });
    
    return dmp;
  }
  
  /**
   * Create study info from protocol
   */
  private createStudyInfo(protocol: StudyProtocol): StudyInfo {
    return {
      studyTitle: protocol.studyTitle,
      protocolNumber: protocol.protocolNumber,
      studyPhase: protocol.studyPhase,
      investigationalDrug: protocol.investigationalDrug,
      sponsor: protocol.sponsor,
      indication: protocol.indication,
    };
  }
  
  /**
   * Generate all DMP sections
   */
  private async generateSections(
    protocol: StudyProtocol,
    crfs: CRFSpecification[],
    options: DMPGenerationOptions
  ): Promise<DMPSection[]> {
    const sections: DMPSection[] = [];
    
    // Check if AI generation is enabled
    const useAI = options.useAIGeneration !== false; // Default to true
    
    if (useAI) {
      // Generate sections with AI enhancement
      const context: SectionContext = {
        protocol,
        crfs,
        studyMetadata: AIContentGenerator.analyzeStudyContext(protocol, crfs),
        crossReferences: []
      };
      
      logInfo('Generating DMP sections with AI enhancement', {
        therapeuticArea: context.studyMetadata.therapeuticArea,
        complexity: context.studyMetadata.complexity,
        riskLevel: context.studyMetadata.riskLevel
      });
      
      // 1. Overview of Project (AI-enhanced)
      sections.push(await this.aiContentGenerator.generateOverviewSection(context, options.aiOptions));
      
      // 2. Roles and Responsibilities (Template-based)
      sections.push(this.generateRolesSection());
      
      // 3. Network Directories (Template-based)
      sections.push(this.generateDirectoriesSection());
      
      // 4. EDC System (Template-based)
      sections.push(this.generateEDCSection(crfs));
      
      // 5. Data Cleaning Plan (AI-enhanced)
      sections.push(await this.aiContentGenerator.generateDataManagementSection(context, options.aiOptions));
      
      // 6. Reporting of AEs and SAEs (AI-enhanced)
      sections.push(await this.aiContentGenerator.generateSafetyReportingSection(context, options.aiOptions));
      
      // 7. Medical Coding Process (AI-enhanced)
      sections.push(await this.aiContentGenerator.generateMedicalCodingSection(context, options.aiOptions));
      
      // 8. Clinical Data Management Tasks (Template-based)
      sections.push(this.generateCDMTasksSection());
      
      // 9. Protocol Deviation (Template-based)
      sections.push(this.generateProtocolDeviationSection());
      
      // 10. Database Lock (Template-based)
      sections.push(this.generateDatabaseLockSection());
      
      // 11. Appendix (Template-based)
      sections.push(this.generateAppendixSection(protocol, crfs));
    } else {
      // Original template-based generation
      sections.push(this.generateOverviewSection(protocol));
      sections.push(this.generateRolesSection());
      sections.push(this.generateDirectoriesSection());
      sections.push(this.generateEDCSection(crfs));
      sections.push(this.generateDataCleaningSection());
      sections.push(this.generateAEReportingSection());
      sections.push(this.generateMedicalCodingSection());
      sections.push(this.generateCDMTasksSection());
      sections.push(this.generateProtocolDeviationSection());
      sections.push(this.generateDatabaseLockSection());
      sections.push(this.generateAppendixSection(protocol, crfs));
    }
    
    // Add custom sections if provided
    if (options.customSections) {
      sections.push(...options.customSections);
    }
    
    return sections;
  }
  
  /**
   * Generate Overview of Project section
   */
  private generateOverviewSection(protocol: StudyProtocol): DMPSection {
    const studyParams = clinicalProcessor.extractStudyParameters(protocol);
    
    return {
      sectionNumber: '1',
      title: 'Overview of Project',
      content: '',
      subsections: [
        {
          sectionNumber: '1.1',
          title: 'Introduction',
          content: `This Data Management Plan (DMP) defines and documents the data management processes for the ${protocol.studyTitle} study (Protocol ${protocol.protocolNumber}). This plan specifies the processes and activities for integrating ${protocol.sponsor}'s Operations Team, Clinical Operations, Statistics, Data Management, and Site Personnel.`,
          subsections: [],
        },
        {
          sectionNumber: '1.2',
          title: 'Study Design',
          content: this.formatStudyDesign(protocol),
          subsections: [],
        },
        {
          sectionNumber: '1.3',
          title: 'Study Population',
          content: `Approximately ${protocol.population?.targetEnrollment || 100} ${protocol.population?.ageRange || '18 years and above'} ${protocol.population?.gender === 'all' ? 'adults' : protocol.population?.gender || 'adults'} with ${protocol.indication} are planned to enroll.`,
          subsections: [],
        },
        {
          sectionNumber: '1.4',
          title: 'Objectives and Endpoints',
          content: this.formatObjectivesAndEndpoints(protocol),
          subsections: [],
        },
        {
          sectionNumber: '1.5',
          title: 'Data Review Focus',
          content: `1. **Endpoint Data Review**: Detailed review of primary, secondary, and exploratory endpoints\n2. **Comprehensive Data Review**: Full dataset review of all data fields\n3. **Documentation**: All data review activities documented and saved appropriately`,
          subsections: [],
        },
      ],
    };
  }
  
  /**
   * Generate Roles and Responsibilities section
   */
  private generateRolesSection(): DMPSection {
    return {
      sectionNumber: '2',
      title: 'Roles and Responsibilities',
      content: '',
      subsections: [
        {
          sectionNumber: '2.1',
          title: 'Key Personnel',
          content: this.generateKeyPersonnelContent(),
          subsections: [],
        },
        {
          sectionNumber: '2.2',
          title: 'User Groups and Access Rights',
          content: this.generateUserGroupsContent(),
          subsections: [],
        },
        {
          sectionNumber: '2.3',
          title: 'Communications',
          content: `- **Regular Communication**: Bi-weekly data management meetings\n- **Other Communication**: CDM team works with central labs and specialty vendors\n- **Escalation Pathway**: Issues escalated to Study Project Manager`,
          subsections: [],
        },
      ],
    };
  }
  
  /**
   * Generate Network Directories section
   */
  private generateDirectoriesSection(): DMPSection {
    return {
      sectionNumber: '3',
      title: 'Network Directories',
      content: `**SharePoint Directory Structure**:\n- Root Directory: \`/Study_${new Date().getFullYear()}/Data-Management\`\n- Subdirectories:\n  - \`/CRFs\`: Case Report Forms\n  - \`/CRF Completion Guidelines\`\n  - \`/DM Plan\`\n  - \`/SAS Exports\`\n  - \`/Communication\`: Communications and meeting notes\n  - \`/Miscellaneous\``,
      subsections: [],
    };
  }
  
  /**
   * Generate EDC System section
   */
  private generateEDCSection(crfs: CRFSpecification[]): DMPSection {
    const crfAnalysis = clinicalProcessor.analyzeCRFComplexity(crfs);
    
    return {
      sectionNumber: '4',
      title: 'EDC System',
      content: '',
      subsections: [
        {
          sectionNumber: '4.1',
          title: 'System Details',
          content: `- **System**: Clinical EDC Platform\n- **Access**: Web browser based, browser independent\n- **Compliance**: 21 CFR Part 11 regulations\n- **Security**: Multi-layered security with encryption`,
          subsections: [],
        },
        {
          sectionNumber: '4.2',
          title: 'Key Features',
          content: `- Audit trail for all data changes\n- Electronic signatures support\n- Secure data transfers\n- Real-time edit checks and validations`,
          subsections: [],
        },
        {
          sectionNumber: '4.3',
          title: 'Database Development Process',
          content: `1. Initial draft eCRF development\n2. UAT with Clinical Operations and Data Management\n3. Multiple UAT cycles with feedback implementation\n4. Final approval and production deployment`,
          subsections: [],
        },
        {
          sectionNumber: '4.4',
          title: 'CRF Complexity Analysis',
          content: this.formatCRFComplexity(crfAnalysis),
          subsections: [],
        },
        {
          sectionNumber: '4.5',
          title: 'Laboratory Normal Ranges',
          content: this.generateLabNormalRanges(),
          subsections: [],
        },
      ],
    };
  }
  
  /**
   * Generate Data Cleaning Plan section
   */
  private generateDataCleaningSection(): DMPSection {
    return {
      sectionNumber: '5',
      title: 'Data Cleaning Plan',
      content: '',
      subsections: [
        {
          sectionNumber: '5.1',
          title: 'Data Entry',
          content: `- Sites required to identify at least one research staff member for data entry\n- Staff must adhere to CRF Completion Guidelines\n- New users follow certification process per training plan`,
          subsections: [],
        },
        {
          sectionNumber: '5.2',
          title: 'Edit Checks, Warnings, and Notices',
          content: `- **Valid-value Alerts**: Ensuring data entries are within predefined valid values\n- **Valid-range Alerts**: Checking numeric data falls within acceptable ranges\n- **Missing-value Alerts**: Identifying incomplete mandatory fields\n- **Warnings**: Values outside specified normal range or incorrect format\n- **Notices**: Helpful text to guide data entry process`,
          subsections: [],
        },
        {
          sectionNumber: '5.3',
          title: 'Query Management',
          content: `- **Site Response Time**: ${dataManagementConfig.query.responseTimeDays} business days\n- **Closure Time**: ${dataManagementConfig.query.closureTimeDays} business days from issuance\n- **Query Types**: Manual and automated edit checks\n- **Tracking**: Comprehensive query report on EDC dashboard`,
          subsections: [],
        },
        {
          sectionNumber: '5.4',
          title: 'Data Review Process',
          content: `1. **Scheduled Exports**: Strategic exports at critical trial milestones\n2. **Ongoing Data Review**: Real-time review with continuous monitoring\n3. **Cross-Time Point Analysis**: Longitudinal consistency checks\n4. **Query Management**: Timely resolution of flagged issues\n5. **Finalization**: Rolling freeze and final lock after PI signatures`,
          subsections: [],
        },
      ],
    };
  }
  
  /**
   * Generate AE/SAE Reporting section
   */
  private generateAEReportingSection(): DMPSection {
    return {
      sectionNumber: '6',
      title: 'Reporting of AEs and SAEs',
      content: '',
      subsections: [
        {
          sectionNumber: '6.1',
          title: 'Reporting Requirements',
          content: `- All AEs recorded in EDC after ICF signing\n- SAEs reported within ${dataManagementConfig.sae.reportingTimeframe} hours of learning of event\n- Safety team notified by email for SAEs\n- All AEs/SAEs followed until resolved or trial end`,
          subsections: [],
        },
        {
          sectionNumber: '6.2',
          title: 'Safety Communication',
          content: `- SAE information recorded in EDC\n- Automatic email notifications when AE marked as serious\n- Details in Safety Management Plan`,
          subsections: [],
        },
      ],
    };
  }
  
  /**
   * Generate Medical Coding Process section
   */
  private generateMedicalCodingSection(): DMPSection {
    return {
      sectionNumber: '7',
      title: 'Medical Coding Process',
      content: '',
      subsections: [
        {
          sectionNumber: '7.1',
          title: 'Dictionary Use',
          content: `- **MedDRA**: Version ${clinicalStandards.meddra.version} for adverse events, serious adverse events, medical history\n- **WHODrug**: Version ${clinicalStandards.whodrug.version} for medications`,
          subsections: [],
        },
        {
          sectionNumber: '7.2',
          title: 'Coding Methodology',
          content: `- **Auto Coding**: Initial automated coding within EDC\n- **Manual Adjustments**: Manual correction every two weeks following MedDRA guidelines\n- **Quality Assurance**: Regular assessments by Coding Associate\n- **Review Process**: Monthly medical coding listings to sponsor`,
          subsections: [],
        },
        {
          sectionNumber: '7.3',
          title: 'MedDRA Coding Guidelines',
          content: this.generateMedDRACodingGuidelines(),
          subsections: [],
        },
        {
          sectionNumber: '7.4',
          title: 'WHODrug Coding Guidelines',
          content: this.generateWHODrugCodingGuidelines(),
          subsections: [],
        },
      ],
    };
  }
  
  /**
   * Generate Clinical Data Management Tasks section
   */
  private generateCDMTasksSection(): DMPSection {
    return {
      sectionNumber: '8',
      title: 'Clinical Data Management Tasks',
      content: '',
      subsections: [
        {
          sectionNumber: '8.1',
          title: 'CDM Responsibilities',
          content: `- AE CRF and Safety Reconciliation\n- Data Entry Issues and Questions resolution\n- UAT focusing on critical CRFs\n- CRF design evaluation and resolution\n- Query trend analysis and resolution`,
          subsections: [],
        },
        {
          sectionNumber: '8.2',
          title: 'Team Collaboration',
          content: `- Clinical Operations: CDM and Biostatistics support\n- Sponsor Clinical Operations: Clinical Data Management support\n- Cross-functional coordination for data integrity`,
          subsections: [],
        },
      ],
    };
  }
  
  /**
   * Generate Protocol Deviation section
   */
  private generateProtocolDeviationSection(): DMPSection {
    return {
      sectionNumber: '9',
      title: 'Protocol Deviation',
      content: '',
      subsections: [
        {
          sectionNumber: '9.1',
          title: 'Protocol Deviation Categories',
          content: this.generateDeviationCategories(),
          subsections: [],
        },
        {
          sectionNumber: '9.2',
          title: 'Classification System',
          content: this.generateDeviationClassification(),
          subsections: [],
        },
        {
          sectionNumber: '9.3',
          title: 'Management Process',
          content: `1. **Monthly Review**: Sponsor reviews and classifies deviations as Major or Minor\n2. **Documentation**: Classifications recorded in external dataset by CDM\n3. **Meeting Documentation**: Review meetings recorded and data appropriately saved\n4. **Final Review**: Protocol deviation review meeting before DBL\n5. **CSR Inclusion**: All deviations with classifications summarized in Clinical Study Report`,
          subsections: [],
        },
        {
          sectionNumber: '9.4',
          title: 'Roles and Responsibilities',
          content: `- **CRA/Clinical Operations**: Site training, identification, initial handling\n- **Medical Monitor**: Guidance on safety-affecting deviations\n- **Site Data Entry Personnel**: Records deviations in EDC\n- **Sponsor**: Reviews and adjudicates as major or minor\n- **CDM**: Monitors, tracks, ensures documentation, coordinates resolution`,
          subsections: [],
        },
      ],
    };
  }
  
  /**
   * Generate Database Lock section
   */
  private generateDatabaseLockSection(): DMPSection {
    return {
      sectionNumber: '10',
      title: 'Database Lock',
      content: '',
      subsections: [
        {
          sectionNumber: '10.1',
          title: 'Soft Lock',
          content: `- Initial conditional phase with selective database closure\n- Access confined to CDM and designated personnel\n- Allows outstanding queries resolution and necessary corrections\n- CDM may unfreeze certain pages for data resolution`,
          subsections: [],
        },
        {
          sectionNumber: '10.2',
          title: 'Database Lock Checklist',
          content: this.generateDatabaseLockChecklist(),
          subsections: [],
        },
        {
          sectionNumber: '10.3',
          title: 'Data for Final Statistical Analysis',
          content: `- CDM ensures all DBL activities completed\n- Data extracted in required format\n- Stored securely as final locked data\n- Shared with biostatistics team`,
          subsections: [],
        },
        {
          sectionNumber: '10.4',
          title: 'Database Unlock Process',
          content: `- Formal evaluation by Biostatistics, study PI, and Medical Monitor\n- Impact assessment on trial results\n- Formal approval from sponsor and Biostatistician required\n- Database unlock form signed`,
          subsections: [],
        },
        {
          sectionNumber: '10.5',
          title: 'Study Archive',
          content: `- Archive all eCRF in PDF to eTMF\n- All eCRF data, audit trails, queries, exports sent to Sponsor\n- Casebooks distributed to sites electronically or via USB`,
          subsections: [],
        },
      ],
    };
  }
  
  /**
   * Generate Appendix section
   */
  private generateAppendixSection(protocol: StudyProtocol, crfs: CRFSpecification[]): DMPSection {
    return {
      sectionNumber: '11',
      title: 'Appendix',
      content: '',
      subsections: [
        {
          sectionNumber: '11.1',
          title: 'Protocol Deviation Classification Examples',
          content: this.generateDeviationExamples(),
          subsections: [],
        },
        {
          sectionNumber: '11.2',
          title: 'Data Review Plan',
          content: this.generateDataReviewPlan(crfs),
          subsections: [],
        },
        {
          sectionNumber: '11.3',
          title: 'Additional Data Review Activities',
          content: this.generateAdditionalReviewActivities(),
          subsections: [],
        },
      ],
    };
  }
  
  // Helper methods for content generation
  
  private formatStudyDesign(protocol: StudyProtocol): string {
    const design = protocol.studyDesign;
    if (!design) {
      return 'Study design information not available.';
    }
    
    let content = `This is a ${design.type || 'clinical'} study`;
    
    if (design.duration) {
      content += ` with a duration of ${design.duration}`;
    }
    
    if ((design.numberOfArms || 1) > 1) {
      content += ` with ${design.numberOfArms} treatment arms`;
    }
    
    content += '.\n\n' + (design.description || 'No additional design description available.');
    
    if (design.parts && design.parts.length > 0) {
      content += '\n\n**Study Parts:**\n';
      design.parts.forEach(part => {
        content += `- **${part.name}**: ${part.description}`;
        if (part.cohorts) {
          content += ` (${part.cohorts} cohorts`;
          if (part.participantsPerCohort) {
            content += ` of ${part.participantsPerCohort} participants each`;
          }
          content += ')';
        }
        content += '\n';
      });
    }
    
    return content;
  }
  
  private formatObjectivesAndEndpoints(protocol: StudyProtocol): string {
    let content = '';
    
    // Ensure objectives exist
    if (!protocol.objectives || !protocol.objectives.primary) {
      content += '#### Primary Objectives\n';
      content += '- No primary objectives found\n';
      return content;
    }
    
    // Primary Objectives
    content += '#### Primary Objectives\n';
    (protocol.objectives?.primary || []).forEach(obj => {
      // Handle both string and object formats
      if (typeof obj === 'string') {
        content += `- ${obj}\n`;
      } else {
        content += `- **Objective**: ${obj.description}\n`;
        if (obj.endpoints && obj.endpoints.length > 0) {
          content += `- **Endpoints**:\n`;
          obj.endpoints.forEach(ep => {
            content += `  - ${ep}\n`;
          });
        }
      }
    });
    
    // Secondary Objectives
    if (protocol.objectives?.secondary && protocol.objectives.secondary.length > 0) {
      content += '\n#### Secondary Objectives\n';
      (protocol.objectives.secondary || []).forEach(obj => {
        // Handle both string and object formats
        if (typeof obj === 'string') {
          content += `- ${obj}\n`;
        } else {
          content += `- **Objective**: ${obj.description}\n`;
          if (obj.endpoints && obj.endpoints.length > 0) {
            content += `- **Endpoints**:\n`;
            obj.endpoints.forEach(ep => {
              content += `  - ${ep}\n`;
            });
          }
        }
      });
    }
    
    // Exploratory Objectives
    if (protocol.objectives?.exploratory && protocol.objectives.exploratory.length > 0) {
      content += '\n#### Exploratory Objectives\n';
      (protocol.objectives.exploratory || []).forEach(obj => {
        // Handle both string and object formats
        if (typeof obj === 'string') {
          content += `- ${obj}\n`;
        } else {
          content += `- **Objective**: ${obj.description}\n`;
          if (obj.endpoints && obj.endpoints.length > 0) {
            content += `- **Endpoints**:\n`;
            obj.endpoints.forEach(ep => {
              content += `  - ${ep}\n`;
            });
          }
        }
      });
    }
    
    return content;
  }
  
  private generateKeyPersonnelContent(): string {
    return `#### CDM Team Lead
- **Name**: [To be assigned]
- **Title**: Clinical Data Manager
- **Phone**: [Contact information]
- **Email**: [Email address]

#### EDC Project Manager
- **Name**: [To be assigned]
- **Title**: Project Manager
- **Email**: [Email address]
- **Phone**: [Contact information]`;
  }
  
  private generateUserGroupsContent(): string {
    return `| Role | Activities |
|---|---|
| SPONSOR ALL | View all CRFs, Export data |
| SPONSOR Limited | View all CRFs, Export data (with restrictions) |
| CRA/MONITOR | Monitor CRFs, Issue Queries, Close Monitor Queries, SDV |
| SAFETY | View all CRFs, Issue queries on AE CRF, Close Queries on AE CRF |
| MEDICAL CODER | View all CRFs, access to medical coder portal, Issue and close queries |
| DM | Issue and close queries on all CRFs, DM review, Data export, Freeze and Lock Data |
| SITE PI | Consent, view all CRFs, Sign-off on CRFs |
| SITE DATA ENTRY | Consent, enter data on all CRFs, Answer queries |
| PM | Monitor CRFs, Issue Queries, SDV |
| STAT | View all CRFs, Export data |
| ADMIN | Administrative Activities |`;
  }
  
  private formatCRFComplexity(analysis: Record<string, any>): string {
    const totalForms = analysis?.totalForms ?? 0;
    const totalFields = analysis?.totalFields ?? 0;
    const requiredFields = analysis?.requiredFields ?? 0;
    const optionalFields = analysis?.optionalFields ?? 0;
    const cdiscCoverage = analysis?.cdiscCoverage ?? 0;
    const complexity = analysis?.complexity ?? 0;
    const fieldTypes = analysis?.fieldTypes || {};

    return `- **Total Forms**: ${totalForms}
- **Total Fields**: ${totalFields} (${requiredFields} required, ${optionalFields} optional)
- **CDISC Coverage**: ${(cdiscCoverage ?? 0).toFixed(1)}%
- **Complexity Score**: ${((complexity ?? 0) * 100).toFixed(0)}%
- **Field Types**: ${Object.entries(fieldTypes || {}).map(([type, count]) => `${type} (${count})`).join(', ')}`;
  }
  
  private generateLabNormalRanges(): string {
    return `#### Hematology
| Test | Range | Units |
|---|---|---|
| Hematocrit | 35-50 | % |
| Platelet Count | 130-400 | 10^3/µL |
| RBC Count | 4.0-6.0 | 10^6/µL |
| WBC Count | 4.0-11.0 | 10^3/µL |

#### Chemistry (Serum)
| Test | Range | Units |
|---|---|---|
| Alanine Aminotransferase (ALT) | 10-50 | U/L |
| Albumin | 3.5-5.0 | g/dL |
| Alkaline Phosphatase (AP) | 40-150 | U/L |
| Aspartate Aminotransferase (AST) | 10-40 | U/L |
| BUN | 7-20 | mg/dL |
| Calcium | 8.5-10.5 | mg/dL |
| Creatinine | 0.6-1.2 | mg/dL |
| Glucose | 70-100 | mg/dL |
| Potassium | 3.5-5.0 | mmol/L |
| Sodium | 135-145 | mmol/L |`;
  }
  
  private generateMedDRACodingGuidelines(): string {
    return `- Minor misspellings accepted if easily recognizable
- Queries issued for ambiguous terms
- Differential diagnosis split unless coding to same preferred term
- Symptoms with diagnosis coded to diagnosis if consistent
- Abbreviations with multiple meanings queried for clarification`;
  }
  
  private generateWHODrugCodingGuidelines(): string {
    return `- Trade name preferred over generic when both documented
- Distinct medications split if not available as combination
- Single ingredient products: non-salt form chosen when options available
- Investigational products coded to "Investigational drug" or equivalent`;
  }
  
  private generateDeviationCategories(): string {
    return `#### Concomitant Medications
- **Prohibited Concomitant Medication Administered**: Prohibited medication taken/administered

#### Data Integrity
- **Data Integrity Issues**: Validity/accuracy compromised by mishandling, omitting, or falsifying data

#### Eligibility
- **Eligibility Criteria Not Verified**: Participant eligibility not fully verified before intervention

#### Informed Consent
- **Informed Consent Issues**: Consent not collected or mishandled

#### Study Procedures
- **Procedure Timing Violation**: Procedure not conducted within protocol-defined window
- **Procedure Non-completion**: Procedure not conducted/completed per protocol

#### Treatment
- **Treatment Administration Issues**: Study drug not given as directed

#### Study Visit
- **Visit Timing Violation**: Visit not conducted within protocol-defined window

#### Other
- **Miscellaneous Deviations**: Deviations not fitting listed categories`;
  }
  
  private generateDeviationClassification(): string {
    return `#### Major Protocol Deviation
- Increase risk and/or decrease benefit to participants
- Affect subject's rights, safety, welfare, and/or research data integrity
- Example: Subject enrolled despite not meeting inclusion/exclusion criteria

#### Minor Protocol Deviation
- Does not increase risk or decrease benefit to participant
- Does not significantly affect subject's rights, safety, welfare, and/or data integrity
- Example: Missed laboratory assessment not impacting subject safety`;
  }
  
  private generateDatabaseLockChecklist(): string {
    return `- [ ] All subjects completed final visit
- [ ] All CRFs completed in EDC
- [ ] All subject data entered and queries resolved/closed
- [ ] All medical coding completed and reviewed
- [ ] Medical coding approval form signed
- [ ] SAEs reconciled with Safety Database
- [ ] Statistical review/preliminary analysis completed
- [ ] All required fields SDV'd
- [ ] All CRF forms signed by PI
- [ ] Audit trail data review completed
- [ ] All forms locked`;
  }
  
  private generateDeviationExamples(): string {
    return `| Category | Major | Minor | Not a Protocol Deviation |
|---|---|---|---|
| **Informed Consent** | Clinical study procedures conducted prior to obtaining initial informed consent | If required by local regulation or IRB, participant did not initial all pages | Administrative items: incorrect date format, signature on wrong line but ICF signed |
| **Inclusion/Exclusion** | Participant entered study without satisfying entry criteria | | |
| **Study Procedures** | Missed safety or primary endpoint assessments | Non-critical procedures performed out of specified window | Training of CRAs or other personnel |
| **Safety Reporting** | SAEs/Pregnancy not reported within required timeframe (${dataManagementConfig.sae.reportingTimeframe}h) | Non-serious AEs not reported within predefined timelines | Site appropriately reported SAE, later asked to split by DM team |`;
  }
  
  private generateDataReviewPlan(crfs: CRFSpecification[]): string {
    let content = `| Form Name | Field Name | Data Review Check | Reviewer |
|---|---|---|---|`;
    
    // Add standard review items
    const standardReviews = [
      { form: 'Informed Consent', field: 'Protocol Version and Dates', check: 'Ensure patient consented using most recent protocol version', reviewer: 'CRA/DM' },
      { form: 'Inclusion/Exclusion', field: 'All Fields', check: 'Verify inclusion criteria met, no exclusion criteria met', reviewer: 'CRA/DM' },
      { form: 'Medical History', field: 'Medical History', check: 'Confirm relevant medical history and associated medications recorded', reviewer: 'CRA/DM' },
      { form: 'ConMeds', field: 'All Fields', check: 'Ensure all concomitant medications documented and reviewed', reviewer: 'CRA/DM' },
      { form: 'Adverse Events', field: 'All Fields', check: 'Confirm all AEs recorded, assessed for severity/causality, followed up', reviewer: 'CRA/DM' },
    ];
    
    standardReviews.forEach(review => {
      content += `\n| ${review.form} | ${review.field} | ${review.check} | ${review.reviewer} |`;
    });
    
    // Add CRF-specific reviews
    (crfs || []).slice(0, 5).forEach(crf => {
      content += `\n| ${crf.formName} | All Fields | Ensure completeness and consistency | CRA/DM |`;
    });
    
    return content;
  }
  
  private generateAdditionalReviewActivities(): string {
    return `#### Laboratory Data Validation
- **Collection Date Verification**: Verify lab test collection dates align with study timeline
- **Facility and Demographics Confirmation**: Confirm laboratory facilities consistent for subject
- **Verification and Clinical Relevance**: Ensure results verified against normal ranges
- **Duplicate Data**: Identify and resolve duplicate records
- **Manual Date Checks**: Verify chronological accuracy and consistency
- **Outlier Identification**: Assess outliers for data entry errors or clinical anomalies

#### Automated Monitoring
- **AE Warnings**: EDC system automatically flags potential AEs based on criteria
- **Protocol Deviation Alerts**: System alerts for entries indicating protocol deviations
- **CDM Review**: Regular review of automated warnings and alerts`;
  }
  
  private generateDefaultApprovals(): Approval[] {
    return [
      { name: 'Clinical Data Manager', title: 'CDM Lead' },
      { name: 'Project Manager', title: 'PM' },
      { name: 'Sponsor Clinical Data Manager', title: 'Sponsor CDM' },
      { name: 'Sr. Director Clinical Operations', title: 'Clinical Operations Lead' },
    ];
  }

  /**
   * Execute clinical research modules
   */
  private async executeModules(
    protocol: StudyProtocol,
    crfs: CRFSpecification[],
    options: DMPGenerationOptions
  ): Promise<ModuleResult[]> {
    // Initialize module manager if not already done
    if (!this.moduleManager) {
      this.moduleManager = new ModuleManager();
    }
    
    try {
      await this.moduleManager.initialize();
    } catch (error) {
      logInfo('Module manager initialization failed', { error: error instanceof Error ? error.message : 'Unknown error' });
      return [];
    }

    const context: ModuleContext = {
      protocol,
      crfs,
      metadata: {
        timestamp: new Date(),
        initiator: 'dmp-generator',
        environment: process.env.NODE_ENV === 'production' ? 'production' : 
                     process.env.NODE_ENV === 'test' ? 'test' : 'development'
      }
    };

    const executionOptions = {
      modules: options.moduleOptions?.specificModules,
      continueOnError: options.moduleOptions?.continueOnError ?? true,
      parallel: options.moduleOptions?.parallel ?? false
    };

    logInfo('Executing clinical modules', {
      moduleCount: this.moduleManager.getActiveModules().length,
      executionOptions
    });

    return await this.moduleManager.executeModules(context, executionOptions);
  }

  /**
   * Apply module enhancements to DMP sections
   */
  private applyModuleEnhancements(
    sections: DMPSection[],
    moduleResults: ModuleResult[]
  ): DMPSection[] {
    const enhancedSections = [...sections];
    const allModifications: DMPModification[] = [];

    // Collect all DMP modifications from module results
    moduleResults.forEach(result => {
      if (result.dmpModifications) {
        allModifications.push(...result.dmpModifications);
      }
    });

    // Apply modifications to sections
    allModifications.forEach(modification => {
      const targetSection = enhancedSections.find(section => 
        section.title.toLowerCase().includes(modification.section.toLowerCase()) ||
        section.subsections?.some(sub => sub.title.toLowerCase().includes(modification.section.toLowerCase()))
      );

      if (targetSection) {
        this.applyModificationToSection(targetSection, modification);
      } else {
        // Create new section if needed for high priority modifications
        if (modification.priority === 'high' || modification.priority === 'critical') {
          const newSection: DMPSection = {
            sectionNumber: (enhancedSections.length + 1).toString(),
            title: modification.section,
            content: modification.content,
            subsections: []
          };
          enhancedSections.push(newSection);
        }
      }
    });

    // Add module insights section if we have meaningful results
    const insights = this.generateModuleInsights(moduleResults);
    if (insights) {
      enhancedSections.splice(1, 0, insights); // Insert after overview
      // Update section numbers
      this.renumberSections(enhancedSections);
    }

    return enhancedSections;
  }

  /**
   * Apply a single modification to a section
   */
  private applyModificationToSection(section: DMPSection, modification: DMPModification): void {
    switch (modification.type) {
      case 'add':
        section.content += `\n\n${modification.content}`;
        break;
      case 'modify':
        if (section.content.length < 100) {
          section.content = modification.content;
        } else {
          section.content += `\n\n**Module Enhancement**: ${modification.content}`;
        }
        break;
      case 'replace':
        section.content = modification.content;
        break;
      // 'delete' type not implemented for safety
    }
  }

  /**
   * Generate module insights section
   */
  private generateModuleInsights(moduleResults: ModuleResult[]): DMPSection | null {
    const successfulResults = moduleResults.filter(r => r.status === 'success');
    
    if (successfulResults.length === 0) {
      return null;
    }

    let content = 'This DMP has been enhanced with insights from clinical research modules:\n\n';
    
    successfulResults.forEach((result, index) => {
      const moduleData = result.data as any;
      content += `### ${index + 1}. ${result.moduleId} Analysis\n\n`;
      
      if (result.messages && result.messages.length > 0) {
        content += `**Key Findings:**\n`;
        result.messages.forEach(message => {
          content += `- ${message}\n`;
        });
        content += '\n';
      }

      if (result.recommendations && result.recommendations.length > 0) {
        content += `**Recommendations:**\n`;
        result.recommendations.forEach(rec => {
          content += `- ${rec}\n`;
        });
        content += '\n';
      }

      if (result.warnings && result.warnings.length > 0) {
        content += `**Considerations:**\n`;
        result.warnings.forEach(warning => {
          content += `- ${warning}\n`;
        });
        content += '\n';
      }
    });

    return {
      sectionNumber: '1.1',
      title: 'Clinical Analysis Insights',
      content,
      subsections: []
    };
  }

  /**
   * Renumber sections after insertion
   */
  private renumberSections(sections: DMPSection[]): void {
    sections.forEach((section, index) => {
      section.sectionNumber = (index + 1).toString();
    });
  }

  /**
   * Summarize module results for DMP metadata
   */
  private summarizeModuleResults(moduleResults: ModuleResult[]): any {
    const summary = {
      totalModules: moduleResults.length,
      successfulModules: moduleResults.filter(r => r.status === 'success').length,
      failedModules: moduleResults.filter(r => r.status === 'error').length,
      warningModules: moduleResults.filter(r => r.status === 'warning').length,
      totalRecommendations: moduleResults.reduce((sum, r) => sum + (r.recommendations?.length || 0), 0),
      totalModifications: moduleResults.reduce((sum, r) => sum + (r.dmpModifications?.length || 0), 0),
      executionMetrics: {
        totalTime: moduleResults.reduce((sum, r) => sum + r.metrics.executionTime, 0),
        averageTime: moduleResults.length > 0 ? 
          moduleResults.reduce((sum, r) => sum + r.metrics.executionTime, 0) / moduleResults.length : 0
      }
    };

    return summary;
  }
}

// Export singleton instance
export const dmpGenerator = new DMPGenerator();