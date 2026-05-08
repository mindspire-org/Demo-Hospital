import { Request, Response } from 'express'
import { LabSettings } from '../models/Settings'
import { logAudit, actorOf } from '../utils/audit'

export async function get(_req: Request, res: Response) {
  let s = await LabSettings.findOne().lean()
  if (!s) s = (await LabSettings.create({})).toObject()
  res.json(s)
}

export async function update(req: Request, res: Response) {
  // Use the model's strict mode to filter out unknown fields gracefully
  const data: any = { ...req.body }
  // Avoid overwriting headerHistory or chatgptPrompts via simple PUT
  delete data.headerHistory
  const before = await LabSettings.findOne().lean()
  const s = await LabSettings.findOneAndUpdate({}, { $set: data }, { new: true, upsert: true })
  await logAudit(req, { action: 'settings.update', entity: 'settings', entityId: String((s as any)?._id || ''), before, after: (s as any)?.toObject?.() || s })
  res.json(s)
}

/**
 * POST /lab/settings/header   { dataUrl, type: 'header'|'footer', note? }
 * Stores the new image, archives the previous one in headerHistory.
 */
export async function uploadHeaderFooter(req: Request, res: Response) {
  const { dataUrl, base64, type = 'header', note } = req.body || {}
  const imageUrl = base64 || dataUrl
  if (!imageUrl) return res.status(400).json({ message: 'dataUrl or base64 required' })
  if (!['header', 'footer'].includes(type)) return res.status(400).json({ message: 'invalid type' })
  const { actor } = actorOf(req)
  const s: any = (await LabSettings.findOne()) || (await LabSettings.create({}))

  const fieldName = type === 'header' ? 'headerImageUrl' : 'footerImageUrl'
  const previousUrl = s[fieldName]
  if (previousUrl) {
    s.headerHistory = s.headerHistory || []
    s.headerHistory.push({
      url: previousUrl,
      uploadedAt: new Date().toISOString(),
      uploadedBy: actor,
      note: note ? `${note} (archived)` : 'archived',
      type,
    })
  }
  s[fieldName] = imageUrl
  await s.save()
  await logAudit(req, { action: 'settings.header_upload', entity: 'settings', entityId: String(s._id), label: type })
  res.json({ headerImageUrl: s.headerImageUrl, footerImageUrl: s.footerImageUrl, headerHistory: s.headerHistory })
}

export async function listHeaderHistory(_req: Request, res: Response) {
  const s: any = await LabSettings.findOne().lean()
  res.json({ items: s?.headerHistory || [] })
}

/**
 * POST /lab/settings/header/revert   { url }
 * Restores the chosen historical image to the active header/footer field.
 */
export async function revertHeaderFooter(req: Request, res: Response) {
  const { url } = req.body || {}
  if (!url) return res.status(400).json({ message: 'url required' })
  const s: any = await LabSettings.findOne()
  if (!s) return res.status(404).json({ message: 'Settings not initialised' })
  const item = (s.headerHistory || []).find((h: any) => h.url === url)
  if (!item) return res.status(404).json({ message: 'History entry not found' })
  const fieldName = item.type === 'footer' ? 'footerImageUrl' : 'headerImageUrl'
  const current = s[fieldName]
  if (current) {
    s.headerHistory.push({
      url: current,
      uploadedAt: new Date().toISOString(),
      uploadedBy: actorOf(req).actor,
      note: 'archived on revert',
      type: item.type,
    })
  }
  s[fieldName] = item.url
  await s.save()
  await logAudit(req, { action: 'settings.header_revert', entity: 'settings', entityId: String(s._id), label: item.type })
  res.json({ headerImageUrl: s.headerImageUrl, footerImageUrl: s.footerImageUrl, headerHistory: s.headerHistory })
}
