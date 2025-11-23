import express from 'express'
import { MongoClient } from 'mongodb'

const router = express.Router()
const mongoUrl = process.env.MONGO_URI || 'mongodb://localhost:27017'

// GET domains for projects from campusElectives collection
router.get('/domains', async (req, res) => {
  const client = new MongoClient(mongoUrl)
  try {
    await client.connect()
    const db = client.db('campusElectives')
    // collection name has spaces in your workspace: 'domains options for project'
    const coll = db.collection('domains options for project')
    const docs = await coll.find({}).toArray()
    res.json(docs)
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Server error' })
  } finally { await client.close() }
})

// GET teachers by specialization domain (from mongosb.teachers)
router.get('/teachers/by-domain', async (req, res) => {
  const domain = req.query.domain
  if (!domain) return res.status(400).json({ message: 'Missing domain' })
  const client = new MongoClient(mongoUrl)
  try {
    await client.connect()
    const db = client.db('mongosb')
    const coll = db.collection('teachers')
    const docs = await coll.find({ course_specialization_sector: domain }).project({ password:0 }).toArray()
    res.json(docs)
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Server error' })
  } finally { await client.close() }
})

// GET teacher by email
router.get('/teachers/:email', async (req, res) => {
  const email = req.params.email
  const client = new MongoClient(mongoUrl)
  try {
    await client.connect()
    const db = client.db('mongosb')
    const t = await db.collection('teachers').findOne({ email }, { projection: { password: 0 } })
    if (!t) return res.status(404).json({ message: 'Teacher not found' })
    res.json(t)
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Server error' })
  } finally { await client.close() }
})

// POST request to teacher to become guide
// store only studentEmail (do not store studentName)
router.post('/request-guide', async (req, res) => {
  const { studentEmail, teacherEmail, domain } = req.body
  if (!studentEmail || !teacherEmail || !domain) return res.status(400).json({ message: 'Missing fields' })
  const client = new MongoClient(mongoUrl)
  try {
    await client.connect()
    const db = client.db('mongosb')
    const coll = db.collection('teachers')
    const reqObj = { studentEmail, domain, status: 'pending', requestedAt: new Date() }
    const result = await coll.updateOne({ email: teacherEmail }, { $push: { pendingRequests: reqObj } })
    if (result.matchedCount === 0) return res.status(404).json({ message: 'Teacher not found' })
    res.json({ success: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Server error' })
  } finally { await client.close() }
})

// POST respond to request (accept or reject)
router.post('/respond-request', async (req, res) => {
  const { teacherEmail, studentEmail, accept } = req.body
  if (!teacherEmail || !studentEmail || typeof accept === 'undefined') return res.status(400).json({ message: 'Missing fields' })
  const client = new MongoClient(mongoUrl)
  try {
    await client.connect()
    const dbM = client.db('mongosb')
    const teachers = dbM.collection('teachers')
    const teacher = await teachers.findOne({ email: teacherEmail })
    if (!teacher) return res.status(404).json({ message: 'Teacher not found' })

    // remove from pendingRequests
    await teachers.updateOne({ email: teacherEmail }, { $pull: { pendingRequests: { studentEmail } } })

    if (accept) {
  // try to find the pending request object so we can copy domain
  const pending = (teacher.pendingRequests || []).find(r => r.studentEmail === studentEmail) || {}
  const domain = pending.domain || null

  // add to teacher.students array as an object { studentEmail, domain } (no studentName)
  const studentObj = { studentEmail, domain }
  await teachers.updateOne({ email: teacherEmail }, { $addToSet: { students: studentObj } })

      // also update student record to set open_electives.open2 with guide, status and domain
      const dbC = client.db('campusElectives')
      const users = dbC.collection('users')
      await users.updateOne({ email: studentEmail }, { $set: { 'open_electives.open2': { guide: teacherEmail, status: 'accepted', domain } } })
      return res.json({ success: true })
    }

    return res.json({ success: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Server error' })
  } finally { await client.close() }
})

// POST unassign a student from a teacher
router.post('/unassign-student', async (req, res) => {
  const { teacherEmail, studentEmail } = req.body
  if (!teacherEmail || !studentEmail) return res.status(400).json({ message: 'Missing fields' })
  const client = new MongoClient(mongoUrl)
  try {
    await client.connect()
    const dbM = client.db('mongosb')
    const teachers = dbM.collection('teachers')
    // remove student object from teacher.students
    await teachers.updateOne({ email: teacherEmail }, { $pull: { students: { studentEmail } } })

    // update student record to remove open2 assignment
    const dbC = client.db('campusElectives')
    const users = dbC.collection('users')
    await users.updateOne({ email: studentEmail }, { $unset: { 'open_electives.open2': '' } })

    res.json({ success: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Server error' })
  } finally { await client.close() }
})

// GET marks for a teacher
router.get('/marks/:teacherEmail', async (req, res) => {
  const teacherEmail = req.params.teacherEmail
  if (!teacherEmail) return res.status(400).json({ message: 'Missing teacherEmail' })
  const client = new MongoClient(mongoUrl)
  try {
    await client.connect()
    const db = client.db('mongosb')
    const coll = db.collection('marks')
    const docs = await coll.find({ teacherEmail }).toArray()
    res.json(docs)
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Server error' })
  } finally { await client.close() }
})

// POST save marks for multiple students (upsert)
router.post('/marks/save', async (req, res) => {
  const { teacherEmail, marks } = req.body
  if (!teacherEmail || !Array.isArray(marks)) return res.status(400).json({ message: 'Missing fields' })
  const client = new MongoClient(mongoUrl)
  try {
    await client.connect()
    const db = client.db('mongosb')
    const coll = db.collection('marks')
    const bulk = coll.initializeUnorderedBulkOp()
    marks.forEach(m => {
      const studentEmail = m.studentEmail
      const phases = m.phases || {}
      bulk.find({ teacherEmail, studentEmail }).upsert().updateOne({ $set: { teacherEmail, studentEmail, phases, updatedAt: new Date() } })
    })
    if (marks.length > 0) await bulk.execute()
    res.json({ success: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Server error' })
  } finally { await client.close() }
})

export default router
