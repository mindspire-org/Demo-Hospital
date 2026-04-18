import { Schema, model, models } from 'mongoose'

const CounterSchema = new Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
}, { timestamps: true, collection: 'indoorpharmacy_counters' })

export type PharmacyCounterDoc = { _id: string; seq: number }

export const PharmacyCounter = models.IndoorPharmacy_Counter || model('IndoorPharmacy_Counter', CounterSchema)
