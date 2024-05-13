import dbClient from '../utils/db'
import redisClient from '../utils/redis'
import { ObjectId }  from 'mongodb'
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs'
import path from 'path';


const postUpload = async (req, res) => {
    const token = req.headers['x-token']
    const redisKey = `auth_${token}`
    const value = await redisClient.get(redisKey)
    const MongoId = new ObjectId(value)
    const database = dbClient.db.collection('users')
    const user = await database.findOne({ _id: ObjectId(MongoId) })
    if (!user) {
        return res.status(401).json({error: 'Unauthorized'})
    }
    const { body: { name, type, parentId = 0, isPublic = false, data }} = req
    if (!name) {
        return res.status(400).send({error: 'Missing name'})
    }
    if (!type || !['folder', 'file', 'image'].includes(type)) {
        return res.status(400).send({error: 'Missing type'})
    }
    if (!data && type != 'folder') {
        return res.status(400).send({error: 'Missing data'})
    }
    if (parentId) {
        const fileCollection = await dbClient.db.collection('files')
        const findByParentId = await fileCollection.findOne({ parentId })
        // validate this code
        if (!findByParentId) {
            return res.status(400).send({error: 'Parent not found'})
        }
        if (findByParentId.type === 'folder') {
            return res.status(400).send({error: 'Parent is not a folder'})
        }
    }
    const newFileDocument = {
        userId: user._id, name, type, isPublic, parentId
    }
    const fileCollection = await dbClient.db.collection('files')
    if (type === 'folder') {
        const output = await fileCollection.insertOne(newFileDocument)
        return res.status(201).send({ id: output.ops[0]._id, ...output.ops[0]})
    } else {
        const relativePath = process.env.FOLDER_PATH || '/tmp/files_manager'
        if (!fs.existsSync(relativePath))  {
            fs.mkdirSync(relativePath, {recursive: true})
        }
        const localPath = uuidv4()
        fs.writeFileSync(path.join(relativePath, localPath), Buffer.from(data, 'base64'))
        const newFile = {
            userId: user._id, name, type, isPublic, parentId,
            localPath: ['file', 'image'].includes(type) ? localPath : null
        }
        const ouput = await fileCollection.insertOne(newFile)
        return res.status(201).send({id: ouput.ops[0]._id, ...ouput.ops[0]})
    }
}

export { postUpload }