'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Patient } from '@/types'
import AddPatientModal from '@/components/patients/AddPatientModal'
import HistoryTimelineModal from '@/components/history/HistoryTimelineModal'
import Link from 'next/link'
import { Trash2, Pencil, BookOpenText, Plus, ArchiveRestore } from 'lucide-react'
import { ThemeToggle } from '@/components/theme/ThemeToggle'
import { useModal } from '@/lib/context/ModalContext'
import styles from './page.module.css'

export default function Home() {
  const supabase = createClient()
  const [user, setUser] = useState<any>(null)
  const [patients, setPatients] = useState<Patient[]>([])
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const { openAddPatientModal, refreshTrigger } = useModal()
  
  // Login Form State
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState<string | null>(null)

  useEffect(() => {
    checkUser()
  }, [refreshTrigger])

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)
    if (user) {
      fetchPatients(user.id)
    } else {
      setLoading(false)
    }
  }

  const fetchPatients = async (userId: string) => {
    const { data } = await supabase
      .from('patients')
      .select('*')
      .eq('doctor_id', userId)
      .order('created_at', { ascending: false })
    
    if (data) setPatients(data)
    setLoading(false)
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthError(null)
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setAuthError(error.message)
    else checkUser()
  }

  const handleSignUp = async () => {
    setAuthError(null)
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) setAuthError(error.message)
    else setAuthError('Check your email for the confirmation link!')
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setPatients([])
  }

  const handleDeletePatient = async (e: React.MouseEvent, patientId: string) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!confirm('Are you sure you want to delete this patient and all their clinical history?')) {
      return
    }

    const { error } = await supabase
      .from('patients')
      .delete()
      .eq('id', patientId)

    if (error) {
      alert('Error deleting patient: ' + error.message)
    } else {
      setPatients(prev => prev.filter(p => p.id !== patientId))
    }
  }

  const handleEditPatient = (e: React.MouseEvent, patient: Patient) => {
    e.preventDefault()
    e.stopPropagation()
    openAddPatientModal(patient)
  }

  if (loading) return <div className={styles.loading}>Loading System...</div>

  // --- VIEW 1: LOGIN SCREEN ---
  if (!user) {
    return (
      <main className={styles.loginContainer}>
        <div className={styles.loginCard}>
          <h1 className={styles.loginTitle}>OrthoCalc Access</h1>
          <p className={styles.loginSubtitle}>Secure Orthopedic Data System</p>
          
          {authError && <div className={styles.error}>{authError}</div>}
          
          <form onSubmit={handleLogin} className={styles.loginForm}>
            <input 
              type="email" 
              placeholder="Email Address" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              className={styles.input}
              required
            />
            <input 
              type="password" 
              placeholder="Password" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              className={styles.input}
              required
            />
            <div className={styles.authButtons}>
              <button type="submit" className={styles.primaryBtn}>Log In</button>
              <button type="button" onClick={handleSignUp} className={styles.secondaryBtn}>Sign Up</button>
            </div>
          </form>
        </div>
      </main>
    )
  }

  // --- VIEW 2: DASHBOARD ---
  return (
    <main className={styles.main}>
      <header className={styles.contentHeader}>
        <div className={styles.titleGroup}>
          <h1 className={styles.pageTitle}>Patient List</h1>
        </div>
        <div className={styles.actions}>
          <Link
            href="/dicom-repair"
            className={styles.repairBtn}
            title="DICOM Scan Repair"
          >
            <ArchiveRestore size={18} />
            <span>Repair DICOM</span>
          </Link>
          <button 
            onClick={() => setIsHistoryModalOpen(true)} 
            className={styles.historyBtnIcon}
            title="View Clinical Journal"
          >
            <BookOpenText size={20} />
          </button>
          <button 
            onClick={() => openAddPatientModal()} 
            className={styles.addBtn}
          >
            <Plus size={18} />
            <span>Add Patient</span>
          </button>
        </div>
      </header>

      <div className={styles.content}>
        {patients.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No patients found.</p>
            <button onClick={() => openAddPatientModal()}>Add your first patient</button>
          </div>
        ) : (
          <div className={styles.grid}>
            {patients.map((patient) => (
              <Link href={`/patient/${patient.id}`} key={patient.id} className={styles.cardLink}>
                <div className={styles.card}>
                  <div className={styles.cardHeader}>
                    <div className={styles.nameGroup}>
                      <h3>{patient.family_name}, {patient.first_name}</h3>
                      <span className={styles.genderBadge}>{patient.gender === 'Male' ? 'M' : 'F'}</span>
                    </div>
                    <div className={styles.cardActions}>
                      <button 
                        className={styles.editBtn}
                        onClick={(e) => handleEditPatient(e, patient)}
                        title="Edit Patient"
                      >
                        <Pencil size={16} />
                      </button>
                      <button 
                        className={styles.deleteBtn}
                        onClick={(e) => handleDeletePatient(e, patient.id)}
                        title="Delete Patient"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  <div className={styles.cardBody}>
                    <p><strong>CNP:</strong> {patient.cnp || 'N/A'}</p>
                    <p><strong>DOB:</strong> {patient.date_of_birth || 'N/A'}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <HistoryTimelineModal 
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
      />
    </main>
  )
}