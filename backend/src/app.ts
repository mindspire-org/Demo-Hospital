
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
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Master-Key'],
}))
app.use(express.json({ limit: '100mb' }))
app.use(express.urlencoded({ limit: '100mb', extended: true }))
app.use(morgan('dev'))

let setupRequiredCache: boolean | null = null
let setupCacheTime = 0

app.get('/health', async (_req: Request, res: Response) => {
  let setupRequired = false
  try {
    // Cache for 5 seconds to avoid DB hit on every health poll
    if (setupRequiredCache !== null && Date.now() - setupCacheTime < 5000) {
      setupRequired = setupRequiredCache
    } else {
      const { SuperAdminUser } = await import('./modules/admin/models/SuperAdminUser')
      const count = await SuperAdminUser.countDocuments()
      setupRequired = count === 0
      setupRequiredCache = setupRequired
      setupCacheTime = Date.now()
    }
  } catch {
    setupRequired = true
  }
  res.json({ ok: true, setupRequired })
})

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

// IMPORTANT: Serve static files FIRST (without index.html fallback)
// so that assets like /assets/index-xxx.js are served correctly
app.use(express.static(publicDir, { 
  index: false,
  // Set proper MIME types for module scripts
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8')
    } else if (filePath.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css; charset=utf-8')
    }
  }
}))

// SPA catch-all: serve index.html for ALL non-API routes
// This must come AFTER static file serving
app.get('*', (req: Request, res: Response, next) => {
  // Skip API routes and file requests that have extensions
  if (req.path.startsWith('/api')) return next()
  
  // If request has a file extension (e.g., .js, .css, .png), don't serve index.html
  // Let it 404 if static file wasn't found
  if (req.path.match(/\.[a-zA-Z0-9]+$/)) return next()
  
  const indexPath = path.join(publicDir, 'index.html')
  if (require('fs').existsSync(indexPath)) {
    return res.sendFile(indexPath)
  }
  return next()
})

app.use(errorHandler)

export default app
