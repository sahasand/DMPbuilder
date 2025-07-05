import { StudyProtocol, CRFSpecification, DMPSection } from '../types';
import { AnthropicClient } from '../api/anthropic-client';
import { GeminiClient } from '../api/gemini-client';
import { createModuleLogger, measurePerformance } from '../utils/logger';
import { clinicalStandards, dataManagementConfig } from '../core/config';

const logger = createModuleLogger('ai-content-generator');

export interface ContentGenerationOptions {
  preferredModel?: 'claude' | 'gemini';
  enhancementLevel?: 'basic' | 'professional' | 'regulatory';
  therapeuticArea?: string;
  studyComplexity?: 'low' | 'medium' | 'high';
  includeRegulatorySpecifics?: boolean;
}

export interface SectionContext {
  protocol: StudyProtocol;
  crfs: CRFSpecification[];
  studyMetadata: {
    therapeuticArea: string;
    complexity: string;
    riskLevel: string;
    regulatoryRegion: string[];
  };
  crossReferences: string[];
}

/**
 * AI-powered content generator for DMP sections
 * Creates study-specific, professional-quality content using rich contextual data
 */
export class AIContentGenerator {
  private claudeClient: AnthropicClient;
  private geminiClient: GeminiClient;
  
  constructor() {
    this.claudeClient = new AnthropicClient();
    this.geminiClient = new GeminiClient();
  }
  
  /**
   * Generate Overview section with AI enhancement
   */
  async generateOverviewSection(
    context: SectionContext,
    options: ContentGenerationOptions = {}
  ): Promise<DMPSection> {
    const { protocol, crfs, studyMetadata } = context;
    
    logger.info('Generating AI-enhanced Overview section', {
      studyTitle: protocol.studyTitle,
      therapeuticArea: studyMetadata.therapeuticArea,
      complexity: studyMetadata.complexity
    });
    
    const subsections = await Promise.all([
      this.generateIntroductionSubsection(context, options),
      this.generateStudyDesignSubsection(context, options),
      this.generateStudyPopulationSubsection(context, options),
      this.generateObjectivesSubsection(context, options),
      this.generateDataReviewFocusSubsection(context, options)
    ]);
    
    return {
      sectionNumber: '1',
      title: 'Overview of Project',
      content: '',
      subsections
    };
  }
  
  /**
   * Generate Data Management section with AI enhancement
   */
  async generateDataManagementSection(
    context: SectionContext,
    options: ContentGenerationOptions = {}
  ): Promise<DMPSection> {
    const subsections = await Promise.all([
      this.generateDataManagementApproachSubsection(context, options),
      this.generateEditChecksSubsection(context, options),
      this.generateQueryManagementSubsection(context, options),
      this.generateDataReviewProcessSubsection(context, options)
    ]);
    
    return {
      sectionNumber: '5',
      title: 'Data Cleaning Plan',
      content: '',
      subsections
    };
  }
  
  /**
   * Generate Safety Reporting section with AI enhancement
   */
  async generateSafetyReportingSection(
    context: SectionContext,
    options: ContentGenerationOptions = {}
  ): Promise<DMPSection> {
    const subsections = await Promise.all([
      this.generateAEReportingRequirementsSubsection(context, options),
      this.generateSAEProcessSubsection(context, options),
      this.generateSafetyCommunicationSubsection(context, options)
    ]);
    
    return {
      sectionNumber: '6',
      title: 'Reporting of AEs and SAEs',
      content: '',
      subsections
    };
  }
  
  /**
   * Generate Medical Coding section with AI enhancement
   */
  async generateMedicalCodingSection(
    context: SectionContext,
    options: ContentGenerationOptions = {}
  ): Promise<DMPSection> {
    const subsections = await Promise.all([
      this.generateDictionaryUseSubsection(context, options),
      this.generateCodingMethodologySubsection(context, options),
      this.generateMedDRAGuidelinesSubsection(context, options),
      this.generateWHODrugGuidelinesSubsection(context, options)
    ]);
    
    return {
      sectionNumber: '7',
      title: 'Medical Coding Process',
      content: '',
      subsections
    };
  }
  
  // Subsection generators with AI enhancement
  
  private async generateIntroductionSubsection(
    context: SectionContext,
    options: ContentGenerationOptions
  ): Promise<DMPSection> {
    const prompt = this.buildIntroductionPrompt(context);
    const content = await this.generateWithAI(prompt, 'introduction', options);
    
    return {
      sectionNumber: '1.1',
      title: 'Introduction',
      content,
      subsections: []
    };
  }
  
