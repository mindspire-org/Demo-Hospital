import { useEffect, useRef, useState } from "react";
import {
  X,
  Printer,
  FileText,
  Building2,
  Truck,
  Phone,
  Mail,
  Calendar,
  MapPin,
  Download,
} from "lucide-react";
import type { PurchaseOrder } from "./pharmacy_CreatePurchaseOrderDialog";
import { pharmacyApi } from "../../utils/api";
import { downloadPurchaseOrderPDF } from "../../utils/pharmacy_PDFGenerator";

type Props = {
  order: PurchaseOrder | null;
  open: boolean;
  onClose: () => void;
};

export default function Pharmacy_PurchaseOrderPDF({
  order,
  open,
  onClose,
}: Props) {
  const printRef = useRef<HTMLDivElement>(null);
  const [pharmacyInfo, setPharmacyInfo] = useState<{
    name: string;
    phone: string;
    address: string;
    logo: string;
    poSlipText: string;
  }>({
    name: "PHARMACY",
    phone: "",
    address: "",
    logo: "",
    poSlipText: "",
  });

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const s = await pharmacyApi.getSettings();
        if (!mounted) return;
        setPharmacyInfo({
          name: s.pharmacyName || "PHARMACY",
          phone: s.phone || "",
          address: s.address || "",
          logo: s.logoDataUrl || "",
          poSlipText: s.poSlipText || "",
        });
      } catch (e) {
        console.error(e);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow || !order) return;

    const formatDatePrint = (dateStr?: string) => {
      if (!dateStr) return "-";
      const date = new Date(dateStr);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    };

    // Inline SVG icons
    const icons = {
      truck: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>`,
      building: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>`,
      calendar: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/></svg>`,
      mapPin: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>`,
      phone: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`,
      mail: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>`,
    };

    const supplierInfo = `
      <div class="bg-slate-50 rounded-lg p-2">
        <h4 class="text-xs font-semibold text-slate-500 uppercase mb-1" style="display: flex; align-items: center; gap: 8px;">
          ${icons.truck}
          Supplier Information
        </h4>
        <div class="text-sm space-y-0-5">
          <p style="font-weight: 600; color: #1e293b;">${order.supplierName || order.supplierCustom || "N/A"}</p>
          ${order.contactPhone ? `<p class="text-slate-600" style="display: flex; align-items: center; gap: 4px; font-size: 14px; color: #475569;">${icons.phone} ${order.contactPhone}</p>` : ""}
          ${order.contactEmail ? `<p class="text-slate-600" style="display: flex; align-items: center; gap: 4px; font-size: 14px; color: #475569;">${icons.mail} ${order.contactEmail}</p>` : ""}
        </div>
      </div>
    `;

    const companyInfo =
      order.companyName || order.companyCustom
        ? `
      <div class="bg-slate-50 rounded-lg p-2">
        <h4 class="text-xs font-semibold text-slate-500 uppercase mb-1" style="display: flex; align-items: center; gap: 8px;">
          ${icons.building}
          Company Information
        </h4>
        <div class="text-sm space-y-0-5">
          <p style="font-weight: 600; color: #1e293b;">${order.companyName || order.companyCustom}</p>
        </div>
      </div>
    `
        : "";

    const itemsRows =
      order.items
        ?.map(
          (item, idx) => `
      <tr>
        <td style="padding: 8px 12px; text-align: left; border-bottom: 1px solid #e2e8f0; font-size: 14px;">${idx + 1}</td>
        <td style="padding: 8px 12px; text-align: left; border-bottom: 1px solid #e2e8f0; font-size: 14px; font-weight: 500;">${item.name}</td>
        <td style="padding: 8px 12px; text-align: left; border-bottom: 1px solid #e2e8f0; font-size: 14px; color: #64748b;">${item.category || "-"}</td>
        <td style="padding: 8px 12px; text-align: center; border-bottom: 1px solid #e2e8f0; font-size: 14px;">${item.quantity}</td>
        <td style="padding: 8px 12px; text-align: center; border-bottom: 1px solid #e2e8f0; font-size: 14px;">${item.unit}</td>
      </tr>
    `,
        )
        .join("") || "";

    const notesSection = order.notes
      ? `
      <div>
        <h4 class="text-xs font-semibold text-slate-500 uppercase mb-1">Notes</h4>
        <p class="text-sm text-slate-600 bg-slate-50 rounded-lg p-2" style="font-size: 14px; color: #475569; background: #f8fafc; border-radius: 8px; padding: 8px;">${order.notes}</p>
      </div>
    `
      : "";

    const termsSection = order.terms
      ? `
      <div>
        <h4 class="text-xs font-semibold text-slate-500 uppercase mb-1">Terms & Conditions</h4>
        <p class="text-sm text-slate-600 bg-slate-50 rounded-lg p-2" style="font-size: 14px; color: #475569; background: #f8fafc; border-radius: 8px; padding: 8px;">${order.terms}</p>
      </div>
    `
      : "";

    const watermark =
      order.status === "draft"
        ? `
      <div style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; pointer-events: none; opacity: 0.1;">
        <span style="font-size: 96px; font-weight: 700; color: #dc2626; transform: rotate(45deg);">DRAFT</span>
      </div>
    `
        : "";

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Purchase Order - ${order.poNumber || ""}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
            * { box-sizing: border-box; }
            body { 
              margin: 0; 
              padding: 0; 
              font-family: 'Inter', ui-sans-serif, system-ui, sans-serif; 
              line-height: 1.5; 
              color: #1e293b;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            @page { size: A4; margin: 0; }
            @media print {
              body { margin: 0; padding: 0; }
              .page { box-shadow: none !important; }
            }
            .page {
              width: 210mm;
              min-height: 297mm;
              margin: 0 auto;
              background: white;
              padding: 32px;
              position: relative;
              display: flex;
              flex-direction: column;
            }
            .content { flex: 1; }
            .footer { margin-top: auto; }
            table { width: 100%; border-collapse: collapse; }
            th { 
              padding: 8px 12px; 
              text-align: left; 
              border-bottom: 1px solid #e2e8f0; 
              background: #f8fafc; 
              font-weight: 600; 
              font-size: 12px; 
              text-transform: uppercase; 
              color: #64748b;
            }
            td { 
              padding: 8px 12px; 
              text-align: left; 
              border-bottom: 1px solid #e2e8f0; 
              font-size: 14px; 
            }
            .text-left { text-align: left; }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
            .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 24px; }
            .flex { display: flex; }
            .items-start { align-items: flex-start; }
            .items-center { align-items: center; }
            .justify-between { justify-content: space-between; }
            .gap-4 { gap: 16px; }
            .gap-2 { gap: 8px; }
            .mb-8 { margin-bottom: 32px; }
            .mb-4 { margin-bottom: 16px; }
            .mb-2 { margin-bottom: 8px; }
            .mt-1 { margin-top: 4px; }
            .mt-auto { margin-top: auto; }
            .pt-6 { padding-top: 24px; }
            .pb-6 { padding-bottom: 24px; }
            .p-4 { padding: 16px; }
            .p-3 { padding: 12px; }
            .p-2 { padding: 8px; }
            .border-b-2 { border-bottom: 2px solid #1e40af; }
            .border-t { border-top: 1px solid #e2e8f0; }
            .rounded-lg { border-radius: 8px; }
            .bg-slate-50 { background: #f8fafc; }
            .text-xs { font-size: 12px; }
            .text-sm { font-size: 14px; }
            .text-lg { font-size: 18px; }
            .text-xl { font-size: 20px; }
            .text-2xl { font-size: 24px; }
            .font-semibold { font-weight: 600; }
            .font-bold { font-weight: 700; }
            .font-medium { font-weight: 500; }
            .text-slate-500 { color: #64748b; }
            .text-slate-600 { color: #475569; }
            .text-slate-800 { color: #1e293b; }
            .text-slate-400 { color: #94a3b8; }
            .text-slate-700 { color: #334155; }
            .text-blue-800 { color: #1e40af; }
            .uppercase { text-transform: uppercase; }
            .h-px { height: 1px; background: #cbd5e1; }
            .my-3 { margin: 12px 0; }
            .my-4 { margin: 16px 0; }
            .space-y-0-5 > * + * { margin-top: 2px; }
            .space-y-1 > * + * { margin-top: 4px; }
            .space-y-2 > * + * { margin-top: 8px; }
            .space-y-3 > * + * { margin-top: 12px; }
            .mb-1 { margin-bottom: 4px; }
            .w-16 { width: 64px; }
            .h-16 { height: 64px; }
            .object-contain { object-fit: contain; }
            .rounded { border-radius: 8px; }
          </style>
        </head>
        <body>
          <div class="page">
            <div class="content">
              <!-- Letterhead -->
              <div class="mb-6 border-b-2 pb-4">
                <div class="flex justify-between items-start">
                  <div class="flex items-start gap-4">
                    ${pharmacyInfo.logo ? `<img src="${pharmacyInfo.logo}" alt="Logo" class="w-16 h-16 object-contain rounded" />` : ""}
                    <div>
                      <h1 class="text-2xl font-bold text-blue-800">${pharmacyInfo.name}</h1>
                      ${pharmacyInfo.address ? `<p class="text-sm text-slate-500 mt-1">${pharmacyInfo.address}</p>` : ""}
                      ${pharmacyInfo.phone ? `<p class="text-sm text-slate-500">Phone: ${pharmacyInfo.phone}</p>` : ""}
                    </div>
                  </div>
                  <div style="text-align: right;">
                    <p class="text-xl font-bold text-slate-800">PURCHASE ORDER</p>
                    <p class="text-lg font-bold text-blue-800 mt-1">${order.poNumber || "DRAFT"}</p>
                  </div>
                </div>
              </div>

              <!-- Order Info Grid -->
              <div class="grid-2 mb-6">
                ${supplierInfo}
                ${companyInfo}
              </div>

              <!-- Dates & Addresses -->
              <div class="grid-2 mb-6">
                <div class="space-y-2">
                  <h4 class="text-xs font-semibold text-slate-500 uppercase flex items-center gap-2">
                    ${icons.calendar}
                    Order Details
                  </h4>
                  <div class="text-sm space-y-1">
                    <p><span class="text-slate-500">Order Date:</span> ${formatDatePrint(order.date)}</p>
                    <p><span class="text-slate-500">Expected Delivery:</span> ${formatDatePrint(order.expectedDeliveryDate)}</p>
                  </div>
                </div>
                <div class="space-y-2">
                  <h4 class="text-xs font-semibold text-slate-500 uppercase flex items-center gap-2">
                    ${icons.mapPin}
                    Delivery Address
                  </h4>
                  <p class="text-sm text-slate-600">${order.shippingAddress || "Same as billing address"}</p>
                </div>
              </div>

              <!-- Items Table -->
              <div class="mb-6">
                <h4 class="text-xs font-semibold text-slate-500 uppercase mb-2">Order Items</h4>
                <table>
                  <thead>
                    <tr>
                      <th class="text-left">#</th>
                      <th class="text-left">Item Name</th>
                      <th class="text-left">Category</th>
                      <th class="text-center">Qty</th>
                      <th class="text-center">Unit</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${itemsRows}
                  </tbody>
                </table>
              </div>

              <!-- Notes & Terms -->
              ${notesSection || termsSection ? `<div class="grid-2 mb-6">${notesSection}${termsSection}</div>` : ""}

              <!-- PO Slip Text -->
              ${
                pharmacyInfo.poSlipText
                  ? `
              <div style="margin-bottom: 24px; padding: 12px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
                <h4 style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.1em; margin: 0 0 6px 0;">Terms &amp; Instructions</h4>
                <p style="font-size: 13px; color: #334155; white-space: pre-wrap; line-height: 1.6; margin: 0;">${pharmacyInfo.poSlipText}</p>
              </div>`
                  : ""
              }
            </div>

            <!-- Footer -->
            <div class="footer pt-4 border-t">
              <div class="grid-3" style="text-align: center;">
                <div>
                  <p class="text-xs text-slate-400 uppercase mb-1">Authorized By</p>
                  <div class="h-px my-3"></div>
                  <p class="text-sm font-medium text-slate-700">Signature</p>
                </div>
                <div>
                  <p class="text-xs text-slate-400 uppercase mb-1">Date</p>
                  <div class="h-px my-3"></div>
                  <p class="text-sm font-medium text-slate-700">${formatDatePrint(new Date().toISOString())}</p>
                </div>
                <div>
                  <p class="text-xs text-slate-400 uppercase mb-1">Stamp</p>
                  <div class="h-px my-3"></div>
                  <p class="text-sm font-medium text-slate-700">Official Seal</p>
                </div>
              </div>
            </div>

            ${watermark}
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  const handleDownload = () => {
    if (!order) return;
    downloadPurchaseOrderPDF(order, pharmacyInfo);
  };

  if (!open || !order) return null;

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-4">
      <div className="relative flex h-[95vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-blue-800 to-blue-900 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">
                Purchase Order
              </h3>
              <p className="text-sm text-blue-100">
                {order.poNumber || "Draft"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="inline-flex items-center gap-2 rounded-lg bg-white/20 px-4 py-2 text-sm font-medium text-white hover:bg-white/30 transition-colors"
            >
              <Download className="h-4 w-4" />
              Download
            </button>
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 rounded-lg bg-white/20 px-4 py-2 text-sm font-medium text-white hover:bg-white/30 transition-colors"
            >
              <Printer className="h-4 w-4" />
              Print
            </button>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-white/80 hover:bg-white/20 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* PDF Content */}
        <div className="flex-1 overflow-y-auto bg-slate-100 p-6">
          <div
            ref={printRef}
            className="mx-auto max-w-[210mm] bg-white p-8 shadow-lg flex flex-col"
            style={{ minHeight: "297mm" }}
          >
            <div className="flex-1">
              {/* Letterhead */}
              <div className="mb-6 border-b-2 border-blue-800 pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    {pharmacyInfo.logo && (
                      <img
                        src={pharmacyInfo.logo}
                        alt="Logo"
                        className="h-16 w-16 object-contain rounded-lg"
                      />
                    )}
                    <div>
                      <h1 className="text-2xl font-bold text-blue-800">
                        {pharmacyInfo.name}
                      </h1>
                      {pharmacyInfo.address && (
                        <p className="text-sm text-slate-500 mt-1">
                          {pharmacyInfo.address}
                        </p>
                      )}
                      {pharmacyInfo.phone && (
                        <p className="text-sm text-slate-500">
                          Phone: {pharmacyInfo.phone}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-slate-800">
                      PURCHASE ORDER
                    </p>
                    <p className="text-lg font-bold text-blue-800 mt-1">
                      {order.poNumber || "DRAFT"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Order Info Grid */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                {/* Supplier Info */}
                <div className="bg-slate-50 rounded-lg p-2">
                  <h4 className="text-xs font-semibold text-slate-500 uppercase mb-1 flex items-center gap-2">
                    <Truck className="h-4 w-4" />
                    Supplier Information
                  </h4>
                  <div className="space-y-0.5">
                    <p className="font-semibold text-slate-800">
                      {order.supplierName || order.supplierCustom || "N/A"}
                    </p>
                    {order.contactPhone && (
                      <p className="text-sm text-slate-600 flex items-center gap-1">
                        <Phone className="h-3.5 w-3.5" />
                        {order.contactPhone}
                      </p>
                    )}
                    {order.contactEmail && (
                      <p className="text-sm text-slate-600 flex items-center gap-1">
                        <Mail className="h-3.5 w-3.5" />
                        {order.contactEmail}
                      </p>
                    )}
                  </div>
                </div>

                {/* Company Info */}
                {(order.companyName || order.companyCustom) && (
                  <div className="bg-slate-50 rounded-lg p-2">
                    <h4 className="text-xs font-semibold text-slate-500 uppercase mb-1 flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      Company Information
                    </h4>
                    <div className="space-y-0.5">
                      <p className="font-semibold text-slate-800">
                        {order.companyName || order.companyCustom}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Dates & Addresses */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Order Details
                  </h4>
                  <div className="text-sm space-y-1">
                    <p>
                      <span className="text-slate-500">Order Date:</span>{" "}
                      {formatDate(order.date)}
                    </p>
                    <p>
                      <span className="text-slate-500">Expected Delivery:</span>{" "}
                      {formatDate(order.expectedDeliveryDate)}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Delivery Address
                  </h4>
                  <p className="text-sm text-slate-600">
                    {order.shippingAddress || "Same as billing address"}
                  </p>
                </div>
              </div>

              {/* Items Table */}
              <div className="mb-6">
                <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2">
                  Order Items
                </h4>
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="text-left">#</th>
                      <th className="text-left">Item Name</th>
                      <th className="text-left">Category</th>
                      <th className="text-center">Qty</th>
                      <th className="text-center">Unit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.items?.map((item, idx) => (
                      <tr key={idx}>
                        <td>{idx + 1}</td>
                        <td className="font-medium">{item.name}</td>
                        <td className="text-slate-500">
                          {item.category || "-"}
                        </td>
                        <td className="text-center">{item.quantity}</td>
                        <td className="text-center">{item.unit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Notes & Terms */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                {order.notes && (
                  <div>
                    <h4 className="text-xs font-semibold text-slate-500 uppercase mb-1">
                      Notes
                    </h4>
                    <p className="text-sm text-slate-600 bg-slate-50 rounded-lg p-2">
                      {order.notes}
                    </p>
                  </div>
                )}
                {order.terms && (
                  <div>
                    <h4 className="text-xs font-semibold text-slate-500 uppercase mb-1">
                      Terms & Conditions
                    </h4>
                    <p className="text-sm text-slate-600 bg-slate-50 rounded-lg p-2">
                      {order.terms}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* PO Slip Text */}
            {pharmacyInfo.poSlipText && (
              <div className="mb-6 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <h4 className="mb-1 text-[11px] font-bold uppercase tracking-widest text-slate-500">
                  Terms &amp; Instructions
                </h4>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                  {pharmacyInfo.poSlipText}
                </p>
              </div>
            )}

            {/* Footer - Always at bottom */}
            <div className="mt-auto pt-4 border-t border-slate-200">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-xs text-slate-400 uppercase mb-1">
                    Authorized By
                  </p>
                  <div className="h-px bg-slate-300 my-3" />
                  <p className="text-sm font-medium text-slate-700">
                    Signature
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase mb-1">Date</p>
                  <div className="h-px bg-slate-300 my-3" />
                  <p className="text-sm font-medium text-slate-700">
                    {formatDate(new Date().toISOString())}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase mb-1">Stamp</p>
                  <div className="h-px bg-slate-300 my-3" />
                  <p className="text-sm font-medium text-slate-700">
                    Official Seal
                  </p>
                </div>
              </div>
            </div>

            {/* Watermark for draft */}
            {order.status === "draft" && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-10">
                <span className="text-8xl font-bold text-red-600 rotate-45">
                  DRAFT
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
