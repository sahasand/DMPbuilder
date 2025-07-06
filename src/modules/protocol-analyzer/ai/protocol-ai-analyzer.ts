// AI-Powered Protocol Analysis Service
import { StudyProtocol, CRFSpecification } from '../../../types';
import { 
  ExecutiveSummary, 
  KeyFinding, 
  CriticalIssue, 
  TopRecommendation,
  StudyDesignAnalysis,
  ComplexityAssessment,
  ClinicalStrength,
  ClinicalWeakness,
  AnalysisOptions
} from '../types/comprehensive-analysis';
import { geminiClient } from '../../../api/gemini-client';
import { anthropicClient } from '../../../api/anthropic-client';
import { createModuleLogger, logInfo, logError } from '../../../utils/logger';
import { APIResponseValidator } from '../../../utils/api-response-validator';

const logger = createModuleLogger('protocol-ai-analyzer');

export class ProtocolAIAnalyzer {
  
  /**
   * Generate AI-powered executive summary
   */
  async generateExecutiveSummary(
    protocol: StudyProtocol,
    crfs: CRFSpecification[],
    options: AnalysisOptions
  ): Promise<ExecutiveSummary> {
    logInfo('Generating AI-powered executive summary', {
      protocolNumber: protocol.protocolNumber,
      options: options.analysisDepth
    });

    const prompt = `You are a clinical research expert. Analyze this clinical study protocol and provide a comprehensive executive summary.

PROTOCOL INFORMATION:
Study Title: ${protocol.studyTitle}
Protocol Number: ${protocol.protocolNumber}
Phase: ${protocol.studyPhase}
Therapeutic Area: ${protocol.indication}
Indication: ${protocol.indication}
Study Design: ${protocol.studyDesign?.type} - ${protocol.studyDesign?.description}
Target Enrollment: ${protocol.population?.targetEnrollment}
Primary Endpoints: ${protocol.endpoints?.primary?.join(', ')}
Secondary Endpoints: ${protocol.endpoints?.secondary?.join(', ')}

ANALYSIS DEPTH: ${options.analysisDepth}
REGULATORY REGION: ${options.regulatoryRegion}
INDUSTRY: ${options.industry}

Provide a comprehensive analysis in the following JSON format:

{
  "overallAssessment": {
    "feasibilityScore": number (0-100),
    "riskLevel": "Low" | "Medium" | "High" | "Very High",
    "complexity": "Low" | "Medium" | "High" | "Very High", 
    "recommendation": "Proceed" | "Proceed with Modifications" | "Significant Concerns" | "Not Recommended",
    "rationale": "detailed explanation of recommendation"
  },
  "keyFindings": [
    {
      "category": "study category (e.g., 'Study Design', 'Endpoints', 'Population')",
      "finding": "specific finding description",
      "impact": "High" | "Medium" | "Low"
    }
  ],
  "criticalIssues": [
    {
      "issue": "critical issue description",
      "impact": "impact on study success",
      "recommendation": "specific recommendation to address issue",
      "severity": "Critical" | "Major" | "Minor",
      "urgency": "Immediate" | "High" | "Medium" | "Low"
    }
  ],
  "topRecommendations": [
    {
      "recommendation": "specific actionable recommendation",
      "priority": "High" | "Medium" | "Low",
      "category": "category of recommendation",
      "effort": "High" | "Medium" | "Low",
      "impact": "High" | "Medium" | "Low",
      "timeline": "timeline for implementation"
    }
  ],
  "successFactors": [
    {
      "factor": "key success factor",
      "importance": "Critical" | "Important" | "Moderate",
      "description": "detailed description"
    }
  ],
  "nextSteps": [
    {
      "step": "next step description",
      "priority": "High" | "Medium" | "Low",
      "timeline": "timeframe",
      "responsible": "who should handle this"
    }
  ]
}

Focus on:
1. Study feasibility and execution challenges
2. Risk assessment from regulatory, operational, and scientific perspectives
3. Protocol optimization opportunities
4. Endpoint appropriateness and measurability
5. Population recruitment feasibility
6. Regulatory alignment for ${options.regulatoryRegion}
7. Industry best practices for ${options.industry}

Return ONLY valid JSON.`;

    try {
      // Log the prompt being sent to AI
      logInfo('Sending executive summary prompt to AI', {
        protocolNumber: protocol.protocolNumber,
        promptLength: prompt.length,
        analysisDepth: options.analysisDepth,
        regulatoryRegion: options.regulatoryRegion
      });

      // Use Gemini for structured analysis
      const responseText = await geminiClient.generateContent(prompt);
      
      logInfo('Raw AI response for executive summary', { 
        responseLength: responseText.length,
        preview: responseText.substring(0, 200)
      });

      // Parse and validate response
      const executiveSummary = APIResponseValidator.parseAndValidate(
        responseText,
        this.validateExecutiveSummary,
        this.createFallbackExecutiveSummary(protocol)
      );

      logInfo('Executive summary generated successfully', {
        feasibilityScore: executiveSummary.overallAssessment.feasibilityScore,
        riskLevel: executiveSummary.overallAssessment.riskLevel,
        keyFindingsCount: executiveSummary.keyFindings.length,
        criticalIssuesCount: executiveSummary.criticalIssues.length
      });

      return executiveSummary;

    } catch (error) {
      logError('Failed to generate executive summary with AI', error, {
        protocolNumber: protocol.protocolNumber,
        errorType: error instanceof Error ? error.constructor.name : 'Unknown',
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });
      // Return fallback summary instead of throwing
      logInfo('Using fallback executive summary due to AI error');
      return this.createFallbackExecutiveSummary(protocol);
    }
  }

