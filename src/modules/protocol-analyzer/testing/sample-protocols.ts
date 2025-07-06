// Sample Protocol Library for Testing Protocol Analyzer
import { StudyProtocol, CRFSpecification } from '../../../types';

export interface TestCase {
  id: string;
  name: string;
  description: string;
  protocol: StudyProtocol;
  crfs: CRFSpecification[];
  expectedResults: {
    feasibilityScore: { min: number; max: number };
    riskLevel: 'Low' | 'Medium' | 'High' | 'Very High';
    complexity: 'Low' | 'Medium' | 'High' | 'Very High';
    criticalIssues: number;
    keyFindings: number;
  };
  tags: string[];
}

export class SampleProtocolLibrary {
  
  /**
   * Get all available test cases
   */
  getAllTestCases(): TestCase[] {
    return [
      this.getPhase1OncologyProtocol(),
      this.getPhase2CardiovascularProtocol(),
      this.getPhase3DiabetesProtocol(),
      this.getComplexMultiArmProtocol(),
      this.getRareDiseasePediatricProtocol(),
      this.getObservationalCohortStudy(),
      this.getBiomarkerValidationStudy(),
      this.getDeviceTrialProtocol()
    ];
  }

  /**
   * Get test case by ID
   */
  getTestCase(id: string): TestCase | undefined {
    return this.getAllTestCases().find(tc => tc.id === id);
  }

  /**
   * Get test cases by tags
   */
  getTestCasesByTags(tags: string[]): TestCase[] {
    return this.getAllTestCases().filter(tc => 
      tags.some(tag => tc.tags.includes(tag))
    );
  }

  /**
   * Phase 1 Oncology Protocol - High Risk, High Complexity
   */
  private getPhase1OncologyProtocol(): TestCase {
    const protocol: StudyProtocol = {
      protocolNumber: 'ONCO-001-P1',
      studyTitle: 'A Phase 1, First-in-Human, Dose-Escalation Study of ABC-123 in Patients with Advanced Solid Tumors',
      studyPhase: '1',
      studyDesign: {
        type: 'Open-label, non-randomized, dose-escalation study',
        numberOfArms: 1,
        intervention: 'ABC-123 (novel targeted therapy)'
      },
      studyObjective: 'To determine the maximum tolerated dose (MTD) and recommended Phase 2 dose (RP2D) of ABC-123 in patients with advanced solid tumors',
      therapeuticArea: 'Oncology',
      indication: 'Advanced solid tumors refractory to standard therapy',
      sponsor: 'ABC Therapeutics Inc.',
      population: {
        targetEnrollment: 45,
        inclusionCriteria: [
          'Adults ≥18 years with histologically confirmed advanced solid tumors',
          'ECOG performance status 0-1',
          'Adequate organ function',
          'Life expectancy ≥12 weeks'
        ],
        exclusionCriteria: [
          'Prior exposure to ABC-123 class inhibitors',
          'Active CNS metastases',
          'Significant cardiovascular disease',
          'Pregnancy or nursing',
          'Major surgery within 4 weeks'
        ]
      },
      endpoints: {
        primary: ['Safety and tolerability as assessed by CTCAE v5.0', 'Determination of MTD and RP2D'],
        secondary: [
          'Pharmacokinetic profile of ABC-123',
          'Preliminary antitumor activity by RECIST v1.1',
          'Biomarker analysis for target engagement'
        ],
        exploratory: [
          'Correlation between biomarker expression and clinical response',
          'Resistance mechanism analysis'
        ]
      },
      visitSchedule: [
        {
          visitName: 'Screening',
          timepoint: 'Days -28 to -1',
          procedures: ['Medical history', 'Physical exam', 'Laboratory tests', 'ECG', 'ECHO', 'CT/MRI', 'Tumor biopsy']
        },
        {
          visitName: 'Cycle 1 Day 1',
          timepoint: 'Day 1',
          procedures: ['Physical exam', 'Vital signs', 'Laboratory tests', 'ECG', 'PK sampling', 'Adverse event assessment']
        },
        {
          visitName: 'Weekly Safety',
          timepoint: 'Weekly during Cycle 1',
          procedures: ['Physical exam', 'Laboratory tests', 'Adverse event assessment']
        },
        {
          visitName: 'Tumor Assessment',
          timepoint: 'Every 8 weeks',
          procedures: ['CT/MRI', 'RECIST assessment', 'Biomarker sampling']
        }
      ],
      studyDuration: '24 months',
      studyLocations: [
        { country: 'United States', region: 'North America', sites: 3 }
      ]
    };

    const crfs: CRFSpecification[] = [
      {
        formName: 'Demographics',
        formType: 'baseline',
        fields: [
          { fieldName: 'date_of_birth', fieldType: 'date', required: true, validation: { type: 'date_range', min: '1920-01-01' } },
          { fieldName: 'gender', fieldType: 'radio', required: true, options: ['Male', 'Female', 'Other'] },
          { fieldName: 'race', fieldType: 'checkbox', required: true },
          { fieldName: 'ethnicity', fieldType: 'radio', required: true }
        ]
      },
      {
        formName: 'Medical History',
        formType: 'baseline',
        fields: [
          { fieldName: 'primary_tumor_type', fieldType: 'text', required: true },
          { fieldName: 'tumor_stage', fieldType: 'dropdown', required: true },
          { fieldName: 'prior_therapies', fieldType: 'textarea', required: true },
          { fieldName: 'ecog_status', fieldType: 'radio', required: true, options: ['0', '1', '2'] }
        ]
      },
      {
        formName: 'Safety Assessment',
        formType: 'repeated',
        fields: [
          { fieldName: 'adverse_event', fieldType: 'text', required: false },
          { fieldName: 'severity_grade', fieldType: 'dropdown', required: false, options: ['1', '2', '3', '4', '5'] },
          { fieldName: 'relationship', fieldType: 'dropdown', required: false },
          { fieldName: 'action_taken', fieldType: 'dropdown', required: false }
        ]
      },
      {
        formName: 'Pharmacokinetics',
        formType: 'repeated',
        fields: [
          { fieldName: 'sample_time', fieldType: 'time', required: true },
          { fieldName: 'concentration', fieldType: 'number', required: true, validation: { type: 'range', min: 0 } },
          { fieldName: 'sample_quality', fieldType: 'dropdown', required: true }
        ]
      },
      {
        formName: 'Tumor Assessment',
        formType: 'repeated',
        fields: [
          { fieldName: 'assessment_date', fieldType: 'date', required: true },
          { fieldName: 'overall_response', fieldType: 'radio', required: true, options: ['CR', 'PR', 'SD', 'PD'] },
          { fieldName: 'target_lesions', fieldType: 'textarea', required: true },
          { fieldName: 'new_lesions', fieldType: 'radio', required: true, options: ['Yes', 'No'] }
        ]
      }
    ];

    return {
      id: 'phase1-oncology',
      name: 'Phase 1 Oncology - First-in-Human',
      description: 'High-risk, high-complexity first-in-human oncology study with dose escalation',
      protocol,
      crfs,
      expectedResults: {
        feasibilityScore: { min: 60, max: 75 },
        riskLevel: 'High',
        complexity: 'High',
        criticalIssues: 2,
        keyFindings: 5
      },
      tags: ['phase1', 'oncology', 'first-in-human', 'dose-escalation', 'high-risk']
    };
  }

