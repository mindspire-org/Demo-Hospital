import { useEffect, useState, useCallback, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { RotateCw, FileDown, CalendarDays, Package, TrendingDown, AlertTriangle, FileSpreadsheet } from 'lucide-react'
import * as XLSX from 'xlsx'
import Pharmacy_InventoryTable from '../../components/pharmacy/pharmacy_InventoryTable'
import Pharmacy_UpdateStock from '../../components/pharmacy/pharmacy_UpdateStock'
import { pharmacyApi } from '../../utils/api'
import Pharmacy_EditInventoryItem from '../../components/pharmacy/pharmacy_EditInventoryItem'
import Pharmacy_ConfirmDialog from '../../components/pharmacy/pharmacy_ConfirmDialog'
import Pharmacy_AuditAdjustDialog from '../../components/pharmacy/pharmacy_AuditAdjustDialog'

export default function Pharmacy_Inventory() {
  const navigate = useNavigate()
  const location = useLocation()
  useEffect(() => {
    const t = setTimeout(() => { (document.getElementById('pharmacy-inventory-search') as HTMLInputElement | null)?.focus() }, 0)
    return () => { clearTimeout(t) }
  }, [])
  const [updateStockOpen, setUpdateStockOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editMedicine, setEditMedicine] = useState<string>('')
  const tabs = ['All Items', 'In Stock', 'Pending Review', 'Low Stock', 'Expiring Soon', 'Out of Stock', 'Narcotics', 'Dead Items'] as const
  type Tab = typeof tabs[number]
  const [activeTab, setActiveTab] = useState<Tab>('All Items')
  const activeTabRef = useRef<Tab>('All Items')
  useEffect(() => { activeTabRef.current = activeTab }, [activeTab])
  const [rows, setRows] = useState<any[]>([])
  const rowsRef = useRef<any[]>([])
  useEffect(() => { rowsRef.current = rows }, [rows])
  const [search, setSearch] = useState('')
  const [refreshTick, setRefreshTick] = useState(0)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [toDelete, setToDelete] = useState<string | null>(null)
  const [approveConfirmOpen, setApproveConfirmOpen] = useState(false)
  const [approveTarget, setApproveTarget] = useState<{ id: string; invoice: string; itemCount: number; lineId?: string; medicine?: string } | null>(null)
  const [rejectConfirmOpen, setRejectConfirmOpen] = useState(false)
  const [rejectTarget, setRejectTarget] = useState<{ id: string; lineId?: string; medicine?: string } | null>(null)
  const [stats, setStats] = useState<{ stockSaleValue: number; lowStockCount: number; outOfStockCount: number; expiringSoonCount: number }>({ stockSaleValue: 0, lowStockCount: 0, outOfStockCount: 0, expiringSoonCount: 0 })
  const [settings, setSettings] = useState<any>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [limit, setLimit] = useState(10)
  const [pageCache, setPageCache] = useState<Record<number, any[]>>({})
  const [adjustOpen, setAdjustOpen] = useState(false)
  const approveButtonRef = useRef<HTMLButtonElement>(null)
  const rejectButtonRef = useRef<HTMLButtonElement>(null)

  // Auto-focus approve button when dialog opens
  useEffect(() => {
    if (approveConfirmOpen) {
      setTimeout(() => {
        approveButtonRef.current?.focus()
      }, 100)
    }
  }, [approveConfirmOpen])

  // Auto-focus reject button when dialog opens
  useEffect(() => {
    if (rejectConfirmOpen) {
      setTimeout(() => {
        rejectButtonRef.current?.focus()
      }, 100)
    }
  }, [rejectConfirmOpen])

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Check if the user is typing in an input or textarea
    const isTyping = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;

    // Alt + S to focus search (even if typing)
    if (e.altKey && e.key.toLowerCase() === 's') {
      e.preventDefault();
      document.getElementById('pharmacy-inventory-search')?.focus();
      return;
    }

    if (isTyping) return;

    // Alt + E: Edit first item (placed before single key 'e' to capture it correctly)
    if (e.altKey && e.key.toLowerCase() === 'e') {
      e.preventDefault();
      if (rowsRef.current.length > 0) {
        const firstRow = rowsRef.current[0];
        const currentTab = activeTabRef.current;
        if (currentTab === 'Pending Review' && firstRow.draftId) {
          const search = '?from=pending';
          navigate(`/pharmacy/inventory/edit-invoice/${encodeURIComponent(firstRow.draftId)}${search}`);
        } else {
          setEditMedicine(firstRow.medicine);
          setEditOpen(true);
        }
      }
      return;
    }

    // U: Update Stock
    if (e.key.toLowerCase() === 'u' && !e.altKey && !e.ctrlKey && !e.shiftKey) {
      e.preventDefault();
      setUpdateStockOpen(true);
    }
    // A: Audit Adjustment
    else if (e.key.toLowerCase() === 'a' && !e.altKey && !e.ctrlKey && !e.shiftKey) {
      e.preventDefault();
      setAdjustOpen(true);
    }
    // I: Add Invoice
    else if (e.key.toLowerCase() === 'i' && !e.altKey && !e.ctrlKey && !e.shiftKey) {
      e.preventDefault();
      navigate('/pharmacy/inventory/add-invoice');
    }
    // R: Refresh
    else if (e.key.toLowerCase() === 'r' && !e.altKey && !e.ctrlKey && !e.shiftKey) {
      e.preventDefault();
      setRefreshTick((t: number) => t + 1);
    }
    // E: Export - ONLY if it's JUST the 'E' key, not Alt+E
    else if (e.key.toLowerCase() === 'e' && !e.altKey && !e.ctrlKey && !e.shiftKey) {
      e.preventDefault();
      handleExport();
    }
    // P: Print
    else if (e.key.toLowerCase() === 'p' && !e.altKey && !e.ctrlKey && !e.shiftKey) {
      e.preventDefault();
      handlePrint();
    }
    // Approve All (Pending Review tab only) - Shift + A
    else if (e.shiftKey && e.key.toLowerCase() === 'a' && activeTab === 'Pending Review') {
      e.preventDefault();
      approveAll();
    }
    // Reject All (Pending Review tab only) - Shift + R
    else if (e.shiftKey && e.key.toLowerCase() === 'r' && activeTab === 'Pending Review') {
      e.preventDefault();
      rejectAll();
    }
    // Numbers 1-7 for Tabs
    else if (e.key >= '1' && e.key <= '7') {
      e.preventDefault();
      const tabIndex = parseInt(e.key) - 1;
      if (tabs[tabIndex]) {
        setTabAndUrl(tabs[tabIndex]);
      }
    }
    // Individual Actions (Row 1 fallback for other tabs)
    else if (rowsRef.current.length > 0) {
      const firstRow = rowsRef.current[0];
      const currentTab = activeTabRef.current;
      
      // Alt + D: Delete first item (only if not Pending Review)
      if (e.altKey && e.key.toLowerCase() === 'd' && currentTab !== 'Pending Review') {
        e.preventDefault();
        const m = (firstRow.medicine || '').trim();
        if (m) {
          setToDelete(m);
          setConfirmOpen(true);
        }
      }
      // Alt + A: Approve first draft/line (Pending Review only)
      else if (e.altKey && e.key.toLowerCase() === 'a' && currentTab === 'Pending Review') {
        e.preventDefault();
        const invoiceItemCount = rowsRef.current.filter((row: any) => row.draftId === firstRow.draftId).length;
        if (firstRow.draftId) confirmApproveOne(firstRow.draftId, firstRow.invoice, invoiceItemCount, firstRow.lineId);
      }
      // Alt + R: Reject first draft/line (Pending Review only)
      else if (e.altKey && e.key.toLowerCase() === 'r' && currentTab === 'Pending Review') {
        e.preventDefault();
        if (firstRow.draftId) confirmRejectOne(firstRow.draftId, firstRow.lineId);
      }
    }
  }, [navigate, tabs, handleExport, handlePrint]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);


  useEffect(() => {
    const onUpdateStock = () => setUpdateStockOpen(true)
    const onAuditAdjust = () => setAdjustOpen(true)
    const onAddInvoice = () => navigate('/pharmacy/inventory/add-invoice')
    const onRefresh = () => setRefreshTick((t: number) => t + 1)
    const onExport = () => handleExport()
    const onSetTab = (e: any) => {
      const tab = e.detail as Tab
      if (tabs.includes(tab)) setTabAndUrl(tab)
    }

    window.addEventListener('pharmacy:inventory:update-stock', onUpdateStock)
    window.addEventListener('pharmacy:inventory:audit-adjust', onAuditAdjust)
    window.addEventListener('pharmacy:inventory:add-invoice', onAddInvoice)
    window.addEventListener('pharmacy:inventory:refresh', onRefresh)
    window.addEventListener('pharmacy:inventory:export', onExport)
    window.addEventListener('pharmacy:inventory:set-tab', onSetTab)

    return () => {
      window.removeEventListener('pharmacy:inventory:update-stock', onUpdateStock)
      window.removeEventListener('pharmacy:inventory:audit-adjust', onAuditAdjust)
      window.removeEventListener('pharmacy:inventory:add-invoice', onAddInvoice)
      window.removeEventListener('pharmacy:inventory:refresh', onRefresh)
      window.removeEventListener('pharmacy:inventory:export', onExport)
      window.removeEventListener('pharmacy:inventory:set-tab', onSetTab)
    }
  }, [navigate])

  // Load dashboard summary (counts) sparingly; avoid re-fetching on pagination changes
  useEffect(() => {
    let mounted = true
    // Instant cached stats for perceived speed (only if fresh < 60s)
    try {
      const cached = JSON.parse(localStorage.getItem('pharmacy.inventory.summary') || 'null')
      if (cached?.stats && cached?.at && (Date.now() - Number(cached.at) < 60_000) && mounted) setStats(cached.stats)
    } catch { }
    ; (async () => {
      try {
        const sum: any = await pharmacyApi.inventorySummaryCached(undefined, { ttlMs: 120_000, forceRefresh: refreshTick > 0 })
        if (mounted && sum?.stats) {
          setStats(sum.stats)
          try { localStorage.setItem('pharmacy.inventory.summary', JSON.stringify({ stats: sum.stats, at: Date.now() })) } catch { }
        }
      } catch { }
    })()
    return () => { mounted = false }
  }, [refreshTick])

  // Reset page cache when filters change (but not on page changes)
  useEffect(() => { setPageCache({}) }, [activeTab, search, limit, refreshTick])

  const confirmApproveOne = (id: string, invoice: string, itemCount: number, lineId?: string) => {
    const med = rows.find((r: any) => r.draftId === id && r.lineId === lineId)?.medicine
    setApproveTarget({ id, invoice, itemCount, lineId, medicine: med })
    setApproveConfirmOpen(true)
  }

  const approveOne = async () => {
    if (!approveTarget) return
    const { id, lineId } = approveTarget
    // optimistic remove
    setRows((prev: any[]) => prev.filter((r: any) => !(r.draftId === id && (lineId ? r.lineId === lineId : true))))
    setApproveConfirmOpen(false)
    setApproveTarget(null)
    pharmacyApi.approvePurchaseDraft(id).finally(() => { setRefreshTick((t: number) => t + 1) })
  }
  const confirmRejectOne = (id: string, lineId?: string) => {
    const med = rows.find((r: any) => r.draftId === id && r.lineId === lineId)?.medicine
    setRejectTarget({ id, lineId, medicine: med })
    setRejectConfirmOpen(true)
  }
  const rejectOne = async () => {
    if (!rejectTarget) return
    const { id, lineId } = rejectTarget
    setRows((prev: any[]) => prev.filter((r: any) => !(r.draftId === id && (lineId ? r.lineId === lineId : true))))
    setRejectConfirmOpen(false)
    setRejectTarget(null)
    pharmacyApi.deletePurchaseDraft(id).finally(() => setRefreshTick((t: number) => t + 1))
  }
  const approveAll = async () => {
    if (activeTab !== 'Pending Review') return
    const ids = Array.from(new Set((rows as any[]).map(r => r.draftId).filter(Boolean))) as string[]
    // optimistic remove
    setRows((prev: any[]) => prev.filter((r: any) => !ids.includes(r.draftId)))
    Promise.all(ids.map(id => pharmacyApi.approvePurchaseDraft(id).catch(() => { }))).finally(() => { setRefreshTick((t: number) => t + 1) })
  }
  const rejectAll = async () => {
    if (activeTab !== 'Pending Review') return
    const ids = Array.from(new Set((rows as any[]).map(r => r.draftId).filter(Boolean))) as string[]
    setRows((prev: any[]) => prev.filter((r: any) => !ids.includes(r.draftId)))
    Promise.all(ids.map(id => pharmacyApi.deletePurchaseDraft(id).catch(() => { }))).finally(() => setRefreshTick((t: number) => t + 1))
  }

  // Sync tab with URL (?tab=all|pending|low|expiring|out)
  useEffect(() => {
    const sp = new URLSearchParams(location.search)
    const tab = (sp.get('tab') || '').toLowerCase()
    const map: Record<string, Tab> = {
      all: 'All Items',
      pending: 'Pending Review',
      low: 'Low Stock',
      expiring: 'Expiring Soon',
      out: 'Out of Stock',
      instock: 'In Stock',
      narcotics: 'Narcotics',
      dead: 'Dead Items',
    }
    const next = map[tab]
    if (next && next !== activeTab) setActiveTab(next)
    if (!tab) {
      // don't force update; keep current state
    }
  }, [location.search])

  const setTabAndUrl = (t: Tab) => {
    setActiveTab(t)
    setPage(1)
    const sp = new URLSearchParams(location.search)
    const rev: Record<Tab, string> = {
      'All Items': 'all',
      'Pending Review': 'pending',
      'Low Stock': 'low',
      'Expiring Soon': 'expiring',
      'Out of Stock': 'out',
      'In Stock': 'instock',
      'Narcotics': 'narcotics',
      'Dead Items': 'dead',
    }
    sp.set('tab', rev[t])
    navigate({ pathname: '/pharmacy/inventory', search: `?${sp.toString()}` }, { replace: true })
  }

  useEffect(() => {
    const load = async () => {
      try {
        // dashboard summary is loaded in a separate effect to avoid blocking pagination
        // settings (for printing header)
        try {
          const s: any = await pharmacyApi.getSettings()
          setSettings(s)
        } catch { }
        if (activeTab === 'Pending Review') {
          const res: any = await pharmacyApi.listPurchaseDraftLines({ search: search || undefined, page, limit })
          const items: any[] = res?.items ?? res ?? []
          const tp = Number(res?.totalPages || 1)
          const tot = Number(res?.total || items.length || 0)
          if (!isNaN(tp)) setTotalPages(tp)
          setTotalItems(tot)
          const mapped = (items || []).map((it: any) => {
            // Calculate totalItems: use backend value if available, otherwise calculate from packs * unitsPerPack
            let totalItems: number | string
            if (it.totalItems != null && it.totalItems !== '' && !isNaN(Number(it.totalItems))) {
              totalItems = Number(it.totalItems)
            } else {
              const packs = Number(it.packs || 0)
              const unitsPerPack = Number(it.unitsPerPack || 0)
              totalItems = packs * unitsPerPack
            }
            
            return {
              invoice: it.invoice || '-',
              medicine: it.name || '-',
              generic: it.genericName || '-',
              category: it.category || '-',
              manufacturer: it.manufacturer || '-',
              expiry: it.expiry || '-',
              packs: it.packs ?? '-',
              unitsPerPack: it.unitsPerPack ?? '-',
              unitSale: (it.unitsPerPack && it.salePerPack) ? Number((it.salePerPack / it.unitsPerPack).toFixed(3)) : '-',
              totalItems,
              minStock: (it.minStock != null) ? it.minStock : '-',
              minPackStock: (it.minPackStock != null) ? it.minPackStock : '-',
              supplier: it.supplierName || '-',
              draftId: it.draftId,
              lineId: it.lineId,
            }
          })
          setRows(mapped)
        } else if (activeTab === 'All Items') {
          // Serve cached page immediately (stale-while-revalidate)
          if (pageCache[page]) setRows(pageCache[page])
          const res: any = await pharmacyApi.listInventoryCached({ search: search || undefined, page, limit }, { ttlMs: 60_000, forceRefresh: refreshTick > 0 })
          const items: any[] = res?.items ?? res ?? []
          const tp = Number(res?.totalPages || 1)
          const tot = Number(res?.total || items.length || 0)
          if (!isNaN(tp)) setTotalPages(tp)
          setTotalItems(tot)
          const mapped = (items || []).map((it: any) => ({
            invoice: it.lastInvoice || '-',
            medicine: it.name || '-',
            generic: it.genericName || it.lastGenericName || '-',
            category: it.category || '-',
            manufacturer: it.manufacturer || it.lastManufacturer || '-',
            expiry: it.earliestExpiry || it.lastExpiry || '-',
            packs: (it.unitsPerPack && it.unitsPerPack > 0) ? Math.floor((it.onHand || 0) / it.unitsPerPack) : '-',
            unitsPerPack: it.unitsPerPack ?? '-',
            unitSale: (it.lastSalePerUnit != null) ? Number((it.lastSalePerUnit).toFixed(3)) : '-',
            totalItems: it.onHand ?? 0,
            minStock: (it.minStock != null) ? it.minStock : '-',
            minPackStock: (it.minPackStock != null) ? it.minPackStock : '-',
            supplier: it.lastSupplier || '-',
          }))
          setRows(mapped)
        } else if (activeTab === 'Narcotics' || activeTab === 'Dead Items' || activeTab === 'In Stock') {
          // Load all inventory and filter client-side
          const res: any = await pharmacyApi.listInventoryCached({ search: search || undefined, page, limit }, { ttlMs: 60_000, forceRefresh: refreshTick > 0 })
          const itemsRaw: any[] = res?.items ?? res ?? []
          
          let items: any[] = []
          if (activeTab === 'Narcotics') {
            items = itemsRaw.filter((it: any) => it.narcotic === true)
          } else if (activeTab === 'In Stock') {
            items = itemsRaw.filter((it: any) => Number(it.onHand || 0) > 0)
          } else {
            // Dead Items logic: Expired products
            const today = new Date()
            today.setHours(0, 0, 0, 0)
            items = itemsRaw.filter((it: any) => {
              const expiryDate = it.earliestExpiry || it.lastExpiry
              if (!expiryDate) return false
              return new Date(expiryDate) < today
            })
          }
          const tp = Number(res?.totalPages || 1)
          const tot = items.length
          if (!isNaN(tp)) setTotalPages(tp)
          setTotalItems(tot)
          const mapped = (items || []).map((it: any) => ({
            invoice: it.lastInvoice || '-',
            medicine: it.name || '-',
            generic: it.genericName || it.lastGenericName || '-',
            category: it.category || '-',
            manufacturer: it.manufacturer || it.lastManufacturer || '-',
            expiry: it.earliestExpiry || it.lastExpiry || '-',
            packs: (it.unitsPerPack && it.unitsPerPack > 0) ? Math.floor((it.onHand || 0) / it.unitsPerPack) : '-',
            unitsPerPack: it.unitsPerPack ?? '-',
            unitSale: (it.lastSalePerUnit != null) ? Number((it.lastSalePerUnit).toFixed(3)) : '-',
            totalItems: it.onHand ?? 0,
            minStock: (it.minStock != null) ? it.minStock : '-',
            minPackStock: (it.minPackStock != null) ? it.minPackStock : '-',
            supplier: it.lastSupplier || '-',
          }))
          setRows(mapped)
        } else {
          // Derived tabs: Low Stock, Expiring Soon, Out of Stock — server-side filtered + paginated
          const status = activeTab === 'Low Stock' ? 'low' : (activeTab === 'Out of Stock' ? 'out' : 'expiring')
          const res: any = await pharmacyApi.listInventoryFilteredCached({ status: status as any, search: search || undefined, page, limit }, { ttlMs: 60_000, forceRefresh: refreshTick > 0 })
          // Exclude items that are out of stock from Expiring Soon view
          const itemsRaw: any[] = res?.items ?? res ?? []
          const items: any[] = status === 'expiring' ? itemsRaw.filter((it: any) => Number(it.onHand || 0) > 0) : itemsRaw
          const tp = Number(res?.totalPages || 1)
          if (!isNaN(tp)) setTotalPages(tp)
          const mapped = (items || []).map((it: any) => ({
            invoice: it.lastInvoice || '-',
            medicine: it.name || '-',
            generic: it.genericName || it.lastGenericName || '-',
            category: it.category || '-',
            manufacturer: it.manufacturer || it.lastManufacturer || '-',
            expiry: it.earliestExpiry || it.lastExpiry || '-',
            packs: (it.unitsPerPack && it.unitsPerPack > 0) ? Math.floor((it.onHand || 0) / it.unitsPerPack) : '-',
            unitsPerPack: it.unitsPerPack ?? '-',
            unitSale: (it.lastSalePerUnit != null) ? Number((it.lastSalePerUnit).toFixed(3)) : '-',
            totalItems: it.onHand ?? 0,
            minStock: (it.minStock != null) ? it.minStock : '-',
            minPackStock: (it.minPackStock != null) ? it.minPackStock : '-',
            supplier: it.lastSupplier || '-',
          }))
          setRows(mapped)
          const total = Number(res?.total || items.length || 0)
          setTotalItems(total)
          // Keep the top widgets consistent when switching tabs (use total from server, not page length)
          const statTotal = Number(res?.total || 0)
          if (activeTab === 'Expiring Soon') setStats((prev: any) => ({ ...(prev || { stockSaleValue: 0, lowStockCount: 0, outOfStockCount: 0, expiringSoonCount: 0 }), expiringSoonCount: statTotal }))
          if (activeTab === 'Low Stock') setStats((prev: any) => ({ ...(prev || { stockSaleValue: 0, lowStockCount: 0, outOfStockCount: 0, expiringSoonCount: 0 }), lowStockCount: statTotal }))
          if (activeTab === 'Out of Stock') setStats((prev: any) => ({ ...(prev || { stockSaleValue: 0, lowStockCount: 0, outOfStockCount: 0, expiringSoonCount: 0 }), outOfStockCount: statTotal }))
        }
      } catch {
        setRows([])
      }
    }
    load()
  }, [activeTab, search, refreshTick, page, limit])

  function handleExport() {
    const csvRows: string[] = []
    const headers = ['Invoice #', 'Medicine', 'Category', 'Manufacturer', 'Expiry', 'Packs', 'Units/Pack', 'Unit Sale', 'Total Items', 'Min Stock', 'Supplier']
    csvRows.push(headers.join(','))
    rows.forEach((r: any) => {
      const vals = [r.invoice, r.medicine, r.category, r.manufacturer || '-', r.expiry || '-', r.packs, r.unitsPerPack, r.unitSale, r.totalItems, r.minStock, r.supplier]
      csvRows.push(vals.map(v => typeof v === 'string' ? '"' + v.replace(/"/g, '""') + '"' : String(v)).join(','))
    })
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `pharmacy_inventory_${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleImportCSV = async (e: any) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (ev) => {
      const content = ev.target?.result as string
      if (!content) return
      try {
        const lines = content.split(/\r?\n/).filter(l => l.trim())
        if (lines.length < 2) {
          alert("CSV file is empty or missing data rows.")
          return
        }
        
        const headerParts = lines[0].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(p => p.trim().replace(/^"|"$/g, '').replace(/""/g, '"'))
        const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')
        const headerMap: Record<string, number> = {}
        headerParts.forEach((h, i) => { headerMap[norm(h)] = i })

        const idx = (keys: string[], fallback: number | null = null) => {
          for (const k of keys) {
            const i = headerMap[norm(k)]
            if (i != null) return i
          }
          return fallback
        }

        const iName = idx(['medicine', 'medicine name', 'name', 'item', 'product'], 0)
        const iGeneric = idx(['generic', 'generic name'], -1)
        const iCategory = idx(['category', 'group', 'type'], -1)
        const iManufacturer = idx(['manufacturer', 'mfr', 'maker', 'brand'], -1)
        const iSupplier = idx(['supplier', 'distributor', 'company', 'vendor'], -1)
        const iPacks = idx(['packs', 'qty', 'quantity', 'pack qty'], -1)
        const iUnitsPerPack = idx(['units/pack', 'units per pack', 'packing', 'size'], -1)
        const iBuyPerPack = idx(['buy price/pack', 'buy/pack', 'purchase/pack', 'cost'], -1)
        const iSalePerPack = idx(['sale price/pack', 'sale/pack', 'mrp/pack', 'mrp'], -1)
        const iExpiry = idx(['expiry', 'expiry date', 'exp', 'date'], -1)
        const iTotalItems = idx(['total items', 'total', 'items', 'on hand', 'units total'], -1)

        const dataRows = lines.slice(1).map((line) => {
          const parts = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(p => p.trim().replace(/^"|"$/g, '').replace(/""/g, '"'))
          
          const getVal = (i: number | null, def: string = '') => (i != null && i >= 0 && parts[i]) ? parts[i] : def
          const getNum = (i: number | null, def: number = 0) => {
            const v = getVal(i)
            if (!v) return def
            const n = Number(v.replace(/[^0-9.]/g, ''))
            return isNaN(n) ? def : n
          }

          const name = getVal(iName)
          if (!name) return null

          const packsVal = getNum(iPacks)
          const uppVal = getNum(iUnitsPerPack, 1)
          const totalItemsVal = getNum(iTotalItems)
          const finalPacks = packsVal || (totalItemsVal && uppVal > 0 ? Math.ceil(totalItemsVal / uppVal) : 0)

          return {
            name,
            genericName: getVal(iGeneric),
            category: getVal(iCategory),
            manufacturer: getVal(iManufacturer),
            supplierName: getVal(iSupplier),
            packs: finalPacks,
            unitsPerPack: uppVal || 1,
            buyPerPack: getNum(iBuyPerPack),
            salePerPack: getNum(iSalePerPack),
            expiry: getVal(iExpiry),
            totalItems: totalItemsVal || (finalPacks * (uppVal || 1))
          }
        }).filter((r): r is NonNullable<typeof r> => !!r && !!r.name)

        if (!dataRows.length) {
          alert("No valid data rows found in CSV. Please ensure the 'Medicine' column is present.")
          return
        }

        // Import each row as a separate purchase draft
        const importDate = new Date().toISOString().split('T')[0]
        const importTime = Date.now().toString().slice(-6)
        
        await Promise.all(dataRows.map(async (r, idx) => {
          const payload = {
            date: importDate,
            invoice: `IMPORT-${importTime}-${idx + 1}`,
            status: 'Pending',
            lines: [{
              name: r.name,
              genericName: r.genericName,
              category: r.category,
              manufacturer: r.manufacturer || undefined,
              supplierName: r.supplierName,
              packs: r.packs,
              unitsPerPack: r.unitsPerPack,
              buyPerPack: r.buyPerPack,
              salePerPack: r.salePerPack,
              expiry: r.expiry,
              totalItems: r.totalItems,
              buyPerUnit: r.buyPerPack / Math.max(1, r.unitsPerPack),
              salePerUnit: r.salePerPack / Math.max(1, r.unitsPerPack),
            }]
          }
          return pharmacyApi.createPurchaseDraft(payload)
        }))

        setTabAndUrl('Pending Review')
        setRefreshTick((t: number) => t + 1)
        alert(`Successfully imported ${dataRows.length} items to Pending Review as individual rows.`)
      } catch (err: any) {
        console.error("CSV Import Failed", err)
        alert(`Failed to import CSV: ${err.message || 'Unknown error'}. Please check file format.`)
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const handleImportExcel = async (e: any) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (ev) => {
      try {
        console.log("Starting Excel import...");
        const data = new Uint8Array(ev.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        console.log("Workbook loaded:", workbook.SheetNames);
        const firstSheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[firstSheetName]
        const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet)
        console.log("JSON Data extracted:", jsonData.length, "rows");
        if (jsonData.length > 0) console.log("First row keys:", Object.keys(jsonData[0]));

        if (!jsonData.length) {
          alert("Excel file is empty.")
          return
        }

        const normKey = (s: string) => String(s || '')
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '') // remove spaces, slashes, punctuation

        const toNumber = (v: any) => {
          if (v == null) return 0
          const n = Number(String(v).replace(/,/g, '').trim())
          return isNaN(n) ? 0 : n
        }

        const dataRows = jsonData.map(raw => {
          const row: Record<string, any> = {}
          Object.keys(raw || {}).forEach(k => { row[normKey(k)] = (raw as any)[k] })

          const pick = (...alts: string[]) => {
            for (const a of alts) {
              const key = normKey(a)
              const val = row[key]
              if (val != null && String(val).trim() !== '') return val
            }
            return ''
          }

          const name = String(pick('Medicine', 'Medicine Name', 'name', 'item', 'product')).trim()
          const genericName = String(pick('Generic', 'Generic Name', 'generic')).trim()
          const category = String(pick('Category', 'Group', 'cat')).trim()
          const manufacturer = String(pick('Manufacturer', 'Mfr', 'Maker', 'Brand Manufacturer')).trim()
          const supplierName = String(pick('Supplier', 'Company', 'Distributor', 'supplierName')).trim()
          const packsRaw = toNumber(pick('Packs', 'Qty', 'Quantity', 'Pack'))
          const unitsPerPack = toNumber(pick('Units/Pack', 'Units Per Pack', 'unitsPerPack', 'unitperpack'))
          const totalItemsRaw = toNumber(pick('Total Items', 'Total', 'Items', 'On Hand', 'Total Units', 'Units Total', 'TotalItems'))
          const packs = packsRaw || (totalItemsRaw && unitsPerPack > 0 ? Math.ceil(totalItemsRaw / unitsPerPack) : 0)
          const buyPerPack = toNumber(pick('Buy Price/Pack', 'Buy/Pack', 'Purchase/Pack', 'buyPerPack', 'buypricepack'))
          const salePerPack = toNumber(pick('Sale Price/Pack', 'Sale/Pack', 'MRP/Pack', 'salePerPack', 'salepricepack'))
          const expiry = String(pick('Expiry', 'Expiry Date', 'exp', 'expdate')).trim()

          return { name, genericName, category, manufacturer, supplierName, packs, unitsPerPack: unitsPerPack || 1, buyPerPack, salePerPack, expiry, totalItems: totalItemsRaw || (packs * (unitsPerPack || 1)) }
        }).filter(r => r.name)

        if (!dataRows.length) {
          alert("No valid medicine data found in Excel. Please ensure columns are correctly named (Medicine, Generic, Category, etc.).")
          return
        }

        try {
          // Import each row as a separate purchase draft
          const importDate = new Date().toISOString().split('T')[0]
          const importTime = Date.now().toString().slice(-6)

          await Promise.all(dataRows.map(async (r, idx) => {
            const payload = {
              date: importDate,
              invoice: `IMPORT-EXCEL-${importTime}-${idx + 1}`,
              status: 'Pending',
              lines: [{
                name: r.name,
                genericName: r.genericName,
                category: r.category,
                manufacturer: (r as any).manufacturer || undefined,
                supplierName: r.supplierName,
                packs: r.packs,
                unitsPerPack: r.unitsPerPack,
                buyPerPack: r.buyPerPack,
                salePerPack: r.salePerPack,
                expiry: r.expiry,
                totalItems: (r as any).totalItems != null && (r as any).totalItems !== '' ? Number((r as any).totalItems) : (r.packs * r.unitsPerPack),
                buyPerUnit: r.buyPerPack / Math.max(1, r.unitsPerPack),
                salePerUnit: r.salePerPack / Math.max(1, r.unitsPerPack),
              }]
            }
            return pharmacyApi.createPurchaseDraft(payload)
          }))

          setTabAndUrl('Pending Review')
          setRefreshTick((t: number) => t + 1)
          alert(`Successfully imported ${dataRows.length} items to Pending Review as individual rows.`)
        } catch (err: any) {
          console.error("Excel Import Failed", err)
          alert(`Failed to import Excel. ${err.message || 'Please ensure the file is valid.'}`)
        }
      } catch (err: any) {
        console.error("Excel Import Failed", err)
        alert(`Failed to import Excel. ${err.message || 'Please ensure the file is valid.'}`)
      }
    }
    reader.readAsArrayBuffer(file)
    e.target.value = ''
  }

  function handlePrint() {
    const cols = ['Invoice #', 'Medicine', 'Generic', 'Category', 'Manufacturer', 'Expiry', 'Packs', 'Units/Pack', 'Unit Sale', 'Total Items', 'Min Stock', 'Supplier']
    const htmlRows = rows.map((r: any) => {
      const cells = [r.invoice, r.medicine, r.generic || '-', r.category, r.manufacturer || '-', r.expiry || '-', r.packs, r.unitsPerPack, r.unitSale, r.totalItems, r.minStock, r.supplier]
        .map((v: any) => `<td style="padding:6px 8px;border:1px solid #cbd5e1;">${(v ?? '').toString()}</td>`)
        .join('')
      return `<tr>${cells}</tr>`
    }).join('')
    const head = `
      <div style="text-align:center;margin-bottom:8px;">
        ${settings?.logoDataUrl ? `<img src='${settings.logoDataUrl}' style='height:48px;object-fit:contain;margin-bottom:6px;'/>` : ''}
        <div style="font-size:18px;font-weight:800;letter-spacing:.5px;">${(settings?.pharmacyName || 'Pharmacy').toUpperCase()}</div>
        ${settings?.address ? `<div style='font-size:12px;color:#475569;'>${settings.address}</div>` : ''}
        ${(settings?.phone || settings?.email) ? `<div style='font-size:12px;color:#475569;'>${settings?.phone ? 'PHONE: ' + settings.phone : ''} ${settings?.email ? ' EMAIL: ' + settings.email : ''}</div>` : ''}
        <div style="margin-top:6px;font-size:16px;font-weight:600;">Inventory Printout</div>
        <div style="font-size:12px;color:#475569;">${new Date().toLocaleString()}</div>
      </div>
    `
    const table = `
      <table style="width:100%;border-collapse:collapse;font-size:12px;">
        <thead>
          <tr>${cols.map(c => `<th style='text-align:left;padding:6px 8px;border:1px solid #cbd5e1;background:#f1f5f9;'>${c}</th>`).join('')}</tr>
        </thead>
        <tbody>${htmlRows || `<tr><td colspan='${cols.length}' style='text-align:center;padding:16px;border:1px solid #cbd5e1;color:#64748b;'>No data</td></tr>`}</tbody>
      </table>
      ${settings?.billingFooter ? `<div style='text-align:center;margin-top:12px;font-size:12px;color:#334155;'>${settings.billingFooter}</div>` : ''}
    `
    const html = `<!doctype html><html><head><title>Inventory Printout</title><meta charset='utf-8'/></head><body style='font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,"Apple Color Emoji","Segoe UI Emoji";color:#0f172a;padding:16px;'>${head}${table}</body></html>`

    // Use a hidden iframe to avoid popup blockers and blank windows
    const frame = document.createElement('iframe')
    frame.style.position = 'fixed'
    frame.style.right = '0'
    frame.style.bottom = '0'
    frame.style.width = '0'
    frame.style.height = '0'
    frame.style.border = '0'
    document.body.appendChild(frame)
    const doc = frame.contentWindow?.document || frame.contentDocument
    if (!doc) return
    doc.open()
    doc.write(html)
    doc.close()
    frame.onload = () => {
      try { frame.contentWindow?.focus(); frame.contentWindow?.print(); } catch { }
      setTimeout(() => { document.body.removeChild(frame) }, 100)
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-2 text-slate-800">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5"><path d="M5 6.75A2.75 2.75 0 0 1 7.75 4h8.5A2.75 2.75 0 0 1 19 6.75V9h-1.5V6.75c0-.69-.56-1.25-1.25-1.25h-8.5c-.69 0-1.25.56-1.25 1.25V9H5V6.75Z" /><path d="M4.25 9.75A2.75 2.75 0 0 1 7 7h10a2.75 2.75 0 0 1 2.75 2.75v7.5A2.75 2.75 0 0 1 17 20H7a2.75 2.75 0 0 1-2.75-2.75v-7.5Z" /></svg>
        <h2 className="text-xl font-bold">Inventory</h2>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <div className="text-2xl font-extrabold text-slate-900">Inventory Control</div>
          <div className="ml-auto flex items-center gap-2">
            <input type="file" id="pharmacy-csv-import" accept=".csv" className="hidden" onChange={handleImportCSV} />
            <input type="file" id="pharmacy-excel-import" accept=".xlsx, .xls" className="hidden" onChange={handleImportExcel} />
            <button onClick={() => document.getElementById('pharmacy-excel-import')?.click()} className="btn-outline-navy"><FileSpreadsheet className="h-4 w-4" /> Import Excel</button>
            <button onClick={() => document.getElementById('pharmacy-csv-import')?.click()} className="btn-outline-navy"><FileDown className="h-4 w-4 rotate-180" /> Import CSV</button>
            <button onClick={() => setUpdateStockOpen(true)} className="btn" title="Shortcut: U"><RotateCw className="h-4 w-4" /> Update Stock</button>
            <button onClick={() => setAdjustOpen(true)} className="btn-outline-navy" title="Shortcut: A"><AlertTriangle className="h-4 w-4" /> Audit Adjustment</button>
            <button onClick={() => navigate('/pharmacy/inventory/add-invoice')} className="btn" title="Shortcut: I"><CalendarDays className="h-4 w-4" /> Add Invoice</button>
            <button onClick={() => setRefreshTick(t => t + 1)} className="btn-outline-navy" title="Shortcut: R"><RotateCw className="h-4 w-4" /> Refresh</button>
            <button onClick={handleExport} className="btn-outline-navy" title="Shortcut: E"><FileDown className="h-4 w-4" /> Export</button>
          </div>
        </div>

        <div className="mb-3 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <div className="card p-4 border-slate-200 bg-slate-50/40">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm text-slate-600">Total Items</div>
                <div className="mt-1 text-lg font-semibold text-slate-700">{totalItems}</div>
              </div>
              <div className="rounded-lg bg-slate-100 p-2 text-slate-600">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
            </div>
          </div>
          <div className="card p-4 border-emerald-200 bg-emerald-50/40">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm text-slate-600">Stock Value</div>
                <div className="mt-1 text-lg font-semibold text-emerald-700">{stats.stockSaleValue?.toFixed ? stats.stockSaleValue.toFixed(2) : '0.00'}</div>
              </div>
              <div className="rounded-lg bg-emerald-100 p-2 text-emerald-700">
                <Package className="h-5 w-5" />
              </div>
            </div>
          </div>
          <div className="card p-4 border-yellow-200 bg-yellow-50/40">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm text-slate-600">Low Stock Items</div>
                <div className="mt-1 text-lg font-semibold text-yellow-700">{stats.lowStockCount ?? 0}</div>
              </div>
              <div className="rounded-lg bg-yellow-100 p-2 text-yellow-700">
                <TrendingDown className="h-5 w-5" />
              </div>
            </div>
          </div>
          <div className="card p-4 border-orange-200 bg-orange-50/40">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm text-slate-600">Expiring Items</div>
                <div className="mt-1 text-lg font-semibold text-orange-600">{stats.expiringSoonCount ?? 0}</div>
              </div>
              <div className="rounded-lg bg-orange-100 p-2 text-orange-600">
                <CalendarDays className="h-5 w-5" />
              </div>
            </div>
          </div>
          <div className="card p-4 border-rose-200 bg-rose-50/40">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm text-slate-600">Out of Stock Items</div>
                <div className="mt-1 text-lg font-semibold text-rose-700">{stats.outOfStockCount ?? 0}</div>
              </div>
              <div className="rounded-lg bg-rose-100 p-2 text-rose-700">
                <AlertTriangle className="h-5 w-5" />
              </div>
            </div>
          </div>
        </div>

        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div className="flex-1 min-w-[240px]">
            <input id="pharmacy-inventory-search" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Search medicines or scan barcode... (Alt+S)" />
          </div>
          <button onClick={handlePrint} className="btn-outline-navy" title="Shortcut: P">Print</button>
          <button className="btn-outline-navy">Filter</button>
        </div>

        <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
          {tabs.map((tag, idx) => (
            <button
              key={tag}
              onClick={() => setTabAndUrl(tag)}
              title={`Shortcut: ${idx + 1}`}
              className={`rounded-md border px-3 py-1.5 ${activeTab === tag ? 'border-navy-600 bg-navy-50 text-navy-700' : 'border-slate-200 bg-slate-50 hover:bg-slate-100'}`}
            >{tag}</button>
          ))}
        </div>

        <Pharmacy_InventoryTable
          rows={rows}
          pending={activeTab === 'Pending Review'}
          onApprove={(id, invoice, itemCount, lineId) => confirmApproveOne(id, invoice, itemCount, lineId)}
          onReject={(id, lineId) => confirmRejectOne(id, lineId)}
          onApproveAll={approveAll}
          onRejectAll={rejectAll}
          onEdit={(medicine) => { setEditMedicine(medicine); setEditOpen(true) }}
          onEditDraft={(id) => {
            const fromPending = activeTab === 'Pending Review'
            const search = fromPending ? '?from=pending' : ''
            navigate(`/pharmacy/inventory/edit-invoice/${encodeURIComponent(id)}${search}`)
          }}
          // Pagination controls for Pending Review and Derived tabs (Low/Expiring/Out). All Items has its own footer below.
          page={activeTab !== 'All Items' ? page : undefined}
          totalPages={activeTab !== 'All Items' ? totalPages : undefined}
          limit={activeTab !== 'All Items' ? limit : undefined}
          onChangeLimit={activeTab !== 'All Items' ? (n) => { setLimit(n); setPage(1) } : undefined}
          onPrev={activeTab !== 'All Items' ? () => setPage(p => Math.max(1, p - 1)) : undefined}
          onNext={activeTab !== 'All Items' ? () => setPage(p => Math.min(totalPages, p + 1)) : undefined}
          onDelete={async (medicine) => {
            const m = (medicine || '').trim()
            if (!m) return
            setToDelete(m)
            setConfirmOpen(true)
          }}
        />
        {activeTab === 'All Items' && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-3 text-sm">
            <div className="text-slate-600">Page {page} of {totalPages}</div>
            <div className="flex items-center gap-2">
              <select value={limit} onChange={e => { setLimit(parseInt(e.target.value)); setPage(1) }} className="rounded-md border border-slate-300 px-2 py-1 text-sm text-slate-700">
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="rounded-md border border-slate-200 px-2 py-1 disabled:opacity-50">Prev</button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="rounded-md border border-slate-200 px-2 py-1 disabled:opacity-50">Next</button>
            </div>
          </div>
        )}
      </div>

      <Pharmacy_UpdateStock open={updateStockOpen} onClose={() => setUpdateStockOpen(false)} />
      <Pharmacy_EditInventoryItem open={editOpen} onClose={() => { setEditOpen(false); setRefreshTick(t => t + 1) }} medicine={editMedicine} />
      <Pharmacy_AuditAdjustDialog open={adjustOpen} onClose={() => setAdjustOpen(false)} onDone={() => setRefreshTick(t => t + 1)} />
      <Pharmacy_ConfirmDialog
        open={confirmOpen}
        title="Delete Inventory Item"
        message={toDelete ? `Are you sure you want to delete ${toDelete}? This will remove it from inventory.` : 'Are you sure?'}
        confirmText="Delete"
        onCancel={() => { setConfirmOpen(false); setToDelete(null) }}
        onConfirm={async () => {
          const key = (toDelete || '').trim().toLowerCase()
          if (!key) { setConfirmOpen(false); return }
          try {
            await pharmacyApi.deleteInventoryItem(key)
            setRefreshTick(t => t + 1)
          } catch { }
          setConfirmOpen(false)
          setToDelete(null)
        }}
      />

      {/* Approve Item/Invoice Confirmation Dialog */}
      {approveConfirmOpen && approveTarget && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl ">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 ">
                <svg className="h-5 w-5 text-emerald-600 " viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-slate-900 ">{approveTarget.lineId ? 'Approve Item?' : 'Approve Invoice?'}</h2>
            </div>
            <p className="mb-2 text-sm text-slate-600 ">
              {approveTarget.lineId ? (
                <>Are you sure you want to approve <strong>{approveTarget.medicine}</strong>?</>
              ) : (
                <>This will approve <strong>all {approveTarget.itemCount} items</strong> in invoice <strong>{approveTarget.invoice}</strong>.</>
              )}
            </p>
            <p className="mb-6 text-xs text-slate-500 ">
              {approveTarget.lineId ? 'This item will be added to inventory.' : 'Items from this invoice will be added to inventory.'}
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => { setApproveConfirmOpen(false); setApproveTarget(null); }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    setApproveConfirmOpen(false)
                    setApproveTarget(null)
                  }
                }}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                ref={approveButtonRef}
                type="button"
                onClick={approveOne}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    approveOne()
                  }
                }}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition-colors"
              >
                {approveTarget.lineId ? 'Approve Item' : 'Approve Invoice'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Item/Invoice Confirmation Dialog */}
      {rejectConfirmOpen && rejectTarget && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl ">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-100 ">
                <svg className="h-5 w-5 text-rose-600 " viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-slate-900 ">{rejectTarget.lineId ? 'Reject Item?' : 'Reject Invoice?'}</h2>
            </div>
            <p className="mb-2 text-sm text-slate-600 ">
              {rejectTarget.lineId ? (
                <>Are you sure you want to reject <strong>{rejectTarget.medicine}</strong>?</>
              ) : (
                <>Are you sure you want to reject this entire invoice draft?</>
              )}
            </p>
            <p className="mb-6 text-xs text-slate-500 ">
              This action cannot be undone and the item will not be added to inventory.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => { setRejectConfirmOpen(false); setRejectTarget(null); }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    setRejectConfirmOpen(false)
                    setRejectTarget(null)
                  }
                }}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                ref={rejectButtonRef}
                type="button"
                onClick={rejectOne}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    rejectOne()
                  }
                }}
                className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 transition-colors"
              >
                {rejectTarget.lineId ? 'Reject Item' : 'Reject Invoice'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
