// src/components/PaleyHeightCalculator.tsx
'use client'

import { useState, useEffect, useMemo } from 'react'
import { Calendar } from 'lucide-react'
import { calculatePredictedHeight, PaleyHeightResult } from '@/lib/paley_engine'
import { getDemographicContext } from '@/lib/bmi_engine' // Reuse for chronological age calc
import PaleyHeightResultDisplay from './PaleyHeightResultDisplay'
import styles from './PaleyHeightCalculator.module.css'

interface PaleyHeightCalculatorProps {
  dob: string | null
  gender: string | null
  referenceDate: string 
  onSave: (data: { inputs: any, results: any, calculation_type: string }) => void
  onCancel: () => void
}

export default function PaleyHeightCalculator({ dob, gender, referenceDate, onSave, onCancel }: PaleyHeightCalculatorProps) {
  const [height, setHeight] = useState('')
  const [calcDate, setCalcDate] = useState(referenceDate ? new Date(referenceDate).toISOString().split('T')[0] : '')
  
  // Bone Age Logic
  const [useBoneAge, setUseBoneAge] = useState(false)
  const [manualBoneAge, setManualBoneAge] = useState('')

  const [result, setResult] = useState<PaleyHeightResult | null>(null)

  // 1. Calculate Chronological Age (Standard)
  const chronologicalContext = useMemo(() => 
    getDemographicContext(dob, calcDate), 
  [dob, calcDate])

  // 2. Real-time Calculation
  useEffect(() => {
    const h = parseFloat(height)
    if (!h || !gender) {
      setResult(null)
      return
    }

    // Determine which age to use
    let ageToUse = chronologicalContext.ageMonths / 12
    
    if (useBoneAge && manualBoneAge) {
      ageToUse = parseFloat(manualBoneAge)
    }

    if (ageToUse > 0) {
      const calc = calculatePredictedHeight(h, ageToUse, gender, useBoneAge)
      setResult(calc)
    }
  }, [height, calcDate, useBoneAge, manualBoneAge, gender, chronologicalContext])

  const handleSave = () => {
    if (!result) return
    onSave({
      calculation_type: 'paley_height',
      inputs: { 
        height_cm: height, 
        reference_date: calcDate,
        use_bone_age: useBoneAge,
        age_used: result.age_used,
        gender
      },
      results: result
    })
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
           <h4 className={styles.title}>Adult Height Prediction</h4>
           <p className={styles.subTitle}>Paley Multiplier Method (2000/2016)</p>
        </div>
      </div>

      <div className={styles.grid}>
        {/* Date Input */}
        <div className={styles.inputGroup}>
          <label>Date of Measurement</label>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Calendar size={16} style={{ position: 'absolute', left: 10, color: '#64748b' }} />
            <input 
              type="date" 
              value={calcDate} 
              onChange={e => setCalcDate(e.target.value)}
              className={styles.input}
              style={{ paddingLeft: '2.25rem' }}
            />
          </div>
        </div>

        {/* Height Input */}
        <div className={styles.inputGroup}>
          <label>Current Height (cm)</label>
          <input 
            type="number" 
            value={height} 
            onChange={e => setHeight(e.target.value)}
            placeholder="e.g. 145"
            className={styles.input}
            autoFocus
          />
        </div>

        {/* Bone Age Toggle */}
        <div className={styles.checkboxGroup}>
           <input 
             type="checkbox" 
             id="boneAgeToggle" 
             checked={useBoneAge} 
             onChange={e => setUseBoneAge(e.target.checked)} 
           />
           <label htmlFor="boneAgeToggle">Manual Bone Age Override</label>
        </div>

        {/* Manual Age Input (Conditional) */}
        {useBoneAge ? (
           <div className={styles.inputGroup}>
             <label>Skeletal Age (Years)</label>
             <input 
               type="number" 
               value={manualBoneAge} 
               onChange={e => setManualBoneAge(e.target.value)}
               placeholder="e.g. 11.5"
               className={styles.input}
             />
           </div>
        ) : (
           <div className={styles.inputGroup}>
             <label>Chronological Age</label>
             <div style={{ padding: '0.75rem', background: '#f1f5f9', borderRadius: '8px', color: '#64748b'}}>
                {(chronologicalContext.ageMonths / 12).toFixed(2)} Years
             </div>
           </div>
        )}
      </div>

      {result && <PaleyHeightResultDisplay result={result} />}

      <div className={styles.actions}>
        <button onClick={onCancel} className={styles.cancelBtn}>Cancel</button>
        <button 
          onClick={handleSave} 
          disabled={!result} 
          className={styles.saveBtn}
        >
          Save Prediction
        </button>
      </div>
    </div>
  )
}