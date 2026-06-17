import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import { connectDB } from '../config/db'
import { SuperAdminUser, type SuperAdminUserDoc } from '../modules/admin/models/SuperAdminUser'

/**
 * Super Admin Seed Script
 * 
 * Creates a default super admin user for system access.
 * Run this on VPS after deployment to create initial admin account.
 * 
 * Usage:
 *   npm run seed:super-admin
 * 
 * Default credentials (change after first login):
 *   Username: info@healthspire.org
 *   Password: E@lthsp!re5544@
 */

const SUPER_ADMIN_USERNAME = process.env.SEED_SUPER_ADMIN_USERNAME || 'info@healthspire.org'
const SUPER_ADMIN_PASSWORD = process.env.SEED_SUPER_ADMIN_PASSWORD || 'E@lthsp!re5544@'
const SUPER_ADMIN_FULLNAME = process.env.SEED_SUPER_ADMIN_FULLNAME || 'HealthSpire Administrator'

async function main() {
  console.log('Connecting to database...')
  await connectDB()

  // Check if any super admin already exists
  const existingAdmin = await SuperAdminUser.findOne().lean() as SuperAdminUserDoc | null
  if (existingAdmin) {
    console.log('Super admin user already exists:', existingAdmin.username)
    console.log('If you need to reset, delete the existing SuperAdmin_User document first.')
    process.exit(0)
  }

  // Create super admin user
  const passwordHash = await bcrypt.hash(SUPER_ADMIN_PASSWORD, 10)
  
  const admin = await SuperAdminUser.create({
    username: SUPER_ADMIN_USERNAME.toLowerCase().trim(),
    passwordHash,
    fullName: SUPER_ADMIN_FULLNAME,
    email: SUPER_ADMIN_USERNAME,
    active: true,
  })

  console.log('\n✅ Super Admin created successfully!')
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('  Username:', SUPER_ADMIN_USERNAME)
  console.log('  Password:', SUPER_ADMIN_PASSWORD)
  console.log('  Full Name:', SUPER_ADMIN_FULLNAME)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('\n⚠️  IMPORTANT: Change the password after first login!')
  console.log('📝 You can now login at: /super-admin/login')
  console.log()
}

main()
  .catch(err => {
    console.error('❌ Seed failed:', err)
    process.exitCode = 1
  })
  .finally(async () => {
    try { 
      await mongoose.disconnect() 
      console.log('Database disconnected.')
    } catch {}
  })
