import express from 'express'
import { MongoClient } from 'mongodb'
import multer from 'multer'

const router = express.Router()
const mongoUrl = process.env.MONGO_URI || 'mongodb://localhost:27017'

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 1 * 1024 * 1024 } }) // limit 1MB

// GET /api/courses/nptel - list all nptel courses from campusElectives.nptel courses
router.get('/nptel', async (req, res) => {
  const client = new MongoClient(mongoUrl)
  try {
    await client.connect()
    const db = client.db('campusElectives')
    const coll = db.collection('nptel courses')
    const docs = await coll.find({}).toArray()
    res.json(docs)
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Server error' })
  } finally {
    await client.close()
  }
})

// POST /api/courses/enroll
// body: { studentEmail, electiveSlot: 'open1'|'open2'|'open3', course: { name, link, credits } }
router.post('/enroll', async (req, res) => {
  const { studentEmail, electiveSlot, course } = req.body
  if (!studentEmail || !electiveSlot || !course) return res.status(400).json({ message: 'Missing fields' })

  const client = new MongoClient(mongoUrl)
  try {
    await client.connect()
    const db = client.db('campusElectives')
    const users = db.collection('users')
    // For open1 (NPTEL), allow multiple enrollments up to 2 courses
    if (electiveSlot === 'open1') {
      const user = await users.findOne({ email: studentEmail })
      if (!user) return res.status(404).json({ message: 'Student not found' })
      const open = (user.open_electives && user.open_electives.open1) || []
      // normalize to array
      const arr = Array.isArray(open) ? open : [open]
      if (arr.length >= 2) return res.status(400).json({ message: 'You can only enroll in 2 courses for Open Elective 1 this semester' })
      // prevent duplicate course names
      if (arr.find(c => c.name === course.name)) return res.status(400).json({ message: 'Course already enrolled' })
      arr.push(course)
      const update = { $set: { 'open_electives.open1': arr } }
      const result = await users.updateOne({ email: studentEmail }, update)
      if (result.matchedCount === 0) return res.status(404).json({ message: 'Student not found' })
      return res.json({ success: true, enrolled: arr })
    }

    // other slots: store single object
    const updateKey = `open_electives.${electiveSlot}`
    const update = { $set: { [updateKey]: course } }
    const result = await users.updateOne({ email: studentEmail }, update)
    if (result.matchedCount === 0) return res.status(404).json({ message: 'Student not found' })
    res.json({ success: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Server error' })
  } finally {
    await client.close()
  }
})

// POST upload certificate for open_elective3 by roll number (multipart form-data, field 'file')
router.post('/upload-certificate-rollno', upload.single('file'), async (req, res) => {
  console.log('Certificate upload request received')
  console.log('Body:', req.body)
  console.log('File:', req.file ? `${req.file.originalname} (${req.file.size} bytes)` : 'No file')
  
  const { rollNo, studentName } = req.body
  if (!rollNo || !req.file) {
    console.log('Validation failed - rollNo:', rollNo, 'file:', !!req.file)
    return res.status(400).json({ message: 'Missing rollNo or file' })
  }
  
  // Check file size (should be max 1MB, multer already enforces but double check)
  if (req.file.size > 1 * 1024 * 1024) {
    return res.status(400).json({ message: 'Certificate file exceeds 1MB limit' })
  }

  const client = new MongoClient(mongoUrl)
  try {
    await client.connect()
    const db = client.db('campusElectives')
    const certsColl = db.collection('certifications')
    
    const certObj = {
      filename: req.file.originalname,
      contentType: req.file.mimetype,
      size: req.file.size,
      uploadedAt: new Date(),
      data: req.file.buffer
    }
    
    console.log('Inserting certificate into DB for roll no:', rollNo)
    // Upsert certificate document with roll no as primary key
    const result = await certsColl.updateOne(
      { "roll no": rollNo },
      { 
        $set: { 
          "roll no": rollNo,
          studentName: studentName || null,
          certificate: certObj,
          updatedAt: new Date()
        }
      },
      { upsert: true }
    )
    
    console.log('Certificate inserted successfully. Modified count:', result.modifiedCount, 'Upserted:', result.upsertedId)
    res.json({ 
      success: true, 
      message: 'Certificate uploaded successfully',
      fileName: req.file.originalname,
      fileSize: req.file.size
    })
  } catch (err) {
    console.error('Certificate upload error:', err)
    res.status(500).json({ message: 'Server error during upload: ' + err.message })
  } finally { 
    await client.close() 
  }
})

// GET certificate metadata by roll number
router.get('/certificate-metadata-rollno/:rollNo', async (req, res) => {
  const rollNo = req.params.rollNo
  const client = new MongoClient(mongoUrl)
  try {
    await client.connect()
    const db = client.db('campusElectives')
    const certsColl = db.collection('certifications')
    const doc = await certsColl.findOne(
      { "roll no": rollNo },
      { projection: { 'certificate.filename': 1, 'certificate.size': 1, 'certificate.uploadedAt': 1 } }
    )
    
    if (!doc || !doc.certificate) {
      return res.status(404).json({ message: 'Certificate not found' })
    }
    
    res.json({ 
      filename: doc.certificate.filename, 
      size: doc.certificate.size, 
      uploadedAt: doc.certificate.uploadedAt 
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Server error' })
  } finally { 
    await client.close() 
  }
})

// GET download certificate by roll number
router.get('/download-certificate-rollno/:rollNo', async (req, res) => {
  const rollNo = req.params.rollNo
  const client = new MongoClient(mongoUrl)
  try {
    await client.connect()
    const db = client.db('campusElectives')
    const certsColl = db.collection('certifications')
    const doc = await certsColl.findOne({ "roll no": rollNo })
    
    if (!doc || !doc.certificate) {
      return res.status(404).json({ message: 'Certificate not found' })
    }
    
    const cert = doc.certificate
    res.setHeader('Content-Type', cert.contentType || 'application/octet-stream')
    res.setHeader('Content-Disposition', `attachment; filename="${cert.filename || 'certificate'}"`)
    res.send(cert.data)
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Server error' })
  } finally { 
    await client.close() 
  }
})

// POST upload certificate for open_elective3 (multipart form-data, field 'file')
router.post('/upload-certificate', upload.single('file'), async (req, res) => {
  const { studentEmail } = req.body
  if (!studentEmail || !req.file) return res.status(400).json({ message: 'Missing fields' })
  const client = new MongoClient(mongoUrl)
  try {
    await client.connect()
    const db = client.db('campusElectives')
    const users = db.collection('users')
    const certObj = {
      filename: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      uploadedAt: new Date(),
      data: req.file.buffer
    }
    const update = { $set: { 'open_electives.open3': { certificate: certObj } } }
    const result = await users.updateOne({ email: studentEmail }, update)
    if (result.matchedCount === 0) return res.status(404).json({ message: 'Student not found' })

    // Also store in a separate collection for open elective 3 certificates
    try {
      const certsColl = db.collection('open3_certificates')
      // upsert document keyed by studentEmail so we have a central registry
      await certsColl.updateOne(
        { studentEmail },
        { $set: { studentName: req.body.studentName || null, certificate: certObj, updatedAt: new Date() } },
        { upsert: true }
      )
    } catch (err) {
      console.error('Failed to write to open3_certificates:', err)
    }

    res.json({ success: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Server error' })
  } finally { await client.close() }
})

// GET download certificate for a student
router.get('/download-certificate/:email', async (req, res) => {
  const email = req.params.email
  const client = new MongoClient(mongoUrl)
  try {
    await client.connect()
    const db = client.db('campusElectives')
    const users = db.collection('users')
    const u = await users.findOne({ email }, { projection: { 'open_electives.open3.certificate': 1 } })
    const cert = u && u.open_electives && u.open_electives.open3 && u.open_electives.open3.certificate
    if (!cert) return res.status(404).json({ message: 'Certificate not found' })
    res.setHeader('Content-Type', cert.mimeType || 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="${cert.filename || 'certificate.pdf'}"`)
    res.send(cert.data.buffer || cert.data)
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Server error' })
  } finally { await client.close() }
})

// GET metadata for certificate (presence check)
router.get('/certificate-metadata/:email', async (req, res) => {
  const email = req.params.email
  const client = new MongoClient(mongoUrl)
  try {
    await client.connect()
    const db = client.db('campusElectives')
    const users = db.collection('users')
    const u = await users.findOne({ email }, { projection: { 'open_electives.open3.certificate.filename': 1, 'open_electives.open3.certificate.size': 1, 'open_electives.open3.certificate.uploadedAt': 1 } })
    const cert = u && u.open_electives && u.open_electives.open3 && u.open_electives.open3.certificate
    if (!cert) return res.status(404).json({ message: 'Certificate not found' })
    res.json({ filename: cert.filename, size: cert.size, uploadedAt: cert.uploadedAt })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Server error' })
  } finally { await client.close() }
})

export default router


