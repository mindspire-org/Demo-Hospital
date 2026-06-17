import mongoose from 'mongoose'
import { env } from './env'

export async function connectDB() {
  mongoose.set('strictQuery', true)
  
  const conn = mongoose.connection
  
  // Handle connection errors and auto-reconnect
  conn.on('error', (err) => {
    console.error('[MONGODB] Connection error:', err.message)
  })
  
  conn.on('disconnected', () => {
    console.warn('[MONGODB] Disconnected - attempting reconnect...')
  })
  
  conn.on('reconnected', () => {
    console.log('[MONGODB] Reconnected successfully')
  })
  
  await mongoose.connect(env.MONGO_URI, {
    maxPoolSize: 20,
    minPoolSize: 1,
    serverSelectionTimeoutMS: 10_000,
    socketTimeoutMS: 45_000,
    connectTimeoutMS: 30_000,
    heartbeatFrequencyMS: 10_000,
    family: 4,
  } as any)
  
  console.log('[MONGODB] Connected to', conn.name)
  return conn
}
