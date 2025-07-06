// Enhanced Clinical Viability Assessment Service
import { StudyProtocol, CRFSpecification } from '../../../types';
import { 
  ExecutiveSummary, 
  KeyFinding, 
  CriticalIssue, 
  TopRecommendation,
  StudyDesignAnalysis,
  AnalysisOptions
} from '../types/comprehensive-analysis';
import { geminiClient } from '../../../api/gemini-client';
import { anthropicClient } from '../../../api/anthropic-client';
import { createModuleLogger, logInfo, logError } from '../../../utils/logger';
import { APIResponseValidator } from '../../../utils/api-response-validator';

const logger = createModuleLogger('clinical-viability-analyzer');

// Enhanced clinical-focused analysis types
export interface ClinicalViabilityAssessment {
  overallViability: {
    clinicalViabilityScore: number; // 0-100
    regulatoryRisk: 'Low' | 'Medium' | 'High' | 'Very High';
    operationalFeasibility: 'Excellent' | 'Good' | 'Challenging' | 'Not Feasible';
    competitivePosition: 'Strong' | 'Moderate' | 'Weak';
    goNoGoRecommendation: 'Go' | 'Go with Modifications' | 'High Risk - Proceed with Caution' | 'No Go';
    strategicRationale: string;
  };
  regulatoryAnalysis: {
    fdaPathway: {
      recommendedPath: string;
      timelineMonths: number;
      keyMilestones: string[];
      potentialChallenges: string[];
    };
    emaPathway: {
      recommendedPath: string;
      timelineMonths: number;
      keyMilestones: string[];
      potentialChallenges: string[];
    };
    complianceScore: number; // 0-100
    guidanceAlignment: {
      guidance: string;
      alignment: 'Full' | 'Partial' | 'Limited' | 'Misaligned';
      gaps: string[];
      recommendations: string[];
    }[];
  };
  operationalFeasibility: {
    siteRequirements: {
      estimatedSites: number;
      specialtyRequirements: string[];
      geographicDistribution: string[];
      feasibilityScore: number;
    };
    recruitmentAnalysis: {
      estimatedRecruitmentTimeline: string;
      patientAvailability: 'High' | 'Medium' | 'Low';
      competitionForPatients: 'Low' | 'Medium' | 'High';
      recruitmentStrategies: string[];
    };
    resourceRequirements: {
      estimatedBudget: string;
      keyPersonnel: string[];
      criticalResources: string[];
      timeline: string;
    };
  };
  competitiveLandscape: {
    directCompetitors: {
      compound: string;
      company: string;
      stage: string;
      advantage: string;
    }[];
    marketPosition: string;
    differentiationOpportunities: string[];
    timingAdvantage: 'First-in-Class' | 'Best-in-Class' | 'Me-Too' | 'Late Entry';
  };
  clinicalKeyFindings: KeyFinding[];
  strategicRecommendations: TopRecommendation[];
  criticalRisks: CriticalIssue[];
  successFactors: {
    factor: string;
    importance: 'Critical' | 'Important' | 'Moderate';
    mitigationStrategy: string;
  }[];
}

export class ClinicalViabilityAnalyzer {
  
