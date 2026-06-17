import bcrypt from 'bcryptjs'
import { connectDB } from '../config/db'
import { DialysisUser } from '../modules/dialysis/models/User'

async function resetDialysisAdmin() {
  await connectDB()
  
  const username = 'admin'
  const password = '123'
  const passwordHash = await bcrypt.hash(password, 10)
  
  const user = await DialysisUser.findOne({ username })
  
  if (user) {
    await DialysisUser.findByIdAndUpdate(user._id, {
      $set: {
        passwordHash,
        active: true,
        role: 'admin'
      }
    })
    console.log('✓ Dialysis admin password reset successfully')
    console.log(`  Username: ${username}`)
    console.log(`  Password: ${password}`)
  } else {
    await DialysisUser.create({
      username,
      role: 'admin',
      active: true,
      passwordHash
    })
    console.log('✓ Dialysis admin user created successfully')
    console.log(`  Username: ${username}`)
    console.log(`  Password: ${password}`)
  }
  
  process.exit(0)
}

resetDialysisAdmin().catch(err => {
  console.error('Failed to reset dialysis admin:', err)
  process.exit(1)
})