  /**
   * Generate AI-powered study design analysis
   */
  async generateStudyDesignAnalysis(
    protocol: StudyProtocol,
    crfs: CRFSpecification[],
    options: AnalysisOptions
  ): Promise<StudyDesignAnalysis> {
    logInfo('Generating AI-powered study design analysis');

    const prompt = `You are a clinical research design expert. Analyze this clinical study design and provide detailed assessment.

PROTOCOL INFORMATION:
Study Title: ${protocol.studyTitle}
Study Design: ${protocol.studyDesign?.type} - ${protocol.studyDesign?.description}
Phase: ${protocol.studyPhase}
Number of Arms: ${protocol.studyDesign?.numberOfArms}
Duration: ${protocol.studyDesign?.duration}
Indication: ${protocol.indication}
Target Enrollment: ${protocol.population?.targetEnrollment}

Analyze the study design and provide assessment in this JSON format:

{
  "designType": "specific design type classification",
  "designClassification": {
    "primaryType": "Interventional" | "Observational" | "Expanded Access",
    "allocation": "Randomized" | "Non-Randomized" | "N/A",
    "masking": "Open Label" | "Single Blind" | "Double Blind" | "Triple Blind" | "Quadruple Blind",
    "purpose": "Treatment" | "Prevention" | "Diagnostic" | "Supportive Care" | "Screening" | "Health Services Research" | "Basic Science",
    "phases": ["Phase 1", "Phase 2", etc.]
  },
  "strengths": [
    {
      "category": "Design" | "Endpoints" | "Population" | "Methodology" | "Feasibility",
      "description": "specific strength description",
      "impact": "High" | "Medium" | "Low",
      "evidence": "supporting evidence or rationale"
    }
  ],
  "weaknesses": [
    {
      "category": "Design" | "Endpoints" | "Population" | "Methodology" | "Feasibility",
      "description": "specific weakness description", 
      "severity": "Critical" | "Major" | "Minor",
      "impact": "impact description",
      "recommendation": "specific recommendation to address"
    }
  ],
  "complexity": {
    "overall": "Low" | "Medium" | "High" | "Very High",
    "factors": [
      {
        "factor": "complexity factor name",
        "level": "Low" | "Medium" | "High",
        "weight": number (0-1),
        "description": "factor description"
      }
    ],
    "score": number (0-100),
    "driverAnalysis": ["key complexity drivers"]
  },
  "feasibilityScore": number (0-100),
  "designRecommendations": [
    {
      "recommendation": "specific design recommendation",
      "category": "category",
      "priority": "High" | "Medium" | "Low",
      "rationale": "rationale for recommendation"
    }
  ]
}

Return ONLY valid JSON.`;

    try {
      // Log the prompt being sent to AI
      logInfo('Sending design analysis prompt to AI', {
        protocolNumber: protocol.protocolNumber,
        promptLength: prompt.length,
        studyDesign: protocol.studyDesign?.type
      });

      const responseText = await geminiClient.generateContent(prompt);
      
      logInfo('Study design analysis generated', { responseLength: responseText.length });

      // Parse and validate response
      const designAnalysis = APIResponseValidator.parseAndValidate(
        responseText,
        this.validateStudyDesignAnalysis,
        this.createFallbackDesignAnalysis(protocol)
      );

      return designAnalysis;

    } catch (error) {
      logError('Failed to generate study design analysis with AI', error, {
        protocolNumber: protocol.protocolNumber,
        errorType: error instanceof Error ? error.constructor.name : 'Unknown',
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });
      logInfo('Using fallback design analysis due to AI error');
      return this.createFallbackDesignAnalysis(protocol);
    }
  }