  private async generateStudyDesignSubsection(
    context: SectionContext,
    options: ContentGenerationOptions
  ): Promise<DMPSection> {
    const prompt = this.buildStudyDesignPrompt(context);
    const content = await this.generateWithAI(prompt, 'study_design', options);
    
    return {
      sectionNumber: '1.2',
      title: 'Study Design',
      content,
      subsections: []
    };
  }
  
  private async generateStudyPopulationSubsection(
    context: SectionContext,
    options: ContentGenerationOptions
  ): Promise<DMPSection> {
    const prompt = this.buildStudyPopulationPrompt(context);
    const content = await this.generateWithAI(prompt, 'study_population', options);
    
    return {
      sectionNumber: '1.3',
      title: 'Study Population',
      content,
      subsections: []
    };
  }
  
  private async generateObjectivesSubsection(
    context: SectionContext,
    options: ContentGenerationOptions
  ): Promise<DMPSection> {
    const prompt = this.buildObjectivesPrompt(context);
    const content = await this.generateWithAI(prompt, 'objectives', options);
    
    return {
      sectionNumber: '1.4',
      title: 'Objectives and Endpoints',
      content,
      subsections: []
    };
  }
  
  private async generateDataReviewFocusSubsection(
    context: SectionContext,
    options: ContentGenerationOptions
  ): Promise<DMPSection> {
    const prompt = this.buildDataReviewFocusPrompt(context);
    const content = await this.generateWithAI(prompt, 'data_review_focus', options);
    
    return {
      sectionNumber: '1.5',
      title: 'Data Review Focus',
      content,
      subsections: []
    };
  }
  
  private async generateDataManagementApproachSubsection(
    context: SectionContext,
    options: ContentGenerationOptions
  ): Promise<DMPSection> {
    const prompt = this.buildDataManagementApproachPrompt(context);
    const content = await this.generateWithAI(prompt, 'data_management_approach', options);
    
    return {
      sectionNumber: '5.1',
      title: 'Data Management Approach',
      content,
      subsections: []
    };
  }
  
  private async generateEditChecksSubsection(
    context: SectionContext,
    options: ContentGenerationOptions
  ): Promise<DMPSection> {
    const prompt = this.buildEditChecksPrompt(context);
    const content = await this.generateWithAI(prompt, 'edit_checks', options);
    
    return {
      sectionNumber: '5.2',
      title: 'Edit Checks, Warnings, and Notices',
      content,
      subsections: []
    };
  }
  
  private async generateQueryManagementSubsection(
    context: SectionContext,
    options: ContentGenerationOptions
  ): Promise<DMPSection> {
    const prompt = this.buildQueryManagementPrompt(context);
    const content = await this.generateWithAI(prompt, 'query_management', options);
    
    return {
      sectionNumber: '5.3',
      title: 'Query Management',
      content,
      subsections: []
    };
  }
  
  private async generateDataReviewProcessSubsection(
    context: SectionContext,
    options: ContentGenerationOptions
  ): Promise<DMPSection> {
    const prompt = this.buildDataReviewProcessPrompt(context);
    const content = await this.generateWithAI(prompt, 'data_review_process', options);
    
    return {
      sectionNumber: '5.4',
      title: 'Data Review Process',
      content,
      subsections: []
    };
  }
  
  private async generateAEReportingRequirementsSubsection(
    context: SectionContext,
    options: ContentGenerationOptions
  ): Promise<DMPSection> {
    const prompt = this.buildAEReportingPrompt(context);
    const content = await this.generateWithAI(prompt, 'ae_reporting', options);
    
    return {
      sectionNumber: '6.1',
      title: 'Reporting Requirements',
      content,
      subsections: []
    };
  }
  
  private async generateSAEProcessSubsection(
    context: SectionContext,
    options: ContentGenerationOptions
  ): Promise<DMPSection> {
    const prompt = this.buildSAEProcessPrompt(context);
    const content = await this.generateWithAI(prompt, 'sae_process', options);
    
    return {
      sectionNumber: '6.2',
      title: 'SAE Processing',
      content,
      subsections: []
    };
  }
  
  private async generateSafetyCommunicationSubsection(
    context: SectionContext,
    options: ContentGenerationOptions
  ): Promise<DMPSection> {
    const prompt = this.buildSafetyCommunicationPrompt(context);
    const content = await this.generateWithAI(prompt, 'safety_communication', options);
    
    return {
      sectionNumber: '6.3',
      title: 'Safety Communication',
      content,
      subsections: []
    };
  }
  
