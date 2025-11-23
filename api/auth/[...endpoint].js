import { MongoClient } from 'mongodb'
import mongoose from 'mongoose'

const mongoUrl = process.env.MONGO_URI || 'mongodb://localhost:27017/campusElectives'

// User Schema for Mongoose
const userSchema = new mongoose.Schema({
  'roll no': String,
  name: String,
  email: String,
  password: String,
  domain: String,
  year: String,
  sem: String,
  guide: String,
  specialization: String
})

let User
try {
  User = mongoose.model('User')
} catch {
  User = mongoose.model('User', userSchema)
}

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true)
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT')
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version')

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  // Connect to MongoDB
  if (!mongoose.connections[0].readyState) {
    await mongoose.connect(mongoUrl)
  }

  const { endpoint } = req.query

  try {
    if (endpoint[0] === 'lookup' && req.method === 'GET') {
      const { email } = req.query
      if (!email) return res.status(400).json({ message: 'Missing email query param' })
      const user = await User.findOne({ email }).lean()
      if (!user) return res.status(404).json({ message: 'User not found' })
      return res.json(user)
    }

    if (endpoint[0] === 'register' && req.method === 'POST') {
      const { "roll no": rollNo, name, email, password } = req.body
      if (!email || !password || !name || !rollNo) return res.status(400).json({ message: 'Missing fields' })

      const existing = await User.findOne({ email })
      if (existing) return res.status(400).json({ message: 'Email already registered' })

      const user = new User({ ...req.body })
      await user.save()
      const userObj = user.toObject()
      delete userObj.password
      return res.status(201).json(userObj)
    }

    if (endpoint[0] === 'login' && req.method === 'POST') {
      const { email, password, role } = req.body
      if (!email || !password) return res.status(400).json({ message: 'Missing fields' })

      if (role === 'teacher') {
        // check mongosb.teachers
        const client = new MongoClient(mongoUrl)
        try {
          await client.connect()
          const db = client.db('mongosb')
          const t = await db.collection('teachers').findOne({ email, password })
          if (!t) return res.status(400).json({ message: 'Invalid credentials' })
          
          const { password: _, ...teacherSafe } = t
          if (teacherSafe._id) teacherSafe.id = teacherSafe._id.toString()
          return res.json(teacherSafe)
        } finally {
          await client.close()
        }
      }

      // default: student
      const user = await User.findOne({ email, password }).lean()
      if (!user) return res.status(400).json({ message: 'Invalid credentials' })

      delete user.password
      return res.json(user)
    }

    if (endpoint[0] === 'update-teacher-password' && req.method === 'PUT') {
      const { email, currentPassword, newPassword } = req.body
      if (!email || !currentPassword || !newPassword) {
        return res.status(400).json({ message: 'Missing fields' })
      }

      const client = new MongoClient(mongoUrl)
      try {
        await client.connect()
        const db = client.db('mongosb')
        
        // Verify current password
        const teacher = await db.collection('teachers').findOne({ email, password: currentPassword })
        if (!teacher) {
          return res.status(400).json({ message: 'Invalid current password' })
        }

        // Update password
        const result = await db.collection('teachers').updateOne(
          { email },
          { $set: { password: newPassword } }
        )

        if (result.matchedCount === 0) {
          return res.status(404).json({ message: 'Teacher not found' })
        }

        return res.json({ success: true, message: 'Password updated successfully' })
      } finally {
        await client.close()
      }
    }

    return res.status(404).json({ message: 'Endpoint not found' })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ message: 'Server error' })
  }
}