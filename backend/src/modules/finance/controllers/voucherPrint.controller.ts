import { Request, Response } from 'express'
import { Voucher } from '../models/Voucher'

// Generate printable voucher HTML
export async function print(req: Request, res: Response) {
  const id = String(req.params.id)
  const voucher: any = await Voucher.findById(id).lean()
  if (!voucher) return res.status(404).json({ error: 'Voucher not found' })

  // Mark as printed
  await Voucher.updateOne({ _id: id }, { printedAt: new Date().toISOString() })

  const totalDebit = (voucher.lines || []).reduce((s: number, l: any) => s + (l.debit || 0), 0)
  const totalCredit = (voucher.lines || []).reduce((s: number, l: any) => s + (l.credit || 0), 0)

  const linesHtml = (voucher.lines || []).map((l: any) => `
    <tr>
      <td style="padding:6px 10px;border:1px solid #ddd">${l.accountCode || ''}</td>
      <td style="padding:6px 10px;border:1px solid #ddd">${l.accountName || ''}</td>
      <td style="padding:6px 10px;border:1px solid #ddd;text-align:right">${l.debit ? Number(l.debit).toLocaleString() : ''}</td>
      <td style="padding:6px 10px;border:1px solid #ddd;text-align:right">${l.credit ? Number(l.credit).toLocaleString() : ''}</td>
    </tr>
  `).join('')

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Voucher ${voucher.voucherNo}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
        h1 { color: #1a365d; border-bottom: 2px solid #1a365d; padding-bottom: 8px; }
        table { width: 100%; border-collapse: collapse; margin-top: 16px; }
        th { background: #1a365d; color: #fff; padding: 8px 10px; text-align: left; }
        .meta { display: flex; gap: 40px; margin: 16px 0; }
        .meta div { flex: 1; }
        .total-row { font-weight: bold; background: #f0f4f8; }
        .footer { margin-top: 40px; display: flex; justify-content: space-between; }
        .signature { text-align: center; min-width: 200px; }
        .signature-line { border-top: 1px solid #333; margin-top: 40px; padding-top: 4px; }
      </style>
    </head>
    <body>
      <h1>${voucher.voucherType} Voucher</h1>
      <div class="meta">
        <div><strong>Voucher No:</strong> ${voucher.voucherNo}</div>
        <div><strong>Date:</strong> ${voucher.dateIso}</div>
        <div><strong>Status:</strong> ${voucher.status.toUpperCase()}</div>
      </div>
      <div class="meta">
        <div><strong>Payee:</strong> ${voucher.payee || '—'}</div>
        <div><strong>Cheque No:</strong> ${voucher.chequeNo || '—'}</div>
        <div><strong>Module:</strong> ${voucher.module || '—'}</div>
      </div>
      ${voucher.narration ? `<p><strong>Narration:</strong> ${voucher.narration}</p>` : ''}
      ${voucher.isExpense ? `<p><strong>Expense Category:</strong> ${voucher.expenseCategory || '—'} | <strong>Department:</strong> ${voucher.expenseDepartment || '—'} | <strong>Cost Center:</strong> ${voucher.costCenter || '—'}</p>` : ''}
      <table>
        <thead>
          <tr>
            <th>Account Code</th>
            <th>Account Name</th>
            <th style="text-align:right">Debit</th>
            <th style="text-align:right">Credit</th>
          </tr>
        </thead>
        <tbody>
          ${linesHtml}
          <tr class="total-row">
            <td colspan="2" style="padding:8px 10px;border:1px solid #ddd;text-align:right"><strong>TOTAL</strong></td>
            <td style="padding:8px 10px;border:1px solid #ddd;text-align:right"><strong>${totalDebit.toLocaleString()}</strong></td>
            <td style="padding:8px 10px;border:1px solid #ddd;text-align:right"><strong>${totalCredit.toLocaleString()}</strong></td>
          </tr>
        </tbody>
      </table>
      <div class="footer">
        <div class="signature"><div class="signature-line">Prepared By</div></div>
        <div class="signature"><div class="signature-line">Approved By</div></div>
        <div class="signature"><div class="signature-line">Received By</div></div>
      </div>
    </body>
    </html>
  `

  res.setHeader('Content-Type', 'text/html')
  res.send(html)
}
