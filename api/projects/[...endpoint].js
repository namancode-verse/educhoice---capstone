import { MongoClient } from 'mongodb'
import mongoose from 'mongoose'

const mongoUrl = process.env.MONGO_URI || 'mongodb://localhost:27017'

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

  const { endpoint } = req.query

  try {
    const client = new MongoClient(mongoUrl)
    await client.connect()

    if (endpoint[0] === 'domains' && req.method === 'GET') {
      const db = client.db('campusElectives')
      const domains = await db.collection('domains').find({}).toArray()
      await client.close()
      return res.json(domains)
    }

    if (endpoint[0] === 'teachers' && endpoint[1] === 'by-domain' && req.method === 'GET') {
      const { domain } = req.query
      const db = client.db('mongosb')
      const coll = db.collection('teachers')
      const teachers = domain
        ? await coll.find({ specializations: { $regex: domain, $options: 'i' } }).toArray()
        : await coll.find({}).toArray()
      await client.close()
      return res.json(teachers)
    }

    if (endpoint[0] === 'teachers' && endpoint[1] && req.method === 'GET') {
      const email = decodeURIComponent(endpoint[1])
      const db = client.db('mongosb')
      const t = await db.collection('teachers').findOne({ email }, { projection: { password: 0 } })
      await client.close()
      
      if (!t) return res.status(404).json({ message: 'Teacher not found' })
      return res.json(t)
    }

    if (endpoint[0] === 'request-guide' && req.method === 'POST') {
      const { studentEmail, teacherEmail, domain } = req.body
      if (!studentEmail || !teacherEmail || !domain) {
        await client.close()
        return res.status(400).json({ message: 'Missing fields' })
      }

      const reqObj = { studentEmail, domain, requestedAt: new Date() }
      const db = client.db('mongosb')
      const coll = db.collection('teachers')
      
      const result = await coll.updateOne({ email: teacherEmail }, { $push: { pendingRequests: reqObj } })
      await client.close()
      
      if (result.matchedCount === 0) return res.status(404).json({ message: 'Teacher not found' })
      return res.json({ success: true, message: 'Request sent to teacher' })
    }

    if (endpoint[0] === 'respond-request' && req.method === 'POST') {
      const { teacherEmail, studentEmail, accept } = req.body
      if (!teacherEmail || !studentEmail || typeof accept === 'undefined') {
        await client.close()
        return res.status(400).json({ message: 'Missing fields' })
      }

      const dbM = client.db('mongosb')
      const teachers = dbM.collection('teachers')
      const teacher = await teachers.findOne({ email: teacherEmail })
      
      if (!teacher) {
        await client.close()
        return res.status(404).json({ message: 'Teacher not found' })
      }

      // Remove from pending requests
      await teachers.updateOne(
        { email: teacherEmail },
        { $pull: { pendingRequests: { studentEmail } } }
      )

      if (accept) {
        // Add to teacher's students
        await teachers.updateOne(
          { email: teacherEmail },
          { $addToSet: { students: { studentEmail, assignedAt: new Date() } } }
        )

        // Update student's guide
        const dbC = client.db('campusElectives')
        await dbC.collection('users').updateOne(
          { email: studentEmail },
          { $set: { guide: teacherEmail, guideAssignedAt: new Date() } }
        )
      }

      await client.close()
      return res.json({ success: true, message: accept ? 'Student assigned as guide' : 'Request rejected' })
    }

    if (endpoint[0] === 'unassign-student' && req.method === 'POST') {
      const { teacherEmail, studentEmail } = req.body
      if (!teacherEmail || !studentEmail) {
        await client.close()
        return res.status(400).json({ message: 'Missing fields' })
      }

      const dbM = client.db('mongosb')
      const dbC = client.db('campusElectives')

      // Remove from teacher's students
      await dbM.collection('teachers').updateOne(
        { email: teacherEmail },
        { $pull: { students: { studentEmail } } }
      )

      // Remove guide from student
      await dbC.collection('users').updateOne(
        { email: studentEmail },
        { $unset: { guide: '', guideAssignedAt: '' } }
      )

      await client.close()
      return res.json({ success: true, message: 'Student unassigned' })
    }

    await client.close()
    return res.status(404).json({ message: 'Endpoint not found' })
  } catch (err) {
    console.error('Projects API error:', err)
    return res.status(500).json({ message: 'Server error' })
  }
}