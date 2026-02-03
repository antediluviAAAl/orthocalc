'use client'

import { useRouter } from 'next/navigation'
import PatientDetailView from '@/components/PatientDetailView'
import { X } from 'lucide-react'

export default function InterceptedPatientModal({ params }: { params: { id: string } }) {
  const router = useRouter()

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100,
      animation: 'fadeIn 0.2s ease-out'
    }}>
      {/* Modal Content */}
      <div style={{
        backgroundColor: 'var(--surface)',
        width: '100%',
        maxWidth: '800px',
        maxHeight: '90vh',
        borderRadius: '12px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Modal Header Bar */}
        <div style={{
          padding: '16px 24px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: 'var(--surface)'
        }}>
          <span style={{ fontWeight: 500, opacity: 0.5 }}>Quick View</span>
          <button 
            onClick={() => router.back()}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div style={{ padding: '24px', overflowY: 'auto' }}>
          <PatientDetailView patientId={params.id} />
        </div>
      </div>
    </div>
  )
}