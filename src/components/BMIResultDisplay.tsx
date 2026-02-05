// src/components/BMIResultDisplay.tsx
'use client'

import { BmiResult } from '@/lib/bmi_engine'
import styles from './BMICalculator.module.css' 

interface BMIResultDisplayProps {
  result: BmiResult
  inputs: any // { height_cm, weight_kg, ... }
}

export default function BMIResultDisplay({ result, inputs }: BMIResultDisplayProps) {
  // Safety checks
  if (!result) return null;

  const demographics = result.demographics || { 
    isPediatric: false, 
    ageMonths: 0 
  };
  
  const meta = result.meta || {
    methodology: 'Legacy Calculation',
    formula: 'N/A',
    reference_date: null,
    exact_age_months: 0
  };

  const getCategoryStyle = (cat: string) => {
    if (!cat) return styles.gray;
    if (cat.includes('Underweight')) return styles.blue
    if (cat.includes('Healthy')) return styles.green
    if (cat.includes('Overweight')) return styles.yellow
    if (cat.includes('Severe') || cat.includes('Class III')) return styles.darkRed
    if (cat.includes('Obesity') || cat.includes('Class II')) return styles.red
    if (cat.includes('Class I')) return styles.orange
    return styles.gray
  }

  const refDateStr = meta.reference_date 
    ? new Date(meta.reference_date).toLocaleDateString() 
    : 'N/A';

  return (
    <div className={styles.resultContainer}>
      
      {/* SECTION 1: MEASUREMENTS (Inputs) */}
      <div className={styles.measurementsRow}>
        <div className={styles.measureItem}>
          <span className={styles.measureLabel}>Height</span>
          <span className={styles.measureValue}>{inputs?.height_cm || '--'} <small>cm</small></span>
        </div>
        <div className={styles.measureItem}>
          <span className={styles.measureLabel}>Weight</span>
          <span className={styles.measureValue}>{inputs?.weight_kg || '--'} <small>kg</small></span>
        </div>
        <div className={styles.measureItem}>
          <span className={styles.measureLabel}>Date</span>
          <span className={styles.measureValue}>{refDateStr}</span>
        </div>
      </div>

      <div className={styles.divider} />

      {/* SECTION 2: THE BIG RESULT */}
      <div className={styles.mainResult}>
        <div className={styles.valueGroup}>
            <span className={styles.bmiValue}>{result.bmi ?? 'N/A'}</span>
            <span className={styles.bmiUnit}>kg/m²</span>
        </div>
        <div className={`${styles.categoryPill} ${getCategoryStyle(result.category)}`}>
            {result.category || 'Unknown'}
        </div>
      </div>

      {/* SECTION 3: PEDIATRIC GRAPH (Conditional) */}
      {demographics.isPediatric && result.percentile !== undefined && (
        <div className={styles.pedsContext}>
          <div className={styles.percentileRow}>
            <span>Percentile: <strong>{result.percentile}th</strong></span>
            <span>Z-Score: <strong>{result.zScore} SD</strong></span>
          </div>
          
          <div className={styles.barContainer}>
             <div className={styles.barSegments}>
                <div className={`${styles.seg} ${styles.blue}`} style={{width: '5%'}}></div>
                <div className={`${styles.seg} ${styles.green}`} style={{width: '80%'}}></div>
                <div className={`${styles.seg} ${styles.yellow}`} style={{width: '10%'}}></div>
                <div className={`${styles.seg} ${styles.red}`} style={{width: '5%'}}></div>
             </div>
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

      {/* SECTION 4: METADATA & FORMULA */}
      <div className={styles.metaContainer}>
        <h5 className={styles.metaTitle}>Calculation Details</h5>
        
        {/* The Formula Block */}
        {meta.formula && meta.formula !== 'N/A' && (
           <div className={styles.formulaBlock}>
              <span className={styles.formulaLabel}>Formula:</span>
              <code className={styles.formulaCode}>{meta.formula}</code>
           </div>
        )}

        <div className={styles.metaGrid}>
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>Method</span>
            <span className={styles.metaValue}>{meta.methodology}</span>
          </div>
          <div className={styles.metaItem}>
             <span className={styles.metaLabel}>Exact Age</span>
             <span className={styles.metaValue}>
               {meta.exact_age_months 
                 ? `${(meta.exact_age_months / 12).toFixed(2)} yrs` 
                 : 'N/A'}
             </span>
          </div>
          
          {meta.lms_parameters && (
             <>
               <div className={styles.metaItem}>
                 <span className={styles.metaLabel}>L (Power)</span>
                 <span className={styles.metaValue}>{meta.lms_parameters.l}</span>
               </div>
               <div className={styles.metaItem}>
                 <span className={styles.metaLabel}>M (Median)</span>
                 <span className={styles.metaValue}>{meta.lms_parameters.m}</span>
               </div>
               <div className={styles.metaItem}>
                 <span className={styles.metaLabel}>S (Var)</span>
                 <span className={styles.metaValue}>{meta.lms_parameters.s}</span>
               </div>
             </>
          )}
        </div>
      </div>
    </div>
  )
}