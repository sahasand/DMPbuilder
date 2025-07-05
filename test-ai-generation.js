#!/usr/bin/env node

const { AIContentGenerator } = require('./dist/generators/ai-content-generator');
const { StudyProtocol, CRFSpecification } = require('./dist/types');

async function testAIGeneration() {
  console.log('Testing AI Content Generation...\n');
  
  const generator = new AIContentGenerator();
  
  // Test context
  const testProtocol = {
    studyTitle: 'A Phase 3, Open-Label, Multicenter Study of I-124 evuzamitide for Cardiac Amyloidosis',
    protocolNumber: 'AT01-301',
    studyPhase: 'Phase 3',
    investigationalDrug: 'I-124 evuzamitide',
    sponsor: 'Sharmila Dorbala, MD',
    indication: 'Cardiac Amyloidosis',
    studyDesign: {
      type: 'open-label',
      duration: '24 months',
      numberOfArms: 1,
      description: 'Multicenter imaging study'
    },
    objectives: {
      primary: ['Evaluate diagnostic accuracy of I-124 evuzamitide PET/CT'],
      secondary: ['Assess safety profile', 'Determine optimal imaging parameters']
    },
    endpoints: {
      primary: [{
        name: 'Diagnostic Accuracy',
        description: 'Sensitivity and specificity of I-124 evuzamitide PET/CT',
        method: 'Comparison with histopathology'
      }],
      secondary: []
    },
    population: {
      targetEnrollment: 150,
      ageRange: '18 years and older',
      gender: 'All',
      description: 'Patients with suspected cardiac amyloidosis'
    },
    inclusionCriteria: ['Age ≥ 18 years', 'Suspected cardiac amyloidosis'],
    exclusionCriteria: ['Pregnancy', 'Severe renal impairment']
  };
  
  const testCRFs = [{
    formName: 'Demographics',
    formOID: 'DM',
    fields: []
  }];
  
  const context = {
    protocol: testProtocol,
    crfs: testCRFs,
    studyMetadata: AIContentGenerator.analyzeStudyContext(testProtocol, testCRFs),
    crossReferences: []
  };
  
  console.log('Study Metadata:', context.studyMetadata);
  console.log('\nGenerating Overview Section...\n');
  
  try {
    const overviewSection = await generator.generateOverviewSection(context, {
      enhancementLevel: 'professional',
      includeRegulatorySpecifics: true
    });
    
    console.log('Generated Section:', overviewSection.title);
    console.log('Subsections:', overviewSection.subsections.length);
    
    if (overviewSection.subsections.length > 0) {
      console.log('\nFirst Subsection Preview:');
      console.log(overviewSection.subsections[0].title);
      console.log(overviewSection.subsections[0].content.substring(0, 200) + '...');
    }
  } catch (error) {
    console.error('Error generating content:', error);
  }
}

testAIGeneration().catch(console.error);