import { Request, Response } from 'express'
import * as LabOrders from '../../lab/controllers/orders.controller'
import * as DiagnosticTokens from '../../diagnostic/controllers/tokens.controller'

function jsonError(res: Response, status: number, message: string){
  return res.status(status).json({ error: message })
}

export async function createLabOrder(req: Request, res: Response){
  const username = String((req as any).user?.username || '').trim().toLowerCase()
  if (!username) return jsonError(res, 401, 'Unauthorized')

  ;(req as any).body = { ...(req as any).body, portal: 'reception' }
  ;(req as any).user = { ...((req as any).user || {}), username }
  return LabOrders.create(req as any, res)
}

export async function createDiagnosticToken(req: Request, res: Response){
  const username = String((req as any).user?.username || '').trim().toLowerCase()
  if (!username) return jsonError(res, 401, 'Unauthorized')

  ;(req as any).body = { ...(req as any).body, portal: 'reception' }
  ;(req as any).user = { ...((req as any).user || {}), username }
  return DiagnosticTokens.create(req as any, res)
}
