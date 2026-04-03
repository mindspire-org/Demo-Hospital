import { LabCounter } from '../modules/lab/models/Counter'
import { LabPatient } from '../modules/lab/models/Patient'
import { HospitalToken } from '../modules/hospital/models/Token'
import { HospitalSettings } from '../modules/hospital/models/Settings'

/**
 * Generate the next global MRN.
 * - Uses a single atomic counter: lab_counters._id = "mrn_global".
 * - Optional formatting via HospitalSettings.mrFormat.
 *   Supported tokens: {HOSP}, {DEPT}, {YEAR}/{YYYY}, {YY}, {MONTH}/{MM}, {SERIAL}, {SERIAL6} ...
 * - Since MRN is global, {DEPT} is normalized to 'HOSP' to keep MRNs consistent across modules.
 */
export async function nextGlobalMrn(): Promise<string> {
  // Atomic global counter
  const key = 'mrn_global'
  let c: any = await LabCounter.findByIdAndUpdate(
    key,
    { $inc: { seq: 1 } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  )

  // If counter was (re)created, align it with existing MRNs so we don't start from 1 again.
  if (c && Number(c.seq) === 1) {
    try {
      const [labPats, hospPats] = await Promise.all([
        LabPatient.find({ mrn: /^MR-\d+$/i }).select('mrn').lean(),
        HospitalToken.find({ mrn: /^MR-\d+$/i }).select('mrn').lean(),
      ])
      const all = [...(labPats || []), ...(hospPats || [])]
      const maxSeq = (all || []).reduce((mx: number, p: any) => {
        try {
          const s = String(p?.mrn || '')
          const n = parseInt(s.replace(/^MR-/i, ''), 10)
          return isNaN(n) ? mx : Math.max(mx, n)
        } catch {
          return mx
        }
      }, 0)
      if (maxSeq > 0) {
        c = await LabCounter.findOneAndUpdate({ _id: key, seq: 1 }, { $set: { seq: maxSeq + 1 } }, { new: true })
      }
    } catch {}
  }

  const seqNum = Number((c as any)?.seq || 1)

  // Load formatting preference
  let fmt = ''
  try {
    const s = await HospitalSettings.findOne().lean()
    fmt = String((s as any)?.mrnFormat || '').trim()
    // Normalize trivial patterns to avoid empty strings
  } catch {}

  function pad(n: number, w: number){ return String(n).padStart(w, '0') }
  function applyFormat(format: string, settings?: any){
    const now = new Date()
    const YYYY = String(now.getFullYear())
    const YY = YYYY.slice(-2)
    const MM = pad(now.getMonth() + 1, 2)
    const DD = pad(now.getDate(), 2)
    const hosp = String(settings?.code || '').trim()
    let s = format
    s = s.replace(/\{HOSP\}/gi, hosp || '')
    s = s.replace(/\{YEAR\}|\{YYYY\}/gi, YYYY)
    s = s.replace(/\{YY\}/g, YY)
    s = s.replace(/\{MONTH\}|\{MM\}/gi, MM)
    s = s.replace(/\{DD\}/g, DD)
    s = s.replace(/\{SERIAL6\}/gi, pad(seqNum, 6))
    s = s.replace(/\{SERIAL4\}/gi, pad(seqNum, 4))
    s = s.replace(/\{SERIAL3\}/gi, pad(seqNum, 3))
    s = s.replace(/\{SERIAL2\}/gi, pad(seqNum, 2))
    s = s.replace(/\{SERIAL\}/gi, String(seqNum))
    return s
  }

  if (fmt && /\{SERIAL/i.test(fmt)){
    const out = applyFormat(fmt, await HospitalSettings.findOne().lean())
    return out || `MR-${seqNum}`
  }

  const seq = String(seqNum)
  return `MR-${seq}`
}
