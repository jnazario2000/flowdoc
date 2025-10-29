 import express from "express";
 import { generateDoc } from "../controllers/AIDocController.js";

 const router = express.Router();

 // Generate AI documentation for code snippet
 router.post("/generate", generateDoc);

 export default router;