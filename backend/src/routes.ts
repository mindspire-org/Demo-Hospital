import { Router } from 'express'
import pharmacyRouter from './modules/pharmacy/routes'
import indoorPharmacyRouter from './modules/indoorpharmacy/routes/indoorpharmacy.routes'
import labRouter from './modules/lab/routes'
import hospitalRouter from './modules/hospital/routes'
import diagnosticRouter from './modules/diagnostic/routes'
import receptionRouter from './modules/reception/routes'
import adminRouter from './modules/admin/routes'
import corporateRouter from './modules/corporate/routes'
import aestheticRouter from './modules/aesthetic/routes'
import biometricRouter from './modules/biometric/routes'
import dialysisRouter from './modules/dialysis/routes'
import financeRouter from './modules/finance/routes'
import campRouter from './modules/camp/routes'
import cafeteriaRouter from './modules/cafeteria/routes'

const router = Router()

router.use('/pharmacy', pharmacyRouter)
router.use('/indoor-pharmacy', indoorPharmacyRouter)
router.use('/lab', labRouter)
router.use('/hospital', hospitalRouter)
router.use('/diagnostic', diagnosticRouter)
router.use('/reception', receptionRouter)
router.use('/admin', adminRouter)
router.use('/corporate', corporateRouter)
router.use('/aesthetic', aestheticRouter)
router.use('/biometric', biometricRouter)
router.use('/dialysis', dialysisRouter)
router.use('/finance', financeRouter)
router.use('/camp', campRouter)
router.use('/cafeteria', cafeteriaRouter)

export default router
