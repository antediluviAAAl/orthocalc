// src/components/calculators/PaleyHeightResultDisplay.tsx
'use client'

import { PaleyHeightResult, formatImperial } from '@/lib/engines/paley_engine'
import styles from './PaleyHeightCalculator.module.css'

interface PaleyHeightResultDisplayProps {
  result: PaleyHeightResult
}

export default function PaleyHeightResultDisplay({ result }: PaleyHeightResultDisplayProps) {
  if (!result) return null

  // Calculate percentage for the bar chart
  const currentPercent = (result.current_height_cm / result.predicted_height_cm) * 100
  const remainingPercent = 100 - currentPercent

  return (
    <div className={styles.resultContainer}>
      
      {/* 1. Main Headline */}
      <div className={styles.mainResult}>
        <div className={styles.valueGroupColumn}>
            <span className={styles.labelSmall}>Predicted Maturity</span>
            <div className={styles.bigNumberRow}>
                <span className={styles.primaryValue}>{result.predicted_height_cm} <small>cm</small></span>
                <span className={styles.secondaryValue}>({formatImperial(result.predicted_height_cm)})</span>
            </div>
        </div>
      </div>

      {/* 2. Visual Growth Bar */}
      <div className={styles.growthContext}>
        <div className={styles.barLabels}>
           <span>Current: {result.current_height_cm}cm</span>
           <span>Growth Remaining: +{result.growth_remaining_cm}cm</span>
        </div>
        
        <div className={styles.growthBarContainer}>
           {/* Current Height (Solid Blue) */}
           <div 
             className={styles.growthBarCurrent} 
             style={{ width: `${currentPercent}%` }}
           ></div>
           
           {/* Remaining (Striped/Light Blue) */}
           <div 
             className={styles.growthBarRemaining} 
             style={{ width: `${remainingPercent}%` }}
           ></div>
        </div>
      </div>

      {/* 3. Metadata / Audit Trail */}
      <div className={styles.metaContainer}>
        <h5 className={styles.metaTitle}>Methodology: Paley Multiplier (Height)</h5>
        
        <div className={styles.metaGrid}>
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>Multiplier</span>
            <span className={styles.metaValue}>x{result.multiplier}</span>
          </div>
          <div className={styles.metaItem}>
             <span className={styles.metaLabel}>Age Used</span>
             <span className={styles.metaValue}>{result.age_used} yrs</span>
          </div>
          <div className={styles.metaItem}>
             <span className={styles.metaLabel}>Input Mode</span>
             <span className={styles.metaValue}>
                {result.is_bone_age ? 'Skeletal Age (Manual)' : 'Chronological (DOB)'}
             </span>
          </div>
        </div>
      </div>
    </div>
  )
}