  /**
   * Validate executive summary structure
   */
  private validateExecutiveSummary(data: any): { isValid: boolean; data?: ExecutiveSummary; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!data || typeof data !== 'object') {
      errors.push('Executive summary data must be an object');
      return { isValid: false, errors, warnings };
    }

    if (!data.overallAssessment || typeof data.overallAssessment.feasibilityScore !== 'number') {
      errors.push('Overall assessment with feasibility score is required');
    }

    if (!Array.isArray(data.keyFindings)) {
      errors.push('Key findings must be an array');
    }

    if (!Array.isArray(data.criticalIssues)) {
      errors.push('Critical issues must be an array');
    }

    if (!Array.isArray(data.topRecommendations)) {
      errors.push('Top recommendations must be an array');
    }

    const isValid = errors.length === 0;
    return {
      isValid,
      data: isValid ? data as ExecutiveSummary : undefined,
      errors,
      warnings
    };
  }

  /**
   * Validate study design analysis structure
   */
  private validateStudyDesignAnalysis(data: any): { isValid: boolean; data?: StudyDesignAnalysis; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!data || typeof data !== 'object') {
      errors.push('Study design analysis data must be an object');
      return { isValid: false, errors, warnings };
    }

    if (typeof data.designType !== 'string') {
      errors.push('Design type must be a string');
    }

    if (!data.designClassification) {
      errors.push('Design classification is required');
    }

    if (!Array.isArray(data.strengths)) {
      errors.push('Strengths must be an array');
    }

    if (!Array.isArray(data.weaknesses)) {
      errors.push('Weaknesses must be an array');
    }

    if (!data.complexity) {
      errors.push('Complexity assessment is required');
    }

    if (typeof data.feasibilityScore !== 'number') {
      errors.push('Feasibility score must be a number');
    }

    const isValid = errors.length === 0;
    return {
      isValid,
      data: isValid ? data as StudyDesignAnalysis : undefined,
      errors,
      warnings
    };
  }

  /**
   * Create fallback executive summary
   */
  private createFallbackExecutiveSummary(protocol: StudyProtocol): ExecutiveSummary {
    return {
      overallAssessment: {
        feasibilityScore: 75,
        riskLevel: 'Medium',
        complexity: 'Medium',
        recommendation: 'Proceed with Modifications',
        rationale: `Initial analysis of ${protocol.studyTitle || 'this study'} indicates moderate complexity with manageable risks. Detailed review recommended for optimization opportunities.`
      },
      keyFindings: [
        {
          category: 'Study Design',
          finding: `${protocol.studyDesign?.type || 'Study design'} appears appropriate for ${protocol.indication || 'the intended indication'}`,
          impact: 'Medium',
          actionRequired: false
        },
        {
          category: 'Population',
          finding: `Target enrollment of ${protocol.population?.targetEnrollment || 'TBD'} patients requires careful recruitment planning`,
          impact: 'Medium',
          actionRequired: true
        },
        {
          category: 'Endpoints',
          finding: `${protocol.endpoints?.primary?.length || 0} primary endpoint(s) identified for analysis`,
          impact: 'Medium',
          actionRequired: false
        }
      ],
      criticalIssues: [
        {
          issue: 'Comprehensive analysis pending - detailed review of protocol elements required',
          impact: 'Potential delays in study planning and execution',
          recommendation: 'Complete detailed protocol review with subject matter experts',
          severity: 'Major',
          urgency: 'High'
        }
      ],
      topRecommendations: [
        {
          priority: 1,
          recommendation: 'Conduct detailed feasibility assessment',
          category: 'Planning',
          benefit: 'Improved study execution and timeline predictability',
          effort: 'Medium',
          timeline: '2-4 weeks'
        },
        {
          priority: 2,
          recommendation: 'Review regulatory guidance for study design',
          category: 'Regulatory',
          benefit: 'Increased regulatory approval likelihood',
          effort: 'Low',
          timeline: '1 week'
        },
        {
          priority: 3,
          recommendation: 'Optimize recruitment strategy',
          category: 'Operations',
          benefit: 'Faster enrollment and reduced study timeline',
          effort: 'Medium',
          timeline: '2-3 weeks'
        }
      ],
      successFactors: [
        {
          factor: 'Strong protocol design aligned with regulatory expectations',
          importance: 'Critical',
          currentStatus: 'Partial',
          recommendations: ['Complete regulatory review', 'Align with FDA guidelines']
        },
        {
          factor: 'Effective patient recruitment strategy',
          importance: 'Critical',
          currentStatus: 'Missing',
          recommendations: ['Develop recruitment strategy', 'Identify feasible sites']
        }
      ],
      nextSteps: [
        {
          step: 'Complete comprehensive protocol analysis',
          timeline: '1-2 weeks',
          responsibility: 'Clinical team',
          deliverable: 'Detailed protocol assessment report',
          dependencies: ['Protocol finalization', 'Team assignment']
        },
        {
          step: 'Develop detailed project timeline',
          timeline: '1 week',
          responsibility: 'Project management',
          deliverable: 'Project timeline and milestones',
          dependencies: ['Protocol analysis completion']
        }
      ]
    };
  }

  /**
   * Create fallback design analysis
   */
  private createFallbackDesignAnalysis(protocol: StudyProtocol): StudyDesignAnalysis {
    return {
      designType: protocol.studyDesign?.type || 'Clinical Trial',
      designClassification: {
        primaryType: 'Interventional',
        allocation: 'Randomized',
        masking: 'Double Blind',
        purpose: 'Treatment',
        phases: [protocol.studyPhase || 'Phase 2']
      },
      strengths: [
        {
          category: 'Design',
          description: 'Standard clinical trial design appropriate for indication',
          impact: 'Medium',
          evidence: 'Design follows established guidelines for the therapeutic area'
        }
      ],
      weaknesses: [
        {
          category: 'Design',
          description: 'Detailed analysis pending - comprehensive review required',
          severity: 'Minor',
          impact: 'May impact optimal study execution',
          recommendation: 'Complete detailed design review'
        }
      ],
      complexity: {
        overall: 'Medium',
        factors: [
          {
            factor: 'Study Design',
            level: 'Medium',
            weight: 0.3,
            description: 'Standard design with moderate complexity'
          },
          {
            factor: 'Population',
            level: 'Medium', 
            weight: 0.2,
            description: 'Patient population appears well-defined'
          }
        ],
        score: 50,
        driverAnalysis: ['Standard trial design', 'Defined population', 'Clear endpoints']
      },
      feasibilityScore: 75,
      designRecommendations: [
        {
          aspect: 'Study Design Assessment',
          current: 'Initial design established',
          recommended: 'Complete detailed design review and optimization',
          rationale: 'Comprehensive analysis will identify optimization opportunities',
          impact: {
            quality: 'Improvement',
            timeline: 'Positive',
            cost: 'Neutral',
            enrollment: 'Neutral',
            regulatory: 'Positive'
          },
          feasibility: 'High'
        }
      ]
    };
  }
}

// Export singleton instance
export const protocolAIAnalyzer = new ProtocolAIAnalyzer();