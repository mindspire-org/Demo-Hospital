import { useEffect, useState } from 'react'
import { hospitalApi } from '../../../utils/api'
import { type EncounterDefaults } from '../../../hooks/useEncounterDefaults'
import { baseURL } from '../../../api/client'

type Props = {
  defaults: EncounterDefaults
  title: string
}

type HospitalBrand = {
  hospitalName?: string
  hospitalLogo?: string
  hospitalAddress?: string
  hospitalPhone?: string
  hospitalEmail?: string
}

function resolveLogo(url?: string) {
  if (!url) return ''
  if (/^https?:/i.test(url)) return url
  if (/^data:/i.test(url)) return url
  try {
    const urlObj = new URL(baseURL)
    const origin = urlObj.origin
    const cleanUrl = url.startsWith('/') ? url : `/${url}`
    return `${origin}${cleanUrl}`
  } catch {
    const cleanBase = baseURL.replace(/\/api\/?$/, '')
    const cleanUrl = url.startsWith('/') ? url : `/${url}`
    return `${cleanBase}${cleanUrl}`
  }
}

function readBrand(): HospitalBrand {
  try {
    const info = JSON.parse(localStorage.getItem('hospitalInfo') || '{}')
    return {
      hospitalName: info.name || localStorage.getItem('hospitalName') || '',
      hospitalLogo: resolveLogo(info.logoUrl || info.logo || localStorage.getItem('hospitalLogo') || ''),
      hospitalAddress: info.address || localStorage.getItem('hospitalAddress') || '',
      hospitalPhone: info.phone || localStorage.getItem('hospitalPhone') || '',
      hospitalEmail: info.email || localStorage.getItem('hospitalEmail') || '',
    }
  } catch {
    return {
      hospitalName: localStorage.getItem('hospitalName') || '',
      hospitalLogo: resolveLogo(localStorage.getItem('hospitalLogo') || ''),
      hospitalAddress: localStorage.getItem('hospitalAddress') || '',
      hospitalPhone: localStorage.getItem('hospitalPhone') || '',
      hospitalEmail: localStorage.getItem('hospitalEmail') || '',
    }
  }
}

export default function IpdTabPrintHeader({ defaults, title }: Props) {
  const [settings, setSettings] = useState<any>(null)
  const baseBrand = readBrand()
  const brand = { 
    ...baseBrand, 
    ...(settings ? {
      hospitalName: settings.name || baseBrand.hospitalName,
      hospitalAddress: settings.address || baseBrand.hospitalAddress,
      hospitalPhone: settings.phone || baseBrand.hospitalPhone,
      hospitalEmail: settings.email || baseBrand.hospitalEmail,
      hospitalLogo: resolveLogo(settings.logoUrl || settings.logo) || baseBrand.hospitalLogo,
    } : {}) 
  }

  useEffect(() => {
    hospitalApi.getSettings().then(setSettings).catch(() => {})
  }, [])

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @page {
          margin: 15mm 10mm;
        }
        @media print {
          button, .btn, .btn-primary, .btn-secondary, .btn-outline-navy, .print\\:hidden {
            display: none !important;
          }
          .print-header-grid {
            border: 1px solid #cbd5e1 !important;
            border-collapse: collapse !important;
            width: 100% !important;
          }
          .print-header-grid td {
            border: 1px solid #cbd5e1 !important;
            padding: 4px 8px !important;
          }
          .print-label { 
            font-weight: 700 !important; 
            color: #1e293b !important;
            background-color: #f8fafc !important;
            width: 120px !important;
          }
          .print-value { 
            color: #334155 !important;
          }
          
          .break-after-page {
            page-break-after: always !important;
            break-after: page !important;
          }
          
          /* Hide navigation/tab containers if they contain only buttons */
          .flex.flex-wrap.gap-1 { display: none !important; }
          .flex.gap-1 { display: none !important; }
          
          /* Reset card styles for print */
          .bg-white.rounded-xl.border.border-slate-200 {
            border: none !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            background: transparent !important;
          }
          .p-4 { padding: 0 !important; }
          
          /* Multi-page spacing */
          body { padding: 0 !important; margin: 0 !important; }
          .print-container { padding: 0 !important; }
        }
      `}} />
      
      {/* Hospital Header (Exact match to Print Record) */}
      <div style={{ display: 'flex', alignItems: 'center', paddingBottom: 8, marginBottom: 10, borderBottom: '1px solid #bae6fd', position: 'relative' }}>
        {brand.hospitalLogo && (
          <img 
            src={brand.hospitalLogo} 
            alt="Logo" 
            style={{ width: 64, height: 64, objectFit: 'contain', border: '1px solid #bae6fd', borderRadius: 8, marginRight: 16 }} 
            onError={(e) => (e.currentTarget.style.display = 'none')}
          />
        )}
        <div style={{ flex: 1, textAlign: 'center', marginRight: brand.hospitalLogo ? 80 : 0 }}>
          <div style={{ fontWeight: 900, textTransform: 'uppercase', letterSpacing: .3, fontSize: 22, lineHeight: 1.1, color: '#1d4ed8' }}>
            {brand.hospitalName || 'Hospital'}
          </div>
          {brand.hospitalAddress && <div style={{ color: '#475569', fontSize: 13, marginTop: 2 }}>{brand.hospitalAddress}</div>}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 16, color: '#475569', fontSize: 13 }}>
            {brand.hospitalPhone && <div>Tel: {brand.hospitalPhone}</div>}
            {brand.hospitalEmail && <div>E-mail: {brand.hospitalEmail}</div>}
          </div>
        </div>
      </div>

      {/* Blue Bar Title */}
      <div style={{ backgroundColor: '#1e40af', color: 'white', textAlign: 'center', padding: '8px 0', fontWeight: 'bold', fontSize: 16, textTransform: 'uppercase', marginBottom: 16 }}>
        {title}
      </div>

      {/* Patient Info Grid (Exact match to Print Record grid) */}
      <table className="print-header-grid mb-6 text-[13px]">
        <tbody>
          <tr>
            <td className="print-label">Admission #</td>
            <td className="print-value">{defaults.encounter?.admissionNo || '-'}</td>
            <td className="print-label">MRN</td>
            <td className="print-value">{defaults.mrn || '-'}</td>
            <td className="print-label">Patient</td>
            <td className="print-value uppercase">{defaults.patientName || '-'}</td>
          </tr>
          <tr>
            <td className="print-label">Age</td>
            <td className="print-value">{defaults.age || '-'}</td>
            <td className="print-label">Gender</td>
            <td className="print-value">{defaults.gender || '-'}</td>
            <td className="print-label">Phone</td>
            <td className="print-value">{defaults.contact || '-'}</td>
          </tr>
          <tr>
            <td className="print-label">Doctor</td>
            <td className="print-value">{defaults.doctorName || '-'}</td>
            <td className="print-label">Department</td>
            <td className="print-value">IPD</td>
            <td className="print-label">Bed Information</td>
            <td className="print-value">{defaults.bedLabel || '-'}</td>
          </tr>
          <tr>
            <td className="print-label">Admitted</td>
            <td className="print-value">{defaults.doa || '-'}</td>
            <td className="print-label">Status</td>
            <td className="print-value" colSpan={3}>admitted</td>
          </tr>
        </tbody>
      </table>
    </>
  )
}
