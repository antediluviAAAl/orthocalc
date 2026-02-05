// src/components/encounters/EncounterDetailModal.tsx
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Encounter, Observation, Patient } from '@/types'
import { BmiResult } from '@/lib/engines/bmi_engine'
import { PaleyHeightResult } from '@/lib/engines/paley_engine' // <--- IMPORT THIS
import { X, Plus, Calculator, ChevronDown, ChevronUp, Trash2 } from 'lucide-react'
import BMICalculator from '../calculators/BMICalculator'
import BMIResultDisplay from '../calculators/BMIResultDisplay'
import PaleyHeightCalculator from '../calculators/PaleyHeightCalculator' // <--- IMPORT THIS
import PaleyHeightResultDisplay from '../calculators/PaleyHeightResultDisplay' // <--- IMPORT THIS
import styles from './EncounterDetailModal.module.css'

interface EncounterDetailModalProps {
  encounter: Encounter | null
  patient: Patient | null 
  isOpen: boolean
  onClose: () => void
}

export default function EncounterDetailModal({ encounter, patient, isOpen, onClose }: EncounterDetailModalProps) {
  const [observations, setObservations] = useState<Observation[]>([])
  const [isAdding, setIsAdding] = useState(false)
  const [selectedCalc, setSelectedCalc] = useState('bmi')
  const [loading, setLoading] = useState(false)
  const [expandedObs, setExpandedObs] = useState<string | null>(null)

  useEffect(() => {
    if (encounter && isOpen) {
      fetchObservations()
      setIsAdding(false)
      setExpandedObs(null)
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

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation() 
    if (!confirm('Are you sure you want to delete this calculation?')) return

    const supabase = createClient()
    const { error } = await supabase.from('observations').delete().eq('id', id)

    if (!error) {
      setObservations(prev => prev.filter(o => o.id !== id))
      if (expandedObs === id) setExpandedObs(null)
    }
  }

  const toggleExpand = (id: string) => {
    setExpandedObs(prev => prev === id ? null : id)
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
            <div className={styles.addModeContainer}>
              <div className={styles.calcSelector}>
                <select 
                  className={styles.select}
                  value={selectedCalc}
                  onChange={(e) => setSelectedCalc(e.target.value)}
                >
                  <option value="bmi">Body Mass Index (BMI)</option>
                  <option value="paley_height">Paley Adult Height Prediction</option>
                </select>
              </div>

              {selectedCalc === 'bmi' && patient && (
                <BMICalculator 
                  dob={patient.date_of_birth} 
                  gender={patient.gender}
                  referenceDate={encounter.encounter_date}
                  onSave={handleSaveObservation}
                  onCancel={() => setIsAdding(false)}
                />
              )}

              {/* NEW: PALEY HEIGHT CALCULATOR */}
              {selectedCalc === 'paley_height' && patient && (
                <PaleyHeightCalculator
                  dob={patient.date_of_birth}
                  gender={patient.gender}
                  referenceDate={encounter.encounter_date}
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
              observations.map(obs => {
                const isExpanded = expandedObs === obs.id
                // Helper to get friendly title
                const getTitle = (type: string | null) => {
                    if (type === 'bmi') return 'Body Mass Index'
                    if (type === 'paley_height') return 'Adult Height Prediction'
                    return type
                }

                return (
                  <div 
                    key={obs.id} 
                    className={`${styles.observationCard} ${isExpanded ? styles.expanded : ''}`}
                    onClick={() => toggleExpand(obs.id)}
                  >
                    {/* Header Row */}
                    <div className={styles.obsHeader}>
                      <div className={styles.obsLeftGroup}>
                         <div className={styles.iconBox}>
                           <Calculator size={18} />
                         </div>
                         <div className={styles.obsTextGroup}>
                            <h4 className={styles.obsTitle}>{getTitle(obs.calculation_type)}</h4>
                            
                            <div className={styles.obsSummary}>
                              {/* BMI SUMMARY */}
                              {obs.calculation_type === 'bmi' && (
                                <>
                                  <span className={styles.summaryValue}>{obs.results.bmi}</span>
                                  <span className={styles.summaryDot}>•</span>
                                  <span className={styles.summaryCategory}>{obs.results.category}</span>
                                </>
                              )}
                              
                              {/* PALEY HEIGHT SUMMARY (NEW) */}
                              {obs.calculation_type === 'paley_height' && (
                                <>
                                  <span className={styles.summaryCategory}>Pred:</span>
                                  <span className={styles.summaryValue}>{obs.results.predicted_height_cm}cm</span>
                                  <span className={styles.summaryDot}>•</span>
                                  <span className={styles.summaryCategory}>Growth Left: {obs.results.growth_remaining_cm}cm</span>
                                </>
                              )}
                            </div>
                         </div>
                      </div>
                      
                      <div className={styles.obsRightGroup}>
                        <span className={styles.obsDate}>
                          {new Date(obs.observation_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </span>
                        
                        <button 
                          className={styles.deleteBtn}
                          onClick={(e) => handleDelete(obs.id, e)}
                          title="Delete Calculation"
                        >
                          <Trash2 size={16} />
                        </button>

                        <div className={styles.chevron}>
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </div>
                      </div>
                    </div>

                    {/* Expanded Content */}
                    {isExpanded && (
                      <div className={styles.obsBody} onClick={e => e.stopPropagation()}>
                         {obs.calculation_type === 'bmi' && (
                            <BMIResultDisplay 
                              result={obs.results as BmiResult} 
                              inputs={obs.inputs} 
                            />
                         )}
                         {obs.calculation_type === 'paley_height' && (
                            <PaleyHeightResultDisplay 
                              result={obs.results as PaleyHeightResult} 
                            />
                         )}
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>

        </div>
      </div>
    </div>
  )
}