  /**
   * Phase 2 Cardiovascular Protocol - Medium Risk, Medium Complexity
   */
  private getPhase2CardiovascularProtocol(): TestCase {
    const protocol: StudyProtocol = {
      protocolNumber: 'CARDIO-002-P2',
      studyTitle: 'A Phase 2, Randomized, Double-Blind, Placebo-Controlled Study of DEF-456 in Patients with Heart Failure with Reduced Ejection Fraction',
      studyPhase: '2',
      studyDesign: {
        type: 'Randomized, double-blind, placebo-controlled, parallel-group study',
        numberOfArms: 2,
        intervention: 'DEF-456 vs Placebo'
      },
      studyObjective: 'To evaluate the efficacy and safety of DEF-456 in improving exercise capacity in patients with heart failure with reduced ejection fraction',
      therapeuticArea: 'Cardiovascular',
      indication: 'Heart failure with reduced ejection fraction (HFrEF)',
      sponsor: 'DEF Cardio Solutions',
      population: {
        targetEnrollment: 180,
        inclusionCriteria: [
          'Adults 18-80 years with HFrEF (LVEF ≤40%)',
          'NYHA Class II-III symptoms',
          'Stable heart failure therapy for ≥4 weeks',
          'Six-minute walk distance 150-450 meters'
        ],
        exclusionCriteria: [
          'Recent MI, stroke, or cardiac procedure within 3 months',
          'Severe renal impairment (eGFR <30)',
          'Uncontrolled hypertension',
          'Recent hospitalization for heart failure'
        ]
      },
      endpoints: {
        primary: ['Change from baseline in 6-minute walk distance at 12 weeks'],
        secondary: [
          'Change in NYHA functional class',
          'Time to first heart failure hospitalization',
          'Change in Kansas City Cardiomyopathy Questionnaire (KCCQ) score',
          'Change in NT-proBNP levels',
          'Safety and tolerability'
        ]
      },
      visitSchedule: [
        {
          visitName: 'Screening',
          timepoint: 'Days -28 to -1',
          procedures: ['Medical history', 'Physical exam', 'ECG', 'Echocardiogram', '6MWT', 'Laboratory tests', 'KCCQ']
        },
        {
          visitName: 'Baseline/Randomization',
          timepoint: 'Day 1',
          procedures: ['Vital signs', 'Physical exam', '6MWT', 'Laboratory tests', 'Study drug dispensing']
        },
        {
          visitName: 'Week 4',
          timepoint: 'Week 4',
          procedures: ['Vital signs', 'Physical exam', 'Safety assessment', 'Drug compliance']
        },
        {
          visitName: 'Week 12/End of Treatment',
          timepoint: 'Week 12',
          procedures: ['Physical exam', 'ECG', 'Echocardiogram', '6MWT', 'Laboratory tests', 'KCCQ']
        }
      ],
      studyDuration: '18 months',
      studyLocations: [
        { country: 'United States', region: 'North America', sites: 25 },
        { country: 'Canada', region: 'North America', sites: 5 }
      ]
    };

    const crfs: CRFSpecification[] = [
      {
        formName: 'Demographics',
        formType: 'baseline',
        fields: [
          { fieldName: 'date_of_birth', fieldType: 'date', required: true },
          { fieldName: 'gender', fieldType: 'radio', required: true },
          { fieldName: 'race', fieldType: 'checkbox', required: true },
          { fieldName: 'height', fieldType: 'number', required: true },
          { fieldName: 'weight', fieldType: 'number', required: true }
        ]
      },
      {
        formName: 'Cardiovascular History',
        formType: 'baseline',
        fields: [
          { fieldName: 'hf_duration', fieldType: 'number', required: true },
          { fieldName: 'hf_etiology', fieldType: 'dropdown', required: true },
          { fieldName: 'ejection_fraction', fieldType: 'number', required: true },
          { fieldName: 'nyha_class', fieldType: 'radio', required: true }
        ]
      },
      {
        formName: '6-Minute Walk Test',
        formType: 'repeated',
        fields: [
          { fieldName: 'test_date', fieldType: 'date', required: true },
          { fieldName: 'distance_walked', fieldType: 'number', required: true },
          { fieldName: 'limiting_factor', fieldType: 'dropdown', required: false },
          { fieldName: 'pre_test_hr', fieldType: 'number', required: true },
          { fieldName: 'post_test_hr', fieldType: 'number', required: true }
        ]
      },
      {
        formName: 'KCCQ Questionnaire',
        formType: 'repeated',
        fields: [
          { fieldName: 'assessment_date', fieldType: 'date', required: true },
          { fieldName: 'overall_summary_score', fieldType: 'number', required: true },
          { fieldName: 'clinical_summary_score', fieldType: 'number', required: true }
        ]
      },
      {
        formName: 'Safety and Adverse Events',
        formType: 'repeated',
        fields: [
          { fieldName: 'event_term', fieldType: 'text', required: false },
          { fieldName: 'severity', fieldType: 'dropdown', required: false },
          { fieldName: 'relationship', fieldType: 'dropdown', required: false },
          { fieldName: 'outcome', fieldType: 'dropdown', required: false }
        ]
      }
    ];

    return {
      id: 'phase2-cardiovascular',
      name: 'Phase 2 Cardiovascular - Heart Failure',
      description: 'Medium complexity randomized controlled trial in heart failure with functional endpoints',
      protocol,
      crfs,
      expectedResults: {
        feasibilityScore: { min: 75, max: 85 },
        riskLevel: 'Medium',
        complexity: 'Medium',
        criticalIssues: 1,
        keyFindings: 4
      },
      tags: ['phase2', 'cardiovascular', 'randomized', 'placebo-controlled', 'functional-endpoint']
    };
  }

