import { forwardRef, useImperativeHandle, useRef } from 'react'
import { fmtDateTime12 } from '../../utils/timeFormat'
import { getLocalDate } from '../../utils/date'

type GatePassData = {
  admissionNo: string
  mrn: string
  patientName: string
  age: string
  gender: string
  departmentName: string
  admittedAt: string
  dischargedAt: string
  hospitalName: string
  hospitalAddress: string
  hospitalPhone: string
  logo?: string
}

export type GatePassRef = {
  print: () => void
}

const GatePass = forwardRef<GatePassRef, { data: GatePassData }>((props, ref) => {
  const { data } = props
  const printRef = useRef<HTMLDivElement>(null)

  useImperativeHandle(ref, () => ({
    print: () => {
      const content = printRef.current
      if (!content) return
      
      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Gate Pass - ${data.patientName}</title>
            <style>
              @page { size: 105mm 148mm; margin: 0; }
              body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 10mm; color: #1e293b; line-height: 1.4; }
              .card { border: 2px solid #334155; border-radius: 12px; padding: 12px; height: calc(100% - 24px); position: relative; }
              .header { text-align: center; border-bottom: 2px solid #334155; padding-bottom: 10px; margin-bottom: 12px; }
              .logo { height: 40px; margin-bottom: 4px; }
              .hospital-name { font-size: 16px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; }
              .hospital-info { font-size: 10px; color: #64748b; }
              .title { font-size: 20px; font-weight: 900; margin: 8px 0; text-transform: uppercase; letter-spacing: 2px; color: #0f172a; }
              
              .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px; }
              .field { border-bottom: 1px dashed #cbd5e1; padding-bottom: 2px; }
              .label { font-size: 9px; font-weight: 700; text-transform: uppercase; color: #64748b; margin-bottom: 1px; }
              .value { font-size: 13px; font-weight: 700; color: #0f172a; }
              .full-width { grid-column: span 2; }
              
              .footer { border-top: 2px solid #334155; margin-top: auto; padding-top: 8px; display: flex; justify-content: space-between; align-items: flex-end; }
              .stamp-box { width: 80px; height: 40px; border: 1px solid #cbd5e1; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 8px; color: #94a3b8; text-transform: uppercase; font-weight: 700; }
              .signature { text-align: center; }
              .sig-line { width: 100px; border-top: 1px solid #334155; margin-top: 20px; }
              .sig-label { font-size: 9px; font-weight: 700; margin-top: 2px; }
              
              .copy-tag { position: absolute; bottom: 40px; right: -25px; transform: rotate(-90deg); font-size: 10px; font-weight: 900; text-transform: uppercase; color: #e2e8f0; letter-spacing: 4px; }
            </style>
          </head>
          <body>
            <div class="card">
              <div class="header">
                ${data.logo ? `<img src="${data.logo}" class="logo" />` : ''}
                <div class="hospital-name">${data.hospitalName}</div>
                <div class="hospital-info">${data.hospitalAddress} | ${data.hospitalPhone}</div>
                <div class="title">Gate Pass</div>
              </div>
              
              <div class="info-grid">
                <div class="field">
                  <div class="label">Computer No</div>
                  <div class="value">${data.admissionNo}</div>
                </div>
                <div class="field">
                  <div class="label">Date</div>
                  <div class="value">${getLocalDate()}</div>
                </div>
                <div class="field full-width">
                  <div class="label">Patient Name</div>
                  <div class="value">${data.patientName}</div>
                </div>
                <div class="field">
                  <div class="label">Age</div>
                  <div class="value">${data.age}</div>
                </div>
                <div class="field">
                  <div class="label">Gender</div>
                  <div class="value">${data.gender}</div>
                </div>
                <div class="field full-width">
                  <div class="label">Department</div>
                  <div class="value">${data.departmentName}</div>
                </div>
                <div class="field full-width">
                  <div class="label">Date of Admission</div>
                  <div class="value">${fmtDateTime12(data.admittedAt)}</div>
                </div>
                <div class="field full-width">
                  <div class="label">Date of Discharge</div>
                  <div class="value">${fmtDateTime12(data.dischargedAt)}</div>
                </div>
              </div>
              
              <div class="copy-tag">Office Copy</div>
              
              <div class="footer">
                <div class="stamp-box">Hospital Stamp</div>
                <div class="signature">
                  <div class="sig-line"></div>
                  <div class="sig-label">Authorized Sign</div>
                </div>
              </div>
            </div>
          </body>
        </html>
      `
      
      const printWindow = window.open('', '_blank')
      if (printWindow) {
        printWindow.document.write(html)
        printWindow.document.close()
        printWindow.onload = () => {
          printWindow.print()
          // printWindow.close() // Optional: auto-close after print
        }
      }
    }
  }))

  return (
    <div className="hidden">
      <div ref={printRef}>
        {/* Hidden UI for internal ref, print logic uses HTML string for better layout control */}
      </div>
    </div>
  )
})

export default GatePass
