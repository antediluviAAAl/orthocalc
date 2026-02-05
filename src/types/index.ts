// src/types/index.ts

export interface Patient {
  id: string
  created_at: string
  doctor_id: string
  first_name: string
  family_name: string
  cnp: string | null
  date_of_birth: string | null
  gender: string | null
  county: string | null // Added new field
}

export interface Encounter {
  id: string
  patient_id: string
  encounter_date: string
  encounter_type: string | null
  primary_encounter_reason: string | null
  notes: string | null
}

export interface Observation {
  id: string
  encounter_id: string
  calculation_type: string | null
  // JSONB columns in SQL allow flexible typing
  inputs: Record<string, any>
  results: Record<string, any>
  observation_date: string
}