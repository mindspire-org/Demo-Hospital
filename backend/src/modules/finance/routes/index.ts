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

const r = Router()

// Chart of Accounts
r.get('/chart-of-accounts', ChartOfAccount.list)
r.get('/chart-of-accounts/:id', ChartOfAccount.get)
r.post('/chart-of-accounts', ChartOfAccount.create)
r.put('/chart-of-accounts/:id', ChartOfAccount.update)
r.delete('/chart-of-accounts/:id', ChartOfAccount.remove)
r.get('/chart-of-accounts/:id/balance', ChartOfAccount.getBalance)
r.get('/chart-of-accounts/:id/ledger', ChartOfAccount.getLedger)
r.post('/chart-of-accounts/create-user-account', ChartOfAccount.createUserAccount)
r.post('/chart-of-accounts/import', ChartOfAccount.importAccounts)
r.post('/chart-of-accounts/seed-defaults', ChartOfAccount.seedDefaultAccounts)

// Cash Counts (Manager Cash Count)
r.get('/cash-counts', CashCounts.list)
r.post('/cash-counts', CashCounts.create)
r.delete('/cash-counts/:id', CashCounts.remove)
r.get('/cash-counts/summary', CashCounts.summary)

// Finance Doctor Management
r.post('/manual-doctor-earning', FinanceCtl.postManualDoctorEarning)
r.post('/doctor-payout', FinanceCtl.postDoctorPayout)
r.get('/doctor/:id/balance', FinanceCtl.getDoctorBalance)
r.get('/doctor/:id/payouts', FinanceCtl.listDoctorPayouts)
r.get('/doctor/:id/accruals', FinanceCtl.doctorAccruals)
r.get('/earnings', FinanceCtl.listDoctorEarnings)
r.post('/journal/:id/reverse', FinanceCtl.reverseJournal)
r.delete('/manual-earning/:id', FinanceCtl.deleteManualEarning)
r.get('/transactions', FinanceCtl.listAllTransactions)
r.get('/corporate-ar-breakdown', FinanceCtl.getCorporateARBreakdown)

// Finance Users
r.get('/users', financeUsersList)
r.post('/users', financeUsersCreate)
r.put('/users/:id', financeUsersUpdate)
r.delete('/users/:id', financeUsersRemove)
r.post('/users/login', financeUsersLogin)
r.post('/users/logout', financeUsersLogout)

// Finance Sidebar Permissions
r.get('/sidebar-roles', FinanceSidebarPerms.listRoles)
r.post('/sidebar-roles', FinanceSidebarPerms.createRole)
r.delete('/sidebar-roles/:role', FinanceSidebarPerms.deleteRole)
r.get('/sidebar-permissions', FinanceSidebarPerms.getPermissions)
r.put('/sidebar-permissions/:role', FinanceSidebarPerms.updatePermissions)
r.post('/sidebar-permissions/:role/reset', FinanceSidebarPerms.resetToDefaults)

// Finance Audit Logs
r.get('/audit-logs', FinanceAudit.list)
r.post('/audit-logs', FinanceAudit.create)

// Accounts Ledger
r.get('/accounts-ledger', listAllAccountsLedger)

// Vouchers
r.get('/vouchers/next-no', Voucher.nextVoucherNo)
r.get('/vouchers', Voucher.list)
r.get('/vouchers/:id', Voucher.get)
r.post('/vouchers', Voucher.create)
r.post('/vouchers/expense', Voucher.createExpense)
r.get('/vouchers/expense-list', Voucher.listExpenses)
r.put('/vouchers/:id', Voucher.update)
r.delete('/vouchers/:id', Voucher.remove)
r.post('/vouchers/:id/post', Voucher.post)
r.post('/vouchers/:id/cancel', Voucher.cancel)
r.post('/vouchers/:id/approve', Voucher.approve)
r.get('/vouchers/:id/print', VoucherPrint.print)

// Fiscal Periods
r.get('/fiscal-periods', FiscalPeriod.list)
r.post('/fiscal-periods', FiscalPeriod.create)
r.post('/fiscal-periods/:id/close', FiscalPeriod.close)
r.post('/fiscal-periods/:id/year-end-close', FiscalPeriod.yearEndClose)
r.post('/fiscal-periods/:id/lock', FiscalPeriod.lock)
r.post('/fiscal-periods/:id/reopen', FiscalPeriod.reopen)

// Recurring Vouchers
r.get('/recurring-vouchers', RecurringVoucher.list)
r.post('/recurring-vouchers', RecurringVoucher.create)
r.put('/recurring-vouchers/:id', RecurringVoucher.update)
r.delete('/recurring-vouchers/:id', RecurringVoucher.remove)
r.post('/recurring-vouchers/generate-due', RecurringVoucher.generateDue)

// Budgets
r.get('/budgets', Budget.list)
r.post('/budgets', Budget.create)
r.put('/budgets/:id', Budget.update)
r.get('/budgets/vs-actual', Budget.budgetVsActual)
r.get('/budgets/cost-center-pnl', Budget.departmentWisePnL)

// Bank Reconciliation
r.get('/bank-reconciliation', BankReconciliation.list)
r.post('/bank-reconciliation', BankReconciliation.create)
r.put('/bank-reconciliation/:id', BankReconciliation.update)
r.post('/bank-reconciliation/:id/auto-match', BankReconciliation.autoMatch)
r.post('/bank-reconciliation/:id/reconcile', BankReconciliation.reconcile)

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
r.get('/shifts', ShiftController.listShifts)
r.get('/shifts/current', ShiftController.getCurrentShift)
r.get('/shifts/summary', ShiftController.getShiftSummary)
r.get('/shifts/:id', ShiftController.getShift)
r.post('/shifts', ShiftController.openShift)
r.post('/shifts/:id/collections', ShiftController.updateShiftCollections)
r.post('/shifts/:id/expenses', ShiftController.updateShiftExpenses)
r.post('/shifts/:id/close', ShiftController.closeShift)
r.post('/shifts/:id/approve', ShiftController.approveShiftClosure)
r.post('/shifts/:id/reconcile', ShiftController.reconcileShift)
r.post('/shifts/compare', ShiftController.compareShifts)

// Shift Settings
import * as ShiftSettingsController from '../controllers/shiftSettings.controller'
r.get('/shift-settings', ShiftSettingsController.getShiftSettings)
r.put('/shift-settings', ShiftSettingsController.updateShiftSettings)
r.get('/shift-settings/current-slot', ShiftSettingsController.getCurrentShiftTimeSlot)

export default r
