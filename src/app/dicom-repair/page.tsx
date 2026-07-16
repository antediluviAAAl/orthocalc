'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import DicomRepairWorkspace from '@/components/dicom/DicomRepairWorkspace'
import styles from '@/components/dicom/DicomRepair.module.css'

export default function DicomRepairPage() {
  const supabase = createClient()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [authenticated, setAuthenticated] = useState(false)

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/')
      } else {
        setAuthenticated(true)
        setLoading(false)
      }
    }
    checkAuth()
  }, [router, supabase])

  if (loading) {
    return (
      <main className={styles.container}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh', color: 'var(--primary)', fontWeight: 600 }}>
          Verifying credentials...
        </div>
      </main>
    )
  }

  if (!authenticated) {
    return null
  }

  return (
    <main className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <h1 className={styles.title}>DICOM Archive Doctor</h1>
          <p className={styles.subtitle}>Unwrap and repair ZIP-compressed medical scan files client-side</p>
        </div>
        <Link href="/" className={styles.backLink}>
          <ArrowLeft size={16} />
          Back to Dashboard
        </Link>
      </div>

      <DicomRepairWorkspace />
    </main>
  )
}
