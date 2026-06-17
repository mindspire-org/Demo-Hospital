// Prescription Urdu Translations Utility
// Uses Jameel Noori Nastaleeq font for printing

export type PrescriptionLanguage = 'english' | 'urdu'

// Common prescription labels in Urdu
export const PRESCRIPTION_LABELS = {
  english: {
    drug: 'Drug',
    frequency: 'Frequency',
    dosage: 'Dosage',
    duration: 'Duration',
    instruction: 'Instruction',
    route: 'Route',
    prescription: 'Prescription',
    medication: 'Medication',
    complaint: 'Complaint',
    diagnosis: 'Diagnosis / Disease',
    advice: 'Advice',
    examination: 'Examination',
    history: 'Medical History',
    familyHistory: 'Family History',
    allergyHistory: 'Allergy History',
    treatmentHistory: 'Treatment History',
    labTests: 'Lab Tests',
    diagnosticTests: 'Diagnostic Tests',
    nextFollowUp: 'Next Follow Up',
    patient: 'Patient',
    doctor: 'Doctor',
    qualification: 'Qualification',
    department: 'Department',
    phone: 'Phone',
    address: 'Address',
    date: 'Date',
    morning: 'Morning',
    noon: 'Noon',
    evening: 'Evening',
    night: 'Night',
    onceDaily: 'Once daily',
    twiceDaily: 'Twice daily',
    thriceDaily: 'Thrice daily',
    fourTimesDaily: 'Four times daily',
    beforeMeals: 'Before meals',
    afterMeals: 'After meals',
    withMeals: 'With meals',
    emptyStomach: 'Empty stomach',
    bedTime: 'Bed time',
  },
  urdu: {
    drug: 'دوا',
    frequency: 'فریکوئنسی',
    dosage: 'خوراک',
    duration: 'مدت',
    instruction: 'ہدایات',
    route: 'طریقہ استعمال',
    prescription: 'نسخہ',
    medication: 'ادویات',
    complaint: 'شکایت',
    diagnosis: 'تشخیص / بیماری',
    advice: 'تجاویز',
    examination: 'معائنہ',
    history: 'طبی تاریخ',
    familyHistory: 'خاندانی تاریخ',
    allergyHistory: 'الرجی کی تاریخ',
    treatmentHistory: 'علاج کی تاریخ',
    labTests: 'لیب ٹیسٹ',
    diagnosticTests: ' تشخیصی ٹیسٹ',
    nextFollowUp: 'اگلی ملاقات',
    patient: 'مریض',
    doctor: 'ڈاکٹر',
    qualification: 'قابلیت',
    department: 'شعبہ',
    phone: 'فون',
    address: 'پتہ',
    date: 'تاریخ',
    morning: 'صبح',
    noon: 'دوپہر',
    evening: 'شام',
    night: 'رات',
    onceDaily: 'دن میں ایک بار',
    twiceDaily: 'دن میں دو بار',
    thriceDaily: 'دن میں تین بار',
    fourTimesDaily: 'دن میں چار بار',
    beforeMeals: 'کھانے سے پہلے',
    afterMeals: 'کھانے کے بعد',
    withMeals: 'کھانے کے ساتھ',
    emptyStomach: 'خالی پیٹ',
    bedTime: 'سونے کے وقت',
  }
}

// Dose options with Urdu translations
export const DOSE_OPTIONS = {
  english: ['1 mg', '2 mg', '5 mg', '10 mg', '20 mg', '25 mg', '50 mg', '100 mg', '200 mg', '250 mg', '500 mg', '1 g', '1 ml', '2 ml', '5 ml', '10 ml', '1 tsp', '1 tbsp', '1 drop', '2 drops', '1 puff', '1 tablet', '2 tablets', '1 capsule', '1 sachet', '1 unit', '2 units', '5 units', '10 units', '15 units', '20 units', '1 unit morning', '2 units evening', '5 units night', '10 units morning', '4 units evening', 'half tablet', 'quarter tablet', 'three-quarter tablet', 'half tablet morning', 'half tablet night'],
  urdu: ['1 ملی گرام', '2 ملی گرام', '5 ملی گرام', '10 ملی گرام', '20 ملی گرام', '25 ملی گرام', '50 ملی گرام', '100 ملی گرام', '200 ملی گرام', '250 ملی گرام', '500 ملی گرام', '1 گرام', '1 ملی لیٹر', '2 ملی لیٹر', '5 ملی لیٹر', '10 ملی لیٹر', '1 چمچ', '1 بڑا چمچ', '1 قطرہ', '2 قطرے', '1 پف', '1 گولی', '2 گولیاں', '1 کیپسول', '1 ساشے', '1 یونٹ', '2 یونٹس', '5 یونٹس', '10 یونٹس', '15 یونٹس', '20 یونٹس', '1 یونٹ صبح', '2 یونٹس شام', '5 یونٹس رات', '10 یونٹس صبح', '4 یونٹس شام', 'آدھی گولی', 'ایک چوتھائی گولی', 'تین چوتھائی گولی', 'آدھی گولی صبح', 'آدھی گولی رات']
}

