// src/lib/bmi_engine.ts
import { CDC_LMS_DATA } from './cdc_data'

export type BmiCategory = 'Underweight' | 'Healthy Weight' | 'Overweight' | 'Obesity' | 'Severe Obesity'

export interface DemographicContext {
  ageMonths: number
  isInfant: boolean   // < 24 months
  isPediatric: boolean // 24 months - 20 years
  isAdult: boolean    // >= 20 years (240 months)
  label: string
}

export interface BmiResult {
  bmi: number
  zScore?: number
  percentile?: number
  category: BmiCategory | string
  demographics: DemographicContext
}

// 1. New Helper: Analyze Age Context independently of measurements
export function getDemographicContext(dob: string | null): DemographicContext {
  if (!dob) {
    return { ageMonths: 0, isInfant: false, isPediatric: false, isAdult: true, label: 'Adult Standard' }
  }

  const birthDate = new Date(dob)
  const today = new Date()
  let ageMonths = (today.getFullYear() - birthDate.getFullYear()) * 12 + (today.getMonth() - birthDate.getMonth())
  // Adjust for day of month
  if (today.getDate() < birthDate.getDate()) ageMonths--
  
  // Sanity check for future dates
  if (ageMonths < 0) ageMonths = 0

  return {
    ageMonths,
    isInfant: ageMonths < 24,
    isPediatric: ageMonths >= 24 && ageMonths < 240,
    isAdult: ageMonths >= 240,
    label: ageMonths < 24 ? 'Infant (<2y)' : ageMonths < 240 ? 'Pediatric (WHO/CDC)' : 'Adult Standard'
  }
}

// 2. Calculation Engine
export function calculateBMI(
  heightCm: number, 
  weightKg: number, 
  dob: string | null, 
  gender: string | null
): BmiResult | null {
  
  if (!heightCm || !weightKg) return null

  // Basic Math
  const heightM = heightCm / 100
  const bmi = parseFloat((weightKg / (heightM * heightM)).toFixed(1))
  const demo = getDemographicContext(dob)

  // --- INFANT LOGIC ---
  if (demo.isInfant) {
    return {
      bmi,
      category: 'N/A (Infant)',
      demographics: demo
    }
  }

  // --- ADULT LOGIC ---
  if (demo.isAdult || !gender) {
    let cat: BmiCategory = 'Healthy Weight'
    if (bmi < 18.5) cat = 'Underweight'
    else if (bmi < 25) cat = 'Healthy Weight'
    else if (bmi < 30) cat = 'Overweight'
    else if (bmi < 35) cat = 'Obesity'
    else cat = 'Severe Obesity'

    return {
      bmi,
      category: cat,
      demographics: demo
    }
  }

  // --- PEDIATRIC LOGIC (Robust Lookup) ---
  // Normalize gender
  const sexKey = gender.toLowerCase().startsWith('m') ? 'male' : 'female'
  const table = CDC_LMS_DATA[sexKey]

  if (!table) {
    // Fallback if gender string is weird
    return { bmi, category: 'Unknown', demographics: demo }
  }

  // Find Closest Key: This fixes the "Data Gap" error
  // We grab all available age keys, sort them, and find the closest one to our patient's age
  const availableAges = Object.keys(table).map(parseFloat)
  
  // Reduce to find closest
  const closestAge = availableAges.reduce((prev, curr) => {
    return (Math.abs(curr - demo.ageMonths) < Math.abs(prev - demo.ageMonths) ? curr : prev)
  })

  // Format back to string key (e.g., 24.5) to retrieve data
  // Assuming keys in cdc_data are strings like "24.5"
  // We use .toFixed(1) only if your keys are consistently "X.X"
  // A safer bet is to match the number back to the string key in the object
  const lookupKey = String(closestAge).includes('.') ? String(closestAge) : `${closestAge}.0`
  
  // Try exact match, then fixed match
  const lms = table[String(closestAge)] || table[closestAge.toFixed(1)]

  if (!lms) {
    return { bmi, category: 'Unknown (Lookup Failed)', demographics: demo }
  }

  const [L, M, S] = lms

  // Z-Score Calculation
  const zScore = (Math.pow(bmi / M, L) - 1) / (L * S)
  const percentile = standardNormalCDF(zScore) * 100

  let pCat: BmiCategory = 'Healthy Weight'
  if (percentile < 5) pCat = 'Underweight'
  else if (percentile < 85) pCat = 'Healthy Weight'
  else if (percentile < 95) pCat = 'Overweight'
  else pCat = 'Obesity'

  return {
    bmi,
    zScore: parseFloat(zScore.toFixed(2)),
    percentile: parseFloat(percentile.toFixed(1)),
    category: pCat,
    demographics: demo
  }
}

function standardNormalCDF(x: number): number {
  var t = 1 / (1 + .2316419 * Math.abs(x));
  var d = .3989423 * Math.exp(-x * x / 2);
  var prob = d * t * (.3193815 + t * (-.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  if (x > 0) prob = 1 - prob;
  return prob;
}