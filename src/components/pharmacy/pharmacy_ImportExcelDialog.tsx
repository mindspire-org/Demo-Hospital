import { useState, useRef } from 'react'
import { Upload, X, FileSpreadsheet, AlertCircle, CheckCircle } from 'lucide-react'
import * as XLSX from 'xlsx'

type Props = {
  open: boolean
  onClose: () => void
  onImport: (data: any[]) => Promise<void>
}

export default function Pharmacy_ImportExcelDialog({ open, onClose, onImport }: Props) {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<any[]>([])
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    setFile(selectedFile)
    setError('')
    setSuccess(false)

    try {
      const data = await selectedFile.arrayBuffer()
      const workbook = XLSX.read(data)
      const worksheet = workbook.Sheets[workbook.SheetNames[0]]
      const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet)

      // Validate headers
      if (jsonData.length === 0) {
        setError('Excel file is empty')
        return
      }

      // Debug: Log the first row to see actual column names
      console.log('First row keys:', Object.keys(jsonData[0] || {}))
      console.log('First row data:', jsonData[0])

      // Map Excel columns to our format - be very flexible with column names
      const mapped = jsonData
        .map((row: any, idx: number) => {
          // Get all keys from the row
          const keys = Object.keys(row)
          
          // Find medicine name column (case insensitive, flexible matching)
          const nameKey = keys.find(k => 
            k.toLowerCase().includes('medicine') || 
            k.toLowerCase().includes('name') ||
            k.toLowerCase() === 'medicine name'
          )
          const name = nameKey ? String(row[nameKey] || '').trim() : ''
          
          // Find generic name
          const genericKey = keys.find(k => k.toLowerCase().includes('generic'))
          const genericName = genericKey ? String(row[genericKey] || '').trim() : ''
          
          // Find category
          const categoryKey = keys.find(k => k.toLowerCase().includes('category'))
          const category = categoryKey ? String(row[categoryKey] || '').trim() : ''
          
          // Find expiry
          const expiryKey = keys.find(k => k.toLowerCase().includes('expiry'))
          const expiry = expiryKey ? String(row[expiryKey] || '').trim() : ''
          
          // Find packs
          const packsKey = keys.find(k => k.toLowerCase().includes('pack') && !k.toLowerCase().includes('per') && !k.toLowerCase().includes('buy') && !k.toLowerCase().includes('sale'))
          let packs = packsKey ? Number(row[packsKey] || 0) : 0
          
          // Find units per pack
          const unitsKey = keys.find(k => 
            k.toLowerCase().includes('units per pack') || 
            k.toLowerCase().includes('units/pack') ||
            (k.toLowerCase().includes('unit') && k.toLowerCase().includes('pack'))
          )
          let unitsPerPack = unitsKey ? Number(row[unitsKey] || 1) : 1
          
          // Find buy per pack
          const buyKey = keys.find(k => k.toLowerCase().includes('buy'))
          const buyPerPack = buyKey ? Number(row[buyKey] || 0) : 0
          
          // Find sale per pack
          const saleKey = keys.find(k => k.toLowerCase().includes('sale'))
          const salePerPack = saleKey ? Number(row[saleKey] || 0) : 0
          
          // Find store name
          const storeKey = keys.find(k => k.toLowerCase().includes('store'))
          const storeName = storeKey ? String(row[storeKey] || '').trim() : ''
          
          // Find barcode
          const barcodeKey = keys.find(k => k.toLowerCase().includes('barcode'))
          const barcode = barcodeKey ? String(row[barcodeKey] || '').trim() : ''
          
          // Find min stock
          const minStockKey = keys.find(k => k.toLowerCase().includes('min'))
          const minStock = minStockKey ? Number(row[minStockKey] || 0) : 0
          
          // If packs is 0 but unitsPerPack has value, assume unitsPerPack is the total quantity and set packs to 1
          if (packs === 0 && unitsPerPack > 0) {
            packs = 1
          }
          
          // If unitsPerPack is 0 or 1 and packs has value, that's fine
          if (unitsPerPack <= 1 && packs > 0) {
            unitsPerPack = 1
          }
          
          return {
            rowNumber: idx + 2,
            name,
            genericName,
            category,
            expiry,
            packs,
            unitsPerPack,
            buyPerPack,
            salePerPack,
            storeName,
            barcode,
            minStock,
          }
        })
        .filter(m => {
          // Skip empty rows - must have medicine name and at least some quantity
          const hasName = (m.name || '').trim().length > 0
          const hasQuantity = (m.packs > 0 || m.unitsPerPack > 0)
          return hasName && hasQuantity
        })

      if (mapped.length === 0) {
        setError('No valid data found. Please ensure Medicine Name and quantity fields are filled.')
        return
      }

      setPreview(mapped.slice(0, 5))
    } catch (err) {
      setError('Failed to read Excel file. Please check the format.')
      console.error(err)
    }
  }

  const handleImport = async () => {
    if (!file || preview.length === 0) return

    setImporting(true)
    setError('')

    try {
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data)
      const worksheet = workbook.Sheets[workbook.SheetNames[0]]
      const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet)

      const mapped = jsonData
        .map((row: any) => {
          // Get all keys from the row
          const keys = Object.keys(row)
          
          // Find medicine name column (case insensitive, flexible matching)
          const nameKey = keys.find(k => 
            k.toLowerCase().includes('medicine') || 
            k.toLowerCase().includes('name') ||
            k.toLowerCase() === 'medicine name'
          )
          const name = nameKey ? String(row[nameKey] || '').trim() : ''
          
          // Find generic name
          const genericKey = keys.find(k => k.toLowerCase().includes('generic'))
          const genericName = genericKey ? String(row[genericKey] || '').trim() : ''
          
          // Find category
          const categoryKey = keys.find(k => k.toLowerCase().includes('category'))
          const category = categoryKey ? String(row[categoryKey] || '').trim() : ''
          
          // Find expiry
          const expiryKey = keys.find(k => k.toLowerCase().includes('expiry'))
          const expiry = expiryKey ? String(row[expiryKey] || '').trim() : ''
          
          // Find packs
          const packsKey = keys.find(k => k.toLowerCase().includes('pack') && !k.toLowerCase().includes('per') && !k.toLowerCase().includes('buy') && !k.toLowerCase().includes('sale'))
          let packs = packsKey ? Number(row[packsKey] || 0) : 0
          
          // Find units per pack
          const unitsKey = keys.find(k => 
            k.toLowerCase().includes('units per pack') || 
            k.toLowerCase().includes('units/pack') ||
            (k.toLowerCase().includes('unit') && k.toLowerCase().includes('pack'))
          )
          let unitsPerPack = unitsKey ? Number(row[unitsKey] || 1) : 1
          
          // Find buy per pack
          const buyKey = keys.find(k => k.toLowerCase().includes('buy'))
          const buyPerPack = buyKey ? Number(row[buyKey] || 0) : 0
          
          // Find sale per pack
          const saleKey = keys.find(k => k.toLowerCase().includes('sale'))
          const salePerPack = saleKey ? Number(row[saleKey] || 0) : 0
          
          // Find store name
          const storeKey = keys.find(k => k.toLowerCase().includes('store'))
          const storeName = storeKey ? String(row[storeKey] || '').trim() : ''
          
          // Find barcode
          const barcodeKey = keys.find(k => k.toLowerCase().includes('barcode'))
          const barcode = barcodeKey ? String(row[barcodeKey] || '').trim() : ''
          
          // Find min stock
          const minStockKey = keys.find(k => k.toLowerCase().includes('min'))
          const minStock = minStockKey ? Number(row[minStockKey] || 0) : 0
          
          // If packs is 0 but unitsPerPack has value, assume unitsPerPack is the total quantity and set packs to 1
          if (packs === 0 && unitsPerPack > 0) {
            packs = 1
          }
          
          // If unitsPerPack is 0 or 1 and packs has value, that's fine
          if (unitsPerPack <= 1 && packs > 0) {
            unitsPerPack = 1
          }
          
          return {
            name,
            genericName,
            category,
            expiry,
            packs,
            unitsPerPack,
            buyPerPack,
            salePerPack,
            storeName,
            barcode,
            minStock,
          }
        })
        .filter(m => {
          // Skip empty rows - must have medicine name and at least some quantity
          const hasName = (m.name || '').trim().length > 0
          const hasQuantity = (m.packs > 0 || m.unitsPerPack > 0)
          return hasName && hasQuantity
        })

      await onImport(mapped)
      setSuccess(true)
      setTimeout(() => {
        onClose()
        setFile(null)
        setPreview([])
        setSuccess(false)
      }, 1500)
    } catch (err: any) {
      setError(err?.message || 'Failed to import data')
    } finally {
      setImporting(false)
    }
  }

  const handleClose = () => {
    setFile(null)
    setPreview([])
    setError('')
    setSuccess(false)
    onClose()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-indigo-100 p-2 text-indigo-600">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-800">Import Purchase Data</h3>
              <p className="text-sm text-slate-500">Upload Excel file to add items to Pending Review</p>
            </div>
          </div>
          <button onClick={handleClose} className="rounded-md p-2 text-slate-500 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* Excel Format Info */}
          <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
            <h4 className="mb-2 font-semibold text-blue-900">Required Excel Headers:</h4>
            <div className="text-sm text-blue-800">
              <code className="rounded bg-blue-100 px-2 py-1">
                Medicine Name, Generic Name, Category, Expiry Date, Packs, Units Per Pack, Buy Per Pack, Sale Per Pack, Store Name, Barcode, Min Stock
              </code>
            </div>
            <p className="mt-2 text-xs text-blue-700">
              Note: Medicine Name, Packs, and Units Per Pack are required. Date format: YYYY-MM-DD
            </p>
          </div>

          {/* File Upload */}
          <div className="mb-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-8 text-slate-600 hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
            >
              <Upload className="h-6 w-6" />
              <span className="font-medium">
                {file ? file.name : 'Click to upload Excel file'}
              </span>
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-4 text-rose-800">
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
              <div className="text-sm">{error}</div>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
              <CheckCircle className="h-5 w-5" />
              <div className="text-sm font-medium">Data imported successfully!</div>
            </div>
          )}

          {/* Preview */}
          {preview.length > 0 && !error && (
            <div className="mb-4">
              <h4 className="mb-2 font-semibold text-slate-800">Preview (first 5 rows):</h4>
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-slate-700">Medicine</th>
                      <th className="px-3 py-2 text-left font-medium text-slate-700">Generic</th>
                      <th className="px-3 py-2 text-left font-medium text-slate-700">Packs</th>
                      <th className="px-3 py-2 text-left font-medium text-slate-700">Units/Pack</th>
                      <th className="px-3 py-2 text-left font-medium text-slate-700">Buy/Pack</th>
                      <th className="px-3 py-2 text-left font-medium text-slate-700">Store</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row, idx) => (
                      <tr key={idx} className="border-t border-slate-200">
                        <td className="px-3 py-2">{row.name}</td>
                        <td className="px-3 py-2">{row.genericName || '-'}</td>
                        <td className="px-3 py-2">{row.packs}</td>
                        <td className="px-3 py-2">{row.unitsPerPack}</td>
                        <td className="px-3 py-2">{row.buyPerPack}</td>
                        <td className="px-3 py-2">{row.storeName || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-6 py-4">
          <button onClick={handleClose} className="btn-outline-navy">
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={!file || preview.length === 0 || importing || !!error}
            className="btn disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {importing ? 'Importing...' : `Import ${preview.length > 0 ? `(${preview.length}+ items)` : ''}`}
          </button>
        </div>
      </div>
    </div>
  )
}
