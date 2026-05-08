import { Plus, Minus, Trash2 } from 'lucide-react'

type Product = {
  id: string
  name: string
  genericName?: string
  unitPrice: number
  salePerPack?: number
  unitsPerPack?: number
  stock?: number
  defaultDiscountPct?: number
}

type CartLine = {
  id: string
  productId: string
  name: string
  unitPrice: number
  qty: number
  sellBy?: 'loose' | 'pack'
  unitsPerPack?: number
  salePerPack?: number
  discountRs?: number
  discountPct?: number
}

type Props = {
  cart: CartLine[]
  products: Product[]
  productIndex?: Record<string, Product>
  onInc: (id: string) => void
  onDec: (id: string) => void
  onRemove: (id: string) => void
  onClear: () => void
  onSetQty: (id: string, qty: number) => void
  onSetSellBy?: (id: string, sellBy: 'loose' | 'pack') => void
  onQtyEnter?: () => void
  onSetLineDiscountPct?: (id: string, discountPct: number) => void
  cartLineIds?: string[]
  focusedLineIdx?: number
}

export default function Pharmacy_POSCart({ cart, products, productIndex, onInc, onDec, onRemove, onClear, onSetQty, onSetSellBy, onQtyEnter, onSetLineDiscountPct, cartLineIds, focusedLineIdx }: Props) {
  const focusField = (idx: number, field: 'qty' | 'disc' | 'unit') => {
    const line = cart[idx]
    if (!line) return
    const id = field === 'qty'
      ? `pharmacy-pos-qty-${line.id}`
      : field === 'disc'
        ? `pharmacy-pos-disc-${line.id}`
        : `pharmacy-pos-unit-${line.id}`
    const el = document.getElementById(id) as (HTMLInputElement | HTMLSelectElement | null)
    if (!el) return
    try {
      el.focus()
      if ('select' in el) (el as HTMLInputElement).select?.()
    } catch {}
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700">
        <div className="font-medium text-slate-800 dark:text-slate-100">Shopping Cart ({cart.length})</div>
        {cart.length > 0 && (
          <button type="button" onClick={onClear} className="rounded-md p-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30" aria-label="Clear cart" title="Clear cart">
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
      {cart.length === 0 ? (
        <div className="p-4 text-sm text-slate-500 dark:text-slate-400">No items</div>
      ) : (
        <div className="w-full">
          <table className="w-full border-separate border-spacing-0 table-fixed">
            <thead>
              <tr className="bg-slate-100 text-[10px] font-bold uppercase tracking-tight text-slate-600 dark:bg-slate-900/60 dark:text-slate-400">
                <th className="border-b border-r border-slate-200 px-2 py-1 text-center dark:border-slate-700 w-8">#</th>
                <th className="border-b border-r border-slate-200 px-2 py-1 text-left dark:border-slate-700 w-[30%]">ITEM NAME</th>
                <th className="border-b border-r border-slate-200 px-2 py-1 text-center dark:border-slate-700 w-14">UPP</th>
                <th className="border-b border-r border-slate-200 px-2 py-1 text-center dark:border-slate-700 w-14">STK</th>
                <th className="border-b border-r border-slate-200 px-2 py-1 text-center dark:border-slate-700 w-16">QTY</th>
                <th className="border-b border-r border-slate-200 px-2 py-1 text-right dark:border-slate-700 w-24">PRICE</th>
                <th className="border-b border-r border-slate-200 px-2 py-1 text-center dark:border-slate-700 w-16">DISC%</th>
                <th className="border-b border-r border-slate-200 px-2 py-1 text-left dark:border-slate-700 w-20">PACKING</th>
                <th className="border-b border-r border-slate-200 px-2 py-1 text-right dark:border-slate-700 w-20">DISC</th>
                <th className="border-b border-slate-200 px-2 py-1 text-right dark:border-slate-700 w-28">TOTAL</th>
                <th className="border-b border-slate-200 px-1 py-1 text-center w-8"></th>
              </tr>
            </thead>
            <tbody className="text-[11px]">
              {cart.map((line, idx) => {
                const p = (productIndex && productIndex[line.productId]) || products.find(pp => pp.id === line.productId)
                const stock = Number(p?.stock || 0)
                const sellBy = line.sellBy || 'loose'
                const upp = Number((line.unitsPerPack ?? p?.unitsPerPack ?? 0) || 0)
                const unitPrice = Number(((p?.unitPrice ?? line.unitPrice) ?? 0) || 0)
                const salePerPack = Number((line.salePerPack ?? p?.salePerPack ?? (upp > 0 ? unitPrice * upp : 0)) || 0)
                const lineTotal = line.qty * (sellBy === 'pack' ? salePerPack : unitPrice)
                const discountAmt = lineTotal * Math.max(0, Math.min(100, Number(line.discountPct || 0))) / 100
                const isFocused = focusedLineIdx === idx
                const defaultDisc = Math.max(0, Math.min(100, Number(p?.defaultDiscountPct || 0)))

                return (
                  <tr key={line.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'} ${isFocused ? 'bg-sky-50' : ''} dark:${idx % 2 === 0 ? 'bg-slate-800' : 'bg-slate-800/60'}`}>
                    <td className="border-b border-r border-slate-100 px-2 py-1 text-center text-slate-500 dark:border-slate-700 font-medium">{idx + 1}</td>
                    <td className="border-b border-r border-slate-100 px-2 py-1 font-medium text-slate-800 dark:text-slate-100 truncate">{p?.name || line.name}</td>
                    <td className="border-b border-r border-slate-100 px-2 py-1 text-center text-slate-500 dark:text-slate-400 font-mono">{upp || 0}</td>
                    <td className={`border-b border-r border-slate-100 px-2 py-1 text-center font-bold font-mono ${stock < 10 ? 'text-rose-500' : 'text-slate-500'}`}>{stock}</td>
                    <td className="border-b border-r border-slate-100 px-1 py-1 dark:border-slate-700">
                      <input
                        id={`pharmacy-pos-qty-${line.id}`}
                        type="number"
                        min={1}
                        value={line.qty}
                        onChange={e => { const v = parseInt(e.target.value || '1', 10); onSetQty(line.id, isNaN(v) ? 1 : v) }}
                        onKeyDown={e => {
                          if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); focusField(idx, 'disc'); return }
                          if (e.key === 'ArrowDown') { e.preventDefault(); e.stopPropagation(); focusField(Math.min(cart.length - 1, idx + 1), 'qty'); return }
                          if (e.key === 'ArrowUp') { e.preventDefault(); e.stopPropagation(); focusField(Math.max(0, idx - 1), 'qty'); return }
                          if (e.key === 'ArrowRight') { e.preventDefault(); e.stopPropagation(); onQtyEnter && onSetQty(line.id, line.qty + 1); return }
                          if (e.key === 'ArrowLeft') { e.preventDefault(); e.stopPropagation(); onQtyEnter && onSetQty(line.id, Math.max(1, line.qty - 1)); return }
                          if (e.key === 'Delete') { e.preventDefault(); e.stopPropagation(); onRemove(line.id); return }
                        }}
                        className="w-full bg-transparent text-center font-bold text-slate-900 outline-none dark:text-slate-100"
                      />
                    </td>
                    <td className="border-b border-r border-slate-100 px-2 py-1 text-right tabular-nums text-slate-700 dark:text-slate-200 font-medium">{unitPrice.toFixed(2)}</td>
                    <td className="border-b border-r border-slate-100 px-1 py-1 dark:border-slate-700">
                      <input
                        id={`pharmacy-pos-disc-${line.id}`}
                        type="number"
                        min={0}
                        max={100}
                        step={0.01}
                        value={Number(line.discountPct || 0)}
                        onChange={e => {
                          const v = Math.max(0, Math.min(100, parseFloat(e.target.value || '0') || 0))
                          onSetLineDiscountPct?.(line.id, v)
                        }}
                        onKeyDown={e => {
                          if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); focusField(idx, 'unit'); return }
                          if (e.key === 'ArrowDown') { e.preventDefault(); e.stopPropagation(); focusField(Math.min(cart.length - 1, idx + 1), 'disc'); return }
                          if (e.key === 'ArrowUp') { e.preventDefault(); e.stopPropagation(); focusField(Math.max(0, idx - 1), 'disc'); return }
                          if (e.key === 'Delete') { e.preventDefault(); e.stopPropagation(); onRemove(line.id); return }
                        }}
                        className="w-full bg-transparent text-center font-bold text-slate-900 outline-none dark:text-slate-100"
                      />
                    </td>
                    <td className="border-b border-r border-slate-100 px-1 py-1 dark:border-slate-700">
                      <select
                        id={`pharmacy-pos-unit-${line.id}`}
                        value={sellBy === 'pack' ? 'pack' : 'loose'}
                        onChange={e => {
                          const v = (e.target.value as any) === 'pack' ? 'pack' : 'loose'
                          onSetSellBy?.(line.id, v)
                        }}
                        onKeyDown={e => {
                          if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); onQtyEnter?.(); return }
                          if (e.key === 'ArrowDown') { e.preventDefault(); e.stopPropagation(); focusField(Math.min(cart.length - 1, idx + 1), 'unit'); return }
                          if (e.key === 'ArrowUp') { e.preventDefault(); e.stopPropagation(); focusField(Math.max(0, idx - 1), 'unit'); return }
                          if (e.key === 'ArrowRight') { e.preventDefault(); e.stopPropagation(); onSetSellBy?.(line.id, 'pack'); return }
                          if (e.key === 'ArrowLeft') { e.preventDefault(); e.stopPropagation(); onSetSellBy?.(line.id, 'loose'); return }
                          if (e.key === 'Delete') { e.preventDefault(); e.stopPropagation(); onRemove(line.id); return }
                        }}
                        className="w-full bg-transparent text-[10px] font-bold text-slate-700 outline-none"
                      >
                        <option value="loose">UNIT</option>
                        <option value="pack" disabled={!upp}>PACK</option>
                      </select>
                    </td>
                    <td className="border-b border-r border-slate-100 px-2 py-1 text-right tabular-nums text-slate-700 dark:text-slate-200">{discountAmt.toFixed(2)}</td>
                    <td className="border-b border-slate-100 px-2 py-1 text-right font-bold tabular-nums text-slate-900 dark:text-slate-100">{(lineTotal - discountAmt).toFixed(2)}</td>
                    <td className="border-b border-slate-100 px-1 py-1 text-center">
                      <button type="button" onClick={() => onRemove(line.id)} className="text-rose-400 hover:text-rose-600 transition-colors">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                )
              })}
              {/* Total Row matching Image 1 */}
              <tr className="bg-slate-50/80 font-bold text-slate-700">
                <td colSpan={4} className="px-4 py-2 text-center border-t border-slate-200">Total</td>
                <td className="border-t border-slate-200"></td>
                <td className="border-t border-slate-200"></td>
                <td className="border-t border-slate-200"></td>
                <td className="border-t border-slate-200"></td>
                <td className="px-2 py-2 text-right border-t border-slate-200">{cart.reduce((acc, l) => {
                  const p = (productIndex && productIndex[l.productId]) || products.find(pp => pp.id === l.productId)
                  const unitPrice = Number(((p?.unitPrice ?? l.unitPrice) ?? 0) || 0)
                  const upp = Number((l.unitsPerPack ?? p?.unitsPerPack ?? 0) || 0)
                  const salePerPack = Number((l.salePerPack ?? p?.salePerPack ?? (upp > 0 ? unitPrice * upp : 0)) || 0)
                  const total = l.qty * (l.sellBy === 'pack' ? salePerPack : unitPrice)
                  return acc + (total * (l.discountPct || 0) / 100)
                }, 0).toFixed(2)}</td>
                <td className="px-2 py-2 text-right border-t border-slate-200 text-slate-900">
                  {cart.reduce((acc, l) => {
                    const p = (productIndex && productIndex[l.productId]) || products.find(pp => pp.id === l.productId)
                    const unitPrice = Number(((p?.unitPrice ?? l.unitPrice) ?? 0) || 0)
                    const upp = Number((l.unitsPerPack ?? p?.unitsPerPack ?? 0) || 0)
                    const salePerPack = Number((l.salePerPack ?? p?.salePerPack ?? (upp > 0 ? unitPrice * upp : 0)) || 0)
                    const total = l.qty * (l.sellBy === 'pack' ? salePerPack : unitPrice)
                    const disc = total * (l.discountPct || 0) / 100
                    return acc + (total - disc)
                  }, 0).toFixed(2)}
                </td>
                <td className="border-t border-slate-200"></td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
