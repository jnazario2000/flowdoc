import express from 'express';
import bodyParser from 'body-parser'; // For parsing JSON data
import { MongoClient } from 'mongodb';
import userRoutes from './src/routes/userRoutes.js'; // Import the routes for user
import editHistoryRoutes from './src/routes/editHistoryRoutes.js'; // Import the routes for user edit history
import projectPageRoutes from './src/routes/projectPage.routes.js'; // added
import cors from 'cors';

const app = express();
const port = 3000;


app.use(cors()); 
app.use(bodyParser.json()); // Middleware to parse JSON

// MongoDB connection setup
const url = 'mongodb://127.0.0.1:27017'; // MongoDB connection URL
const dbName = 'myDatabase'; // Name of your MongoDB database
const client = new MongoClient(url);

let db;
let usersCollection;

// MongoDB connection function
async function connectMongoDB() {
    try {
        await client.connect();
        db = client.db(dbName);
        usersCollection = db.collection('users');
        console.log('Connected successfully to MongoDB');
    } catch (error) {
        console.error('Error connecting to MongoDB:', error);
        process.exit(1); // Exit the process if MongoDB connection fails
    }
}

//  Use all routes after CORS and JSON parsing
app.use('/api', userRoutes);  
app.use('/api', editHistoryRoutes); 
app.use('/api', projectPageRoutes);

// Test route
app.get("/", (req, res) => {
    res.send("Hello, World!");
});

// Start server only after connecting to MongoDB
app.listen(port, async () => {
    await connectMongoDB(); 
    console.log(`Server running at http://localhost:${port}/`);
});
