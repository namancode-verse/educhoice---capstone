import express from 'express'
import cors from 'cors'
import mongoose from 'mongoose'
import dotenv from 'dotenv'

import authRouter from './routes/auth.js'
import coursesRouter from './routes/courses.js'
import projectsRouter from './routes/projects.js'
import chatRouter from './routes/chat.js'
import certificationRouter from './routes/certification.js'

dotenv.config()

const app = express()
app.use(cors())
app.use(express.json())

// Log all incoming requests
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`)
  next()
})

// Default DB updated to campusElectives because user data is stored there per workspace DBs
const mongoUrl = process.env.MONGO_URI || 'mongodb://localhost:27017/campusElectives'

mongoose.connect(mongoUrl)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err))

app.use('/api/auth', authRouter)
app.use('/api/projects', projectsRouter)
app.use('/api/courses', coursesRouter)
app.use('/api/chat', chatRouter)
app.use('/api/certification', certificationRouter)

export default app
