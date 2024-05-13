import dbClient from '../utils/db'
import redisClient from '../utils/redis'
import { ObjectId }  from 'mongodb'
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs'
import path from 'path';

const postUpload = async (req, res) => {
    const xToken = req.headers['x-token']
    const getUserToken = await redisClient.get(`auth_${xToken}`)
    if (!getUserToken) {
        return res.status(401).send({"error":"Unauthorized"})
    }
    const userCollection = await dbClient.db.collection('users')
    const userFromId = await userCollection.findOne({ _id: ObjectId(getUserToken) })
    const { body: { name, type, parentId = 0, isPublic = false, data } } = req;
    
    if (!name) {
        return res.status(400).send({"error": "Missing name"})
    } else if (!type || !['folder', 'file', 'image'].includes(type)) {
        return res.status(400).send({"error": "Missing type"})
    } else if (!data && type != data) {
        return res.status(400).send({"error": "Missing data"})
    }
    if (parentId !== 0) {
        const parentFile = await dbClient.db.collection('files').findOne({ _id: parentId });
        if (!parentFile) {
            return res.status(400).send({ error: 'Parent not found' });
        }

        if (parentFile.type !== 'folder') {
            return res.status(400).send({ error: 'Parent is not a folder' });
        }
    }
    const local = null
    try {
        const folderPath = process.env.FOLDER_PATH || '/tmp/files_manager';
        const localPath = `${folderPath}/${uuidv4()}`;
        fs.writeFileSync(localPath, Buffer.from(data, 'base64'));
    } catch(err) {
        console.log(err.message)
    }
    const files = { 
        userId: userFromId._id, name, type,
        isPublic, parentId, localPath: type === 'folder' ? null : local
    }
    await dbClient.db.collection("files").insertOne(files)
    return res.status(201).send(files)
}

export default postUpload