  /**
   * Phase 3 Diabetes Protocol - High Enrollment, Lower Risk
   */
  private getPhase3DiabetesProtocol(): TestCase {
    const protocol: StudyProtocol = {
      protocolNumber: 'DIAB-003-P3',
      studyTitle: 'A Phase 3, Randomized, Double-Blind, Active-Controlled Study Comparing GHI-789 to Sitagliptin in Patients with Type 2 Diabetes Mellitus',
      studyPhase: '3',
      studyDesign: {
        type: 'Randomized, double-blind, active-controlled, parallel-group, non-inferiority study',
        numberOfArms: 2,
        intervention: 'GHI-789 vs Sitagliptin'
      },
      studyObjective: 'To demonstrate non-inferiority of GHI-789 to sitagliptin in reducing HbA1c in patients with type 2 diabetes mellitus',
      therapeuticArea: 'Endocrinology',
      indication: 'Type 2 diabetes mellitus inadequately controlled on metformin',
      sponsor: 'GHI Diabetes Research',
      population: {
        targetEnrollment: 850,
        inclusionCriteria: [
          'Adults 18-75 years with type 2 diabetes mellitus',
          'HbA1c 7.0-10.0% at screening',
          'Stable metformin therapy ≥3 months',
          'BMI 25-40 kg/m²'
        ],
        exclusionCriteria: [
          'Type 1 diabetes or secondary diabetes',
          'History of diabetic ketoacidosis',
          'Severe hypoglycemia within 6 months',
          'eGFR <45 mL/min/1.73m²',
          'Recent cardiovascular events'
        ]
      },
      endpoints: {
        primary: ['Change from baseline in HbA1c at 24 weeks'],
        secondary: [
          'Proportion of patients achieving HbA1c <7.0%',
          'Change from baseline in fasting plasma glucose',
          'Change from baseline in body weight',
          'Incidence of hypoglycemia',
          'Safety and tolerability'
        ]
      },
      visitSchedule: [
        {
          visitName: 'Screening',
          timepoint: 'Days -28 to -1',
          procedures: ['Medical history', 'Physical exam', 'Laboratory tests', 'HbA1c', 'FPG', 'Vital signs']
        },
        {
          visitName: 'Baseline/Randomization',
          timepoint: 'Day 1',
          procedures: ['Physical exam', 'Vital signs', 'Laboratory tests', 'Study drug dispensing']
        },
        {
          visitName: 'Week 4',
          timepoint: 'Week 4',
          procedures: ['Vital signs', 'Safety assessment', 'FPG', 'Drug compliance']
        },
        {
          visitName: 'Week 12',
          timepoint: 'Week 12',
          procedures: ['Physical exam', 'Vital signs', 'Laboratory tests', 'HbA1c', 'FPG']
        },
        {
          visitName: 'Week 24/End of Treatment',
          timepoint: 'Week 24',
          procedures: ['Physical exam', 'Vital signs', 'Laboratory tests', 'HbA1c', 'FPG']
        }
      ],
      studyDuration: '30 months',
      studyLocations: [
        { country: 'United States', region: 'North America', sites: 50 },
        { country: 'Canada', region: 'North America', sites: 10 },
        { country: 'Germany', region: 'Europe', sites: 15 },
        { country: 'United Kingdom', region: 'Europe', sites: 10 }
      ]
    };

    const crfs: CRFSpecification[] = [
      {
        formName: 'Demographics',
        formType: 'baseline',
        fields: [
          { fieldName: 'date_of_birth', fieldType: 'date', required: true },
          { fieldName: 'gender', fieldType: 'radio', required: true },
          { fieldName: 'race', fieldType: 'checkbox', required: true },
          { fieldName: 'height', fieldType: 'number', required: true },
          { fieldName: 'weight', fieldType: 'number', required: true }
        ]
      },
      {
        formName: 'Diabetes History',
        formType: 'baseline',
        fields: [
          { fieldName: 'diabetes_duration', fieldType: 'number', required: true },
          { fieldName: 'diabetes_complications', fieldType: 'checkbox', required: false },
          { fieldName: 'baseline_hba1c', fieldType: 'number', required: true },
          { fieldName: 'metformin_dose', fieldType: 'number', required: true }
        ]
      },
      {
        formName: 'Laboratory Results',
        formType: 'repeated',
        fields: [
          { fieldName: 'lab_date', fieldType: 'date', required: true },
          { fieldName: 'hba1c', fieldType: 'number', required: false },
          { fieldName: 'fasting_glucose', fieldType: 'number', required: false },
          { fieldName: 'creatinine', fieldType: 'number', required: false },
          { fieldName: 'egfr', fieldType: 'number', required: false }
        ]
      },
      {
        formName: 'Hypoglycemia Events',
        formType: 'repeated',
        fields: [
          { fieldName: 'event_date', fieldType: 'date', required: true },
          { fieldName: 'event_severity', fieldType: 'radio', required: true },
          { fieldName: 'glucose_level', fieldType: 'number', required: false },
          { fieldName: 'symptoms', fieldType: 'checkbox', required: false },
          { fieldName: 'treatment_required', fieldType: 'radio', required: true }
        ]
      },
      {
        formName: 'Concomitant Medications',
        formType: 'repeated',
        fields: [
          { fieldName: 'medication_name', fieldType: 'text', required: true },
          { fieldName: 'dose', fieldType: 'text', required: true },
          { fieldName: 'start_date', fieldType: 'date', required: true },
          { fieldName: 'stop_date', fieldType: 'date', required: false },
          { fieldName: 'indication', fieldType: 'text', required: true }
        ]
      }
    ];

    return {
      id: 'phase3-diabetes',
      name: 'Phase 3 Diabetes - Non-inferiority',
      description: 'Large multi-regional phase 3 study with regulatory-grade endpoints',
      protocol,
      crfs,
      expectedResults: {
        feasibilityScore: { min: 80, max: 90 },
        riskLevel: 'Medium',
        complexity: 'Medium',
        criticalIssues: 0,
        keyFindings: 3
      },
      tags: ['phase3', 'diabetes', 'non-inferiority', 'multi-regional', 'large-enrollment']
    };
  }

