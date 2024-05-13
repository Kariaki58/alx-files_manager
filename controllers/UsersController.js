import dbClient from '../utils/db';
import sha1 from 'sha1'
import redisClient from '../utils/redis';
import { ObjectId }  from 'mongodb'



const postNew = async (req, res) => {
    const { body: {email, password } } = req
    if (!email) 
        return res.status(400).json({ error: 'Missing email' })
    if(!password)
        return res.status(400).json({ error: 'Missing password' })
    const database = dbClient.db.collection('users')
    const user = await database.find({ email }).toArray()
    if (user.length > 0)
        return res.status(400).json({ error: 'Already exist' })
    const hashedpwd = sha1(password)
    const newUser = await database.insertOne({ email, password: hashedpwd })
    const id = `${newUser   .insertedId}`
    res.status(201).json({ id, email })
}

const getMe = async (req, res) => {
    const token = req.headers['x-token']
    const redisKey = `auth_${token}`
    const value = await redisClient.get(redisKey)
    const MongoId = new ObjectId(value)
    const database = dbClient.db.collection('users')
    const user = await database.findOne({ _id: ObjectId(MongoId) })

    if (!user) {
        return res.status(401).json({ error: 'Unauthorized' })
    }
    return res.status(200).json({ id: user._id, email: user.email })
}

export { postNew, getMe }
