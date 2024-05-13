import dbClient from '../utils/db'
import redisClient from '../utils/redis'
import { ObjectId }  from 'mongodb'
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs'
import path from 'path';

const postUpload = async (req, res) => {
    const token = req.headers['x-token']
    const { name, type, parentId = 0, isPublic = false, data } = req.body
    const content = Buffer.from(data, 'base64').toString()
    const redisKey = `auth_${token}`
    const value = await redisClient.get(redisKey)
    const MongoId = new ObjectId(value)
    const database = dbClient.db.collection('users')
    const user = await database.findOne({ _id: ObjectId(MongoId) })

    if (!name) {
        return res.status(400).send({error: "Missing name"})
    } else if (!type || !['folder', 'file', 'image'].includes(type)) {
        return res.status(400).send({error: 'Missing type'})
    } else if (!data && type != folder) {
        return res.status(400).send({error: 'Missing data'})
    }
    if (parentId) {
        const filesCollection = await dbClient.db.collection("files")
        const findByParentId = await filesCollection.findById(parentId)
        console.log(findByParentId)
        if (!findByParentId) {
            return res.status(400).send({ error: "Parent not found"})
        }
        if (findByParentId.type !== 'folder') {
            return res.status(400).send({ error: "Parent is not a folder" })
        }
    }
    if (type === 'folder') {
        const document = {
            userId: user._id, name, type, isPublic, parentId
        }
        return res.status(201).send(document)
    } else {
        const filesCollection = await dbClient.db.collection('files')
        const file = filesCollection.findOne({ name })
        const localPath = uuidv4()
        if (!fs.existsSync('/tmp/files_manager')) {
            const relativePath = process.env.FOLDER_PATH || '/tmp/files_manager'
            fs.mkdirSync(relativePath, { recursive: true })
            fs.writeFileSync(path.join(relativePath, localPath), content)
        }
        const newFileDocs = {
            userId: user.id, name, type, isPublic, parentId,
            localPath: ['file', 'image'].includes(type) ? localPath : null 
        }
        return res.status(201).send(newFileDocs)
    }
}

export default postUpload
