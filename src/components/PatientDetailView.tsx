'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Patient } from '@/types'
import { User, Activity } from 'lucide-react'
import styles from './PatientDetailView.module.css'

type Tab = 'overview' | 'clinical'

export default function PatientDetailView({ patientId }: { patientId: string }) {
  const supabase = createClient()
  const [patient, setPatient] = useState<Patient | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>('overview')

  useEffect(() => {
    const fetchData = async () => {
      const { data } = await supabase
        .from('patients')
        .select('*')
        .eq('id', patientId)
        .single()
      
      if (data) setPatient(data)
      setLoading(false)
    }
    fetchData()
  }, [patientId])

  if (loading) return <div className={styles.content}>Loading Record...</div>
  if (!patient) return <div className={styles.content}>Patient not found.</div>

  const patientAge = calculateAge(patient.date_of_birth)

  return (
    <div className={styles.container}>
      {/* 1. Header: Fixed Name Order (First Last) */}
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

      {/* 2. Tabs */}
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

      {/* 3. Content */}
      <div className={styles.content}>
        
        {activeTab === 'overview' && (
          <div>
            <h3 className={styles.sectionTitle}>Patient Details</h3>
            
            {/* Vertical Table Layout */}
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
                <button style={{ 
                  background: 'var(--primary)', color: 'white', border: 'none', 
                  padding: '8px 16px', borderRadius: '6px', fontSize: '0.9rem', cursor: 'pointer', fontWeight: 500
                }}>
                  + New Encounter
                </button>
             </div>

             <div className={styles.placeholderCard}>
                <Activity size={32} style={{ opacity: 0.3, marginBottom: '8px' }} />
                <p style={{ margin: 0, fontWeight: 500 }}>No clinical history found</p>
                <p style={{ margin: 0, fontSize: '0.85rem' }}>
                  Start a new examination or calculation.
                </p>
             </div>
          </div>
        )}

      </div>
    </div>
  )
}

// Helper Component for Table Rows
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