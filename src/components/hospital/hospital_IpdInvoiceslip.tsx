import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { 
  FileText, Printer, Save, Plus, 
  Receipt, Calculator, Calendar, Clock,
  User, CheckCircle2, AlertCircle,
  TrendingDown, Coins, CreditCard
} from 'lucide-react';
import { hospitalApi } from '../../utils/api';
import Toast, { type ToastState } from '../ui/Toast'

// Types
type LineItem = { sr: number; description: string; rate: number; qty: number; amount: number; _id?: string; isPaid?: boolean; isPartial?: boolean; paidHere?: number; remaining?: number };

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
  const encounterType = (props.encounterType || props.patient?.encounterType || 'IPD') as 'IPD'|'EMERGENCY'
  const embedded = !!props.embedded
  const readOnly = false;
  const [, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [inv, setInv] = useState<Invoice>({ lineItems: [], totalAmount: 0, discount: 0, totalPayable: 0, currency: 'PKR' });
  const [patient, setPatient] = useState<{ name?: string; mrn?: string; admitDate?: string; exitDate?: string; phone?: string; address?: string }|null>(null);
  const [hSettings, setHSettings] = useState<any>(null);
  const [dischargeTime, setDischargeTime] = useState<string>('');
  const [deposit, setDeposit] = useState<number>(0);
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
        setDeposit(0)
        setPayments([])
        setInv({ lineItems: [], totalAmount: 0, discount: 0, totalPayable: 0, currency: 'PKR' })
        setDischargeTime('')

        if (encounterType === 'EMERGENCY'){
          const s: any = await hospitalApi.erBillingSummary(id).catch(()=>null as any)
          const enc = s?.encounter
          if (enc) {
            setPatient({ name: enc.patientId?.fullName, mrn: enc.patientId?.mrn, admitDate: enc.startAt, exitDate: enc.endAt, phone: enc.patientId?.phoneNormalized, address: enc.patientId?.address })
            if (enc.endAt){
              const dt = new Date(enc.endAt)
              const hh = String(dt.getHours()).padStart(2,'0')
              const mm = String(dt.getMinutes()).padStart(2,'0')
              setDischargeTime(`${hh}:${mm}`)
            }
          }

          const ch: any = await hospitalApi.listErCharges(id).catch(()=>({ charges: [] }))
          const items: LineItem[] = (ch.charges||[]).map((r:any, idx:number)=> ({ sr: idx+1, description: r.description||'', rate: Number(r.unitPrice||0), qty: Number(r.qty||1)||1, amount: Number(r.amount||0), _id: String(r._id||'') }))
          const discountItem = items.find(it=> /^discount$/i.test(it.description))
          const discount = discountItem ? Math.abs(Number(discountItem.amount||0)) : 0
          setInv(s=> fillRows({ ...s, lineItems: items, discount }))

          const payRes: any = await hospitalApi.erListPayments(id).catch(()=>({ payments: [] }))
          setPayments(payRes?.payments || [])
          return
        }

        const e: any = await hospitalApi.getIPDAdmissionById(id).catch(()=>null as any);
        const enc = e?.encounter;
        if (enc) {
          setPatient({ name: enc.patientId?.fullName, mrn: enc.patientId?.mrn, admitDate: enc.startAt, exitDate: enc.endAt, phone: enc.patientId?.phoneNormalized, address: enc.patientId?.address });
          setDeposit(Number(enc?.deposit||0));
          if (enc.endAt){
            const dt = new Date(enc.endAt);
            const hh = String(dt.getHours()).padStart(2,'0');
            const mm = String(dt.getMinutes()).padStart(2,'0');
            setDischargeTime(`${hh}:${mm}`);
          }
        }
        const res: any = await hospitalApi.listIpdBillingItems(id).catch(()=>({ items: [] }));
        const items: LineItem[] = (res.items||[]).map((r:any, idx:number)=> ({ sr: idx+1, description: r.description||'', rate: Number(r.unitPrice||0), qty: Number(r.qty||1)||1, amount: Number(r.amount||0), _id: String(r._id||'') }));
        const discountItem = items.find(it=> /^discount$/i.test(it.description));
        const discount = discountItem ? Math.abs(Number(discountItem.amount||0)) : 0;
        setInv(s=> fillRows({ ...s, lineItems: items, discount }));

        const payRes: any = await hospitalApi.listIpdPayments(id).catch(()=>({ payments: [] }));
        setPayments(payRes?.payments || []);
      } finally {
        setLoading(false);
      }
    })();
  }, [id, encounterType]);

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

  // Calculate paid status per line item based on payment allocation
  const lineItemsWithStatus = useMemo(() => {
    const sorted = [...(inv.lineItems || [])].sort((a, b) => {
      const da = a._id ? new Date(a._id).getTime() : 0;
      const db = b._id ? new Date(b._id).getTime() : 0;
      return da - db;
    });
    
    const settlements = payments.filter(p => String(p.method || '').toLowerCase() === 'advance settlement');
    const nonAdvancePayments = payments.filter(p => !['advance', 'advance settlement'].includes(String(p.method || '').toLowerCase()));
    
    const settlementTotal = settlements.reduce((s, p) => s + Number(p.amount || 0), 0);
    const regularPaidTotal = nonAdvancePayments.reduce((s, p) => s + Number(p.amount || 0), 0);
    const depositAndRegular = Number(deposit || 0) + regularPaidTotal + settlementTotal;
    
    let remainingPaid = Math.max(0, depositAndRegular);
    const alloc = sorted.map(c => {
      const amt = Math.max(0, Number(c.amount || 0));
      const paidHere = Math.min(amt, remainingPaid);
      const remaining = Math.max(0, amt - paidHere);
      remainingPaid = Math.max(0, remainingPaid - paidHere);
      const isPaid = remaining <= 0;
      const isPartial = paidHere > 0 && remaining > 0;
      return { ...c, paidHere, remaining, isPaid, isPartial };
    });
    
    const byId = new Map(alloc.map(a => [a._id, a]));
    return (inv.lineItems || []).map(c => byId.get(c._id) || { ...c, paidHere: 0, remaining: Number(c.amount || 0), isPaid: false, isPartial: false });
  }, [inv.lineItems, payments, deposit]);
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
    
    const advances = payments.filter(p => String(p.method || '').toLowerCase() === 'advance');
    const settlements = payments.filter(p => String(p.method || '').toLowerCase() === 'advance settlement');
    const nonAdvancePayments = payments.filter(p => !['advance', 'advance settlement'].includes(String(p.method || '').toLowerCase()));
    
    const advanceTotalRaw = advances.reduce((s, p) => s + Number(p.amount || 0), 0);
    const settlementTotal = settlements.reduce((s, p) => s + Number(p.amount || 0), 0);
    const regularPaid = nonAdvancePayments.reduce((s, p) => s + Number(p.amount || 0), 0);
    
    const advanceTotal = Math.max(0, advanceTotalRaw - settlementTotal);
    const totalPaid = Math.max(0, regularPaid + settlementTotal);
    const balance = Math.max(0, net - totalPaid);
    
    return { totalAmount, discount, net, totalPaid, balance, advanceTotal, advanceUsed: settlementTotal, regularPaid };
  }, [inv.lineItems, inv.discount, deposit, payments]);

  useEffect(()=>{
    setInv(v=>({ ...v, totalAmount: totals.totalAmount, totalPayable: totals.balance }));
  }, [totals.totalAmount, totals.balance]);

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
        const items: LineItem[] = (ch.charges||[]).map((r:any, idx:number)=> ({ sr: idx+1, description: r.description||'', rate: Number(r.unitPrice||0), qty: Number(r.qty||1)||1, amount: Number(r.amount||0), _id: String(r._id||'') }))
        const discountItem = items.find(it=> /^discount$/i.test(it.description))
        const discount = discountItem ? Math.abs(Number(discountItem.amount||0)) : 0
        setInv(s=> fillRows({ ...s, lineItems: items, discount }))

        const payRes: any = await hospitalApi.erListPayments(id).catch(()=>({ payments: [] }))
        setPayments(payRes?.payments || [])
        setToast({ type: 'success', message: 'Invoice saved successfully' })
        return
      }

      // Update encounter discharge date/time if provided
      if (inv.dateOfDischarge){
        try {
          const dt = new Date(inv.dateOfDischarge as any)
          if (dischargeTime){
            const [hh,mm] = dischargeTime.split(':')
            dt.setHours(Number(hh)||0, Number(mm)||0, 0, 0)
          }
          const iso = dt.toISOString()
          await hospitalApi.dischargeIPD(id, { endAt: iso })
        } catch {}
      }
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
      const items: LineItem[] = (res.items||[]).map((r:any, idx:number)=> ({ sr: idx+1, description: r.description||'', rate: Number(r.unitPrice||0), qty: Number(r.qty||1)||1, amount: Number(r.amount||0), _id: String(r._id||'') }));
      const discountItem = items.find(it=> /^discount$/i.test(it.description));
      const discount = discountItem ? Math.abs(Number(discountItem.amount||0)) : 0;
      setInv(s=> fillRows({ ...s, lineItems: items, discount }));
      setToast({ type: 'success', message: 'Invoice saved successfully' })
    } catch (e: any) {
      setToast({ type: 'error', message: e?.message || 'Save failed' })
      throw e
    } finally {
      setSaving(false);
    }
  }

  function printView(){
    if (!hSettings) { setToast({ type: 'info', message: 'Loading hospital details… please try again in a moment.' }); return; }
    const w = window.open('', '_blank');
    if (!w) return;
    // Always render a full sheet with 10 lines even if empty
    const rows = (inv.lineItems || []).filter(r => (r.description && r.description.trim()) || Number(r.rate||0) || Number(r.amount||0));
    const currency = inv.currency || 'PKR';
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
        *{ -webkit-print-color-adjust: exact; print-color-adjust: exact; box-sizing: border-box; }
        html, body { background:#fff !important; color:#0f172a !important }
        body{font-family:ui-sans-serif,system-ui,Segoe UI,Arial,sans-serif;padding:0;margin:0;color:#0f172a}
        .sheet{padding:18px}

        .brand{display:flex;gap:14px;align-items:center;justify-content:space-between;border-bottom:2px solid #e2e8f0;padding-bottom:12px;margin-bottom:14px}
        .brand-left{display:flex;gap:12px;align-items:center}
        .logoimg{width:62px;height:62px;object-fit:contain;border:1px solid #e2e8f0;border-radius:14px;background:#fff}
        .hname{font-weight:1000;text-transform:uppercase;letter-spacing:.5px;font-size:22px;line-height:1.1;color:#0f172a}
        .hmeta{color:#475569;font-size:11px;margin-top:2px;line-height:1.35}
        .badge{display:inline-flex;align-items:center;gap:8px;border:1px solid #e2e8f0;border-radius:999px;padding:8px 12px;font-size:11px;font-weight:900;letter-spacing:.18em;text-transform:uppercase;color:#334155;background:#f8fafc}
        .badge .dot{width:8px;height:8px;border-radius:999px;background:#0ea5e9}

        .card{border:1px solid #e2e8f0;border-radius:16px;overflow:hidden}
        .card-h{background:#0f172a;color:#fff;padding:10px 12px;font-weight:900;letter-spacing:.16em;text-transform:uppercase;font-size:11px}
        .card-b{padding:12px}

        .grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:12px}
        .field{display:flex;gap:8px}
        .label{min-width:150px;color:#334155;font-weight:900;text-transform:uppercase;letter-spacing:.12em;font-size:10px}
        .value{font-weight:700;color:#0f172a}

        table{width:100%;border-collapse:collapse;margin-top:10px}
        th,td{border:1px solid #cbd5e1;padding:7px 8px;font-size:12px}
        th{background:#f8fafc;font-weight:1000;text-transform:uppercase;letter-spacing:.12em;font-size:10px;color:#334155}
        td.num{text-align:right;font-variant-numeric:tabular-nums}

        .totals{margin-top:12px;display:grid;grid-template-columns:1fr 320px;gap:12px;align-items:start}
        .summary{border:1px solid #e2e8f0;border-radius:16px;padding:12px}
        .row{display:flex;justify-content:space-between;gap:12px;padding:6px 0;font-size:12px}
        .row strong{font-weight:1000}
        .grand{border-top:2px solid #e2e8f0;margin-top:6px;padding-top:10px}
        .grand .amt{font-size:18px;font-weight:1000;color:#0ea5e9}
        .due{margin-top:10px;border-radius:14px;padding:10px 12px;background:#fff1f2;border:1px solid #fecdd3;color:#9f1239;display:flex;justify-content:space-between;align-items:center}
        .due .amt{font-size:18px;font-weight:1000}

        .footer{margin-top:14px;border-top:2px dashed #e2e8f0;padding-top:10px;display:flex;justify-content:space-between;gap:12px;font-size:11px;color:#475569}
        .sig{width:220px;text-align:center}
        .sig .line{margin-top:22px;border-bottom:1px solid #94a3b8}
      </style>`;
    const hs = hSettings || {};
    const name = hs.hospitalName || 'Hospital';
    const addr = hs.hospitalAddress || '';
    const phone = hs.hospitalPhone || '';
    const email = hs.hospitalEmail || '';
    const logo = hs.hospitalLogo || '';
    const logoSrc = logo ? String(logo) : '';
    const logoImg = logoSrc ? `<img class="logoimg" src="${logoSrc}" alt="Logo" onerror="this.style.display='none'" />` : '';
    const brandStr = `
      <div class="brand">
        <div class="brand-left">
          ${logoImg}
          <div>
            <div class="hname">${escapeHtml(name)}</div>
            <div class="hmeta">${addr? escapeHtml(addr): ''}${addr && (phone||email) ? ' • ' : ''}${phone? `Tel: ${escapeHtml(phone)}`:''}${(phone && email)? ' • ':''}${email? `Email: ${escapeHtml(email)}`:''}</div>
          </div>
        </div>
        <div class="badge"><span class="dot"></span> Final Invoice</div>
      </div>`;
    const header = `
      <div class="card">
        <div class="card-h">Patient & Encounter</div>
        <div class="card-b">
          <div class="grid">
            <div class="field"><span class="label">MR #</span><span class="value">${escapeHtml(inv.mrn||patient?.mrn||'')}</span></div>
            <div class="field"><span class="label">Patient Name</span><span class="value">${escapeHtml(inv.patientName||patient?.name||'')}</span></div>
            <div class="field"><span class="label">Admission</span><span class="value">${fmtDate(admitDT)} ${fmtTime(admitDT)}</span></div>
            <div class="field"><span class="label">Discharge</span><span class="value">${fmtDate(dischargeDT)} ${fmtTime(dischargeDT)}</span></div>
            <div class="field"><span class="label">Phone</span><span class="value">${escapeHtml(patient?.phone||'')}</span></div>
            <div class="field"><span class="label">Address</span><span class="value">${escapeHtml(patient?.address||'')}</span></div>
          </div>
        </div>
      </div>`;
    const bodyRows = rows.map((r,i)=>`<tr>
      <td>${r.sr || (i+1)}</td>
      <td>${escapeHtml(r.description)}</td>
      <td class="num">${fmtNum(r.rate)}</td>
      <td class="num">${fmtNum(r.amount)}</td>
    </tr>`).join('');
    const html = `<!doctype html><html><head><meta charset="utf-8">${style}</head><body>
      <div class="sheet">
        ${brandStr}
        ${header}

        <div class="card" style="margin-top:12px">
          <div class="card-h">Billing Details</div>
          <div class="card-b">
            <table>
              <thead>
                <tr><th style="width:52px">Sr#</th><th>Billing Detail</th><th style="width:110px" class="num">Rate</th><th style="width:110px" class="num">Amount</th></tr>
              </thead>
              <tbody>${bodyRows}</tbody>
            </table>

            <div class="totals">
              <div></div>
              <div class="summary">
                <div class="row"><span>Gross Total</span><strong>${currency} ${fmtNum(totals.totalAmount)}</strong></div>
                <div class="row"><span>Discount</span><strong>${currency} ${fmtNum(inv.discount||0)}</strong></div>
                <div class="row grand"><span>Net Total</span><strong class="amt">${currency} ${fmtNum(totals.net)}</strong></div>
                <div class="row"><span>Paid</span><strong>${currency} ${fmtNum(totals.totalPaid)}</strong></div>
                <div class="due"><span>Balance Due</span><span class="amt">${currency} ${fmtNum(totals.balance)}</span></div>
              </div>
            </div>

            <div class="footer">
              <div>
                <div><strong>Generated:</strong> ${new Date().toLocaleString()}</div>
                <div><strong>Encounter:</strong> ${escapeHtml(String(id||''))}</div>
              </div>
              <div class="sig">
                <div><strong>Authorized Signature</strong></div>
                <div class="line"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </body></html>`;
    w.document.write(html);
    w.document.close();
    w.focus();
    w.print();
  }

  function downloadHtml(){
    try {
      const currency = inv.currency || 'PKR'
      const rows = (inv.lineItems || []).filter(r => (r.description && r.description.trim()) || Number(r.rate||0) || Number(r.amount||0))
      const admitDT = inv.dateOfAdmission || patient?.admitDate || ''
      let dischargeDT = inv.dateOfDischarge || patient?.exitDate || ''
      if (inv.dateOfDischarge && dischargeTime){
        try {
          const base = new Date(inv.dateOfDischarge as any)
          const [hh,mm] = dischargeTime.split(':')
          base.setHours(Number(hh)||0, Number(mm)||0, 0, 0)
          dischargeDT = base.toISOString()
        } catch {}
      }

      const esc = (s: any)=> String(s||'').replace(/[&<>"']+/g, (c)=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;' } as any)[c])
      const bodyRows = rows.map((r,i)=>`<tr>
        <td>${r.sr || (i+1)}</td>
        <td>${esc(r.description)}</td>
        <td style="text-align:right">${Number(r.rate||0).toLocaleString()}</td>
        <td style="text-align:right">${Number(r.amount||0).toLocaleString()}</td>
      </tr>`).join('')

      const hs = hSettings || {}
      const name = hs.hospitalName || 'Hospital'
      const html = `<!doctype html><html><head><meta charset="utf-8"/><title>Invoice</title>
        <style>
          body{font-family:ui-sans-serif,system-ui,Segoe UI,Arial,sans-serif;padding:16px;color:#0f172a}
          h2{margin:0 0 10px 0}
          .meta{color:#475569;font-size:12px;margin-bottom:12px}
          table{width:100%;border-collapse:collapse}
          th,td{border:1px solid #e2e8f0;padding:8px;font-size:12px}
          th{background:#f8fafc;text-align:left}
        </style>
      </head><body>
        <h2>${esc(name)} - Final Invoice</h2>
        <div class="meta"><b>MRN:</b> ${esc(inv.mrn||patient?.mrn||'')} &nbsp; <b>Patient:</b> ${esc(inv.patientName||patient?.name||'')}</div>
        <div class="meta"><b>Admission:</b> ${esc(fmtDate(admitDT))} ${esc(fmtTime(admitDT))} &nbsp; <b>Discharge:</b> ${esc(fmtDate(dischargeDT))} ${esc(fmtTime(dischargeDT))}</div>
        <table>
          <thead><tr><th style="width:52px">Sr#</th><th>Billing Detail</th><th style="width:110px;text-align:right">Rate</th><th style="width:110px;text-align:right">Amount</th></tr></thead>
          <tbody>${bodyRows}</tbody>
        </table>
        <div style="margin-top:12px;text-align:right;font-weight:800">Net Total: ${esc(currency)} ${Number(totals.net||0).toLocaleString()}</div>
        <div style="margin-top:6px;text-align:right;font-weight:800;color:#b91c1c">Balance Due: ${esc(currency)} ${Number(totals.balance||0).toLocaleString()}</div>
      </body></html>`

      const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `invoice-${String(id||inv.mrn||'encounter')}.html`
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      setToast({ type: 'success', message: 'Invoice downloaded' })
    } catch (e: any) {
      setToast({ type: 'error', message: e?.message || 'Download failed' })
    }
  }

  useEffect(() => {
    const onAction = (ev: Event) => {
      const detail = (ev as CustomEvent).detail as any
      if (!detail || detail.key !== 'Invoice') return
      if (detail.action === 'save') { void save() }
      if (detail.action === 'print') { printView() }
      if (detail.action === 'download') { downloadHtml() }
    }
    window.addEventListener('dw:form-action', onAction as any)
    return () => window.removeEventListener('dw:form-action', onAction as any)
  }, [id, encounterType, inv, patient, hSettings, dischargeTime, totals])

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
    <div className="mx-auto max-w-5xl space-y-6">
      <Toast toast={toast} onClose={()=>setToast(null)} />
      
      {/* Invoice Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-slate-100 pb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-600">
            <Receipt className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-2xl font-black tracking-tight text-slate-900 uppercase">Final Invoice</h2>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400">
              <span className="flex items-center gap-1"><User className="h-3 w-3" /> {patient?.name || '...'}</span>
              <span>•</span>
              <span className="flex items-center gap-1"><FileText className="h-3 w-3" /> {patient?.mrn || '...'}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-black text-slate-600">{inv.currency || 'PKR'}</span>
          <div className="h-8 w-px bg-slate-200 mx-2 hidden md:block" />
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Balance Due</span>
            <span className="text-xl font-black text-rose-600">{(inv.currency||'PKR')} {totals.balance.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Billing Summary Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
            <Calculator className="h-3 w-3" /> Gross Amount
          </div>
          <div className="mt-2 text-lg font-black text-slate-900">{fmtNum(totals.totalAmount)}</div>
        </div>
        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-500">
            <TrendingDown className="h-3 w-3" /> Discount
          </div>
          <div className="mt-2 text-lg font-black text-emerald-600">{fmtNum(inv.discount)}</div>
        </div>
        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-sky-500">
            <Coins className="h-3 w-3" /> Net Total
          </div>
          <div className="mt-2 text-lg font-black text-sky-600">{fmtNum(totals.net)}</div>
        </div>
        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
            <CreditCard className="h-3 w-3" /> Total Paid
          </div>
          <div className="mt-2 text-lg font-black text-slate-900">{fmtNum(totals.totalPaid)}</div>
        </div>
      </div>

      {/* Discharge Timing */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
              <Calendar className="h-3 w-3" /> Date Of Discharge
            </label>
            <input type="date" value={inv.dateOfDischarge? String(inv.dateOfDischarge).slice(0,10): ''} onChange={e=> setInv(v=> ({ ...v, dateOfDischarge: e.target.value }))} className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 focus:border-sky-500 focus:bg-white focus:outline-none transition-all" />
          </div>
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
              <Clock className="h-3 w-3" /> Time Of Discharge
            </label>
            <input type="time" value={dischargeTime} onChange={e=> setDischargeTime(e.target.value)} className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 focus:border-sky-500 focus:bg-white focus:outline-none transition-all" />
          </div>
        </div>
      </div>

      {/* Line Items Table */}
      <div className="rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/40 overflow-hidden">
        <div className="flex items-center justify-between bg-slate-50/50 px-8 py-6 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-sky-600" />
            <h2 className="text-lg font-black uppercase tracking-wider text-slate-800">Billing Details</h2>
          </div>
          <button onClick={()=> setInv(v=>({ ...v, lineItems: [...v.lineItems, { sr: v.lineItems.length+1, description: '', rate: 0, qty: 1, amount: 0 }] }))} className="flex items-center gap-2 rounded-xl bg-sky-600/5 px-4 py-2 text-sm font-bold text-sky-600 hover:bg-sky-600 hover:text-white transition-all">
            <Plus className="h-4 w-4" /> Add Item
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50 text-left text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">
                <th className="px-8 py-4 w-16 text-center">#</th>
                <th className="px-4 py-4">Description</th>
                <th className="px-4 py-4 w-40 text-right">Rate</th>
                <th className="px-4 py-4 w-40 text-right">Amount</th>
                <th className="px-8 py-4 w-32 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {lineItemsWithStatus.map((r, idx)=> (
                <tr key={idx} className="group hover:bg-slate-50/50 transition-colors">
                  <td className="px-8 py-4 text-sm font-bold text-slate-400 text-center">{idx+1}</td>
                  <td className="px-4 py-4">
                    <input 
                      value={r.description} 
                      onChange={e=>setRow(idx,{ description: e.target.value })} 
                      disabled={r.isPaid || r.isPartial} 
                      className={`w-full rounded-xl border-2 border-transparent bg-transparent px-4 py-2 text-sm font-bold text-slate-900 focus:border-sky-500/20 focus:bg-white focus:outline-none transition-all ${r.isPaid ? 'opacity-60' : ''}`}
                      placeholder="e.g., G-Ward Charges" 
                    />
                  </td>
                  <td className="px-4 py-4">
                    <input 
                      type="number" 
                      value={r.rate} 
                      onChange={e=>setRow(idx,{ rate: Number(e.target.value||0) })} 
                      disabled={r.isPaid || r.isPartial} 
                      className={`w-full rounded-xl border-2 border-transparent bg-transparent px-4 py-2 text-right text-sm font-black text-slate-700 focus:border-sky-500/20 focus:bg-white focus:outline-none transition-all ${r.isPaid ? 'opacity-60' : ''}`}
                    />
                  </td>
                  <td className="px-4 py-4">
                    <input 
                      type="number" 
                      value={r.amount} 
                      onChange={e=>setRow(idx,{ amount: Number(e.target.value||0) })} 
                      disabled={r.isPaid || r.isPartial} 
                      className={`w-full rounded-xl border-2 border-transparent bg-transparent px-4 py-2 text-right text-sm font-black text-slate-900 focus:border-sky-500/20 focus:bg-white focus:outline-none transition-all ${r.isPaid ? 'opacity-60' : ''}`}
                    />
                  </td>
                  <td className="px-8 py-4 text-center">
                    {r.isPaid ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-600 ring-1 ring-emerald-600/10">
                        <CheckCircle2 className="h-3 w-3" /> Paid
                      </span>
                    ) : r.isPartial ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-amber-600 ring-1 ring-amber-600/10">
                        <AlertCircle className="h-3 w-3" /> Partial
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-400 ring-1 ring-slate-400/10">
                        Unpaid
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Totals & Discount Editor */}
      <div className={`flex justify-end pt-4 ${embedded ? 'pb-6' : 'pb-24'}`}>
        <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/30 space-y-4">
          <div className="flex items-center justify-between text-sm font-bold text-slate-500">
            <span>Gross Total</span>
            <span>{(inv.currency||'PKR')} {totals.totalAmount.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between border-y border-slate-100 py-4">
            <span className="text-sm font-bold text-emerald-600 uppercase tracking-widest">Apply Discount</span>
            <div className="relative">
              <TrendingDown className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-400" />
              <input 
                type="number" 
                value={inv.discount||0} 
                onChange={e=> setInv(v=>({ ...v, discount: Number(e.target.value||0) }))} 
                disabled={readOnly} 
                className="w-40 rounded-xl border-2 border-emerald-100 bg-emerald-50/50 pl-10 pr-4 py-2 text-right text-sm font-black text-emerald-700 focus:border-emerald-500 focus:bg-white focus:outline-none transition-all" 
              />
            </div>
          </div>
          <div className="flex items-center justify-between text-xl font-black pt-2">
            <span className="text-slate-900 uppercase tracking-tighter">Grand Total</span>
            <span className="text-sky-600">{(inv.currency||'PKR')} {totals.net.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between text-sm font-bold text-slate-500">
            <span>Total Paid</span>
            <span>{(inv.currency||'PKR')} {totals.totalPaid.toLocaleString()}</span>
          </div>
          <div className="mt-6 flex items-center justify-between rounded-2xl bg-rose-50 p-4 text-rose-600">
            <span className="text-xs font-black uppercase tracking-widest">Remaining Balance</span>
            <span className="text-2xl font-black tracking-tighter">{(inv.currency||'PKR')} {totals.balance.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Floating Action Bar */}
      {!embedded ? (
        <div className="fixed bottom-6 left-1/2 z-20 w-full max-w-sm -translate-x-1/2 px-4">
          <div className="flex items-center gap-3 rounded-2xl bg-white/80 p-3 shadow-2xl ring-1 ring-black/5 backdrop-blur-xl">
            <button
              onClick={printView}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
            >
              <Printer className="h-4 w-4" />
              Print
            </button>
            <button
              onClick={save}
              disabled={saving}
              className="flex flex-2 items-center justify-center gap-2 rounded-xl bg-sky-600 py-3 text-sm font-black text-white shadow-xl shadow-sky-600/20 transition hover:opacity-90 disabled:opacity-50"
            >
              {saving ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : <Save className="h-4 w-4" />}
              Save Invoice
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

// (header field helper functions removed)
