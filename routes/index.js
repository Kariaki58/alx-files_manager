import express from 'express'
import { getStatus, getStats } from '../controllers/AppController'
import {postNew, getMe} from '../controllers/UsersController'
import { getConnect, getDisconnect } from '../controllers/AuthController'
import { postUpload } from '../controllers/FilesController'

const router = express.Router()


router.get('/status', getStatus)
router.get('/stats', getStats)
router.post('/users', postNew)
router.get('/users/me', getMe)
router.get('/connect', getConnect)
router.get('/disconnect', getDisconnect)
router.post('/files', postUpload)

export default router