import express, { Request, Response } from 'express'
import cors from 'cors'
import morgan from 'morgan'
import path from 'node:path'
import { env } from './config/env'
import apiRouter from './routes'
import { errorHandler } from './common/middleware/error'

const app = express()

// CORS configuration: allow specific origins for security with credentials
const allowedOrigins = [
  'http://localhost:8080',
  'http://127.0.0.1:8080',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  env.CORS_ORIGIN,
].filter(Boolean)

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, or server-to-server)
    if (!origin) return callback(null, true)
    
    // In development, allow all localhost origins
    if (env.NODE_ENV === 'development') {
      if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
        return callback(null, true)
      }
    }
    
    // Check if origin is in allowed list
    if (allowedOrigins.includes(origin)) {
      return callback(null, true)
    }
    
    callback(new Error(`CORS policy: Origin ${origin} not allowed`))
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}))
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
