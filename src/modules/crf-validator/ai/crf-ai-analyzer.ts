import { createModuleLogger } from '../../../utils/logger';
import { StudyProtocol } from '../../../types/study-types';
import { CRFSpecification, AIAnalysisResult, CRFRecommendation, ValidationFinding } from '../types/crf-validation-types';
import { geminiClient } from '../../../ai/gemini-client';
import { anthropicClient } from '../../../ai/anthropic-client';

const logger = createModuleLogger('crf-ai-analyzer');

export interface AIAnalysisConfig {
  provider: 'gemini' | 'anthropic' | 'both';
  analysisDepth: 'basic' | 'standard' | 'comprehensive';
  includeRecommendations: boolean;
  includeBestPractices: boolean;
  includeRegulatoryGuidance: boolean;
}

export class CRFAIAnalyzer {
  /**
   * Performs AI-powered analysis of CRF specifications
   */
  async analyzeWithAI(
    protocol: StudyProtocol,
    crfSpec: CRFSpecification,
    config: AIAnalysisConfig = {
      provider: 'both',
      analysisDepth: 'standard',
      includeRecommendations: true,
      includeBestPractices: true,
      includeRegulatoryGuidance: true
    }
  ): Promise<AIAnalysisResult> {
    logger.info('Starting AI-powered CRF analysis', {
      protocolId: protocol.protocolNumber,
      crfId: crfSpec.crfId,
      provider: config.provider,
      analysisDepth: config.analysisDepth
    });

    try {
      const analysisPrompt = this.buildAnalysisPrompt(protocol, crfSpec, config);
      
      let aiFindings: ValidationFinding[] = [];
      let aiRecommendations: CRFRecommendation[] = [];
      let qualityScore = 0;
      let confidenceScore = 0;

      if (config.provider === 'both') {
        // Use both AI providers for comprehensive analysis
        const [geminiResults, anthropicResults] = await Promise.allSettled([
          this.analyzeWithGemini(analysisPrompt),
          this.analyzeWithAnthropic(analysisPrompt)
        ]);

        aiFindings = this.mergeFindings(
          geminiResults.status === 'fulfilled' ? geminiResults.value.findings : [],
          anthropicResults.status === 'fulfilled' ? anthropicResults.value.findings : []
        );

        aiRecommendations = this.mergeRecommendations(
          geminiResults.status === 'fulfilled' ? geminiResults.value.recommendations : [],
          anthropicResults.status === 'fulfilled' ? anthropicResults.value.recommendations : []
        );

        qualityScore = this.calculateConsensusScore(
          geminiResults.status === 'fulfilled' ? geminiResults.value.qualityScore : 0,
          anthropicResults.status === 'fulfilled' ? anthropicResults.value.qualityScore : 0
        );

        confidenceScore = this.calculateConfidenceScore(geminiResults, anthropicResults);

      } else if (config.provider === 'gemini') {
        const results = await this.analyzeWithGemini(analysisPrompt);
        aiFindings = results.findings;
        aiRecommendations = results.recommendations;
        qualityScore = results.qualityScore;
        confidenceScore = 85; // Single provider confidence

      } else {
        const results = await this.analyzeWithAnthropic(analysisPrompt);
        aiFindings = results.findings;
        aiRecommendations = results.recommendations;
        qualityScore = results.qualityScore;
        confidenceScore = 85; // Single provider confidence
      }

      const result: AIAnalysisResult = {
        analysisId: `ai-${Date.now()}`,
        protocolId: protocol.protocolNumber,
        crfId: crfSpec.crfId,
        aiProvider: config.provider,
        analysisDepth: config.analysisDepth,
        qualityScore,
        confidenceScore,
        aiFindings,
        aiRecommendations,
        bestPractices: config.includeBestPractices ? this.generateBestPractices(aiFindings) : [],
        regulatoryGuidance: config.includeRegulatoryGuidance ? this.generateRegulatoryGuidance(protocol, crfSpec) : [],
        processingMetrics: {
          processingTime: 0, // Will be set by caller
          tokensUsed: 0,
          modelsUsed: config.provider === 'both' ? ['gemini', 'anthropic'] : [config.provider]
        },
        timestamp: new Date()
      };

      logger.info('AI-powered CRF analysis completed', {
        protocolId: protocol.protocolNumber,
        crfId: crfSpec.crfId,
        qualityScore,
        confidenceScore,
        findingsCount: aiFindings.length,
        recommendationsCount: aiRecommendations.length
      });

      return result;
    } catch (error) {
      logger.error('Failed to perform AI-powered CRF analysis', {
        protocolId: protocol.protocolNumber,
        crfId: crfSpec.crfId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Build comprehensive analysis prompt for AI
   */
  private buildAnalysisPrompt(
    protocol: StudyProtocol,
    crfSpec: CRFSpecification,
    config: AIAnalysisConfig
  ): string {
    const prompt = `
You are an expert clinical data management specialist reviewing a Case Report Form (CRF) specification for a clinical trial. 

## Study Protocol Information:
- Protocol Number: ${protocol.protocolNumber}
- Study Title: ${protocol.studyTitle}
- Study Phase: ${protocol.studyPhase}
- Study Design: ${protocol.studyDesign}
- Indication: ${protocol.indication}
- Primary Endpoints: ${JSON.stringify(protocol.primaryEndpoints)}
- Secondary Endpoints: ${JSON.stringify(protocol.secondaryEndpoints)}
- Target Enrollment: ${protocol.targetEnrollment}

## CRF Specification:
- CRF ID: ${crfSpec.crfId}
- Total Forms: ${crfSpec.forms?.length || 0}
- Form Details: ${JSON.stringify(crfSpec.forms, null, 2)}

## Analysis Requirements:
Analysis Depth: ${config.analysisDepth.toUpperCase()}
${config.includeRecommendations ? '- Include actionable recommendations' : ''}
${config.includeBestPractices ? '- Include industry best practices' : ''}
${config.includeRegulatoryGuidance ? '- Include regulatory considerations' : ''}

Please analyze this CRF specification and provide:

1. **Quality Assessment** (0-100 score):
   - Evaluate completeness, consistency, and quality of the CRF design
   - Consider CDISC compliance, data integrity, and usability

2. **Validation Findings** (Array of findings):
   For each finding, provide:
   - Category (Data Quality, CDISC Compliance, Protocol Alignment, Usability, etc.)
   - Severity (Critical, Major, Minor, Info)
   - Description of the issue
   - Impact assessment
   - Specific recommendation
   - Priority level (High, Medium, Low)

3. **Improvement Recommendations** (Array of recommendations):
   For each recommendation, provide:
   - Category (structural, procedural, regulatory, etc.)
   - Priority (High, Medium, Low)
   - Detailed recommendation
   - Rationale for the recommendation
   - Expected impact if implemented
   - Implementation effort estimate (Low, Medium, High)
   - Suggested timeline
   - Business rationale

Focus on:
- Protocol-CRF alignment issues
- CDISC CDASH compliance gaps
- Data quality and integrity concerns
- User experience and data entry efficiency
- Regulatory compliance considerations
- Missing data points for endpoints
- Visit schedule alignment
- Population criteria coverage

Respond with a valid JSON object containing:
{
  "qualityScore": number,
  "findings": [
    {
      "category": string,
      "severity": "Critical" | "Major" | "Minor" | "Info",
      "finding": string,
      "impact": string,
      "recommendation": string,
      "priority": "High" | "Medium" | "Low",
      "formName": string | null,
      "fieldName": string | null
    }
  ],
  "recommendations": [
    {
      "category": string,
      "priority": "High" | "Medium" | "Low",
      "recommendation": string,
      "rationale": string,
      "impact": string,
      "implementationEffort": "Low" | "Medium" | "High",
      "timeline": string,
      "businessRationale": string,
      "affectedForms": string[]
    }
  ]
}
    `;

    return prompt.trim();
  }

  /**
   * Analyze with Gemini AI
   */
  private async analyzeWithGemini(prompt: string): Promise<{
    findings: ValidationFinding[];
    recommendations: CRFRecommendation[];
    qualityScore: number;
  }> {
    try {
      const response = await geminiClient.generateContent(prompt);
      const content = response.response.text();
      
      // Extract JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found in Gemini response');
      }

      const aiResponse = JSON.parse(jsonMatch[0]);
      
      return {
        findings: this.processAIFindings(aiResponse.findings || []),
        recommendations: this.processAIRecommendations(aiResponse.recommendations || []),
        qualityScore: aiResponse.qualityScore || 0
      };
    } catch (error) {
      logger.error('Gemini analysis failed', { error: error instanceof Error ? error.message : String(error) });
      return { findings: [], recommendations: [], qualityScore: 0 };
    }
  }

  /**
   * Analyze with Anthropic Claude
   */
  private async analyzeWithAnthropic(prompt: string): Promise<{
    findings: ValidationFinding[];
    recommendations: CRFRecommendation[];
    qualityScore: number;
  }> {
    try {
      const response = await anthropicClient.messages.create({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 4000,
        messages: [{ role: 'user', content: prompt }]
      });

      const content = response.content[0].type === 'text' ? response.content[0].text : '';
      
      // Extract JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found in Anthropic response');
      }

      const aiResponse = JSON.parse(jsonMatch[0]);
      
      return {
        findings: this.processAIFindings(aiResponse.findings || []),
        recommendations: this.processAIRecommendations(aiResponse.recommendations || []),
        qualityScore: aiResponse.qualityScore || 0
      };
    } catch (error) {
      logger.error('Anthropic analysis failed', { error: error instanceof Error ? error.message : String(error) });
      return { findings: [], recommendations: [], qualityScore: 0 };
    }
  }

  /**
   * Process AI findings and add IDs
   */
  private processAIFindings(aiFindings: any[]): ValidationFinding[] {
    return aiFindings.map((finding, index) => ({
      id: `ai-finding-${Date.now()}-${index}`,
      category: finding.category || 'General',
      finding: finding.finding || finding.description || 'AI-identified issue',
      severity: finding.severity || 'Minor',
      impact: finding.impact || 'Impact assessment needed',
      formName: finding.formName || null,
      fieldName: finding.fieldName || null,
      recommendation: finding.recommendation || 'Recommendation needed',
      priority: finding.priority || 'Medium'
    }));
  }

  /**
   * Process AI recommendations and add IDs
   */
  private processAIRecommendations(aiRecommendations: any[]): CRFRecommendation[] {
    return aiRecommendations.map((rec, index) => ({
      id: `ai-rec-${Date.now()}-${index}`,
      category: rec.category || 'General',
      priority: rec.priority || 'Medium',
      recommendation: rec.recommendation || 'AI recommendation',
      rationale: rec.rationale || 'Rationale needed',
      impact: rec.impact || 'Impact assessment needed',
      implementationEffort: rec.implementationEffort || 'Medium',
      timeline: rec.timeline || 'To be determined',
      businessRationale: rec.businessRationale || 'Business case needed',
      affectedForms: rec.affectedForms || []
    }));
  }

  /**
   * Merge findings from multiple AI providers
   */
  private mergeFindings(geminiFindings: ValidationFinding[], anthropicFindings: ValidationFinding[]): ValidationFinding[] {
    const merged = [...geminiFindings];
    
    for (const anthropicFinding of anthropicFindings) {
      // Check for similar findings
      const similarity = this.findSimilarFinding(anthropicFinding, geminiFindings);
      if (similarity < 0.7) { // If not similar enough, add as new finding
        merged.push({
          ...anthropicFinding,
          id: `merged-${anthropicFinding.id}`
        });
      }
    }
    
    return merged;
  }

  /**
   * Merge recommendations from multiple AI providers
   */
  private mergeRecommendations(geminiRecs: CRFRecommendation[], anthropicRecs: CRFRecommendation[]): CRFRecommendation[] {
    const merged = [...geminiRecs];
    
    for (const anthropicRec of anthropicRecs) {
      // Check for similar recommendations
      const similarity = this.findSimilarRecommendation(anthropicRec, geminiRecs);
      if (similarity < 0.7) { // If not similar enough, add as new recommendation
        merged.push({
          ...anthropicRec,
          id: `merged-${anthropicRec.id}`
        });
      }
    }
    
    return merged;
  }

  /**
   * Find similar finding in a list
   */
  private findSimilarFinding(finding: ValidationFinding, findings: ValidationFinding[]): number {
    let maxSimilarity = 0;
    
    for (const existingFinding of findings) {
      const similarity = this.calculateTextSimilarity(finding.finding, existingFinding.finding);
      maxSimilarity = Math.max(maxSimilarity, similarity);
    }
    
    return maxSimilarity;
  }

  /**
   * Find similar recommendation in a list
   */
  private findSimilarRecommendation(rec: CRFRecommendation, recommendations: CRFRecommendation[]): number {
    let maxSimilarity = 0;
    
    for (const existingRec of recommendations) {
      const similarity = this.calculateTextSimilarity(rec.recommendation, existingRec.recommendation);
      maxSimilarity = Math.max(maxSimilarity, similarity);
    }
    
    return maxSimilarity;
  }

  /**
   * Calculate text similarity (simple word overlap)
   */
  private calculateTextSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(word => words2.has(word)));
    const union = new Set([...words1, ...words2]);
    
    return union.size > 0 ? intersection.size / union.size : 0;
  }

