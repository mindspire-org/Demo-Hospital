/**
 * Lab Test Formula Definitions
 * Defines automatic calculations for test parameters based on other parameter values
 */

export interface FormulaConfig {
  testName: string
  calculatedParameters: {
    parameterName: string
    formula: (values: Record<string, number>) => number | null
    dependencies: string[] // Parameters needed for calculation
    precision?: number // Decimal places (default: 2)
  }[]
}

/**
 * Calculate Creatinine Clearance (Cockcroft-Gault Formula)
 * For Males: CrCl = ((140 - age) × weight) / (72 × serum creatinine)
 * For Females: CrCl = ((140 - age) × weight × 0.85) / (72 × serum creatinine)
 * Note: Requires age and weight which may not be in test parameters
 */
function calculateCreatinineClearance(
  age: number,
  weight: number,
  serumCreatinine: number,
  isFemale: boolean = false
): number | null {
  if (!age || !weight || !serumCreatinine || serumCreatinine === 0) return null
  
  const baseCalc = ((140 - age) * weight) / (72 * serumCreatinine)
  return isFemale ? baseCalc * 0.85 : baseCalc
}

/**
 * Calculate eGFR (estimated Glomerular Filtration Rate) - Simplified
 * Simplified formula: eGFR = 186 × (Creatinine)^-1.154 × (Age)^-0.203
 * For females: multiply by 0.742
 */
function calculateEGFR(
  serumCreatinine: number,
  age: number,
  isFemale: boolean = false
): number | null {
  if (!serumCreatinine || !age || serumCreatinine === 0) return null
  
  const egfr = 186 * Math.pow(serumCreatinine, -1.154) * Math.pow(age, -0.203)
  return isFemale ? egfr * 0.742 : egfr
}

/**
 * Calculate T3/T4 Ratio
 * Used to assess thyroid function
 */
function calculateT3T4Ratio(t3: number, t4: number): number | null {
  if (!t3 || !t4 || t4 === 0) return null
  return t3 / t4
}

/**
 * Calculate Free T3 Index (if Total T3 and T4 available)
 * Approximation: FT3 Index = T3 / T4 × 100
 */
function calculateFT3Index(t3: number, t4: number): number | null {
  if (!t3 || !t4 || t4 === 0) return null
  return (t3 / t4) * 100
}

/**
 * Calculate Ca/Mg Ratio (Calcium to Magnesium Ratio)
 * Used to assess mineral balance
 */
function calculateCaMgRatio(calcium: number, magnesium: number): number | null {
  if (!calcium || !magnesium || magnesium === 0) return null
  return calcium / magnesium
}

/**
 * Calculate tCO2 (Total CO2) from HCO3 and pCO2
 * Formula: tCO2 = HCO3 + (0.03 × pCO2)
 */
function calculateTCO2(hco3: number, pco2: number): number | null {
  if (!hco3 || !pco2) return null
  return hco3 + (0.03 * pco2)
}

/**
 * Calculate stHCO3 (Standard Bicarbonate) - approximation
 * For simplicity, stHCO3 ≈ HCO3 (at standard conditions)
 */
function calculateStHCO3(hco3: number): number | null {
  if (!hco3) return null
  return hco3 // Simplified - in reality needs pH and pCO2 correction
}

/**
 * Calculate INR (International Normalized Ratio) from PT
 * Formula: INR = (PT patient / PT control) ^ ISI
 * Simplified: INR = PT patient / PT control (assuming ISI = 1)
 */
function calculateINR(ptPatient: number, ptControl: number): number | null {
  if (!ptPatient || !ptControl || ptControl === 0) return null
  return ptPatient / ptControl
}

/**
 * Calculate BUN (Blood Urea Nitrogen) from Urea
 * Formula: BUN = Urea / 2.14
 * (Conversion from mg/dL urea to mg/dL BUN)
 */
function calculateBUN(urea: number): number | null {
  if (!urea) return null
  return urea / 2.14
}

/**
 * Calculate Urea from BUN
 * Formula: Urea = BUN * 2.14
 */
function calculateUrea(bun: number): number | null {
  if (!bun) return null
  return bun * 2.14
}

/**
 * Calculate Anion Gap
 * Formula: Anion Gap = (Na + K) - (Cl + HCO3)
 * Or simplified: Anion Gap = Na - (Cl + HCO3)
 */