  private async generateDictionaryUseSubsection(
    context: SectionContext,
    options: ContentGenerationOptions
  ): Promise<DMPSection> {
    const prompt = this.buildDictionaryUsePrompt(context);
    const content = await this.generateWithAI(prompt, 'dictionary_use', options);
    
    return {
      sectionNumber: '7.1',
      title: 'Dictionary Use',
      content,
      subsections: []
    };
  }
  
  private async generateCodingMethodologySubsection(
    context: SectionContext,
    options: ContentGenerationOptions
  ): Promise<DMPSection> {
    const prompt = this.buildCodingMethodologyPrompt(context);
    const content = await this.generateWithAI(prompt, 'coding_methodology', options);
    
    return {
      sectionNumber: '7.2',
      title: 'Coding Methodology',
      content,
      subsections: []
    };
  }
  
  private async generateMedDRAGuidelinesSubsection(
    context: SectionContext,
    options: ContentGenerationOptions
  ): Promise<DMPSection> {
    const prompt = this.buildMedDRAGuidelinesPrompt(context);
    const content = await this.generateWithAI(prompt, 'meddra_guidelines', options);
    
    return {
      sectionNumber: '7.3',
      title: 'MedDRA Coding Guidelines',
      content,
      subsections: []
    };
  }
  
  private async generateWHODrugGuidelinesSubsection(
    context: SectionContext,
    options: ContentGenerationOptions
  ): Promise<DMPSection> {
    const prompt = this.buildWHODrugGuidelinesPrompt(context);
    const content = await this.generateWithAI(prompt, 'whodrug_guidelines', options);
    
    return {
      sectionNumber: '7.4',
      title: 'WHODrug Coding Guidelines',
      content,
      subsections: []
    };
  }
  
  // Prompt builders with rich context
  
  private buildIntroductionPrompt(context: SectionContext): string {
    const { protocol, studyMetadata } = context;
    
    return `Generate a professional introduction section for a Clinical Data Management Plan with the following context:

**Study Information:**
- Study Title: ${protocol.studyTitle}
- Protocol Number: ${protocol.protocolNumber}
- Study Phase: ${protocol.studyPhase}
- Sponsor: ${protocol.sponsor}
- Indication: ${protocol.indication}
- Therapeutic Area: ${studyMetadata.therapeuticArea}
- Study Complexity: ${studyMetadata.complexity}

**Requirements:**
1. Explain the purpose and scope of this Data Management Plan
2. Reference specific study characteristics and requirements
3. Mention integration with sponsor operations, clinical ops, statistics, and data management
4. Include regulatory considerations appropriate for ${protocol.studyPhase} studies
5. Address ${studyMetadata.therapeuticArea} specific data management considerations
6. Use professional clinical research terminology
7. Follow ICH-GCP guidelines

Create a comprehensive, study-specific introduction that demonstrates understanding of the unique data management requirements for this study.`;
  }
  
  private buildStudyDesignPrompt(context: SectionContext): string {
    const { protocol, studyMetadata } = context;
    const design = protocol.studyDesign;
    
    return `Generate a detailed study design description for a Data Management Plan with the following information:

**Study Design Details:**
- Type: ${design?.type || 'Not specified'}
- Duration: ${design?.duration || 'Not specified'}
- Number of Arms: ${design?.numberOfArms || 1}
- Description: ${design?.description || 'No additional description'}
- Study Parts: ${design?.parts ? JSON.stringify(design.parts) : 'None specified'}

**Study Context:**
- Therapeutic Area: ${studyMetadata.therapeuticArea}
- Study Phase: ${protocol.studyPhase}
- Indication: ${protocol.indication}
- Complexity: ${studyMetadata.complexity}

**Requirements:**
1. Provide comprehensive study design overview
2. Explain data management implications of the design
3. Address complexity considerations for data collection
4. Include ${studyMetadata.therapeuticArea} specific design considerations
5. Mention any special data collection requirements based on study type
6. Consider regulatory requirements for ${protocol.studyPhase} studies
7. Use clear, professional language suitable for regulatory review

Generate content that shows deep understanding of how study design impacts data management planning.`;
  }
  
