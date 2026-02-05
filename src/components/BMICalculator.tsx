// src/components/BMICalculator.tsx
'use client'

import { useState, useEffect, useMemo } from 'react'
import { AlertTriangle, Info, Calendar } from 'lucide-react'
import { calculateBMI, getDemographicContext, BmiResult } from '@/lib/bmi_engine'
import BMIResultDisplay from './BMIResultDisplay'
import styles from './BMICalculator.module.css'

interface BMICalculatorProps {
  dob: string | null
  gender: string | null
  referenceDate: string // The default (Encounter date)
  onSave: (data: { inputs: any, results: any, calculation_type: string }) => void
  onCancel: () => void
}

export default function BMICalculator({ dob, gender, referenceDate, onSave, onCancel }: BMICalculatorProps) {
  const [height, setHeight] = useState('')
  const [weight, setWeight] = useState('')
  // Initialize with the encounter date, but allow user to change it
  const [calcDate, setCalcDate] = useState(referenceDate ? new Date(referenceDate).toISOString().split('T')[0] : '')
  
  const [result, setResult] = useState<BmiResult | null>(null)

  // 1. Context depends on the SELECTED date
  const context = useMemo(() => 
    getDemographicContext(dob, calcDate), 
  [dob, calcDate])

  // 2. Real-time Calculation
  useEffect(() => {
    const h = parseFloat(height)
    const w = parseFloat(weight)

    if (h > 0 && w > 0 && calcDate) {
      const calcResult = calculateBMI(h, w, dob, gender, calcDate)
      setResult(calcResult)
    } else {
      setResult(null)
    }
  }, [height, weight, dob, gender, calcDate])

  const handleSave = () => {
    if (!result) return
    
    onSave({
      calculation_type: 'bmi',
      inputs: { 
        height_cm: height, 
        weight_kg: weight,
        demographics_snapshot: { 
          dob, 
          gender, 
          age_at_calc: context.ageMonths,
          reference_date: calcDate 
        } 
      },
      results: result
    })
  }

  return (
    <div className={styles.container}>
      {/* HEADER */}
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <h4 className={styles.title}>BMI Calculator</h4>
          <span className={styles.subTitle}>
             Age: {context.ageMonths > 0 ? `${(context.ageMonths/12).toFixed(1)}y` : 'N/A'} • {gender || 'Gender N/A'}
          </span>
        </div>
        
        <div className={styles.badges}>
          {context.isInfant && <span className={styles.badgeInfant}>Infant &lt;2y</span>}
          {context.isPediatric && <span className={styles.badgePeds}>CDC Pediatric</span>}
          {context.isAdult && <span className={styles.badge}>Adult WHO</span>}
        </div>
      </div>
      
      {/* INPUTS GRID */}
      <div className={styles.grid}>
        <div className={styles.inputGroup}>
          <label>Date of Measurement</label>
          <div className={styles.dateInputWrapper}>
            <Calendar size={16} className={styles.inputIcon} />
            <input 
              type="date" 
              value={calcDate} 
              onChange={e => setCalcDate(e.target.value)}
              className={styles.input}
            />
          </div>
        </div>

        {/* Spacer to align grid if needed, or we can span the date row */}
        <div className={styles.inputGroup} style={{ visibility: 'hidden' }}></div>

        <div className={styles.inputGroup}>
          <label>Height (cm)</label>
          <input 
            type="number" 
            value={height} 
            onChange={e => setHeight(e.target.value)}
            placeholder="e.g. 175"
            className={styles.input}
            autoFocus
          />
        </div>
        <div className={styles.inputGroup}>
          <label>Weight (kg)</label>
          <input 
            type="number" 
            value={weight} 
            onChange={e => setWeight(e.target.value)}
            placeholder="e.g. 70"
            className={styles.input}
          />
        </div>
      </div>

      {/* RESULT AREA */}
      {result ? (
        <div className={styles.resultWrapper}>
          {context.isInfant ? (
            <div className={styles.resultContainer}>
               <div className={styles.infantWarning}>
                <AlertTriangle size={20} />
                <p>BMI is not clinically valid for patients under 2 years.</p>
                <div className={styles.rawBmi}>Raw: {result.bmi}</div>
              </div>
            </div>
          ) : (
            // Pass inputs so they are shown in the preview
            <BMIResultDisplay 
              result={result} 
              inputs={{ height_cm: height, weight_kg: weight }} 
            />
          )}
        </div>
      ) : (
        <div className={styles.placeholder}>
          <Info size={16} />
          <span>Enter measurements to see clinical analysis.</span>
        </div>
      )}

      <div className={styles.actions}>
        <button onClick={onCancel} className={styles.cancelBtn}>Cancel</button>
        <button 
          onClick={handleSave} 
          disabled={!result || context.isInfant} 
          className={styles.saveBtn}
        >
          Save Calculation
        </button>
      </div>
    </div>
  )
}