// src/lib/paley_engine.ts
import { PALEY_HEIGHT_BOYS, PALEY_HEIGHT_GIRLS } from './paley_data'

export interface PaleyHeightResult {
  multiplier: number
  predicted_height_cm: number
  growth_remaining_cm: number
  current_height_cm: number
  age_used: number
  is_bone_age: boolean
  gender: string
}

export function calculatePredictedHeight(
  currentHeightCm: number,
  ageYears: number,
  gender: string,
  useBoneAge: boolean = false
): PaleyHeightResult | null {
  
  if (!currentHeightCm || !gender) return null

  // 1. Select the correct table
  // Paley data is strictly binary (Boy/Girl). 
  const isMale = gender.toLowerCase().startsWith('m')
  const table = isMale ? PALEY_HEIGHT_BOYS : PALEY_HEIGHT_GIRLS
  
  // 2. Maturity Cap (If age > max table age, multiplier is 1.0)
  const maxAge = table[table.length - 1][0]
  if (ageYears >= maxAge) {
    return {
      multiplier: 1.0,
      predicted_height_cm: currentHeightCm,
      growth_remaining_cm: 0,
      current_height_cm: currentHeightCm,
      age_used: ageYears,
      is_bone_age: useBoneAge,
      gender
    }
  }

  // 3. Interpolation Logic
  // Find the two rows our age falls between: [age1, m1] and [age2, m2]
  let lowerRow = table[0]
  let upperRow = table[table.length - 1]

  for (let i = 0; i < table.length - 1; i++) {
    if (ageYears >= table[i][0] && ageYears < table[i+1][0]) {
      lowerRow = table[i]
      upperRow = table[i+1]
      break
    }
  }

  // Linear Interpolation: y = y1 + (x - x1) * ((y2 - y1) / (x2 - x1))
  const x = ageYears
  const x1 = lowerRow[0]
  const y1 = lowerRow[1]
  const x2 = upperRow[0]
  const y2 = upperRow[1]

  // Prevent divide by zero if exact match
  let multiplier = y1
  if (x2 !== x1) {
    multiplier = y1 + (x - x1) * ((y2 - y1) / (x2 - x1))
  }

  // 4. Calculate Final Values
  const predictedHeight = currentHeightCm * multiplier
  const growthRemaining = predictedHeight - currentHeightCm

  return {
    multiplier: parseFloat(multiplier.toFixed(4)), // Keep precision for audit
    predicted_height_cm: parseFloat(predictedHeight.toFixed(1)),
    growth_remaining_cm: parseFloat(growthRemaining.toFixed(1)),
    current_height_cm: currentHeightCm,
    age_used: parseFloat(ageYears.toFixed(2)),
    is_bone_age: useBoneAge,
    gender
  }
}

// Helper: Convert CM to Feet'Inches"
export function formatImperial(cm: number): string {
  const totalInches = cm / 2.54
  const feet = Math.floor(totalInches / 12)
  const inches = Math.round(totalInches % 12)
  return `${feet}' ${inches}"`
}