  /**
   * Calculate consensus score from multiple AI providers
   */
  private calculateConsensusScore(score1: number, score2: number): number {
    if (score1 === 0 && score2 === 0) return 0;
    if (score1 === 0) return score2;
    if (score2 === 0) return score1;
    
    // Weighted average with consensus bonus
    const avgScore = (score1 + score2) / 2;
    const difference = Math.abs(score1 - score2);
    const consensusBonus = Math.max(0, (100 - difference) / 100) * 5; // Up to 5 point bonus for agreement
    
    return Math.min(100, Math.round(avgScore + consensusBonus));
  }

  /**
   * Calculate confidence score based on AI provider results
   */
  private calculateConfidenceScore(
    geminiResult: PromiseSettledResult<any>,
    anthropicResult: PromiseSettledResult<any>
  ): number {
    let confidence = 50; // Base confidence
    
    if (geminiResult.status === 'fulfilled') confidence += 25;
    if (anthropicResult.status === 'fulfilled') confidence += 25;
    
    // If both succeeded, check for consensus
    if (geminiResult.status === 'fulfilled' && anthropicResult.status === 'fulfilled') {
      const scoreDiff = Math.abs(
        geminiResult.value.qualityScore - anthropicResult.value.qualityScore
      );
      const consensusBonus = Math.max(0, (100 - scoreDiff) / 100) * 10;
      confidence += consensusBonus;
    }
    
    return Math.round(Math.min(100, confidence));
  }

