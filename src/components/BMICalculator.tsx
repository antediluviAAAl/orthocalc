// src/components/BMICalculator.tsx
'use client'

import { useState, useEffect, useMemo } from 'react'
import { AlertTriangle, Info } from 'lucide-react'
import { calculateBMI, getDemographicContext, BmiResult } from '@/lib/bmi_engine'
import styles from './BMICalculator.module.css'

interface BMICalculatorProps {
  dob: string | null
  gender: string | null
  onSave: (data: { inputs: any, results: any, calculation_type: string }) => void
  onCancel: () => void
}

export default function BMICalculator({ dob, gender, onSave, onCancel }: BMICalculatorProps) {
  const [height, setHeight] = useState('')
  const [weight, setWeight] = useState('')
  const [result, setResult] = useState<BmiResult | null>(null)

  // 1. Immediate Context: Calculate this purely from props, not inputs
  const context = useMemo(() => getDemographicContext(dob), [dob])

  // 2. Real-time Calculation
  useEffect(() => {
    const h = parseFloat(height)
    const w = parseFloat(weight)

    if (h > 0 && w > 0) {
      const calcResult = calculateBMI(h, w, dob, gender)
      setResult(calcResult)
    } else {
      setResult(null)
    }
  }, [height, weight, dob, gender])

  const handleSave = () => {
    if (!result) return
    
    onSave({
      calculation_type: 'bmi',
      inputs: { 
        height_cm: height, 
        weight_kg: weight,
        demographics_snapshot: { dob, gender, age_months: context.ageMonths } 
      },
      results: result
    })
  }

  const getCategoryStyle = (cat: string) => {
    if (cat.includes('Underweight')) return styles.blue
    if (cat.includes('Healthy')) return styles.green
    if (cat.includes('Overweight')) return styles.yellow
    if (cat.includes('Obesity') || cat.includes('Severe')) return styles.red
    return styles.gray
  }

  return (
    <div className={styles.container}>
      {/* HEADER: Shows Context Immediately */}
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <h4 className={styles.title}>BMI Calculator</h4>
          <span className={styles.subTitle}>
             {context.ageMonths > 0 ? `${(context.ageMonths/12).toFixed(1)} years` : 'Age N/A'} • {gender || 'Gender N/A'}
          </span>
        </div>
        
        {/* Badges based on Context, not Input */}
        <div className={styles.badges}>
          {context.isInfant && <span className={styles.badgeInfant}>Infant &lt;2y</span>}
          {context.isPediatric && <span className={styles.badgePeds}>CDC Pediatric</span>}
          {context.isAdult && <span className={styles.badge}>Adult Standard</span>}
        </div>
      </div>
      
      {/* INPUTS */}
      <div className={styles.grid}>
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
        <div className={styles.resultContainer}>
          {context.isInfant ? (
            <div className={styles.infantWarning}>
              <AlertTriangle size={20} />
              <p>BMI is not clinically valid for patients under 2 years.</p>
              <div className={styles.rawBmi}>Raw Calculation: {result.bmi}</div>
            </div>
          ) : (
            <>
              {/* Main Score Card */}
              <div className={styles.mainResult}>
                <div className={styles.valueGroup}>
                    <span className={styles.bmiValue}>{result.bmi}</span>
                    <span className={styles.bmiUnit}>kg/m²</span>
                </div>
                <div className={`${styles.categoryPill} ${getCategoryStyle(result.category)}`}>
                    {result.category}
                </div>
              </div>
              
              {/* Pediatric Graph - Renders if Pediatric AND has Data */}
              {context.isPediatric && result.percentile !== undefined && (
                <div className={styles.pedsContext}>
                  <div className={styles.percentileRow}>
                    <span>Percentile: <strong>{result.percentile}th</strong></span>
                    <span>Z-Score: <strong>{result.zScore} SD</strong></span>
                  </div>
                  
                  {/* The Graph */}
                  <div className={styles.barContainer}>
                     <div className={styles.barSegments}>
                        {/* 5% Underweight */}
                        <div className={`${styles.seg} ${styles.blue}`} style={{width: '5%'}}></div>
                        {/* 80% Healthy (5-85) */}
                        <div className={`${styles.seg} ${styles.green}`} style={{width: '80%'}}></div>
                        {/* 10% Overweight (85-95) */}
                        <div className={`${styles.seg} ${styles.yellow}`} style={{width: '10%'}}></div>
                        {/* 5% Obese (95+) */}
                        <div className={`${styles.seg} ${styles.red}`} style={{width: '5%'}}></div>
                     </div>
                     {/* The Needle */}
                     <div 
                        className={styles.marker} 
                        style={{ left: `${Math.min(Math.max(result.percentile, 0), 100)}%` }}
                     >
                       <div className={styles.markerHead}></div>
                     </div>
                  </div>
                  <div className={styles.barLabels}>
                    <span style={{left: '0%'}}>0</span>
                    <span style={{left: '5%'}}>5th</span>
                    <span style={{left: '85%'}}>85th</span>
                    <span style={{left: '95%'}}>95th</span>
                    <span style={{left: '100%'}}>100</span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        /* Empty State / Prompt */
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