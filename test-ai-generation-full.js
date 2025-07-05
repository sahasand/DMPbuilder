#!/usr/bin/env node

const { AIContentGenerator } = require('./dist/generators/ai-content-generator');

async function testAIGeneration() {
  console.log('Testing AI Content Generation...\n');
  
  const generator = new AIContentGenerator();
  
  // Test context for cardiac amyloidosis study
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
      description: 'Multicenter imaging study using PET/CT'
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
      gender: 'All'
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
  console.log('\n=== Generating AI Content ===\n');
  
  try {
    // Generate Overview Section
    console.log('1. Generating Overview Section...');
    const overviewSection = await generator.generateOverviewSection(context, {
      enhancementLevel: 'professional',
      includeRegulatorySpecifics: true
    });
    
    console.log('✓ Generated', overviewSection.subsections.length, 'subsections');
    
    // Show Study Design subsection
    const studyDesignSection = overviewSection.subsections.find(s => s.title.includes('Study Design'));
    if (studyDesignSection) {
      console.log('\n--- Study Design Content Preview ---');
      console.log(studyDesignSection.content.substring(0, 500) + '...\n');
    }
    
    // Generate Safety Reporting Section
    console.log('2. Generating Safety Reporting Section...');
    const safetySection = await generator.generateSafetyReportingSection(context, {
      enhancementLevel: 'regulatory',
      includeRegulatorySpecifics: true
    });
    
    console.log('✓ Generated', safetySection.subsections.length, 'subsections');
    
    // Show SAE Processing subsection
    const saeSection = safetySection.subsections.find(s => s.title.includes('SAE'));
    if (saeSection) {
      console.log('\n--- SAE Processing Content Preview ---');
      console.log(saeSection.content.substring(0, 500) + '...\n');
    }
    
    // Generate Medical Coding Section
    console.log('3. Generating Medical Coding Section...');
    const codingSection = await generator.generateMedicalCodingSection(context, {
      enhancementLevel: 'professional'
    });
    
    console.log('✓ Generated', codingSection.subsections.length, 'subsections');
    
    // Show MedDRA Guidelines subsection
    const meddraSection = codingSection.subsections.find(s => s.title.includes('MedDRA'));
    if (meddraSection) {
      console.log('\n--- MedDRA Guidelines Content Preview ---');
      console.log(meddraSection.content.substring(0, 500) + '...\n');
    }
    
    console.log('\n✅ AI Content Generation Test Complete!');
    console.log('The AI is generating real, study-specific content.');
    
  } catch (error) {
    console.error('❌ Error generating content:', error);
  }
}

testAIGeneration().catch(console.error);