  /**
   * Complex Multi-Arm Protocol - Very High Complexity
   */
  private getComplexMultiArmProtocol(): TestCase {
    const protocol: StudyProtocol = {
      protocolNumber: 'COMPLEX-004-P2',
      studyTitle: 'A Phase 2, Randomized, Open-Label, Four-Arm, Adaptive Platform Study of Multiple Targeted Therapies in Biomarker-Selected Patients with Advanced NSCLC',
      studyPhase: '2',
      studyDesign: {
        type: 'Randomized, open-label, adaptive platform study with biomarker-driven arms',
        numberOfArms: 4,
        intervention: 'JKL-101 monotherapy vs JKL-101 + MNO-202 vs PQR-303 monotherapy vs Standard of Care'
      },
      studyObjective: 'To evaluate the efficacy and safety of multiple targeted therapy combinations in biomarker-selected patients with advanced NSCLC using an adaptive platform design',
      therapeuticArea: 'Oncology',
      indication: 'Advanced non-small cell lung cancer with actionable mutations',
      sponsor: 'Multi-Pharma Consortium',
      population: {
        targetEnrollment: 320,
        inclusionCriteria: [
          'Adults ≥18 years with histologically confirmed advanced NSCLC',
          'Presence of actionable mutations (EGFR, ALK, ROS1, BRAF, MET)',
          'Progression on standard therapy',
          'ECOG performance status 0-2',
          'Adequate organ function'
        ],
        exclusionCriteria: [
          'Active brain metastases (unless treated and stable)',
          'Prior exposure to study drugs',
          'Concurrent malignancies',
          'Significant cardiovascular disease',
          'Pregnant or nursing women'
        ]
      },
      endpoints: {
        primary: ['Objective response rate (ORR) by biomarker subgroup'],
        secondary: [
          'Progression-free survival by biomarker subgroup',
          'Overall survival',
          'Duration of response',
          'Disease control rate',
          'Safety and tolerability by treatment arm',
          'Pharmacokinetic interactions'
        ],
        exploratory: [
          'Circulating tumor DNA dynamics',
          'Resistance mechanism analysis',
          'Biomarker discovery for response prediction',
          'Quality of life assessments'
        ]
      },
      visitSchedule: [
        {
          visitName: 'Screening',
          timepoint: 'Days -28 to -1',
          procedures: ['Medical history', 'Physical exam', 'CT/MRI', 'Tissue biopsy', 'Biomarker testing', 'Laboratory tests', 'ECG', 'ECHO']
        },
        {
          visitName: 'Cycle 1 Day 1',
          timepoint: 'Day 1',
          procedures: ['Physical exam', 'Vital signs', 'Laboratory tests', 'ECG', 'Study drug administration', 'PK sampling']
        },
        {
          visitName: 'Weekly Safety',
          timepoint: 'Weekly during Cycle 1',
          procedures: ['Physical exam', 'Laboratory tests', 'Adverse event assessment', 'Dose modification assessment']
        },
        {
          visitName: 'Tumor Assessment',
          timepoint: 'Every 6 weeks',
          procedures: ['CT/MRI', 'RECIST assessment', 'ctDNA sampling', 'Quality of life questionnaire']
        },
        {
          visitName: 'End of Treatment',
          timepoint: 'Treatment discontinuation',
          procedures: ['Physical exam', 'Laboratory tests', 'Tissue biopsy (optional)', 'Survival follow-up setup']
        }
      ],
      studyDuration: '36 months',
      studyLocations: [
        { country: 'United States', region: 'North America', sites: 15 },
        { country: 'Canada', region: 'North America', sites: 3 },
        { country: 'Germany', region: 'Europe', sites: 8 },
        { country: 'France', region: 'Europe', sites: 5 },
        { country: 'United Kingdom', region: 'Europe', sites: 4 }
      ]
    };

    const crfs: CRFSpecification[] = [
      {
        formName: 'Demographics',
        formType: 'baseline',
        fields: [
          { fieldName: 'date_of_birth', fieldType: 'date', required: true },
          { fieldName: 'gender', fieldType: 'radio', required: true },
          { fieldName: 'race', fieldType: 'checkbox', required: true },
          { fieldName: 'smoking_history', fieldType: 'dropdown', required: true }
        ]
      },
      {
        formName: 'Disease History',
        formType: 'baseline',
        fields: [
          { fieldName: 'histology', fieldType: 'dropdown', required: true },
          { fieldName: 'stage_at_diagnosis', fieldType: 'dropdown', required: true },
          { fieldName: 'actionable_mutations', fieldType: 'checkbox', required: true },
          { fieldName: 'prior_therapies', fieldType: 'textarea', required: true }
        ]
      },
      {
        formName: 'Biomarker Results',
        formType: 'repeated',
        fields: [
          { fieldName: 'sample_date', fieldType: 'date', required: true },
          { fieldName: 'sample_type', fieldType: 'dropdown', required: true },
          { fieldName: 'biomarker_panel', fieldType: 'checkbox', required: true },
          { fieldName: 'mutation_details', fieldType: 'textarea', required: false }
        ]
      },
      {
        formName: 'Tumor Assessment',
        formType: 'repeated',
        fields: [
          { fieldName: 'assessment_date', fieldType: 'date', required: true },
          { fieldName: 'overall_response', fieldType: 'radio', required: true },
          { fieldName: 'target_lesions_sum', fieldType: 'number', required: true },
          { fieldName: 'new_lesions', fieldType: 'radio', required: true },
          { fieldName: 'progression_type', fieldType: 'dropdown', required: false }
        ]
      },
      {
        formName: 'Pharmacokinetics',
        formType: 'repeated',
        fields: [
          { fieldName: 'sample_time', fieldType: 'time', required: true },
          { fieldName: 'drug_concentration', fieldType: 'number', required: true },
          { fieldName: 'combination_therapy', fieldType: 'radio', required: true },
          { fieldName: 'food_status', fieldType: 'radio', required: true }
        ]
      },
      {
        formName: 'Circulating Tumor DNA',
        formType: 'repeated',
        fields: [
          { fieldName: 'collection_date', fieldType: 'date', required: true },
          { fieldName: 'ctdna_level', fieldType: 'number', required: false },
          { fieldName: 'mutation_tracking', fieldType: 'textarea', required: false },
          { fieldName: 'resistance_mutations', fieldType: 'textarea', required: false }
        ]
      },
      {
        formName: 'Quality of Life',
        formType: 'repeated',
        fields: [
          { fieldName: 'assessment_date', fieldType: 'date', required: true },
          { fieldName: 'eortc_qlq_c30_score', fieldType: 'number', required: false },
          { fieldName: 'eortc_qlq_lc13_score', fieldType: 'number', required: false },
          { fieldName: 'completion_status', fieldType: 'dropdown', required: true }
        ]
      },
      {
        formName: 'Adaptive Design Data',
        formType: 'repeated',
        fields: [
          { fieldName: 'interim_analysis_date', fieldType: 'date', required: false },
          { fieldName: 'biomarker_stratification', fieldType: 'dropdown', required: true },
          { fieldName: 'arm_modification', fieldType: 'radio', required: false },
          { fieldName: 'futility_assessment', fieldType: 'radio', required: false }
        ]
      }
    ];

    return {
      id: 'complex-multiarm',
      name: 'Complex Multi-Arm Platform Study',
      description: 'Very high complexity adaptive platform study with biomarker stratification',
      protocol,
      crfs,
      expectedResults: {
        feasibilityScore: { min: 45, max: 60 },
        riskLevel: 'Very High',
        complexity: 'Very High',
        criticalIssues: 4,
        keyFindings: 8
      },
      tags: ['phase2', 'oncology', 'adaptive', 'platform', 'biomarker-driven', 'multi-arm', 'very-high-complexity']
    };
  }

