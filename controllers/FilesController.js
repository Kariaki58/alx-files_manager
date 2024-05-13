import dbClient from '../utils/db'
import redisClient from '../utils/redis'
import { ObjectId }  from 'mongodb'
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs'
import path from 'path';

const addFile = async(userId, name, isPublic = false, parentId = 0, type, localpath = null) => {
      const database = dbClient.db;
      const collection = database.collection('files');
      if (localpath) {
        await collection.insertOne({
          userId,
          name,
          type,
          isPublic,
          parentId,
          localpath,
        });
      } else {
        await collection.insertOne({
          userId,
          name,
          type,
          isPublic,
          parentId,
        });
      }
  
      const newFile = await collection.findOne({ name });
      return {
        id: newFile._id, userId, name, type, isPublic, parentId,
      };
    }

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
        if (!findByParentId) {
            return res.status(400).send({ error: "Parent not found"})
        }
        if (findByParentId.type !== 'folder') {
            return res.status(400).send({ error: "Parent is not a folder" })
        }
    }
    if (type === 'folder') {
        const addedFile = await dbClient.addFile(
            ObjectId(user._id), name, isPublic, parentId, type,
          );
          res.status(201).json(addedFile);
    } else {
        const localPath = uuidv4()
        const relativePath = process.env.FOLDER_PATH || '/tmp/files_manager'
        if (!fs.existsSync(relativePath)) {
            fs.mkdirSync(relativePath, { recursive: true })
        }
        fs.writeFileSync(path.join(relativePath, localPath), content)
        const newFileDocs = await addFile(ObjectId(user._id), name, isPublic, parentId, type, localPath)
        return res.status(201).send({
            id: newFileDocs.id, userId: newFileDocs.userId,
            name: newFileDocs.name, parentId: newFileDocs.parentId,
            type: newFileDocs.type, isPublic: newFileDocs.isPublic,
        })
    }
}

export default postUpload
