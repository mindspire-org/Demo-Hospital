import { Schema, model, models } from 'mongoose'

const DialysisSessionSchema = new Schema({
  dialysisPatientId: { type: Schema.Types.ObjectId, ref: 'Dialysis_Patient', required: true, index: true },
  labPatientId: { type: Schema.Types.ObjectId, ref: 'Lab_Patient', required: true, index: true },
  tokenId: { type: Schema.Types.ObjectId, ref: 'Dialysis_Token', index: true },
  tokenNo: { type: String, index: true },

  // Technical Data
  dateIso: { type: String, index: true },
  timeStarted: { type: String },
  timeCompleted: { type: String },

  dialyzerTypeId: { type: Schema.Types.ObjectId, ref: 'Dialysis_DialyzerType' },
  dialyzerTypeName: { type: String },
  noOfUse: { type: Number },

  bloodFlowRate: { type: Number },
  dialysateFlowRate: { type: Number },
  venousPressure: { type: Number },

  heparinLoadingDose: { type: Number },
  heparinInfusion: { type: Number },

  bpPreSys: { type: Number },
  bpPreDia: { type: Number },
  bpIntraSys: { type: Number },
  bpIntraDia: { type: Number },
  bpPostSys: { type: Number },
  bpPostDia: { type: Number },

  weightDry: { type: Number },
  weightPre: { type: Number },
  weightPost: { type: Number },
  idwg: { type: Number },

  medEpo: { type: String },
  medIron: { type: String },
  medCalctriol: { type: String },
  medKtVOrUrr: { type: String },

  targetUF: { type: Number },

  dataEntryName: { type: String },
  dataEntryDesignation: { type: String },
  dataEntrySign: { type: String },

  patientProblem: { type: String },

  nephrologistName: { type: String },
  nephrologistSign: { type: String },
  nephrologistTime: { type: String },

}, { timestamps: true })

DialysisSessionSchema.index({ dialysisPatientId: 1, dateIso: 1 })

export type DialysisSessionDoc = {
  _id: string
  dialysisPatientId: string
  labPatientId: string
  tokenId?: string
  tokenNo?: string
  dateIso?: string
  timeStarted?: string
  timeCompleted?: string
  dialyzerTypeId?: string
  dialyzerTypeName?: string
  noOfUse?: number
  bloodFlowRate?: number
  dialysateFlowRate?: number
  venousPressure?: number
  heparinLoadingDose?: number
  heparinInfusion?: number
  bpPreSys?: number
  bpPreDia?: number
  bpIntraSys?: number
  bpIntraDia?: number
  bpPostSys?: number
  bpPostDia?: number
  weightDry?: number
  weightPre?: number
  weightPost?: number
  idwg?: number
  medEpo?: string
  medIron?: string
  medCalctriol?: string
  medKtVOrUrr?: string
  targetUF?: number
  dataEntryName?: string
  dataEntryDesignation?: string
  dataEntrySign?: string
  patientProblem?: string
  nephrologistName?: string
  nephrologistSign?: string
  nephrologistTime?: string
  createdAt?: Date
  updatedAt?: Date
}

export const DialysisSession = models.Dialysis_Session || model('Dialysis_Session', DialysisSessionSchema)
