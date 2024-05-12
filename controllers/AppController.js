import redisClient from "../utils/redis";
import dbClient from '../utils/db';


const getStatus = (req, res) => {

    const isAliveRedis = redisClient.isAlive()
    const isAliveDb = dbClient.isAlive()
    res.status(200).send({ "redis": isAliveRedis, "db": isAliveDb})
}

const getStats = async (req, res) => {
    const numbUsers = await dbClient.nbUsers()
    const numbFiles = await dbClient.nbFiles()
    res.json({ "users": numbUsers, "files": numbFiles })
}

export { getStats, getStatus }