// Route options with Urdu translations
export const ROUTE_OPTIONS = {
  english: ['Oral', 'IV', 'IM', 'SC', 'Topical', 'Sublingual', 'Rectal', 'Vaginal', 'Inhalation', 'Nasal', 'Ocular', 'Ear drops', 'Local application'],
  urdu: ['منہ سے', 'ورید میں', 'پٹھوں میں', 'جلد کے نیچے', 'جلد پر', 'زیر زبان', 'مقعد', 'فرج', 'انہالیشن', 'ناک', 'آنکھ', 'کان کے قطرے', 'مقامی استعمال']
}

// Instruction options with Urdu translations
export const INSTRUCTION_OPTIONS = {
  english: ['Before meals', 'After meals', 'With meals', 'Empty stomach', 'Bed time', 'Morning', 'Night', 'Once daily', 'Twice daily', 'Thrice daily', 'Four times daily', 'Every 4 hours', 'Every 6 hours', 'Every 8 hours', 'Every 12 hours', 'SOS', 'PRN', 'Stat', 'As directed'],
  urdu: ['کھانے سے پہلے', 'کھانے کے بعد', 'کھانے کے ساتھ', 'خالی پیٹ', 'سونے کے وقت', 'صبح', 'رات', 'دن میں ایک بار', 'دن میں دو بار', 'دن میں تین بار', 'دن میں چار بار', 'ہر 4 گھنٹے بعد', 'ہر 6 گھنٹے بعد', 'ہر 8 گھنٹے بعد', 'ہر 12 گھنٹے بعد', 'ضرورت کے مطابق', 'ضرورت کے مطابق', 'فوری', 'ڈاکٹر کی ہدایت کے مطابق']
}

// Duration options with Urdu translations
export const DURATION_OPTIONS = {
  english: ['1 day', '2 days', '3 days', '5 days', '7 days', '10 days', '14 days', '1 week', '2 weeks', '3 weeks', '4 weeks', '1 month', '2 months', '3 months', '6 months'],
  urdu: ['1 دن', '2 دن', '3 دن', '5 دن', '7 دن', '10 دن', '14 دن', '1 ہفتہ', '2 ہفتے', '3 ہفتے', '4 ہفتے', '1 مہینہ', '2 مہینے', '3 مہینے', '6 مہینے']
}

// Frequency options with Urdu translations
export const FREQUENCY_OPTIONS = {
  english: ['Once daily (OD)', 'Twice daily (BD)', 'Thrice daily (TID)', 'Four times daily (QID)', 'Every morning', 'Every night', 'Every 4 hours', 'Every 6 hours', 'Every 8 hours', 'Every 12 hours', 'SOS', 'Stat', 'Alternate days', 'Weekly', 'Monthly', 'Morning', 'Noon', 'Evening', 'Night', 'Morning & Evening', 'Morning, Noon & Evening', 'Morning, Evening & Night', 'Noon & Evening', 'Morning & Night', 'Evening & Night'],
  urdu: ['دن میں ایک بار (OD)', 'دن میں دو بار (BD)', 'دن میں تین بار (TID)', 'دن میں چار بار (QID)', 'ہر صبح', 'ہر رات', 'ہر 4 گھنٹے', 'ہر 6 گھنٹے', 'ہر 8 گھنٹے', 'ہر 12 گھنٹے', 'ضرورت کے مطابق', 'فوری', 'ایک دن چھوڑ کر', 'ہفتہ وار', 'ماہانہ', 'صبح', 'دوپہر', 'شام', 'رات', 'صبح ، شام', 'صبح ، دوپہر ، شام', 'صبح ، شام ، رات', 'دوپہر ، شام', 'صبح اور رات', 'شام اور رات']
}

