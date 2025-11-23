import { MongoClient } from 'mongodb'
import formidable from 'formidable'

const mongoUrl = process.env.MONGO_URI || 'mongodb://localhost:27017'

export const config = {
  api: {
    bodyParser: false,
  },
}

let mongoPool
async function getMongoClient() {
  if (!mongoPool) {
    mongoPool = new MongoClient(mongoUrl)
    await mongoPool.connect()
  }
  return mongoPool
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

  const { endpoint } = req.query

  try {
    const client = await getMongoClient()
    const db = client.db('campusElectives')
    const collection = db.collection('certifications')

    // Create unique index on roll no
    try {
      await collection.createIndex({ 'roll no': 1 }, { unique: true })
    } catch (indexErr) {
      // Index might already exist
    }

    if (endpoint[0] === 'test' && req.method === 'GET') {
      return res.json({ message: 'Certification API is working!' })
    }

    if (endpoint[0] === 'upload' && req.method === 'POST') {
      const form = formidable({
        maxFileSize: 1 * 1024 * 1024, // 1MB
        allowEmptyFiles: false,
        filter: ({ mimetype }) => mimetype === 'application/pdf'
      })

      const [fields, files] = await form.parse(req)
      
      const rollNo = Array.isArray(fields.rollNo) ? fields.rollNo[0] : fields.rollNo
      const file = Array.isArray(files.certificate) ? files.certificate[0] : files.certificate

      if (!rollNo || !file) {
        return res.status(400).json({ success: false, message: 'Missing roll number or file' })
      }

      // Read file data
      const fs = await import('fs')
      const fileData = await fs.promises.readFile(file.filepath)

      const certDoc = {
        'roll no': rollNo,
        filename: file.originalFilename || 'certificate.pdf',
        size: file.size,
        data: fileData,
        uploadedAt: new Date(),
        lastCertificateUpdated: new Date()
      }

      // Upsert (update if exists, insert if not)
      const result = await collection.replaceOne(
        { 'roll no': rollNo },
        certDoc,
        { upsert: true }
      )

      return res.json({ 
        success: true, 
        message: result.upsertedCount > 0 ? 'Certificate uploaded successfully!' : 'Certificate updated successfully!',
        rollNo 
      })
    }

    if (endpoint[0] === 'metadata' && req.method === 'GET') {
      const rollNo = endpoint[1]
      if (!rollNo) {
        return res.status(400).json({ success: false, message: 'Roll number required' })
      }

      const cert = await collection.findOne({ 'roll no': rollNo }, { 
        projection: { data: 0 } // Exclude binary data
      })

      if (!cert) {
        return res.json({ success: false, message: 'No certificate found' })
      }

      return res.json({ success: true, metadata: cert })
    }

    if (endpoint[0] === 'download' && req.method === 'GET') {
      const rollNo = endpoint[1]
      if (!rollNo) {
        return res.status(400).json({ success: false, message: 'Roll number required' })
      }

      const cert = await collection.findOne({ 'roll no': rollNo })
      if (!cert) {
        return res.status(404).json({ success: false, message: 'Certificate not found' })
      }

      const filename = cert.filename || 'certificate.pdf'
      const cleanFilename = filename.endsWith('.pdf') ? filename : filename + '.pdf'
      const buffer = Buffer.from(cert.data)

      res.setHeader('Content-Type', 'application/pdf')
      res.setHeader('Content-Disposition', `attachment; filename="${cleanFilename}"`)
      res.setHeader('Content-Length', buffer.length.toString())
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
      res.setHeader('Pragma', 'no-cache')
      res.setHeader('Expires', '0')

      return res.send(buffer)
    }

    return res.status(404).json({ success: false, message: 'Endpoint not found' })
  } catch (err) {
    console.error('Certification error:', err)
    return res.status(500).json({ success: false, message: 'Server error', error: err.message })
  }
}