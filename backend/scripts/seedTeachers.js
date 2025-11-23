import { MongoClient } from 'mongodb'

const mongoUrl = 'mongodb://localhost:27017'
const dbName = 'mongosb'

async function seed() {
  const client = new MongoClient(mongoUrl)
  try {
    await client.connect()
    const db = client.db(dbName)
    const coll = db.collection('teachers')
    const teachers = [
      { email: 'teacher1@presidency.edu', password: 'teachpass1' },
      { email: 'teacher2@presidency.edu', password: 'teachpass2' },
      { email: 'teacher3@presidency.edu', password: 'teachpass3' },
      { email: 'teacher4@presidency.edu', password: 'teachpass4' },
      { email: 'teacher5@presidency.edu', password: 'teachpass5' }
    ]
    await coll.deleteMany({})
    const res = await coll.insertMany(teachers)
    console.log('Inserted', res.insertedCount, 'teachers into', dbName + '.teachers')
  } catch (err) {
    console.error(err)
  } finally {
    await client.close()
  }
}

seed()
