import { LabOrderTest } from '../models/OrderTest'
import { LabPayment } from '../models/Payment'

/**
 * Calculate financial totals for a token/order dynamically
 * Source of truth: LabOrderTest (for prices) and LabPayment (for payments)
 */
export async function calculateTokenFinancials(tokenId: string) {
  // Get all active (non-returned) tests for this token
  const tests = await LabOrderTest.find({
    tokenId,
    isReturned: false
  }).lean()

  // Calculate total from active tests
  const total = tests.reduce((sum, t) => sum + (t.price || 0), 0)

  // Get all payments for this token
  const payments = await LabPayment.find({ tokenId }).lean()

  // Calculate total paid (payments - refunds)
  const totalPaid = payments.reduce((sum, p) => {
    if (p.type === 'payment') return sum + p.amount
    if (p.type === 'refund') return sum - p.amount
    if (p.type === 'adjustment') return sum + p.amount // Adjustments can be positive or negative
    return sum
  }, 0)

  const receivable = Math.max(0, total - totalPaid)

  return {
    total,
    totalPaid,
    receivable,
    testCount: tests.length,
    paymentCount: payments.length
  }
}

/**
 * Get detailed payment history for a token
 */
export async function getTokenPaymentHistory(tokenId: string) {
  return LabPayment.find({ tokenId })
    .sort({ createdAt: -1 })
    .lean()
}

/**
 * Get all tests for a token with their status
 */
export async function getTokenTests(tokenId: string) {
  return LabOrderTest.find({ tokenId })
    .sort({ createdAt: 1 })
    .lean()
}
