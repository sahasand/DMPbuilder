# Existing Modules Documentation

This document provides detailed documentation for all currently implemented modules in the Clinical DMP Generator system.

## Table of Contents

1. [Module Overview](#module-overview)
2. [DMP Builder Module](#dmp-builder-module)
3. [Protocol Analyzer Module](#protocol-analyzer-module)
4. [CRF Validator Module](#crf-validator-module)
5. [Module Usage Examples](#module-usage-examples)
6. [API Integration](#api-integration)
7. [Configuration Reference](#configuration-reference)

## Module Overview

The system currently includes the following modules:

| Module ID | Name | Type | Version | Status |
|-----------|------|------|---------|---------|
| `dmp-builder` | DMP Builder | report-generator | 1.0.0 | ✅ Active |
| `protocol-analyzer` | Protocol Analyzer | protocol-analyzer | 1.0.0 | ✅ Active |
| `crf-validator` | CRF Validator | data-validator | 1.0.0 | ✅ Active |

### Future Modules (Planned)

The following modules are planned for future development:

- **Report Generator**: Generates specialized clinical reports
- **Compliance Checker**: Checks regulatory compliance requirements
- **Risk Assessor**: Comprehensive study risk assessment
- **Timeline Planner**: Project timeline and milestone planning
- **Endpoint Analyzer**: Study endpoint analysis and optimization
- **Safety Monitor**: Safety signal detection and monitoring
- **Quality Controller**: Quality control and assurance checks
- **Regulatory Reviewer**: Regulatory submission requirements review

## DMP Builder Module

### Overview

The DMP Builder is the core module that generates comprehensive Data Management Plans with AI enhancement. It integrates with other modules to create comprehensive, intelligent DMPs that incorporate analysis results and recommendations.

### Module Information

```json
{
  "id": "dmp-builder",
  "name": "Data Management Plan Builder",
  "version": "1.0.0",
  "description": "Generates comprehensive data management plans with AI enhancement",
  "author": "Clinical DMP Generator Team",
  "type": "report-generator"
}
```

### Capabilities

- **AI-Enhanced Generation**: Uses Claude and Gemini AI for intelligent content creation
- **Template-Based Structure**: Follows industry-standard DMP templates
- **Module Integration**: Incorporates insights from Protocol Analyzer and CRF Validator
- **Multi-Format Export**: Generates PDF, Word, and Markdown formats
- **CDISC Compliance**: Ensures adherence to clinical data standards
- **Regulatory Alignment**: Adapts content for different regulatory requirements

### Input Requirements

#### Required
- `StudyProtocol`: Complete study protocol object
- `CRFSpecification[]`: Array of CRF specifications

#### Optional
- `ModuleResults[]`: Results from other modules for enhancement
- `GenerationOptions`: Customization options for DMP content

### Output Format

```typescript
interface DMPResponse {
  studyInfo: {
    studyTitle: string;
    protocolNumber: string;
    studyPhase: string;
    sponsor: string;
  };
  metadata: {
    processingTime: number;
    crfForms: number;
    recommendations?: string[];
    warnings?: string[];
  };
  downloadLinks: {
    pdf?: string;
    word?: string;
    markdown?: string;
  };
}
```

## Protocol Analyzer Module

### Overview

The Protocol Analyzer is a comprehensive module that analyzes clinical study protocols to assess complexity, identify risk factors, classify therapeutic areas, and provide actionable recommendations for data management planning.

### Module Information

```json
{
  "id": "protocol-analyzer",
  "name": "Protocol Analyzer",
  "version": "1.0.0",
  "description": "Analyzes clinical protocols for complexity, risk factors, and regulatory requirements",
  "author": "Clinical DMP Generator Team",
  "type": "protocol-analyzer"
}
```

### Capabilities

- **Protocol Complexity Assessment**: Multi-dimensional complexity scoring
- **Risk Factor Identification**: Comprehensive risk analysis with mitigation strategies
- **Therapeutic Area Classification**: Automated classification with confidence scoring
- **Regulatory Requirements Analysis**: Identification of applicable guidelines and submissions
- **Resource Estimation**: Timeline and staffing requirement estimates
- **DMP Enhancement**: Intelligent modifications to generated DMPs

### Input Requirements

The module processes the following input data:

#### Required
- `StudyProtocol`: Complete study protocol object with:
  - Study title and protocol number
  - Study phase and design information
  - Population and enrollment details
  - Objectives and endpoints
  - Indication and therapeutic area

#### Optional
- `CRFSpecification[]`: Array of CRF specifications for enhanced analysis

### Analysis Components

#### 1. Complexity Assessment

**Scoring Factors:**
- **Study Phase Weight** (20% of score)
  - Phase 1: 0.8 (high complexity)
  - Phase 2: 0.6 (medium complexity)
  - Phase 3: 0.9 (very high complexity)
  - Phase 4: 0.4 (low complexity)

- **Design Complexity** (30% of score)
  - Multiple arms: +0.3
  - Blinded design: +0.2
  - Crossover design: +0.4

- **Population Complexity** (20% of score)
  - Large enrollment (>500): +0.3
  - Medium enrollment (100-500): +0.1
  - Pediatric population: +0.4

- **Endpoints Complexity** (20% of score)
  - Primary endpoints: 0.2 per endpoint (max 0.4)
  - Secondary endpoints: 0.1 per endpoint (max 0.3)
  - Exploratory endpoints: 0.05 per endpoint (max 0.3)

- **CRF Complexity** (10% of score)
  - Form count contribution: forms/20 (max 0.5)
  - Field count contribution: total_fields/200 (max 0.5)

**Complexity Levels:**
- **Low** (0.0 - 0.3): Simple studies with straightforward requirements
- **Medium** (0.3 - 0.6): Standard complexity requiring careful management
- **High** (0.6 - 0.8): Complex studies requiring enhanced procedures
- **Very High** (0.8 - 1.0): Highly complex studies requiring specialized expertise

#### 2. Risk Assessment

**Risk Categories:**

**Safety Risks:**
- First-in-human studies (Phase 1): High risk
- Pediatric populations: Medium risk
- Oncology studies: Medium risk
- Cardiovascular studies: Medium risk

**Data Quality Risks:**
- Open-label designs: Medium risk (bias potential)
- Multiple sites: Variable risk based on site count
- Complex endpoints: Risk based on endpoint complexity

**Regulatory Risks:**
- Multi-regional studies: Varying requirements
- Novel therapeutic areas: Increased regulatory scrutiny
- Special populations: Additional regulatory considerations

#### 3. Therapeutic Area Classification

**Supported Classifications:**
- **Oncology**: Keywords: cancer, tumor, oncology, chemotherapy, radiation
- **Cardiovascular**: Keywords: cardiac, heart, cardiovascular, hypertension, arrhythmia
- **Neurology**: Keywords: neuro, brain, alzheimer, parkinson, dementia
- **Infectious Disease**: Keywords: infection, viral, bacterial, antibiotic, vaccine
- **Endocrinology**: Keywords: diabetes, hormone, thyroid, metabolic, insulin
- **Respiratory**: Keywords: lung, respiratory, asthma, copd, pneumonia
- **Immunology**: Keywords: immune, autoimmune, rheumatoid, lupus, immunology
- **Psychiatry**: Keywords: depression, anxiety, psychiatric, mental, schizophrenia

**Classification Method:**
- Keyword matching against indication and study title
- Confidence scoring based on keyword match ratio
- Primary and secondary therapeutic area identification

#### 4. Resource Estimation

**Timeline Estimation:**
- Base duration by phase:
  - Phase 1: 6 months
  - Phase 2: 12 months
  - Phase 3: 24 months
  - Phase 4: Variable
- Complexity multiplier: 1 + (complexity_score * 0.5)

**Data Management Effort:**
- Base calculation: enrollment × visits × 0.1 hours
- Complexity adjustment applied
- FTE recommendations:
  - < 100 hours: 0.5 FTE
  - 100-300 hours: 1.0 FTE
  - 300-600 hours: 1.5 FTE
  - > 600 hours: 2.0+ FTE

**Monitoring Requirements:**
- Low complexity: Low monitoring
- Medium complexity: Medium monitoring
- High/Very High complexity: High monitoring

### Output Format

```typescript
interface ProtocolAnalysisResult {
  complexity: {
    score: number;                    // 0.0 - 1.0
    level: 'low' | 'medium' | 'high' | 'very-high';
    factors: string[];               // Contributing factors
  };
  riskAssessment: {
    overall: 'low' | 'medium' | 'high';
    factors: RiskFactor[];           // Detailed risk factors
  };
  therapeuticArea: {
    primary: string;                 // Primary classification
    secondary: string[];             // Secondary classifications
    confidence: number;              // 0.0 - 1.0
  };
  regulatoryRequirements: {
    regions: string[];               // Applicable regions
    guidelines: string[];            // Required guidelines
    submissions: string[];           // Required submissions
  };
  resourceEstimate: {
    estimatedDuration: string;       // Duration estimate
    dataManagerEffort: string;       // FTE requirement
    monitoringRequirement: 'low' | 'medium' | 'high';
  };
  recommendations: string[];         // Actionable recommendations
}
```

### Configuration Options

```json
{
  "enabled": true,
  "priority": 1,
  "therapeuticAreas": ["all"],
  "studyPhases": ["Phase 1", "Phase 2", "Phase 3", "Phase 4"],
  "settings": {
    "enableDetailedAnalysis": true,
    "includeRiskAssessment": true,
    "generateRecommendations": true,
    "complexityThresholds": {
      "low": 0.3,
      "medium": 0.6,
      "high": 0.8
    }
  }
}
```

### DMP Modifications

The module can generate the following types of DMP modifications:

#### Complexity-Based Modifications
```json
{
  "section": "Data Cleaning Plan",
  "type": "add",
  "content": "Additional data validation procedures recommended due to high study complexity (score: 0.85).",
  "reason": "High complexity study requires enhanced data quality measures",
  "priority": "medium",
  "required": false
}
```

#### Therapeutic Area-Specific Modifications
```json
{
  "section": "Overview",
  "type": "modify",
  "content": "This study is classified as Oncology with specific requirements for this therapeutic area.",
  "reason": "Therapeutic area classification adds context",
  "priority": "low",
  "required": false
}
```

### Recommendations Examples

Based on analysis results, the module generates targeted recommendations:

**High Complexity Studies:**
- "Consider phased UAT approach due to high complexity"
- "Implement enhanced data review procedures"
- "Plan for additional data management resources"

**High Risk Studies:**
- "Implement enhanced safety monitoring procedures"
- "Consider more frequent data review cycles"

**Therapeutic Area-Specific:**
- **Oncology**: "Implement RECIST criteria for tumor assessments"
- **Cardiovascular**: "Implement cardiac safety monitoring procedures"

**Resource-Based:**
- "Plan for intensive monitoring strategy"
- "Consider centralized monitoring components"

### Performance Metrics

The module tracks the following performance metrics:

```typescript
{
  executionTime: number;           // Execution time in milliseconds
  custom: {
    complexityScore: number;       // Calculated complexity score
    riskFactorsCount: number;      // Number of identified risk factors
    recommendationsCount: number;  // Number of generated recommendations
  }
}
```

### Error Handling

The module implements comprehensive error handling:

- **Configuration Validation**: Ensures valid complexity thresholds
- **Input Validation**: Validates protocol structure and required fields
- **Graceful Degradation**: Continues processing with incomplete data where possible
- **Detailed Error Reporting**: Provides specific error messages and context

## CRF Validator Module

### Overview

The CRF Validator is a comprehensive module that validates Case Report Form (CRF) specifications against protocol requirements. It provides detailed analysis of CRF completeness, quality, protocol alignment, and CDISC compliance with professional PDF and JSON reporting capabilities.

### Module Information

```json
{
  "id": "crf-validator",
  "name": "CRF Validator",
  "version": "1.0.0",
  "description": "Validates CRF specifications for completeness, protocol alignment, and CDISC compliance",
  "author": "Clinical DMP Generator Team",
  "type": "data-validator"
}
```

### Capabilities

- **CRF Structural Validation**: Comprehensive analysis of CRF form structure and field definitions
- **Protocol Alignment Analysis**: Cross-references CRF specifications with protocol requirements
- **CDISC Compliance Checking**: Validates adherence to CDISC standards (CDASH, SDTM)
- **Quality Scoring**: Multi-dimensional scoring of CRF completeness and quality
- **AI-Powered Analysis**: Uses advanced AI for intelligent CRF assessment
- **Professional Reporting**: Generates detailed PDF and JSON validation reports
- **Real-time Validation**: Fast validation processing with comprehensive feedback

### Input Requirements

#### Required
- `StudyProtocol`: Complete study protocol document (PDF)
- `CRFSpecification`: CRF specification document (PDF)

#### Optional Validation Options
- `validationDepth`: 'Basic' | 'Standard' | 'Comprehensive' | 'Expert'
- `regulatoryRegion`: 'FDA' | 'EMA' | 'PMDA' | 'Global'
- `industry`: 'Pharmaceutical' | 'Biotechnology' | 'Medical Device' | 'Academic'
- `includeComplianceCheck`: boolean (CDISC compliance analysis)
- `includeEfficiencyAnalysis`: boolean (CRF efficiency assessment)
- `includeProtocolAlignment`: boolean (Protocol cross-referencing)
- `generateRecommendations`: boolean (Improvement recommendations)

### Validation Components

#### 1. Structural Analysis

**CRF Structure Assessment:**
- Form organization and hierarchy validation
- Field definition completeness and consistency
- Data type and format validation
- Required vs. optional field analysis
- Visit schedule mapping accuracy

**Quality Metrics:**
- Field coverage completeness (0-100%)
- Data structure consistency score
- Navigation and user experience assessment
- Data entry efficiency analysis

#### 2. Protocol Alignment Analysis

**Endpoint Coverage:**
- Primary endpoint data collection validation
- Secondary endpoint requirement mapping
- Exploratory endpoint field coverage
- Missing data point identification

**Visit Schedule Alignment:**
- Protocol visit mapping to CRF visits
- Timepoint accuracy validation
- Procedure scheduling verification
- Data collection timeline consistency

**Population Criteria Coverage:**
- Inclusion criteria field mapping
- Exclusion criteria data capture
- Demographic data completeness
- Medical history requirement coverage

#### 3. CDISC Compliance Checking

**CDASH Standards:**
- Standard field naming conventions
- Data collection guidelines adherence
- Controlled terminology usage
- Data structure standardization

**SDTM Readiness:**
- Domain mapping preparation
- Variable naming compliance
- Data transformation readiness
- Metadata completeness

#### 4. Quality Scoring System

**Overall Score Calculation (0-100):**
- **Completeness Score (30%)**: Coverage of protocol requirements
- **Quality Score (25%)**: CRF design and usability quality
- **Compliance Score (25%)**: CDISC standards adherence
- **Alignment Score (20%)**: Protocol-CRF consistency

**Quality Levels:**
- **Excellent (85-100)**: Ready for study start with minor refinements
- **Good (70-84)**: Solid foundation with some improvements needed
- **Fair (50-69)**: Significant improvements required before study start
- **Poor (0-49)**: Major revision required across multiple areas

### Output Format

```typescript
interface CRFValidationResponse {
  validationId: string;
  status: string;
  validation: {
    overallScore: number;
    completenessScore: number;
    qualityScore: number;
    complianceScore: number;
    qualityLevel: 'Excellent' | 'Good' | 'Fair' | 'Poor';
    protocolAlignment: 'Fully Aligned' | 'Mostly Aligned' | 'Partially Aligned' | 'Misaligned';
    recommendation: 'Approve' | 'Approve with Minor Changes' | 'Requires Revision' | 'Major Revision Required';
    keyFindings: ValidationFinding[];
    criticalIssues: CriticalIssue[];
    topRecommendations: CRFRecommendation[];
    complianceStatus: ComplianceStatus;
  };
  timestamp: string;
  metadata: {
    processingTime: number;
    protocolPages: number;
    crfPages: number;
    validationComponents: string[];
  };
}
```

### Validation Findings

```typescript
interface ValidationFinding {
  id: string;
  category: string;
  finding: string;
  severity: 'Critical' | 'Major' | 'Minor' | 'Info';
  impact: string;
  formName?: string;
  fieldName?: string;
  recommendation: string;
  priority: 'High' | 'Medium' | 'Low';
}
```

### Recommendations System

```typescript
interface CRFRecommendation {
  id: string;
  category: string;
  priority: 'High' | 'Medium' | 'Low';
  recommendation: string;
  rationale: string;
  impact: string;
  implementationEffort: 'Low' | 'Medium' | 'High';
  timeline: string;
  businessRationale: string;
  affectedForms: string[];
}
```

### API Endpoints

#### Validate CRF
```http
POST /api/v1/crf-validator/validate
Content-Type: multipart/form-data

FormData:
- protocol: File (PDF)
- crf: File (PDF)
- validationDepth: string (optional)
- regulatoryRegion: string (optional)
- industry: string (optional)
- includeComplianceCheck: boolean (optional)
- includeEfficiencyAnalysis: boolean (optional)
- includeProtocolAlignment: boolean (optional)
- generateRecommendations: boolean (optional)
```

#### Export Validation Report
```http
POST /api/v1/crf-validator/export
Content-Type: application/json

{
  "validationId": "string",
  "format": "pdf" | "json"
}
```

#### Get Validation Status
```http
GET /api/v1/crf-validator/status

Response:
{
  "status": "healthy" | "busy" | "error",
  "activeValidations": number,
  "queuedValidations": number,
  "systemLoad": number,
  "lastValidation": string | null,
  "totalValidations": number
}
```

### Report Generation

#### PDF Export Features
- **Multi-Level Fallback**: Minimal → Simple → Full PDF generation
- **Professional Formatting**: Executive summary, detailed findings, recommendations
- **Stack Overflow Protection**: Safe PDF generation with timeout protection
- **Comprehensive Coverage**: Full validation analysis with visual scoring
- **Error Recovery**: Automatic fallback to simpler formats if needed

#### JSON Export Features
- **Complete Data**: Full validation results without truncation
- **Structured Format**: Easy programmatic access to all findings
- **API Integration**: Seamless integration with external systems
- **Detailed Metadata**: Processing information and execution metrics

### Configuration Options

```json
{
  "enabled": true,
  "priority": 2,
  "therapeuticAreas": ["all"],
  "studyPhases": ["Phase 1", "Phase 2", "Phase 3", "Phase 4"],
  "settings": {
    "enableStructuralAnalysis": true,
    "enableProtocolAlignment": true,
    "enableComplianceChecking": true,
    "enableRecommendations": true,
    "defaultValidationDepth": "Standard",
    "maxFileSize": "100MB",
    "timeoutDuration": 300000
  }
}
```

### Performance Metrics

```typescript
{
  executionTime: number;           // Validation time in milliseconds
  custom: {
    overallScore: number;          // Calculated overall score
    findingsCount: number;         // Number of validation findings
    recommendationsCount: number;  // Number of generated recommendations
    criticalIssuesCount: number;   // Number of critical issues identified
  }
}
```

### Error Handling and Recovery

**Validation Process Protection:**
- File size and format validation
- Processing timeout protection
- Memory usage monitoring
- Graceful degradation on errors

**PDF Generation Safety:**
- Stack overflow prevention
- Recursive loop detection
- Multi-tier fallback system
- Comprehensive error logging

**User Experience:**
- Real-time progress updates
- Detailed error messages
- Alternative format options
- Comprehensive status reporting

### Example Validation Results

**High-Quality CRF (Score: 92):**
- Excellent protocol alignment
- CDISC compliant structure
- Comprehensive endpoint coverage
- Minor recommendations for optimization

**Medium-Quality CRF (Score: 73):**
- Good basic structure
- Some protocol gaps identified
- CDISC compliance issues found
- Moderate improvements recommended

**Low-Quality CRF (Score: 45):**
- Significant structural issues
- Major protocol alignment problems
- Extensive CDISC non-compliance
- Comprehensive revision required

## Module Usage Examples

### Basic Execution via API

```bash
# Generate DMP with modules enabled (default)
curl -X POST http://localhost:3000/api/v1/dmp/generate \
  -F "protocol=@protocol.pdf" \
  -F "crf=@crf.pdf" \
  -F "useModules=true"

# Generate DMP with specific modules only
curl -X POST http://localhost:3000/api/v1/dmp/generate \
  -F "protocol=@protocol.pdf" \
  -F "crf=@crf.pdf" \
  -F "moduleIds=protocol-analyzer,crf-validator"

# Validate CRF independently
curl -X POST http://localhost:3000/api/v1/crf-validator/validate \
  -F "protocol=@protocol.pdf" \
  -F "crf=@crf.pdf" \
  -F "validationDepth=Comprehensive" \
  -F "regulatoryRegion=FDA" \
  -F "includeComplianceCheck=true"

# Export CRF validation report as PDF
curl -X POST http://localhost:3000/api/v1/crf-validator/export \
  -H "Content-Type: application/json" \
  -d '{"validationId": "validation-123", "format": "pdf"}' \
  --output crf_validation_report.pdf

# Analyze protocol complexity
curl -X POST http://localhost:3000/api/v1/protocol-analyzer/analyze \
  -F "protocol=@protocol.pdf" \
  -F "crf=@crf.pdf"
```

### Programmatic Usage

```typescript
import { ModuleManager } from './modules/module-manager';
import { ModuleContext } from './types/module-types';

// Initialize module system
const moduleManager = new ModuleManager();
await moduleManager.initialize();

// Create execution context
const context: ModuleContext = {
  protocol: studyProtocol,
  crfs: crfSpecifications,
  metadata: {
    timestamp: new Date(),
    initiator: 'system',
    environment: 'production'
  }
};

// Execute modules
const results = await moduleManager.executeModules(context, {
  modules: ['protocol-analyzer'],
  parallel: false,
  continueOnError: true
});

// Process results
results.forEach(result => {
  if (result.status === 'success') {
    console.log(`Module ${result.moduleId} completed successfully`);
    console.log('Recommendations:', result.recommendations);
  }
});
```

## API Integration

### Module Management Endpoints

#### List All Modules
```http
GET /api/v1/modules

Response:
{
  "totalModules": 1,
  "activeModules": 1,
  "modules": [
    {
      "id": "protocol-analyzer",
      "name": "Protocol Analyzer",
      "version": "1.0.0",
      "description": "Analyzes clinical protocols for complexity and requirements",
      "type": "protocol-analyzer",
      "enabled": true
    }
  ]
}
```

#### Get Module Details
```http
GET /api/v1/modules/protocol-analyzer

Response:
{
  "id": "protocol-analyzer",
  "name": "Protocol Analyzer",
  "version": "1.0.0",
  "description": "Analyzes clinical protocols for complexity and requirements",
  "type": "protocol-analyzer",
  "config": {
    "enabled": true,
    "priority": 1,
    "therapeuticAreas": ["all"],
    "studyPhases": ["Phase 1", "Phase 2", "Phase 3", "Phase 4"],
    "settings": { ... }
  },
  "enabled": true,
  "stats": {
    "totalExecutions": 5,
    "successCount": 5,
    "errorCount": 0,
    "avgExecutionTime": 245
  }
}
```

#### Module Statistics
```http
GET /api/v1/modules/stats

Response:
{
  "protocol-analyzer": {
    "totalExecutions": 5,
    "successCount": 5,
    "errorCount": 0,
    "avgExecutionTime": 245
  }
}
```

#### Toggle Module Status
```http
PATCH /api/v1/modules/protocol-analyzer/toggle
Content-Type: application/json

{
  "enabled": false
}

Response:
{
  "success": true,
  "enabled": false
}
```

## Configuration Reference

### Module-Specific Configuration

#### Protocol Analyzer Configuration

```json
{
  "enabled": true,
  "priority": 1,
  "therapeuticAreas": ["all"],
  "studyPhases": ["Phase 1", "Phase 2", "Phase 3", "Phase 4"],
  "settings": {
    "enableDetailedAnalysis": true,
    "includeRiskAssessment": true,
    "generateRecommendations": true,
    "complexityThresholds": {
      "low": 0.3,
      "medium": 0.6,
      "high": 0.8
    }
  }
}
```

**Configuration Options:**

- `enabled`: Whether the module is active
- `priority`: Execution priority (lower = higher priority)
- `therapeuticAreas`: Applicable therapeutic areas (["all"] for all areas)
- `studyPhases`: Applicable study phases
- `settings.enableDetailedAnalysis`: Enable comprehensive analysis
- `settings.includeRiskAssessment`: Include risk factor analysis
- `settings.generateRecommendations`: Generate actionable recommendations
- `settings.complexityThresholds`: Thresholds for complexity classification

### Global Module Configuration

```json
{
  "autoDiscover": true,
  "executionTimeout": 30000,
  "maxConcurrentExecutions": 5,
  "enablePerformanceMonitoring": true,
  "moduleDirectories": ["./dist/modules"]
}
```

This comprehensive documentation provides complete information about all existing modules and their capabilities, enabling effective use and future development of the modular clinical research system.