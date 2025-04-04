import express from 'express';
import bodyParser from 'body-parser'; // For parsing JSON data
import { MongoClient } from 'mongodb';
import userRoutes from './src/routes/userRoutes.js'; // Import the routes for user
import editHistoryRoutes from './src/routes/editHistoryRoutes.js'; // Import the routes for user edit history
import userHistoryRoutes from './src/routes/userHistoryRoutes.js'; // Import the routes for user history
import projectPageRoutes from './src/routes/projectPage.routes.js'; // added

const app = express();
const port = 3000;

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

// Middleware to parse JSON requests
app.use(bodyParser.json());

// Use the user-related routes
app.use('/api', userRoutes);  // All routes starting with /api will be handled by userRoutes
app.use('/api', editHistoryRoutes); // Use the editHistoryRoutes for any requests that begin with /api
app.use('/api', userHistoryRoutes); // Use the userHistoryRoutes for any requests that begin with /api

// Project Pages routes
app.use('/api', projectPageRoutes);

// Test route for checking if the server is up
app.get("/", (req, res) => {
    res.send("Hello, World!");
});

// Connect to MongoDB before starting the server
app.listen(port, async () => {
    await connectMongoDB();  // Ensure MongoDB connection before starting the server
    console.log(`Server running at http://localhost:${port}/`);
});
