import { Request, Response } from 'express'
import { CampPatient } from '../models/CampPatient'
import { Camp } from '../models/Camp'

export async function dashboardStats(_req: Request, res: Response) {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const [activeCamps, totalPatientsThisMonth, totalPatientsAllTime, totalCamps] = await Promise.all([
    Camp.countDocuments({ status: 'active' }),
    CampPatient.countDocuments({ createdAt: { $gte: startOfMonth } }),
    CampPatient.countDocuments(),
    Camp.countDocuments(),
  ])
  res.json({ activeCamps, totalPatientsThisMonth, totalPatientsAllTime, totalCamps })
}

export async function campReport(req: Request, res: Response) {
  const { campId, from, to } = req.query as any
  const filter: any = {}
  if (campId) filter.campId = campId
  if (from || to) {
    filter.createdAt = {}
    if (from) filter.createdAt.$gte = new Date(from)
    if (to) filter.createdAt.$lte = new Date(to)
  }
  const [patients, byDiagnosis] = await Promise.all([
    CampPatient.find(filter).sort({ createdAt: -1 }).lean(),
    CampPatient.aggregate([
      { $match: filter },
      { $group: { _id: '$diagnosis', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 20 },
    ]),
  ])
  const summary = {
    totalPatients: patients.length,
    consulted: patients.filter(p => p.consultedBy).length,
    prescriptions: patients.filter(p => p.prescription).length,
    labOrders: patients.reduce((sum, p) => sum + (p.labOrders?.length || 0), 0),
    diagnosticOrders: patients.reduce((sum, p) => sum + (p.diagnosticOrders?.length || 0), 0),
    medicinesDispensed: patients.reduce((sum, p) => sum + (p.medicinesDispensed?.length || 0), 0),
    referredToHospital: patients.filter(p => p.referredToHospital).length,
  }
  res.json({ summary, patients, byDiagnosis })
}