  /**
   * Generate comprehensive clinical viability assessment
   */
  async generateClinicalViabilityAssessment(
    protocol: StudyProtocol,
    crfs: CRFSpecification[],
    options: AnalysisOptions
  ): Promise<ClinicalViabilityAssessment> {
    logInfo('Generating clinical viability assessment (protocol-focused)', {
      protocolNumber: protocol.protocolNumber,
      therapeuticArea: protocol.indication,
      phase: protocol.studyPhase,
      mode: 'protocol-only'
    });

    const prompt = `You are a senior clinical development expert with 20+ years experience in pharmaceutical development. Analyze this clinical study protocol from a strategic clinical development perspective.

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
Inclusion Criteria: ${protocol.population?.keyInclusionCriteria?.join('; ')}
Exclusion Criteria: ${protocol.population?.keyExclusionCriteria?.join('; ')}

ANALYSIS CONTEXT:
Target Regulatory Region: ${options.regulatoryRegion}
Industry: ${options.industry}
Analysis Depth: ${options.analysisDepth}

Provide a comprehensive clinical viability assessment in the following JSON format:

{
  "overallViability": {
    "clinicalViabilityScore": number (0-100, where 100 is highly viable),
    "regulatoryRisk": "Low" | "Medium" | "High" | "Very High",
    "operationalFeasibility": "Excellent" | "Good" | "Challenging" | "Not Feasible",
    "competitivePosition": "Strong" | "Moderate" | "Weak", 
    "goNoGoRecommendation": "Go" | "Go with Modifications" | "High Risk - Proceed with Caution" | "No Go",
    "strategicRationale": "detailed strategic assessment explaining the recommendation"
  },
  "regulatoryAnalysis": {
    "fdaPathway": {
      "recommendedPath": "specific FDA pathway (e.g., 505(b)(1), 505(b)(2), Breakthrough, Fast Track)",
      "timelineMonths": number,
      "keyMilestones": ["Pre-IND", "IND submission", "Phase 2/3 meeting", "NDA submission"],
      "potentialChallenges": ["specific regulatory challenges"]
    },
    "emaPathway": {
      "recommendedPath": "specific EMA pathway (e.g., Centralized, PRIME, Adaptive)",
      "timelineMonths": number,
      "keyMilestones": ["Scientific Advice", "Protocol Assistance", "MAA submission"],
      "potentialChallenges": ["specific regulatory challenges"]
    },
    "complianceScore": number (0-100),
    "guidanceAlignment": [
      {
        "guidance": "specific FDA/EMA guidance document",
        "alignment": "Full" | "Partial" | "Limited" | "Misaligned",
        "gaps": ["specific gaps"],
        "recommendations": ["specific recommendations"]
      }
    ]
  },
  "operationalFeasibility": {
    "siteRequirements": {
      "estimatedSites": number,
      "specialtyRequirements": ["required medical specialties"],
      "geographicDistribution": ["required geographic regions"],
      "feasibilityScore": number (0-100)
    },
    "recruitmentAnalysis": {
      "estimatedRecruitmentTimeline": "specific timeline estimate",
      "patientAvailability": "High" | "Medium" | "Low",
      "competitionForPatients": "Low" | "Medium" | "High",
      "recruitmentStrategies": ["specific strategies"]
    },
    "resourceRequirements": {
      "estimatedBudget": "budget range estimate",
      "keyPersonnel": ["critical roles needed"],
      "criticalResources": ["essential resources"],
      "timeline": "overall development timeline"
    }
  },
  "competitiveLandscape": {
    "directCompetitors": [
      {
        "compound": "competitor compound",
        "company": "company name",
        "stage": "development stage",
        "advantage": "competitive advantage/disadvantage"
      }
    ],
    "marketPosition": "detailed market positioning analysis",
    "differentiationOpportunities": ["opportunities to differentiate"],
    "timingAdvantage": "First-in-Class" | "Best-in-Class" | "Me-Too" | "Late Entry"
  },
  "clinicalKeyFindings": [
    {
      "category": "Clinical Design" | "Regulatory Strategy" | "Market Access" | "Operational" | "Scientific",
      "finding": "specific clinical finding",
      "impact": "High" | "Medium" | "Low",
      "clinicalSignificance": "detailed significance"
    }
  ],
  "strategicRecommendations": [
    {
      "recommendation": "specific strategic recommendation",
      "priority": "High" | "Medium" | "Low",
      "category": "Protocol Design" | "Regulatory Strategy" | "Operational" | "Market Access",
      "effort": "High" | "Medium" | "Low",
      "impact": "High" | "Medium" | "Low",
      "timeline": "implementation timeline",
      "businessRationale": "business justification"
    }
  ],
  "criticalRisks": [
    {
      "issue": "critical risk description",
      "impact": "impact on development program",
      "recommendation": "specific mitigation strategy",
      "severity": "Critical" | "Major" | "Minor",
      "urgency": "Immediate" | "High" | "Medium" | "Low",
      "riskCategory": "Regulatory" | "Clinical" | "Operational" | "Commercial"
    }
  ],
  "successFactors": [
    {
      "factor": "critical success factor",
      "importance": "Critical" | "Important" | "Moderate",
      "mitigationStrategy": "strategy to ensure success"
    }
  ]
}

Focus your analysis on:

1. **Clinical Viability**: Assess scientific rationale, endpoint appropriateness, patient population selection
2. **Regulatory Strategy**: Evaluate regulatory pathway options, guidance alignment, approval probability
3. **Operational Feasibility**: Site availability, patient recruitment, resource requirements, timeline realism
4. **Competitive Intelligence**: Market position, differentiation opportunities, timing advantages
5. **Risk Assessment**: Critical risks that could derail the program with specific mitigation strategies
6. **Strategic Recommendations**: Actionable recommendations to optimize the development program

Return ONLY valid JSON with specific, actionable insights based on industry experience and regulatory knowledge.`;

    try {
      logInfo('Sending clinical viability assessment prompt to AI', {
        protocolNumber: protocol.protocolNumber,
        promptLength: prompt.length
      });

      // Use Gemini for comprehensive analysis
      const responseText = await geminiClient.generateContent(prompt);
      
      logInfo('Raw AI response for clinical viability', { 
        responseLength: responseText.length,
        preview: responseText.substring(0, 300)
      });

      // Parse and validate response
      const viabilityAssessment = APIResponseValidator.parseAndValidate(
        responseText,
        (data: any) => ({ isValid: this.validateClinicalViabilityAssessment(data), data }),
        this.createFallbackViabilityAssessment(protocol)
      );

      logInfo('Clinical viability assessment generated successfully', {
        clinicalViabilityScore: viabilityAssessment.overallViability.clinicalViabilityScore,
        goNoGoRecommendation: viabilityAssessment.overallViability.goNoGoRecommendation,
        regulatoryRisk: viabilityAssessment.overallViability.regulatoryRisk,
        keyFindingsCount: viabilityAssessment.clinicalKeyFindings.length
      });

      return viabilityAssessment;

    } catch (error) {
      logError('Failed to generate clinical viability assessment', error, {
        protocolNumber: protocol.protocolNumber
      });
      
      return this.createFallbackViabilityAssessment(protocol);
    }
  }

