
export type HospitalBrand = {
  hospitalName?: string
  hospitalLogo?: string
  hospitalAddress?: string
  hospitalPhone?: string
  hospitalEmail?: string
}

function readBrand(): HospitalBrand {
  try {
    const info = JSON.parse(localStorage.getItem('hospitalInfo') || '{}')
    return {
      hospitalName: info.name || localStorage.getItem('hospitalName') || '',
      hospitalLogo: info.logoUrl || localStorage.getItem('hospitalLogo') || '',
      hospitalAddress: info.address || localStorage.getItem('hospitalAddress') || '',
      hospitalPhone: info.phone || localStorage.getItem('hospitalPhone') || '',
      hospitalEmail: info.email || localStorage.getItem('hospitalEmail') || '',
    }
  } catch {
    return {
      hospitalName: localStorage.getItem('hospitalName') || '',
      hospitalLogo: localStorage.getItem('hospitalLogo') || '',
      hospitalAddress: localStorage.getItem('hospitalAddress') || '',
      hospitalPhone: localStorage.getItem('hospitalPhone') || '',
      hospitalEmail: localStorage.getItem('hospitalEmail') || '',
    }
  }
}

export default function Hospital_PrintHeader({ brand }: { brand?: Partial<HospitalBrand> }) {
  const b = { ...readBrand(), ...(brand || {}) }
  return (
    <div style={{ display: 'flex', alignItems: 'center', paddingBottom: 8, marginBottom: 10, borderBottom: '1px solid #bae6fd', position: 'relative' }}>
      {b.hospitalLogo ? (
        <img src={b.hospitalLogo} alt="Logo" style={{ width: 64, height: 64, objectFit: 'contain', border: '1px solid #bae6fd', borderRadius: 8, marginRight: 16 }} onError={(e)=>{ (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
      ) : null}
      <div style={{ flex: 1, textAlign: 'center', marginRight: b.hospitalLogo ? 80 : 0 }}>
        <div style={{ fontWeight: 900, textTransform: 'uppercase', letterSpacing: .3, fontSize: 22, lineHeight: 1.1, color: '#1d4ed8' }}>{b.hospitalName || 'Hospital'}</div>
        {b.hospitalAddress ? (<div style={{ color: '#475569', fontSize: 13, marginTop: 2 }}>{b.hospitalAddress}</div>) : null}
        {b.hospitalPhone ? (<div style={{ color: '#475569', fontSize: 13 }}>Tel: {b.hospitalPhone}</div>) : null}
        {b.hospitalEmail ? (<div style={{ color: '#475569', fontSize: 13 }}>E-mail: {b.hospitalEmail}</div>) : null}
      </div>
    </div>
  )
}