  /**
   * Rare Disease Pediatric Protocol - High Risk, Specialized Population
   */
  private getRareDiseasePediatricProtocol(): TestCase {
    const protocol: StudyProtocol = {
      protocolNumber: 'RARE-005-P2',
      studyTitle: 'A Phase 2, Open-Label Study of STU-456 in Pediatric Patients with Duchenne Muscular Dystrophy',
      studyPhase: '2',
      studyDesign: {
        type: 'Open-label, single-arm, multicenter study',
        numberOfArms: 1,
        intervention: 'STU-456 (antisense oligonucleotide)'
      },
      studyObjective: 'To evaluate the efficacy and safety of STU-456 in slowing disease progression in pediatric patients with Duchenne muscular dystrophy',
      therapeuticArea: 'Neuromuscular Disorders',
      indication: 'Duchenne muscular dystrophy (DMD) in ambulatory pediatric patients',
      sponsor: 'Rare Disease Therapeutics',
      population: {
        targetEnrollment: 25,
        inclusionCriteria: [
          'Males aged 4-10 years with genetically confirmed DMD',
          'Ambulatory (able to walk ≥350 meters in 6MWT)',
          'Stable corticosteroid therapy ≥6 months',
          'Adequate organ function for age'
        ],
        exclusionCriteria: [
          'Previous exposure to experimental dystrophin restoration therapy',
          'Non-ambulatory patients',
          'Significant cardiac or respiratory compromise',
          'Recent participation in other interventional studies'
        ]
      },
      endpoints: {
        primary: ['Change from baseline in North Star Ambulatory Assessment (NSAA) total score at 48 weeks'],
        secondary: [
          'Change from baseline in 6-minute walk test distance',
          'Change from baseline in time to rise from floor',
          'Change from baseline in serum creatine kinase levels',
          'Dystrophin expression by muscle biopsy',
          'Safety and tolerability in pediatric population'
        ],
        exploratory: [
          'Quality of life assessments (PedsQL)',
          'Caregiver burden assessment',
          'Functional biomarkers',
          'Long-term motor function trajectory'
        ]
      },
      visitSchedule: [
        {
          visitName: 'Screening',
          timepoint: 'Days -28 to -1',
          procedures: ['Medical history', 'Physical exam', 'Genetic testing confirmation', 'NSAA', '6MWT', 'Laboratory tests', 'ECG', 'ECHO', 'Pulmonary function', 'Muscle biopsy']
        },
        {
          visitName: 'Baseline/Treatment Start',
          timepoint: 'Day 1',
          procedures: ['Physical exam', 'Vital signs', 'NSAA', '6MWT', 'First dose administration', 'Safety assessment']
        },
        {
          visitName: 'Week 4',
          timepoint: 'Week 4',
          procedures: ['Physical exam', 'NSAA', 'Safety assessment', 'Laboratory tests']
        },
        {
          visitName: 'Week 12',
          timepoint: 'Week 12',
          procedures: ['Physical exam', 'NSAA', '6MWT', 'Time to rise', 'Laboratory tests', 'ECG']
        },
        {
          visitName: 'Week 24',
          timepoint: 'Week 24',
          procedures: ['Physical exam', 'NSAA', '6MWT', 'Laboratory tests', 'Muscle biopsy', 'PedsQL']
        },
        {
          visitName: 'Week 48/End of Study',
          timepoint: 'Week 48',
          procedures: ['Physical exam', 'NSAA', '6MWT', 'Time to rise', 'Laboratory tests', 'ECG', 'ECHO', 'Muscle biopsy', 'PedsQL']
        }
      ],
      studyDuration: '24 months',
      studyLocations: [
        { country: 'United States', region: 'North America', sites: 8 },
        { country: 'Canada', region: 'North America', sites: 2 },
        { country: 'United Kingdom', region: 'Europe', sites: 3 },
        { country: 'France', region: 'Europe', sites: 2 }
      ]
    };

    const crfs: CRFSpecification[] = [
      {
        formName: 'Demographics',
        formType: 'baseline',
        fields: [
          { fieldName: 'date_of_birth', fieldType: 'date', required: true },
          { fieldName: 'age_at_enrollment', fieldType: 'number', required: true },
          { fieldName: 'race', fieldType: 'checkbox', required: true },
          { fieldName: 'weight', fieldType: 'number', required: true },
          { fieldName: 'height', fieldType: 'number', required: true }
        ]
      },
      {
        formName: 'DMD Disease History',
        formType: 'baseline',
        fields: [
          { fieldName: 'genetic_mutation', fieldType: 'text', required: true },
          { fieldName: 'age_at_diagnosis', fieldType: 'number', required: true },
          { fieldName: 'age_walking_independently', fieldType: 'number', required: false },
          { fieldName: 'corticosteroid_therapy', fieldType: 'dropdown', required: true },
          { fieldName: 'family_history', fieldType: 'textarea', required: false }
        ]
      },
      {
        formName: 'North Star Ambulatory Assessment',
        formType: 'repeated',
        fields: [
          { fieldName: 'assessment_date', fieldType: 'date', required: true },
          { fieldName: 'total_score', fieldType: 'number', required: true, validation: { type: 'range', min: 0, max: 34 } },
          { fieldName: 'individual_items', fieldType: 'textarea', required: true },
          { fieldName: 'assessor_initials', fieldType: 'text', required: true }
        ]
      },
      {
        formName: '6-Minute Walk Test',
        formType: 'repeated',
        fields: [
          { fieldName: 'test_date', fieldType: 'date', required: true },
          { fieldName: 'distance_walked', fieldType: 'number', required: true },
          { fieldName: 'test_completed', fieldType: 'radio', required: true },
          { fieldName: 'reason_not_completed', fieldType: 'text', required: false },
          { fieldName: 'assistive_devices', fieldType: 'radio', required: true }
        ]
      },
      {
        formName: 'Muscle Biopsy Results',
        formType: 'repeated',
        fields: [
          { fieldName: 'biopsy_date', fieldType: 'date', required: true },
          { fieldName: 'dystrophin_expression', fieldType: 'number', required: false },
          { fieldName: 'fiber_analysis', fieldType: 'textarea', required: false },
          { fieldName: 'inflammation_score', fieldType: 'number', required: false },
          { fieldName: 'sample_quality', fieldType: 'dropdown', required: true }
        ]
      },
      {
        formName: 'PedsQL Assessment',
        formType: 'repeated',
        fields: [
          { fieldName: 'assessment_date', fieldType: 'date', required: true },
          { fieldName: 'physical_functioning', fieldType: 'number', required: false },
          { fieldName: 'emotional_functioning', fieldType: 'number', required: false },
          { fieldName: 'social_functioning', fieldType: 'number', required: false },
          { fieldName: 'school_functioning', fieldType: 'number', required: false },
          { fieldName: 'completed_by', fieldType: 'dropdown', required: true }
        ]
      },
      {
        formName: 'Pediatric Safety Assessment',
        formType: 'repeated',
        fields: [
          { fieldName: 'adverse_event', fieldType: 'text', required: false },
          { fieldName: 'severity_grade', fieldType: 'dropdown', required: false },
          { fieldName: 'relationship', fieldType: 'dropdown', required: false },
          { fieldName: 'action_taken', fieldType: 'dropdown', required: false },
          { fieldName: 'growth_parameters', fieldType: 'text', required: false }
        ]
      }
    ];

    return {
      id: 'rare-disease-pediatric',
      name: 'Rare Disease Pediatric Study',
      description: 'High-risk rare disease study in pediatric population with specialized endpoints',
      protocol,
      crfs,
      expectedResults: {
        feasibilityScore: { min: 50, max: 65 },
        riskLevel: 'High',
        complexity: 'High',
        criticalIssues: 3,
        keyFindings: 6
      },
      tags: ['phase2', 'rare-disease', 'pediatric', 'neuromuscular', 'small-enrollment', 'specialized-endpoints']
    };
  }