// Get options based on language
export function getPrescriptionOptions(language: PrescriptionLanguage) {
  return {
    dose: DOSE_OPTIONS[language],
    route: ROUTE_OPTIONS[language],
    instruction: INSTRUCTION_OPTIONS[language],
    duration: DURATION_OPTIONS[language],
    frequency: FREQUENCY_OPTIONS[language],
    labels: PRESCRIPTION_LABELS[language]
  }
}

// Get saved language preference
export function getSavedPrescriptionLanguage(doctorId?: string | null): PrescriptionLanguage {
  try {
    const k = `doctor.rx.language.${doctorId || 'anon'}`
    const raw = localStorage.getItem(k)
    if (raw === 'urdu') return 'urdu'
  } catch {}
  return 'english'
}

// Save language preference
export function savePrescriptionLanguage(language: PrescriptionLanguage, doctorId?: string | null) {
  try {
    const k = `doctor.rx.language.${doctorId || 'anon'}`
    localStorage.setItem(k, language)
  } catch {}
}

// Translate common terms for print
export function translateForPrint(text: string, language: PrescriptionLanguage): string {
  if (language === 'english') return text
  
  // Create a mapping from English to Urdu
  const translations: Record<string, string> = {
    // Frequencies
    'once a day': 'دن میں ایک بار',
    'twice a day': 'دن میں دو بار',
    'thrice a day': 'دن میں تین بار',
    'four times a day': 'دن میں چار بار',
    'morning': 'صبح',
    'night': 'رات',
    // Instructions
    'before meals': 'کھانے سے پہلے',
    'after meals': 'کھانے کے بعد',
    'with meals': 'کھانے کے ساتھ',
    'empty stomach': 'خالی پیٹ',
    'bed time': 'سونے کے وقت',
    // Routes
    'oral': 'منہ سے',
    'iv': 'ورید میں',
    'im': 'پٹھوں میں',
    'sc': 'جلد کے نیچے',
    'topical': 'جلد پر',
    'sublingual': 'زیر زبان',
    'rectal': 'مقعد',
    'vaginal': 'فرج',
    'inhalation': 'انہالیشن',
    'nasal': 'ناک',
    'ocular': 'آنکھ',
    'ear drops': 'کان کے قطرے',
    'local application': 'مقامی استعمال',
  }
  
  return translations[text.toLowerCase().trim()] || text
}

// ── translateRxItem ──────────────────────────────────────────────────────────
// Translates a single medicine row's variable fields to Urdu.
// Non-translatable values (e.g. custom free-text) are kept as-is so no data
// is lost. The medicine name is always kept in English.
export type RxItem = {
  name?: string
  frequency?: string
  duration?: string
  dose?: string
  instruction?: string
  route?: string
  notes?: string
  qty?: number | string
}

// Build a reverse lookup: English value → Urdu value for each category
function buildLookup(en: string[], ur: string[]): Map<string, string> {
  const m = new Map<string, string>()
  en.forEach((v, i) => { if (ur[i]) m.set(v.toLowerCase().trim(), ur[i]) })
  return m
}

const freqLookup  = buildLookup(FREQUENCY_OPTIONS.english,    FREQUENCY_OPTIONS.urdu)
const doseLookup  = buildLookup(DOSE_OPTIONS.english,         DOSE_OPTIONS.urdu)
const routeLookup = buildLookup(ROUTE_OPTIONS.english,        ROUTE_OPTIONS.urdu)
const instrLookup = buildLookup(INSTRUCTION_OPTIONS.english,  INSTRUCTION_OPTIONS.urdu)
const durLookup   = buildLookup(DURATION_OPTIONS.english,     DURATION_OPTIONS.urdu)

function lu(map: Map<string, string>, val: string | undefined): string {
  if (!val) return ''
  return map.get(val.toLowerCase().trim()) ?? val
}

export function translateRxItem(item: RxItem, language: PrescriptionLanguage): RxItem {
  if (language !== 'urdu') return item
  return {
    ...item,
    frequency:   lu(freqLookup,  item.frequency),
    dose:        lu(doseLookup,  item.dose),
    route:       lu(routeLookup, item.route),
    instruction: lu(instrLookup, item.instruction),
    duration:    lu(durLookup,   item.duration),
  }
}
