import mongoose from 'mongoose'
import dotenv from 'dotenv'
import User from '../models/User.js'

dotenv.config()
const mongoUrl = process.env.MONGO_URI || 'mongodb://localhost:27017/capstone'

async function lookup(email) {
  try {
    await mongoose.connect(mongoUrl)
    const user = await User.findOne({ email }).lean()
    if (!user) {
      console.log('User not found for email:', email)
    } else {
      console.log('User record:')
      console.dir(user, { depth: null })
    }
    await mongoose.disconnect()
  } catch (err) {
    console.error('Error:', err)
    process.exit(1)
  }
}

const email = process.argv[2]
if (!email) {
  console.error('Usage: node scripts/lookupUser.js "user@example.com"')
  process.exit(1)
}

lookup(email)
