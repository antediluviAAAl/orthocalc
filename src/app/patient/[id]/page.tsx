'use client'

import PatientDetailView from '@/components/patients/PatientDetailView'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function PatientPage({ params }: { params: { id: string } }) {
  return (
    <main style={{ maxWidth: '1000px', margin: '0 auto', padding: '40px 20px' }}>
      <Link 
        href="/" 
        style={{ 
          display: 'inline-flex', 
          alignItems: 'center', 
          gap: '8px', 
          marginBottom: '24px',
          color: 'var(--foreground)',
          textDecoration: 'none',
          opacity: 0.7
        }}
      >
        <ArrowLeft size={18} />
        Back to Dashboard
      </Link>
      
      <div style={{ 
        backgroundColor: 'var(--surface)', 
        border: '1px solid var(--border)',
        borderRadius: '12px',
        padding: '32px'
      }}>
        <PatientDetailView patientId={params.id} />
      </div>
    </main>
  )
}