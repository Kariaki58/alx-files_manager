import dbClient from '../utils/db'
import redisClient from '../utils/redis'
import sha1 from 'sha1'
import { v4 as uuidv4 } from 'uuid';


const getConnect = async (req, res) => {
    const basicAuth = req.headers.authorization
    if (!basicAuth || !basicAuth.startsWith('Basic ')) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const credentials = Buffer.from(basicAuth.slice(6), 'base64').toString().split(':');
    if (!credentials[0] || !credentials[1]) {
        return res.status(401).json({ error: 'Unauthorized' })
    }
    const email = credentials[0];
    const password = credentials[1];
    const usersCollection = dbClient.db.collection('users')
    const user = await usersCollection.findOne({ email });
    if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const hashedpwd = sha1(password)
    if (user.password != hashedpwd) {
        return res.status(401).json({ error: 'Unauthorized' })
    }
    const authToken = uuidv4()
    await redisClient.set(`auth_${authToken}`, user._id.toString(), 86400);
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


export { getConnect, getDisconnect }
