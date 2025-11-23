import request from 'supertest'
import { MongoClient } from 'mongodb'
import app from '../app.js'

describe('Open Elective 3 upload/download', () => {

  jest.setTimeout(20000)

  const studentEmail = 'test.student@example.com'
  const mongoUrl = process.env.MONGO_URI || 'mongodb://localhost:27017'

  // tiny one-page PDF buffer constructed in test
  const tinyPdf = Buffer.from('%PDF-1.4\n%âãÏÓ\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R>>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1>>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 100] /Contents 4 0 R /Resources << /ProcSet [/PDF /Text] >> >>\nendobj\n4 0 obj\n<< /Length 44 >>\nstream\nBT /F1 12 Tf 50 50 Td (test) Tj ET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000010 00000 n \n0000000061 00000 n \n0000000116 00000 n \n0000000200 00000 n \ntrailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n290\n%%EOF', 'binary')

  let client

    beforeAll(async () => {
      client = new MongoClient(mongoUrl)
      await client.connect()
      const db = client.db('campusElectives')
      const users = db.collection('users')
      // ensure test user exists (upsert)
      await users.updateOne({ email: studentEmail }, { $set: { email: studentEmail, name: 'Test Student' } }, { upsert: true })
    })

    afterAll(async () => {
      try {
        const db = client.db('campusElectives')
        const users = db.collection('users')
        // cleanup test user
        await users.deleteOne({ email: studentEmail })
      } finally {
        await client.close()
      }
    })

  it('uploads and downloads certificate', async () => {
    // upload the file
    const uploadRes = await request(app)
      .post('/api/courses/upload-certificate')
      .field('studentEmail', studentEmail)
      .attach('file', tinyPdf, 'cert.pdf')

    expect([200, 201]).toContain(uploadRes.status)

    // metadata should exist
    const metaRes = await request(app).get(`/api/courses/certificate-metadata/${encodeURIComponent(studentEmail)}`)
    expect(metaRes.status).toBe(200)
    expect(metaRes.body).toHaveProperty('filename')

    // download
    const dlRes = await request(app).get(`/api/courses/download-certificate/${encodeURIComponent(studentEmail)}`)
    expect(dlRes.status).toBe(200)
    expect(dlRes.headers['content-type']).toMatch(/pdf/)
    expect(dlRes.body && dlRes.body.length).toBeGreaterThan(0)
  })
})
