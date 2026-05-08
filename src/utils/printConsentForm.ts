import { hospitalApi } from './api'

type ConsentPrintData = {
  patientName?: string
  address?: string
  doa?: string
  dod?: string
  bedLabel?: string
  regNo?: string
  mrn?: string
  ref?: string
  age?: string
  gender?: string
  doctorName?: string
  panel?: string
  cnic?: string
  contact?: string

  fatherName?: string
  guardianRel?: string
  guardianName?: string
  relation?: string

  patientOrGuardianName?: string
  patientRelation?: string
  patientTelephone?: string
  patientAddress?: string
  patientCnic?: string

  doctorOnDutyName?: string
  doctorOnDutyDesignation?: string
  doctorOnDutySign?: string
  nurseOnDutyName?: string
  nurseOnDutyDesignation?: string

  staffName?: string
  sign?: string
  date?: string
  time?: string
}

function esc(s?: string){
  return (s||'')
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
}

export async function printConsentForm(data: ConsentPrintData){
  const s: any = await hospitalApi.getSettings().catch(()=>({}))
  const hospitalName = String(s?.name || 'Hospital')
  const hospitalAddress = String(s?.address || '')
  const hospitalPhone = String(s?.phone || '')
  const hospitalLogo = String(s?.logoDataUrl || '')
  const hospitalFooter = String(s?.slipFooter || '')

  const patientName = String(data?.patientName || '-')
  const address = String(data?.address || '')
  const mrn = String(data?.mrn || '-')
  const bedLabel = String(data?.bedLabel || '-')
  const regNo = String(data?.regNo || '')
  const ref = String(data?.ref || '')
  const doa = String(data?.doa || '')
  const dod = String(data?.dod || '')
  const age = String(data?.age || '')
  const gender = String(data?.gender || '')
  const doctorName = String(data?.doctorName || '')
  const panel = String(data?.panel || '')
  const cnic = String(data?.cnic || '')
  const contact = String(data?.contact || '')

  const guardianName = String(data?.guardianName || '')
  const relation = String(data?.relation || data?.guardianRel || '')
  const patientOrGuardianName = String(data?.patientOrGuardianName || guardianName || '')
  const patientRelation = String(data?.patientRelation || relation || '')
  const patientTelephone = String(data?.patientTelephone || contact || '')
  const patientAddress = String(data?.patientAddress || address || '')
  const patientCnic = String(data?.patientCnic || cnic || '')

  const doctorOnDutyName = String(data?.doctorOnDutyName || data?.staffName || '')
  const doctorOnDutyDesignation = String(data?.doctorOnDutyDesignation || '')
  const doctorOnDutySign = String(data?.doctorOnDutySign || data?.sign || '')
  const nurseOnDutyName = String(data?.nurseOnDutyName || '')
  const nurseOnDutyDesignation = String(data?.nurseOnDutyDesignation || '')
  const date = String(data?.date || '')
  const time = String(data?.time || '')

  const old = document.getElementById('consent-print-overlay')
  if (old) old.remove()
  const overlay = document.createElement('div')
  overlay.id = 'consent-print-overlay'
  overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;padding:16px;'

  const html = `
  <style>
    :root { --cf-blue: #0284c7; --cf-blue-50: #e0f2fe; --cf-slate-50: #f8fafc; --cf-border: #cbd5e1; --cf-muted: #64748b; }
    *{ box-sizing:border-box; }
    @page { size: A4; margin: 5mm; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }

      /* Print ONLY the consent overlay, not the whole app (avoid blank pages from hidden layout) */
      body > *:not(#consent-print-overlay) { display: none !important; }
      #consent-print-overlay, #consent-print-overlay * { visibility: visible !important; }
      #consent-print-overlay { position: static !important; inset: auto !important; background: transparent !important; padding: 0 !important; }

      #consent-print-sheet {
        width: auto !important;
        max-height: none !important;
        overflow: visible !important;
        border-radius: 0 !important;
        box-shadow: none !important;
        padding: 0 !important;
        margin: 0 !important;
      }
      #cf-actions { display: none !important; }

      /* Keep footer readable but don't force extra page */
      #cf-footer { margin-top: 2mm !important; }

      .cf-avoid-break { break-inside: avoid !important; page-break-inside: avoid !important; }
    }

    .cf-avoid-break { break-inside: avoid; page-break-inside: avoid; }
    .cf-title { font-size: 14px; font-weight: 900; letter-spacing: 0.3px; }
    .cf-subtitle { font-size: 10px; opacity: 0.95; margin-top: 1px; }
    .cf-card { border: 1px solid var(--cf-border); border-radius: 8px; overflow: hidden; background: #fff; }
    .cf-card-h { background: linear-gradient(90deg, var(--cf-blue) 0%, #0ea5e9 100%); color: #fff; padding: 6px 10px; text-align: center; }
    .cf-card-b { padding: 4px 6px; border-top: 1px solid var(--cf-border); }
    .cf-section-h { background: var(--cf-blue-50); padding: 4px 6px; font-size: 10px; font-weight: 900; color: #0f172a; border-bottom: 1px solid var(--cf-border); }
    .cf-urdu { direction: rtl; font-family: Jameel Noori Nastaleeq, Noto Nastaliq Urdu, serif; color: #0f172a; }
    .cf-urdu-body { font-size: 11.5px; line-height: 1.6; }
    .cf-urdu-h { font-size: 13px; font-weight: 900; margin: 0 0 3px; }
    .cf-kv { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 3px 6px; font-size: 10px; color: #0f172a; }
  </style>
  <div id="consent-print-sheet" style="position:relative;width:210mm;max-height:90vh;overflow-y:auto;background:white;border-radius:12px;box-shadow:0 25px 50px -12px rgba(0,0,0,0.25);padding:18px;">
    <div id="cf-actions" style="display:flex;justify-content:flex-end;gap:8px;margin-bottom:12px;">
      <button id="cf-print-btn" style="cursor:pointer;border:1px solid #0284c7;background:#0284c7;color:white;padding:6px 16px;border-radius:8px;font-size:13px;font-weight:700;">Print</button>
      <button id="cf-close-btn" style="cursor:pointer;border:1px solid #cbd5e1;background:white;color:#334155;padding:6px 16px;border-radius:8px;font-size:13px;font-weight:600;">Close</button>
    </div>
    <div id="cf-content" class="cf-urdu">
      <div class="cf-card cf-avoid-break">
        <div class="cf-card-h" style="padding:6px 10px;">
          <div style="display:grid;grid-template-columns:40px 1fr 40px;align-items:center;gap:6px;">
            <div style="display:flex;align-items:center;justify-content:flex-start;">
              ${hospitalLogo ? `<img src="${esc(hospitalLogo)}" alt="logo" style="height:32px;width:32px;border-radius:6px;border:1px solid rgba(255,255,255,0.3);object-fit:contain;background:#fff;" />` : ''}
            </div>
            <div style="text-align:center;">
              <div class="cf-title">${esc(hospitalName)}</div>
              <div class="cf-subtitle">IPD Consent Form</div>
            </div>
            <div></div>
          </div>
        </div>
        <div class="cf-card-b" style="text-align:center;padding:3px 6px 4px;">
          ${hospitalAddress ? `<div style="font-size:10px;color:#475569;font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;direction:ltr;">${esc(hospitalAddress)}</div>` : ''}
          ${hospitalPhone ? `<div style="font-size:10px;color:#475569;font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;direction:ltr;">Phone: ${esc(hospitalPhone)}</div>` : ''}
        </div>
      </div>

      <div class="cf-card cf-avoid-break" style="margin-top:6px;direction:ltr;font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;">
        <div class="cf-section-h">Patient Information</div>
        <div style="padding:6px;">
          <div class="cf-kv">
            <div><b>Name:</b> ${esc(patientName)}</div>
            <div><b>Age/Sex:</b> ${esc(age)}${gender ? ` ${esc(gender)}` : ''}</div>
            <div><b>Bed:</b> ${esc(bedLabel)}</div>
            <div><b>MR #:</b> ${esc(mrn)}</div>
            <div><b>DOA:</b> ${esc(doa)}</div>
            <div><b>DOD:</b> ${esc(dod)}</div>
            <div><b>Doctor:</b> ${esc(doctorName)}</div>
            <div><b>Panel:</b> ${esc(panel)}</div>
            <div><b>NIC:</b> ${esc(cnic)}</div>
            <div style="grid-column:1 / -1"><b>Address:</b> ${esc(address)}</div>
            <div><b>Reg No:</b> ${esc(regNo)}</div>
            <div><b>Ref:</b> ${esc(ref)}</div>
            <div><b>Mob:</b> ${esc(contact)}</div>
          </div>
        </div>
      </div>

      <div class="cf-urdu-body">
        <div class="cf-urdu-h" style="margin-top:6px;">اجازت نامہ برائے علاج:</div>
        <div>
          <div style="margin:0 0 6px;">میں/ہم آپ کے ہسپتال میں اپنے مریض کے علاج کی اجازت دیتا/دیتی ہوں۔</div>
          <div style="margin:0 0 6px;">شعبہ انتہائی نگہداشت (سی سی یو/آئی سی یو) کے تمام مریض کسی بھی بیماری کی شدت کی وجہ سے انتہائی خطرناک (Serious) حالت ہونے کی وجہ سے ہسپتال میں داخل ہوتے ہیں۔ ہسپتال کا عملہ اور موجود تمام ڈاکٹرز اپنی تمام تر کوشش مریض کو بچانے میں لگا دیتے ہیں ہم یہ جانتے ہیں کہ زندگی اور موت اللہ کے اختیار میں ہیں۔ ڈاکٹرز اور عملہ مریض کی جان بچانے کیلئے اپنی پوری کوشش کریں گے۔ سپیشلسٹ ڈاکٹرز اپنے مقررہ اوقات میں مریض کا معائنہ کرتے ہیں۔ ان کی موجودگی چوبیس گھنٹے کیلئے نہیں ہوتی کچھ سپیشلسٹ ڈاکٹرز کو دوسرے ہسپتالوں سے ان کی سہولت کے مطابق ضرورت پڑنے پر بلایا جاتا ہے۔</div>
          <div style="margin:0 0 8px;">میں اپنے پورے ہوش و حواس میں ڈاکٹرز اور تمام عملہ کو یہ اجازت دیتا/دیتی ہوں کہ وہ مریض کے حق میں جو بہتر سمجھیں کر سکتے ہیں اور ونٹی لیٹر یا CVP Line/TPM کا استعمال کر سکتے ہیں۔ مجھے یہ سمجھ ہے کہ میرا مریض بہت سیریس ہے اور اس کی موت بھی واقع ہو سکتی ہے لہذا ہم ہر قسم کی خبر سننے کیلئے تیار ہیں اور میں تمام معلومات جو مریض کے علاج معالجے کیلئے ہونگی اور اس سے پہلے جو بھی علاج کروایا ہوگا اور اس کے متعلق ٹھیک ٹھیک بتاؤں گا/گی۔</div>

          <div class="cf-urdu-h" style="margin:8px 0 3px;">اخراجات کی ادائیگی کی ضمانت:</div>
          <div style="margin:0 0 8px;">مجھے اس بات کی سمجھ ہے کہ پرائیویٹ ہسپتال کا علاج بہت مہنگا ہے جس کیلئے میں تمام اخراجات ادا کرنے کیلئے تیار ہوں اور مریض کے ہسپتال میں داخلے کے وقت جمع کراؤں گا/گی۔ اس کے علاوہ اخراجات کا فائنل بل مریض کے ڈسچارج/انتقال پر ہوگا۔ میں ہسپتال کی اس پالیسی سے آگاہ ہوں کہ اگر خدانخواستہ مریض کی موت واقع ہو جاتی ہے تو ایڈوانس فیس میں سے جو بھی اخراجات ہوئے ہوں گے اس کی واپسی نہیں ہو گی ہسپتال کے تمام اخراجات جو دوسری طرف لکھے ہیں اچھی طرح پڑھ لئے ہیں۔ اگر کسی صورت میں طے شدہ اخراجات تجاوز کرتے ہیں تو اس کی وضاحت مریض اور اس کے لواحقین کو کر دی جاتی ہے۔ آپریشن کی صورت میں اخراجات سرجن سے پہلے طے کروں گا/گی۔</div>

          <div class="cf-urdu-h" style="margin:8px 0 3px;">قیمتی اشیاء سامان کی حفاظت:</div>
          <div style="margin:0 0 8px;">میں یہ جانتا/جانتی ہوں کہ چیمہ ہارٹ کمپلیکس اینڈ جنرل ہسپتال کی سیکورٹی کا عملہ میرے مریض اور لواحقین کے پیسوں/زیورات/سامان اور قیمتی اشیاء کا ذمہ دار نہیں ہوگا۔</div>

          <div class="cf-urdu-h" style="margin:8px 0 3px;">اصول وضوابط:</div>
          <div style="margin:0;">ہم اپنے تمام مریضوں اور ان کے لواحقین کے ساتھ بہت عزت سے پیش آتے ہیں اور یہی ہم ان سے بھی چاہتے ہیں کہ وہ بھی مہذب طریقے کا مظاہرہ کریں۔ اگر کوئی شخص گالم گلوچ، جھگڑا، سٹاف کے ساتھ بدتمیزی کرے گا یا ہسپتال کے اصولوں کو توڑا گیا تو ہم حق رکھتے ہیں کہ مریض کو علاج کیلئے کسی اور جگہ منتقل اور پولیس کو شکایت کر دیں۔ نقصان کا ازالہ بھی لواحقین کو پورا کرنا ہوگا۔</div>
          <div style="margin:6px 0 0;">میں حلفاً بیان کرتا/کرتی ہوں کہ میں ہسپتال کے تمام اصولوں کی پیروی کروں گا/گی۔ اور اگر کوئی شکایت ہوئی تو میں ہسپتال کے ایڈمنسٹریٹر سے رابطہ کروں گا/گی۔ ہسپتال کی پالیسی کے مطابق ہسپتال کے اندر میڈیا کے کسی بھی نمائندے کی اجازت اور نہ ہی ویڈیو یا تصویر بنانے کی اجازت ہوگی۔</div>
        </div>
      </div>

      <div class="cf-avoid-break" style="margin-top:8px;border:1px solid #cbd5e1;border-radius:8px;overflow:hidden;">
        <div style="background:#f8fafc;padding:4px 6px;font-size:10px;font-weight:900;color:#0f172a;border-bottom:1px solid #cbd5e1;">Signature / Thumb</div>
        <div style="padding:6px;">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 10px;font-size:11px;direction:rtl;text-align:right;">
            <div><b>مریض یا لواحقین کا نام:</b> <span style="display:inline-block;min-width:160px;border-bottom:1px solid #94a3b8;">${esc(patientOrGuardianName) || '&nbsp;'}</span></div>
            <div><b>مریض سے رشتہ:</b> <span style="display:inline-block;min-width:160px;border-bottom:1px solid #94a3b8;">${esc(patientRelation) || '&nbsp;'}</span></div>
            <div><b>ٹیلی فون نمبر:</b> <span style="display:inline-block;min-width:160px;border-bottom:1px solid #94a3b8;">${esc(patientTelephone) || '&nbsp;'}</span></div>
            <div><b>شناختی کارڈ نمبر:</b> <span style="display:inline-block;min-width:160px;border-bottom:1px solid #94a3b8;">${esc(patientCnic) || '&nbsp;'}</span></div>
            <div style="grid-column:1 / -1"><b>مکمل پتہ:</b> <span style="display:inline-block;min-width:400px;border-bottom:1px solid #94a3b8;">${esc(patientAddress) || '&nbsp;'}</span></div>
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px;direction:ltr;font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;">
            <div style="border:1px solid #cbd5e1;border-radius:8px;padding:6px;min-height:52px;">
              <div style="font-size:10px;font-weight:800;color:#0f172a;margin-bottom:4px;">Signature Patient</div>
              <div style="height:24px;border:1px dashed #cbd5e1;border-radius:6px;"></div>
            </div>
            <div style="border:1px solid #cbd5e1;border-radius:8px;padding:6px;min-height:52px;">
              <div style="font-size:10px;font-weight:800;color:#0f172a;margin-bottom:4px;">Thumb Print</div>
              <div style="height:24px;border:1px dashed #cbd5e1;border-radius:6px;"></div>
            </div>
          </div>

          <div style="margin-top:8px;border-top:1px solid #cbd5e1;padding-top:6px;">
            <table style="width:100%;font-size:10px;border-collapse:collapse;direction:ltr;font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;">
              <tr>
                <td style="border:1px solid #cbd5e1;padding:4px 6px;vertical-align:top;font-weight:800;width:24%;">Sign. & Stamp Dr. On Duty:</td>
                <td style="border:1px solid #cbd5e1;padding:4px 6px;vertical-align:top;">${esc(doctorOnDutyName)}</td>
                <td style="border:1px solid #cbd5e1;padding:4px 6px;vertical-align:top;font-weight:800;width:80px;">Sign:</td>
                <td style="border:1px solid #cbd5e1;padding:4px 6px;vertical-align:top;">${esc(doctorOnDutySign)}</td>
              </tr>
              <tr>
                <td style="border:1px solid #cbd5e1;padding:4px 6px;vertical-align:top;font-weight:800;">Designation:</td>
                <td style="border:1px solid #cbd5e1;padding:4px 6px;vertical-align:top;">${esc(doctorOnDutyDesignation)}</td>
                <td style="border:1px solid #cbd5e1;padding:4px 6px;vertical-align:top;font-weight:800;">Date/Time:</td>
                <td style="border:1px solid #cbd5e1;padding:4px 6px;vertical-align:top;">${esc(date)} ${time ? ` ${esc(time)}` : ''}</td>
              </tr>
              <tr>
                <td style="border:1px solid #cbd5e1;padding:4px 6px;vertical-align:top;font-weight:800;">Staff/Male Nurse on Duty:</td>
                <td style="border:1px solid #cbd5e1;padding:4px 6px;vertical-align:top;">${esc(nurseOnDutyName)}</td>
                <td style="border:1px solid #cbd5e1;padding:4px 6px;vertical-align:top;font-weight:800;">Designation:</td>
                <td style="border:1px solid #cbd5e1;padding:4px 6px;vertical-align:top;">${esc(nurseOnDutyDesignation)}</td>
              </tr>
            </table>
          </div>
        </div>
      </div>
    </div>
    <div id="cf-footer" style="margin-top:4px;border-top:1px solid #e2e8f0;padding-top:4px;direction:ltr;font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#64748b;font-size:9px;display:flex;justify-content:space-between;gap:12px;">
      <div>${esc(hospitalFooter || hospitalName)}${hospitalAddress ? ` | ${esc(hospitalAddress)}` : ''}</div>
      <div>${hospitalPhone ? `Phone: ${esc(hospitalPhone)}` : ''} • Generated: ${new Date().toLocaleString()}</div>
    </div>
  </div>`

  overlay.innerHTML = html
  document.body.appendChild(overlay)

  const onClose = ()=> {
    try { document.removeEventListener('keydown', onKey); overlay.remove() } catch {}
  }
  const onPrint = ()=> {
    const btns = document.getElementById('cf-actions') as HTMLElement | null
    if (btns) btns.style.display = 'none'
    try { window.print() } catch {}
    setTimeout(()=>{ if (btns) btns.style.display = 'flex' }, 500)
  }
  const onKey = (e: KeyboardEvent)=> {
    if ((e.ctrlKey||e.metaKey) && (e.key==='d' || e.key==='D')) { e.preventDefault(); onClose() }
    if ((e.ctrlKey||e.metaKey) && (e.key==='p' || e.key==='P')) { /* allow print */ }
    if (e.key === 'Escape') onClose()
  }

  document.getElementById('cf-close-btn')?.addEventListener('click', onClose)
  document.getElementById('cf-print-btn')?.addEventListener('click', onPrint)
  document.addEventListener('keydown', onKey)
}