  private buildStudyPopulationPrompt(context: SectionContext): string {
    const { protocol, studyMetadata } = context;
    const population = protocol.population;
    
    return `Generate a study population section for a Data Management Plan with the following details:

**Population Information:**
- Target Enrollment: ${population?.targetEnrollment || 'Not specified'}
- Age Range: ${population?.ageRange || 'Not specified'}
- Gender: ${population?.gender || 'Not specified'}
- Description: ${population?.description || 'Not specified'}

**Study Context:**
- Indication: ${protocol.indication}
- Study Phase: ${protocol.studyPhase}
- Therapeutic Area: ${studyMetadata.therapeuticArea}

**Inclusion Criteria:** ${protocol.inclusionCriteria?.join('; ') || 'Not provided'}
**Exclusion Criteria:** ${protocol.exclusionCriteria?.join('; ') || 'Not provided'}

**Requirements:**
1. Describe the target study population clearly
2. Explain data management considerations for this population
3. Address any special data collection needs based on population characteristics
4. Include considerations for ${studyMetadata.therapeuticArea} patients
5. Mention eligibility verification data management processes
6. Consider any population-specific regulatory requirements
7. Address diversity and inclusion data collection considerations

Create content that demonstrates understanding of population-specific data management challenges and opportunities.`;
  }
  
  private buildObjectivesPrompt(context: SectionContext): string {
    const { protocol, studyMetadata } = context;
    const objectives = protocol.objectives;
    const endpoints = protocol.endpoints;
    
    return `Generate an objectives and endpoints section for a Data Management Plan with the following information:

**Primary Objectives:**
${objectives?.primary?.map(obj => `- ${typeof obj === 'string' ? obj : obj.description}`).join('\n') || 'Not specified'}

**Secondary Objectives:**
${objectives?.secondary?.map(obj => `- ${typeof obj === 'string' ? obj : obj.description}`).join('\n') || 'Not specified'}

**Exploratory Objectives:**
${objectives?.exploratory?.map(obj => `- ${typeof obj === 'string' ? obj : obj.description}`).join('\n') || 'None specified'}

**Primary Endpoints:**
${endpoints?.primary?.map(ep => `- ${ep.name}: ${ep.description}`).join('\n') || 'Not specified'}

**Secondary Endpoints:**
${endpoints?.secondary?.map(ep => `- ${ep.name}: ${ep.description}`).join('\n') || 'Not specified'}

**Study Context:**
- Study Phase: ${protocol.studyPhase}
- Therapeutic Area: ${studyMetadata.therapeuticArea}
- Indication: ${protocol.indication}

**Requirements:**
1. Present objectives and endpoints in clear, organized format
2. Explain data management implications for each endpoint type
3. Address data collection requirements for ${studyMetadata.therapeuticArea} studies
4. Include data quality considerations for primary endpoints
5. Mention statistical analysis plan coordination requirements
6. Address regulatory submission requirements for endpoints
7. Include data review priorities based on endpoint importance

Generate content that shows understanding of how objectives and endpoints drive data management strategy.`;
  }
  
  private buildDataReviewFocusPrompt(context: SectionContext): string {
    const { protocol, crfs, studyMetadata } = context;
    
    return `Generate a data review focus section for a Data Management Plan with the following context:

**Study Information:**
- Study Phase: ${protocol.studyPhase}
- Therapeutic Area: ${studyMetadata.therapeuticArea}
- Study Complexity: ${studyMetadata.complexity}
- Number of CRFs: ${crfs.length}

**Key CRFs:**
${crfs.slice(0, 5).map(crf => `- ${crf.formName}`).join('\n')}

**Primary Endpoints:**
${protocol.endpoints?.primary?.map(ep => `- ${ep.name}`).join('\n') || 'Not specified'}

**Requirements:**
1. Define data review priorities based on study objectives
2. Explain endpoint-focused review strategy
3. Address ${studyMetadata.therapeuticArea} specific review considerations
4. Include regulatory submission data quality requirements
5. Mention risk-based monitoring considerations
6. Address critical data points requiring enhanced review
7. Include documentation and audit trail requirements

Create a comprehensive data review strategy that reflects the study's unique characteristics and regulatory requirements.`;
  }
  
  private buildDataManagementApproachPrompt(context: SectionContext): string {
    const { protocol, crfs, studyMetadata } = context;
    
    return `Generate a data management approach section for a Data Management Plan with the following context:

**Study Context:**
- Study Phase: ${protocol.studyPhase}
- Therapeutic Area: ${studyMetadata.therapeuticArea}
- Study Complexity: ${studyMetadata.complexity}
- Risk Level: ${studyMetadata.riskLevel}
- Number of CRFs: ${crfs.length}

**CRF Complexity:**
${crfs.map(crf => `- ${crf.formName}: ${crf.fields?.length || 0} fields`).join('\n')}

**Requirements:**
1. Describe overall data management strategy
2. Explain approach based on study complexity and risk
3. Address ${studyMetadata.therapeuticArea} specific requirements
4. Include technology and system considerations
5. Mention data flow and integration processes
6. Address regulatory compliance approach
7. Include quality assurance methodology

Generate a strategic overview that demonstrates sophisticated understanding of data management principles for this study type.`;
  }
  