  /**
   * Observational Cohort Study - Lower Risk, Real-World Data
   */
  private getObservationalCohortStudy(): TestCase {
    const protocol: StudyProtocol = {
      protocolNumber: 'OBS-006-COHORT',
      studyTitle: 'A Prospective, Multicenter, Observational Cohort Study of Treatment Patterns and Outcomes in Patients with Rheumatoid Arthritis',
      studyPhase: 'N/A',
      studyDesign: {
        type: 'Prospective, observational cohort study',
        numberOfArms: 1,
        intervention: 'No intervention - observational only'
      },
      studyObjective: 'To describe real-world treatment patterns, clinical outcomes, and healthcare utilization in patients with rheumatoid arthritis',
      therapeuticArea: 'Rheumatology',
      indication: 'Rheumatoid arthritis',
      sponsor: 'Real-World Evidence Consortium',
      population: {
        targetEnrollment: 1200,
        inclusionCriteria: [
          'Adults ≥18 years with physician-diagnosed rheumatoid arthritis',
          'Meeting ACR/EULAR 2010 classification criteria',
          'Willing to provide informed consent for data collection',
          'Available medical records for ≥6 months prior to enrollment'
        ],
        exclusionCriteria: [
          'Participation in interventional clinical trials',
          'Unable to provide informed consent',
          'Life expectancy <2 years'
        ]
      },
      endpoints: {
        primary: ['Description of treatment patterns over 24 months'],
        secondary: [
          'Time to treatment modification or discontinuation',
          'Achievement of low disease activity (DAS28 <3.2)',
          'Functional disability progression (HAQ-DI)',
          'Healthcare resource utilization',
          'Work productivity and activity impairment',
          'Patient-reported outcomes'
        ],
        exploratory: [
          'Biomarker associations with treatment response',
          'Healthcare cost analysis',
          'Treatment satisfaction and adherence',
          'Comorbidity impact on outcomes'
        ]
      },
      visitSchedule: [
        {
          visitName: 'Enrollment',
          timepoint: 'Day 1',
          procedures: ['Informed consent', 'Demographics', 'Disease history', 'Current treatments', 'DAS28', 'HAQ-DI', 'Patient questionnaires']
        },
        {
          visitName: '6-Month Follow-up',
          timepoint: 'Month 6',
          procedures: ['Treatment changes', 'DAS28', 'HAQ-DI', 'Healthcare utilization', 'Patient questionnaires']
        },
        {
          visitName: '12-Month Follow-up',
          timepoint: 'Month 12',
          procedures: ['Treatment changes', 'DAS28', 'HAQ-DI', 'Healthcare utilization', 'Work productivity', 'Patient questionnaires']
        },
        {
          visitName: '18-Month Follow-up',
          timepoint: 'Month 18',
          procedures: ['Treatment changes', 'DAS28', 'HAQ-DI', 'Healthcare utilization', 'Patient questionnaires']
        },
        {
          visitName: '24-Month Follow-up',
          timepoint: 'Month 24',
          procedures: ['Treatment changes', 'DAS28', 'HAQ-DI', 'Healthcare utilization', 'Work productivity', 'Patient questionnaires', 'Study completion']
        }
      ],
      studyDuration: '30 months',
      studyLocations: [
        { country: 'United States', region: 'North America', sites: 40 },
        { country: 'Canada', region: 'North America', sites: 8 },
        { country: 'United Kingdom', region: 'Europe', sites: 12 },
        { country: 'Germany', region: 'Europe', sites: 10 },
        { country: 'France', region: 'Europe', sites: 8 }
      ]
    };

    const crfs: CRFSpecification[] = [
      {
        formName: 'Demographics',
        formType: 'baseline',
        fields: [
          { fieldName: 'date_of_birth', fieldType: 'date', required: true },
          { fieldName: 'gender', fieldType: 'radio', required: true },
          { fieldName: 'race', fieldType: 'checkbox', required: true },
          { fieldName: 'education_level', fieldType: 'dropdown', required: false },
          { fieldName: 'employment_status', fieldType: 'dropdown', required: false }
        ]
      },
      {
        formName: 'RA Disease History',
        formType: 'baseline',
        fields: [
          { fieldName: 'diagnosis_date', fieldType: 'date', required: true },
          { fieldName: 'rf_status', fieldType: 'radio', required: false },
          { fieldName: 'anti_ccp_status', fieldType: 'radio', required: false },
          { fieldName: 'joint_erosions', fieldType: 'radio', required: false },
          { fieldName: 'extraarticular_manifestations', fieldType: 'checkbox', required: false }
        ]
      },
      {
        formName: 'DAS28 Assessment',
        formType: 'repeated',
        fields: [
          { fieldName: 'assessment_date', fieldType: 'date', required: true },
          { fieldName: 'tender_joint_count', fieldType: 'number', required: true, validation: { type: 'range', min: 0, max: 28 } },
          { fieldName: 'swollen_joint_count', fieldType: 'number', required: true, validation: { type: 'range', min: 0, max: 28 } },
          { fieldName: 'patient_global_vas', fieldType: 'number', required: true, validation: { type: 'range', min: 0, max: 100 } },
          { fieldName: 'esr_value', fieldType: 'number', required: false },
          { fieldName: 'das28_score', fieldType: 'number', required: true }
        ]
      },
      {
        formName: 'HAQ-DI Assessment',
        formType: 'repeated',
        fields: [
          { fieldName: 'assessment_date', fieldType: 'date', required: true },
          { fieldName: 'haq_total_score', fieldType: 'number', required: true, validation: { type: 'range', min: 0, max: 3 } },
          { fieldName: 'disability_categories', fieldType: 'textarea', required: false }
        ]
      },
      {
        formName: 'Treatment History',
        formType: 'repeated',
        fields: [
          { fieldName: 'medication_name', fieldType: 'text', required: true },
          { fieldName: 'medication_class', fieldType: 'dropdown', required: true },
          { fieldName: 'start_date', fieldType: 'date', required: true },
          { fieldName: 'stop_date', fieldType: 'date', required: false },
          { fieldName: 'reason_for_change', fieldType: 'dropdown', required: false },
          { fieldName: 'response_to_treatment', fieldType: 'dropdown', required: false }
        ]
      },
      {
        formName: 'Healthcare Utilization',
        formType: 'repeated',
        fields: [
          { fieldName: 'period_start', fieldType: 'date', required: true },
          { fieldName: 'period_end', fieldType: 'date', required: true },
          { fieldName: 'rheumatology_visits', fieldType: 'number', required: false },
          { fieldName: 'primary_care_visits', fieldType: 'number', required: false },
          { fieldName: 'emergency_visits', fieldType: 'number', required: false },
          { fieldName: 'hospitalizations', fieldType: 'number', required: false },
          { fieldName: 'imaging_studies', fieldType: 'number', required: false }
        ]
      }
    ];

    return {
      id: 'observational-cohort',
      name: 'Observational Cohort Study',
      description: 'Large real-world evidence study with minimal intervention requirements',
      protocol,
      crfs,
      expectedResults: {
        feasibilityScore: { min: 85, max: 95 },
        riskLevel: 'Low',
        complexity: 'Low',
        criticalIssues: 0,
        keyFindings: 2
      },
      tags: ['observational', 'cohort', 'real-world-evidence', 'rheumatology', 'large-enrollment', 'low-risk']
    };
  }

