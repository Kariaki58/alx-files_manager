import dbClient from '../utils/db'
import redisClient from '../utils/redis'
import { ObjectId }  from 'mongodb'
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs'
import path from 'path';

const postUpload = async (req, res) => {
    try {

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
        const { name, type, parentId = 0, isPublic = false, data } = req.body;
        if (!name) {
            return res.status(400).json({ error: 'Missing name' });
        }
        if (!type || !['folder', 'file', 'image'].includes(type)) {
            return res.status(400).json({ error: 'Missing or invalid type' });
        }
        if (['file', 'image'].includes(type) && !data) {
            return res.status(400).json({ error: 'Missing data' });
        }
        if (parentId !== 0) {
            const parentFile = await File.findById(parentId);
            if (!parentFile) {
                return res.status(400).json({ error: 'Parent not found' });
            }
            if (parentFile.type !== 'folder') {
                return res.status(400).json({ error: 'Parent is not a folder' });
            }
        }
        let localPath = '';
        if (!type || !['file', 'image', 'folder'].includes(type)) {
            return res.status(400).json({ error: 'Missing type' });
        }
        if (['file', 'image'].includes(type)) {
            const folderPath = process.env.FOLDER_PATH || '/tmp/files_manager';
            try {
                fs.mkdirSync(folderPath)
            } catch(err) {
                console.error(err.message)
            }
            localPath = path.join(folderPath, uuidv4());
            fs.writeFileSync(localPath, Buffer.from(data, 'base64'));
        }
        await filesCollection.insertOne({
            userId: user._id,
            name,
            type,
            parentId,
            isPublic,
            localPath: type === 'folder' ? null : localPath
        })
        return res.status(201).send({
            userId: user._id,
            name,
            type,
            parentId,
            isPublic,
            localPath: type === 'folder' ? null : localPath
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

export default postUpload
