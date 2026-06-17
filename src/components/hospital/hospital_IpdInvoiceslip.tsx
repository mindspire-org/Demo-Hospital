import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { hospitalApi } from '../../utils/api';
import Toast, { type ToastState } from '../ui/Toast'

// Types
type LineItem = { sr: number; description: string; rate: number; qty: number; amount: number; _id?: string; paidAmount?: number; paid?: number };

type Invoice = {
  refNo?: string;
  mrn?: string;
  patientName?: string;
  employeeName?: string;
  relationWithPatient?: string;
  bps?: string;
  designation?: string;
  employeeNo?: string;
  procedure?: string;
  dateOfAdmission?: string;
  dateOfDischarge?: string;
  daysOccupied?: number;
  lineItems: LineItem[];
  totalAmount: number;
  discount: number;
  totalPayable: number;
  currency?: string;
};

export default function InvoicePage(props: { patientId?: string; embedded?: boolean; encounterId?: string; encounterType?: 'IPD'|'EMERGENCY'; patient?: any }){
  const { id: routeId = '' } = useParams(); // encounter id via route
  const id = String(props.encounterId || routeId || '');
  const [detectedEncounterType, setDetectedEncounterType] = useState<'IPD'|'EMERGENCY'|null>(null)
  const encounterType = (props.encounterType || props.patient?.encounterType || detectedEncounterType || 'IPD') as 'IPD'|'EMERGENCY'
  const readOnly = false;
  const [, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [inv, setInv] = useState<Invoice>({ lineItems: [], totalAmount: 0, discount: 0, totalPayable: 0, currency: 'PKR' });
  const [patient, setPatient] = useState<{ name?: string; mrn?: string; admitDate?: string; exitDate?: string; phone?: string; address?: string }|null>(null);
  const [hSettings, setHSettings] = useState<any>(null);
  const [dischargeTime, setDischargeTime] = useState<string>('');
  const [payments, setPayments] = useState<any[]>([]);
  const [toast, setToast] = useState<ToastState>(null)

  // Load encounter patient + billing items (IPD or ER)
  useEffect(()=>{
    if(!id) return;
    (async()=>{
      try {
        setLoading(true);
        // Reset on encounter change to prevent stale UI from previous patient
        setPatient(null)
        setPayments([])
        setInv({ lineItems: [], totalAmount: 0, discount: 0, totalPayable: 0, currency: 'PKR' })
        setDischargeTime('')

        // Auto-detect encounter type if not provided
        const isER = props.encounterType === 'EMERGENCY' || props.patient?.encounterType === 'EMERGENCY'
        
        if (isER || !props.encounterType){
          // Try ER first
          const s: any = await hospitalApi.erBillingSummary(id).catch(()=>null as any)
          const enc = s?.encounter
          if (enc) {
            setDetectedEncounterType('EMERGENCY')
            setPatient({ name: enc.patientId?.fullName, mrn: enc.patientId?.mrn, admitDate: enc.startAt, exitDate: enc.endAt, phone: enc.patientId?.phoneNormalized, address: enc.patientId?.address })
            if (enc.endAt){
              const dt = new Date(enc.endAt)
              const hh = String(dt.getHours()).padStart(2,'0')
              const mm = String(dt.getMinutes()).padStart(2,'0')
              setDischargeTime(`${hh}:${mm}`)
            }

            const ch: any = await hospitalApi.listErCharges(id).catch(()=>({ charges: [] }))
            const items: LineItem[] = (ch.charges||[]).map((r:any, idx:number)=> ({ sr: idx+1, description: r.description||'', rate: Number(r.unitPrice||0), qty: Number(r.qty||1)||1, amount: Number(r.amount||0), _id: String(r._id||''), paidAmount: Number(r.paidAmount||0) }))
            const discountItem = items.find(it=> /^discount$/i.test(it.description))
            const discount = discountItem ? Math.abs(Number(discountItem.amount||0)) : 0
            setInv(s=> fillRows({ ...s, lineItems: items, discount }))

            const payRes: any = await hospitalApi.erListPayments(id).catch(()=>({ payments: [] }))
            setPayments(payRes?.payments || [])
            return // ER found, done
          }
          // ER not found, fall through to IPD
        }

        // IPD
        setDetectedEncounterType('IPD')
        const e: any = await hospitalApi.getIPDAdmissionById(id).catch(()=>null as any);
        const enc = e?.encounter;
        if (enc) {
          setPatient({ name: enc.patientId?.fullName, mrn: enc.patientId?.mrn, admitDate: enc.startAt, exitDate: enc.endAt, phone: enc.patientId?.phoneNormalized, address: enc.patientId?.address });
          if (enc.endAt){
            const dt = new Date(enc.endAt);
            const hh = String(dt.getHours()).padStart(2,'0');
            const mm = String(dt.getMinutes()).padStart(2,'0');
            setDischargeTime(`${hh}:${mm}`);
          }
        }
        const res: any = await hospitalApi.listIpdBillingItems(id).catch(()=>({ items: [] }));
        const items: LineItem[] = (res.items||[]).map((r:any, idx:number)=> ({ sr: idx+1, description: r.description||'', rate: Number(r.unitPrice||0), qty: Number(r.qty||1)||1, amount: Number(r.amount||0), _id: String(r._id||''), paidAmount: Number(r.paidAmount||0) }));
        const discountItem = items.find(it=> /^discount$/i.test(it.description));
        const discount = discountItem ? Math.abs(Number(discountItem.amount||0)) : 0;
        setInv(s=> fillRows({ ...s, lineItems: items, discount }));

        const payRes: any = await hospitalApi.listIpdPayments(id).catch(()=>({ payments: [] }));
        setPayments(payRes?.payments || []);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]); // Don't include encounterType - it changes during effect

  useEffect(()=>{ (async()=>{
    try {
      const s: any = await hospitalApi.getSettings().catch(()=>null as any);
      const merged = {
        hospitalName: s?.name || localStorage.getItem('hospitalName') || '',
        hospitalLogo: s?.logoDataUrl || localStorage.getItem('hospitalLogo') || '',
        hospitalAddress: s?.address || localStorage.getItem('hospitalAddress') || '',
        hospitalPhone: s?.phone || localStorage.getItem('hospitalPhone') || '',
        hospitalEmail: s?.email || localStorage.getItem('hospitalEmail') || '',
      };
      setHSettings(merged);
    } catch {}
  })(); }, []);

  // When patient loads, prefill invoice fields if empty
  useEffect(()=>{
    if (!patient) return;
    setInv(v=>{
      const next = { ...v } as Invoice;
      if (!next.mrn && patient.mrn) next.mrn = patient.mrn;
      if (!next.patientName && patient.name) next.patientName = patient.name;
      if (!next.dateOfAdmission && patient.admitDate) next.dateOfAdmission = patient.admitDate as any;
      if (!next.dateOfDischarge && patient.exitDate) next.dateOfDischarge = patient.exitDate as any;
      // derive days occupied if dates present and field empty
      const d1 = next.dateOfAdmission ? new Date(next.dateOfAdmission) : null;
      const d2 = next.dateOfDischarge ? new Date(next.dateOfDischarge) : null;
      if (next.daysOccupied == null && d1 && d2 && !isNaN(d1 as any) && !isNaN(d2 as any)){
        const days = Math.max(0, Math.ceil((d2.getTime() - d1.getTime())/(1000*60*60*24)));
        next.daysOccupied = days;
      }
      return next;
    });
  }, [patient]);

  // Calculate paid status per line item using backend paidAmount if available
  const lineItemsWithStatus = useMemo(() => {
    return (inv.lineItems || []).map(c => {
      const amt = Math.max(0, Number(c.amount || 0));
      // Use backend paidAmount if available, otherwise 0
      const paidHere = Number(c.paidAmount || c.paid || 0);
      const remaining = Math.max(0, amt - paidHere);
      const isPaid = remaining <= 0 && amt > 0;
      const isPartial = paidHere > 0 && remaining > 0;
      return { ...c, paidHere, remaining, isPaid, isPartial };
    });
  }, [inv.lineItems]);
  useEffect(()=>{
    const d1 = inv.dateOfAdmission ? new Date(inv.dateOfAdmission) : null;
    const d2 = inv.dateOfDischarge ? new Date(inv.dateOfDischarge) : null;
    if (!d1 || !d2 || isNaN(d1 as any) || isNaN(d2 as any)) return;
    const days = Math.max(0, Math.ceil((d2.getTime() - d1.getTime())/(1000*60*60*24)));
    if (inv.daysOccupied !== days){
      setInv(v=>({ ...v, daysOccupied: days }));
    }
  }, [inv.dateOfAdmission, inv.dateOfDischarge]);

  const totals = useMemo(()=>{
    const totalAmount = (inv.lineItems||[]).reduce((s, r)=> s + Number(r.amount||0), 0);
    const discount = Number(inv.discount||0);
    const net = Math.max(0, totalAmount - discount);
    
    // Separate payments from refunds
    const refunds = payments.filter(p => 
      String(p.method || '').toLowerCase().includes('return') || 
      String(p.type || '').toLowerCase() === 'refund'
    );
    const regularPayments = payments.filter(p => 
      !String(p.method || '').toLowerCase().includes('return') && 
      String(p.type || '').toLowerCase() !== 'refund'
    );
    
    const refundTotal = refunds.reduce((s, p) => s + Number(p.amount || 0), 0);
    const paymentTotal = regularPayments.reduce((s, p) => s + Number(p.amount || 0), 0);
    
    // Total Paid = payments - refunds (net amount received)
    const totalReceived = paymentTotal - refundTotal;
    
    // Total paid to charges (from payment.allocation or calculate)
    const totalPaidToCharges = regularPayments.reduce((s, p) => {
      const alloc = p.allocation || p.allocatedAmount || 0;
      return s + (alloc > 0 ? alloc : 0);
    }, 0);
    
    // Unallocated advance = total received - amount applied to charges
    const unallocatedAdvance = Math.max(0, totalReceived - totalPaidToCharges);
    
    // Net outstanding: positive = patient owes, negative = credit
    const netOutstanding = net - totalReceived;
    
    return { 
      totalAmount, 
      discount, 
      net, 
      totalPaid: totalReceived, // Net payments (payments - refunds)
      totalPaidToCharges, // Amount applied to charges
      balance: Math.max(0, netOutstanding), // For display
      netOutstanding, // Can be negative
      unallocatedAdvance,
      totalReceived
    };
  }, [inv.lineItems, inv.discount, payments]);

  useEffect(()=>{
    setInv(v=>({ ...v, totalAmount: totals.totalAmount, totalPayable: totals.balance }));
  }, [totals.totalAmount, totals.balance]);

  // Set default current date/time for discharge when no existing values
  useEffect(()=>{
    const hasDate = inv.dateOfDischarge && String(inv.dateOfDischarge).slice(0,10);
    const hasTime = dischargeTime;
    if (!hasDate || !hasTime) {
      const now = new Date();
      const today = now.toISOString().slice(0,10);
      const timeNow = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
      if (!hasDate) {
        setInv(v=>({ ...v, dateOfDischarge: today }));
      }
      if (!hasTime) {
        setDischargeTime(timeNow);
      }
    }
  }, [inv.dateOfDischarge, dischargeTime]);

  function fillRows(data: Invoice): Invoice{
    const rows = [...(data.lineItems||[])];
    return { ...data, lineItems: rows };
  }

  function setRow(i: number, patch: Partial<LineItem>){
    setInv(v=>{
      const items = [...v.lineItems];
      const old = items[i];
      const next = { ...old, ...patch } as LineItem;
      // auto compute amount when rate changes (qty is implicitly 1)
      const rate = Number(next.rate||0);
      if (patch.rate != null) next.amount = rate;
      items[i] = next;
      return { ...v, lineItems: items };
    });
  }

  async function save(){
    if (!id) return;
    setSaving(true);
    try {
      if (encounterType === 'EMERGENCY'){
        const rows = inv.lineItems;
        // Sync Discount as dedicated line
        const discountRow = rows.find(r=> /^discount$/i.test(r.description));
        const desired = Math.abs(Number(inv.discount||0));
        if (desired > 0){
          const amt = -desired;
          if (discountRow && (discountRow as any)._id){
            await hospitalApi.updateErCharge(String((discountRow as any)._id), { description: 'Discount', qty: 1, unitPrice: amt, amount: amt });
          } else {
            await hospitalApi.createErCharge(id, { type: 'service', description: 'Discount', qty: 1, unitPrice: amt, amount: amt });
          }
        } else if (discountRow && (discountRow as any)._id){
          await hospitalApi.deleteErCharge(String((discountRow as any)._id));
        }
        // Upsert other rows
        for (const r of rows){
          if (/^discount$/i.test(r.description)) continue;
          const qty = Number(r.qty||1)||1;
          const unitPrice = Number(r.rate||0);
          const amount = Number(r.amount!=null? r.amount : (unitPrice * qty));
          if (r._id){
            await hospitalApi.updateErCharge(String(r._id), { description: r.description, qty, unitPrice, amount });
          } else if (r.description || amount){
            await hospitalApi.createErCharge(id, { type: 'service', description: r.description, qty, unitPrice, amount });
          }
        }
        // Reload
        const ch: any = await hospitalApi.listErCharges(id).catch(()=>({ charges: [] }))
        const items: LineItem[] = (ch.charges||[]).map((r:any, idx:number)=> ({ sr: idx+1, description: r.description||'', rate: Number(r.unitPrice||0), qty: Number(r.qty||1)||1, amount: Number(r.amount||0), _id: String(r._id||''), paidAmount: Number(r.paidAmount||0) }))
        const discountItem = items.find(it=> /^discount$/i.test(it.description))
        const discount = discountItem ? Math.abs(Number(discountItem.amount||0)) : 0
        setInv(s=> fillRows({ ...s, lineItems: items, discount }))

        const payRes: any = await hospitalApi.erListPayments(id).catch(()=>({ payments: [] }))
        setPayments(payRes?.payments || [])
        
        // Save invoice document
        await hospitalApi.saveInvoice(id, 'EMERGENCY', {
          lineItems: items,
          discount,
          totalAmount: totals.totalAmount,
          totalPaid: totals.totalPaid,
          netOutstanding: totals.netOutstanding,
          dateOfDischarge: inv.dateOfDischarge,
          dischargeTime,
        }).catch(()=>{})
        
        setToast({ type: 'success', message: 'Saved' })
        return
      }

      // IPD - save invoice only, no automatic discharge
      const rows = inv.lineItems;
      // Sync Discount as dedicated line
      const discountRow = rows.find(r=> /^discount$/i.test(r.description));
      const desired = Math.abs(Number(inv.discount||0));
      if (desired > 0){
        const amt = -desired;
        if (discountRow && (discountRow as any)._id){
          await hospitalApi.updateIpdBillingItem(String((discountRow as any)._id), { description: 'Discount', qty: 1, unitPrice: amt, amount: amt });
        } else {
          await hospitalApi.createIpdBillingItem(id, { type: 'service', description: 'Discount', qty: 1, unitPrice: amt, amount: amt });
        }
      } else if (discountRow && (discountRow as any)._id){
        await hospitalApi.deleteIpdBillingItem(String((discountRow as any)._id));
      }
      // Upsert other rows
      for (const r of rows){
        if (/^discount$/i.test(r.description)) continue;
        const qty = 1, unitPrice = Number(r.rate||0);
        const amount = Number(r.amount!=null? r.amount : unitPrice);
        if (r._id){
          await hospitalApi.updateIpdBillingItem(String(r._id), { description: r.description, qty, unitPrice, amount });
        } else if (r.description || amount){
          await hospitalApi.createIpdBillingItem(id, { type: 'service', description: r.description, qty, unitPrice, amount });
        }
      }
      // Reload
      const res: any = await hospitalApi.listIpdBillingItems(id).catch(()=>({ items: [] }));
      const items: LineItem[] = (res.items||[]).map((r:any, idx:number)=> ({ sr: idx+1, description: r.description||'', rate: Number(r.unitPrice||0), qty: Number(r.qty||1)||1, amount: Number(r.amount||0), _id: String(r._id||''), paidAmount: Number(r.paidAmount||0) }));
      const discountItem = items.find(it=> /^discount$/i.test(it.description));
      const discount = discountItem ? Math.abs(Number(discountItem.amount||0)) : 0;
      setInv(s=> fillRows({ ...s, lineItems: items, discount }));
      
      // Save invoice document
      await hospitalApi.saveInvoice(id, 'IPD', {
        lineItems: items,
        discount,
        totalAmount: totals.totalAmount,
        totalPaid: totals.totalPaid,
        netOutstanding: totals.netOutstanding,
        dateOfDischarge: inv.dateOfDischarge,
        dischargeTime,
      }).catch(()=>{})
      
      setToast({ type: 'success', message: 'Saved' })
    } catch (e: any) {
      setToast({ type: 'error', message: e?.message || 'Save failed' })
      throw e
    } finally {
      setSaving(false);
    }
  }

  function printView(){
    if (!hSettings) { alert('Loading hospital details. Please try Print again in a moment.'); return; }
    const w = window.open('', '_blank');
    if (!w) return;
    const admitDT = inv.dateOfAdmission || patient?.admitDate || '';
    let dischargeDT = inv.dateOfDischarge || patient?.exitDate || '';
    if (inv.dateOfDischarge && dischargeTime){
      try {
        const base = new Date(inv.dateOfDischarge as any);
        const [hh,mm] = dischargeTime.split(':');
        base.setHours(Number(hh)||0, Number(mm)||0, 0, 0);
        dischargeDT = base.toISOString();
      } catch {}
    }
    const style = `
      <style>
        @page { size: A4; margin: 12mm; }
        *{ -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        html, body { background:#fff !important; color:#000 !important }
        body{font-family:system-ui,Segoe UI,Arial,sans-serif;padding:18px;color:#111}
        .brand{display:flex;align-items:center;gap:12px}
        .brand .title{font-weight:700;font-size:18px;letter-spacing:.3px}
        .brand .addr{font-size:11px;color:#334}
        .brand{display:flex;gap:10px;align-items:center;justify-content:center;text-align:center;padding-bottom:8px;margin-bottom:10px;border-bottom:1px solid #bae6fd}
        .brand .logo{width:40px;height:40px;border:1px solid #bae6fd;border-radius:8px;display:grid;place-items:center}
        .brand .logoimg{width:56px;height:56px;object-fit:contain;border:1px solid #bae6fd;border-radius:8px;background:#fff;margin-right:8px}
        /* solid blue text to match screen reliably in print */
        .brand .title1{font-weight:900;text-transform:uppercase;letter-spacing:.3px;font-size:24px;line-height:1.1;color:#1d4ed8}
        .brand .title2{font-weight:900;text-transform:uppercase;font-size:18px;line-height:1.1;color:#1d4ed8;margin-top:4px}
        .brand .addr{color:#475569;font-size:12px;margin-top:2px}
        .box{border:2px solid #111;padding:10px}
        .title{text-align:center;font-weight:700;font-size:18px;margin-bottom:6px}
        table{width:100%;border-collapse:collapse}
        th,td{border:1px solid #111;padding:4px 6px;font-size:12px}
        th{background:#f5f5f5;font-weight:700}
        .totals td{font-weight:700}
        .grid{display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:12px;margin-bottom:6px}
        .label{color:#111;width:160px;display:inline-block;font-weight:700}
        .value{font-weight:400}
      </style>`;
    const hs = hSettings || {};
    const name = hs.hospitalName || 'Hospital';
    const addr = hs.hospitalAddress || '';
    const phone = hs.hospitalPhone || '';
    const email = hs.hospitalEmail || '';
    const logo = hs.hospitalLogo || '';
    const logoSrc = logo ? String(logo) : '';
    const logoImg = logoSrc ? `<img class="logoimg" src="${logoSrc}" alt="Logo" onerror="this.style.display='none'" />` : '';
    const brand = `
      <div class="brand">
        ${logoImg}
        <div>
          <div class="title1">${escapeHtml(name)}</div>
          ${addr? `<div class="addr">${escapeHtml(addr)}</div>`:''}
          ${phone? `<div class="addr">Tel: ${escapeHtml(phone)}</div>`:''}
          ${email? `<div class="addr">E-mail: ${escapeHtml(email)}</div>`:''}
        </div>
      </div>`;
    const header = `
      <div class="grid">
        <div><span class="label">MR #</span> <span class="value">${inv.mrn||patient?.mrn||''}</span></div>
        <div><span class="label">Pt. Name</span> <span class="value">${inv.patientName||patient?.name||''}</span></div>
        <div><span class="label">Date Of Admission</span> <span class="value">${fmtDate(admitDT)}</span></div>
        <div><span class="label">Time Of Admission</span> <span class="value">${fmtTime(admitDT)}</span></div>
        <div><span class="label">Phone</span> <span class="value">${patient?.phone||''}</span></div>
        <div><span class="label">Address</span> <span class="value">${escapeHtml(patient?.address||'')}</span></div>
        <div><span class="label">Date Of Discharge</span> <span class="value">${fmtDate(dischargeDT)}</span></div>
        <div><span class="label">Time Of Discharge</span> <span class="value">${fmtTime(dischargeDT)}</span></div>
      </div>`;
    // Charges rows with status
    const chargesWithStat = lineItemsWithStatus.filter(r => r.description);
    const chargesRows = chargesWithStat.map((r,i)=>`<tr>
      <td>${i+1}</td>
      <td>${escapeHtml(r.description)}</td>
      <td class="text-right">Rs ${fmtNum(r.amount)}</td>
      <td class="text-center">${r.isPaid ? 'Paid' : r.isPartial ? 'Partial' : 'Unpaid'}</td>
    </tr>`).join('');
    
    // Payments rows
    const paymentsRows = payments.map((p)=>`<tr>
      <td>${p.receivedAt ? new Date(p.receivedAt).toLocaleString() : '-'}</td>
      <td>${escapeHtml(p.method || '-')}</td>
      <td>${escapeHtml(p.refNo || p.notes || '-')}</td>
      <td class="text-right">Rs ${fmtNum(p.amount)}</td>
    </tr>`).join('');
    
    const html = `<!doctype html><html><head><meta charset="utf-8">${style}</head><body>
      ${brand}
      <div class="box">
        ${header}
        
        <!-- Charges Section -->
        <div style="margin: 10px 0; border: 1px solid #111; border-radius: 4px; overflow: hidden;">
          <div style="background: #f8fafc; padding: 8px 12px; font-weight: 700; font-size: 13px; border-bottom: 1px solid #111;">Charges</div>
          <table style="border: none; width: 100%;">
            <thead style="background: #f8fafc;">
              <tr>
                <th style="text-align: center; width: 40px;">#</th>
                <th style="text-align: left;">Description</th>
                <th style="text-align: right; width: 100px;">Amount</th>
                <th style="text-align: center; width: 80px;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${chargesRows || '<tr><td colspan="4" style="text-align: center; color: #94a3b8;">No charges</td></tr>'}
            </tbody>
            <tfoot style="background: #f8fafc; font-weight: 700;">
              <tr>
                <td></td>
                <td style="text-align: right;">Total</td>
                <td style="text-align: right;">Rs ${fmtNum(totals.totalAmount)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>

        <!-- Payments Section -->
        <div style="margin: 10px 0; border: 1px solid #111; border-radius: 4px; overflow: hidden;">
          <div style="background: #f8fafc; padding: 8px 12px; font-weight: 700; font-size: 13px; border-bottom: 1px solid #111;">Payments</div>
          <table style="border: none; width: 100%;">
            <thead style="background: #f8fafc;">
              <tr>
                <th style="text-align: left;">Date/Time</th>
                <th style="text-align: left;">Method</th>
                <th style="text-align: left;">Ref</th>
                <th style="text-align: right; width: 100px;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${paymentsRows || '<tr><td colspan="4" style="text-align: center; color: #94a3b8;">No payments</td></tr>'}
            </tbody>
            <tfoot style="background: #f8fafc; font-weight: 700;">
              <tr>
                <td colspan="3" style="text-align: right;">Total Paid</td>
                <td style="text-align: right;">Rs ${fmtNum(totals.totalPaid)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <!-- Summary Section -->
        <div style="margin: 10px 0; border: 1px solid #111; border-radius: 4px; overflow: hidden; background: #f8fafc;">
          <table style="border: none; background: transparent; width: 100%;">
            <tbody style="font-weight: 700;">
              <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 8px 12px; width: 50%;">Total Bill</td>
                <td style="text-align: right; padding: 8px 12px;">Rs ${fmtNum(totals.totalAmount)}</td>
              </tr>
              <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 8px 12px;">Total Paid</td>
                <td style="text-align: right; padding: 8px 12px;">Rs ${fmtNum(totals.totalPaid)}</td>
              </tr>
              <tr style="background: ${totals.netOutstanding > 0 ? '#fee2e2' : totals.netOutstanding < 0 ? '#d1fae5' : '#f3f4f6'};">
                <td style="padding: 8px 12px;">${totals.netOutstanding > 0 ? 'Net Due' : totals.netOutstanding < 0 ? 'Net Credit' : 'Balance'}</td>
                <td style="text-align: right; padding: 8px 12px; color: ${totals.netOutstanding > 0 ? '#dc2626' : totals.netOutstanding < 0 ? '#16a34a' : '#111'};">${totals.netOutstanding > 0 ? '-' : totals.netOutstanding < 0 ? '+' : ''}Rs ${fmtNum(Math.abs(totals.netOutstanding))}</td>
              </tr>
            </tbody>
          </table>
          <div style="text-align: center; padding: 8px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b;">System Generated Receipt</div>
        </div>
      </div>
    </body></html>`;
    w.document.write(html);
    w.document.close();
    w.focus();
    w.print();
  }

  function fmtNum(n: any){
    const v = Number(n||0);
    return v.toLocaleString();
  }
  function fmtDate(d?: string){
    if (!d) return '';
    const dd = new Date(d);
    return isNaN(dd as any) ? '' : dd.toLocaleDateString();
  }
  function fmtTime(d?: string){
    if (!d) return '';
    const dd = new Date(d);
    return isNaN(dd as any) ? '' : dd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  function escapeHtml(s: any){
    return String(s||'').replace(/[&<>"]+/g, (c)=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' } as any)[c]);
  }

  return (
    <div className="max-w-6xl mx-auto rounded-xl border border-sky-100 bg-white p-4 shadow-sm">
      <Toast toast={toast} onClose={()=>setToast(null)} />
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 pb-3 border-b border-sky-100">
        {hSettings?.hospitalLogo ? (
          <img className="w-14 h-14 object-contain border border-sky-200 rounded-md mr-2" src={hSettings.hospitalLogo} onError={(e)=>{ (e.currentTarget as HTMLImageElement).style.display='none'; }} alt="Logo" />
        ) : null}
        <div>
          <div className="font-extrabold text-sky-700 text-xl uppercase">{hSettings?.hospitalName || 'Hospital'}</div>
          {hSettings?.hospitalAddress ? (<div className="text-xs text-slate-600">{hSettings.hospitalAddress}</div>) : null}
          {hSettings?.hospitalPhone ? (<div className="text-xs text-slate-600">Tel: {hSettings.hospitalPhone}</div>) : null}
          {hSettings?.hospitalEmail ? (<div className="text-xs text-slate-600">E-mail: {hSettings.hospitalEmail}</div>) : null}
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between">
        <h2 className="font-semibold text-lg tracking-tight flex items-center gap-2">
          <span className="inline-block w-1.5 h-5 rounded bg-gradient-to-b from-cyan-500 to-emerald-400" />
          Invoice
        </h2>
        <div className="text-xs text-slate-600 flex items-center gap-2">
          <span className="hidden md:inline px-2 py-0.5 rounded-full border border-sky-200 bg-sky-50 text-sky-700">{inv.currency || 'PKR'}</span>
          <span>Patient: {patient?.name||'—'} · MRN: {patient?.mrn||'—'}{patient?.phone? ` · Ph: ${patient?.phone}`:''}</span>
        </div>
      </div>

      {/* Header fields removed for simplified invoice slip */}

      {/* Line items */}
      <div className="mt-4">
        <div className="text-sm font-semibold mb-1 flex items-center gap-2"><span className="inline-block w-1.5 h-4 rounded bg-sky-400" />Billing Details</div>
        <div className="overflow-auto border border-sky-100 rounded-lg">
          <table className="w-full text-sm table-fixed">
            <thead className="bg-sky-50/60">
              <tr className="text-left text-slate-600">
                <th className="py-1 px-2 w-14">SR#</th>
                <th className="px-2">Billing Detail</th>
                <th className="px-2 w-28">Rate</th>
                <th className="px-2 w-28">Amount</th>
                <th className="px-2 w-20">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {lineItemsWithStatus.map((r, idx)=> (
                <tr key={idx} className="border-t border-sky-100">
                  <td className="py-1 px-2 text-xs text-slate-600">{idx+1}</td>
                  <td className="px-2">
                    <input 
                      value={r.description} 
                      onChange={e=>setRow(idx,{ description: e.target.value })} 
                      disabled={r.isPaid || r.isPartial} 
                      className={`w-full border rounded px-2 py-1 ${r.isPaid ? 'bg-emerald-50 border-emerald-200' : r.isPartial ? 'bg-amber-50 border-amber-200' : 'border-sky-200'}`}
                      placeholder="e.g., G-Ward Charges" 
                    />
                  </td>
                  <td className="px-2">
                    <input 
                      type="number" 
                      value={r.rate} 
                      onChange={e=>setRow(idx,{ rate: Number(e.target.value||0) })} 
                      disabled={r.isPaid || r.isPartial} 
                      className={`w-full border rounded px-2 py-1 text-right ${r.isPaid ? 'bg-emerald-50 border-emerald-200' : r.isPartial ? 'bg-amber-50 border-amber-200' : 'border-sky-200'}`}
                    />
                  </td>
                  <td className="px-2">
                    <input 
                      type="number" 
                      value={r.amount} 
                      onChange={e=>setRow(idx,{ amount: Number(e.target.value||0) })} 
                      disabled={r.isPaid || r.isPartial} 
                      className={`w-full border rounded px-2 py-1 text-right ${r.isPaid ? 'bg-emerald-50 border-emerald-200' : r.isPartial ? 'bg-amber-50 border-amber-200' : 'border-sky-200'}`}
                    />
                  </td>
                  <td className="px-2 text-xs">
                    {r.isPaid ? (
                      <span className="text-emerald-600 font-medium">Paid</span>
                    ) : r.isPartial ? (
                      <span className="text-amber-600 font-medium">Partial</span>
                    ) : (
                      <span className="text-slate-500">Unpaid</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!readOnly && (
          <div className="mt-2 flex items-center gap-2 text-sm">
            <button onClick={()=> setInv(v=>({ ...v, lineItems: [...v.lineItems, { sr: v.lineItems.length+1, description: '', rate: 0, qty: 1, amount: 0 }] }))} className="text-xs px-2 py-1 rounded-lg border border-sky-200 text-sky-700 hover:bg-sky-50">Add Row</button>
          </div>
        )}
      </div>

      {/* Payments History */}
      {payments.length > 0 && (
        <div className="mt-4">
          <div className="text-sm font-semibold mb-2 flex items-center gap-2">
            <span className="inline-block w-1.5 h-4 rounded bg-slate-400" />Payments History
          </div>
          <div className="overflow-auto border border-slate-200 rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr className="text-left text-slate-600 text-xs">
                  <th className="py-2 px-3">Date/Time</th>
                  <th className="px-3">Method</th>
                  <th className="px-3">Ref</th>
                  <th className="px-3 text-right w-28">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {payments.map((p, idx) => (
                  <tr key={idx}>
                    <td className="py-2 px-3 text-xs">{p.receivedAt ? new Date(p.receivedAt).toLocaleString() : '-'}</td>
                    <td className="px-3">{p.method || '-'}</td>
                    <td className="px-3 text-xs">{p.refNo || p.notes || '-'}</td>
                    <td className="px-3 text-right font-mono">Rs {Number(p.amount||0).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 font-semibold">
                <tr>
                  <td colSpan={3} className="py-2 px-3 text-right">Total Paid</td>
                  <td className="px-3 text-right font-mono">Rs {totals.totalPaid.toLocaleString()}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Summary Table */}
      <div className="mt-4">
        <div className="border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-slate-200">
              <tr className="bg-white">
                <td className="py-2 px-3 font-medium">Total Bill</td>
                <td className="py-2 px-3 text-right font-bold">Rs {totals.totalAmount.toLocaleString()}</td>
              </tr>
              <tr className="bg-white">
                <td className="py-2 px-3 font-medium">Total Paid</td>
                <td className="py-2 px-3 text-right font-bold">Rs {totals.totalPaid.toLocaleString()}</td>
              </tr>
              <tr className={`${totals.netOutstanding > 0 ? 'bg-rose-50' : totals.netOutstanding < 0 ? 'bg-emerald-50' : 'bg-white'}`}>
                <td className="py-2 px-3 font-bold">{totals.netOutstanding > 0 ? 'Net Due' : totals.netOutstanding < 0 ? 'Net Credit' : 'Balance'}</td>
                <td className={`py-2 px-3 text-right font-bold ${totals.netOutstanding > 0 ? 'text-rose-700' : totals.netOutstanding < 0 ? 'text-emerald-700' : ''}`}>
                  {totals.netOutstanding > 0 ? '-' : totals.netOutstanding < 0 ? '+' : ''}Rs {Math.abs(totals.netOutstanding).toLocaleString()}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Discharge Date/Time & Discount */}
      <div className="mt-4 grid md:grid-cols-2 gap-3">
        <div className="space-y-2 text-sm">
          <label className="block">
            <span className="block text-xs text-slate-700 font-semibold">Date Of Discharge</span>
            <input type="date" value={inv.dateOfDischarge? String(inv.dateOfDischarge).slice(0,10): ''} onChange={e=> setInv(v=> ({ ...v, dateOfDischarge: e.target.value }))} className="border border-sky-200 rounded px-2 py-1" />
          </label>
          <label className="block">
            <span className="block text-xs text-slate-700 font-semibold">Time Of Discharge</span>
            <input type="time" value={dischargeTime} onChange={e=> setDischargeTime(e.target.value)} className="border border-sky-200 rounded px-2 py-1" />
          </label>
        </div>
        {/* Discount Input */}
        <div className="flex items-center justify-between text-sm bg-slate-50 rounded-lg p-2">
          <span className="text-slate-600">Discount</span>
          <div className="flex items-center gap-2">
            <input 
              type="number" 
              value={inv.discount||0} 
              onChange={e=> setInv(v=>({ ...v, discount: Number(e.target.value||0) }))} 
              disabled={readOnly} 
              className="w-24 border border-slate-200 rounded px-2 py-1 text-right text-sm disabled:bg-slate-100" 
            />
            <span className="font-mono text-sm">Rs {(inv.discount||0).toLocaleString()}</span>
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <button onClick={save} disabled={saving} className="text-xs px-3 py-2 rounded-lg border border-emerald-200 text-emerald-700 hover:bg-emerald-50 disabled:opacity-50">{saving? 'Saving...' : 'Save'}</button>
        <button onClick={printView} className="text-xs px-3 py-2 rounded-lg border border-sky-200 text-sky-700 hover:bg-sky-50">Print</button>
      </div>
    </div>
  );
}

 