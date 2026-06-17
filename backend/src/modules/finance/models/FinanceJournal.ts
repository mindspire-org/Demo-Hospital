import { Schema, model, models } from 'mongoose'

const JournalLineSchema = new Schema({
  account: { type: String, required: true },
  debit: { type: Number, default: 0 },
  credit: { type: Number, default: 0 },
  tags: { type: Schema.Types.Mixed },
}, { _id: false })

const JournalSchema = new Schema({
  dateIso: { type: String, required: true, index: true },
  module: { type: String, index: true },                        // 'opd'|'er'|'ipd'|'lab'|'pharmacy'|'diagnostic'|'dialysis'|'aesthetic'|'general'
  refType: { type: String, index: true },
  refId: { type: String, index: true },
  memo: { type: String },
  lines: { type: [JournalLineSchema], default: [] },
  status: { type: String, default: 'active', index: true }, // 'active' or 'reversed'
  reversedAt: { type: String }, // ISO timestamp when reversed
}, { timestamps: true })

export type JournalLine = {
  account: string
  debit?: number
  credit?: number
  tags?: any
}

export type JournalDoc = {
  _id: string
  dateIso: string
  module?: string
  refType?: string
  refId?: string
  memo?: string
  lines: JournalLine[]
}

export const FinanceJournal = models.Hospital_Finance_Journal || model('Hospital_Finance_Journal', JournalSchema)
