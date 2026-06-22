import { useState, useEffect, useCallback, useMemo } from 'react'
import { Search, Plus, Minus, Trash2, ShoppingCart, Loader2, CheckCircle, Coffee, CreditCard, Banknote, User, Phone, UtensilsCrossed, Package, Bike, Tag } from 'lucide-react'
import { cafeteriaApi } from '../../features/cafeteria'

interface CartItem {
  menuItemId: string
  name: string
  price: number
  qty: number
  costPrice: number
}

export default function Cafeteria_POS() {
  const [items, setItems] = useState<any[]>([])
  const [deals, setDeals] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [cart, setCart] = useState<CartItem[]>([])
  const [discountPct, setDiscountPct] = useState(0)
  const [paymentMethod, setPaymentMethod] = useState('Cash')
  const [customerName, setCustomerName] = useState('Walk-in')
  const [customerPhone, setCustomerPhone] = useState('')
  const [orderType, setOrderType] = useState<'Dining' | 'Take Away' | 'Delivery'>('Dining')
  const [tableNumber, setTableNumber] = useState('')
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [deliveryPhone, setDeliveryPhone] = useState('')
  const [deliveryFee, setDeliveryFee] = useState(0)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState('')

  const loadItems = useCallback(async () => {
    setLoading(true)
    try {
      const [r, d] = await Promise.all([
        cafeteriaApi.listMenuItems({ q: search, category, limit: 500 }),
        cafeteriaApi.listDeals({ active: 'true' }),
      ])
      setItems((r?.items || []).filter((i: any) => i.active))
      setDeals(d?.items || [])
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [search, category])

  useEffect(() => {
    const t = setTimeout(loadItems, 300)
    return () => clearTimeout(t)
  }, [loadItems])

  const categories = useMemo(() => {
    const set = new Set(items.map((i: any) => i.category).filter(Boolean))
    return ['all', ...Array.from(set)]
  }, [items])

  const subtotal = useMemo(() => cart.reduce((s, i) => s + i.price * i.qty, 0), [cart])
  const discountAmount = useMemo(() => (subtotal * discountPct) / 100, [subtotal, discountPct])
  const delFee = orderType === 'Delivery' ? deliveryFee : 0
  const total = useMemo(() => subtotal - discountAmount + delFee, [subtotal, discountAmount, delFee])

  function addToCart(item: any) {
    setCart(prev => {
      const existing = prev.find(c => c.menuItemId === String(item._id))
      if (existing) {
        return prev.map(c => c.menuItemId === String(item._id) ? { ...c, qty: c.qty + 1 } : c)
      }
      return [...prev, { menuItemId: String(item._id), name: item.name, price: Number(item.price), qty: 1, costPrice: Number(item.costPrice || 0) }]
    })
  }

  function updateQty(id: string, delta: number) {
    setCart(prev => prev.map(c => c.menuItemId === id ? { ...c, qty: Math.max(1, c.qty + delta) } : c))
  }

  function setQty(id: string, qty: number) {
    setCart(prev => prev.map(c => c.menuItemId === id ? { ...c, qty: Math.max(1, qty) } : c))
  }

  function removeFromCart(id: string) {
    setCart(prev => prev.filter(c => c.menuItemId !== id))
  }

  function clearCart() {
    setCart([])
    setDiscountPct(0)
    setPaymentMethod('Cash')
    setCustomerName('Walk-in')
    setCustomerPhone('')
    setOrderType('Dining')
    setTableNumber('')
    setDeliveryAddress('')
    setDeliveryPhone('')
    setDeliveryFee(0)
  }

  function addDealToCart(deal: any) {
    const dealItems: CartItem[] = (deal.items || []).map((di: any) => ({
      menuItemId: String(di.menuItemId || ''),
      name: di.name,
      price: 0,
      qty: di.qty,
      costPrice: 0,
    }))
    // Add deal as a single line with deal price
    setCart(prev => [...prev, { menuItemId: '', name: `[Deal] ${deal.name}`, price: Number(deal.dealPrice), qty: 1, costPrice: 0 }, ...dealItems])
  }

  async function checkout() {
    if (cart.length === 0) return
    setSubmitting(true)
    setError('')
    setSuccess(null)
    try {
      const session = JSON.parse(localStorage.getItem('cafeteria.session') || '{}')
      const r = await cafeteriaApi.createSale({
        items: cart,
        discountPct,
        paymentMethod,
        customerName,
        customerPhone,
        createdBy: session.username || 'admin',
        orderType,
        tableNumber,
        deliveryAddress,
        deliveryPhone,
        deliveryFee: delFee,
      })
      setSuccess(`Sale ${r.billNo} completed - Rs ${Number(r.total).toLocaleString()}`)
      clearCart()
      setTimeout(() => setSuccess(null), 4000)
    } catch (err: any) {
      setError(err?.message || 'Checkout failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex h-full flex-col gap-5 lg:flex-row">
      {/* Items Grid */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search menu items..."
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 shadow-sm transition-all focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400/15 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {categories.map(c => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`whitespace-nowrap rounded-lg px-3.5 py-2 text-xs font-semibold transition-all ${
                  category === c
                    ? 'bg-orange-600 text-white shadow-sm shadow-orange-600/20'
                    : 'bg-white text-slate-500 shadow-sm hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'
                }`}
              >
                {c === 'all' ? 'All' : c}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Deals & Combos */}
          {deals.length > 0 && (
            <div className="mb-4">
              <div className="mb-2 flex items-center gap-2">
                <Tag className="h-4 w-4 text-orange-500" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Deals & Combos</span>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {deals.map(deal => (
                  <button
                    key={deal._id}
                    onClick={() => addDealToCart(deal)}
                    className="group flex shrink-0 flex-col rounded-xl border border-orange-100 bg-linear-to-br from-orange-50 to-amber-50 p-3 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-orange-300 hover:shadow-md dark:border-orange-900/20 dark:from-orange-950/20 dark:to-amber-950/20"
                  >
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{deal.name}</span>
                    <span className="mt-0.5 text-[10px] text-slate-400">{deal.items?.length || 0} items</span>
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <span className="text-sm font-extrabold text-orange-600 dark:text-orange-400">Rs {Number(deal.dealPrice).toLocaleString()}</span>
                      {deal.savings > 0 && (
                        <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400">
                          Save Rs {Number(deal.savings).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-32 animate-pulse rounded-2xl border border-slate-100 bg-slate-50 dark:border-slate-800 dark:bg-slate-800" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center text-center">
              <Coffee className="h-10 w-10 text-slate-200 dark:text-slate-700" />
              <p className="mt-3 text-sm font-medium text-slate-400 dark:text-slate-500">No items found</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {items.map((item) => (
                <button
                  key={item._id}
                  onClick={() => addToCart(item)}
                  disabled={item.stockQty <= 0}
                  className="group relative flex flex-col rounded-2xl border border-slate-100 bg-white p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-md disabled:opacity-40 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-orange-900"
                >
                  {item.stockQty <= item.lowStockThreshold && item.stockQty > 0 && (
                    <span className="absolute right-2 top-2 rounded-full bg-amber-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-600 dark:bg-amber-950/30">Low</span>
                  )}
                  {item.stockQty <= 0 && (
                    <span className="absolute right-2 top-2 rounded-full bg-red-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-red-600 dark:bg-red-950/30">Out</span>
                  )}
                  <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-orange-50 text-orange-500 shadow-sm shadow-orange-500/10 transition-transform group-hover:scale-105 dark:bg-orange-950/30 dark:text-orange-400">
                    <Coffee className="h-5 w-5" />
                  </div>
                  <p className="truncate text-sm font-bold text-slate-800 dark:text-slate-200">{item.name}</p>
                  <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">{item.category}</p>
                  <div className="mt-auto flex items-center justify-between pt-2">
                    <span className="text-sm font-extrabold text-slate-900 dark:text-slate-100">Rs {Number(item.price).toLocaleString()}</span>
                    <span className="text-[10px] font-semibold text-slate-400">{item.stockQty} left</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Cart Panel */}
      <div className="flex w-full flex-col rounded-2xl border border-slate-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:w-[340px]">
        <div className="flex items-center justify-between border-b border-slate-50 px-5 py-4 dark:border-slate-800/50">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400">
              <ShoppingCart className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Order</h3>
              <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">{cart.length} items</p>
            </div>
          </div>
          {cart.length > 0 && (
            <button onClick={clearCart} className="rounded-lg px-2 py-1 text-xs font-semibold text-red-500 transition hover:bg-red-50 dark:hover:bg-red-950/20">Clear</button>
          )}
        </div>

        {success && (
          <div className="mx-5 mt-3 flex items-center gap-2 rounded-xl bg-emerald-50 px-3.5 py-2.5 text-sm font-semibold text-emerald-600 shadow-sm dark:bg-emerald-950/20 dark:text-emerald-400">
            <CheckCircle className="h-4 w-4" /> {success}
          </div>
        )}
        {error && (
          <div className="mx-5 mt-3 rounded-xl bg-red-50 px-3.5 py-2.5 text-sm font-semibold text-red-600 shadow-sm dark:bg-red-950/20 dark:text-red-400">
            {error}
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-5 py-3">
          {cart.length === 0 ? (
            <div className="flex h-48 flex-col items-center justify-center text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 dark:bg-slate-800">
                <ShoppingCart className="h-6 w-6 text-slate-300 dark:text-slate-600" />
              </div>
              <p className="mt-3 text-sm font-medium text-slate-400 dark:text-slate-500">Your cart is empty</p>
              <p className="mt-1 text-xs text-slate-400">Tap items to add them</p>
            </div>
          ) : (
            <div className="space-y-2">
              {cart.map((item) => (
                <div key={item.menuItemId} className="flex items-center gap-3 rounded-xl border border-slate-50 p-2.5 transition hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/40">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-orange-500 dark:bg-orange-950/20">
                    <Coffee className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-200">{item.name}</p>
                    <p className="text-xs text-slate-400">Rs {item.price.toLocaleString()} each</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => updateQty(item.menuItemId, -1)} className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-700" aria-label="Decrease quantity">
                      <Minus className="h-3 w-3" />
                    </button>
                    <input
                      type="number"
                      value={item.qty}
                      onChange={(e) => setQty(item.menuItemId, parseInt(e.target.value) || 1)}
                      className="h-7 w-10 rounded-lg border border-slate-200 bg-white text-center text-sm font-bold dark:border-slate-700 dark:bg-slate-800"
                    />
                    <button onClick={() => updateQty(item.menuItemId, 1)} className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-700" aria-label="Increase quantity">
                      <Plus className="h-3 w-3" />
                    </button>
                    <button onClick={() => removeFromCart(item.menuItemId)} className="ml-1 flex h-7 w-7 items-center justify-center rounded-lg text-red-400 transition hover:bg-red-50 dark:hover:bg-red-950/20" aria-label="Remove item">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Checkout */}
        {cart.length > 0 && (
          <div className="border-t border-slate-50 p-5 dark:border-slate-800/50">
            <div className="mb-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium text-slate-500 dark:text-slate-400">Subtotal</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">Rs {subtotal.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-slate-500 dark:text-slate-400">Discount</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={discountPct}
                    onChange={(e) => setDiscountPct(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
                    className="h-7 w-14 rounded-lg border border-slate-200 bg-white px-2 text-right text-sm font-bold dark:border-slate-700 dark:bg-slate-800"
                  />
                  <span className="text-xs font-bold text-slate-400">%</span>
                </div>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-slate-500 dark:text-slate-400">You save</span>
                  <span className="font-bold text-emerald-500">- Rs {discountAmount.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-slate-100 pt-2 dark:border-slate-800/50">
                <span className="text-base font-bold text-slate-900 dark:text-slate-100">Total</span>
                <span className="text-xl font-extrabold text-orange-600 dark:text-orange-400">Rs {total.toLocaleString()}</span>
              </div>
            </div>

            <div className="mb-4 grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <CreditCard className="h-3 w-3" /> Payment
                </label>
                <div className="flex gap-1">
                  {(['Cash', 'Card', 'Bank'] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => setPaymentMethod(m)}
                      className={`flex flex-1 items-center justify-center gap-1 rounded-lg py-2 text-[11px] font-bold transition-all ${
                        paymentMethod === m
                          ? 'bg-orange-600 text-white shadow-sm shadow-orange-600/20'
                          : 'bg-slate-50 text-slate-500 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'
                      }`}
                    >
                      {m === 'Cash' ? <Banknote className="h-3 w-3" /> : <CreditCard className="h-3 w-3" />}
                      {m}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <User className="h-3 w-3" /> Customer
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm transition-all focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400/15 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <Phone className="h-3 w-3" /> Customer Phone
              </label>
              <input
                type="text"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="Phone number (optional)"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm transition-all focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400/15 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>

            {/* Order Type */}
            <div className="mb-4">
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400">Order Type</label>
              <div className="flex gap-1">
                {([
                  { type: 'Dining', icon: UtensilsCrossed },
                  { type: 'Take Away', icon: Package },
                  { type: 'Delivery', icon: Bike },
                ] as const).map(({ type, icon: Icon }) => (
                  <button
                    key={type}
                    onClick={() => setOrderType(type)}
                    className={`flex flex-1 items-center justify-center gap-1 rounded-lg py-2 text-[11px] font-bold transition-all ${
                      orderType === type
                        ? 'bg-orange-600 text-white shadow-sm shadow-orange-600/20'
                        : 'bg-slate-50 text-slate-500 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'
                    }`}
                  >
                    <Icon className="h-3 w-3" />
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Conditional fields based on order type */}
            {orderType === 'Dining' && (
              <div className="mb-4">
                <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400">Table Number</label>
                <input
                  type="text"
                  value={tableNumber}
                  onChange={(e) => setTableNumber(e.target.value)}
                  placeholder="e.g. T1, T2..."
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm transition-all focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400/15 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>
            )}

            {orderType === 'Delivery' && (
              <div className="mb-4 space-y-2">
                <div>
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400">Delivery Address</label>
                  <input
                    type="text"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    placeholder="Delivery address..."
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm transition-all focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400/15 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400">Phone</label>
                    <input
                      type="text"
                      value={deliveryPhone}
                      onChange={(e) => setDeliveryPhone(e.target.value)}
                      placeholder="Phone number"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm transition-all focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400/15 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400">Delivery Fee</label>
                    <input
                      type="number"
                      step="0.01"
                      value={deliveryFee}
                      onChange={(e) => setDeliveryFee(Number(e.target.value))}
                      placeholder="0"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm transition-all focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400/15 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    />
                  </div>
                </div>
              </div>
            )}

            {delFee > 0 && (
              <div className="mb-2 flex justify-between text-sm">
                <span className="font-medium text-slate-500 dark:text-slate-400">Delivery Fee</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">Rs {delFee.toLocaleString()}</span>
              </div>
            )}

            <button
              onClick={checkout}
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-orange-600/20 transition-all hover:bg-orange-700 hover:shadow-orange-600/30 active:scale-[0.98] disabled:opacity-50"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
              {submitting ? 'Processing...' : `Checkout - Rs ${total.toLocaleString()}`}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