  /**
   * Enhanced executive summary generation with clinical focus
   */
  async generateClinicalExecutiveSummary(
    protocol: StudyProtocol,
    viabilityAssessment: ClinicalViabilityAssessment
  ): Promise<ExecutiveSummary> {
    
    // Transform clinical viability assessment into executive summary format
    const executiveSummary: ExecutiveSummary = {
      overallAssessment: {
        feasibilityScore: viabilityAssessment.overallViability.clinicalViabilityScore,
        riskLevel: viabilityAssessment.overallViability.regulatoryRisk,
        complexity: this.mapOperationalToComplexity(viabilityAssessment.overallViability.operationalFeasibility),
        recommendation: this.mapGoNoGoToRecommendation(viabilityAssessment.overallViability.goNoGoRecommendation),
        rationale: viabilityAssessment.overallViability.strategicRationale
      },
      keyFindings: viabilityAssessment.clinicalKeyFindings,
      criticalIssues: viabilityAssessment.criticalRisks,
      topRecommendations: viabilityAssessment.strategicRecommendations.map((rec, index) => ({
        priority: index + 1,
        category: rec.category,
        recommendation: rec.recommendation,
        benefit: rec.impact,
        effort: rec.effort,
        timeline: rec.timeline
      })),
      successFactors: viabilityAssessment.successFactors.map(sf => ({
        factor: sf.factor,
        importance: sf.importance as 'Critical' | 'Important' | 'Beneficial',
        currentStatus: 'Partial' as const,
        recommendations: [sf.mitigationStrategy]
      })),
      nextSteps: viabilityAssessment.strategicRecommendations.slice(0, 5).map((rec, index) => ({
        step: rec.recommendation,
        timeline: rec.timeline,
        responsibility: this.mapCategoryToResponsible(rec.category),
        deliverable: `${rec.category} deliverable`,
        dependencies: []
      }))
    };

    return executiveSummary;
  }