  /**
   * Generate best practices guidance
   */
  private generateBestPractices(findings: ValidationFinding[]): string[] {
    const practices: string[] = [];
    const categories = new Set(findings.map(f => f.category));

    if (categories.has('CDISC Compliance')) {
      practices.push('Follow CDISC CDASH implementation guidelines for standardized data collection');
      practices.push('Use controlled terminology from NCI EVS or CDISC CT where applicable');
    }

    if (categories.has('Data Quality')) {
      practices.push('Implement comprehensive edit checks and validation rules');
      practices.push('Use appropriate data types and formats for each field');
    }

    if (categories.has('Protocol Alignment')) {
      practices.push('Ensure all primary and secondary endpoints are adequately captured');
      practices.push('Align visit schedules and procedures with protocol requirements');
    }

    if (categories.has('Usability')) {
      practices.push('Design forms with optimal field density (5-15 fields per form)');
      practices.push('Use controlled vocabularies to reduce data entry errors');
    }

    // Add general best practices
    practices.push('Conduct thorough CRF review with clinical and data management teams');
    practices.push('Perform user acceptance testing before study start');

    return practices;
  }

  /**
   * Generate regulatory guidance
   */
  private generateRegulatoryGuidance(protocol: StudyProtocol, crfSpec: CRFSpecification): string[] {
    const guidance: string[] = [];

    // FDA-specific guidance
    guidance.push('Ensure CRF captures all data required for FDA submissions per 21 CFR Part 11');
    guidance.push('Include audit trail capabilities for electronic data capture systems');

    // ICH GCP guidance
    guidance.push('Design CRF to support ICH GCP compliance and data integrity principles');
    guidance.push('Ensure source data verification capabilities are built into the design');

    // Phase-specific guidance
    if (protocol.studyPhase === 'Phase 1') {
      guidance.push('Include enhanced safety monitoring and adverse event tracking for Phase 1 studies');
    } else if (protocol.studyPhase === 'Phase 3') {
      guidance.push('Ensure robust efficacy endpoint capture for registration-enabling studies');
    }

    // Therapeutic area specific
    if (protocol.indication?.toLowerCase().includes('oncology')) {
      guidance.push('Include RECIST criteria for tumor assessment if applicable');
      guidance.push('Implement enhanced safety monitoring for oncology studies');
    }

    return guidance;
  }
}

export const crfAIAnalyzer = new CRFAIAnalyzer();