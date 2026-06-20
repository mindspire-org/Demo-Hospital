import app from './app'
import { connectDB } from './config/db'
import { env } from './config/env'
import { Dispense } from './modules/pharmacy/models/Dispense'
import { startBiometricPoller } from './modules/biometric/jobs/poller'
import { ensureDefaultPortalLogins } from './seeds/default_logins'

process.on('uncaughtException', (err) => {
  console.error('[UNCAUGHT EXCEPTION] Backend process continuing. Error:', err)
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('[UNHANDLED REJECTION] Backend process continuing. Reason:', reason)
})

async function main(){
  // Start server FIRST so health endpoint is available immediately
  const server = app.listen(env.PORT, '0.0.0.0', () => {
    console.log(`Backend listening on http://localhost:${env.PORT}`)
  })

  // Do initialization in background - don't block server startup
  ;(async () => {
    try {
      await connectDB()
      await Dispense.init()
      try {
        await Dispense.createCollection()
      } catch {}

      // Seed default portal logins (admin / 123) for all modules
      try {
        await ensureDefaultPortalLogins()
        console.log('[backend] Default portal logins ensured')
      } catch (seedErr) {
        console.warn('[backend] Default portal logins seed error:', seedErr)
      }

      console.log('[backend] Initialization complete')

      // Auto-start biometric poller based on saved config
      try {
        await startBiometricPoller()
      } catch (pollerErr) {
        console.warn('[backend] Biometric poller could not start:', pollerErr)
      }
    } catch (err) {
      console.error('[backend] Initialization error:', err)
    }
  })()
}

main().catch(err => {
  console.error('Failed to start server', err)
  process.exit(1)
})
