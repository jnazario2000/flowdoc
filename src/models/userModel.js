// this should handle database logic
import { MongoClient } from 'mongodb';

const url = 'mongodb://127.0.0.1:27017';
const dbName = 'myDatabase';
const client = new MongoClient(url);

let db;
let usersCollection;

async function connect() {
    try {
        await client.connect();
        db = client.db(dbName);
        usersCollection = db.collection('users');
    } catch (error) {
        throw new Error('Error connecting to MongoDB');
    }
}

connect();

export { usersCollection };