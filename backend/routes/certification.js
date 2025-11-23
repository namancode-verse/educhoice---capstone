import express from 'express'
import { MongoClient } from 'mongodb'
import multer from 'multer'

const router = express.Router()
const mongoUrl = process.env.MONGO_URI || 'mongodb://localhost:27017'

// Shared MongoDB client (connection pooling)
let mongoClient = null

async function getDatabase() {
  if (!mongoClient) {
    mongoClient = new MongoClient(mongoUrl, { maxPoolSize: 10, minPoolSize: 2 })
    await mongoClient.connect()
    console.log('✓ MongoDB connection pool initialized')
  }
  return mongoClient.db('campusElectives')
}

// Initialize indexes on startup
async function ensureIndexes() {
  try {
    const db = await getDatabase()
    const certsColl = db.collection('certifications')
    
    // Create unique index on roll no (primary key)
    await certsColl.createIndex({ 'roll no': 1 }, { unique: true })
    console.log('✓ Unique index created on "roll no" field')
  } catch (err) {
    console.error('Index creation error (may already exist):', err.message)
  }
}

// Initialize indexes when router is loaded
ensureIndexes()

// TEST ENDPOINT - to verify this route file is loaded
router.get('/test', (req, res) => {
  res.json({ success: true, message: 'Certification routes are loaded and working!' })
})

// GET /api/certification/verify-pdf/:rollNo - Test PDF headers without downloading
router.get('/verify-pdf/:rollNo', async (req, res) => {
  try {
    const rollNo = req.params.rollNo
    console.log('=== Verify PDF for Roll No:', rollNo, '===')
    
    const db = await getDatabase()
    const certsColl = db.collection('certifications')
    const doc = await certsColl.findOne({ 'roll no': rollNo })
    
    if (!doc || !doc.certificate) {
      return res.json({ success: false, message: 'Certificate not found' })
    }
    
    const cert = doc.certificate
    return res.json({
      success: true,
      fileInfo: {
        filename: cert.filename,
        contentType: cert.contentType,
        size: cert.size,
        dataType: typeof cert.data,
        dataLength: cert.data ? cert.data.length : 0,
        isPdfFormat: cert.contentType === 'application/pdf' && cert.filename.toLowerCase().endsWith('.pdf')
      }
    })
  } catch (err) {
    console.error('Verify PDF error:', err)
    return res.status(500).json({ success: false, message: 'Server error', error: err.message })
  }
})

// Configure multer for file upload - memory storage, max 1MB
const upload = multer({ 
  storage: multer.memoryStorage(), 
  limits: { fileSize: 1 * 1024 * 1024 } // 1MB limit
})

// POST /api/certification/upload - Upload certificate by roll number (primary key)
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    console.log('=== Certificate Upload Request ===')
    console.log('Body:', req.body)
    console.log('File:', req.file ? { name: req.file.originalname, size: req.file.size, type: req.file.mimetype } : 'No file')
    
    const { rollNo, studentName } = req.body
    
    // Validation
    if (!rollNo) {
      console.log('Error: Missing rollNo')
      return res.status(400).json({ success: false, message: 'Roll number is required' })
    }
    
    if (!req.file) {
      console.log('Error: No file uploaded')
      return res.status(400).json({ success: false, message: 'No file uploaded' })
    }
    
    // Check file type - strictly enforce PDF
    if (req.file.mimetype !== 'application/pdf') {
      console.log('Error: Invalid file type:', req.file.mimetype)
      return res.status(400).json({ success: false, message: 'Only PDF files are allowed. Please convert your file to PDF format.' })
    }
    
    // Double-check file extension
    const filename = req.file.originalname.toLowerCase()
    if (!filename.endsWith('.pdf')) {
      console.log('Error: File does not have .pdf extension:', req.file.originalname)
      return res.status(400).json({ success: false, message: 'File must have .pdf extension' })
    }
    
    // Check file size
    if (req.file.size > 1 * 1024 * 1024) {
      console.log('Error: File too large:', req.file.size)
      return res.status(400).json({ success: false, message: 'File exceeds 1MB limit' })
    }
    
    // Get database instance (reuses connection pool)
    const db = await getDatabase()
    const certsColl = db.collection('certifications')
    
    console.log('Database connection obtained. Inserting to certifications collection.')
    
    // Create certificate object with strict PDF format
    const certObj = {
      filename: req.file.originalname,
      contentType: 'application/pdf',  // Force PDF content type
      size: req.file.size,
      uploadedAt: new Date(),
      data: req.file.buffer  // Store as Buffer for proper binary handling
    }
    
    // Upsert (insert or update) the certificate with roll number as PRIMARY KEY
    // Roll no is unique and serves as the identifier for the student's certificate
    console.log('Upserting certificate for roll no (primary key):', rollNo)
    
    // Check if certificate already exists for this roll number
    const existingCert = await certsColl.findOne({ 'roll no': rollNo })
    const isUpdate = !!existingCert
    
    const result = await certsColl.updateOne(
      { 'roll no': rollNo },  // Roll number is the primary key filter
      { 
        $set: { 
          'roll no': rollNo,   // Primary key field
          studentName: studentName || null,
          certificate: certObj,  // Certificate data stored under this roll no
          updatedAt: new Date(),
          lastCertificateUpdated: new Date() // Track when certificate was last updated
        }
      },
      { upsert: true }  // Insert if doesn't exist, update if it does
    )
    
    console.log(isUpdate ? '✓ Certificate UPDATED' : '✓ Certificate CREATED', 
                'for Roll No:', rollNo, 
                'Result:', { matchedCount: result.matchedCount, modifiedCount: result.modifiedCount, upsertedId: result.upsertedId })
    
    // Return success response with update info
    return res.json({ 
      success: true, 
      message: isUpdate ? 'Certificate updated successfully' : 'Certificate uploaded successfully',
      data: {
        rollNo: rollNo,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        uploadedAt: certObj.uploadedAt,
        lastCertificateUpdated: new Date(),
        isUpdate: isUpdate
      }
    })
  } catch (err) {
    console.error('❌ Certificate upload error:', err)
    return res.status(500).json({ 
      success: false, 
      message: 'Server error during upload',
      error: err.message 
    })
  }
})

