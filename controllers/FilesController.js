import dbClient from '../utils/db'
import redisClient from '../utils/redis'
import { ObjectId }  from 'mongodb'
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs'
import { error } from 'console';


const postUpload = async (req, res) => {
    const token = req.headers['x-token']
    const key = `auth_${token}`
    const userId = await redisClient.get(key)

    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' })
    }
    const {
        name, type, parentId, isPublic, data
    } = req.body
    if (!name) {
        return res.status(400).json({error: 'Missing name'})
    }
    const accepted = ['file', 'folder', 'image']
    if (!type || !accepted.includes(type)) {
        return res.status(400).json({ error: 'Missing type' })
    }
    if (!data && type !== 'folder') {
        return res.status(400).json({ error: 'Missing data' })
    }
    if (parentId) {
        const collection = await dbClient.db.collection('files')
        const checkfile = await collection.findOne({ _id: ObjectId(parentId) })
        if (!checkfile) {
            return res.status(400).json({ error: 'Parent not found' })
        }
        if (checkfile.type !== 'folder') {
            return res.status(400).json({ error: 'Parent is not a folder' })
        }
    }
    if (type === 'folder') {
        let localpath = null

        const database = await dbClient.db.collection('files')
        if (localpath) {
            await database.insertOne({
                userId, name, type, isPublic, parentId, localpath
            })
        } else {
            await database.insertOne({
                userId, name, type, isPublic, parentId
            })
        }
        const addedFile = await database.findOne({ name })
        return res.status(201).json(addedFile)
    } else {
        const folderPath = process.env.FOLDER_PATH || '/tmp/files_manager';
        if (!fs.existsSync(folderPath)) {
            fs.mkdirSync(folderPath, { recursive: true });
        }
        const filename = uuidv4();
        const filePath = path.join(folderPath, filename);
        const decodedData = Buffer.from(data, 'base64');
        fs.writeFileSync(filePath, decodedData);
        const database = await dbClient.db.collection('files')
        if (localpath) {
            await database.insertOne({
                userId, name, type, isPublic, parentId, localpath
            })
        } else {
            await database.insertOne({
                userId, name, type, isPublic, parentId
            })
        }
        const addedFile = await database.findOne({ name })
        res.status(201).json(
            {
              id: addedFile.id, userId: addedFile.userId,
              name: addedFile.name, parentId: addedFile.parentId,
              type: addedFile.type, isPublic: addedFile.isPublic,
            }
        )
    }
}

const getShow = async(req, res) => {
    const token = req.headers['x-token']
    const redisKey = `auth_${token}`
    const value = await redisClient.get(redisKey)
    const MongoId = new ObjectId(value)
    const database = dbClient.db.collection('users')
    const user = await database.findOne({ _id: ObjectId(MongoId) })
    if (!user) {
        return res.status(401).send({ error: "Unauthorized" })
    }
    const fileId = req.params.id;
    const fileData = await dbClient.db.collection('files');
    const file = fileData.findById(fileId)

    if (!file || file.userId.toString() !== value) {
        res.status(404).json({ error: 'Not found' });
    }
    return res.json(file);
}

const getIndex = async (req, res) => {

}
export { postUpload, getShow, getIndex }
