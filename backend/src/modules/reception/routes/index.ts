import { Router } from 'express'
import * as Users from '../controllers/users.controller'
import * as Auth from '../controllers/auth.controller'
import * as Sidebar from '../controllers/sidebarPermission.controller'
import * as Reports from '../controllers/reports.controller'
import * as Intake from '../controllers/intake.controller'
import * as Shifts from '../controllers/shifts.controller'
import * as CashMovements from '../controllers/cash_movement.controller'
import { expenseController } from '../controllers/expense.controller'
import { auth } from '../../../common/middleware/auth'
import { requireAdmin } from '../../../common/middleware/hospital_guard'

const r = Router()

// Auth
r.post('/login', Auth.login)
r.post('/logout', Auth.logout)

// Shifts
r.get('/shifts', auth, Shifts.list)
r.post('/shifts', auth, requireAdmin, Shifts.create)
r.put('/shifts/:id', auth, requireAdmin, Shifts.update)
r.delete('/shifts/:id', auth, requireAdmin, Shifts.remove)

// Users
r.get('/users', auth, requireAdmin, Users.list)
r.post('/users', auth, requireAdmin, Users.create)
r.put('/users/:id', auth, requireAdmin, Users.update)
r.delete('/users/:id', auth, requireAdmin, Users.remove)

// Sidebar Roles & Permissions
r.get('/sidebar-roles', auth, requireAdmin, Sidebar.listRoles)
r.post('/sidebar-roles', auth, requireAdmin, Sidebar.createRole)
r.delete('/sidebar-roles/:role', auth, requireAdmin, Sidebar.deleteRole)

r.get('/sidebar-permissions', auth, Sidebar.getPermissions)
r.put('/sidebar-permissions/:role', auth, requireAdmin, Sidebar.updatePermissions)
r.post('/sidebar-permissions/:role/reset', auth, requireAdmin, Sidebar.resetToDefaults)

// Reports
r.get('/reports/my-activity', auth, (req, res) => {
  console.log('[RECEPTION] /reports/my-activity route hit');
  Reports.myActivity(req, res);
})

// Intake (create Lab/Diagnostic tokens from Reception portal)
r.post('/intake/lab/orders', auth, Intake.createLabOrder)
r.post('/intake/diagnostic/tokens', auth, Intake.createDiagnosticToken)

// Cash Movements (Pay In/Out)
r.get('/cash-movements', auth, CashMovements.list)
r.post('/cash-movements', auth, CashMovements.create)
r.delete('/cash-movements/:id', auth, requireAdmin, CashMovements.remove)
r.get('/cash-movements/summary', auth, CashMovements.summary)

// Expenses (reception user -> finance approval)
r.post('/expenses', auth, expenseController.create)
r.get('/expenses', auth, expenseController.listMy)
r.delete('/expenses/:id', auth, expenseController.deleteMy)
// Finance: list all + approve/reject (also under /api/reception for convenience; finance token is cross-checked in controller)
r.get('/expenses/all', auth, requireAdmin, expenseController.listAll)
r.post('/expenses/:id/approve', auth, requireAdmin, expenseController.approve)
r.post('/expenses/:id/reject', auth, requireAdmin, expenseController.reject)

export default r
