import mongoose from 'mongoose'

const courseSchema = new mongoose.Schema({
  "course code": String,
  name: String,
  credits: Number
}, { _id: false })

const mandatorySchema = new mongoose.Schema({
  cor1: { type: courseSchema, default: {} },
  cor2: { type: courseSchema, default: {} },
  cor3: { type: courseSchema, default: {} },
  cor4: { type: courseSchema, default: {} },
  cor5: { type: courseSchema, default: {} }
}, { _id: false })

const userSchema = new mongoose.Schema({
  "roll no": { type: String, required: true, unique: true },
  name: { type: String, required: true },
  password: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  "current sem no": Number,
  "current gpa": Number,
  "credits earned": Number,
  "total credits In this sem": Number,
  "mandatory courses": { type: mandatorySchema, default: {} },
  // (tasks field removed per request)
})

export default mongoose.model('User', userSchema)
