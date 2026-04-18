import { Router } from 'express'
import * as FinanceCtl from '../controllers/finance.controller'
import * as ChartOfAccount from '../controllers/chartOfAccount.controller'
import * as CashHandover from '../controllers/cashHandover.controller'
import * as FinanceSidebarPerms from '../controllers/finance_sidebarPermission.controller'
import { list as financeUsersList, create as financeUsersCreate, update as financeUsersUpdate, remove as financeUsersRemove, login as financeUsersLogin, logout as financeUsersLogout } from '../controllers/finance_users.controller'
import * as FinanceAudit from '../controllers/finance_audit.controller'
import * as CashCounts from '../controllers/cash_count.controller'

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
r.post('/chart-of-accounts/seed-defaults', ChartOfAccount.seedDefaultAccounts)

// Cash Handover
r.post('/cash-handovers', CashHandover.create)
r.get('/cash-handovers', CashHandover.list)
r.get('/cash-handovers/pending', CashHandover.getPending)
r.post('/cash-handovers/:id/approve', CashHandover.approve)
r.post('/cash-handovers/:id/reject', CashHandover.reject)

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

export default r
