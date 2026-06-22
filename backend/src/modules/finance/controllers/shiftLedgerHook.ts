import { Shift } from '../models/Shift'

const MODULE_TO_COLLECTION: Record<string, string> = {
  opd: 'opd',
  lab: 'lab',
  pharmacy: 'pharmacy',
  ipd: 'ipd',
  er: 'er',
  diagnostic: 'diagnostic',
  dialysis: 'dialysis',
  aesthetic: 'aesthetic',
  cafeteria: 'cafeteria',
  general: 'opd' // fallback to opd for general
}

const EXPENSE_REFTYPE_MAP: Record<string, string> = {
  doctor_payout: 'doctorPayouts',
  aesthetic_doctor_payout: 'doctorPayouts',
  manual_doctor_earning: 'doctorPayouts',
  aesthetic_manual_doctor_earning: 'doctorPayouts',
  expense: 'pettyCash',
  voucher: 'purchases',
  refund: 'refunds'
}

export async function addJournalToShiftCollections(args: {
  module?: string
  refType?: string
  amount: number
  counterId?: string
}) {
  try {
    if (!args.amount || args.amount <= 0) return

    // Find currently open shift
    const query: any = { status: 'open' }
    if (args.counterId) query.counterId = args.counterId
    const shift: any = await Shift.findOne(query).sort({ startTime: -1 })
    if (!shift) return

    const moduleKey = args.module || 'general'
    const collectionField = MODULE_TO_COLLECTION[moduleKey]

    if (collectionField) {
      // Update collections
      const currentVal = Number((shift.collections as any)?.[collectionField] || 0)
      const currentTotal = Number(shift.collections?.total || 0)

      await Shift.findByIdAndUpdate(shift._id, {
        $set: {
          [`collections.${collectionField}`]: currentVal + args.amount,
          'collections.total': currentTotal + args.amount,
          expectedCash: (shift.openingFloat || 0) + (currentTotal + args.amount) - (shift.expenses?.total || 0)
        }
      })
    }
  } catch (err) {
    console.error('[shiftLedgerHook] Failed to add collection:', err)
  }
}

export async function subtractJournalFromShiftCollections(args: {
  module?: string
  refType?: string
  amount: number
  counterId?: string
}) {
  try {
    if (!args.amount || args.amount <= 0) return

    const query: any = { status: 'open' }
    if (args.counterId) query.counterId = args.counterId
    const shift: any = await Shift.findOne(query).sort({ startTime: -1 })
    if (!shift) return

    const moduleKey = args.module || 'general'
    const collectionField = MODULE_TO_COLLECTION[moduleKey]

    if (collectionField) {
      const currentVal = Number((shift.collections as any)?.[collectionField] || 0)
      const currentTotal = Number(shift.collections?.total || 0)
      const newVal = Math.max(0, currentVal - args.amount)
      const newTotal = Math.max(0, currentTotal - args.amount)

      await Shift.findByIdAndUpdate(shift._id, {
        $set: {
          [`collections.${collectionField}`]: newVal,
          'collections.total': newTotal,
          expectedCash: (shift.openingFloat || 0) + newTotal - (shift.expenses?.total || 0)
        }
      })
    }
  } catch (err) {
    console.error('[shiftLedgerHook] Failed to subtract collection:', err)
  }
}

export async function addExpenseToShift(args: {
  refType?: string
  amount: number
  counterId?: string
}) {
  try {
    if (!args.amount || args.amount <= 0) return

    const query: any = { status: 'open' }
    if (args.counterId) query.counterId = args.counterId
    const shift: any = await Shift.findOne(query).sort({ startTime: -1 })
    if (!shift) return

    const expenseKey = EXPENSE_REFTYPE_MAP[args.refType || ''] || 'pettyCash'
    const currentVal = Number((shift.expenses as any)?.[expenseKey] || 0)
    const currentTotal = Number(shift.expenses?.total || 0)

    await Shift.findByIdAndUpdate(shift._id, {
      $set: {
        [`expenses.${expenseKey}`]: currentVal + args.amount,
        'expenses.total': currentTotal + args.amount,
        expectedCash: (shift.openingFloat || 0) + (shift.collections?.total || 0) - (currentTotal + args.amount)
      }
    })
  } catch (err) {
    console.error('[shiftLedgerHook] Failed to add expense:', err)
  }
}
