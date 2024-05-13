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
    const filesCollection = await dbClient.db.collection('files')
    const user = await userCollection.findOne({ _id: ObjectId(getUserToken) })
    if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const { body: { name, type, parentId = 0, isPublic = 0, data } } = req;
    if (!name) {
        return res.status(400).json({ error: 'Missing name' });
    }
    if (!type || !['folder', 'file', 'image'].includes(type)) {
        return res.status(400).json({ error: 'Missing type' });
    }
    if (!data && type !== 'folder') {
        return res.status(400).json({ error: 'Missing data' })
    }
    if (parentId) {
        const parentFile = filesCollection.findOne({ parentId })
        console.log("*******************")
        console.log(parentFile)
        if (!parentFile) {
            return res.status(400).json({ error: 'Parent not found' });
        }
        if (parentFile.type !== 'folder') {
            return res.status(400).json({ error: 'Parent is not a folder' });
        }
    }
    let localPath = '';
    if (type === 'folder') {
        const addedFile = filesCollection.insertOne({
            userId: getUserToken, name, isPublic, parentId, type
        })
        return res.status(201).json(addedFile)
    } else {
        const folder = process.env.FOLDER_PATH || '/tmp/files_manager'
        if (!fs.existsSync(folder)) {
            fs.mkdirSync(folder, {recursive: true})
        }
        const fileName = uuidv4()
        const filePath = path.join(folder, fileName)
        const decode = Buffer.from(data, 'base64')
        fs.writeFileSync(filePath, decode)
        const addedData = await filesCollection.insertOne({
            userId: getUserToken, name, isPublic, parentId, type, filePath
        })
        return res.status(201).json({
            id: addedData.ops[0]._id,
            userId: addedData.ops[0].userId,
            name: addedData.ops[0].name,
            parentId: addedData.ops[0].parentId,
            type: addedData.ops[0].parentId,
            type: addedData.ops[0].type,
            isPublic: addedData.ops[0].isPublic
        })
    }
}

export default postUpload
