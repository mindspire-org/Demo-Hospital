import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export interface PDFOrderData {
  poNumber?: string;
  date?: string;
  expectedDeliveryDate?: string;
  supplierName?: string;
  supplierCustom?: string;
  contactPhone?: string;
  contactEmail?: string;
  companyName?: string;
  companyCustom?: string;
  shippingAddress?: string;
  notes?: string;
  terms?: string;
  status?: string;
  total?: number;
  items?: Array<{
    name: string;
    category?: string;
    quantity: number;
    unit: string;
  }>;
}

export interface PDFPharmacyInfo {
  name: string;
  phone: string;
  address: string;
  logo?: string;
  poSlipText?: string;
}

export const downloadPurchaseOrderPDF = (
  order: PDFOrderData,
  pharmacyInfo: PDFPharmacyInfo,
) => {
  const doc = new jsPDF();

  const formatDatePDF = (dateStr?: string) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Header
  doc.setFontSize(22);
  doc.setTextColor(30, 64, 175); // blue-800
  doc.text(pharmacyInfo.name, 14, 20);

  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139); // slate-500
  if (pharmacyInfo.address) doc.text(pharmacyInfo.address, 14, 28);
  if (pharmacyInfo.phone) doc.text(`Phone: ${pharmacyInfo.phone}`, 14, 34);

  doc.setFontSize(18);
  doc.setTextColor(30, 41, 59); // slate-800
  doc.text("PURCHASE ORDER", 196, 20, { align: "right" });

  doc.setFontSize(16);
  doc.setTextColor(30, 64, 175); // blue-800
  doc.text(order.poNumber || "DRAFT", 196, 28, { align: "right" });

  doc.setDrawColor(30, 64, 175);
  doc.setLineWidth(1);
  doc.line(14, 40, 196, 40);

  // Supplier & Company Info
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text("SUPPLIER INFORMATION", 14, 50);
  doc.setTextColor(30, 41, 59);
  doc.setFont("helvetica", "bold");
  doc.text(order.supplierName || order.supplierCustom || "N/A", 14, 56);
  doc.setFont("helvetica", "normal");
  if (order.contactPhone) doc.text(order.contactPhone, 14, 62);
  if (order.contactEmail) doc.text(order.contactEmail, 14, 68);

  if (order.companyName || order.companyCustom) {
    doc.setTextColor(100, 116, 139);
    doc.text("COMPANY INFORMATION", 110, 50);
    doc.setTextColor(30, 41, 59);
    doc.setFont("helvetica", "bold");
    const companyText = order.companyName || order.companyCustom || "";
    doc.text(companyText, 110, 56);
    doc.setFont("helvetica", "normal");
  }

  // Dates & Addresses
  doc.setTextColor(100, 116, 139);
  doc.text("ORDER DETAILS", 14, 80);
  doc.setTextColor(30, 41, 59);
  doc.text(`Order Date: ${formatDatePDF(order.date)}`, 14, 86);
  doc.text(
    `Expected Delivery: ${formatDatePDF(order.expectedDeliveryDate)}`,
    14,
    92,
  );

  doc.setTextColor(100, 116, 139);
  doc.text("DELIVERY ADDRESS", 110, 80);
  doc.setTextColor(30, 41, 59);
  const addressText = order.shippingAddress || "Same as billing address";
  const splitAddress = doc.splitTextToSize(addressText, 86);
  doc.text(splitAddress, 110, 86);

  // Items Table
  const items = order.items || [];
  const tableData = items.map((item, idx) => [
    idx + 1,
    item.name,
    item.category || "-",
    item.quantity,
    item.unit,
  ]);

  autoTable(doc, {
    startY: 105,
    head: [["#", "Item Name", "Category", "Qty", "Unit"]],
    body: tableData,
    theme: "striped",
    headStyles: { fillColor: [30, 64, 175], textColor: 255 },
    styles: { fontSize: 9 },
  });

  const finalY = (doc as any).lastAutoTable.finalY || 150;

  // Notes & Terms
  if (order.notes) {
    doc.setTextColor(100, 116, 139);
    doc.text("NOTES", 14, finalY + 15);
    doc.setTextColor(30, 41, 59);
    const notesText = order.notes || "";
    const splitNotes = doc.splitTextToSize(notesText, 180);
    doc.text(splitNotes, 14, finalY + 21);
  }

  if (order.terms) {
    const termsY = order.notes ? finalY + 40 : finalY + 15;
    doc.setTextColor(100, 116, 139);
    doc.text("TERMS & CONDITIONS", 14, termsY);
    doc.setTextColor(30, 41, 59);
    const termsText = order.terms || "";
    const splitTerms = doc.splitTextToSize(termsText, 180);
    doc.text(splitTerms, 14, termsY + 6);
  }

  // PO Slip Text (from settings)
  if (pharmacyInfo.poSlipText) {
    const notesOffset = order.notes ? 40 : 0;
    const termsOffset = order.terms ? 25 : 0;
    const slipY = finalY + 15 + notesOffset + termsOffset;
    doc.setTextColor(100, 116, 139);
    doc.text("TERMS & INSTRUCTIONS", 14, slipY);
    doc.setTextColor(30, 41, 59);
    const splitSlip = doc.splitTextToSize(pharmacyInfo.poSlipText, 180);
    doc.text(splitSlip, 14, slipY + 6);
  }

  // Watermark
  if (order.status === "draft") {
    doc.setTextColor(220, 38, 38);
    doc.setFontSize(60);
    doc.saveGraphicsState();
    doc.setGState(new (doc as any).GState({ opacity: 0.1 }));
    doc.text("DRAFT", 105, 150, { align: "center", angle: 45 });
    doc.restoreGraphicsState();
  }

  // Save
  doc.save(`PO-${order.poNumber || "Draft"}-${new Date().getTime()}.pdf`);
};