  /**
   * Biomarker Validation Study - Medium Complexity, Specialized Analysis
   */
  private getBiomarkerValidationStudy(): TestCase {
    const protocol: StudyProtocol = {
      protocolNumber: 'BIOMARK-007-VAL',
      studyTitle: 'A Prospective, Multi-Center Study to Validate Circulating Biomarkers for Early Detection of Alzheimer\'s Disease',
      studyPhase: 'N/A',
      studyDesign: {
        type: 'Prospective, observational, biomarker validation study',
        numberOfArms: 3,
        intervention: 'No intervention - biomarker collection and validation'
      },
      studyObjective: 'To validate the performance of a panel of blood-based biomarkers for early detection of Alzheimer\'s disease in comparison to established CSF and imaging biomarkers',
      therapeuticArea: 'Neurology',
      indication: 'Mild cognitive impairment and early Alzheimer\'s disease',
      sponsor: 'Alzheimer\'s Biomarker Consortium',
      population: {
        targetEnrollment: 450,
        inclusionCriteria: [
          'Adults 55-85 years',
          'Cognitively normal controls, MCI, or mild AD dementia',
          'MMSE score 20-30',
          'Willing to undergo lumbar puncture and neuroimaging',
          'Study partner available for cognitive assessments'
        ],
        exclusionCriteria: [
          'Other causes of cognitive impairment',
          'Significant psychiatric or neurological disorders',
          'Contraindications to MRI or lumbar puncture',
          'Use of investigational drugs within 30 days',
          'Inability to provide informed consent'
        ]
      },
      endpoints: {
        primary: ['Diagnostic accuracy of blood biomarker panel compared to CSF Aβ42/tau ratio'],
        secondary: [
          'Correlation between blood and CSF biomarkers',
          'Correlation between blood biomarkers and amyloid PET',
          'Longitudinal changes in biomarker levels',
          'Cognitive decline prediction accuracy',
          'Biomarker performance across APOE genotypes'
        ],
        exploratory: [
          'Novel biomarker discovery',
          'Multi-modal biomarker combinations',
          'Ethnic and demographic subgroup analyses',
          'Cost-effectiveness of blood vs CSF testing'
        ]
      },
      visitSchedule: [
        {
          visitName: 'Screening',
          timepoint: 'Days -28 to -1',
          procedures: ['Informed consent', 'Medical history', 'Neurological exam', 'MMSE', 'CDR', 'Blood collection', 'APOE genotyping']
        },
        {
          visitName: 'Baseline',
          timepoint: 'Day 1',
          procedures: ['Cognitive battery', 'Blood biomarkers', 'CSF collection', 'MRI brain', 'Amyloid PET']
        },
        {
          visitName: '6-Month Follow-up',
          timepoint: 'Month 6',
          procedures: ['Cognitive battery', 'Blood biomarkers', 'Clinical assessments']
        },
        {
          visitName: '12-Month Follow-up',
          timepoint: 'Month 12',
          procedures: ['Cognitive battery', 'Blood biomarkers', 'CSF collection', 'MRI brain']
        },
        {
          visitName: '18-Month Follow-up',
          timepoint: 'Month 18',
          procedures: ['Cognitive battery', 'Blood biomarkers', 'Clinical assessments']
        },
        {
          visitName: '24-Month Follow-up',
          timepoint: 'Month 24',
          procedures: ['Cognitive battery', 'Blood biomarkers', 'CSF collection', 'MRI brain', 'Amyloid PET']
        }
      ],
      studyDuration: '36 months',
      studyLocations: [
        { country: 'United States', region: 'North America', sites: 15 },
        { country: 'Canada', region: 'North America', sites: 3 },
        { country: 'Germany', region: 'Europe', sites: 5 },
        { country: 'Sweden', region: 'Europe', sites: 3 },
        { country: 'Australia', region: 'Asia-Pacific', sites: 4 }
      ]
    };

    const crfs: CRFSpecification[] = [
      {
        formName: 'Demographics',
        formType: 'baseline',
        fields: [
          { fieldName: 'date_of_birth', fieldType: 'date', required: true },
          { fieldName: 'gender', fieldType: 'radio', required: true },
          { fieldName: 'race', fieldType: 'checkbox', required: true },
          { fieldName: 'education_years', fieldType: 'number', required: true },
          { fieldName: 'handedness', fieldType: 'radio', required: true }
        ]
      },
      {
        formName: 'Cognitive Assessments',
        formType: 'repeated',
        fields: [
          { fieldName: 'assessment_date', fieldType: 'date', required: true },
          { fieldName: 'mmse_score', fieldType: 'number', required: true, validation: { type: 'range', min: 0, max: 30 } },
          { fieldName: 'cdr_global', fieldType: 'dropdown', required: true },
          { fieldName: 'adas_cog_score', fieldType: 'number', required: false },
          { fieldName: 'cognitive_diagnosis', fieldType: 'dropdown', required: true }
        ]
      },
      {
        formName: 'Blood Biomarkers',
        formType: 'repeated',
        fields: [
          { fieldName: 'collection_date', fieldType: 'date', required: true },
          { fieldName: 'collection_time', fieldType: 'time', required: true },
          { fieldName: 'fasting_status', fieldType: 'radio', required: true },
          { fieldName: 'plasma_abeta42', fieldType: 'number', required: false },
          { fieldName: 'plasma_tau', fieldType: 'number', required: false },
          { fieldName: 'nefl_level', fieldType: 'number', required: false },
          { fieldName: 'sample_quality', fieldType: 'dropdown', required: true }
        ]
      },
      {
        formName: 'CSF Biomarkers',
        formType: 'repeated',
        fields: [
          { fieldName: 'collection_date', fieldType: 'date', required: true },
          { fieldName: 'csf_abeta42', fieldType: 'number', required: false },
          { fieldName: 'csf_tau', fieldType: 'number', required: false },
          { fieldName: 'csf_ptau', fieldType: 'number', required: false },
          { fieldName: 'abeta_tau_ratio', fieldType: 'number', required: false },
          { fieldName: 'lp_complications', fieldType: 'radio', required: true }
        ]
      },
      {
        formName: 'Neuroimaging',
        formType: 'repeated',
        fields: [
          { fieldName: 'scan_date', fieldType: 'date', required: true },
          { fieldName: 'scan_type', fieldType: 'dropdown', required: true },
          { fieldName: 'amyloid_suvr', fieldType: 'number', required: false },
          { fieldName: 'hippocampal_volume', fieldType: 'number', required: false },
          { fieldName: 'cortical_thickness', fieldType: 'number', required: false },
          { fieldName: 'scan_quality', fieldType: 'dropdown', required: true }
        ]
      },
      {
        formName: 'Genetic Testing',
        formType: 'baseline',
        fields: [
          { fieldName: 'apoe_genotype', fieldType: 'dropdown', required: false },
          { fieldName: 'apoe_e4_status', fieldType: 'radio', required: false },
          { fieldName: 'consent_for_genetics', fieldType: 'radio', required: true }
        ]
      }
    ];

    return {
      id: 'biomarker-validation',
      name: 'Biomarker Validation Study',
      description: 'Specialized biomarker validation study with complex laboratory and imaging requirements',
      protocol,
      crfs,
      expectedResults: {
        feasibilityScore: { min: 70, max: 80 },
        riskLevel: 'Medium',
        complexity: 'Medium',
        criticalIssues: 1,
        keyFindings: 4
      },
      tags: ['biomarker', 'validation', 'neurology', 'alzheimers', 'multi-modal', 'specialized-procedures']
    };
  }

