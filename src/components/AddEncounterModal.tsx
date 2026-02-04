// src/components/AddEncounterModal.tsx
'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { X } from 'lucide-react'
import styles from './AddEncounterModal.module.css'

interface AddEncounterModalProps {
  patientId: string
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function AddEncounterModal({ patientId, isOpen, onClose, onSuccess }: AddEncounterModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Form State
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [type, setType] = useState('Consultation')
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()

    try {
      const { error: insertError } = await supabase
        .from('encounters')
        .insert([
          {
            patient_id: patientId,
            encounter_date: new Date(date).toISOString(),
            encounter_type: type,
            primary_encounter_reason: reason,
            notes: notes
          }
        ])

      if (insertError) throw insertError

      // Reset form
      setReason('')
      setNotes('')
      setType('Consultation')
      
      onSuccess()
      onClose()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2>New Encounter</h2>
            <button 
              onClick={onClose}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
            >
              <X size={24} color="#64748b" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="date">Encounter Date</label>
            <input
              type="date"
              id="date"
              required
              className={styles.input}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="type">Encounter Type</label>
            <select
              id="type"
              className={styles.select}
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <option value="Consultation">Initial Consultation</option>
              <option value="Follow-up">Follow-up Visit</option>
              <option value="Surgery">Surgery</option>
              <option value="Post-Op">Post-Op Check</option>
              <option value="Growth Check">Growth/Deformity Check</option>
            </select>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="reason">Primary Reason</label>
            <input
              type="text"
              id="reason"
              required
              placeholder="e.g. Right knee pain, LLD check..."
              className={styles.input}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="notes">Clinical Notes</label>
            <textarea
              id="notes"
              className={styles.textarea}
              placeholder="General observations, physical exam findings..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.actions}>
            <button type="button" onClick={onClose} className={styles.cancelButton}>
              Cancel
            </button>
            <button type="submit" disabled={loading} className={styles.submitButton}>
              {loading ? 'Creating...' : 'Create Encounter'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}