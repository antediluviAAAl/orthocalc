// src/lib/cnp.ts

export type CNPData = {
  isValid: boolean
  gender?: 'Male' | 'Female'
  dateOfBirth?: string // YYYY-MM-DD
  county?: string
  error?: string
}

const CONTROL_KEY = [2, 7, 9, 1, 4, 6, 3, 5, 8, 2, 7, 9]

const COUNTY_MAP: Record<string, string> = {
  '01': 'Alba', '02': 'Arad', '03': 'Argeș', '04': 'Bacău', '05': 'Bihor',
  '06': 'Bistrița-Năsăud', '07': 'Botoșani', '08': 'Brașov', '09': 'Brăila', '10': 'Buzău',
  '11': 'Caraș-Severin', '12': 'Cluj', '13': 'Constanța', '14': 'Covasna', '15': 'Dâmbovița',
  '16': 'Dolj', '17': 'Galați', '18': 'Gorj', '19': 'Harghita', '20': 'Hunedoara',
  '21': 'Ialomița', '22': 'Iași', '23': 'Ilfov', '24': 'Maramureș', '25': 'Mehedinți',
  '26': 'Mureș', '27': 'Neamț', '28': 'Olt', '29': 'Prahova', '30': 'Satu Mare',
  '31': 'Sălaj', '32': 'Sibiu', '33': 'Suceava', '34': 'Teleorman', '35': 'Timiș',
  '36': 'Tulcea', '37': 'Vaslui', '38': 'Vâlcea', '39': 'Vrancea', '40': 'București',
  '41': 'București - Sector 1', '42': 'București - Sector 2', '43': 'București - Sector 3', 
  '44': 'București - Sector 4', '45': 'București - Sector 5', '46': 'București - Sector 6',
  '51': 'Călărași', '52': 'Giurgiu', 
  '70': 'Rezident/Evidență Specială' 
}

// Export a sorted list of unique county names for the UI Dropdown
export const ROMANIAN_COUNTIES = Array.from(new Set(Object.values(COUNTY_MAP))).sort((a, b) => a.localeCompare(b))

export function validateAndExtractCNP(cnp: string): CNPData {
  // 1. Basic Format Check
  if (!/^\d{13}$/.test(cnp)) {
    return { isValid: false, error: 'CNP must be exactly 13 digits.' }
  }

  // 2. Checksum Calculation
  const digits = cnp.split('').map(Number)
  const hashSum = digits.slice(0, 12).reduce((sum, digit, i) => {
    return sum + digit * CONTROL_KEY[i]
  }, 0)

  let controlDigit = hashSum % 11
  if (controlDigit === 10) controlDigit = 1

  if (controlDigit !== digits[12]) {
    return { isValid: false, error: 'Invalid checksum (control digit mismatch).' }
  }

  // 3. Extract Metadata
  const s = digits[0]
  const aa = digits[1] * 10 + digits[2]
  const ll = digits[3] * 10 + digits[4]
  const zz = digits[5] * 10 + digits[6]
  const jj = cnp.substring(7, 9) // County Code

  // Validate Date
  if (ll < 1 || ll > 12 || zz < 1 || zz > 31) {
    return { isValid: false, error: 'Invalid birth date in CNP.' }
  }

  // Determine Century & Gender
  let century = 0
  let gender: 'Male' | 'Female' = 'Male'

  switch (s) {
    case 1: century = 1900; gender = 'Male'; break;
    case 2: century = 1900; gender = 'Female'; break;
    case 3: century = 1800; gender = 'Male'; break;
    case 4: century = 1800; gender = 'Female'; break;
    case 5: century = 2000; gender = 'Male'; break;
    case 6: century = 2000; gender = 'Female'; break;
    case 7: century = 1900; gender = 'Male'; break;
    case 8: century = 1900; gender = 'Female'; break;
    default: return { isValid: false, error: 'Invalid Gender/Century component.' }
  }

  const fullYear = century + aa
  const pad = (n: number) => n.toString().padStart(2, '0')
  const dateOfBirth = `${fullYear}-${pad(ll)}-${pad(zz)}`

  // Map County
  const countyName = COUNTY_MAP[jj] || 'Unknown/Other'

  return {
    isValid: true,
    gender,
    dateOfBirth,
    county: countyName
  }
}