import { Request, Response } from 'express'
import { DoctorCustomEntry } from '../models/DoctorCustomEntry'

export async function create(req: Request, res: Response) {
  try {
    const { doctorId, category, entryText } = req.body

    if (!doctorId || !category || !entryText) {
      return res.status(400).json({ error: 'doctorId, category, and entryText are required' })
    }

    const entry = await DoctorCustomEntry.create({
      doctorId,
      category,
      entryText: String(entryText).trim(),
    })

    res.status(201).json({ entry })
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to create entry' })
  }
}

export async function list(req: Request, res: Response) {
  try {
    const { doctorId, category } = req.query

    if (!doctorId) {
      return res.status(400).json({ error: 'doctorId is required' })
    }

    const filter: any = { doctorId }
    if (category) filter.category = category

    const entries = await DoctorCustomEntry.find(filter)
      .sort({ createdAt: -1 })
      .lean()

    res.json({ entries })
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to fetch entries' })
  }
}

export async function update(req: Request, res: Response) {
  try {
    const { id } = req.params
    const { entryText } = req.body

    if (!entryText) {
      return res.status(400).json({ error: 'entryText is required' })
    }

    const entry = await DoctorCustomEntry.findByIdAndUpdate(
      String(id),
      { entryText: String(entryText).trim() },
      { new: true }
    ).lean()

    if (!entry) {
      return res.status(404).json({ error: 'Entry not found' })
    }

    res.json({ entry })
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to update entry' })
  }
}

export async function remove(req: Request, res: Response) {
  try {
    const { id } = req.params

    const entry = await DoctorCustomEntry.findByIdAndDelete(String(id))

    if (!entry) {
      return res.status(404).json({ error: 'Entry not found' })
    }

    res.json({ ok: true })
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to delete entry' })
  }
}

export async function getByDoctorAndCategory(req: Request, res: Response) {
  try {
    const { doctorId, category } = req.params

    const entries = await DoctorCustomEntry.find({
      doctorId: String(doctorId),
      category: String(category),
    })
      .sort({ createdAt: -1 })
      .lean()

    const entryTexts = entries.map(e => e.entryText)
    res.json({ entries, entryTexts })
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to fetch entries' })
  }
}