  /**
   * Validation function for clinical viability assessment
   */
  private validateClinicalViabilityAssessment(data: any): data is ClinicalViabilityAssessment {
    return (
      data &&
      typeof data === 'object' &&
      data.overallViability &&
      typeof data.overallViability.clinicalViabilityScore === 'number' &&
      data.regulatoryAnalysis &&
      data.operationalFeasibility &&
      data.competitiveLandscape &&
      Array.isArray(data.clinicalKeyFindings) &&
      Array.isArray(data.strategicRecommendations) &&
      Array.isArray(data.criticalRisks) &&
      Array.isArray(data.successFactors)
    );
  }

  /**
   * Create fallback assessment if AI fails
   */
  private createFallbackViabilityAssessment(protocol: StudyProtocol): ClinicalViabilityAssessment {
    return {
      overallViability: {
        clinicalViabilityScore: 75,
        regulatoryRisk: 'Medium',
        operationalFeasibility: 'Good',
        competitivePosition: 'Moderate',
        goNoGoRecommendation: 'Go with Modifications',
        strategicRationale: `Fallback assessment for ${protocol.studyTitle}. Detailed analysis pending.`
      },
      regulatoryAnalysis: {
        fdaPathway: {
          recommendedPath: 'Standard 505(b)(1)',
          timelineMonths: 24,
          keyMilestones: ['Pre-IND', 'IND submission', 'NDA submission'],
          potentialChallenges: ['Analysis pending']
        },
        emaPathway: {
          recommendedPath: 'Centralized Procedure',
          timelineMonths: 26,
          keyMilestones: ['Scientific Advice', 'MAA submission'],
          potentialChallenges: ['Analysis pending']
        },
        complianceScore: 80,
        guidanceAlignment: []
      },
      operationalFeasibility: {
        siteRequirements: {
          estimatedSites: 50,
          specialtyRequirements: ['General medicine'],
          geographicDistribution: ['North America', 'Europe'],
          feasibilityScore: 75
        },
        recruitmentAnalysis: {
          estimatedRecruitmentTimeline: '12-18 months',
          patientAvailability: 'Medium',
          competitionForPatients: 'Medium',
          recruitmentStrategies: ['Standard recruitment']
        },
        resourceRequirements: {
          estimatedBudget: 'To be determined',
          keyPersonnel: ['Principal Investigator', 'Study Manager'],
          criticalResources: ['Clinical sites', 'Patient population'],
          timeline: 'To be determined'
        }
      },
      competitiveLandscape: {
        directCompetitors: [],
        marketPosition: 'Analysis pending',
        differentiationOpportunities: ['To be determined'],
        timingAdvantage: 'Best-in-Class'
      },
      clinicalKeyFindings: [],
      strategicRecommendations: [],
      criticalRisks: [],
      successFactors: []
    };
  }

  // Helper mapping functions
  private mapOperationalToComplexity(operational: string): 'Low' | 'Medium' | 'High' | 'Very High' {
    const mapping = {
      'Excellent': 'Low',
      'Good': 'Medium', 
      'Challenging': 'High',
      'Not Feasible': 'Very High'
    };
    return mapping[operational as keyof typeof mapping] || 'Medium';
  }

  private mapGoNoGoToRecommendation(goNoGo: string): string {
    const mapping = {
      'Go': 'Proceed',
      'Go with Modifications': 'Proceed with Modifications',
      'High Risk - Proceed with Caution': 'Significant Concerns',
      'No Go': 'Not Recommended'
    };
    return mapping[goNoGo as keyof typeof mapping] || 'Proceed with Modifications';
  }

  private mapCategoryToResponsible(category: string): string {
    const mapping = {
      'Protocol Design': 'Clinical Development Team',
      'Regulatory Strategy': 'Regulatory Affairs',
      'Operational': 'Clinical Operations',
      'Market Access': 'Commercial Team'
    };
    return mapping[category as keyof typeof mapping] || 'Clinical Development Team';
  }
}

// Export singleton instance
export const clinicalViabilityAnalyzer = new ClinicalViabilityAnalyzer();