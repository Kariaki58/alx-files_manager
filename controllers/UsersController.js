import dbClient from '../utils/db';
import sha1 from 'sha1'


const postNew = async (req, res) => {
    const { body: { email, password} } = req

    if (!email)
        return res.status(400).send({"error": "Missing email"})
    if (!password)
        return res.status(400).send({"error": "Missing password"})
    const users = await dbClient.db.collection('users')
    users.findOne({email}, (err, data) => {
        if(data) {
           return res.status(400).send({"email": "Already exist"})
        } else {
            const hashedpassword = sha1(password)
            users.insertOne(
                {email, password: hashedpassword}
            ).then((result) => {
                res.status(201).json({id: result.insertedId, email })
            }).catch((err) => console.error(err))
        }
    })
}

export default postNew
