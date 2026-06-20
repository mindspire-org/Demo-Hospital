import { Router } from 'express'
import {
  superAdminLogin,
  superAdminSetup,
  getPublicConfig,
  getSystemConfig,
  updateSystemConfig,
  getClientProfile,
  updateClientProfile,
  getModuleRoles,
  createSuperAdmin,
  listSuperAdmins,
  deleteSuperAdmin,
  getUsageStats,
} from '../controllers/superAdmin.controller'
import {
  listAllUsers,
  createUser,
  updateUser,
  deleteUser,
  resetPassword,
} from '../controllers/allUsers.controller'
import { superAdminGuard, superAdminGuardOrMasterKey } from '../../../common/middleware/superAdmin_guard'

const router = Router()

router.post('/login', superAdminLogin)
router.post('/setup', superAdminSetup)
router.get('/public-config', getPublicConfig)
router.get('/config', superAdminGuard, getSystemConfig)
router.put('/config', superAdminGuard, updateSystemConfig)
router.get('/client', superAdminGuard, getClientProfile)
router.put('/client', superAdminGuard, updateClientProfile)
router.get('/roles/:module', superAdminGuard, getModuleRoles)
router.post('/admins', superAdminGuardOrMasterKey, createSuperAdmin)
router.get('/admins', superAdminGuard, listSuperAdmins)
router.delete('/admins/:id', superAdminGuard, deleteSuperAdmin)
router.get('/usage', superAdminGuard, getUsageStats)

// Unified cross-portal user management
router.get('/all-users', superAdminGuard, listAllUsers)
router.post('/all-users', superAdminGuard, createUser)
router.put('/all-users/:portal/:id', superAdminGuard, updateUser)
router.delete('/all-users/:portal/:id', superAdminGuard, deleteUser)
router.post('/all-users/:portal/:id/reset-password', superAdminGuard, resetPassword)

export default router
