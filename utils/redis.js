const redis = require('redis')
const { promisify } = require('util')


class RedisClient {
    constructor() {
        this.connected = true
        let client = redis.createClient()
        this.getAsync = promisify(client.get).bind(client);
        this.setAsync = promisify(client.set).bind(client);
        this.delAsync = promisify(client.del).bind(client);
        client.on("connect", () => {
        })
        client.on('error', (err) => {
            this.connected = false
            console.error(err.message)
        })
    }
    isAlive() {
        return this.connected
    }
    async get(key) {
        try {
            const data = await this.getAsync(key)
            return data
        } catch (err) {
            return err.message            
        }
    }
    async set(key, value, duration) {
        try {
            await this.setAsync(key, value, 'EX', duration)
        } catch(err) {
            return err.message
        }
    }
    async del(key) {
        try {
            await this.delAsync(key)
        } catch(err) {
            return err.message
        }
    }
}


const redisClient = new RedisClient()

module.exports = redisClient