  private buildEditChecksPrompt(context: SectionContext): string {
    const { protocol, crfs, studyMetadata } = context;
    
    return `Generate an edit checks section for a Data Management Plan with the following context:

**Study Information:**
- Therapeutic Area: ${studyMetadata.therapeuticArea}
- Study Phase: ${protocol.studyPhase}
- Study Complexity: ${studyMetadata.complexity}

**Key Data Types:**
${crfs.map(crf => `- ${crf.formName}: ${crf.description || 'Clinical data form'}`).join('\n')}

**Requirements:**
1. Define comprehensive edit check strategy
2. Include valid-value, valid-range, and missing-value checks
3. Address ${studyMetadata.therapeuticArea} specific validation needs
4. Include cross-form consistency checks
5. Mention temporal consistency validations
6. Address regulatory data quality requirements
7. Include user-friendly error messaging strategy

Create detailed edit check specifications that ensure high data quality while maintaining user efficiency.`;
  }
  
  private buildQueryManagementPrompt(context: SectionContext): string {
    const { protocol, studyMetadata } = context;
    
    return `Generate a query management section for a Data Management Plan with the following context:

**Study Information:**
- Study Phase: ${protocol.studyPhase}
- Therapeutic Area: ${studyMetadata.therapeuticArea}
- Study Complexity: ${studyMetadata.complexity}

**Configuration:**
- Site Response Time: ${dataManagementConfig.query.responseTimeDays} business days
- Query Closure Time: ${dataManagementConfig.query.closureTimeDays} business days

**Requirements:**
1. Define query lifecycle and management process
2. Explain query prioritization strategy
3. Address ${studyMetadata.therapeuticArea} specific query considerations
4. Include query escalation procedures
5. Mention quality metrics and tracking
6. Address regulatory inspection readiness
7. Include communication protocols with sites

Generate a comprehensive query management strategy that ensures efficient resolution while maintaining data quality.`;
  }
  
  private buildDataReviewProcessPrompt(context: SectionContext): string {
    const { protocol, crfs, studyMetadata } = context;
    
    return `Generate a data review process section for a Data Management Plan with the following context:

**Study Information:**
- Study Phase: ${protocol.studyPhase}
- Therapeutic Area: ${studyMetadata.therapeuticArea}
- Study Complexity: ${studyMetadata.complexity}

**Key Review Areas:**
${protocol.endpoints?.primary?.map(ep => `- Primary Endpoint: ${ep.name}`).join('\n') || ''}
${protocol.endpoints?.secondary?.map(ep => `- Secondary Endpoint: ${ep.name}`).join('\n') || ''}

**CRF Portfolio:**
${crfs.slice(0, 8).map(crf => `- ${crf.formName}`).join('\n')}

**Requirements:**
1. Define systematic data review methodology
2. Explain milestone-based review strategy
3. Address ${studyMetadata.therapeuticArea} specific review priorities
4. Include cross-time point analysis procedures
5. Mention statistical review coordination
6. Address regulatory submission preparation
7. Include data quality metrics and reporting

Create a robust data review process that ensures regulatory submission readiness and study integrity.`;
  }
  
  private buildAEReportingPrompt(context: SectionContext): string {
    const { protocol, studyMetadata } = context;
    
    return `Generate an AE reporting requirements section for a Data Management Plan with the following context:

**Study Information:**
- Study Phase: ${protocol.studyPhase}
- Therapeutic Area: ${studyMetadata.therapeuticArea}
- Indication: ${protocol.indication}
- Investigational Drug: ${protocol.investigationalDrug}

**Safety Configuration:**
- SAE Reporting Timeframe: ${dataManagementConfig.sae.reportingTimeframe} hours
- Email Notifications: ${dataManagementConfig.sae.notificationEmails ? 'Enabled' : 'Disabled'}

**Requirements:**
1. Define comprehensive AE data collection requirements
2. Address ${studyMetadata.therapeuticArea} specific safety considerations
3. Explain relationship between safety data and efficacy assessments
4. Include data quality requirements for safety reporting
5. Address regulatory reporting timeline compliance
6. Include investigational product specific considerations
7. Mention pharmacovigilance database integration

Generate detailed AE reporting requirements that ensure patient safety and regulatory compliance.`;
  }
  
