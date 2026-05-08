import { useEffect, useState, useRef } from 'react'

import { useNavigate, useParams, useLocation } from 'react-router-dom'

import { pharmacyApi } from '../../utils/api'

import { ArrowLeft, Plus, Trash2, Save, ChevronDown, ChevronUp, Package, Pause, FileText } from 'lucide-react'

import Pharmacy_AddSupplierDialog, { type Supplier } from '../../components/pharmacy/pharmacy_AddSupplierDialog'
import Pharmacy_AddCompanyDialog, { type Company } from '../../components/pharmacy/pharmacy_AddCompanyDialog'
import SearchableSelect from '../common/SearchableSelect'
import ModernDatePicker from '../common/ModernDatePicker'



type ItemRow = {
  id: string
  name?: string
  genericName?: string
  packs?: number
  unitsPerPack?: number
  buyPerPack?: number
  salePerPack?: number
  totalItems?: number
  buyPerUnit?: number
  salePerUnit?: number
  lineTaxType?: 'percent' | 'fixed'
  lineTaxValue?: number
  category?: string
  brand?: string
  unitType?: string
  shelfNumber?: string
  maxPackAllow?: number
  minPackStock?: number
  barcode?: string
  manufacturer?: string
  minStock?: number
  expiry?: string
  collapsed?: boolean
  inventoryKey?: string
  defaultDiscountPct?: number
}

type InvoiceTax = {
  id: string
  name?: string
  value?: number
  type?: 'percent' | 'fixed'
  applyOn?: 'gross' | 'net'
}



