'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { X, CheckCircle2, AlertCircle } from 'lucide-react'
import { validateAndExtractCNP, ROMANIAN_COUNTIES } from '@/lib/cnp'
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
  
  const [cnpStatus, setCnpStatus] = useState<{
    isValid: boolean
    message?: string
  }>({ isValid: false })

  // Initialize form with defaults (county defaults to first in list)
  const [formData, setFormData] = useState({
    first_name: '',
    family_name: '',
    cnp: '',
    date_of_birth: '',
    gender: 'Male',
    county: ROMANIAN_COUNTIES[0] 
  })

  if (!isOpen) return null

  // --- SMART CNP HANDLER ---
  const handleCnpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newCnp = e.target.value
    
    // 1. Update text immediately
    setFormData(prev => ({ ...prev, cnp: newCnp }))

    if (!newCnp) {
      setCnpStatus({ isValid: false })
      return
    }

    // 2. Validate when length is exactly 13
    if (newCnp.length === 13) {
      const result = validateAndExtractCNP(newCnp)
      
      if (result.isValid) {
        setCnpStatus({ isValid: true, message: 'Valid CNP' })
        
        // AUTO-FILL
        setFormData(prev => ({
          ...prev,
          cnp: newCnp,
          gender: result.gender || prev.gender,
          date_of_birth: result.dateOfBirth || prev.date_of_birth,
          county: result.county || prev.county
        }))
      } else {
        setCnpStatus({ isValid: false, message: result.error })
      }
    } else {
      setCnpStatus({ isValid: false }) 
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // Strict CNP Validation on Save
    if (formData.cnp && formData.cnp.length > 0) {
       if (formData.cnp.length !== 13) {
          setError("CNP must be exactly 13 digits if provided.")
          setLoading(false)
          return
       }
       if (!cnpStatus.isValid) {
          setError("Cannot save patient with invalid CNP.")
          setLoading(false)
          return
       }
    }

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
          gender: formData.gender,
          county: formData.county
        }
      ])

    if (insertError) {
      setError(insertError.message)
      setLoading(false)
    } else {
      setLoading(false)
      onSuccess()
      onClose()
      // Reset Form
      setFormData({
        first_name: '', 
        family_name: '', 
        cnp: '', 
        date_of_birth: '', 
        gender: 'Male', 
        county: ROMANIAN_COUNTIES[0]
      })
      setCnpStatus({ isValid: false })
    }
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
              <div className={styles.inputWrapper}>
                <input 
                  name="cnp" 
                  placeholder="13 digits" 
                  value={formData.cnp} 
                  onChange={handleCnpChange}
                  maxLength={13}
                  style={{
                    borderColor: cnpStatus.message 
                      ? (cnpStatus.isValid ? '#16a34a' : '#dc2626') 
                      : 'var(--border)'
                  }}
                />
                {cnpStatus.message && (
                  <div className={styles.validationIcon}>
                    {cnpStatus.isValid ? (
                      <CheckCircle2 size={18} color="#16a34a" />
                    ) : (
                      <AlertCircle size={18} color="#dc2626" />
                    )}
                  </div>
                )}
              </div>
              {cnpStatus.message && (
                <span className={`${styles.validationMsg} ${cnpStatus.isValid ? styles.success : ''}`}>
                  {cnpStatus.message}
                </span>
              )}
            </div>
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <label>Date of Birth</label>
              <input 
                type="date" 
                name="date_of_birth" 
                value={formData.date_of_birth} 
                onChange={handleChange} 
              />
            </div>
            <div className={styles.field}>
              <label>Gender</label>
              <select name="gender" value={formData.gender} onChange={handleChange}>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>
          </div>

          <div className={styles.row}>
             <div className={styles.field}>
              <label>County (Județ)</label>
              <select 
                name="county" 
                value={formData.county} 
                onChange={handleChange}
              >
                {/* No placeholder here, defaults to first item */}
                {ROMANIAN_COUNTIES.map((county) => (
                  <option key={county} value={county}>
                    {county}
                  </option>
                ))}
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