function calculateAnionGap(sodium: number, chloride: number, hco3: number, potassium?: number): number | null {
  if (!sodium || !chloride || !hco3) return null
  if (potassium) {
    return (sodium + potassium) - (chloride + hco3)
  }
  return sodium - (chloride + hco3)
}

/**
 * Calculate MCV (Mean Corpuscular Volume)
 * Formula: (HCT / RBC) * 10
 */
function calculateMCV(hct: number, rbc: number): number | null {
  if (!hct || !rbc || rbc === 0) return null
  return (hct / rbc) * 10
}

/**
 * Calculate MCH (Mean Corpuscular Hemoglobin)
 * Formula: (Hb / RBC) * 10
 */
function calculateMCH(hb: number, rbc: number): number | null {
  if (!hb || !rbc || rbc === 0) return null
  return (hb / rbc) * 10
}

/**
 * Calculate MCHC (Mean Corpuscular Hemoglobin Concentration)
 * Formula: (Hb / HCT) * 100
 */
function calculateMCHC(hb: number, hct: number): number | null {
  if (!hb || !hct || hct === 0) return null
  return (hb / hct) * 100
}

/**
 * Calculate BUN/Creatinine Ratio
 * Formula: BUN / Creatinine
 */
function calculateBUNCreatinineRatio(bun: number, creatinine: number): number | null {
  if (!bun || !creatinine || creatinine === 0) return null
  return bun / creatinine
}

/**
 * Calculate Corrected Calcium (for hypoalbuminemia)
 * Formula: Measured Calcium + 0.8 * (4 - Albumin)
 */
function calculateCorrectedCalcium(calcium: number, albumin: number): number | null {
  if (!calcium || !albumin) return null
  return calcium + 0.8 * (4 - albumin)
}

/**
 * Calculate Serum Osmolality
 * Formula: 2(Na+) + Glucose/18 + BUN/2.8
 */
function calculateOsmolality(sodium: number, glucose: number, bun: number): number | null {
  if (!sodium) return null
  const g = glucose || 0
  const b = bun || 0
  return 2 * sodium + (g / 18) + (b / 2.8)
}

/**
 * Calculate Albumin-Creatinine Ratio (ACR)
 * Formula: Urine Albumin / Urine Creatinine
 */
function calculateACR(urineAlbumin: number, urineCreatinine: number): number | null {
  if (!urineAlbumin || !urineCreatinine || urineCreatinine === 0) return null
  return urineAlbumin / urineCreatinine
}

/**
 * Calculate eGFR using CKD-EPI 2021 formula (race-free)
 * For creatinine in mg/dL
 */
function calculateEGFR_CKD_EPI(serumCreatinine: number, age: number, isFemale: boolean = false): number | null {
  if (!serumCreatinine || !age || serumCreatinine <= 0 || age <= 0) return null
  const scr = serumCreatinine
  const kappa = isFemale ? 0.7 : 0.9
  const alpha = isFemale ? -0.241 : -0.302
  const minTerm = Math.min(scr / kappa, 1)
  const maxTerm = Math.max(scr / kappa, 1)
  const sexCoeff = isFemale ? 1.012 : 1
  const egfr = 142 * Math.pow(minTerm, alpha) * Math.pow(maxTerm, -1.200) * Math.pow(0.9938, age) * sexCoeff
  return egfr
}

/**
 * Calculate VLDL (Very Low Density Lipoprotein)
 * Formula: Triglycerides / 5
 */
function calculateVLDL(triglycerides: number): number | null {
  if (!triglycerides) return null
  return triglycerides / 5
}

/**
 * Calculate LDL (Low Density Lipoprotein)
 * Formula: Total Cholesterol - HDL - VLDL
 * Or: Total Cholesterol - HDL - (Triglycerides / 5)
 */
function calculateLDL(cholesterol: number, hdl: number, vldl: number): number | null {
  if (!cholesterol || !hdl || !vldl) return null
  return cholesterol - hdl - vldl
}

/**
 * Calculate Globulins
 * Formula: Total Protein - Albumin
 */
function calculateGlobulins(totalProtein: number, albumin: number): number | null {
  if (!totalProtein || !albumin) return null
  return totalProtein - albumin
}

/**
 * Calculate A/G Ratio (Albumin/Globulin Ratio)
 * Formula: Albumin / Globulins
 */
