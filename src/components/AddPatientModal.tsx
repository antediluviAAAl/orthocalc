'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { X } from 'lucide-react'
import styles from './AddPatientModal.module.css'

type AddPatientModalProps = {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function AddPatientModal({ isOpen, onClose, onSuccess }: AddPatientModalProps) {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    first_name: '',
    family_name: '',
    cnp: '',
    date_of_birth: '',
    gender: 'Male'
  })

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      setError("User not authenticated")
      setLoading(false)
      return
    }

    const { error: insertError } = await supabase
      .from('patients')
      .insert([
        {
          doctor_id: user.id,
          first_name: formData.first_name,
          family_name: formData.family_name,
          cnp: formData.cnp,
          date_of_birth: formData.date_of_birth,
          gender: formData.gender
        }
      ])

    if (insertError) {
      setError(insertError.message)
      setLoading(false)
    } else {
      setLoading(false)
      onSuccess()
      onClose()
      setFormData({
        first_name: '', family_name: '', cnp: '', date_of_birth: '', gender: 'Male'
      })
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        
        <div className={styles.header}>
          <h2>New Patient</h2>
          <button onClick={onClose} className={styles.closeBtn}>
            <X size={20} />
          </button>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.row}>
            <div className={styles.field}>
              <label>First Name</label>
              <input name="first_name" required value={formData.first_name} onChange={handleChange} />
            </div>
            <div className={styles.field}>
              <label>Last Name</label>
              <input name="family_name" required value={formData.family_name} onChange={handleChange} />
            </div>
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <label>CNP</label>
              <input name="cnp" placeholder="13 digits" value={formData.cnp} onChange={handleChange} />
            </div>
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <label>Date of Birth</label>
              <input type="date" name="date_of_birth" value={formData.date_of_birth} onChange={handleChange} />
            </div>
            <div className={styles.field}>
              <label>Gender</label>
              <select name="gender" value={formData.gender} onChange={handleChange}>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>
          </div>

          <button type="submit" disabled={loading} className={styles.submitBtn}>
            {loading ? 'Saving...' : 'Add Patient'}
          </button>
        </form>
      </div>
    </div>
  )
}