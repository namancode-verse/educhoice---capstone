import { MongoClient } from 'mongodb'
import dotenv from 'dotenv'
dotenv.config()

const mongoUrl = process.env.MONGO_URI || 'mongodb://localhost:27017'

async function search(email) {
  const client = new MongoClient(mongoUrl)
  try {
    await client.connect()
    const adminDb = client.db().admin()
    const info = await adminDb.listDatabases()
    for (const dbInfo of info.databases) {
      const db = client.db(dbInfo.name)
      const collections = await db.listCollections().toArray()
      for (const coll of collections) {
        try {
          const c = db.collection(coll.name)
          const doc = await c.findOne({ email: email })
          if (doc) {
            console.log('Found in DB:', dbInfo.name, 'collection:', coll.name)
            console.dir(doc, { depth: null })
          }
        } catch (e) {
          // ignore collection read errors
        }
      }
    }
  } catch (err) {
    console.error(err)
  } finally {
    await client.close()
  }
}

const email = process.argv[2]
if (!email) {
  console.error('Usage: node scripts/searchEmailAllDbs.js "user@example.com"')
  process.exit(1)
}

search(email)
