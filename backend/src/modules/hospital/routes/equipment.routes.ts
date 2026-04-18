import { Router } from 'express'
import * as Equipment from '../controllers/equipment.controller'
import * as Supplier from '../controllers/equipmentSupplier.controller'

const r = Router()

// Equipment CRUD
r.get('/', Equipment.list)
r.post('/', Equipment.create)
r.put('/:id', Equipment.update)
r.delete('/:id', Equipment.remove)

// Maintenance (PPM/Calibration/Repair) - NEW Unified Endpoints
r.get('/maintenance', Equipment.listMaintenance)
r.post('/maintenance', Equipment.createMaintenance)
r.get('/due/ppm', Equipment.duePPM)
r.get('/due/calibration', Equipment.dueCalibration)

// Breakdowns & Condemnations
r.get('/breakdowns', Equipment.listBreakdowns)
r.post('/breakdowns', Equipment.createBreakdown)
r.put('/breakdowns/:id', Equipment.updateBreakdown)
r.get('/condemnations', Equipment.listCondemnations)
r.post('/condemnations', Equipment.createCondemnation)
r.put('/condemnations/:id', Equipment.updateCondemnation)

// Suppliers (NEW) - Order matters: specific routes before parameterized
r.get('/suppliers/stats', Supplier.stats)
r.get('/suppliers', Supplier.list)
r.post('/suppliers', Supplier.create)
r.put('/suppliers/:id', Supplier.update)
r.delete('/suppliers/:id', Supplier.remove)
r.get('/suppliers/:id/ledger', Supplier.getLedger)
r.post('/suppliers/:id/payments', Supplier.addPayment)

// Analytics
r.get('/kpis', Equipment.kpis)

// Purchases
r.get('/purchases', Equipment.listPurchases)

export default r
