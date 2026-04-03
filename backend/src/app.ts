import express, { Request, Response } from 'express'
import cors from 'cors'
import morgan from 'morgan'
import path from 'node:path'
import { env } from './config/env'
import apiRouter from './routes'
import { errorHandler } from './common/middleware/error'

const app = express()

const corsOrigin = env.NODE_ENV === 'development' ? true : env.CORS_ORIGIN
app.use(cors({ origin: corsOrigin as any, credentials: true }))
app.use(express.json({ limit: '100mb' }))
app.use(express.urlencoded({ extended: true }))
app.use(morgan('dev'))

app.get('/health', (_req: Request, res: Response) => res.json({ ok: true }))

app.use('/api', apiRouter)

// Serve built frontend for all non-API routes
// Development: frontend dist is at root/dist (relative to backend/dist)
// Production (installed): frontend dist is at resources/dist (sibling to resources/server/dist)
const possiblePaths = [
  path.join(__dirname, '..', '..', 'dist'),           // dev: backend/dist -> root/dist
  path.join(__dirname, '..', 'dist'),                 // prod: resources/server/dist -> resources/dist
]

let publicDir = possiblePaths[0]
for (const p of possiblePaths) {
  try {
    if (require('fs').existsSync(path.join(p, 'index.html'))) {
      publicDir = p
      break
    }
  } catch {}
}

app.use(express.static(publicDir, { index: false }))
app.get('*', (req: Request, res: Response, next) => {
  if (req.path.startsWith('/api')) return next()
  const indexPath = path.join(publicDir, 'index.html')
  if (require('fs').existsSync(indexPath)) {
    return res.sendFile(indexPath)
  }
  return next()
})

app.use(errorHandler)

export default app