  private buildSAEProcessPrompt(context: SectionContext): string {
    const { protocol, studyMetadata } = context;
    
    return `Generate an SAE processing section for a Data Management Plan with the following context:

**Study Information:**
- Study Phase: ${protocol.studyPhase}
- Therapeutic Area: ${studyMetadata.therapeuticArea}
- Indication: ${protocol.indication}

**Configuration:**
- Reporting Timeframe: ${dataManagementConfig.sae.reportingTimeframe} hours
- Notification System: ${dataManagementConfig.sae.notificationEmails ? 'Automated email alerts' : 'Manual notification'}

**Requirements:**
1. Define SAE data capture and processing workflow
2. Address expedited reporting requirements
3. Include ${studyMetadata.therapeuticArea} specific SAE considerations
4. Explain data quality requirements for SAE reporting
5. Include regulatory authority notification processes
6. Address follow-up data collection procedures
7. Mention causality assessment data requirements

Create comprehensive SAE processing procedures that ensure rapid, accurate safety reporting.`;
  }
  
  private buildSafetyCommunicationPrompt(context: SectionContext): string {
    const { protocol, studyMetadata } = context;
    
    return `Generate a safety communication section for a Data Management Plan with the following context:

**Study Information:**
- Study Phase: ${protocol.studyPhase}
- Therapeutic Area: ${studyMetadata.therapeuticArea}
- Study Complexity: ${studyMetadata.complexity}

**Requirements:**
1. Define safety communication protocols
2. Address internal and external communication requirements
3. Include ${studyMetadata.therapeuticArea} specific safety communication needs
4. Explain emergency communication procedures
5. Include regulatory authority communication protocols
6. Address site communication and training requirements
7. Mention safety review committee coordination

Generate comprehensive safety communication procedures that ensure all stakeholders receive timely, accurate safety information.`;
  }
  
  private buildDictionaryUsePrompt(context: SectionContext): string {
    const { protocol, studyMetadata } = context;
    
    return `Generate a dictionary use section for a Data Management Plan with the following context:

**Study Information:**
- Therapeutic Area: ${studyMetadata.therapeuticArea}
- Study Phase: ${protocol.studyPhase}
- Indication: ${protocol.indication}

**Dictionary Versions:**
- MedDRA: Version ${clinicalStandards.meddra.version}
- WHODrug: Version ${clinicalStandards.whodrug.version}

**Requirements:**
1. Explain dictionary selection rationale
2. Address ${studyMetadata.therapeuticArea} specific coding considerations
3. Include version control and update procedures
4. Mention regulatory submission requirements
5. Address multilingual coding considerations if applicable
6. Include quality assurance procedures
7. Explain integration with EDC systems

Generate dictionary use guidelines that ensure consistent, high-quality medical coding throughout the study.`;
  }
  
  private buildCodingMethodologyPrompt(context: SectionContext): string {
    const { protocol, studyMetadata } = context;
    
    return `Generate a coding methodology section for a Data Management Plan with the following context:

**Study Information:**
- Therapeutic Area: ${studyMetadata.therapeuticArea}
- Study Phase: ${protocol.studyPhase}
- Study Complexity: ${studyMetadata.complexity}

**Requirements:**
1. Define medical coding workflow and procedures
2. Address ${studyMetadata.therapeuticArea} specific coding challenges
3. Include auto-coding and manual review processes
4. Explain quality assurance and oversight procedures
5. Include coder training and qualification requirements
6. Address regulatory compliance and audit readiness
7. Mention coding query resolution procedures

Create a robust coding methodology that ensures accurate, consistent medical coding throughout the study lifecycle.`;
  }
  
  private buildMedDRAGuidelinesPrompt(context: SectionContext): string {
    const { protocol, studyMetadata } = context;
    
    return `Generate MedDRA coding guidelines for a Data Management Plan with the following context:

**Study Information:**
- Therapeutic Area: ${studyMetadata.therapeuticArea}
- Study Phase: ${protocol.studyPhase}
- Indication: ${protocol.indication}
- MedDRA Version: ${clinicalStandards.meddra.version}

**Requirements:**
1. Provide specific MedDRA coding guidelines
2. Address ${studyMetadata.therapeuticArea} specific coding considerations
3. Include preferred term selection criteria
4. Explain system organ class assignments
5. Address combination events and complex cases
6. Include quality control procedures
7. Mention regulatory submission considerations

Generate detailed MedDRA guidelines that ensure consistent, accurate adverse event coding for this study type.`;
  }
  
