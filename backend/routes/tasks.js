import express from 'express'
import { MongoClient, ObjectId } from 'mongodb'
import User from '../models/User.js'

const router = express.Router()
const mongoUrl = process.env.MONGO_URI || 'mongodb://localhost:27017'

// Helper to get the campusElectives users collection
async function getUsersCollection() {
  const client = new MongoClient(mongoUrl)
  await client.connect()
  const db = client.db('campusElectives')
  return { client, collection: db.collection('users') }
}

// Get tasks for the logged in student (query param email)
router.get('/', async (req, res) => {
  try {
    const email = req.query.email
    if (!email) return res.status(400).json({ message: 'Missing email query param' })
    const { client, collection } = await getUsersCollection()
    try {
      const user = await collection.findOne({ email }, { projection: { tasks: 1 } })
      if (!user) return res.status(404).json({ message: 'User not found' })
      res.json({ tasks: user.tasks || [] })
    } finally { await client.close() }
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Server error' })
  }
})

// Create a new task for student
router.post('/', async (req, res) => {
  try {
    const { email, title, description, dueDate, priority } = req.body
    if (!email || !title) return res.status(400).json({ message: 'Missing fields' })
    const task = { _id: new ObjectId(), title, description: description || '', dueDate: dueDate || null, priority: priority || 'low', completed: false, createdAt: new Date() }
    const { client, collection } = await getUsersCollection()
    try {
      const result = await collection.updateOne({ email }, { $push: { tasks: task } })
      if (result.matchedCount === 0) return res.status(404).json({ message: 'User not found' })
      res.status(201).json({ task })
    } finally { await client.close() }
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Server error' })
  }
})

// Update a task by id
router.put('/:id', async (req, res) => {
  try {
    const id = req.params.id
    const { email, title, description, dueDate, priority, completed } = req.body
    if (!email) return res.status(400).json({ message: 'Missing email' })
    const updateFields = {}
    if (typeof title !== 'undefined') updateFields['tasks.$.title'] = title
    if (typeof description !== 'undefined') updateFields['tasks.$.description'] = description
    if (typeof dueDate !== 'undefined') updateFields['tasks.$.dueDate'] = dueDate
    if (typeof priority !== 'undefined') updateFields['tasks.$.priority'] = priority
    if (typeof completed !== 'undefined') updateFields['tasks.$.completed'] = completed

    const { client, collection } = await getUsersCollection()
    try {
      const result = await collection.updateOne({ email, 'tasks._id': new ObjectId(id) }, { $set: updateFields })
      if (result.matchedCount === 0) return res.status(404).json({ message: 'User or task not found' })
      res.json({ success: true })
    } finally { await client.close() }
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Server error' })
  }
})

// Delete a task
router.delete('/:id', async (req, res) => {
  try {
    const id = req.params.id
    const { email } = req.query
    if (!email) return res.status(400).json({ message: 'Missing email query param' })
    const { client, collection } = await getUsersCollection()
    try {
      const result = await collection.updateOne({ email }, { $pull: { tasks: { _id: new ObjectId(id) } } })
      if (result.matchedCount === 0) return res.status(404).json({ message: 'User not found' })
      res.json({ success: true })
    } finally { await client.close() }
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Server error' })
  }
})

export default router
