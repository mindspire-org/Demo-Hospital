import { Schema, model, models } from 'mongoose'

const SchemaDef = new Schema({
  invoiceNo: { type: String, default: '' },
  invoiceDate: { type: String, default: '' },
  supplierId: { type: String },
  supplierName: { type: String },
  companyId: { type: String },
  companyName: { type: String },
  items: { type: Array, default: [] },
  invoiceTaxes: { type: Array, default: [] },
  discount: { type: Number, default: 0 },
  createdAtIso: { type: String, default: () => new Date().toISOString() },
}, { timestamps: true, collection: 'lab_hold_purchase_invoices' })

export const LabHoldPurchaseInvoice = models?.LabHoldPurchaseInvoice || model('LabHoldPurchaseInvoice', SchemaDef)
