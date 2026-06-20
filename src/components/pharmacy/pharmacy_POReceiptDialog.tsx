import { useEffect, useState, useRef } from "react";
import { pharmacyApi } from "../../utils/api";
import { type PurchaseOrder } from "./pharmacy_CreatePurchaseOrderDialog";

type Props = {
  open: boolean;
  onClose: () => void;
  order: PurchaseOrder | null;
  autoPrint?: boolean;
};

export default function Pharmacy_POReceiptDialog({
  open,
  onClose,
  order,
  autoPrint,
}: Props) {
  const receiptRef = useRef<HTMLDivElement>(null);
  const [info, setInfo] = useState({
    name: "PHARMACY",
    phone: "",
    address: "",
    footer: "Thank you for your business!",
    logo: "",
    license: "",
    email: "",
  });

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const s = await pharmacyApi.getSettings();
        if (!mounted) return;
        setInfo({
          name: s.poThermalName || s.pharmacyName || "PHARMACY",
          phone: s.poThermalPhone || s.phone || "",
          address: s.poThermalAddress || s.address || "",
          footer:
            s.poThermalBottomLine ||
            s.billingFooter ||
            "Thank you for your business!",
          logo: s.logoDataUrl || "",
          license: s.license || "",
          email: s.email || "",
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
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if ((e.ctrlKey || e.metaKey) && (e.key === "p" || e.key === "P")) {
        e.preventDefault();
        window.print();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open || !autoPrint) return;
    const t = setTimeout(() => {
      try {
        window.print();
      } catch {}
    }, 150);
    return () => clearTimeout(t);
  }, [open, autoPrint]);

  const handleDownload = () => {
    window.print();
  };

  if (!open || !order) return null;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        
        #po-receipt { 
          font-family: 'Inter', sans-serif; 
          color: #000; 
          width: 80mm; 
          padding: 6mm 4mm;
          background: #fff;
          margin: 0 auto;
        }

        @media print {
          @page { size: 80mm auto; margin: 0; }
          body * { visibility: hidden !important; }
          #po-receipt, #po-receipt * { visibility: visible !important; }
          #po-receipt { 
            position: absolute !important; 
            left: 0; 
            top: 0; 
            width: 80mm !important; 
            margin: 0 !important; 
            padding: 6mm 4mm !important;
          }
          .no-print { display: none !important; }
        }

        .receipt-header { 
          text-align: center; 
          margin-bottom: 4mm; 
        }

        .pharmacy-logo { 
          max-height: 18mm; 
          margin-bottom: 3mm; 
          filter: grayscale(100%) contrast(1.2);
        }

        .pharmacy-name { 
          font-size: 1.3rem; 
          font-weight: 800; 
          text-transform: uppercase;
          margin-bottom: 1mm;
          letter-spacing: 0.8px;
          line-height: 1.1;
        }

        .pharmacy-info { 
          font-size: 0.8rem; 
          color: #000; 
          line-height: 1.4;
          font-weight: 500;
        }

        .divider { 
          border-top: 1.5px solid #000; 
          margin: 4mm 0; 
        }

        .title { 
          text-align: center; 
          font-weight: 800; 
          text-transform: uppercase; 
          font-size: 1rem; 
          margin: 5mm 0;
          letter-spacing: 1.5px;
          border: 1px solid #000;
          padding: 1.5mm 0;
        }

        .info-section {
          margin-bottom: 5mm;
          border-bottom: 1px solid #000;
          padding-bottom: 3mm;
        }

        .info-row { 
          display: flex; 
          justify-content: space-between; 
          font-size: 0.85rem; 
          margin-bottom: 1.5mm; 
          line-height: 1.2;
        }

        .info-label {
          color: #000;
          font-weight: 600;
        }

        .info-value {
          font-weight: 700;
          text-align: right;
        }

        .items-table { 
          width: 100%; 
          border-collapse: collapse; 
          font-size: 0.9rem; 
          margin-top: 2mm; 
        }

        .items-table th { 
          text-align: left; 
          border-bottom: 2px solid #000; 
          padding: 2mm 0;
          font-weight: 800;
          text-transform: uppercase;
          font-size: 0.75rem;
        }

        .items-table td { 
          padding: 3mm 0; 
          border-bottom: 1px solid #eee; 
          vertical-align: middle;
          line-height: 1.3;
        }

        .items-table tr:last-child td {
          border-bottom: none;
        }

        .item-name {
          font-weight: 600;
          font-size: 0.9rem;
        }

        .item-qty {
          font-weight: 800;
          font-size: 1rem;
          text-align: right;
        }

        .footer { 
          text-align: center; 
          font-size: 0.8rem; 
          margin-top: 10mm; 
          font-weight: 600;
          line-height: 1.5;
        }

        .system-mark {
          margin-top: 3mm;
          font-size: 0.65rem;
          opacity: 0.8;
          font-weight: 400;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
      `}</style>

      <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 py-6 print:static print:p-0 print:bg-white">
        <div className="w-full max-w-lg overflow-hidden rounded-xl bg-white shadow-2xl print:shadow-none print:max-w-none">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 no-print">
            <div className="font-medium text-slate-900">PO Thermal Receipt</div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleDownload}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
              >
                Download
              </button>
              <button
                onClick={() => window.print()}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
              >
                Print
              </button>
              <button
                onClick={onClose}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>

          <div className="max-h-[85vh] overflow-y-auto p-8 print:p-0">
            <div id="po-receipt" ref={receiptRef}>
              <div className="receipt-header">
                {info.logo && (
                  <img src={info.logo} alt="Logo" className="pharmacy-logo" />
                )}
                <div className="pharmacy-name">{info.name}</div>
                <div className="pharmacy-info">
                  {info.address && <div>{info.address}</div>}
                  {info.phone && <div>Tel: {info.phone}</div>}
                </div>
              </div>

              <div className="divider" />
              <div className="title">Purchase Order Request</div>

              <div className="info-section">
                <div className="info-row">
                  <span className="info-label">PO Number:</span>
                  <span className="info-value">
                    {order.poNumber || "DRAFT"}
                  </span>
                </div>
                <div className="info-row">
                  <span className="info-label">Order Date:</span>
                  <span className="info-value">{order.date}</span>
                </div>
                {order.expectedDeliveryDate && (
                  <div className="info-row">
                    <span className="info-label">Exp. Delivery:</span>
                    <span className="info-value">
                      {order.expectedDeliveryDate}
                    </span>
                  </div>
                )}
                <div className="info-row">
                  <span className="info-label">Supplier:</span>
                  <span className="info-value">
                    {order.supplierName || "N/A"}
                  </span>
                </div>
                <div className="info-row">
                  <span className="info-label">Status:</span>
                  <span className="info-value capitalize">{order.status}</span>
                </div>
              </div>

              <table className="items-table">
                <thead>
                  <tr>
                    <th style={{ width: "80%" }}>Item Description</th>
                    <th style={{ width: "20%" }} className="text-right">
                      Qty
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="item-name">{item.name}</td>
                      <td className="item-qty">{item.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="footer">
                <div className="divider" />
                <div style={{ fontWeight: 600 }}>{info.footer}</div>
                <div className="system-mark">
                  Generated via HMS •{" "}
                  {new Date().toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
