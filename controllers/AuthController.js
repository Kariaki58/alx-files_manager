import dbClient from '../utils/db'
import redisClient from '../utils/redis'
import { ObjectId }  from 'mongodb'
import sha1 from 'sha1'
import { v4 as uuidv4 } from 'uuid';


const getConnect = async (req, res) => {
    const basicAuth = req.headers.authorization
    if (!basicAuth || !basicAuth.startsWith('Basic ')) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const credentials = Buffer.from(basicAuth.slice(6), 'base64').toString().split(':');
    const email = credentials[0];
    const password = credentials[1];
    const usersCollection = dbClient.db.collection('users');
    const user = await usersCollection.findOne({ email, password: sha1(password) });
    if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const authToken = uuidv4()
    await redisClient.set(`auth_${authToken}`, user._id.toString(), 24 * 60 * 60);
    return res.status(200).json({ token: authToken });
}

const getDisconnect = async (req, res) => {
    const xToken = req.headers['x-token']
    const getUserToken = await redisClient.get(`auth_${xToken}`)
    if (!getUserToken) {
        return res.status(401).send({"error":"Unauthorized"})
    }
    redisClient.del(`auth_${xToken}`)
    return res.sendStatus(204)
}

const getMe = async (req, res) => {
    const xToken = req.headers['x-token']
    const getUserToken = await redisClient.get(`auth_${xToken}`)
    if (!getUserToken) {
        return res.status(401).send({"error":"Unauthorized"})
    }
    const userCollection = await dbClient.db.collection('users')
    const userFromId = await userCollection.findOne({ _id: ObjectId(getUserToken) })
    delete userFromId._id
    return res.status(200).send(userFromId)
}

export { getConnect, getDisconnect, getMe }
