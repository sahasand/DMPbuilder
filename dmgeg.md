# Clinical Data Management Plan

## Study Information
- **Study Title**: An Open-label Study to Evaluate the Safety, Tolerability, Pharmacokinetic, and Pharmacodynamic Effects of EDG-7500 in Adults with Obstructive Hypertrophic Cardiomyopathy
- **Protocol Number**: EDG-7500-102
- **Study Phase**: 2
- **Investigational Drug**: EDG-7500
- **Sponsor**: Edgewise Therapeutics, Inc.
- **DMP Version**: v1.0
- **Effective Date**: 18Jun2024

## Table of Contents
1. [Overview of Project](#overview-of-project)
2. [Roles and Responsibilities](#roles-and-responsibilities)
3. [Network Directories](#network-directories)
4. [EDC System](#edc-system)
5. [Data Cleaning Plan](#data-cleaning-plan)
6. [Reporting of AEs and SAEs](#reporting-of-aes-and-saes)
7. [Medical Coding Process](#medical-coding-process)
8. [Clinical Data Management Tasks](#clinical-data-management-tasks)
9. [Protocol Deviation](#protocol-deviation)
10. [Database Lock](#database-lock)
11. [Appendix](#appendix)

## Approval Signatures

| Name & Title | Signature and Date |
|---|---|
| CCS Clinical Data Manager: Sandeep Saha | |
| CCS Project Manager: Michael DiBattista | |
| Edgewise Clinical Data Manager: Christina Kendrick | |
| Edgewise Sr. Director Clinical Operations: Laura Emery | |

## Abbreviations and Definitions

| Abbreviation | Definition |
|---|---|
| AE | Adverse Event |
| CCG | CRF completion guidelines |
| CCS | Cardiovascular Clinical Science |
| CDM | Clinical Data Management |
| CM | Concomitant Medication |
| CRF/eCRF | Electronic Case Report Form – data collection tool |
| CRA | Clinical Research Associate |
| Database | Collectively refers to the online version of the eCRF forms and subject data |
| DBL | Database Lock |
| DMP | Data Management Plan |
| EDC | Electronic Data Capture |
| eTMF | Electronic Trial Master File |
| FPFV | First Patient First Visit |
| IV | Intravenous |
| LPFV | Last Patient First Visit |
| LPLV | Last Patient Last Visit |
| MedDRA | Medical Dictionary for Regulatory Activities |
| PD | Pharmacodynamics |
| PI | Principal Investigator |
| PK | Pharmacokinetics |
| SAE | Serious Adverse Event |
| SAP | Statistical Analysis Plan |
| SAS | Statistical and analytical software package |
| SC | Subcutaneous |
| SDV | Source Data Verified |
| TFLs | Tables, Figures, Listings |
| UAT | User Acceptance Testing |
| WHODrug | World Health Organization Drug Dictionary |

## 1. Overview of Project

### 1.1 Introduction
This Data Management Plan (DMP) defines and documents the data management processes that CCS employs while working on the EDG-7500-102 STUDY. This plan specifies the processes and activities for integrating Edgewise's Operations Team, CCS Clinical Operations, CCS Statistics, CCS Data Management, and Site Personnel.

### 1.2 Study Design
This is a 2-part, open-label study in approximately 9-15 adults with obstructive hypertrophic cardiomyopathy (oHCM):
- **Part A**: 3 cohorts of approximately 3-5 participants each administered a single dose of EDG-7500
- **Part B**: Optional multiple-dose treatment period with EDG-7500 once daily for up to 28 days

### 1.3 Study Population
Approximately 9-15 adults with oHCM are planned to enroll in Part A.

### 1.4 Objectives and Endpoints

#### Primary Objectives
- **Objective**: Determine the safety and tolerability of EDG-7500 in adults with oHCM
- **Endpoints**:
  - Treatment-emergent adverse events (Adverse Event CRF)
  - Vital signs, physical examinations, and clinical laboratory tests
  - ECG parameters (rhythm, heart rate, PR, QRS, and QTcF intervals)
  - Left ventricular ejection fraction (LVEF)

#### Secondary Objectives
- **Objective**: Explore the effects of EDG-7500 on left ventricular outflow tract (LVOT) obstruction
- **Endpoints**: LVOT gradient by Doppler echocardiography at rest and during Valsalva maneuver
- **Objective**: Determine single-dose pharmacokinetics (PK) of EDG-7500
- **Endpoints**: PK parameters including AUC0-t, Cmax, Tmax

#### Exploratory Objectives
- **Objective**: Explore effects on systolic and diastolic LV function
- **Endpoints**: LV structure and function parameters
- **Objective**: Explore effects on cardiac biomarkers
- **Endpoints**: High-sensitivity cardiac troponin I (hs-cTnI), N-terminal pro-B-type natriuretic peptide (NT proBNP)

### 1.5 Data Review Focus
1. **Endpoint Data Review**: Detailed review of primary, secondary, and exploratory endpoints
2. **Comprehensive Data Review**: Full dataset review of all data fields
3. **Documentation**: All data review activities documented and saved appropriately

## 2. Roles and Responsibilities

### 2.1 Key Personnel

#### CDM Team Lead
- **Name**: Sandeep Saha
- **Title**: Director Biostatistics, CCS
- **Phone**: (269) 290-9031
- **Email**: ssaha@ccstrials.com

#### EDC Project Manager
- **Name**: Jamie LaBounty
- **Title**: Project Manager
- **Email**: jlabounty@ccstrials.com
- **Phone**: (866) 935-STAT (T)

### 2.2 User Groups and Access Rights

| Role | Activities |
|---|---|
| SPONSOR ALL | View all CRFs, Export data (including Echocardiogram Lab data) |
| SPONSOR Limited | View all CRFs, Export data (except Echocardiogram Lab CRF) |
| CRA/MONITOR | Monitor CRFs, Issue Queries, Close Monitor Queries, SDV |
| SAFETY | View all CRFs, Issue queries on AE CRF, Close Queries on AE CRF |
| MEDICAL CODER | View all CRFs, access to medical coder portal, Issue and close queries |
| DM | Issue and close queries on all CRFs, DM review, Data export, Freeze and Lock Data |
| ECHO UPLOAD | Upload Echocardiography data through pipeline to EDC |
| SITE PI | Consent, view all CRFs, Sign-off on CRFs |
| SITE DATA ENTRY | Consent, enter data on all CRFs, Answer queries |
| PM | Monitor CRFs, Issue Queries, SDV |
| STAT | View all CRFs, Export data (including Echocardiogram Lab data) |
| ADMIN | Administrative Activities |

### 2.3 Communications
- **Regular Communication**: Bi-weekly data management meetings
- **Other Communication**: CDM team works with PK/PD labs and ECHO lab
- **Escalation Pathway**: Issues escalated to CCS Study PM

## 3. Network Directories

**CCS SharePoint Directory Structure**:
- Root Directory: `/Study_EDG-7500-102/Data-Management`
- Subdirectories:
  - `/CRFs`: Case Report Forms
  - `/CRF Completion Guidelines`
  - `/DM Plan`
  - `/SAS Exports`
  - `/Communication`: Communications and meeting notes
  - `/Miscellaneous`

## 4. EDC System

### 4.1 System Details
- **System**: TRIALIZE, version 23.1.1
- **Access**: Web browser based, browser independent
- **Compliance**: 21 CFR Part 11 regulations
- **URL**: https://empiristat.ctms.ai/app/

### 4.2 Key Features
- Multi-layered security with encryption
- Audit trail for all data changes
- Electronic signatures support
- Secure data transfers

### 4.3 Database Development Process
1. Initial draft eCRF development by EDC team
2. UAT with CCS CDM, Edgewise Clinical Operations, and CCS Clinical Operations
3. Multiple UAT cycles with feedback implementation
4. Final approval and production deployment

### 4.4 External Data Sources

| Laboratory | Analyte |
|---|---|
| Pharmacokinetic (PK) Lab: Veloxity Labs | PK Blood |
| Pharmacodynamics (PD) Lab: Pending finalization | PD Biomarkers |
| CCS Core Laboratory | Echocardiography data |

### 4.5 Laboratory Normal Ranges

#### Hematology
| Test | Range | Units |
|---|---|---|
| Hematocrit | 35-50 | % |
| Platelet Count | 130-400 | 10^3/µL |
| RBC Count | 4.0-6.0 | 10^6/µL |
| WBC Count | 4.0-11.0 | 10^3/µL |
| Absolute Neutrophil Count | 2.0-7.0 | 10^3/µL |
| Absolute Lymphocyte Count | 1.0-3.0 | 10^3/µL |

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
| Sodium | 135-145 | mmol/L |

#### Coagulation
| Test | Range | Units |
|---|---|---|
| Prothrombin Time (PT) | 10-13 | sec |
| Partial Thromboplastin Time (PTT) | 25-35 | sec |
| International Normalized Ratio (INR) | 0.8-1.2 | |

#### Biomarkers (Local)
| Test | Range | Units |
|---|---|---|
| High-sensitivity cardiac troponin I (Hs-cTnI) | 0-35 | ng/L |
| N-terminal pro-B-type natriuretic peptide (NT-proBNP) | 0-100 | pg/mL |

## 5. Data Cleaning Plan

### 5.1 Data Entry
- Sites required to identify at least one research staff member for data entry
- Staff must adhere to CCG guidelines
- New users follow certification process per training plan

### 5.2 Edit Checks, Warnings, and Notices
- **Valid-value Alerts**: Ensuring data entries are within predefined valid values
- **Valid-range Alerts**: Checking numeric data falls within acceptable ranges
- **Missing-value Alerts**: Identifying incomplete mandatory fields
- **Warnings**: Values outside specified normal range or incorrect format
- **Notices**: Helpful text to guide data entry process

### 5.3 Query Management
- **Site Response Time**: 5 business days
- **Closure Time**: 10 business days from issuance
- **Query Types**: Manual and automated edit checks created by Monitor, CDM, or system
- **Tracking**: Comprehensive query report on EDC dashboard

### 5.4 Data Review Process
1. **Scheduled Exports**: Strategic exports at critical trial milestones
2. **Ongoing Data Review**: Real-time review with continuous monitoring
3. **Cross-Time Point Analysis**: Longitudinal consistency checks
4. **Query Management**: Timely resolution of flagged issues
5. **Finalization**: Rolling freeze and final lock after PI signatures

## 6. Reporting of AEs and SAEs

### 6.1 Reporting Requirements
- All AEs recorded in EDC after ICF signing
- SAEs reported within 24 hours of learning of event
- CCS Safety and Edgewise notified by email for SAEs
- All AEs/SAEs followed until resolved or trial end

### 6.2 Safety Communication
- SAE information recorded in EDC
- Automatic email notifications when AE marked as serious
- Details in Safety Management Plan

## 7. Medical Coding Process

### 7.1 Dictionary Use
- **MedDRA**: Version 27 for adverse events, serious adverse events, medical history
- **WHODrug**: Version GLOBALB3Mar24 for medications

### 7.2 Coding Methodology
- **Auto Coding**: Initial automated coding within EDC
- **Manual Adjustments**: Manual correction every two weeks following MedDRA guidelines
- **Quality Assurance**: Regular assessments by Coding Associate
- **Review Process**: Monthly medical coding listings to sponsor

### 7.3 MedDRA Coding Guidelines
- Minor misspellings accepted if easily recognizable
- Queries issued for ambiguous terms
- Differential diagnosis split unless coding to same preferred term
- Symptoms with diagnosis coded to diagnosis if consistent
- Abbreviations with multiple meanings queried for clarification

### 7.4 WHODrug Coding Guidelines
- Trade name preferred over generic when both documented
- Distinct medications split if not available as combination
- Single ingredient products: non-salt form chosen when options available
- Investigational products coded to "Investigational drug" or equivalent

## 8. Clinical Data Management Tasks

### 8.1 CDM Responsibilities
- AE CRF and Safety Reconciliation
- Data Entry Issues and Questions resolution
- UAT focusing on AE CRF
- CRF design evaluation and resolution
- Query trend analysis and resolution

### 8.2 Team Collaboration
- CCS Clinical Operations: CDM and Biostatistics support
- Edgewise Clinical Operations: Clinical Data Management support
- Cross-functional coordination for data integrity

## 9. Protocol Deviation

### 9.1 Protocol Deviation Categories

#### Concomitant Medications
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
- **Miscellaneous Deviations**: Deviations not fitting listed categories

### 9.2 Classification System

#### Major Protocol Deviation
- Increase risk and/or decrease benefit to participants
- Affect subject's rights, safety, welfare, and/or research data integrity
- Example: Subject enrolled despite not meeting inclusion/exclusion criteria

#### Minor Protocol Deviation
- Does not increase risk or decrease benefit to participant
- Does not significantly affect subject's rights, safety, welfare, and/or data integrity
- Example: Missed laboratory assessment not impacting subject safety

### 9.3 Management Process
1. **Monthly Review**: Sponsor reviews and classifies deviations as Major or Minor
2. **Documentation**: Classifications recorded in external dataset by CDM
3. **Meeting Documentation**: Review meetings recorded and data appropriately saved
4. **Final Review**: Protocol deviation review meeting before DBL
5. **CSR Inclusion**: All deviations with classifications summarized in Clinical Study Report

### 9.4 Roles and Responsibilities
- **CRA/Clinical Operations**: Site training, identification, initial handling
- **Medical Monitor**: Guidance on safety-affecting deviations
- **Site Data Entry Personnel**: Records deviations in EDC
- **Sponsor**: Reviews and adjudicates as major or minor
- **CDM**: Monitors, tracks, ensures documentation, coordinates resolution

## 10. Database Lock

### 10.1 Soft Lock
- Initial conditional phase with selective database closure
- Access confined to CDM and designated personnel
- Allows outstanding queries resolution and necessary corrections
- CDM may unfreeze certain pages for data resolution

### 10.2 Database Lock Checklist
- [ ] All subjects completed final visit
- [ ] All CRFs completed in EDC
- [ ] All subject data entered and queries resolved/closed
- [ ] All medical coding completed and reviewed
- [ ] Medical coding approval form signed
- [ ] SAEs reconciled with Safety Database
- [ ] Statistical review/preliminary analysis completed
- [ ] All required fields SDV'd
- [ ] All CRF forms signed by PI
- [ ] Audit trail data review completed
- [ ] All forms locked

### 10.3 Data for Final Statistical Analysis
- CDM ensures all DBL activities completed
- Data extracted in txt format
- Stored securely as final locked data
- Shared with CCS biostatistics

### 10.4 Database Unlock Process
- Formal evaluation by CCS Biostatistics, study PI, and Medical Monitor
- Impact assessment on trial results
- Formal approval from sponsor and Biostatistician required
- Database unlock form signed

### 10.5 Study Archive
- Archive all eCRF in PDF to eTMF
- All eCRF data, audit trails, queries, exports sent to Sponsor
- Casebooks distributed to sites electronically or via USB

## 11. Appendix

### 11.1 Protocol Deviation Classification Examples

| Category | Major | Minor | Not a Protocol Deviation |
|---|---|---|---|
| **Informed Consent** | Clinical study procedures conducted prior to obtaining initial informed consent | If required by local regulation or IRB, participant did not initial all pages | Administrative items: incorrect date format, signature on wrong line but ICF signed |
| **Inclusion/Exclusion** | Participant entered study without satisfying entry criteria | | |
| **Study Procedures** | Missed safety or ECHO assessments related to endpoints | Non-critical procedures performed out of specified window | Training of CRAs or other personnel |
| **Safety Reporting** | SAEs/Pregnancy not reported within required timeframe (24h) | Non-serious AEs not reported within predefined timelines | Site appropriately reported SAE, later asked to split by DM team |

### 11.2 Data Review Plan

| Form Name | Field Name | Data Review Check | Reviewer |
|---|---|---|---|
| **Informed Consent** | Protocol Version and Dates | Ensure patient consented using most recent protocol version | CRA/DM |
| **Inclusion/Exclusion** | All Fields | Verify inclusion criteria met, no exclusion criteria met | CRA/DM |
| **Medical History** | Medical History | Confirm relevant medical history and associated medications recorded | CRA/DM |
| **ConMeds** | All Fields | Ensure all concomitant medications documented and reviewed | CRA/DM |
| **Adverse Events** | All Fields | Confirm all AEs recorded, assessed for severity/causality, followed up | CRA/DM |
| **Protocol Deviations** | All Fields | Verify all protocol deviations documented and reported | CRA/DM |
| **Vital Signs** | All Fields | Ensure vital signs recorded accurately within expected ranges | CRA/DM |
| **12-Lead Safety ECG** | All Fields | Verify ECG results completeness, check for abnormal findings | CRA/DM |
| **Physical Exam** | All Fields | Ensure all sections completed, consistency with previous findings | CRA/DM |
| **NYHA** | NYHA Classification | Confirm classification recorded correctly based on assessment | CRA/DM |
| **Chemistry** | All Fields | Verify results recorded accurately, within normal ranges | CRA/DM |
| **Hematology** | All Fields | Ensure results recorded accurately, within normal ranges | CRA/DM |
| **Coagulation** | All Fields | Verify results recorded accurately, within normal ranges | CRA/DM |
| **Serum Pregnancy** | All Fields | Confirm results recorded accurately, positive results reported | CRA/DM |
| **FSH** | All Fields | Ensure results recorded and reviewed for compliance | CRA/DM |
| **Echocardiography** | All Fields | Confirm results documented, complete, reviewed for abnormalities | CRA/DM |
| **Eligibility Verification** | All Fields | Verify all eligibility criteria met, exceptions justified | CRA/DM |
| **End of Study** | All Fields | Ensure all required assessments completed and documented | CRA/DM |

### 11.3 Additional Data Review Activities

#### Laboratory Data Validation
- **Collection Date Verification**: Verify lab test collection dates align with study timeline
- **Facility and Demographics Confirmation**: Confirm laboratory facilities consistent for subject
- **Verification and Clinical Relevance**: Ensure results verified against normal ranges
- **Duplicate Data**: Identify and resolve duplicate records
- **Manual Date Checks**: Verify chronological accuracy and consistency
- **Outlier Identification**: Assess outliers for data entry errors or clinical anomalies

#### Automated Monitoring
- **AE Warnings**: EDC system automatically flags potential AEs based on criteria
- **Protocol Deviation Alerts**: System alerts for entries indicating protocol deviations
- **CDM Review**: Regular review of automated warnings and alerts

---

*This document serves as the comprehensive data management plan for the EDG-7500-102 study, ensuring proper data collection, management, and quality control throughout the trial lifecycle.*