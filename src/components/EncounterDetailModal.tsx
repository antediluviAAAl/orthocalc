// src/components/EncounterDetailModal.tsx
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Encounter, Observation, Patient } from '@/types'
import { X, Plus, Calculator } from 'lucide-react'
import BMICalculator from './BMICalculator'
import styles from './EncounterDetailModal.module.css'

interface EncounterDetailModalProps {
  encounter: Encounter | null
  patient: Patient | null // <--- Added Patient Prop
  isOpen: boolean
  onClose: () => void
}

export default function EncounterDetailModal({ encounter, patient, isOpen, onClose }: EncounterDetailModalProps) {
  const [observations, setObservations] = useState<Observation[]>([])
  const [isAdding, setIsAdding] = useState(false)
  const [selectedCalc, setSelectedCalc] = useState('bmi')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (encounter && isOpen) {
      fetchObservations()
      setIsAdding(false)
    }
  }, [encounter, isOpen])

  const fetchObservations = async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('observations')
      .select('*')
      .eq('encounter_id', encounter?.id)
      .order('observation_date', { ascending: false })
    
    if (data) setObservations(data)
  }

  const handleSaveObservation = async (data: { inputs: any, results: any, calculation_type: string }) => {
    if (!encounter) return
    setLoading(true)
    
    const supabase = createClient()
    const { error } = await supabase.from('observations').insert([
      {
        encounter_id: encounter.id,
        calculation_type: data.calculation_type,
        inputs: data.inputs,
        results: data.results
      }
    ])

    if (!error) {
      await fetchObservations()
      setIsAdding(false)
    }
    setLoading(false)
  }

  if (!isOpen || !encounter) return null

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className={styles.header}>
          <div>
            <h2>{encounter.primary_encounter_reason}</h2>
            <div className={styles.meta}>
              <span>{new Date(encounter.encounter_date).toLocaleDateString()}</span>
              <span>•</span>
              <span>{encounter.encounter_type}</span>
            </div>
          </div>
          <button onClick={onClose} className={styles.closeBtn}>
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div className={styles.body}>
          
          <div className={styles.sectionHeader}>
            <h3>Clinical Observations</h3>
            {!isAdding && (
              <button onClick={() => setIsAdding(true)} className={styles.addBtn}>
                <Plus size={16} />
                Add Calculation
              </button>
            )}
          </div>

          {/* ADD MODE */}
          {isAdding && (
            <div style={{ marginBottom: '2rem' }}>
              <div className={styles.calcSelector}>
                <select 
                  className={styles.select}
                  value={selectedCalc}
                  onChange={(e) => setSelectedCalc(e.target.value)}
                >
                  <option value="bmi">Body Mass Index (BMI)</option>
                  <option value="paley" disabled>Paley Multiplier (Phase 2.1)</option>
                </select>
              </div>

              {selectedCalc === 'bmi' && patient && (
                <BMICalculator 
                  dob={patient.date_of_birth} // Passing Demographics
                  gender={patient.gender}
                  onSave={handleSaveObservation}
                  onCancel={() => setIsAdding(false)}
                />
              )}
            </div>
          )}

          {/* LIST MODE */}
          <div className={styles.observationList}>
            {observations.length === 0 && !isAdding ? (
              <p className={styles.emptyState}>No calculations recorded for this visit.</p>
            ) : (
              observations.map(obs => (
                <div key={obs.id} className={styles.observationCard}>
                  <div className={styles.obsInfo}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                       <Calculator size={16} color="#3b82f6"/>
                       <h4>{obs.calculation_type === 'bmi' ? 'Body Mass Index' : obs.calculation_type}</h4>
                    </div>
                    {obs.calculation_type === 'bmi' && (
                      <p className={styles.obsResult}>
                        BMI: <strong>{obs.results.bmi}</strong> • {obs.results.category}
                        {obs.results.percentile && ` • ${obs.results.percentile}th %`}
                      </p>
                    )}
                  </div>
                  <span className={styles.obsDate}>
                    {new Date(obs.observation_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </span>
                </div>
              ))
            )}
          </div>

        </div>
      </div>
    </div>
  )
}