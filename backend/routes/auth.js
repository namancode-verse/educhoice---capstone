import express from 'express'
import User from '../models/User.js'
import { MongoClient } from 'mongodb'

const mongoUrl = process.env.MONGO_URI || 'mongodb://localhost:27017'

const router = express.Router()

// DEBUG: lookup user by email (returns the raw stored document). Useful to confirm stored password/email.
// Remove or disable this endpoint in production.
router.get('/lookup', async (req, res) => {
  try {
    const { email } = req.query
    if (!email) return res.status(400).json({ message: 'Missing email query param' })
    const user = await User.findOne({ email }).lean()
    if (!user) return res.status(404).json({ message: 'User not found' })
    res.json(user)
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Server error' })
  }
})

// Register - optional if user wants to seed manually
router.post('/register', async (req, res) => {
  try {
    const { "roll no": rollNo, name, email, password } = req.body
    if (!email || !password || !name || !rollNo) return res.status(400).json({ message: 'Missing fields' })

    const existing = await User.findOne({ email })
    if (existing) return res.status(400).json({ message: 'Email already registered' })

    // Store password as provided (plain-text) per user request
    const user = new User({ ...req.body })
    await user.save()
    const userObj = user.toObject()
    delete userObj.password
    res.status(201).json(userObj)
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Server error' })
  }
})

// Login
router.post('/login', async (req, res) => {
  try {
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
        // remove password before returning the teacher document
        const { password: _, ...teacherSafe } = t
        // normalize _id to id string for frontend convenience
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
    res.json(user)
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Server error' })
  }
})

// Update teacher password
router.put('/update-teacher-password', async (req, res) => {
  try {
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

      res.json({ success: true, message: 'Password updated successfully' })
    } finally {
      await client.close()
    }
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Server error' })
  }
})

export default router
