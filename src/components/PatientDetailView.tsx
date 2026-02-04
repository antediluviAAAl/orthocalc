// src/components/PatientDetailView.tsx
'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Patient, Encounter } from '@/types'
import { User, Activity, Calendar, Plus, ChevronRight } from 'lucide-react'
import AddEncounterModal from './AddEncounterModal'
import EncounterDetailModal from './EncounterDetailModal'
import styles from './PatientDetailView.module.css'

type Tab = 'overview' | 'clinical'

export default function PatientDetailView({ patientId }: { patientId: string }) {
  const [patient, setPatient] = useState<Patient | null>(null)
  const [encounters, setEncounters] = useState<Encounter[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  
  // Modal States
  const [isEncounterModalOpen, setIsEncounterModalOpen] = useState(false)
  const [selectedEncounter, setSelectedEncounter] = useState<Encounter | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const supabase = createClient()
      
      const { data: patientData, error: patientError } = await supabase
        .from('patients')
        .select('*')
        .eq('id', patientId)
        .single()
      
      if (patientError) throw patientError
      setPatient(patientData)

      const { data: encounterData, error: encounterError } = await supabase
        .from('encounters')
        .select('*')
        .eq('patient_id', patientId)
        .order('encounter_date', { ascending: false })

      if (encounterError) throw encounterError
      setEncounters(encounterData || [])

    } catch (err) {
      console.error('Error fetching data:', err)
    } finally {
      setLoading(false)
    }
  }, [patientId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  if (loading) return <div className={styles.content}>Loading Record...</div>
  if (!patient) return <div className={styles.content}>Patient not found.</div>

  const patientAge = calculateAge(patient.date_of_birth)

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.avatarPlaceholder}>
            <User size={32} strokeWidth={2} />
          </div>
          <div>
            <h2 className={styles.name}>
              {patient.first_name} {patient.family_name}
            </h2>
          </div>
        </div>
      </div>

      <div className={styles.tabs}>
        <button 
          className={`${styles.tabBtn} ${activeTab === 'overview' ? styles.active : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button 
          className={`${styles.tabBtn} ${activeTab === 'clinical' ? styles.active : ''}`}
          onClick={() => setActiveTab('clinical')}
        >
          Clinical
        </button>
      </div>

      <div className={styles.content}>
        
        {activeTab === 'overview' && (
          <div>
            <h3 className={styles.sectionTitle}>Patient Details</h3>
            <div className={styles.detailsContainer}>
              <DetailRow label="Date of Birth" value={patient.date_of_birth || 'N/A'} />
              <DetailRow label="Age" value={patientAge !== '?' ? `${patientAge} years` : '?'} />
              <DetailRow label="Gender" value={patient.gender || 'Unknown'} />
              <DetailRow label="CNP" value={patient.cnp || 'N/A'} />
            </div>
          </div>
        )}

        {activeTab === 'clinical' && (
          <div>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 className={styles.sectionTitle} style={{ margin: 0 }}>Active History</h3>
                <button 
                  onClick={() => setIsEncounterModalOpen(true)}
                  style={{ 
                    background: 'var(--primary)', color: 'white', border: 'none', 
                    padding: '8px 16px', borderRadius: '6px', fontSize: '0.9rem', cursor: 'pointer', fontWeight: 500,
                    display: 'flex', alignItems: 'center', gap: '8px'
                  }}
                >
                  <Plus size={16} />
                  New Encounter
                </button>
             </div>

             {encounters.length === 0 ? (
               <div className={styles.placeholderCard}>
                  <Activity size={32} style={{ opacity: 0.3, marginBottom: '8px' }} />
                  <p style={{ margin: 0, fontWeight: 500 }}>No clinical history found</p>
                  <p style={{ margin: 0, fontSize: '0.85rem' }}>
                    Start a new examination or calculation.
                  </p>
               </div>
             ) : (
               <div className={styles.historyList}>
                 {encounters.map((encounter) => (
                    <div 
                      key={encounter.id} 
                      className={styles.encounterCard}
                      onClick={() => setSelectedEncounter(encounter)}
                      style={{ cursor: 'pointer' }}
                    >
                      <div className={styles.encounterHeader}>
                        <div className={styles.encounterType}>
                          <Calendar size={16} />
                          <span>{new Date(encounter.encounter_date).toLocaleDateString()}</span>
                          <span className={styles.typeTag}>{encounter.encounter_type}</span>
                        </div>
                        <ChevronRight size={16} color="#94a3b8" />
                      </div>
                      <div className={styles.encounterBody}>
                        <h4>{encounter.primary_encounter_reason}</h4>
                        {encounter.notes && (
                          <p className={styles.notes}>{encounter.notes}</p>
                        )}
                      </div>
                    </div>
                 ))}
               </div>
             )}
          </div>
        )}

      </div>

      {/* Modals */}
      <AddEncounterModal
        patientId={patient.id}
        isOpen={isEncounterModalOpen}
        onClose={() => setIsEncounterModalOpen(false)}
        onSuccess={fetchData}
      />

      <EncounterDetailModal 
        encounter={selectedEncounter}
        patient={patient} // <--- Critical: Passing patient data
        isOpen={!!selectedEncounter}
        onClose={() => setSelectedEncounter(null)}
      />
    </div>
  )
}

function DetailRow({ label, value }: { label: string, value: string }) {
  return (
    <div className={styles.detailRow}>
      <span className={styles.detailLabel}>{label}</span>
      <span className={styles.detailValue}>{value}</span>
    </div>
  )
}

function calculateAge(dob: string | null) {
  if (!dob) return '?'
  const birthDate = new Date(dob)
  const diff = Date.now() - birthDate.getTime()
  const ageDate = new Date(diff)
  return Math.abs(ageDate.getUTCFullYear() - 1970)
}