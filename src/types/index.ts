export type Patient = {
  id: string
  created_at: string
  doctor_id: string
  first_name: string
  family_name: string
  cnp: string | null
  date_of_birth: string | null
  gender: string | null
}

export type Encounter = {
  id: string
  patient_id: string
  encounter_date: string
  encounter_type: string | null
  primary_encounter_reason: string | null
  notes: string | null
}

export type Observation = {
  id: string
  created_at: string
  encounter_id: string
  code: string | null
  input_data: any // JSONB data
  result_data: any // JSONB data
  interpretation: string | null
}