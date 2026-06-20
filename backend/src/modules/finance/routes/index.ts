import { Router } from 'express'
import * as FinanceCtl from '../controllers/finance.controller'
import * as ChartOfAccount from '../controllers/chartOfAccount.controller'
import * as FinanceSidebarPerms from '../controllers/finance_sidebarPermission.controller'
import { list as financeUsersList, create as financeUsersCreate, update as financeUsersUpdate, remove as financeUsersRemove, login as financeUsersLogin, logout as financeUsersLogout } from '../controllers/finance_users.controller'
import * as FinanceAudit from '../controllers/finance_audit.controller'
import * as CashCounts from '../controllers/cash_count.controller'
import { listAllAccountsLedger } from '../controllers/accountTransaction.controller'
import * as Voucher from '../controllers/voucher.controller'
import * as Report from '../controllers/report.controller'
import * as FiscalPeriod from '../controllers/fiscalPeriod.controller'
import * as RecurringVoucher from '../controllers/recurringVoucher.controller'
import * as Budget from '../controllers/budget.controller'
import * as BankReconciliation from '../controllers/bankReconciliation.controller'
import * as Settlement from '../controllers/settlement.controller'
import * as VoucherPrint from '../controllers/voucherPrint.controller'
import { auth } from '../../../common/middleware/auth'
import { requireAdmin } from '../../../common/middleware/hospital_guard'
import * as ActivityLog from '../controllers/activityLog.controller'

const r = Router()

// Auth (public)
r.post('/users/login', financeUsersLogin)
r.post('/users/logout', financeUsersLogout)

// All routes below require authentication
r.use(auth)

// Chart of Accounts
r.get('/chart-of-accounts', ChartOfAccount.list)
r.get('/chart-of-accounts/:id', ChartOfAccount.get)
r.post('/chart-of-accounts', requireAdmin, ChartOfAccount.create)
r.put('/chart-of-accounts/:id', requireAdmin, ChartOfAccount.update)
r.delete('/chart-of-accounts/:id', requireAdmin, ChartOfAccount.remove)
r.get('/chart-of-accounts/:id/balance', ChartOfAccount.getBalance)
r.get('/chart-of-accounts/:id/ledger', ChartOfAccount.getLedger)
r.post('/chart-of-accounts/create-user-account', requireAdmin, ChartOfAccount.createUserAccount)
r.post('/chart-of-accounts/import', requireAdmin, ChartOfAccount.importAccounts)
r.post('/chart-of-accounts/seed-defaults', requireAdmin, ChartOfAccount.seedDefaultAccounts)

// Cash Counts (Manager Cash Count)
r.get('/cash-counts', CashCounts.list)
r.post('/cash-counts', requireAdmin, CashCounts.create)
r.delete('/cash-counts/:id', requireAdmin, CashCounts.remove)
r.get('/cash-counts/summary', CashCounts.summary)

// Finance Doctor Management
r.post('/manual-doctor-earning', requireAdmin, FinanceCtl.postManualDoctorEarning)
r.post('/doctor-payout', requireAdmin, FinanceCtl.postDoctorPayout)
r.get('/doctor/:id/balance', FinanceCtl.getDoctorBalance)
r.get('/doctor/:id/payouts', FinanceCtl.listDoctorPayouts)
r.get('/doctor/:id/accruals', FinanceCtl.doctorAccruals)
r.get('/earnings', FinanceCtl.listDoctorEarnings)
r.post('/journal/:id/reverse', requireAdmin, FinanceCtl.reverseJournal)
r.delete('/manual-earning/:id', requireAdmin, FinanceCtl.deleteManualEarning)
r.get('/transactions', FinanceCtl.listAllTransactions)
r.get('/corporate-ar-breakdown', FinanceCtl.getCorporateARBreakdown)

// Finance Users
r.get('/users', financeUsersList)
r.post('/users', requireAdmin, financeUsersCreate)
r.put('/users/:id', requireAdmin, financeUsersUpdate)
r.delete('/users/:id', requireAdmin, financeUsersRemove)

// Finance Sidebar Permissions
r.get('/sidebar-roles', FinanceSidebarPerms.listRoles)
r.post('/sidebar-roles', requireAdmin, FinanceSidebarPerms.createRole)
r.delete('/sidebar-roles/:role', requireAdmin, FinanceSidebarPerms.deleteRole)
r.get('/sidebar-permissions', FinanceSidebarPerms.getPermissions)
r.put('/sidebar-permissions/:role', requireAdmin, FinanceSidebarPerms.updatePermissions)
r.post('/sidebar-permissions/:role/reset', requireAdmin, FinanceSidebarPerms.resetToDefaults)

// Finance Audit Logs
r.get('/audit-logs', FinanceAudit.list)
r.post('/audit-logs', requireAdmin, FinanceAudit.create)