  /**
   * Medical Device Trial - Regulatory Complexity, Novel Endpoints
   */
  private getDeviceTrialProtocol(): TestCase {
    const protocol: StudyProtocol = {
      protocolNumber: 'DEVICE-008-P3',
      studyTitle: 'A Pivotal, Randomized, Controlled Trial Comparing the XYZ Cardiac Ablation System to Standard Radiofrequency Ablation for Treatment of Atrial Fibrillation',
      studyPhase: '3',
      studyDesign: {
        type: 'Randomized, controlled, single-blind, pivotal device trial',
        numberOfArms: 2,
        intervention: 'XYZ Cardiac Ablation System vs Standard Radiofrequency Ablation'
      },
      studyObjective: 'To demonstrate non-inferiority of the XYZ Cardiac Ablation System compared to standard radiofrequency ablation for treating drug-refractory atrial fibrillation',
      therapeuticArea: 'Cardiology',
      indication: 'Drug-refractory atrial fibrillation',
      sponsor: 'XYZ Medical Devices Inc.',
      population: {
        targetEnrollment: 380,
        inclusionCriteria: [
          'Adults 18-75 years with drug-refractory atrial fibrillation',
          'Failed ≥1 antiarrhythmic drug',
          'LA diameter ≤5.5 cm',
          'Eligible for catheter ablation per guidelines',
          'Able to undergo anticoagulation'
        ],
        exclusionCriteria: [
          'Previous catheter ablation for atrial fibrillation',
          'Permanent atrial fibrillation >12 months',
          'Significant structural heart disease',
          'Contraindications to anticoagulation',
          'Life expectancy <2 years'
        ]
      },
      endpoints: {
        primary: ['Freedom from atrial arrhythmia recurrence at 12 months post-procedure'],
        secondary: [
          'Acute procedural success rate',
          'Procedure time and fluoroscopy time',
          'Freedom from repeat ablation procedures',
          'Quality of life improvement (AFEQT score)',
          'Major adverse events at 30 days',
          'Healthcare utilization at 12 months'
        ],
        exploratory: [
          'Learning curve analysis',
          'Predictors of procedural success',
          'Cost-effectiveness analysis',
          'Long-term arrhythmia burden'
        ]
      },
      visitSchedule: [
        {
          visitName: 'Screening',
          timepoint: 'Days -30 to -1',
          procedures: ['Medical history', 'Physical exam', 'ECG', 'Echocardiogram', 'Holter monitor', 'Laboratory tests', 'AFEQT questionnaire']
        },
        {
          visitName: 'Procedure Day',
          timepoint: 'Day 0',
          procedures: ['Pre-procedure assessment', 'Catheter ablation procedure', 'Acute procedural outcomes', 'Post-procedure monitoring']
        },
        {
          visitName: '30-Day Follow-up',
          timepoint: 'Day 30',
          procedures: ['Physical exam', 'ECG', 'Adverse event assessment', 'Medication review']
        },
        {
          visitName: '3-Month Follow-up',
          timepoint: 'Month 3',
          procedures: ['Physical exam', 'ECG', 'Holter monitor', 'AFEQT questionnaire', 'Adverse event assessment']
        },
        {
          visitName: '6-Month Follow-up',
          timepoint: 'Month 6',
          procedures: ['Physical exam', 'ECG', 'Holter monitor', 'AFEQT questionnaire']
        },
        {
          visitName: '12-Month Follow-up',
          timepoint: 'Month 12',
          procedures: ['Physical exam', 'ECG', 'Holter monitor', 'Echocardiogram', 'AFEQT questionnaire', 'Healthcare utilization']
        }
      ],
      studyDuration: '24 months',
      studyLocations: [
        { country: 'United States', region: 'North America', sites: 25 },
        { country: 'Germany', region: 'Europe', sites: 8 },
        { country: 'France', region: 'Europe', sites: 6 },
        { country: 'Japan', region: 'Asia', sites: 4 }
      ]
    };

    const crfs: CRFSpecification[] = [
      {
        formName: 'Demographics',
        formType: 'baseline',
        fields: [
          { fieldName: 'date_of_birth', fieldType: 'date', required: true },
          { fieldName: 'gender', fieldType: 'radio', required: true },
          { fieldName: 'race', fieldType: 'checkbox', required: true },
          { fieldName: 'weight', fieldType: 'number', required: true },
          { fieldName: 'height', fieldType: 'number', required: true }
        ]
      },
      {
        formName: 'Atrial Fibrillation History',
        formType: 'baseline',
        fields: [
          { fieldName: 'af_type', fieldType: 'dropdown', required: true },
          { fieldName: 'af_duration', fieldType: 'number', required: true },
          { fieldName: 'failed_aad_count', fieldType: 'number', required: true },
          { fieldName: 'chads2_score', fieldType: 'number', required: true },
          { fieldName: 'cha2ds2_vasc_score', fieldType: 'number', required: true }
        ]
      },
      {
        formName: 'Procedure Details',
        formType: 'procedure',
        fields: [
          { fieldName: 'procedure_date', fieldType: 'date', required: true },
          { fieldName: 'device_used', fieldType: 'dropdown', required: true },
          { fieldName: 'procedure_duration', fieldType: 'number', required: true },
          { fieldName: 'fluoroscopy_time', fieldType: 'number', required: true },
          { fieldName: 'acute_success', fieldType: 'radio', required: true },
          { fieldName: 'complications', fieldType: 'checkbox', required: false }
        ]
      },
      {
        formName: 'Holter Monitor Results',
        formType: 'repeated',
        fields: [
          { fieldName: 'monitor_date', fieldType: 'date', required: true },
          { fieldName: 'monitoring_duration', fieldType: 'number', required: true },
          { fieldName: 'af_burden_percent', fieldType: 'number', required: false },
          { fieldName: 'af_episodes', fieldType: 'number', required: false },
          { fieldName: 'monitor_quality', fieldType: 'dropdown', required: true }
        ]
      },
      {
        formName: 'AFEQT Assessment',
        formType: 'repeated',
        fields: [
          { fieldName: 'assessment_date', fieldType: 'date', required: true },
          { fieldName: 'overall_score', fieldType: 'number', required: true },
          { fieldName: 'symptoms_score', fieldType: 'number', required: true },
          { fieldName: 'daily_activities_score', fieldType: 'number', required: true },
          { fieldName: 'treatment_concern_score', fieldType: 'number', required: true }
        ]
      },
      {
        formName: 'Device Performance',
        formType: 'repeated',
        fields: [
          { fieldName: 'assessment_date', fieldType: 'date', required: true },
          { fieldName: 'device_function', fieldType: 'dropdown', required: true },
          { fieldName: 'technical_issues', fieldType: 'textarea', required: false },
          { fieldName: 'operator_assessment', fieldType: 'dropdown', required: true }
        ]
      }
    ];

    return {
      id: 'device-trial',
      name: 'Medical Device Pivotal Trial',
      description: 'FDA pivotal trial for medical device with regulatory complexity and specialized endpoints',
      protocol,
      crfs,
      expectedResults: {
        feasibilityScore: { min: 65, max: 80 },
        riskLevel: 'Medium',
        complexity: 'High',
        criticalIssues: 2,
        keyFindings: 5
      },
      tags: ['phase3', 'medical-device', 'pivotal', 'cardiology', 'non-inferiority', 'regulatory-complex']
    };
  }
}

// Export singleton instance
export const sampleProtocolLibrary = new SampleProtocolLibrary();