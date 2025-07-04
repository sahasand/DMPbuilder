import { dmpGenerator } from '../../src/generators/dmp-generator';
import { StudyProtocol, CRFSpecification } from '../../src/types';

describe('DMP Generator', () => {
  // Sample test data
  const mockProtocol: StudyProtocol = {
    studyTitle: 'A Phase 2 Study of Test Drug in Test Condition',
    protocolNumber: 'TEST-001',
    studyPhase: '2',
    investigationalDrug: 'Test Drug',
    sponsor: 'Test Sponsor Inc.',
    indication: 'Test Condition',
    studyDesign: {
      type: 'double-blind',
      duration: '12 weeks',
      numberOfArms: 2,
      description: 'Randomized, double-blind, placebo-controlled study',
    },
    objectives: {
      primary: [{
        description: 'Evaluate efficacy of Test Drug',
        endpoints: ['Primary efficacy endpoint'],
      }],
      secondary: [{
        description: 'Evaluate safety of Test Drug',
        endpoints: ['Safety endpoint'],
      }],
    },
    population: {
      targetEnrollment: 100,
      ageRange: '18-65 years',
      gender: 'all',
      condition: 'Test Condition',
    },
    endpoints: {
      primary: [{
        name: 'Primary Efficacy',
        description: 'Change from baseline',
        timepoint: 'Week 12',
        method: 'Clinical assessment',
      }],
      secondary: [{
        name: 'Safety',
        description: 'Adverse events',
        timepoint: 'Throughout study',
        method: 'AE monitoring',
      }],
    },
    visitSchedule: [{
      visitName: 'Screening',
      visitNumber: 1,
      timepoint: 'Day -28 to -1',
      window: '±3 days',
      procedures: ['Informed consent', 'Medical history'],
    }],
    inclusionCriteria: ['Age 18-65', 'Diagnosis of condition'],
    exclusionCriteria: ['Pregnancy', 'Other serious conditions'],
  };
  
  const mockCRFs: CRFSpecification[] = [{
    formName: 'Demographics',
    formOID: 'DM_001',
    fields: [{
      fieldName: 'SUBJID',
      fieldOID: 'SUBJID_001',
      fieldType: 'text',
      required: true,
    }],
    version: '1.0',
    lastUpdated: new Date(),
  }];
  
  describe('generateDMP', () => {
    it('should generate a complete DMP with all required sections', async () => {
      const dmp = await dmpGenerator.generateDMP(mockProtocol, mockCRFs);
      
      expect(dmp).toBeDefined();
      expect(dmp.studyInfo.studyTitle).toBe(mockProtocol.studyTitle);
      expect(dmp.studyInfo.protocolNumber).toBe(mockProtocol.protocolNumber);
      expect(dmp.version).toBe('v1.0');
      expect(dmp.sections).toHaveLength(11); // Expected number of main sections
    });
    
    it('should include all required sections', async () => {
      const dmp = await dmpGenerator.generateDMP(mockProtocol, mockCRFs);
      
      const sectionTitles = dmp.sections.map(s => s.title);
      const requiredSections = [
        'Overview of Project',
        'Roles and Responsibilities',
        'Network Directories',
        'EDC System',
        'Data Cleaning Plan',
        'Reporting of AEs and SAEs',
        'Medical Coding Process',
        'Clinical Data Management Tasks',
        'Protocol Deviation',
        'Database Lock',
        'Appendix',
      ];
      
      requiredSections.forEach(required => {
        expect(sectionTitles).toContain(required);
      });
    });
    
    it('should include study-specific information', async () => {
      const dmp = await dmpGenerator.generateDMP(mockProtocol, mockCRFs);
      
      const overviewSection = dmp.sections.find(s => s.title === 'Overview of Project');
      expect(overviewSection).toBeDefined();
      
      const studyDesignSubsection = overviewSection?.subsections?.find(
        s => s.title === 'Study Design'
      );
      expect(studyDesignSubsection).toBeDefined();
      expect(studyDesignSubsection?.content).toContain('double-blind');
      expect(studyDesignSubsection?.content).toContain('12 weeks');
    });
    
    it('should include abbreviations', async () => {
      const dmp = await dmpGenerator.generateDMP(mockProtocol, mockCRFs);
      
      expect(dmp.abbreviations).toBeDefined();
      expect(dmp.abbreviations.length).toBeGreaterThan(10);
      
      const cdmAbbr = dmp.abbreviations.find(a => a.abbreviation === 'CDM');
      expect(cdmAbbr).toBeDefined();
      expect(cdmAbbr?.definition).toBe('Clinical Data Management');
    });
    
    it('should generate approvals section', async () => {
      const customApprovers = [
        { name: 'John Doe', title: 'Clinical Data Manager' },
        { name: 'Jane Smith', title: 'Project Manager' },
      ];
      
      const dmp = await dmpGenerator.generateDMP(mockProtocol, mockCRFs, {
        approvers: customApprovers,
      });
      
      expect(dmp.approvals).toEqual(customApprovers);
    });
  });
  
  describe('section generation', () => {
    it('should generate data cleaning plan with correct subsections', async () => {
      const dmp = await dmpGenerator.generateDMP(mockProtocol, mockCRFs);
      
      const dataCleaningSection = dmp.sections.find(
        s => s.title === 'Data Cleaning Plan'
      );
      
      expect(dataCleaningSection).toBeDefined();
      expect(dataCleaningSection?.subsections).toBeDefined();
      
      const subsectionTitles = dataCleaningSection?.subsections?.map(s => s.title);
      expect(subsectionTitles).toContain('Data Entry');
      expect(subsectionTitles).toContain('Query Management');
      expect(subsectionTitles).toContain('Data Review Process');
    });
    
    it('should include CRF complexity analysis', async () => {
      const dmp = await dmpGenerator.generateDMP(mockProtocol, mockCRFs);
      
      const edcSection = dmp.sections.find(s => s.title === 'EDC System');
      const complexitySubsection = edcSection?.subsections?.find(
        s => s.title === 'CRF Complexity Analysis'
      );
      
      expect(complexitySubsection).toBeDefined();
      expect(complexitySubsection?.content).toContain('Total Forms');
      expect(complexitySubsection?.content).toContain('Total Fields');
    });
  });
});