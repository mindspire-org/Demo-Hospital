const { MongoClient } = require('mongodb');

// Extended reference ranges with more patterns
const RANGES = {
  // Culture/Sensitivity tests - qualitative results
  'culture': { male: 'No growth', female: 'No growth', pediatric: 'No growth' },
  'c/s': { male: 'No growth', female: 'No growth', pediatric: 'No growth' },
  'swab': { male: 'No growth', female: 'No growth', pediatric: 'No growth' },
  'sputum': { male: 'No growth', female: 'No growth', pediatric: 'No growth' },
  'stool': { male: 'Normal', female: 'Normal', pediatric: 'Normal' },
  'urine': { male: 'Normal', female: 'Normal', pediatric: 'Normal' },
  'csf': { male: 'Normal', female: 'Normal', pediatric: 'Normal' },
  'fluid': { male: 'Normal', female: 'Normal', pediatric: 'Normal' },
  'ascitic': { male: 'Normal', female: 'Normal', pediatric: 'Normal' },
  'synovial': { male: 'Normal', female: 'Normal', pediatric: 'Normal' },
  'pericardial': { male: 'Normal', female: 'Normal', pediatric: 'Normal' },
  'peritoneal': { male: 'Normal', female: 'Normal', pediatric: 'Normal' },
  'pleural': { male: 'Normal', female: 'Normal', pediatric: 'Normal' },
  'wound': { male: 'No growth', female: 'No growth', pediatric: 'No growth' },
  'pus': { male: 'No growth', female: 'No growth', pediatric: 'No growth' },
  'throat': { male: 'No growth', female: 'No growth', pediatric: 'No growth' },
  'cervical': { male: 'No growth', female: 'No growth', pediatric: 'No growth' },
  'vaginal': { male: 'No growth', female: 'No growth', pediatric: 'No growth' },
  'urethral': { male: 'No growth', female: 'No growth', pediatric: 'No growth' },
  'eye': { male: 'No growth', female: 'No growth', pediatric: 'No growth' },
  'nasal': { male: 'No growth', female: 'No growth', pediatric: 'No growth' },
  'ear': { male: 'No growth', female: 'No growth', pediatric: 'No growth' },
  'prostatic': { male: 'No growth', female: 'No growth', pediatric: 'No growth' },
  'seminal': { male: 'No growth', female: 'No growth', pediatric: 'No growth' },
  
  // PCR / Molecular tests
  'pcr': { male: 'Not Detected', female: 'Not Detected', pediatric: 'Not Detected' },
  'gene expert': { male: 'Not Detected', female: 'Not Detected', pediatric: 'Not Detected' },
  'genexpert': { male: 'Not Detected', female: 'Not Detected', pediatric: 'Not Detected' },
  'cbnaat': { male: 'Not Detected', female: 'Not Detected', pediatric: 'Not Detected' },
  'afb': { male: 'No AFB seen', female: 'No AFB seen', pediatric: 'No AFB seen' },
  'zn stain': { male: 'No AFB seen', female: 'No AFB seen', pediatric: 'No AFB seen' },
  'swine flu': { male: 'Not Detected', female: 'Not Detected', pediatric: 'Not Detected' },
  'h1n1': { male: 'Not Detected', female: 'Not Detected', pediatric: 'Not Detected' },
  'genetic': { male: 'Refer to report', female: 'Refer to report', pediatric: 'Refer to report' },
  
  // Serology / ELISA
  'elisa': { male: 'Negative', female: 'Negative', pediatric: 'Negative' },
  'hbsag': { male: 'Negative', female: 'Negative', pediatric: 'Negative' },
  'hbs ag': { male: 'Negative', female: 'Negative', pediatric: 'Negative' },
  'anti-hcv': { male: 'Negative', female: 'Negative', pediatric: 'Negative' },
  'anti hcv': { male: 'Negative', female: 'Negative', pediatric: 'Negative' },
  'hcv': { male: 'Negative', female: 'Negative', pediatric: 'Negative' },
  'hbv': { male: 'Negative', female: 'Negative', pediatric: 'Negative' },
  'hepatitis': { male: 'Negative', female: 'Negative', pediatric: 'Negative' },
  'hiv': { male: 'Negative', female: 'Negative', pediatric: 'Negative' },
  'anti-hiv': { male: 'Negative', female: 'Negative', pediatric: 'Negative' },
  'western blot': { male: 'Negative', female: 'Negative', pediatric: 'Negative' },
  'dengue': { male: 'Negative', female: 'Negative', pediatric: 'Negative' },
  'widal': { male: '<1:80', female: '<1:80', pediatric: '<1:80' },
  'weil-felix': { male: '<1:80', female: '<1:80', pediatric: '<1:80' },
  'malaria': { male: 'Negative', female: 'Negative', pediatric: 'Negative' },
  'malarial': { male: 'Negative', female: 'Negative', pediatric: 'Negative' },
  'torch': { male: 'Negative', female: 'Negative', pediatric: 'Negative' },
  'ebv': { male: 'Negative', female: 'Negative', pediatric: 'Negative' },
  'epstein-barr': { male: 'Negative', female: 'Negative', pediatric: 'Negative' },
  'hsv': { male: 'Negative', female: 'Negative', pediatric: 'Negative' },
  'herpes': { male: 'Negative', female: 'Negative', pediatric: 'Negative' },
  'h. pylori': { male: 'Negative', female: 'Negative', pediatric: 'Negative' },
  'hpylori': { male: 'Negative', female: 'Negative', pediatric: 'Negative' },
  'helicobacter': { male: 'Negative', female: 'Negative', pediatric: 'Negative' },
  'clostridium': { male: 'Not Detected', female: 'Not Detected', pediatric: 'Not Detected' },
  
  // Autoimmune
  'ana': { male: 'Negative', female: 'Negative', pediatric: 'Negative' },
  'anca': { male: 'Negative', female: 'Negative', pediatric: 'Negative' },
  'anti-cardiolipin': { male: 'Negative', female: 'Negative', pediatric: 'Negative' },
  'antiphospholipid': { male: 'Negative', female: 'Negative', pediatric: 'Negative' },
  'rheumatoid': { male: 'Negative', female: 'Negative', pediatric: 'Negative' },
  'anti-gliadin': { male: 'Negative', female: 'Negative', pediatric: 'Negative' },
  'celiac': { male: 'Negative', female: 'Negative', pediatric: 'Negative' },
  'allergy': { male: 'Negative', female: 'Negative', pediatric: 'Negative' },
  
  // Hormones/Tumor markers
  'ca-125': { male: '<35', female: '<35', pediatric: '<35' },
  'ca 125': { male: '<35', female: '<35', pediatric: '<35' },
  'prolactin': { male: '3-15', female: '3-25', pediatric: '3-20' },
  'fsh': { male: '1.4-18.1', female: '4.7-21.5', pediatric: '1.0-10.0' },
  'lh': { male: '1.5-9.3', female: '1.9-12.5', pediatric: '1.0-8.0' },
  'testosterone': { male: '10-35', female: '0.5-2.4', pediatric: '1.0-10.0' },
  'psa': { male: '<4.0', female: 'N/A', pediatric: 'N/A' },
  'catecholamines': { male: 'Refer to report', female: 'Refer to report', pediatric: 'Refer to report' },
  'metanephrines': { male: 'Refer to report', female: 'Refer to report', pediatric: 'Refer to report' },
  'aldosterone': { male: 'Refer to report', female: 'Refer to report', pediatric: 'Refer to report' },
  'renin': { male: 'Refer to report', female: 'Refer to report', pediatric: 'Refer to report' },
  
  // Stimulation/Challenge tests
  'stimulation test': { male: 'Refer to report', female: 'Refer to report', pediatric: 'Refer to report' },
  'suppression test': { male: 'Refer to report', female: 'Refer to report', pediatric: 'Refer to report' },
  'dexamethasone': { male: 'Refer to report', female: 'Refer to report', pediatric: 'Refer to report' },
  'synacthen': { male: 'Refer to report', female: 'Refer to report', pediatric: 'Refer to report' },
  'deprivation test': { male: 'Refer to report', female: 'Refer to report', pediatric: 'Refer to report' },
  'tolerance test': { male: 'Refer to report', female: 'Refer to report', pediatric: 'Refer to report' },
  'gtt': { male: 'Refer to report', female: 'Refer to report', pediatric: 'Refer to report' },
  'ogtt': { male: 'Refer to report', female: 'Refer to report', pediatric: 'Refer to report' },
  'challenge test': { male: 'Refer to report', female: 'Refer to report', pediatric: 'Refer to report' },
  
  // Profiles/Panels
  'marker test': { male: 'Refer to report', female: 'Refer to report', pediatric: 'Refer to report' },
  'profile': { male: 'Refer to report', female: 'Refer to report', pediatric: 'Refer to report' },
  'fertility': { male: 'Refer to report', female: 'Refer to report', pediatric: 'Refer to report' },
  'menopause': { male: 'Refer to report', female: 'Refer to report', pediatric: 'Refer to report' },
  'pcos': { male: 'Refer to report', female: 'Refer to report', pediatric: 'Refer to report' },
  
  // Flow cytometry / Special tests
  'flow cytometry': { male: 'Refer to report', female: 'Refer to report', pediatric: 'Refer to report' },
  'cd4': { male: 'Refer to report', female: 'Refer to report', pediatric: 'Refer to report' },
  'lymphocyte subset': { male: 'Refer to report', female: 'Refer to report', pediatric: 'Refer to report' },
  'light chains': { male: 'Refer to report', female: 'Refer to report', pediatric: 'Refer to report' },
  'porphyrins': { male: 'Refer to report', female: 'Refer to report', pediatric: 'Refer to report' },
  'electrophoresis': { male: 'Refer to report', female: 'Refer to report', pediatric: 'Refer to report' },
  'immunoglobulin': { male: 'Refer to report', female: 'Refer to report', pediatric: 'Refer to report' },
  'igg': { male: 'Refer to report', female: 'Refer to report', pediatric: 'Refer to report' },
  'complement': { male: 'Refer to report', female: 'Refer to report', pediatric: 'Refer to report' },
  'osmotic fragility': { male: 'Normal', female: 'Normal', pediatric: 'Normal' },
  'bone marrow': { male: 'Refer to report', female: 'Refer to report', pediatric: 'Refer to report' },
  'biopsy': { male: 'Refer to report', female: 'Refer to report', pediatric: 'Refer to report' },
  'triple test': { male: 'Refer to report', female: 'Refer to report', pediatric: 'Refer to report' },
  'post-coital': { male: 'Refer to report', female: 'Refer to report', pediatric: 'Refer to report' },
  
  // Blood smear / Thalassemia
  'blood smear': { male: 'Normocytic, Normochromic', female: 'Normocytic, Normochromic', pediatric: 'Normocytic, Normochromic' },
  'peripheral blood': { male: 'Normocytic, Normochromic', female: 'Normocytic, Normochromic', pediatric: 'Normocytic, Normochromic' },
  'thalassemia': { male: 'Negative', female: 'Negative', pediatric: 'Negative' },
  'hemoglobin electrophoresis': { male: 'Normal pattern', female: 'Normal pattern', pediatric: 'Normal pattern' },
  'haemoglobin': { male: 'Normal pattern', female: 'Normal pattern', pediatric: 'Normal pattern' },
  'sickling': { male: 'Negative', female: 'Negative', pediatric: 'Negative' },
  'coombs': { male: 'Negative', female: 'Negative', pediatric: 'Negative' },
  
  // Coagulation
  'pt': { male: '11-13.5', female: '11-13.5', pediatric: '11-13.5' },
  'inr': { male: '0.8-1.2', female: '0.8-1.2', pediatric: '0.8-1.2' },
  'aptt': { male: '25-35', female: '25-35', pediatric: '25-35' },
  'coagulation': { male: '11-13.5', female: '11-13.5', pediatric: '11-13.5' },
  'd-dimer': { male: '<0.5', female: '<0.5', pediatric: '<0.5' },
  'fdps': { male: '<0.5', female: '<0.5', pediatric: '<0.5' },
  'fibrinogen': { male: '200-400', female: '200-400', pediatric: '200-400' },
  
  // Common single analytes
  'glucose': { male: '70-100', female: '70-100', pediatric: '60-100' },
  'gluscose': { male: '70-100', female: '70-100', pediatric: '60-100' },
  'bsf': { male: '70-100', female: '70-100', pediatric: '60-100' },
  'hba1c': { male: '4.0-5.6', female: '4.0-5.6', pediatric: '4.0-5.6' },
  'troponin': { male: '<0.04', female: '<0.04', pediatric: '<0.04' },
  'trop': { male: '<0.04', female: '<0.04', pediatric: '<0.04' },
  'esr': { male: '0-15', female: '0-20', pediatric: '0-10' },
  'ra factor': { male: '<14', female: '<14', pediatric: '<14' },
  'crp': { male: '<5', female: '<5', pediatric: '<5' },
  'amylase': { male: '30-110', female: '30-110', pediatric: '30-110' },
  'calcium': { male: '8.6-10.3', female: '8.6-10.3', pediatric: '8.8-10.8' },
  'uric acid': { male: '3.4-7.0', female: '2.4-6.0', pediatric: '2.0-5.5' },
  'bilirubin': { male: '0.2-1.2', female: '0.2-1.2', pediatric: '0.2-1.0' },
  
  // Mental health scores (no lab ranges, just scores)
  'hdrs': { male: '0-7', female: '0-7', pediatric: 'N/A' },
  'ymrs': { male: '0-12', female: '0-12', pediatric: 'N/A' },
  'hcr-20': { male: 'Refer to report', female: 'Refer to report', pediatric: 'N/A' },
  'bai': { male: '0-7', female: '0-7', pediatric: 'N/A' },
  'cars': { male: '<15', female: '<15', pediatric: '<15' },
  'qabf': { male: 'Refer to report', female: 'Refer to report', pediatric: 'Refer to report' },
  'dass': { male: 'Refer to report', female: 'Refer to report', pediatric: 'Refer to report' },
  'risb': { male: 'Refer to report', female: 'Refer to report', pediatric: 'Refer to report' },
  'tat': { male: 'Refer to report', female: 'Refer to report', pediatric: 'Refer to report' },
  'msrs': { male: 'Refer to report', female: 'Refer to report', pediatric: 'Refer to report' },
  
  // Misc abbreviations
  'cdm': { male: 'Refer to report', female: 'Refer to report', pediatric: 'Refer to report' },
  'cpm': { male: 'Refer to report', female: 'Refer to report', pediatric: 'Refer to report' },
  'dap': { male: 'Refer to report', female: 'Refer to report', pediatric: 'Refer to report' },
  'des': { male: 'Refer to report', female: 'Refer to report', pediatric: 'Refer to report' },
  'hfd': { male: 'Refer to report', female: 'Refer to report', pediatric: 'Refer to report' },
  'htp': { male: 'Refer to report', female: 'Refer to report', pediatric: 'Refer to report' },
  'pg': { male: '70-100', female: '70-100', pediatric: '60-100' },
  'spm': { male: 'Refer to report', female: 'Refer to report', pediatric: 'Refer to report' },
  'abs': { male: 'Refer to report', female: 'Refer to report', pediatric: 'Refer to report' },
  'adhd': { male: 'Refer to report', female: 'Refer to report', pediatric: 'Refer to report' },
  'milk test': { male: 'Refer to report', female: 'Refer to report', pediatric: 'Refer to report' },
  'eljkman': { male: 'Refer to report', female: 'Refer to report', pediatric: 'Refer to report' },
  'rh antibod': { male: 'Negative', female: 'Negative', pediatric: 'Negative' },
  'water testing': { male: 'Refer to report', female: 'Refer to report', pediatric: 'Refer to report' },
  'metabolic screen': { male: 'Refer to report', female: 'Refer to report', pediatric: 'Refer to report' },
  
  // Panel test parameters
  'lft': { parameters: {
    'total bilirubin': { male: '0.2-1.2', female: '0.2-1.2', pediatric: '0.2-1.0' },
    'direct bilirubin': { male: '0.0-0.3', female: '0.0-0.3', pediatric: '0.0-0.3' },
    'alt': { male: '10-40', female: '7-35', pediatric: '5-30' },
    'sgpt': { male: '10-40', female: '7-35', pediatric: '5-30' },
    'ast': { male: '10-40', female: '8-35', pediatric: '5-30' },
    'sgot': { male: '10-40', female: '8-35', pediatric: '5-30' },
    'alkaline phosphatase': { male: '40-129', female: '35-104', pediatric: '50-380' },
    'alp': { male: '40-129', female: '35-104', pediatric: '50-380' },
    'total protein': { male: '6.0-8.3', female: '6.0-8.3', pediatric: '6.0-8.0' },
    'albumin': { male: '3.5-5.5', female: '3.5-5.5', pediatric: '3.5-5.5' },
    'globulin': { male: '2.0-3.5', female: '2.0-3.5', pediatric: '2.0-3.5' },
    'gamma gt': { male: '8-61', female: '5-36', pediatric: '5-23' },
    'ggt': { male: '8-61', female: '5-36', pediatric: '5-23' },
  }},
  'rft': { parameters: {
    'urea': { male: '7-20', female: '7-20', pediatric: '5-18' },
    'creatinine': { male: '0.7-1.3', female: '0.6-1.1', pediatric: '0.3-0.7' },
    'sodium': { male: '135-145', female: '135-145', pediatric: '135-145' },
    'potassium': { male: '3.5-5.1', female: '3.5-5.1', pediatric: '3.5-5.1' },
    'chloride': { male: '98-107', female: '98-107', pediatric: '98-107' },
    'uric acid': { male: '3.4-7.0', female: '2.4-6.0', pediatric: '2.0-5.5' },
  }},
  'tft': { parameters: {
    'tsh': { male: '0.4-4.0', female: '0.4-4.0', pediatric: '0.7-6.0' },
    't3': { male: '0.8-2.0', female: '0.8-2.0', pediatric: '0.8-2.0' },
    't4': { male: '5.1-14.1', female: '5.1-14.1', pediatric: '6.0-16.0' },
  }},
  'thyroid': { parameters: {
    'tsh': { male: '0.4-4.0', female: '0.4-4.0', pediatric: '0.7-6.0' },
    't3': { male: '0.8-2.0', female: '0.8-2.0', pediatric: '0.8-2.0' },
    't4': { male: '5.1-14.1', female: '5.1-14.1', pediatric: '6.0-16.0' },
    'ft3': { male: '2.3-4.2', female: '2.3-4.2', pediatric: '2.3-4.2' },
    'ft4': { male: '0.8-1.8', female: '0.8-1.8', pediatric: '0.8-1.8' },
  }},
  'lipid': { parameters: {
    'total cholesterol': { male: '<200', female: '<200', pediatric: '<170' },
    'cholesterol': { male: '<200', female: '<200', pediatric: '<170' },
    'triglycerides': { male: '<150', female: '<150', pediatric: '<100' },
    'hdl': { male: '>40', female: '>50', pediatric: '>40' },
    'ldl': { male: '<100', female: '<100', pediatric: '<110' },
    'vldl': { male: '<30', female: '<30', pediatric: '<30' },
  }},
  'electrolyte': { parameters: {
    'sodium': { male: '135-145', female: '135-145', pediatric: '135-145' },
    'na': { male: '135-145', female: '135-145', pediatric: '135-145' },
    'potassium': { male: '3.5-5.1', female: '3.5-5.1', pediatric: '3.5-5.1' },
    'k': { male: '3.5-5.1', female: '3.5-5.1', pediatric: '3.5-5.1' },
    'chloride': { male: '98-107', female: '98-107', pediatric: '98-107' },
    'cl': { male: '98-107', female: '98-107', pediatric: '98-107' },
  }},
  'blood gas': { parameters: {
    'ph': { male: '7.35-7.45', female: '7.35-7.45', pediatric: '7.35-7.45' },
    'pco2': { male: '35-45', female: '35-45', pediatric: '35-45' },
    'po2': { male: '75-100', female: '75-100', pediatric: '75-100' },
    'hco3': { male: '22-26', female: '22-26', pediatric: '22-26' },
    'base excess': { male: '-2 to +2', female: '-2 to +2', pediatric: '-2 to +2' },
    'o2 saturation': { male: '95-100', female: '95-100', pediatric: '95-100' },
  }},
  'abg': { parameters: {
    'ph': { male: '7.35-7.45', female: '7.35-7.45', pediatric: '7.35-7.45' },
    'pco2': { male: '35-45', female: '35-45', pediatric: '35-45' },
    'po2': { male: '75-100', female: '75-100', pediatric: '75-100' },
    'hco3': { male: '22-26', female: '22-26', pediatric: '22-26' },
    'base excess': { male: '-2 to +2', female: '-2 to +2', pediatric: '-2 to +2' },
    'o2 saturation': { male: '95-100', female: '95-100', pediatric: '95-100' },
  }},
  'vbg': { parameters: {
    'ph': { male: '7.31-7.41', female: '7.31-7.41', pediatric: '7.31-7.41' },
    'pco2': { male: '40-50', female: '40-50', pediatric: '40-50' },
    'po2': { male: '30-50', female: '30-50', pediatric: '30-50' },
    'hco3': { male: '22-26', female: '22-26', pediatric: '22-26' },
  }},
  'cardiac': { parameters: {
    'troponin': { male: '<0.04', female: '<0.04', pediatric: '<0.04' },
    'ck': { male: '30-200', female: '30-170', pediatric: '30-200' },
    'ck-mb': { male: '0-25', female: '0-25', pediatric: '0-25' },
    'ldh': { male: '140-280', female: '140-280', pediatric: '180-430' },
    'ast': { male: '10-40', female: '8-35', pediatric: '5-30' },
    'myoglobin': { male: '25-72', female: '25-72', pediatric: '25-72' },
  }},
  'bone': { parameters: {
    'calcium': { male: '8.6-10.3', female: '8.6-10.3', pediatric: '8.8-10.8' },
    'phosphate': { male: '2.5-4.5', female: '2.5-4.5', pediatric: '4.0-6.5' },
    'alp': { male: '40-129', female: '35-104', pediatric: '50-380' },
    'albumin': { male: '3.5-5.5', female: '3.5-5.5', pediatric: '3.5-5.5' },
    'total protein': { male: '6.0-8.3', female: '6.0-8.3', pediatric: '6.0-8.0' },
  }},
  'cbc': { parameters: {
    'hb': { male: '13.5-17.5', female: '12.0-15.5', pediatric: '11.0-16.0' },
    'hemoglobin': { male: '13.5-17.5', female: '12.0-15.5', pediatric: '11.0-16.0' },
    'tlc': { male: '4.5-11.0', female: '4.5-11.0', pediatric: '5.0-15.0' },
    'wbc': { male: '4.5-11.0', female: '4.5-11.0', pediatric: '5.0-15.0' },
    'rbc': { male: '4.7-6.1', female: '4.2-5.4', pediatric: '3.5-5.5' },
    'platelets': { male: '150-400', female: '150-400', pediatric: '150-450' },
    'hct': { male: '38.8-50.0', female: '34.9-44.5', pediatric: '35-45' },
    'hematocrit': { male: '38.8-50.0', female: '34.9-44.5', pediatric: '35-45' },
    'mcv': { male: '80-100', female: '80-100', pediatric: '70-86' },
    'mch': { male: '27-33', female: '27-33', pediatric: '25-32' },
    'mchc': { male: '32-36', female: '32-36', pediatric: '30-36' },
    'rdw': { male: '11.5-14.5', female: '11.5-14.5', pediatric: '11.5-14.5' },
    'neutrophils': { male: '40-70', female: '40-70', pediatric: '30-60' },
    'lymphocytes': { male: '20-40', female: '20-40', pediatric: '30-60' },
    'monocytes': { male: '2-10', female: '2-10', pediatric: '2-10' },
    'eosinophils': { male: '1-6', female: '1-6', pediatric: '1-6' },
    'basophils': { male: '0-2', female: '0-2', pediatric: '0-2' },
  }},
  'urine': { parameters: {
    'colour': { male: 'Pale yellow', female: 'Pale yellow', pediatric: 'Pale yellow' },
    'color': { male: 'Pale yellow', female: 'Pale yellow', pediatric: 'Pale yellow' },
    'appearance': { male: 'Clear', female: 'Clear', pediatric: 'Clear' },
    'sp. gravity': { male: '1.005-1.030', female: '1.005-1.030', pediatric: '1.005-1.030' },
    'specific gravity': { male: '1.005-1.030', female: '1.005-1.030', pediatric: '1.005-1.030' },
    'ph': { male: '5.0-8.0', female: '5.0-8.0', pediatric: '5.0-8.0' },
    'sugar': { male: 'Negative', female: 'Negative', pediatric: 'Negative' },
    'glucose': { male: 'Negative', female: 'Negative', pediatric: 'Negative' },
    'protein': { male: 'Negative', female: 'Negative', pediatric: 'Negative' },
    'albumin': { male: 'Negative', female: 'Negative', pediatric: 'Negative' },
    'ketones': { male: 'Negative', female: 'Negative', pediatric: 'Negative' },
    'blood': { male: 'Negative', female: 'Negative', pediatric: 'Negative' },
    'bilirubin': { male: 'Negative', female: 'Negative', pediatric: 'Negative' },
    'urobilinogen': { male: '0.1-1.0', female: '0.1-1.0', pediatric: '0.1-1.0' },
    'nitrite': { male: 'Negative', female: 'Negative', pediatric: 'Negative' },
    'leucocytes': { male: 'Negative', female: 'Negative', pediatric: 'Negative' },
    'leukocytes': { male: 'Negative', female: 'Negative', pediatric: 'Negative' },
    'pus cells': { male: '0-2/HPF', female: '0-2/HPF', pediatric: '0-2/HPF' },
    'rbc': { male: '0-2/HPF', female: '0-2/HPF', pediatric: '0-2/HPF' },
    'red blood cells': { male: '0-2/HPF', female: '0-2/HPF', pediatric: '0-2/HPF' },
    'casts': { male: 'Nil', female: 'Nil', pediatric: 'Nil' },
    'crystals': { male: 'Nil', female: 'Nil', pediatric: 'Nil' },
    'bacteria': { male: 'Nil', female: 'Nil', pediatric: 'Nil' },
    'epithelial cells': { male: 'Few', female: 'Few', pediatric: 'Few' },
  }},
  'stool': { parameters: {
    'colour': { male: 'Brown', female: 'Brown', pediatric: 'Brown' },
    'color': { male: 'Brown', female: 'Brown', pediatric: 'Brown' },
    'consistency': { male: 'Formed', female: 'Formed', pediatric: 'Formed' },
    'appearance': { male: 'Formed', female: 'Formed', pediatric: 'Formed' },
    'blood': { male: 'Negative', female: 'Negative', pediatric: 'Negative' },
    'mucus': { male: 'Negative', female: 'Negative', pediatric: 'Negative' },
    'pus cells': { male: '0-2/HPF', female: '0-2/HPF', pediatric: '0-2/HPF' },
    'rbc': { male: 'Nil', female: 'Nil', pediatric: 'Nil' },
    'ova': { male: 'Nil', female: 'Nil', pediatric: 'Nil' },
    'cyst': { male: 'Nil', female: 'Nil', pediatric: 'Nil' },
    'trophozoite': { male: 'Nil', female: 'Nil', pediatric: 'Nil' },
    'parasite': { male: 'Nil', female: 'Nil', pediatric: 'Nil' },
  }},
  'blood culture': { parameters: {
    'organism isolated': { male: 'No growth', female: 'No growth', pediatric: 'No growth' },
    'colony count': { male: 'No growth', female: 'No growth', pediatric: 'No growth' },
    'aerobic culture': { male: 'No growth', female: 'No growth', pediatric: 'No growth' },
    'anaerobic culture': { male: 'No growth', female: 'No growth', pediatric: 'No growth' },
  }},
};

