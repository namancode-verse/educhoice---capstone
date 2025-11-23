import mongoose from 'mongoose'

const certificationSchema = new mongoose.Schema({
  "roll no": { 
    type: String, 
    required: true, 
    unique: true,
    primary: true
  },
  studentName: String,
  certificate: {
    data: Buffer,
    contentType: String,
    fileName: String,
    uploadedAt: { type: Date, default: Date.now }
  }
}, { timestamps: true })

export default mongoose.model('Certification', certificationSchema)
