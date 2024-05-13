import dbClient from '../utils/db';
import sha1 from 'sha1'


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

export default postNew
