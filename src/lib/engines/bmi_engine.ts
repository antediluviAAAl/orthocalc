// src/lib/engines/bmi_engine.ts
import { CDC_LMS_DATA } from '../data/cdc_data'

export type BmiCategory = 
  | 'Underweight' 
  | 'Healthy Weight' 
  | 'Overweight' 
  | 'Obesity' 
  | 'Obesity Class I' 
  | 'Obesity Class II' 
  | 'Obesity Class III' 
  | 'Severe Obesity'

export interface DemographicContext {
  ageMonths: number
  isInfant: boolean   // < 24 months
  isPediatric: boolean // 24 months - 20 years
  isAdult: boolean    // >= 20 years (240 months)
  label: string
  referenceDate: string // The date used for calculation
}

export interface BmiMeta {
  methodology: string
  formula: string
  reference_date: string
  exact_age_months: number
  lms_parameters?: {
    l: number
    m: number
    s: number
  }
  z_score_95th?: number
  bmi_95th_percentile?: number
}

export interface BmiResult {
  bmi: number
  zScore?: number
  percentile?: number
  category: BmiCategory | string
  demographics: DemographicContext
  meta: BmiMeta
}

// 1. Helper: Analyze Age Context relative to a Reference Date
export function getDemographicContext(dob: string | null, referenceDate: string): DemographicContext {
  if (!dob) {
    return { 
      ageMonths: 0, 
      isInfant: false, 
      isPediatric: false, 
      isAdult: true, 
      label: 'Adult Standard',
      referenceDate 
    }
  }

  const birthDate = new Date(dob)
  const refDate = new Date(referenceDate)
  
  let ageMonths = (refDate.getFullYear() - birthDate.getFullYear()) * 12 + (refDate.getMonth() - birthDate.getMonth())
  // Adjust for day of month
  if (refDate.getDate() < birthDate.getDate()) ageMonths--
  
  // Sanity check for future dates or misconfigured dates
  if (ageMonths < 0) ageMonths = 0

  return {
    ageMonths,
    isInfant: ageMonths < 24,
    isPediatric: ageMonths >= 24 && ageMonths < 240,
    isAdult: ageMonths >= 240,
    label: ageMonths < 24 ? 'Infant (<2y)' : ageMonths < 240 ? 'Pediatric (WHO/CDC)' : 'Adult Standard',
    referenceDate
  }
}

// 2. Calculation Engine
export function calculateBMI(
  heightCm: number, 
  weightKg: number, 
  dob: string | null, 
  gender: string | null,
  referenceDate: string
): BmiResult | null {
  
  if (!heightCm || !weightKg) return null

  // Basic Math
  const heightM = heightCm / 100
  const bmi = parseFloat((weightKg / (heightM * heightM)).toFixed(1))
  const demo = getDemographicContext(dob, referenceDate)

  // --- INFANT LOGIC ---
  if (demo.isInfant) {
    return {
      bmi,
      category: 'N/A (Infant)',
      demographics: demo,
      meta: {
        methodology: 'None (Infant)',
        formula: 'Weight / Height²',
        reference_date: referenceDate,
        exact_age_months: demo.ageMonths
      }
    }
  }

  // --- ADULT LOGIC (WHO Standards) ---
  if (demo.isAdult || !gender) {
    let cat: BmiCategory = 'Healthy Weight'
    if (bmi < 18.5) cat = 'Underweight'
    else if (bmi < 25) cat = 'Healthy Weight'
    else if (bmi < 30) cat = 'Overweight'
    else if (bmi < 35) cat = 'Obesity Class I'
    else if (bmi < 40) cat = 'Obesity Class II'
    else cat = 'Obesity Class III'

    return {
      bmi,
      category: cat,
      demographics: demo,
      meta: {
        methodology: 'WHO Adult Standards',
        formula: 'Weight / Height²',
        reference_date: referenceDate,
        exact_age_months: demo.ageMonths
      }
    }
  }

  // --- PEDIATRIC LOGIC (CDC LMS) ---
  const sexKey = gender.toLowerCase().startsWith('m') ? 'male' : 'female'
  const table = CDC_LMS_DATA[sexKey]

  if (!table) {
    return { 
      bmi, 
      category: 'Unknown', 
      demographics: demo, 
      meta: { 
        methodology: 'Failed (Gender Invalid)', 
        formula: 'N/A', 
        reference_date: referenceDate, 
        exact_age_months: demo.ageMonths 
      } 
    }
  }

  // Find Closest Age Key
  const availableAges = Object.keys(table).map(parseFloat)
  const closestAge = availableAges.reduce((prev, curr) => {
    return (Math.abs(curr - demo.ageMonths) < Math.abs(prev - demo.ageMonths) ? curr : prev)
  })

  // Retrieve LMS Parameters
  // Ensure we match the string key format (e.g. "24.5")
  const lookupKey = String(closestAge).includes('.') ? String(closestAge) : `${closestAge}.0`
  const lms = table[lookupKey] || table[closestAge.toFixed(1)]

  if (!lms) {
    return { 
      bmi, 
      category: 'Unknown (Lookup Failed)', 
      demographics: demo,
      meta: { 
        methodology: 'Failed (LMS Missing)', 
        formula: 'N/A', 
        reference_date: referenceDate, 
        exact_age_months: demo.ageMonths 
      }
    }
  }

  const [L, M, S] = lms

  // Z-Score Calculation: Z = ((BMI / M)^L - 1) / (L * S)
  const zScore = (Math.pow(bmi / M, L) - 1) / (L * S)
  const percentile = standardNormalCDF(zScore) * 100

  // 95th Percentile Calculation for Severe Obesity Logic
  // Z for 95th percentile is approx 1.64485
  const Z95 = 1.64485
  const bmi95 = M * Math.pow((1 + L * S * Z95), (1/L))

  let pCat: BmiCategory = 'Healthy Weight'
  
  if (percentile < 5) {
    pCat = 'Underweight'
  } else if (percentile < 85) {
    pCat = 'Healthy Weight'
  } else if (percentile < 95) {
    pCat = 'Overweight'
  } else {
    // Obesity check: Is it Severe?
    // CDC definition: >= 120% of 95th percentile OR BMI >= 35
    if (bmi >= (1.2 * bmi95) || bmi >= 35) {
      pCat = 'Severe Obesity'
    } else {
      pCat = 'Obesity'
    }
  }

  return {
    bmi,
    zScore: parseFloat(zScore.toFixed(2)),
    percentile: parseFloat(percentile.toFixed(1)),
    category: pCat,
    demographics: demo,
    meta: {
      methodology: 'CDC LMS 2000 (Pediatric)',
      formula: 'Z = ((BMI/M)^L - 1) / (L * S)',
      reference_date: referenceDate,
      exact_age_months: demo.ageMonths,
      lms_parameters: { l: L, m: M, s: S },
      bmi_95th_percentile: parseFloat(bmi95.toFixed(2))
    }
  }
}

function standardNormalCDF(x: number): number {
  var t = 1 / (1 + .2316419 * Math.abs(x));
  var d = .3989423 * Math.exp(-x * x / 2);
  var prob = d * t * (.3193815 + t * (-.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  if (x > 0) prob = 1 - prob;
  return prob;
}