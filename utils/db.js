
const { MongoClient } = require('mongodb');
const dotenv = require('dotenv')


dotenv.config()

class DBClient {
  constructor() {
    const HOST = process.env.DB_HOST || 'localhost';
    const PORT = process.env.DB_PORT || 27017;
    const DATABASE = process.env.DB_DATABASE || 'files_manager';
    const url = `mongodb://${HOST}:${PORT}`;
    this.connected = false
    this.client = new MongoClient(url, {
      useUnifiedTopology: true,
      useNewUrlParser: true,
    });
    this.client
      .connect()
      .then(() => {
        this.db = this.client.db(`${DATABASE}`);
        this.connected = true
      })
      .catch((err) => {
        console.log(err);
      });
  }

  isAlive() {
    return this.connected
  }

  async nbUsers() {
    const userData = this.db.collection('users');
    const users = await userData.countDocuments();
    return users;
  }

  async nbFiles() {
    const fileContent = this.db.collection('files');
    const filesCount = await fileContent.countDocuments();
    return filesCount;
  }
}

const dbClient = new DBClient();

module.exports = dbClient;