function calculateAGRatio(albumin: number, globulins: number): number | null {
  if (!albumin || !globulins || globulins === 0) return null
  return albumin / globulins
}

/**
 * Formula configurations for all tests with calculated parameters
 */
export const LAB_FORMULAS: FormulaConfig[] = [
  // Complete Blood Count (CBC)
  {
    testName: 'Complete Blood Count (CBC)',
    calculatedParameters: [
      {
        parameterName: 'M.C.V',
        formula: (values) => calculateMCV(values['HCT (PCV)'], values['Red Cell Count( RBC)']),
        dependencies: ['HCT (PCV)', 'Red Cell Count( RBC)'],
        precision: 1
      },
      {
        parameterName: 'MCV',
        formula: (values) => calculateMCV(values['HCT'], values['Total RBC']),
        dependencies: ['HCT', 'Total RBC'],
        precision: 1
      },
      {
        parameterName: 'M.C.H',
        formula: (values) => calculateMCH(values['Haemoglobin (Hb)'], values['Red Cell Count( RBC)']),
        dependencies: ['Haemoglobin (Hb)', 'Red Cell Count( RBC)'],
        precision: 1
      },
      {
        parameterName: 'MCH',
        formula: (values) => calculateMCH(values['Haemoglobin (Hb)'], values['Total RBC']),
        dependencies: ['Haemoglobin (Hb)', 'Total RBC'],
        precision: 1
      },
      {
        parameterName: 'M.C.H.C',
        formula: (values) => calculateMCHC(values['Haemoglobin (Hb)'], values['HCT (PCV)']),
        dependencies: ['Haemoglobin (Hb)', 'HCT (PCV)'],
        precision: 1
      },
      {
        parameterName: 'MCHC',
        formula: (values) => calculateMCHC(values['Haemoglobin (Hb)'], values['HCT']),
        dependencies: ['Haemoglobin (Hb)', 'HCT'],
        precision: 1
      }
    ]
  },
  // Blood (Complete, CBC) - Alternative naming
  {
    testName: 'Blood (Complete,CBC)',
    calculatedParameters: [
      {
        parameterName: 'MCV',
        formula: (values) => calculateMCV(values['HCT'], values['Total RBC']),
        dependencies: ['HCT', 'Total RBC'],
        precision: 1
      },
      {
        parameterName: 'MCH',
        formula: (values) => calculateMCH(values['Haemoglobin (Hb)'], values['Total RBC']),
        dependencies: ['Haemoglobin (Hb)', 'Total RBC'],
        precision: 1
      },
      {
        parameterName: 'MCHC',
        formula: (values) => calculateMCHC(values['Haemoglobin (Hb)'], values['HCT']),
        dependencies: ['Haemoglobin (Hb)', 'HCT'],
        precision: 1
      }
    ]
  },
  // Hematology (Reticulocytes & CBC)
  {
    testName: 'Hematology (Reticulocytes & CBC)',
    calculatedParameters: [
      {
        parameterName: 'M.C.V',
        formula: (values) => calculateMCV(values['HCT (PCV)'], values['Red Cell Count( RBC)']),
        dependencies: ['HCT (PCV)', 'Red Cell Count( RBC)'],
        precision: 1
      },
      {
        parameterName: 'M.C.H',
        formula: (values) => calculateMCH(values['Haemoglobin (Hb)'], values['Red Cell Count( RBC)']),
        dependencies: ['Haemoglobin (Hb)', 'Red Cell Count( RBC)'],
        precision: 1
      },
      {
        parameterName: 'M.C.H.C',
        formula: (values) => calculateMCHC(values['Haemoglobin (Hb)'], values['HCT (PCV)']),
        dependencies: ['Haemoglobin (Hb)', 'HCT (PCV)'],
        precision: 1
      }
    ]
  },
  // Fasting Lipid Profile
  {
    testName: 'Fasting Lipid Profile',
    calculatedParameters: [
      {
        parameterName: 'VLDL',
        formula: (values) => calculateVLDL(values['Triglycerides (Serum) TG']),
        dependencies: ['Triglycerides (Serum) TG'],
        precision: 1
      },
      {
        parameterName: 'LDL (Cholesterol)',
        formula: (values) => {
          const vldl = calculateVLDL(values['Triglycerides (Serum) TG'])
          if (vldl === null) return null
          return calculateLDL(values['Cholesterol (Serum)'], values['HDL (Cholesterol)'], vldl)
        },
        dependencies: ['Cholesterol (Serum)', 'HDL (Cholesterol)', 'Triglycerides (Serum) TG'],
        precision: 1
      }
    ]
  },
  // Liver Function Test
  {
    testName: 'Liver Function Test',
    calculatedParameters: [
      {
        parameterName: 'Globulins',
        formula: (values) => calculateGlobulins(values['Total Protein (Serum)'], values['Albumin (Serum)']),
        dependencies: ['Total Protein (Serum)', 'Albumin (Serum)'],
        precision: 1
      },
      {
        parameterName: 'A/G Ratio',
        formula: (values) => {
          const globulins = calculateGlobulins(values['Total Protein (Serum)'], values['Albumin (Serum)'])
          if (globulins === null) return null
          return calculateAGRatio(values['Albumin (Serum)'], globulins)
        },
        dependencies: ['Total Protein (Serum)', 'Albumin (Serum)'],
        precision: 2
      }
    ]
  },
  // Renal Function Test (RFT) with HbA1c
  {
    testName: 'RFT Hba1c',
    calculatedParameters: [
      {
        parameterName: 'BUN (Blood Urea Nitrogen)',
        formula: (values) => calculateBUN(values['Urea (Serum)']),
        dependencies: ['Urea (Serum)'],
        precision: 1
      }
    ]
  },
  // Renal Function Test (standalone)
  {
    testName: 'Renal Function Test',
    calculatedParameters: [
      {
        parameterName: 'BUN (Blood Urea Nitrogen)',
        formula: (values) => calculateBUN(values['Urea (Serum)'] || values['Urea']),
        dependencies: ['Urea (Serum)'],
        precision: 1
      },
      {
        parameterName: 'BUN/Creatinine Ratio',
        formula: (values) => calculateBUNCreatinineRatio(
          values['BUN (Blood Urea Nitrogen)'] || values['BUN'],
          values['Serum Creatinine'] || values['Creatinine']
        ),
        dependencies: ['BUN (Blood Urea Nitrogen)', 'Serum Creatinine'],
        precision: 1
      },
      {
        parameterName: 'Corrected Calcium',
        formula: (values) => calculateCorrectedCalcium(
          values['Calcium'],
          values['Albumin']
        ),
        dependencies: ['Calcium', 'Albumin'],
        precision: 2
      },
      {
        parameterName: 'Osmolality',
        formula: (values) => calculateOsmolality(
          values['Sodium'],
          values['Glucose'] || 0,
          values['BUN (Blood Urea Nitrogen)'] || values['BUN'] || 0
        ),
        dependencies: ['Sodium', 'Glucose', 'BUN (Blood Urea Nitrogen)'],
        precision: 1
      }
    ]
  },
  // RFT (frontend template name)
  {
    testName: 'RFT',
    calculatedParameters: [
      {
        parameterName: 'BUN',
        formula: (values) => calculateBUN(values['Blood Urea'] || values['Urea']),
        dependencies: ['Blood Urea'],
        precision: 1
      },
      {
        parameterName: 'BUN/Creatinine Ratio',
        formula: (values) => calculateBUNCreatinineRatio(
          values['BUN'] || values['BUN (Blood Urea Nitrogen)'],
          values['Serum Creatinine'] || values['Creatinine']
        ),
        dependencies: ['BUN', 'Serum Creatinine'],
        precision: 1
      },
      {
        parameterName: 'Corrected Calcium',
        formula: (values) => calculateCorrectedCalcium(
          values['Calcium'],
          values['Albumin']
        ),
        dependencies: ['Calcium', 'Albumin'],
        precision: 2
      },
      {
        parameterName: 'Osmolality',
        formula: (values) => calculateOsmolality(
          values['Sodium'],
          values['Glucose'] || 0,
          values['BUN'] || 0
        ),
        dependencies: ['Sodium', 'Glucose', 'BUN'],
        precision: 1
      }
    ]
  },
  // Serum Electrolytes with Anion Gap
  {
    testName: 'Serum Electrolytes',
    calculatedParameters: [
      {
        parameterName: 'Anion Gap',
        formula: (values) => calculateAnionGap(
          values['Sodium'],
          values['Chloride'],
          values['HCO3'] || values['Bicarbonate'],
          values['Potassium']
        ),
        dependencies: ['Sodium', 'Chloride'],
        precision: 1
      }
    ]
  },
  // Arterial Blood Gases (ABGS)
  {
    testName: 'Arterial Blood Gases (ABGS)',
    calculatedParameters: [
      {
        parameterName: 'tCO2',
        formula: (values) => calculateTCO2(values['HCO3'], values['pCO2']),
        dependencies: ['HCO3', 'pCO2'],
        precision: 1
      },
      {
        parameterName: 'stHCO3',
        formula: (values) => calculateStHCO3(values['HCO3']),
        dependencies: ['HCO3'],
        precision: 1
      }
    ]
  },
  // Coagulation Profile (APTT/PT/INR)
  {
    testName: 'Coagulation Profile (APTT/PT/INR)',
    calculatedParameters: [
      {
        parameterName: 'INR',
        formula: (values) => calculateINR(values['PT'], values['Control.']),
        dependencies: ['PT', 'Control.'],
        precision: 2
      }
    ]
  },
  // PT with INR
  {
    testName: 'PT with INR',
    calculatedParameters: [
      {
        parameterName: 'INR',
        formula: (values) => calculateINR(values['PT'], values['Control']),
        dependencies: ['PT', 'Control'],
        precision: 2
      }
    ]
  },
  // Thyroid Function Test (TFT)
  {
    testName: 'Thyroid Function Test (TFT)',
    calculatedParameters: [
      {
        parameterName: 'T3/T4 Ratio',
        formula: (values) => calculateT3T4Ratio(values['Total T3'], values['Total T4']),
        dependencies: ['Total T3', 'Total T4'],
        precision: 3
      },
      {
        parameterName: 'Free T3 Index',
        formula: (values) => calculateFT3Index(values['Total T3'], values['Total T4']),
        dependencies: ['Total T3', 'Total T4'],
        precision: 2
      }
    ]
  },
  // Magnesium & Calcium
  {
    testName: 'Magnesium & Calcium',
    calculatedParameters: [
      {
        parameterName: 'Ca/Mg Ratio',
        formula: (values) => calculateCaMgRatio(values['Calcium (Serum)'], values['Magnesium (Serum)']),
        dependencies: ['Calcium (Serum)', 'Magnesium (Serum)'],
        precision: 2
      }
    ]
  }
]