function norm(s) { return String(s || '').trim().toLowerCase().replace(/\s+/g, ' '); }

function findRange(name) {
  const n = norm(name);
  if (RANGES[n]) return RANGES[n];
  // Try partial matches - longest key match first
  const keys = Object.keys(RANGES).sort((a, b) => b.length - a.length);
  for (const k of keys) {
    if (n.includes(k)) return RANGES[k];
  }
  return null;
}

function findParamRange(paramName, testRange) {
  if (!testRange) return null;
  const n = norm(paramName);
  if (testRange.parameters) {
    if (testRange.parameters[n]) return testRange.parameters[n];
    const keys = Object.keys(testRange.parameters).sort((a, b) => b.length - a.length);
    for (const k of keys) {
      if (n.includes(k) || k.includes(n)) return testRange.parameters[k];
    }
  }
  // Fallback: check top-level ranges for this param name
  const top = findRange(paramName);
  if (top && !top.parameters) return top;
  return null;
}

async function main() {
  const client = await MongoClient.connect('mongodb://127.0.0.1:27017/');
  const db = client.db('jinnahmedical');
  const allTests = await db.collection('lab_tests').find({}).toArray();
  console.log(`Total tests: ${allTests.length}`);
  
  let updated = 0;
  let stillMissing = 0;
  const missing = [];

  for (const test of allTests) {
    const testRange = findRange(test.name);
    const params = test.parameters || [];
    let needsUpdate = false;
    const updateFields = {};

    // No parameters - set top-level
    if (params.length === 0 && testRange && !testRange.parameters) {
      if (!test.normalRangeMale && testRange.male) { updateFields.normalRangeMale = testRange.male; needsUpdate = true; }
      if (!test.normalRangeFemale && testRange.female) { updateFields.normalRangeFemale = testRange.female; needsUpdate = true; }
      if (!test.normalRangePediatric && testRange.pediatric) { updateFields.normalRangePediatric = testRange.pediatric; needsUpdate = true; }
    }

    // Has parameters - fill per param
    if (params.length > 0) {
      let changed = false;
      const newParams = params.map(p => {
        if (p.normalRangeMale || p.normalRangeFemale || p.normalRangePediatric) return p;
        const pr = findParamRange(p.name, testRange);
        if (!pr) return p;
        const u = { ...p };
        if (pr.male) u.normalRangeMale = pr.male;
        if (pr.female) u.normalRangeFemale = pr.female;
        if (pr.pediatric) u.normalRangePediatric = pr.pediatric;
        changed = true;
        return u;
      });
      if (changed) { updateFields.parameters = newParams; needsUpdate = true; }
    }

    if (needsUpdate) {
      await db.collection('lab_tests').updateOne({ _id: test._id }, { $set: updateFields });
      updated++;
      if (updated <= 15) console.log(`  Updated: ${test.name}`);
    }

    // Check if still missing
    const hasRanges = params.length > 0
      ? params.some(p => p.normalRangeMale || p.normalRangeFemale)
      : (test.normalRangeMale || test.normalRangeFemale);
    if (!hasRanges) {
      // Re-check after update
      const reloaded = await db.collection('lab_tests').findOne({ _id: test._id });
      const rp = reloaded.parameters || [];
      const hasNow = rp.length > 0
        ? rp.some(p => p.normalRangeMale || p.normalRangeFemale)
        : (reloaded.normalRangeMale || reloaded.normalRangeFemale);
      if (!hasNow) { stillMissing++; if (missing.length < 30) missing.push(test.name); }
    }
  }

  console.log(`\nUpdated: ${updated}, Still missing: ${stillMissing}`);
  if (missing.length > 0) {
    console.log('Still missing (first 30):');
    for (const m of missing) console.log(`  - ${m}`);
  }

  const withRanges = await db.collection('lab_tests').countDocuments({
    $or: [
      { 'parameters.normalRangeMale': { $exists: true, $ne: '' } },
      { 'parameters.normalRangeFemale': { $exists: true, $ne: '' } },
      { normalRangeMale: { $exists: true, $ne: '' } },
      { normalRangeFemale: { $exists: true, $ne: '' } },
    ]
  });
  console.log(`\nFinal: ${withRanges} / ${allTests.length} tests have ranges`);
  await client.close();
}

main().catch(e => { console.error(e); process.exit(1); });