// GET /api/certification/metadata/:rollNo - Get certificate metadata by roll number (primary key)
router.get('/metadata/:rollNo', async (req, res) => {
  try {
    console.log('=== Get Certificate Metadata ===')
    const rollNo = req.params.rollNo
    console.log('Fetching metadata for roll no (primary key):', rollNo)
    
    const db = await getDatabase()
    const certsColl = db.collection('certifications')
    
    // Query by roll no as primary key
    const doc = await certsColl.findOne(
      { 'roll no': rollNo },
      { projection: { 
          'certificate.filename': 1, 
          'certificate.size': 1, 
          'certificate.uploadedAt': 1,
          'lastCertificateUpdated': 1,
          'updatedAt': 1
        } 
      }
    )
    
    if (!doc || !doc.certificate) {
      console.log('Certificate not found for roll no:', rollNo)
      return res.status(404).json({ success: false, message: 'Certificate not found' })
    }
    
    console.log('✓ Certificate found for roll no:', rollNo, 'File:', doc.certificate.filename)
    return res.json({ 
      success: true,
      data: { 
        rollNo: rollNo,
        filename: doc.certificate.filename, 
        size: doc.certificate.size, 
        uploadedAt: doc.certificate.uploadedAt,
        lastCertificateUpdated: doc.lastCertificateUpdated || doc.updatedAt || doc.certificate.uploadedAt,
        lastModified: doc.updatedAt
      }
    })
  } catch (err) {
    console.error('❌ Get metadata error:', err)
    return res.status(500).json({ success: false, message: 'Server error', error: err.message })
  }
})

// GET /api/certification/download/:rollNo - Download certificate by roll number (primary key)
router.get('/download/:rollNo', async (req, res) => {
  try {
    console.log('=== Download Certificate ===')
    const rollNo = req.params.rollNo
    console.log('Downloading certificate for roll no (primary key):', rollNo)
    
    const db = await getDatabase()
    const certsColl = db.collection('certifications')
    
    // Query by roll no as primary key
    const doc = await certsColl.findOne({ 'roll no': rollNo })
    
    if (!doc || !doc.certificate) {
      console.log('Certificate not found for download. Roll no:', rollNo)
      return res.status(404).json({ success: false, message: 'Certificate not found' })
    }
    
    const cert = doc.certificate
    console.log('✓ Downloading certificate for roll no:', rollNo, 'File:', cert.filename)
    
    // Ensure proper PDF headers and filename
    const filename = cert.filename || 'certificate.pdf'
    const cleanFilename = filename.endsWith('.pdf') ? filename : filename + '.pdf'
    
    // Set proper headers for PDF download
    const buffer = Buffer.from(cert.data)
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="${cleanFilename}"`)
    res.setHeader('Content-Length', buffer.length.toString())
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
    res.setHeader('Pragma', 'no-cache')
    res.setHeader('Expires', '0')
    
    // Send the binary data as PDF
    res.send(buffer)
  } catch (err) {
    console.error('❌ Download error:', err)
    return res.status(500).json({ success: false, message: 'Server error', error: err.message })
  }
})

export default router