export default function Pharmacy_AddInvoicePage() {

  const navigate = useNavigate()

  const location = useLocation()

  const { id } = useParams()

  const isEdit = !!id

  const fromPending = (() => {

    try {

      const sp = new URLSearchParams(location.search)

      return (sp.get('from') || '').toLowerCase() === 'pending'

    } catch {

      return false

    }

  })()

  const [items, setItems] = useState<ItemRow[]>([{ id: crypto.randomUUID() }])

  const [invoiceTaxes, setInvoiceTaxes] = useState<InvoiceTax[]>([])

  const [suppliers, setSuppliers] = useState<any[]>([])
  const [companies, setCompanies] = useState<any[]>([])

  const [addSupplierOpen, setAddSupplierOpen] = useState(false)
  const [addCompanyOpen, setAddCompanyOpen] = useState(false)

  const [allMedicines, setAllMedicines] = useState<Array<{ id: number; name: string }>>([])

  const [supplierId, setSupplierId] = useState('')

  const [supplierName, setSupplierName] = useState('')
  const [companyId, setCompanyId] = useState('')
  const [companyName, setCompanyName] = useState('')

  const [invoiceNo, setInvoiceNo] = useState('')

  const [invoiceDate, setInvoiceDate] = useState(() => isEdit ? '' : new Date().toISOString().split('T')[0])

  // Auto-generate sequential invoice number
  useEffect(() => {
    if (isEdit) return
    let mounted = true
      ; (async () => {
        let nextNum = 1
        try {
          const candidates: any[] = []
          try {
            const resp1: any = await pharmacyApi.listPurchases({ search: 'INV-', limit: 50 })
            const arr1 = resp1?.items ?? resp1 ?? []
            candidates.push(...arr1)
          } catch { }
          if (candidates.length < 1) {
            try {
              const resp2: any = await pharmacyApi.listPurchases({ limit: 50 })
              const arr2 = resp2?.items ?? resp2 ?? []
              candidates.push(...arr2)
            } catch { }
          }
          let maxNum = 0
          for (const it of candidates) {
            const inv = String(it?.invoice || '')
            const m = inv.match(/^INV-(\d+)$/)
            if (m) {
              const n = parseInt(m[1], 10)
              if (!isNaN(n)) maxNum = Math.max(maxNum, n)
            }
          }
          if (maxNum > 0) nextNum = maxNum + 1
        } catch { }
        try {
          const localLast = localStorage.getItem('pharmacy.purchase.invoice.seq.last')
          const n = localLast ? parseInt(localLast, 10) : 0
          if (!isNaN(n) && n >= nextNum) nextNum = n + 1
        } catch { }
        if (mounted) setInvoiceNo(`INV-${String(nextNum).padStart(6, '0')}`)
      })()
    return () => { mounted = false }
  }, [isEdit])

  const [showTaxSection, setShowTaxSection] = useState(false)

  // Enforce standardized invoice format if a non-standard value appears (e.g., imports or restored drafts)
  useEffect(() => {
    if (isEdit) return
    const cur = String(invoiceNo || '')
    const ok = /^INV-\d{6}$/.test(cur)
    if (ok) return
    let mounted = true
      ; (async () => {
        let nextNum = 1
        try {
          const localLast = localStorage.getItem('pharmacy.purchase.invoice.seq.last')
          const n = localLast ? parseInt(localLast, 10) : 0
          if (!isNaN(n) && n > 0) nextNum = n + 1
        } catch { }
        if (mounted) setInvoiceNo(`INV-${String(nextNum).padStart(6, '0')}`)
      })()
    return () => { mounted = false }
  }, [invoiceNo, isEdit])



  // Autocomplete state

  const [suggestions, setSuggestions] = useState<Array<{ id: number; name: string }>>([])

  const [showSuggestions, setShowSuggestions] = useState<string | null>(null)

  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const [heldOpen, setHeldOpen] = useState(false)
  const [heldInvoices, setHeldInvoices] = useState<any[]>([])
  const [loadingHeld, setLoadingHeld] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [heldToDelete, setHeldToDelete] = useState<string | null>(null)

  const refreshHeld = async () => {
    setLoadingHeld(true)
    try {
      const res: any = await pharmacyApi.listPurchaseDrafts({ limit: 100 })
      setHeldInvoices(res?.items ?? res ?? [])
    } catch {
      setHeldInvoices([])
    } finally {
      setLoadingHeld(false)
    }
  }

  useEffect(() => {
    if (heldOpen) refreshHeld()
  }, [heldOpen])

  // --- AUTO-SAVE / AUTO-RESTORE LOGIC ---
  const DRAFT_KEY = 'pharmacy_purchase_invoice_draft'
  const isRestoringRef = useRef(false)
  const lastStateRef = useRef<any>(null)

  // Restore draft on mount (only for new invoices)
  useEffect(() => {
    if (isEdit) return
    try {
      const saved = localStorage.getItem(DRAFT_KEY)
      if (saved) {
        const draft = JSON.parse(saved)
        isRestoringRef.current = true
        if (draft.items) setItems(draft.items)
        if (draft.invoiceNo) setInvoiceNo(draft.invoiceNo)
        if (draft.invoiceDate) setInvoiceDate(draft.invoiceDate)
        if (draft.supplierId) setSupplierId(draft.supplierId)
        if (draft.supplierName) setSupplierName(draft.supplierName)
        if (draft.companyId) setCompanyId(draft.companyId)
        if (draft.companyName) setCompanyName(draft.companyName)
        if (draft.invoiceTaxes) setInvoiceTaxes(draft.invoiceTaxes)
        // Reset the ref after a short delay to allow state updates to settle
        setTimeout(() => { isRestoringRef.current = false }, 100)
      }
    } catch (e) {
      console.error('Failed to restore draft:', e)
    }
  }, [isEdit])

  // Track latest state in a ref for unmount save
  useEffect(() => {
    lastStateRef.current = {
      items,
      invoiceNo,
      invoiceDate,
      supplierId,
      supplierName,
      companyId,
      companyName,
      invoiceTaxes
    }
  }, [items, invoiceNo, invoiceDate, supplierId, supplierName, companyId, companyName, invoiceTaxes])

  // Save draft whenever state changes (debounced)
  useEffect(() => {
    if (isEdit || isRestoringRef.current) return

    const timer = setTimeout(() => {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(lastStateRef.current))
    }, 1000)

    return () => {
      clearTimeout(timer)
      // On unmount, if we are not in edit mode and haven't just cleared the draft, save it immediately
      if (!isEdit && !isRestoringRef.current && localStorage.getItem(DRAFT_KEY) !== null) {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(lastStateRef.current))
      }
    }
  }, [items, invoiceNo, invoiceDate, supplierId, supplierName, companyId, companyName, invoiceTaxes, isEdit])

  const clearDraft = () => {
    localStorage.removeItem(DRAFT_KEY)
    lastStateRef.current = null // Prevent unmount re-save
  }

  const saveInvoice = async () => {
    const lines = items
      .filter(r => (r.name || '').trim() && (r.packs || 0) > 0)
      .map(r => ({
        medicineId: r.inventoryKey || undefined,
        name: (r.name || '').trim(),
        genericName: r.genericName || undefined,
        unitsPerPack: r.unitsPerPack || 1,
        packs: r.packs || 0,
        totalItems: (r.totalItems != null) ? r.totalItems : ((r.unitsPerPack || 1) * (r.packs || 0)),
        buyPerPack: r.buyPerPack || 0,
        buyPerUnit: (r.buyPerUnit != null) ? r.buyPerUnit : ((r.buyPerPack || 0) / Math.max(1, (r.unitsPerPack || 1))),
        salePerPack: r.salePerPack || 0,
        salePerUnit: (r.salePerUnit != null) ? r.salePerUnit : ((r.salePerPack || 0) / Math.max(1, (r.unitsPerPack || 1))),
        category: r.category || undefined,
        brand: r.brand || undefined,
        unitType: r.unitType || undefined,
        shelfNumber: r.shelfNumber || undefined,
        maxPackAllow: r.maxPackAllow != null ? r.maxPackAllow : undefined,
        minPackStock: r.minPackStock != null ? r.minPackStock : undefined,
        manufacturer: r.manufacturer || undefined,
        barcode: r.barcode || undefined,
        minStock: r.minStock != null ? r.minStock : undefined,
        expiry: r.expiry || undefined,
        defaultDiscountPct: (r.defaultDiscountPct != null) ? Math.max(0, Math.min(100, Number(r.defaultDiscountPct))) : undefined,
        lineTaxType: r.lineTaxType || undefined,
        lineTaxValue: r.lineTaxValue || undefined,
        inventoryKey: r.inventoryKey || undefined,
      }))
    if (!invoiceNo.trim() || !invoiceDate) {
      showToast('error', 'Invoice No and Invoice Date are required')
      return
    }

    if (!lines.length) {
      showToast('error', 'Add at least one medicine with Qty (Packs)')
      return
    }

    const invalidLine = items.find(r => {
      const hasName = !!String(r.name || '').trim()
      const packsOk = Number(r.packs || 0) > 0
      const unitsOk = Number(r.unitsPerPack || 0) > 0
      return (hasName && (!packsOk || !unitsOk))
    })

    if (invalidLine) {
      showToast('error', 'Each medicine must have Qty (Packs) and Units/Pack greater than 0')
      return
    }

    try {
      const payload = {
        date: invoiceDate,
        invoice: invoiceNo,
        supplierId: supplierId || undefined,
        supplierName: supplierName || undefined,
        companyId: companyId || undefined,
        companyName: companyName || undefined,
        invoiceTaxes: invoiceTaxes
          .filter(t => (t.name || '').trim() && (t.value || 0) > 0)
          .map(t => ({
            name: (t.name || '').trim(),
            value: t.value || 0,
            type: t.type || 'percent',
            applyOn: t.applyOn || 'gross'
          })),
        discount,
        lines: lines,
      }

      if (isEdit && id) {
        await pharmacyApi.updatePurchaseDraft(id, payload)
        showToast('success', 'Invoice updated')
      } else {
        await pharmacyApi.createPurchase(payload)
        clearDraft()
        try {
          const m = String(invoiceNo || '').match(/^INV-(\d+)$/)
          if (m) {
            const used = parseInt(m[1], 10)
            if (!isNaN(used) && used > 0) {
              localStorage.setItem('pharmacy.purchase.invoice.seq.last', String(used))
            }
          }
        } catch { }
        if (fromPending && id) {
          try {
            await pharmacyApi.deletePurchaseDraft(id)
          } catch (err) {
            console.error('Failed to delete draft after purchase:', err)
          }
        }
        showToast('success', 'Invoice saved successfully')
      }
      navigate('/pharmacy/inventory')
    } catch (error) {
      console.error('Error saving invoice:', error)
      showToast('error', 'Failed to save invoice. Please try again.')
    }
  }

  const cancelInvoice = async () => {
    if (isEdit && fromPending && id) {
      if (window.confirm('Are you sure you want to cancel and delete this held invoice?')) {
        try {
          await pharmacyApi.deletePurchaseDraft(id)
          showToast('success', 'Held invoice cancelled and removed')
          navigate('/pharmacy/inventory')
        } catch {
          showToast('error', 'Failed to cancel held invoice')
        }
        return
      }
    } else {
      clearDraft()
    }
    navigate(fromPending ? '/pharmacy/inventory?tab=pending' : '/pharmacy/inventory')
  }

  // --------------------------------------

  const holdInvoice = async () => {
    if (!invoiceNo.trim()) {
      showToast('error', 'Invoice number is required')
      return
    }

    const holdAction = async () => {
      const lines = items
        .filter(r => (r.name || '').trim() && (r.packs || 0) > 0)
        .map(r => ({
          medicineId: r.inventoryKey || undefined,
          name: (r.name || '').trim(),
          genericName: r.genericName || undefined,
          unitsPerPack: r.unitsPerPack || 1,
          packs: r.packs || 0,
          totalItems: (r.totalItems != null) ? r.totalItems : ((r.unitsPerPack || 1) * (r.packs || 0)),
          buyPerPack: r.buyPerPack || 0,
          buyPerUnit: (r.buyPerUnit != null) ? r.buyPerUnit : ((r.buyPerPack || 0) / Math.max(1, (r.unitsPerPack || 1))),
          salePerPack: r.salePerPack || 0,
          salePerUnit: (r.salePerUnit != null) ? r.salePerUnit : ((r.salePerPack || 0) / Math.max(1, (r.unitsPerPack || 1))),
          category: r.category || undefined,
          brand: r.brand || undefined,
          unitType: r.unitType || undefined,
          shelfNumber: r.shelfNumber || undefined,
          maxPackAllow: r.maxPackAllow != null ? r.maxPackAllow : undefined,
          minPackStock: r.minPackStock != null ? r.minPackStock : undefined,
          manufacturer: r.manufacturer || undefined,
          barcode: r.barcode || undefined,
          minStock: r.minStock != null ? r.minStock : undefined,
          expiry: r.expiry || undefined,
          defaultDiscountPct: (r.defaultDiscountPct != null) ? Math.max(0, Math.min(100, Number(r.defaultDiscountPct))) : undefined,
          lineTaxType: r.lineTaxType || undefined,
          lineTaxValue: r.lineTaxValue || undefined,
          inventoryKey: r.inventoryKey || undefined,
        }))

      if (!lines.length) {
        showToast('error', 'Add at least one item to hold the invoice')
        return
      }

      try {
        const payload = {
          date: invoiceDate || new Date().toISOString().split('T')[0],
          invoice: invoiceNo || `HELD-${Date.now()}`,
          supplierId: supplierId || undefined,
          supplierName: supplierName || undefined,
          companyId: companyId || undefined,
          companyName: companyName || undefined,
          invoiceTaxes: invoiceTaxes
            .filter(t => (t.name || '').trim() && (t.value || 0) > 0)
            .map(t => ({
              name: (t.name || '').trim(),
              value: t.value || 0,
              type: t.type || 'percent',
              applyOn: t.applyOn || 'gross'
            })),
          discount: 0,
          lines: lines,
          status: 'Held'
        }

        if (isEdit && id && !fromPending) {
          await pharmacyApi.updatePurchaseDraft(id, payload)
          showToast('success', 'Invoice updated and held')
        } else {
          await pharmacyApi.createPurchaseDraft(payload)
          showToast('success', 'Invoice held successfully')
          clearDraft()
          if (!isEdit) {
            setItems([{ id: crypto.randomUUID() }])
            setInvoiceNo('')
            setSupplierId('')
            setSupplierName('')
            setCompanyId('')
            setCompanyName('')
          }
        }
      } catch (e) {
        console.error(e)
        showToast('error', 'Failed to hold invoice')
      }
    }

    await holdAction()
  }

  const restoreHeld = (heldId: string) => {
    setHeldOpen(false)
    navigate(`/pharmacy/inventory/edit-invoice/${heldId}?from=pending`)
  }

  const confirmDeleteHeld = (heldId: string) => {
    setHeldToDelete(heldId)
    setDeleteConfirmOpen(true)
  }

  const deleteHeld = async () => {
    if (!heldToDelete) return
    try {
      await pharmacyApi.deletePurchaseDraft(heldToDelete)
      showToast('success', 'Held invoice deleted')
      refreshHeld()
    } catch {
      showToast('error', 'Failed to delete held invoice')
    } finally {
      setDeleteConfirmOpen(false)
      setHeldToDelete(null)
    }
  }

  const toastTimerRef = useRef<number | null>(null)

  const barcodeTimersRef = useRef<Record<string, ReturnType<typeof setTimeout> | undefined>>({})



  const showToast = (type: 'success' | 'error', message: string) => {

    if (toastTimerRef.current) {

      window.clearTimeout(toastTimerRef.current)

      toastTimerRef.current = null

    }

    setToast({ type, message })

    toastTimerRef.current = window.setTimeout(() => {

      setToast(null)

      toastTimerRef.current = null

    }, 3000)

  }



  const autofillFromInventoryByName = async (name: string | undefined, rowId: string) => {

    const q = String(name || '').trim()

    if (!q) return

    try {

      const res: any = await pharmacyApi.listInventory({ search: q, limit: 1 })

      const it = (res?.items || [])[0]

      if (!it) return

      const normQ = q.toLowerCase()

      const normIt = String(it.key || it.name || '').trim().toLowerCase()

      if (normIt !== normQ) return

      const units = Number(it.unitsPerPack || 1)

      const directSaleUnit = (it.lastSalePerUnit != null) ? Number(it.lastSalePerUnit) : undefined

      const directSalePack = (it.lastSalePerPack != null) ? Number(it.lastSalePerPack) : undefined

      const saleUnit = (directSaleUnit != null) ? directSaleUnit : (units ? (Number(directSalePack || 0) / units) : 0)

      const salePack = (directSalePack != null) ? directSalePack : ((saleUnit || 0) * units)

      const directBuyUnit = (it.lastBuyPerUnit != null) ? Number(it.lastBuyPerUnit) : undefined

      const directBuyPack = (it.lastBuyPerPack != null) ? Number(it.lastBuyPerPack) : undefined

      const buyUnit = (directBuyUnit != null) ? directBuyUnit : (units ? (Number(directBuyPack || 0) / units) : 0)

      const buyPack = (directBuyPack != null) ? directBuyPack : ((buyUnit || 0) * units)

      const gen = it.lastGenericName || it.genericName || ''

      const key = String(it.key || it._id || it.name || '')

      setItems(prev => prev.map(r => r.id === rowId ? {

        ...r,

        unitsPerPack: units || r.unitsPerPack,

        category: it.category ?? r.category,

        brand: it.brand ?? r.brand,

        unitType: it.unitType ?? r.unitType,

        shelfNumber: it.shelfNumber ?? r.shelfNumber,

        maxPackAllow: (it.maxPackAllow != null) ? Number(it.maxPackAllow) : r.maxPackAllow,

        minPackStock: (it.minPackStock != null) ? Number(it.minPackStock) : r.minPackStock,

        minStock: (it.minStock != null) ? Number(it.minStock) : r.minStock,

        manufacturer: it.manufacturer || r.manufacturer,

        barcode: it.barcode || r.barcode,

        expiry: it.expiry || r.expiry,

        buyPerPack: buyPack || r.buyPerPack,

        buyPerUnit: buyUnit || r.buyPerUnit,

        salePerPack: salePack || r.salePerPack,

        salePerUnit: saleUnit || r.salePerUnit,

        genericName: gen || r.genericName,

        inventoryKey: key || r.inventoryKey,
        totalItems: (r.packs || 0) * (units || r.unitsPerPack || 1),
        defaultDiscountPct: (it.defaultDiscountPct != null) ? Number(it.defaultDiscountPct) : r.defaultDiscountPct,
      } : r))
    } catch { }

  }



  const autofillFromInventoryByBarcode = async (code: string | undefined, rowId: string) => {

    const q = String(code || '').trim()

    if (!q) return

    try {

      const res: any = await pharmacyApi.listInventory({ search: q, limit: 1 })

      const it = (res?.items || [])[0]

      if (!it) return

      const itemBarcode = String(it.barcode || '').trim()

      const norm = (s: string) => String(s || '').replace(/\D/g, '')

      if (!itemBarcode || norm(itemBarcode) !== norm(q)) return

      const units = Number(it.unitsPerPack || 1)

      const directSaleUnit = (it.lastSalePerUnit != null) ? Number(it.lastSalePerUnit) : undefined

      const directSalePack = (it.lastSalePerPack != null) ? Number(it.lastSalePerPack) : undefined

      const saleUnit = (directSaleUnit != null) ? directSaleUnit : (units ? (Number(directSalePack || 0) / units) : 0)

      const salePack = (directSalePack != null) ? directSalePack : ((saleUnit || 0) * units)

      const directBuyUnit = (it.lastBuyPerUnit != null) ? Number(it.lastBuyPerUnit) : undefined

      const directBuyPack = (it.lastBuyPerPack != null) ? Number(it.lastBuyPerPack) : undefined

      const buyUnit = (directBuyUnit != null) ? directBuyUnit : (units ? (Number(directBuyPack || 0) / units) : 0)

      const buyPack = (directBuyPack != null) ? directBuyPack : ((buyUnit || 0) * units)

      const gen = it.lastGenericName || it.genericName || ''

      const key = String(it.key || it._id || it.name || '')

      setItems(prev => prev.map(r => r.id === rowId ? {

        ...r,


        unitsPerPack: units || r.unitsPerPack,

        category: it.category ?? r.category,

        brand: it.brand ?? r.brand,

        unitType: it.unitType ?? r.unitType,

        shelfNumber: it.shelfNumber ?? r.shelfNumber,

        manufacturer: it.manufacturer || r.manufacturer,

        barcode: itemBarcode,

        expiry: it.expiry || r.expiry,

        buyPerPack: buyPack || r.buyPerPack,

        buyPerUnit: buyUnit || r.buyPerUnit,

        salePerPack: salePack || r.salePerPack,

        salePerUnit: saleUnit || r.salePerUnit,

        genericName: gen || r.genericName,

        inventoryKey: key || r.inventoryKey,
        totalItems: (r.packs || 0) * (units || r.unitsPerPack || 1),
        defaultDiscountPct: (it.defaultDiscountPct != null) ? Number(it.defaultDiscountPct) : r.defaultDiscountPct,
      } : r))
    } catch { }

  }



  const addCompany = async (c: Company) => {
    try {
      const created: any = await pharmacyApi.createCompany({
        name: c.name,
        distributorId: supplierId || undefined,
        distributorName: supplierName || undefined,
        status: c.status,
      })
      if (supplierId) {
        const list = await refreshCompanies(supplierId)
        const newId = String(created?._id || created?.id || '')
        if (newId) {
          setCompanyId(newId)
          const found = list.find((x: any) => String(x._id) === newId)
          const newName = found?.name || c.name || ''
          setCompanyName(newName)
          // Also update manufacturer for all existing items when a new company is added and selected
          setItems(prev => prev.map(r => ({ ...r, manufacturer: newName })))
        }
      }
      showToast('success', 'Company added')
    } catch {
      showToast('error', 'Failed to add company')
    }
  }



  useEffect(() => {

    return () => {

      if (toastTimerRef.current) {

        window.clearTimeout(toastTimerRef.current)

        toastTimerRef.current = null

      }

    }

  }, [])



  useEffect(() => {

    let mounted = true

    pharmacyApi.listAllSuppliers().then((res: any) => {

      if (!mounted) return

      const list = res?.items ?? res ?? []

      setSuppliers(list)

    }).catch(() => { })

    return () => { mounted = false }

  }, [])

  // Load companies when supplier changes
  useEffect(() => {
    let mounted = true
      ; (async () => {
        try {
          if (!supplierId) { setCompanies([]); setCompanyId(''); setCompanyName(''); return }
          const res: any = await pharmacyApi.listAllCompanies({ distributorId: supplierId })
          if (!mounted) return
          const list = res?.items ?? res ?? []
          setCompanies(list)
          const found = companyId ? list.find((x: any) => String(x._id) === String(companyId)) : null
          if (found) {
            setCompanyName(found.name || '')
          } else if (list.length === 1) {
            setCompanyId(String(list[0]._id))
            setCompanyName(String(list[0].name || ''))
            // Auto-fill manufacturer for existing rows if only one company exists
            setItems(prev => prev.map(r => ({ ...r, manufacturer: r.manufacturer || list[0].name })))
          } else {
            setCompanyId('')
            setCompanyName('')
          }
        } catch {
          if (!mounted) return
          setCompanies([])
          setCompanyId('')
          setCompanyName('')
        }
      })()
    return () => { mounted = false }
  }, [supplierId])

  // Auto-fill manufacturer for all items when companyName changes
  useEffect(() => {
    if (!companyName) return
    setItems(prev => prev.map(r => ({
      ...r,
      manufacturer: companyName
    })))
  }, [companyName])



  // Load draft for editing

  useEffect(() => {

    let mounted = true

      ; (async () => {

        if (!isEdit || !id) return

        try {

          const doc: any = await pharmacyApi.getPurchaseDraft(id)

          if (!mounted || !doc) return

          setInvoiceNo(String(doc.invoice || ''))

          setInvoiceDate(String(doc.date || ''))

          setSupplierId(String(doc.supplierId || ''))

          setSupplierName(String(doc.supplierName || ''))

          setCompanyId(String((doc as any).companyId || ''))

          setCompanyName(String((doc as any).companyName || ''))

          const mappedItems: ItemRow[] = (doc.lines || []).map((l: any) => ({

            id: crypto.randomUUID(),

            name: l.name || '',

            genericName: l.genericName || '',

            packs: Number(l.packs || 0),

            unitsPerPack: Number(l.unitsPerPack || 1),

            buyPerPack: Number(l.buyPerPack || 0),

            salePerPack: Number(l.salePerPack || 0),

            totalItems: Number(l.totalItems != null ? l.totalItems : (Number(l.unitsPerPack || 1) * Number(l.packs || 0))),

            buyPerUnit: Number(l.buyPerUnit != null ? l.buyPerUnit : ((Number(l.unitsPerPack || 1) ? Number(l.buyPerPack || 0) / Number(l.unitsPerPack || 1) : 0))),

            salePerUnit: Number(l.salePerUnit != null ? l.salePerUnit : ((Number(l.unitsPerPack || 1) ? Number(l.salePerPack || 0) / Number(l.unitsPerPack || 1) : 0))),

            lineTaxType: l.lineTaxType || undefined,

            lineTaxValue: Number(l.lineTaxValue || 0),

            category: l.category || '',

            brand: l.brand || '',

            unitType: l.unitType || '',

            shelfNumber: l.shelfNumber || '',

            maxPackAllow: (l.maxPackAllow != null) ? Number(l.maxPackAllow) : undefined,

            minPackStock: (l.minPackStock != null) ? Number(l.minPackStock) : undefined,

            manufacturer: l.manufacturer || '',

            minStock: (l.minStock != null) ? Number(l.minStock) : undefined,

            expiry: l.expiry || '',

            collapsed: false,

            defaultDiscountPct: (l.defaultDiscountPct != null) ? Number(l.defaultDiscountPct) : undefined,

          }))

          setItems(mappedItems.length ? mappedItems : [{ id: crypto.randomUUID() }])

          const taxes: InvoiceTax[] = (doc.invoiceTaxes || []).map((t: any) => ({

            id: crypto.randomUUID(),

            name: t.name || '',

            value: Number(t.value || 0),

            type: (t.type === 'fixed' ? 'fixed' : 'percent'),

            applyOn: (t.applyOn === 'net' ? 'net' : 'gross'),

          }))

          setInvoiceTaxes(taxes)

        } catch { }

      })()

    return () => { mounted = false }

  }, [isEdit, id])



  // Global scanner listener (works when no input is focused). Detects fast key bursts and Enter or inactivity timeout.

  const scanBufRef = useRef<{ buf: string; last: number; timer?: ReturnType<typeof setTimeout> | null }>({ buf: '', last: 0, timer: null })

  useEffect(() => {

    const handler = (e: KeyboardEvent) => {

      const t = e.target as HTMLElement | null

      const tag = (t?.tagName || '').toLowerCase()

      const isTyping = tag === 'input' || tag === 'textarea' || tag === 'select' || !!t?.isContentEditable

      if (isTyping) return

      const now = Date.now()

      if (now - scanBufRef.current.last > 120) scanBufRef.current.buf = ''

      scanBufRef.current.last = now

      if (scanBufRef.current.timer) { try { clearTimeout(scanBufRef.current.timer) } catch { } }

      if (e.key === 'Enter') {

        const code = scanBufRef.current.buf.trim()

        scanBufRef.current.buf = ''

        if (!code) return

        // Put scanned barcode into the last row (or create one) and autofill

        const targetId = (items[items.length - 1]?.id) || crypto.randomUUID()

        if (!items.length) setItems([{ id: targetId }])

        setItems(prev => prev.map((it, i) => (i === prev.length - 1 ? { ...it, barcode: code } : it)))

        setTimeout(() => autofillFromInventoryByBarcode(code, targetId), 0)

        return

      }

      if (e.key && e.key.length === 1) {

        scanBufRef.current.buf += e.key

      }

      // Commit after brief inactivity if buffer looks like a barcode (length >= 6)

      scanBufRef.current.timer = setTimeout(() => {

        const code = scanBufRef.current.buf.trim()

        scanBufRef.current.buf = ''

        if (!code || code.length < 6) return

        const targetId = (items[items.length - 1]?.id) || crypto.randomUUID()

        if (!items.length) setItems([{ id: targetId }])

        setItems(prev => prev.map((it, i) => (i === prev.length - 1 ? { ...it, barcode: code } : it)))

        setTimeout(() => autofillFromInventoryByBarcode(code, targetId), 0)

      }, 180)

    }

    window.addEventListener('keydown', handler as any)

    const onAddRow = () => {
      setItems(prev => {
        const newItems = [...prev, { id: crypto.randomUUID(), manufacturer: companyName || '' }]
        setTimeout(() => {
          const newIdx = newItems.length - 1
          const input = document.getElementById(`pharmacy-medicine-input-${newIdx}`) as HTMLInputElement | null
          input?.focus()
        }, 50)
        return newItems
      })
    }
    const onSave = () => {
      saveInvoice()
    }
    const onHold = () => holdInvoice()
    const onCancel = () => cancelInvoice()

    window.addEventListener('pharmacy:invoice:add-row', onAddRow)
    window.addEventListener('pharmacy:invoice:save', onSave)
    window.addEventListener('pharmacy:invoice:hold', onHold)
    window.addEventListener('pharmacy:invoice:cancel', onCancel)

    return () => {
      window.removeEventListener('keydown', handler as any)
      window.removeEventListener('pharmacy:invoice:add-row', onAddRow)
      window.removeEventListener('pharmacy:invoice:save', onSave)
      window.removeEventListener('pharmacy:invoice:hold', onHold)
      window.removeEventListener('pharmacy:invoice:cancel', onCancel)
    }
  }, [items, invoiceNo, invoiceDate, supplierId, supplierName, companyId, companyName, invoiceTaxes, isEdit, id, fromPending, navigate])



  const refreshSuppliers = async () => {

    const res: any = await pharmacyApi.listAllSuppliers()

    const list = res?.items ?? res ?? []

    setSuppliers(list)

    return list as any[]

  }

  const refreshCompanies = async (distId: string) => {
    const res: any = await pharmacyApi.listAllCompanies({ distributorId: distId })
    const list = res?.items ?? res ?? []
    setCompanies(list)
    return list as any[]
  }



  const addSupplier = async (s: Supplier) => {

    try {

      const created: any = await pharmacyApi.createSupplier({

        name: s.name,

        company: s.company,

        phone: s.phone,

        address: s.address,

        taxId: s.taxId,

        status: s.status,

      })

      const list = await refreshSuppliers()

      const newId = String(created?._id || created?.id || '')

      if (newId) {

        setSupplierId(newId)

        const found = list.find((x: any) => String(x._id) === newId)

        setSupplierName(found?.name || s.name || '')

      } else {

        setSupplierId('')

        setSupplierName(s.name || '')

      }

      showToast('success', 'Supplier added')

    } catch {

      showToast('error', 'Failed to add supplier')

    }

  }



  useEffect(() => {

    let mounted = true

    pharmacyApi.getAllMedicines().then((res: any) => {

      if (!mounted) return

      const meds = res?.medicines ?? res ?? []

      if (Array.isArray(meds)) setAllMedicines(meds)

    }).catch(() => { })

    return () => { mounted = false }

  }, [])



  const searchMedicines = async (query: string, rowId: string) => {

    if (!query.trim()) {

      setSuggestions([])

      setShowSuggestions(null)

      return

    }



    try {

      const res: any = await pharmacyApi.searchMedicines(query, 20)

      if (res?.suggestions && Array.isArray(res.suggestions)) {

        setSuggestions(res.suggestions)

        setShowSuggestions(rowId)

      }

    } catch (error) {

      console.error('Error searching medicines:', error)

    }

  }



  const handleMedicineInput = (value: string, rowId: string) => {

    setItems(prev => prev.map(it => it.id === rowId ? { ...it, name: value } : it))



    if (searchTimeoutRef.current) {

      clearTimeout(searchTimeoutRef.current)

    }



    searchTimeoutRef.current = setTimeout(() => {

      searchMedicines(value, rowId)

    }, 300)

  }



  const selectSuggestion = (suggestion: { id: number; name: string }, rowId: string) => {

    setItems(prev => prev.map(it => it.id === rowId ? { ...it, name: suggestion.name } : it))

    setShowSuggestions(null)

    setSuggestions([])

      ; (async () => {

        try {

          const res: any = await pharmacyApi.listInventory({ search: suggestion.name, limit: 1 })

          const it = (res?.items || [])[0]

          if (!it) return

          const units = Number(it.unitsPerPack || 1)

          const directSaleUnit = (it.lastSalePerUnit != null) ? Number(it.lastSalePerUnit) : undefined

          const directSalePack = (it.lastSalePerPack != null) ? Number(it.lastSalePerPack) : undefined

          const saleUnit = (directSaleUnit != null) ? directSaleUnit : (units ? (Number(directSalePack || 0) / units) : 0)

          const salePack = (directSalePack != null) ? directSalePack : ((saleUnit || 0) * units)

          const directBuyUnit = (it.lastBuyPerUnit != null) ? Number(it.lastBuyPerUnit) : undefined

          const directBuyPack = (it.lastBuyPerPack != null) ? Number(it.lastBuyPerPack) : undefined

          const buyUnit = (directBuyUnit != null) ? directBuyUnit : (units ? (Number(directBuyPack || 0) / units) : 0)

          const buyPack = (directBuyPack != null) ? directBuyPack : ((buyUnit || 0) * units)

          const gen = it.lastGenericName || it.genericName || ''

          const key = String(it.key || it._id || it.name || '')

          setItems(prev => prev.map(r => r.id === rowId ? {

            ...r,

            unitsPerPack: units || r.unitsPerPack,

            category: it.category ?? r.category,

            brand: it.brand ?? r.brand,

            unitType: it.unitType ?? r.unitType,

            shelfNumber: it.shelfNumber ?? r.shelfNumber,

            manufacturer: it.manufacturer || r.manufacturer,

            barcode: it.barcode || r.barcode,

            buyPerPack: buyPack || r.buyPerPack,

            buyPerUnit: buyUnit || r.buyPerUnit,

            salePerPack: salePack || r.salePerPack,

            salePerUnit: saleUnit || r.salePerUnit,

            genericName: gen || r.genericName,

            inventoryKey: key || r.inventoryKey,

            totalItems: (r.packs || 0) * (units || r.unitsPerPack || 1),

            defaultDiscountPct: (it.defaultDiscountPct != null) ? Number(it.defaultDiscountPct) : r.defaultDiscountPct,

          } : r))
        } catch { }

      })()

  }



  const handleEnterKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      const target = e.target as HTMLElement
      // If it's a textarea, let it handle Enter normally
      if (target.tagName.toLowerCase() === 'textarea') return

      e.preventDefault()

      if (target.id === 'pharmacy-add-invoice-date') {
        const firstMedInput = document.getElementById('pharmacy-medicine-input-0')
        if (firstMedInput) {
          firstMedInput.focus()
          return
        }
      }

      const form = target.closest('.flex-nowrap') || target.closest('.grid') || target.closest('tr') || target.closest('form')
      if (!form) return

      const focusable = Array.from(form.querySelectorAll('input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])')) as HTMLElement[]
      const index = focusable.indexOf(target)

      if (index > -1 && index < focusable.length - 1) {
        focusable[index + 1].focus()
      }
    }
  }

  // derived totals

  const gross = items.reduce((sum, r) => sum + (r.buyPerPack || 0) * (r.packs || 0), 0)

  const lineTaxesTotal = items.reduce((sum, r) => {

    const base = (r.buyPerPack || 0) * (r.packs || 0)

    const t = r.lineTaxType || 'percent'

    const v = r.lineTaxValue || 0

    const tax = t === 'percent' ? base * (v / 100) : v

    return sum + tax

  }, 0)

  const discount = 0

  const taxableBase = Math.max(0, gross - discount)

  const invoiceTaxesTotal = invoiceTaxes.reduce((sum, t) => {

    const type = t.type || 'percent'

    const v = t.value || 0

    const applyOn = t.applyOn || 'gross'

    const base = applyOn === 'gross' ? taxableBase : (taxableBase + lineTaxesTotal)

    const amt = type === 'percent' ? base * (v / 100) : v

    return sum + amt

  }, 0)

  const netTotal = taxableBase + lineTaxesTotal + invoiceTaxesTotal

  const autoMinWidth = (val: string | undefined, base: number) => {
    const n = String(val || '').trim().length
    const px = base + Math.max(0, n - 10) * 9
    return Math.min(900, Math.max(base, px))
  }


  return (

    <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100">

      {toast ? (

        <div className="fixed right-4 top-4 z-60 w-[min(92vw,420px)]">

          <div

            className={`flex items-start gap-3 rounded-xl border p-4 shadow-lg ring-1 ring-black/5 ${toast?.type === 'success'

              ? 'border-emerald-200 bg-emerald-50 text-emerald-900'

              : 'border-rose-200 bg-rose-50 text-rose-900'

              }`}

            role="status"

            aria-live="polite"

          >

            <div className="mt-0.5 shrink-0">

              {toast?.type === 'success' ? (

                <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">

                  <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.78-9.72a.75.75 0 0 0-1.06-1.06L9.25 10.69 7.28 8.72a.75.75 0 0 0-1.06 1.06l2.5 2.5c.3.3.77.3 1.06 0l4-4Z" clipRule="evenodd" />

                </svg>

              ) : (

                <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">

                  <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-4a.75.75 0 0 0-.75.75v4.5c0 .414.336.75.75.75h.01a.75.75 0 0 0 .74-.75v-4.5A.75.75 0 0 0 10 6Zm0 8a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />

                </svg>

              )}

            </div>

            <div className="min-w-0 flex-1">

              <div className="text-sm font-semibold">{toast?.type === 'success' ? 'Success' : 'Error'}</div>

              <div className="mt-0.5 text-sm opacity-90">{toast?.message}</div>

            </div>

            <button

              type="button"

              onClick={() => {

                if (toastTimerRef.current) {

                  window.clearTimeout(toastTimerRef.current)

                  toastTimerRef.current = null

                }

                setToast(null)

              }}

              className="ml-1 rounded-md p-1 opacity-70 hover:opacity-100"

              aria-label="Dismiss"

            >

              <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">

                <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />

              </svg>

            </button>

          </div>

        </div>

      ) : null}



      {/* Header */}

      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-lg border-b border-slate-200">

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

          <div className="flex items-center justify-between h-16">

            <div className="flex items-center gap-4">

              <button

                onClick={() => navigate(fromPending ? '/pharmacy/inventory?tab=pending' : '/pharmacy/inventory')}

                className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"

              >

                <ArrowLeft className="h-4 w-4" />

                Back

              </button>

              <div className="flex items-center gap-2">

                <Package className="h-6 w-6 text-indigo-600" />

                <h1 className="text-xl font-bold text-slate-900">{isEdit ? 'Edit Purchase Invoice' : 'Add Purchase Invoice'}</h1>

              </div>

            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={holdInvoice}
                className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700 hover:bg-amber-100"
              >
                <Pause className="h-4 w-4" />
                Hold Invoice
              </button>

              <button
                type="button"
                onClick={() => setHeldOpen(true)}
                className="rounded-lg border border-sky-300 bg-sky-50 px-4 py-2 text-sm font-medium text-sky-700 hover:bg-sky-100 "
              >
                <Package className="h-4 w-4" />
                Held Invoices
              </button>

              <button
                type="button"
                onClick={cancelInvoice}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={saveInvoice}
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors shadow-lg"
              >
                <Save className="h-4 w-4" />
                {isEdit ? 'Update Invoice' : 'Save Invoice'}
              </button>
            </div>

          </div>

        </div>

      </div>



      {/* Main Content */}

      {heldOpen && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl ">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-indigo-600" />
                <h2 className="text-xl font-bold text-slate-900">Held Invoices</h2>
              </div>
              <button type="button" onClick={() => setHeldOpen(false)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 ">
                <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5"><path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" /></svg>
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto rounded-xl border border-slate-200 ">
              {loadingHeld ? (
                <div className="p-8 text-center text-slate-500">Loading held invoices...</div>
              ) : heldInvoices.length === 0 ? (
                <div className="p-8 text-center text-slate-500">No held invoices found</div>
              ) : (
                <div className="divide-y divide-slate-200">
                  {heldInvoices.map(h => (
                    <div key={h._id} className="flex items-center justify-between gap-4 p-4 hover:bg-slate-50 ">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900 truncate">{h.invoice}</span>
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">{h.status || 'Held'}</span>
                        </div>
                        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                          <span>{new Date(h.date || h.createdAtIso).toLocaleDateString()}</span>
                          <span>{h.supplierName || 'No Supplier'}</span>
                          <span>{h.lines?.length || 0} Items</span>
                          <span className="font-medium text-indigo-600">PKR {Number(h.totalAmount || h.totals?.net || 0).toLocaleString()}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => restoreHeld(h._id)}
                          className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors"
                        >
                          Restore
                        </button>
                        <button
                          type="button"
                          onClick={() => confirmDeleteHeld(h._id)}
                          className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button type="button" onClick={() => setHeldOpen(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirmOpen && (
        <div className="fixed inset-0 z-110 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 ">
                <svg className="h-5 w-5 text-red-600 " viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5Zm0 9a1 1 0 100-2 1 1 0 000 2Z" clipRule="evenodd" />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-slate-900 ">Delete Held Invoice?</h2>
            </div>
            <p className="mb-6 text-sm text-slate-600 ">
              This action cannot be undone. The held invoice will be permanently removed.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => { setDeleteConfirmOpen(false); setHeldToDelete(null); }}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={deleteHeld}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="w-full px-2 sm:px-4 lg:px-6 py-6">
        <div className="space-y-6">
          {/* Top Row: Invoice Details */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200">
            <div className="px-4 py-3 border-b border-slate-200 bg-slate-50/50 flex items-center gap-2">
              <FileText className="h-4 w-4 text-indigo-600" />
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Invoice Details</h2>
            </div>
            <div className="p-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label className="mb-1 block text-[11px] font-bold uppercase text-slate-500">Supplier</label>
                  <div className="flex gap-1.5">
                    <div className="flex-1 min-w-0">
                      <SearchableSelect
                        value={supplierId}
                        onChange={(v) => {
                          setSupplierId(v)
                          const s = suppliers.find((x: any) => String(x._id) === String(v))
                          setSupplierName(s?.name || '')
                        }}
                        options={(suppliers || []).map((s: any) => ({ value: String(s._id), label: String(s.name || '') }))}
                        placeholder="Supplier..."
                      />
                    </div>
                    <button type="button" onClick={() => setAddSupplierOpen(true)} className="px-2.5 py-1.5 text-xs font-bold text-indigo-600 hover:bg-indigo-50 border border-indigo-200 rounded-lg transition-colors whitespace-nowrap">+ Add</button>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-bold uppercase text-slate-500">Company</label>
                  <div className="flex gap-1.5">
                    <div className="flex-1 min-w-0">
                      <SearchableSelect
                        value={companyId}
                        disabled={!supplierId}
                        onChange={(v) => {
                          setCompanyId(v)
                          const c = companies.find((x: any) => String(x._id) === String(v))
                          setCompanyName(c?.name || '')
                        }}
                        options={(companies || []).map((c: any) => ({ value: String(c._id), label: String(c.name || '') }))}
                        placeholder={supplierId ? 'Company...' : 'Select supplier'}
                      />
                    </div>
                    <button type="button" onClick={() => setAddCompanyOpen(true)} className="px-2.5 py-1.5 text-xs font-bold text-indigo-600 hover:bg-indigo-50 border border-indigo-200 rounded-lg transition-colors whitespace-nowrap">+ Add</button>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-bold uppercase text-slate-500">Invoice No *</label>
                  <input
                    id="pharmacy-add-invoice-no"
                    value={invoiceNo}
                    onChange={e => setInvoiceNo(e.target.value)}
                    onKeyDown={handleEnterKey}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none"
                    placeholder="INV-001"
                    required
                  />
                </div>

                <div>
                  <ModernDatePicker
                    value={invoiceDate}
                    onChange={v => setInvoiceDate(v)}
                    label="Invoice Date *"
                    className="w-full"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Middle Row: Medicine Items (Expanded to Full Width) */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
                    <Package className="h-5 w-5" />
                  </div>
                  <h2 className="text-lg font-semibold text-slate-900">Medicine Items ({items.length})</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setItems(prev => [...prev, { id: crypto.randomUUID() }])}
                  className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-all shadow-md active:scale-95"
                >
                  <Plus className="h-4 w-4" />
                  Add New Item
                </button>
              </div>
            </div>

            <div className="p-0">
              <div className="max-h-[70vh] overflow-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent hover:scrollbar-thumb-slate-400">
                <table className="w-full border-collapse text-left">
                  <thead className="sticky top-0 z-30 bg-slate-100/90 backdrop-blur-sm border-b border-slate-200">
                    <tr className="divide-x divide-slate-200">
                      <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-600 whitespace-nowrap min-w-[50px]">#</th>
                      <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-600 whitespace-nowrap min-w-[300px]">Medicine Name *</th>
                      <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-600 whitespace-nowrap min-w-[180px]">Generic Name</th>
                      <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-600 whitespace-nowrap min-w-[140px]">Expiry</th>
                      <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-600 whitespace-nowrap min-w-[160px]">Barcode</th>
                      <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-600 whitespace-nowrap min-w-[140px]">Category</th>
                      <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-600 whitespace-nowrap min-w-[140px]">Brand</th>
                      <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-600 whitespace-nowrap min-w-[180px]">Manufacturer</th>
                      <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-600 whitespace-nowrap min-w-[120px]">Unit Type</th>
                      <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-600 whitespace-nowrap min-w-[100px]">Qty (Pks) *</th>
                      <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-600 whitespace-nowrap min-w-[100px]">Units/Pk *</th>
                      <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-600 whitespace-nowrap min-w-[120px]">Buy/Pk *</th>
                      <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-600 whitespace-nowrap min-w-[120px]">Sale/Pk *</th>
                      <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-600 whitespace-nowrap min-w-[120px]">Buy/Unit</th>
                      <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-600 whitespace-nowrap min-w-[120px]">Sale/Unit</th>
                      <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-600 whitespace-nowrap min-w-[100px]">Total Items</th>
                      <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-600 whitespace-nowrap min-w-[100px]">Min Stock</th>
                      <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-600 whitespace-nowrap min-w-[120px]">Max Disc/Unit</th>
                      <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-600 whitespace-nowrap min-w-[100px]">Shelf#</th>
                      <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-600 whitespace-nowrap min-w-[120px]">Max Pk Allow</th>
                      <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-600 whitespace-nowrap min-w-[120px]">Min Pk Stock</th>
                      <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-600 whitespace-nowrap min-w-[180px]">Line Tax</th>
                      <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-600 whitespace-nowrap min-w-[120px]">Subtotal</th>
                      <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-600 whitespace-nowrap min-w-[80px]">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map((row, idx) => (
                      <tr key={row.id} className="divide-x divide-slate-100 hover:bg-slate-50 transition-colors group">
                        <td className="px-2 py-2 text-center align-middle">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                            {idx + 1}
                          </span>
                        </td>
                        <td className="px-2 py-2 relative" style={{ minWidth: autoMinWidth(row.name, 300) }}>
                          <input
                            id={`pharmacy-medicine-input-${idx}`}
                            list="pharmacy-medicine-list"
                            value={row.name || ''}
                            onChange={e => handleMedicineInput(e.target.value, row.id)}
                            onKeyDown={handleEnterKey}
                            onFocus={() => { if (row.name?.trim()) searchMedicines(row.name, row.id) }}
                            onBlur={() => autofillFromInventoryByName(row.name, row.id)}
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all outline-none"
                            placeholder="Medicine name..."
                          />
                          <datalist id="pharmacy-medicine-list">
                            {allMedicines.map(m => <option key={m.id} value={m.name} />)}
                          </datalist>
                          {showSuggestions === row.id && suggestions.length > 0 && (
                            <div className="absolute z-50 left-0 top-full mt-1 rounded-lg border border-slate-200 bg-white shadow-xl max-h-60 overflow-y-auto ring-1 ring-black/5 min-w-[480px] max-w-[80vw]">
                              {suggestions.map((sug) => (
                                <button
                                  key={sug.id}
                                  type="button"
                                  onClick={() => selectSuggestion(sug, row.id)}
                                  className="w-full px-4 py-2 text-left text-sm hover:bg-indigo-50 transition-colors border-b border-slate-50 last:border-0 font-medium text-slate-700 whitespace-nowrap"
                                >
                                  {sug.name}
                                </button>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="px-2 py-2" style={{ minWidth: autoMinWidth(row.genericName, 180) }}>
                          <input
                            value={row.genericName || ''}
                            onChange={e => setItems(prev => prev.map(it => it.id === row.id ? { ...it, genericName: e.target.value } : it))}
                            onKeyDown={handleEnterKey}
                            className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none"
                          />
                        </td>
                        <td className="px-2 py-2" style={{ minWidth: 180 }}>
                          <ModernDatePicker
                            value={row.expiry || ''}
                            onChange={v => setItems(prev => prev.map(it => it.id === row.id ? { ...it, expiry: v } : it))}
                            className="w-full"
                          />
                        </td>
                        <td className="px-2 py-2" style={{ minWidth: autoMinWidth(row.barcode, 160) }}>
                          <input
                            value={row.barcode || ''}
                            onChange={e => {
                              const v = e.target.value
                              setItems(prev => prev.map(it => it.id === row.id ? { ...it, barcode: v } : it))
                              const t = barcodeTimersRef.current[row.id]
                              if (t) try { clearTimeout(t) } catch { }
                              barcodeTimersRef.current[row.id] = setTimeout(() => {
                                const code = v?.trim()
                                if (code && code.length >= 6) autofillFromInventoryByBarcode(code, row.id)
                              }, 220)
                            }}
                            onBlur={() => autofillFromInventoryByBarcode(row.barcode, row.id)}
                            onKeyDown={e => { if (e.key === 'Enter') { e.currentTarget.blur(); handleEnterKey(e) } }}
                            className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none"
                            placeholder="Scan..."
                          />
                        </td>
                        <td className="px-2 py-2" style={{ minWidth: autoMinWidth(row.category, 140) }}>
                          <input
                            value={row.category || ''}
                            onChange={e => setItems(prev => prev.map(it => it.id === row.id ? { ...it, category: e.target.value } : it))}
                            onKeyDown={handleEnterKey}
                            className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none"
                          />
                        </td>
                        <td className="px-2 py-2" style={{ minWidth: autoMinWidth(row.brand, 140) }}>
                          <input
                            value={row.brand || ''}
                            onChange={e => setItems(prev => prev.map(it => it.id === row.id ? { ...it, brand: e.target.value } : it))}
                            onKeyDown={handleEnterKey}
                            className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none"
                          />
                        </td>
                        <td className="px-2 py-2" style={{ minWidth: autoMinWidth(row.manufacturer, 180) }}>
                          <input
                            value={row.manufacturer || ''}
                            onChange={e => setItems(prev => prev.map(it => it.id === row.id ? { ...it, manufacturer: e.target.value } : it))}
                            onKeyDown={handleEnterKey}
                            className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none"
                          />
                        </td>
                        <td className="px-2 py-2 min-w-[120px]">
                          <input
                            value={row.unitType || ''}
                            onChange={e => setItems(prev => prev.map(it => it.id === row.id ? { ...it, unitType: e.target.value } : it))}
                            onKeyDown={handleEnterKey}
                            className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none"
                          />
                        </td>
                        <td className="px-2 py-2 min-w-[100px]">
                          <input
                            type="number"
                            value={row.packs ?? ''}
                            onChange={e => {
                              const packs = Number(e.target.value || 0);
                              setItems(prev => prev.map(it => {
                                if (it.id === row.id) {
                                  const updates: Partial<ItemRow> = {
                                    packs: packs,
                                    totalItems: packs * Math.max(1, row.unitsPerPack || 1)
                                  };
                                  // Auto-populate Max Pack Allow and Min Pack Stock from packs on first entry
                                  if (it.maxPackAllow === undefined || it.maxPackAllow === 0) {
                                    updates.maxPackAllow = packs;
                                    updates.minPackStock = Math.floor(packs / 2);
                                  } else {
                                    // If user is editing packs and it was already auto-populated, keep it synced? 
                                    // The user said "jitna ham total pack buy kry gy utny maximum allow field my auto ana chahiya"
                                    // So we should always sync if the user hasn't manually overridden it?
                                    // For now, let's just fix why 50 becomes 5. 
                                    // Actually, if I type '5', packs is 5. If I type '0' after '5' to make it '50', 
                                    // packs becomes 50. But if maxPackAllow was already set to 5, it won't update.
                                    updates.maxPackAllow = packs;
                                    updates.minPackStock = Math.floor(packs / 2);
                                  }
                                  return { ...it, ...updates };
                                }
                                return it;
                              }));
                            }}
                            onKeyDown={handleEnterKey}
                            className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-bold text-indigo-600 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none"
                          />
                        </td>
                        <td className="px-2 py-2 min-w-[100px]">
                          <input
                            type="number"
                            value={row.unitsPerPack ?? ''}
                            onChange={e => setItems(prev => prev.map(it => it.id === row.id ? { ...it, unitsPerPack: Number(e.target.value || 0), buyPerUnit: (row.buyPerPack || 0) / Math.max(1, Number(e.target.value || 0)), salePerUnit: (row.salePerPack || 0) / Math.max(1, Number(e.target.value || 0)), totalItems: (row.packs || 0) * Math.max(1, Number(e.target.value || 0)) } : it))}
                            onKeyDown={handleEnterKey}
                            className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none"
                          />
                        </td>
                        <td className="px-2 py-2 min-w-[120px]">
                          <input
                            type="number"
                            step="0.01"
                            value={row.buyPerPack ?? ''}
                            onChange={e => {
                              const newBuyPerPack = Number(e.target.value || 0)
                              const buyPerUnit = Math.max(0, newBuyPerPack) / Math.max(1, row.unitsPerPack || 1)
                              
                              // Calculate maximum discount percentage
                              // Max discount = ((salePerPack - buyPerPack) / salePerPack) * 100
                              let maxDiscount = 0
                              if (row.salePerPack && row.salePerPack > newBuyPerPack) {
                                maxDiscount = Math.floor(((row.salePerPack - newBuyPerPack) / row.salePerPack) * 100)
                              }
                              
                              setItems(prev => prev.map(it => it.id === row.id ? { 
                                ...it, 
                                buyPerPack: newBuyPerPack, 
                                buyPerUnit,
                                defaultDiscountPct: maxDiscount
                              } : it))
                            }}
                            onKeyDown={handleEnterKey}
                            className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-bold text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none"
                          />
                        </td>
                        <td className="px-2 py-2 min-w-[120px]">
                          <input
                            type="number"
                            step="0.01"
                            value={row.salePerPack ?? ''}
                            onChange={e => {
                              const newSalePerPack = Number(e.target.value || 0)
                              const salePerUnit = Math.max(0, newSalePerPack) / Math.max(1, row.unitsPerPack || 1)
                              
                              // Calculate maximum discount percentage
                              // Max discount = ((salePerPack - buyPerPack) / salePerPack) * 100
                              let maxDiscount = 0
                              if (newSalePerPack && row.buyPerPack && newSalePerPack > row.buyPerPack) {
                                maxDiscount = Math.floor(((newSalePerPack - row.buyPerPack) / newSalePerPack) * 100)
                              }
                              
                              setItems(prev => prev.map(it => it.id === row.id ? { 
                                ...it, 
                                salePerPack: newSalePerPack, 
                                salePerUnit,
                                defaultDiscountPct: maxDiscount
                              } : it))
                            }}
                            onKeyDown={handleEnterKey}
                            className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-bold text-emerald-600 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none"
                          />
                        </td>
                        <td className="px-2 py-2 min-w-[120px]">
                          <input
                            type="number"
                            step="0.01"
                            value={row.buyPerUnit ?? ''}
                            onChange={e => {
                              const newBuyPerUnit = Number(e.target.value || 0)
                              const newBuyPerPack = newBuyPerUnit * Math.max(1, row.unitsPerPack || 1)
                              
                              // Calculate maximum discount percentage
                              let maxDiscount = 0
                              if (row.salePerPack && row.salePerPack > newBuyPerPack) {
                                maxDiscount = Math.floor(((row.salePerPack - newBuyPerPack) / row.salePerPack) * 100)
                              }
                              
                              setItems(prev => prev.map(it => it.id === row.id ? { 
                                ...it, 
                                buyPerUnit: newBuyPerUnit, 
                                buyPerPack: newBuyPerPack,
                                defaultDiscountPct: maxDiscount
                              } : it))
                            }}
                            onKeyDown={handleEnterKey}
                            className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none"
                          />
                        </td>
                        <td className="px-2 py-2 min-w-[120px]">
                          <input
                            type="number"
                            step="0.01"
                            value={row.salePerUnit ?? ''}
                            onChange={e => {
                              const newSalePerUnit = Number(e.target.value || 0)
                              const newSalePerPack = newSalePerUnit * Math.max(1, row.unitsPerPack || 1)
                              
                              // Calculate maximum discount percentage
                              let maxDiscount = 0
                              if (newSalePerPack && row.buyPerPack && newSalePerPack > row.buyPerPack) {
                                maxDiscount = Math.floor(((newSalePerPack - row.buyPerPack) / newSalePerPack) * 100)
                              }
                              
                              setItems(prev => prev.map(it => it.id === row.id ? { 
                                ...it, 
                                salePerUnit: newSalePerUnit, 
                                salePerPack: newSalePerPack,
                                defaultDiscountPct: maxDiscount
                              } : it))
                            }}
                            onKeyDown={handleEnterKey}
                            className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none"
                          />
                        </td>
                        <td className="px-2 py-2 min-w-[100px]">
                          <input
                            type="number"
                            value={row.totalItems ?? ((row.unitsPerPack || 1) * (row.packs || 0))}
                            onChange={e => setItems(prev => prev.map(it => it.id === row.id ? { ...it, totalItems: Number(e.target.value || 0), packs: Math.ceil(Number(e.target.value || 0) / Math.max(1, row.unitsPerPack || 1)) } : it))}
                            onKeyDown={handleEnterKey}
                            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-600 outline-none"
                          />
                        </td>
                        <td className="px-2 py-2 min-w-[100px]">
                          <input
                            type="number"
                            autoComplete="off"
                            value={row.minStock ?? ''}
                            onChange={e => setItems(prev => prev.map(it => it.id === row.id ? { ...it, minStock: Number(e.target.value || 0) } : it))}
                            onKeyDown={handleEnterKey}
                            className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none"
                          />
                        </td>
                        <td className="px-2 py-2 min-w-[120px]">
                          <input
                            type="number"
                            step="0.01"
                            min={0}
                            max={100}
                            value={row.defaultDiscountPct ?? ''}
                            onChange={e => {
                              const v = Math.max(0, Math.min(100, Number(e.target.value || 0)))
                              setItems(prev => prev.map(it => it.id === row.id ? { ...it, defaultDiscountPct: v } : it))
                            }}
                            onKeyDown={handleEnterKey}
                            className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none"
                            placeholder="0"
                          />
                        </td>
                        <td className="px-2 py-2 min-w-[100px]">
                          <input
                            value={row.shelfNumber || ''}
                            onChange={e => setItems(prev => prev.map(it => it.id === row.id ? { ...it, shelfNumber: e.target.value } : it))}
                            onKeyDown={handleEnterKey}
                            className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none"
                          />
                        </td>
                        <td className="px-2 py-2 min-w-[120px]">
                          <input
                            type="number"
                            autoComplete="off"
                            value={row.maxPackAllow ?? ''}
                            onChange={e => {
                              const val = Number(e.target.value || 0);
                              setItems(prev => prev.map(it => it.id === row.id ? { 
                                ...it, 
                                maxPackAllow: val,
                                minPackStock: Math.floor(val / 2)
                              } : it))
                            }}
                            onKeyDown={handleEnterKey}
                            className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none"
                          />
                        </td>
                        <td className="px-2 py-2 min-w-[120px]">
                          <input
                            type="number"
                            autoComplete="off"
                            value={row.minPackStock ?? ''}
                            onChange={e => setItems(prev => prev.map(it => it.id === row.id ? { ...it, minPackStock: Number(e.target.value || 0) } : it))}
                            onKeyDown={handleEnterKey}
                            className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none"
                          />
                        </td>
                        <td className="px-2 py-2 min-w-[180px]">
                          <div className="flex gap-1">
                            <select
                              value={(row.lineTaxType || 'percent') === 'percent' ? '%' : 'PKR'}
                              onChange={e => {
                                const val = e.target.value === '%' ? 'percent' : 'fixed'
                                setItems(prev => prev.map(it => it.id === row.id ? { ...it, lineTaxType: val as 'percent' | 'fixed' } : it))
                              }}
                              onKeyDown={handleEnterKey}
                              className="w-14 rounded-lg border border-slate-200 px-1 py-1.5 text-sm outline-none"
                            >
                              <option>%</option>
                              <option>PKR</option>
                            </select>
                            <input
                              type="number"
                              step="0.01"
                              value={row.lineTaxValue ?? ''}
                              onChange={e => setItems(prev => prev.map(it => it.id === row.id ? { ...it, lineTaxValue: Number(e.target.value || 0) } : it))}
                              onKeyDown={handleEnterKey}
                              className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none"
                              placeholder="0"
                            />
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right min-w-[120px] align-middle">
                          <span className="text-sm font-bold text-indigo-600">
                            PKR {((row.buyPerPack || 0) * (row.packs || 0)).toLocaleString()}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-center align-middle min-w-[80px]">
                          {items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => setItems(prev => prev.filter(it => it.id !== row.id))}
                              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Remove Item"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Bottom Row: Summary & Taxes */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Invoice-Level Taxes */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 h-fit">
              <button
                type="button"
                onClick={() => setShowTaxSection(!showTaxSection)}
                className="flex w-full items-center justify-between px-6 py-4 text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
                    <FileText className="h-5 w-5" />
                  </div>
                  <h2 className="text-lg font-semibold text-slate-900">Invoice-Level Taxes ({invoiceTaxes.length})</h2>
                </div>
                {showTaxSection ? <ChevronUp className="h-5 w-5 text-slate-400" /> : <ChevronDown className="h-5 w-5 text-slate-400" />}
              </button>

              {showTaxSection && (
                <div className="border-t border-slate-200 p-6 space-y-4">
                  {invoiceTaxes.map(t => (
                    <div key={t.id} className="grid gap-3 sm:grid-cols-4 items-end bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <div className="sm:col-span-1">
                        <label className="mb-1.5 block text-[10px] font-bold uppercase text-slate-500">Tax Name</label>
                        <input
                          value={t.name || ''}
                          onChange={e => setInvoiceTaxes(prev => prev.map(x => x.id === t.id ? { ...x, name: e.target.value } : x))}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-200"
                          placeholder="GST..."
                        />
                      </div>
                      <div className="flex gap-2 sm:col-span-1">
                        <div className="flex-1">
                          <label className="mb-1.5 block text-[10px] font-bold uppercase text-slate-500">Type</label>
                          <select
                            value={(t.type || 'percent') === 'percent' ? '%' : 'PKR'}
                            onChange={e => {
                              const val = e.target.value === '%' ? 'percent' : 'fixed'
                              setInvoiceTaxes(prev => prev.map(x => x.id === t.id ? { ...x, type: val as 'percent' | 'fixed' } : x))
                            }}
                            className="w-full rounded-lg border border-slate-300 px-2 py-2 text-sm"
                          >
                            <option>%</option>
                            <option>PKR</option>
                          </select>
                        </div>
                        <div className="flex-1">
                          <label className="mb-1.5 block text-[10px] font-bold uppercase text-slate-500">Value</label>
                          <input
                            type="number"
                            step="0.01"
                            value={t.value ?? ''}
                            onChange={e => setInvoiceTaxes(prev => prev.map(x => x.id === t.id ? { ...x, value: Number(e.target.value || 0) } : x))}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                            placeholder="0"
                          />
                        </div>
                      </div>
                      <div className="sm:col-span-1">
                        <label className="mb-1.5 block text-[10px] font-bold uppercase text-slate-500">Apply On</label>
                        <select
                          value={t.applyOn || 'gross'}
                          onChange={e => setInvoiceTaxes(prev => prev.map(x => x.id === t.id ? { ...x, applyOn: e.target.value as 'gross' | 'net' } : x))}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                        >
                          <option value="gross">On Gross</option>
                          <option value="net">On Net</option>
                        </select>
                      </div>
                      <button
                        type="button"
                        onClick={() => setInvoiceTaxes(prev => prev.filter(x => x.id !== t.id))}
                        className="sm:col-span-1 h-9 rounded-lg px-3 text-sm font-bold text-rose-600 hover:bg-rose-100 transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setInvoiceTaxes(prev => [...prev, { id: crypto.randomUUID(), type: 'percent', applyOn: 'gross' }])}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 px-4 py-3 text-sm font-bold text-slate-500 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
                  >
                    <Plus className="h-4 w-4" />
                    Add Global Tax
                  </button>
                </div>
              )}
            </div>

            {/* Totals Summary */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 text-slate-900 overflow-hidden h-fit">
              <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
                <h2 className="text-sm font-bold flex items-center gap-2 uppercase tracking-wider text-slate-700">
                  <div className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                  Invoice Summary
                </h2>
              </div>
              <div className="px-4 py-4 space-y-2">
                <div className="flex justify-between items-center text-slate-600">
                  <span className="text-[11px] font-bold uppercase tracking-wider opacity-80">Gross Amount</span>
                  <span className="text-sm font-semibold">PKR {gross.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between items-center text-slate-600">
                  <span className="text-[11px] font-bold uppercase tracking-wider opacity-80">Line Taxes</span>
                  <span className="text-sm font-semibold">+ PKR {lineTaxesTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between items-center text-slate-600">
                  <span className="text-[11px] font-bold uppercase tracking-wider opacity-80">Invoice Taxes</span>
                  <span className="text-sm font-semibold">+ PKR {invoiceTaxesTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>

                <div className="pt-3 border-t border-slate-100">
                  <div className="flex flex-col items-end gap-0.5">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Net Total Amount</span>
                    <span className="text-2xl font-black tracking-tight text-indigo-600">
                      PKR {netTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>



      <Pharmacy_AddSupplierDialog

        open={addSupplierOpen}

        onClose={() => setAddSupplierOpen(false)}

        onSave={addSupplier}

      />

      <Pharmacy_AddCompanyDialog
        open={addCompanyOpen}
        onClose={() => setAddCompanyOpen(false)}
        onSave={addCompany}
      />

    </div>

  )

}