  private buildWHODrugGuidelinesPrompt(context: SectionContext): string {
    const { protocol, studyMetadata } = context;
    
    return `Generate WHODrug coding guidelines for a Data Management Plan with the following context:

**Study Information:**
- Therapeutic Area: ${studyMetadata.therapeuticArea}
- Study Phase: ${protocol.studyPhase}
- WHODrug Version: ${clinicalStandards.whodrug.version}

**Requirements:**
1. Provide specific WHODrug coding guidelines
2. Address ${studyMetadata.therapeuticArea} medication coding considerations
3. Include trade name vs. generic name preferences
4. Explain combination product coding procedures
5. Address investigational product coding
6. Include quality control procedures
7. Mention regulatory submission requirements

Generate comprehensive WHODrug guidelines that ensure accurate medication coding throughout the study.`;
  }
  
  /**
   * Generate content using appropriate AI model
   */
  private async generateWithAI(
    prompt: string,
    sectionType: string,
    options: ContentGenerationOptions
  ): Promise<string> {
    const useClaudeForSection = this.shouldUseClaudeForSection(sectionType, options);
    
    try {
      if (useClaudeForSection) {
        return await measurePerformance(
          'ai-content.claude',
          () => this.claudeClient.enhanceSection(prompt, sectionType)
        );
      } else {
        // Use Gemini for content generation
        return await measurePerformance(
          'ai-content.gemini',
          () => this.generateWithGemini(prompt, sectionType)
        );
      }
    } catch (error) {
      logger.warn('AI content generation failed, using fallback', { 
        sectionType, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      return this.generateFallbackContent(sectionType);
    }
  }
  
  /**
   * Generate content using Gemini client
   */
  private async generateWithGemini(prompt: string, sectionType: string): Promise<string> {
    const systemPrompt = `You are a clinical data management expert creating professional DMP content. 
    Generate comprehensive, regulatory-compliant content for the ${sectionType} section.
    
    Important requirements:
    - Write detailed, specific content tailored to the study details provided
    - Include all regulatory requirements and clinical best practices
    - Use professional clinical research terminology
    - Format the output in clean markdown with appropriate headers and subsections
    - Do not include any placeholder text or generic content
    - Make the content specific to the therapeutic area and study phase mentioned`;
    
    const fullPrompt = `${systemPrompt}\n\n${prompt}`;
    
    // Call Gemini API directly for content generation
    const response = await this.geminiClient.generateContent(fullPrompt);
    return response;
  }
  
  /**
   * Determine which AI model to use for specific section types
   */
  private shouldUseClaudeForSection(sectionType: string, options: ContentGenerationOptions): boolean {
    if (options.preferredModel) {
      return options.preferredModel === 'claude';
    }
    
    // Use Claude for critical, regulatory-focused sections
    const claudeSections = [
      'introduction', 'objectives', 'ae_reporting', 'sae_process', 
      'safety_communication', 'meddra_guidelines', 'whodrug_guidelines'
    ];
    
    return claudeSections.includes(sectionType);
  }
  
  /**
   * Generate fallback content when AI generation fails
   */
  private generateFallbackContent(sectionType: string): string {
    const fallbackContent: Record<string, string> = {
      introduction: 'This Data Management Plan defines the data management processes for this clinical study, ensuring data quality, integrity, and regulatory compliance.',
      study_design: 'This study follows a structured design appropriate for the indication and study phase, with data collection procedures tailored to study objectives.',
      study_population: 'The study population has been selected to address the research objectives while ensuring participant safety and data quality.',
      objectives: 'Study objectives and endpoints are designed to evaluate the investigational product according to regulatory guidelines.',
      data_review_focus: 'Data review will focus on endpoint data, comprehensive data review, and proper documentation of all activities.',
      data_management_approach: 'The data management approach follows industry best practices and regulatory requirements for clinical trial data.',
      edit_checks: 'Edit checks include valid-value alerts, valid-range alerts, missing-value alerts, warnings, and helpful notices.',
      query_management: 'Query management follows established timelines and procedures to ensure data quality and study timeline adherence.',
      data_review_process: 'Data review includes scheduled exports, ongoing review, cross-time point analysis, and query management.',
      ae_reporting: 'Adverse event reporting follows regulatory requirements and timelines to ensure participant safety.',
      sae_process: 'Serious adverse events are processed according to expedited reporting requirements and safety protocols.',
      safety_communication: 'Safety communication protocols ensure timely, accurate information sharing among all stakeholders.',
      dictionary_use: 'Medical dictionaries are used according to current versions and regulatory requirements.',
      coding_methodology: 'Medical coding follows established methodologies with appropriate quality assurance procedures.',
      meddra_guidelines: 'MedDRA coding follows current guidelines and regulatory requirements for adverse event coding.',
      whodrug_guidelines: 'WHODrug coding follows established procedures for accurate medication coding.'
    };
    
    return fallbackContent[sectionType] || 'Professional clinical data management content for this section.';
  }
  
  /**
   * Analyze study context to determine metadata
   */
  static analyzeStudyContext(protocol: StudyProtocol, crfs: CRFSpecification[]): SectionContext['studyMetadata'] {
    const therapeuticArea = this.detectTherapeuticArea(protocol);
    const complexity = this.assessStudyComplexity(protocol, crfs);
    const riskLevel = this.assessRiskLevel(protocol, therapeuticArea);
    const regulatoryRegion = this.determineRegulatoryRegions(protocol);
    
    return {
      therapeuticArea,
      complexity,
      riskLevel,
      regulatoryRegion
    };
  }
  
  private static detectTherapeuticArea(protocol: StudyProtocol): string {
    const indication = protocol.indication?.toLowerCase() || '';
    const title = protocol.studyTitle?.toLowerCase() || '';
    
    if (indication.includes('cancer') || indication.includes('oncology') || title.includes('tumor')) {
      return 'Oncology';
    } else if (indication.includes('cardiac') || indication.includes('cardiovascular') || indication.includes('heart')) {
      return 'Cardiovascular';
    } else if (indication.includes('diabetes') || indication.includes('metabolic')) {
      return 'Endocrinology';
    } else if (indication.includes('neuro') || indication.includes('alzheimer') || indication.includes('parkinson')) {
      return 'Neurology';
    } else if (indication.includes('infectious') || indication.includes('viral') || indication.includes('bacterial')) {
      return 'Infectious Disease';
    } else if (indication.includes('rare') || indication.includes('orphan')) {
      return 'Rare Disease';
    }
    
    return 'General Medicine';
  }
  
  private static assessStudyComplexity(protocol: StudyProtocol, crfs: CRFSpecification[]): string {
    let complexityScore = 0;
    
    // Phase complexity
    if (protocol.studyPhase === 'Phase 1') complexityScore += 1;
    else if (protocol.studyPhase === 'Phase 2') complexityScore += 2;
    else if (protocol.studyPhase === 'Phase 3') complexityScore += 3;
    else if (protocol.studyPhase === 'Phase 4') complexityScore += 1;
    
    // Enrollment complexity
    const enrollment = protocol.population?.targetEnrollment || 0;
    if (enrollment > 500) complexityScore += 2;
    else if (enrollment > 100) complexityScore += 1;
    
    // CRF complexity
    if (crfs.length > 15) complexityScore += 2;
    else if (crfs.length > 8) complexityScore += 1;
    
    // Design complexity
    if (protocol.studyDesign?.numberOfArms && protocol.studyDesign.numberOfArms > 2) complexityScore += 1;
    if (protocol.studyDesign?.parts && protocol.studyDesign.parts.length > 1) complexityScore += 1;
    
    if (complexityScore >= 5) return 'high';
    else if (complexityScore >= 3) return 'medium';
    else return 'low';
  }
  
  private static assessRiskLevel(protocol: StudyProtocol, therapeuticArea: string): string {
    let riskScore = 0;
    
    // Therapeutic area risk
    if (['Oncology', 'Rare Disease'].includes(therapeuticArea)) riskScore += 2;
    else if (['Cardiovascular', 'Neurology'].includes(therapeuticArea)) riskScore += 1;
    
    // Phase risk
    if (protocol.studyPhase === 'Phase 1') riskScore += 2;
    else if (protocol.studyPhase === 'Phase 2') riskScore += 1;
    
    // Population risk
    if (protocol.population?.ageRange?.includes('pediatric') || protocol.population?.ageRange?.includes('elderly')) {
      riskScore += 1;
    }
    
    if (riskScore >= 3) return 'high';
    else if (riskScore >= 1) return 'medium';
    else return 'low';
  }
  
  private static determineRegulatoryRegions(protocol: StudyProtocol): string[] {
    // Default assumption - could be enhanced with actual study location data
    const regions = ['FDA', 'EMA'];
    
    // Add specific regions based on study characteristics
    if (protocol.indication?.toLowerCase().includes('rare')) {
      regions.push('PMDA'); // Japan often involved in rare disease studies
    }
    
    return regions;
  }
}

// Export singleton instance
export const aiContentGenerator = new AIContentGenerator();

// Export factory function
export function createAIContentGenerator(): AIContentGenerator {
  return new AIContentGenerator();
}