export async function printIcuConsentForm(data: {
  patientName?: string
  address?: string
  doa?: string
  bedLabel?: string
  mrn?: string
  age?: string
  gender?: string
  doctorName?: string
  panel?: string
  cnic?: string
  contact?: string
  guardianName?: string
  relation?: string
  witnessName?: string
  date?: string
  time?: string
}){
  const s: any = await hospitalApi.getSettings().catch(()=>({}))
  const hospitalName = String(s?.name || 'Hospital')
  const hospitalAddress = String(s?.address || '')
  const hospitalPhone = String(s?.phone || '')
  const hospitalLogo = String(s?.logoDataUrl || '')
  const hospitalFooter = String(s?.slipFooter || '')

  const overlayId = 'icu-consent-print-overlay'
  const old = document.getElementById(overlayId)
  if (old) old.remove()

  const overlay = document.createElement('div')
  overlay.id = overlayId
  overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;padding:16px;'

  const html = `
  <style>
    *{ box-sizing:border-box; }
    @page { size: A4; margin: 5mm; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      body > *:not(#${overlayId}) { display: none !important; }
      #${overlayId}, #${overlayId} * { visibility: visible !important; }
      #${overlayId} { position: static !important; inset: auto !important; background: transparent !important; padding: 0 !important; }
      #icu-consent-sheet { width: auto !important; max-height: none !important; overflow: visible !important; border-radius: 0 !important; box-shadow: none !important; padding: 0 !important; margin: 0 !important; }
      #icu-actions { display: none !important; }
      .icu-avoid-break { break-inside: avoid !important; page-break-inside: avoid !important; }
      #icu-footer { margin-top: 2mm !important; }
    }
    .icu-avoid-break { break-inside: avoid; page-break-inside: avoid; }
    .icu-box { border: 1px solid #0f172a; border-radius: 8px; overflow: hidden; }
    .icu-box-h { background:#0f172a; color:#fff; padding:6px 10px; font-size:13px; font-weight:900; text-align:center; }
    .icu-box-b { padding:8px 10px; font-size:11.5px; line-height:1.6; text-align:right; }
    .icu-sig-grid { display:grid; grid-template-columns:1fr 1fr 1fr; gap:4px; padding:6px 10px; border-top:1px solid #cbd5e1; font-size:11px; direction:rtl; }
    .icu-sig-cell { text-align:center; }
    .icu-line { border-bottom:1px solid #0f172a; height:14px; }
  </style>

  <div id="icu-consent-sheet" style="position:relative;width:210mm;max-height:90vh;overflow-y:auto;background:white;border-radius:12px;box-shadow:0 25px 50px -12px rgba(0,0,0,0.25);padding:24px;">
    <div id="icu-actions" style="display:flex;justify-content:flex-end;gap:8px;margin-bottom:12px;">
      <button id="icu-print-btn" style="cursor:pointer;border:1px solid #0f172a;background:#0f172a;color:white;padding:6px 16px;border-radius:8px;font-size:13px;font-weight:800;">Print</button>
      <button id="icu-close-btn" style="cursor:pointer;border:1px solid #cbd5e1;background:white;color:#334155;padding:6px 16px;border-radius:8px;font-size:13px;font-weight:700;">Close</button>
    </div>

    <div style="border:1px solid #cbd5e1;border-radius:8px;overflow:hidden;">
      <div style="background:#0f172a;color:#fff;padding:6px 10px;">
        <div style="display:grid;grid-template-columns:40px 1fr 40px;align-items:center;gap:6px;">
          <div style="display:flex;align-items:center;justify-content:flex-start;">
            ${hospitalLogo ? `<img src="${esc(hospitalLogo)}" alt="logo" style="height:32px;width:32px;border-radius:6px;border:1px solid rgba(255,255,255,0.3);object-fit:contain;background:#fff;" />` : ''}
          </div>
          <div style="text-align:center;font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;">
            <div style="font-size:14px;font-weight:900;letter-spacing:0.3px;">${esc(hospitalName)}</div>
            <div style="font-size:10px;opacity:0.95;margin-top:1px;">ICU Procedure Consent</div>
          </div>
          <div></div>
        </div>
      </div>
      <div style="padding:3px 6px 4px;border-top:1px solid #cbd5e1;text-align:center;direction:ltr;font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;">
        ${hospitalAddress ? `<div style="font-size:10px;color:#475569;">${esc(hospitalAddress)}</div>` : ''}
        ${hospitalPhone ? `<div style="font-size:10px;color:#475569;">Phone: ${esc(hospitalPhone)}</div>` : ''}
      </div>
    </div>

    <div style="margin-top:6px;border:1px solid #cbd5e1;border-radius:8px;overflow:hidden;direction:ltr;font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;">
      <div style="background:#f8fafc;padding:4px 6px;font-size:10px;font-weight:900;color:#0f172a;border-bottom:1px solid #cbd5e1;">Patient Information</div>
      <div style="padding:6px;">
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:3px 6px;font-size:10px;color:#0f172a;">
          <div><b>Name:</b> ${esc(String(data?.patientName||''))}</div>
          <div><b>Age/Sex:</b> ${esc(String(data?.age||''))}${data?.gender ? ` ${esc(String(data.gender))}` : ''}</div>
          <div><b>Bed:</b> ${esc(String(data?.bedLabel||''))}</div>
          <div><b>MR #:</b> ${esc(String(data?.mrn||''))}</div>
          <div><b>DOA:</b> ${esc(String(data?.doa||''))}</div>
          <div><b>Doctor:</b> ${esc(String(data?.doctorName||''))}</div>
          <div><b>Panel:</b> ${esc(String(data?.panel||''))}</div>
          <div><b>NIC:</b> ${esc(String(data?.cnic||''))}</div>
          <div><b>Mob:</b> ${esc(String(data?.contact||''))}</div>
          <div style="grid-column:1 / -1"><b>Address:</b> ${esc(String(data?.address||''))}</div>
        </div>
      </div>
    </div>

    <div class="icu-avoid-break" style="margin-top:6px;display:grid;grid-template-columns:1fr 1fr;gap:6px;direction:rtl;font-family:Jameel Noori Nastaleeq,Noto Nastaliq Urdu,serif;color:#0f172a;">
      <div class="icu-box">
        <div class="icu-box-h">
          مصنوعی سانس کی مشین کا اجازت نامہ
        </div>
        <div class="icu-box-b">
          ہم مریض کی تشویش ناک صورت سے متعلق ڈاکٹر صاحب نے مکمل طور پر آگاہ کر دیا ہے۔ مریض کی حالت کے نظر مصنوعی سانس کی مشین کی ضرورت ہو سکتی ہے۔ زندگی کی صورت میں سانس بند ہو سکتا ہے۔ سانس کی مشین لگانے کے دوران ہونے والے خدشات سے متعلق ڈاکٹر صاحب نے ہمیں مکمل طور پر آگاہ کر دیا ہے۔ ہم ان خدشات کے ساتھ ڈاکٹر صاحب پر اعتماد کرتے ہوئے مصنوعی سانس کی مشین لگانے کی اجازت دیتے ہیں اور اس کے نتیجہ میں پیدا ہونے والے تمام خطرات سے خالی نہیں۔ ہسپتال کے عملہ کے عملے کی فروگ ادارہ اور جاننے سے بری الذمہ سمجھتے ہیں۔
        </div>
        <div class="icu-sig-grid">
          <div class="icu-sig-cell"><div>مریض یا لواحقین کا نام</div><div class="icu-line"></div></div>
          <div class="icu-sig-cell"><div>مریض سے رشتہ</div><div class="icu-line"></div></div>
          <div class="icu-sig-cell"><div>دستخط</div><div class="icu-line"></div></div>
        </div>
      </div>

      <div class="icu-box">
        <div class="icu-box-h">
          CVP Line / مصنوعی ٹی پیری TMP کا اجازت نامہ
        </div>
        <div class="icu-box-b">
          ہمیں مریض کی تشویش ناک صورت سے متعلق ڈاکٹر صاحب نے مکمل طور پر آگاہ کر دیا ہے۔ مریض کی حالت کے نظر مریض کو لائن کے لئے مصنوعی ٹی پیری (TMP) / CVP کی ضرورت ہو سکتی ہے۔ زندگی کے دوران ہونے والے خدشات سے متعلق ڈاکٹر صاحب نے ہمیں مکمل طور پر آگاہ کر دیا ہے۔ ہم ان خدشات کے ساتھ ڈاکٹر صاحب پر اعتماد کرتے ہوئے مذکورہ / CVP لائن لگانے کی اجازت دیتے ہیں اور اس کا استعمال کرتے ہوئے علاج جاری رکھیں گے۔ ہسپتال کے عملہ کے عملے کی فروگ ادارہ اور جاننے سے بری الذمہ سمجھتے ہیں۔
        </div>
        <div class="icu-sig-grid">
          <div class="icu-sig-cell"><div>مریض یا لواحقین کا نام</div><div class="icu-line"></div></div>
          <div class="icu-sig-cell"><div>مریض سے رشتہ</div><div class="icu-line"></div></div>
          <div class="icu-sig-cell"><div>دستخط</div><div class="icu-line"></div></div>
        </div>
      </div>
    </div>

    <div style="margin-top:6px;border:1px solid #cbd5e1;border-radius:8px;overflow:hidden;direction:ltr;font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;">
      <div style="background:#f8fafc;padding:4px 6px;font-size:10px;font-weight:900;color:#0f172a;border-bottom:1px solid #cbd5e1;">Record</div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:3px 6px;padding:6px;font-size:10px;">
        <div><b>Guardian:</b> ${esc(String(data?.guardianName||''))}${data?.relation ? ` (${esc(String(data.relation))})` : ''}</div>
        <div><b>Witness:</b> ${esc(String(data?.witnessName||''))}</div>
        <div><b>Date:</b> ${esc(String(data?.date||''))}</div>
        <div><b>Time:</b> ${esc(String(data?.time||''))}</div>
      </div>
    </div>
    <div id="icu-footer" style="margin-top:4px;border-top:1px solid #e2e8f0;padding-top:4px;direction:ltr;font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#64748b;font-size:9px;display:flex;justify-content:space-between;gap:12px;">
      <div>${esc(hospitalFooter || hospitalName)}${hospitalAddress ? ` | ${esc(hospitalAddress)}` : ''}</div>
      <div>${hospitalPhone ? `Phone: ${esc(hospitalPhone)}` : ''} • Generated: ${new Date().toLocaleString()}</div>
    </div>
  </div>`

  overlay.innerHTML = html
  document.body.appendChild(overlay)

  const onClose = ()=> {
    try { document.removeEventListener('keydown', onKey); overlay.remove() } catch {}
  }
  const onPrint = ()=> {
    try { window.print() } catch {}
  }
  const onKey = (e: KeyboardEvent)=> {
    if ((e.ctrlKey||e.metaKey) && (e.key==='d' || e.key==='D')) { e.preventDefault(); onClose() }
    if ((e.ctrlKey||e.metaKey) && (e.key==='p' || e.key==='P')) { /* allow print */ }
    if (e.key === 'Escape') onClose()
  }

  document.getElementById('icu-close-btn')?.addEventListener('click', onClose)
  document.getElementById('icu-print-btn')?.addEventListener('click', onPrint)
  document.addEventListener('keydown', onKey)
}
