import { MongoClient } from 'mongodb'
import dotenv from 'dotenv'
dotenv.config()

const mongoUrl = process.env.MONGO_URI || 'mongodb://localhost:27017'

async function run() {
  const client = new MongoClient(mongoUrl)
  try {
    await client.connect()
    const adminDb = client.db().admin()
    const info = await adminDb.listDatabases()
    console.log('Databases:')
    for (const db of info.databases) {
      console.log('-', db.name)
      const collections = await client.db(db.name).listCollections().toArray()
      const names = collections.map(c => c.name)
      console.log('  collections:', names.join(', '))
    }
  } catch (err) {
    console.error(err)
  } finally {
    await client.close()
  }
}

run()
