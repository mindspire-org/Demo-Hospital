import * as XLSX from 'xlsx'

let cachedMedicines: any[] | null = null
let cacheTimestamp = 0
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

export async function fetchMedicinesFromExcel(): Promise<any[]> {
  if (cachedMedicines && Date.now() - cacheTimestamp < CACHE_TTL) {
    return cachedMedicines
  }

  try {
    const res = await fetch('/medicines.xlsx')
    if (!res.ok) throw new Error('Failed to fetch medicines.xlsx')
    const buffer = await res.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: 'array' })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const rows: any[] = XLSX.utils.sheet_to_json(sheet)

    const medicines = rows.map((row: any) => {
      const name = pickField(row, ['name', 'medicine name', 'item name', 'product name', 'drug name', 'brand name', 'trade name'])
      const genericName = pickField(row, ['generic name', 'generic', 'genericname', 'molecule', 'active ingredient', 'composition'])
      const company = pickField(row, ['company', 'manufacturer', 'brand', 'supplier', 'vendor', 'pharma', 'pharmaceuticals', 'last company'])
      return {
        name: String(name || '').trim(),
        genericName: String(genericName || '').trim() || undefined,
        company: String(company || '').trim() || undefined,
      }
    }).filter((m: any) => m.name)

    cachedMedicines = medicines
    cacheTimestamp = Date.now()
    return medicines
  } catch (e) {
    console.error('Failed to load medicines.xlsx:', e)
    return []
  }
}

function pickField(row: any, candidates: string[]): string | undefined {
  const keys = Object.keys(row)
  for (const cand of candidates) {
    const key = keys.find(k => k.toLowerCase().trim() === cand.toLowerCase().trim())
    if (key) return row[key]
  }
  // fallback: partial match
  for (const cand of candidates) {
    const key = keys.find(k => k.toLowerCase().trim().includes(cand.toLowerCase().trim()))
    if (key) return row[key]
  }
  return undefined
}