/**
 * Apply formulas to calculate dependent parameter values
 * @param testName - Name of the test
 * @param parameterValues - Object with parameter names as keys and their values
 * @returns Updated parameter values with calculated fields
 */
export function applyLabFormulas(
  testName: string,
  parameterValues: Record<string, string | number>
): Record<string, string> {
  const formulaConfig = LAB_FORMULAS.find(f => f.testName === testName)
  if (!formulaConfig) return parameterValues as Record<string, string>

  const result = { ...parameterValues }
  const numericValues: Record<string, number> = {}

  // Convert all values to numbers for calculation
  for (const [key, value] of Object.entries(parameterValues)) {
    const num = typeof value === 'number' ? value : parseFloat(value as string)
    if (!isNaN(num)) {
      numericValues[key] = num
    }
  }

  // Calculate each formula
  for (const calc of formulaConfig.calculatedParameters) {
    // Check if all dependencies are available
    const hasAllDependencies = calc.dependencies.every(dep => 
      numericValues[dep] !== undefined && numericValues[dep] !== null
    )

    if (hasAllDependencies) {
      const calculatedValue = calc.formula(numericValues)
      if (calculatedValue !== null) {
        const precision = calc.precision ?? 2
        result[calc.parameterName] = calculatedValue.toFixed(precision)
      }
    }
  }

  return result as Record<string, string>
}

/**
 * Get list of calculated parameters for a test
 * @param testName - Name of the test
 * @returns Array of parameter names that are auto-calculated
 */
export function getCalculatedParameters(testName: string): string[] {
  const formulaConfig = LAB_FORMULAS.find(f => f.testName === testName)
  if (!formulaConfig) return []
  return formulaConfig.calculatedParameters.map(c => c.parameterName)
}

/**
 * Check if a parameter is calculated for a given test
 * @param testName - Name of the test
 * @param parameterName - Name of the parameter
 * @returns True if the parameter is auto-calculated
 */
export function isCalculatedParameter(testName: string, parameterName: string): boolean {
  return getCalculatedParameters(testName).includes(parameterName)
}