// Accounts Ledger
r.get('/accounts-ledger', listAllAccountsLedger)

// Vouchers
r.get('/vouchers/next-no', Voucher.nextVoucherNo)
r.get('/vouchers', Voucher.list)
r.get('/vouchers/:id', Voucher.get)
r.post('/vouchers', Voucher.create)
r.post('/vouchers/expense', Voucher.createExpense)
r.get('/vouchers/expense-list', Voucher.listExpenses)
r.put('/vouchers/:id', requireAdmin, Voucher.update)
r.delete('/vouchers/:id', requireAdmin, Voucher.remove)
r.post('/vouchers/:id/post', requireAdmin, Voucher.post)
r.post('/vouchers/:id/cancel', requireAdmin, Voucher.cancel)
r.post('/vouchers/:id/approve', requireAdmin, Voucher.approve)
r.get('/vouchers/:id/print', VoucherPrint.print)

// Fiscal Periods
r.get('/fiscal-periods', FiscalPeriod.list)
r.post('/fiscal-periods', requireAdmin, FiscalPeriod.create)
r.post('/fiscal-periods/:id/close', requireAdmin, FiscalPeriod.close)
r.post('/fiscal-periods/:id/year-end-close', requireAdmin, FiscalPeriod.yearEndClose)
r.post('/fiscal-periods/:id/lock', requireAdmin, FiscalPeriod.lock)
r.post('/fiscal-periods/:id/reopen', requireAdmin, FiscalPeriod.reopen)

// Recurring Vouchers
r.get('/recurring-vouchers', RecurringVoucher.list)
r.post('/recurring-vouchers', requireAdmin, RecurringVoucher.create)
r.put('/recurring-vouchers/:id', requireAdmin, RecurringVoucher.update)
r.delete('/recurring-vouchers/:id', requireAdmin, RecurringVoucher.remove)
r.post('/recurring-vouchers/generate-due', requireAdmin, RecurringVoucher.generateDue)

// Budgets
r.get('/budgets', Budget.list)
r.post('/budgets', requireAdmin, Budget.create)
r.put('/budgets/:id', requireAdmin, Budget.update)
r.get('/budgets/vs-actual', Budget.budgetVsActual)
r.get('/budgets/cost-center-pnl', Budget.departmentWisePnL)

// Bank Reconciliation
r.get('/bank-reconciliation', BankReconciliation.list)
r.post('/bank-reconciliation', requireAdmin, BankReconciliation.create)
r.put('/bank-reconciliation/:id', requireAdmin, BankReconciliation.update)
r.post('/bank-reconciliation/:id/auto-match', requireAdmin, BankReconciliation.autoMatch)
r.post('/bank-reconciliation/:id/reconcile', requireAdmin, BankReconciliation.reconcile)

// Inter-module Settlements
r.post('/settlements', Settlement.createSettlement)
r.get('/settlements', Settlement.listSettlements)

// Reports
r.get('/reports/trial-balance', Report.trialBalance)
r.get('/reports/profit-loss', Report.profitLoss)
r.get('/reports/balance-sheet', Report.balanceSheet)
r.get('/reports/cash-flow', Report.cashFlow)

// Shift Management
import * as ShiftController from '../controllers/shift.controller'
r.get('/shifts', auth, ShiftController.listShifts)
r.get('/shifts/current', auth, ShiftController.getCurrentShift)
r.get('/shifts/summary', auth, ShiftController.getShiftSummary)
r.get('/shifts/:id', auth, ShiftController.getShift)
r.post('/shifts', auth, ShiftController.openShift)
r.post('/shifts/:id/collections', auth, ShiftController.updateShiftCollections)
r.post('/shifts/:id/expenses', auth, ShiftController.updateShiftExpenses)
r.post('/shifts/:id/close', auth, ShiftController.closeShift)
r.post('/shifts/:id/approve', auth, ShiftController.approveShiftClosure)
r.post('/shifts/:id/reconcile', auth, ShiftController.reconcileShift)
r.post('/shifts/compare', auth, ShiftController.compareShifts)

// Shift Settings
import * as ShiftSettingsController from '../controllers/shiftSettings.controller'
r.get('/shift-settings', ShiftSettingsController.getShiftSettings)
r.put('/shift-settings', requireAdmin, ShiftSettingsController.updateShiftSettings)
r.get('/shift-settings/current-slot', ShiftSettingsController.getCurrentShiftTimeSlot)

// Activity Log
r.get('/activity-log', auth, ActivityLog.list)
r.get('/activity-log/summary', auth, ActivityLog.summary)
r.get('/activity-log/users', auth, ActivityLog.users)
r.get('/activity-log/actions', auth, ActivityLog.actions)
r.get('/activity-log/export', auth, ActivityLog.exportLogs)

export default r
