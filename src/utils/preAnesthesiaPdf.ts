import { jsPDF } from 'jspdf';

export type PreAnesthesiaPdfData = {
  doctor?: { name?: string; qualification?: string; departmentName?: string; phone?: string; specialization?: string };
  settings?: { name?: string; address?: string; phone?: string; logoDataUrl?: string };
  patient?: { name?: string; mrn?: string; gender?: string; age?: string; phone?: string; address?: string };
  preAnesthesia: {
    history: {
      cvs: string;
      respiratory: string;
      renal: string;
      hepatic: string;
      diabetic: string;
      neurology: string;
      previousAnesthesia: string;
      allergies: string;
    };
    examination: {
      mallampatiScore: string;
      asaClass: string;
      airway: string;
      teeth: string;
      notes: string;
    };
    recommendation: string;
  };
  vitals?: {
    pulse?: number;
    temperatureC?: number;
    bloodPressureSys?: number;
    bloodPressureDia?: number;
    respiratoryRate?: number;
    spo2?: number;
    weightKg?: number;
  };
  createdAt?: string | Date;
};

export async function previewPreAnesthesiaPdf(data: PreAnesthesiaPdfData) {
  const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4', compress: true });
  const W = pdf.internal.pageSize.getWidth();
  const H = pdf.internal.pageSize.getHeight();

  const blue = { r: 37, g: 99, b: 235 };
  const slate = { r: 15, g: 23, b: 42 };
  const navy = { r: 15, g: 40, b: 100 };
  const skyBg = { r: 241, g: 246, b: 255 };
  const lightBlue = { r: 219, g: 234, b: 254 };
  const gray = { r: 100, g: 116, b: 139 };

  const settings = data.settings || {};
  const patient = data.patient || {};
  const doctor = data.doctor || {};
  const dt = data.createdAt ? new Date(data.createdAt as any) : new Date();

  const marginX = 10;
  let y = 8;

  // 1. HEADER
  const headerH = 38;
  pdf.setFillColor(skyBg.r, skyBg.g, skyBg.b);
  pdf.setDrawColor(lightBlue.r, lightBlue.g, lightBlue.b);
  pdf.setLineWidth(0.6);
  pdf.roundedRect(marginX, y, W - 2 * marginX, headerH, 4, 4, 'FD');

  pdf.setFillColor(navy.r, navy.g, navy.b);
  pdf.rect(marginX, y, 4, headerH, 'F');

  pdf.setDrawColor(blue.r, blue.g, blue.b);
  pdf.setLineWidth(1.8);
  pdf.line(marginX, y + headerH, W - marginX, y + headerH);

  let nameX = marginX + 10;
  const logoSrc = String(settings.logoDataUrl || '');
  if (logoSrc) {
    try {
      const normalized = await ensurePngDataUrl(logoSrc);
      pdf.addImage(normalized, 'PNG', nameX, y + 6, 14, 14, undefined, 'FAST');
      nameX += 18;
    } catch {}
  }

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(16);
  pdf.setTextColor(slate.r, slate.g, slate.b);
  const hospitalName = String(settings.name || 'Hospital');
  pdf.text(hospitalName, nameX, y + 13);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.setTextColor(gray.r, gray.g, gray.b);
  pdf.text(String(settings.address || ''), nameX, y + 18);

  const drX = W - marginX - 8;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(14);
  pdf.setTextColor(slate.r, slate.g, slate.b);
  pdf.text(`Dr. ${String(doctor.name || '-')}`, drX, y + 18, { align: 'right' });

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.setTextColor(gray.r, gray.g, gray.b);
  pdf.text(String(doctor.qualification || ''), drX, y + 25, { align: 'right' });

  if (doctor.specialization) {
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(blue.r, blue.g, blue.b);
    pdf.text(doctor.specialization, drX, y + 31, { align: 'right' });
  }

  y += headerH + 10;

  // TITLE
  pdf.setFillColor(blue.r, blue.g, blue.b);
  pdf.rect(marginX, y, W - 2 * marginX, 8, 'F');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(12);
  pdf.setTextColor(255, 255, 255);
  pdf.text('PRE-ANESTHESIA CLEARANCE / ASSESSMENT', W / 2, y + 5.5, { align: 'center' });
  y += 14;

  // 2. PATIENT INFO
  pdf.setTextColor(slate.r, slate.g, slate.b);
  pdf.setFontSize(9);
  
  const drawRow = (label1: string, val1: string, label2: string, val2: string, yy: number) => {
    pdf.setFont('helvetica', 'bold');
    pdf.text(label1, marginX, yy);
    pdf.setFont('helvetica', 'normal');
    pdf.text(val1 || '-', marginX + 25, yy);

    pdf.setFont('helvetica', 'bold');
    pdf.text(label2, W / 2, yy);
    pdf.setFont('helvetica', 'normal');
    pdf.text(val2 || '-', W / 2 + 25, yy);
  };

  drawRow('Patient Name:', String(patient.name), 'MR Number:', String(patient.mrn), y);
  y += 6;
  drawRow('Age / Gender:', `${patient.age || '-'} / ${patient.gender || '-'}`, 'Date:', dt.toLocaleDateString(), y);
  y += 10;

  // 3. VITALS
  const v = data.vitals || {};
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.setTextColor(blue.r, blue.g, blue.b);
  pdf.text('CURRENT VITALS', marginX, y);
  y += 5;
  pdf.setDrawColor(lightBlue.r, lightBlue.g, lightBlue.b);
  pdf.line(marginX, y, W - marginX, y);
  y += 6;

  pdf.setFontSize(9);
  pdf.setTextColor(slate.r, slate.g, slate.b);
  const bp = v.bloodPressureSys && v.bloodPressureDia ? `${v.bloodPressureSys}/${v.bloodPressureDia}` : '-';
  const vitalsText = `BP: ${bp} mmHg  |  Pulse: ${v.pulse || '-'} bpm  |  Temp: ${v.temperatureC || '-'} °C  |  SpO2: ${v.spo2 || '-'}%  |  Weight: ${v.weightKg || '-'} kg`;
  pdf.text(vitalsText, marginX, y);
  y += 12;

  // 4. SYSTEMIC HISTORY
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.setTextColor(blue.r, blue.g, blue.b);
  pdf.text('SYSTEMIC HISTORY', marginX, y);
  y += 5;
  pdf.line(marginX, y, W - marginX, y);
  y += 6;

  pdf.setFontSize(9);
  pdf.setTextColor(slate.r, slate.g, slate.b);
  const hist = data.preAnesthesia.history;
  const historyItems = [
    { l: 'CVS:', v: hist.cvs },
    { l: 'Respiratory:', v: hist.respiratory },
    { l: 'Renal:', v: hist.renal },
    { l: 'Hepatic:', v: hist.hepatic },
    { l: 'Diabetic:', v: hist.diabetic },
    { l: 'Neurology:', v: hist.neurology },
    { l: 'Prev. Anesthesia:', v: hist.previousAnesthesia },
    { l: 'Allergies:', v: hist.allergies },
  ];

  historyItems.forEach((item, idx) => {
    const col = idx % 2 === 0 ? marginX : W / 2;
    const rowY = y + Math.floor(idx / 2) * 6;
    pdf.setFont('helvetica', 'bold');
    pdf.text(item.l, col, rowY);
    pdf.setFont('helvetica', 'normal');
    pdf.text(item.v || 'No significant history', col + 30, rowY);
  });
  y += Math.ceil(historyItems.length / 2) * 6 + 10;

  // 5. PHYSICAL EXAMINATION
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.setTextColor(blue.r, blue.g, blue.b);
  pdf.text('PHYSICAL EXAMINATION', marginX, y);
  y += 5;
  pdf.line(marginX, y, W - marginX, y);
  y += 6;

  const exam = data.preAnesthesia.examination;
  pdf.setFontSize(9);
  pdf.setTextColor(slate.r, slate.g, slate.b);
  
  pdf.setFont('helvetica', 'bold');
  pdf.text('Mallampati Score:', marginX, y);
  pdf.setFont('helvetica', 'normal');
  pdf.text(exam.mallampatiScore || '-', marginX + 35, y);

  pdf.setFont('helvetica', 'bold');
  pdf.text('ASA Class:', W / 2, y);
  pdf.setFont('helvetica', 'normal');
  pdf.text(exam.asaClass || '-', W / 2 + 35, y);
  y += 8;

  pdf.setFont('helvetica', 'bold');
  pdf.text('Airway:', marginX, y);
  pdf.setFont('helvetica', 'normal');
  const airwayLines = pdf.splitTextToSize(exam.airway || '-', W - marginX - 35);
  pdf.text(airwayLines, marginX + 35, y);
  y += airwayLines.length * 5 + 3;

  pdf.setFont('helvetica', 'bold');
  pdf.text('Teeth:', marginX, y);
  pdf.setFont('helvetica', 'normal');
  pdf.text(exam.teeth || '-', marginX + 35, y);
  y += 8;

  if (exam.notes) {
    pdf.setFont('helvetica', 'bold');
    pdf.text('Exam Notes:', marginX, y);
    pdf.setFont('helvetica', 'normal');
    const noteLines = pdf.splitTextToSize(exam.notes, W - marginX - 35);
    pdf.text(noteLines, marginX + 35, y);
    y += noteLines.length * 5 + 3;
  }
  y += 5;

  // 6. RECOMMENDATION
  pdf.setFillColor(skyBg.r, skyBg.g, skyBg.b);
  pdf.roundedRect(marginX, y, W - 2 * marginX, 30, 2, 2, 'F');
  y += 6;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.setTextColor(blue.r, blue.g, blue.b);
  pdf.text('FINAL RECOMMENDATION / CLEARANCE', marginX + 4, y);
  y += 6;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.setTextColor(slate.r, slate.g, slate.b);
  const recLines = pdf.splitTextToSize(data.preAnesthesia.recommendation || 'No recommendation provided.', W - 2 * marginX - 10);
  pdf.text(recLines, marginX + 6, y);

  // FOOTER SIGNATURE
  const footerY = H - 30;
  pdf.setDrawColor(slate.r, slate.g, slate.b);
  pdf.line(W - 60, footerY, W - marginX, footerY);
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Consultant Signature', W - 60, footerY + 5);
  pdf.setFont('helvetica', 'bold');
  pdf.text(`Dr. ${doctor.name || '-'}`, W - 60, footerY + 10);

  // NOT VALID BAR
  const nvY = H - 15;
  pdf.setFillColor(255, 241, 242);
  pdf.roundedRect(marginX, nvY, W - 2 * marginX, 7, 1, 1, 'F');
  pdf.setTextColor(185, 28, 28);
  pdf.setFontSize(8);
  pdf.text('⚠ THIS IS A CLINICAL ASSESSMENT AND NOT VALID FOR COURT PURPOSES ⚠', W / 2, nvY + 4.5, { align: 'center' });

  // Output
  try {
    const api = (window as any).electronAPI;
    if (api && typeof api.printPreviewPdf === 'function') {
      const dataUrl = pdf.output('datauristring');
      await api.printPreviewPdf(dataUrl);
      return;
    }
  } catch {}

  const blob = pdf.output('blob');
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
}

async function ensurePngDataUrl(src: string): Promise<string> {
  try {
    if (/^data:image\/(png|jpeg|jpg)/i.test(src)) return src;
    return await new Promise<string>((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth || img.width || 200;
          canvas.height = img.naturalHeight || img.height || 200;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0);
          const out = canvas.toDataURL('image/png');
          resolve(out || src);
        } catch { resolve(src); }
      };
      img.onerror = () => resolve(src);
      img.src = src;
    });
  } catch { return src; }
}
