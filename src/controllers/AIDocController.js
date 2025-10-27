import { generateAIDoc } from "../services/groqService.js";

// Controller for Groq Service to generate documentation
export async function generateDoc(req, res) {
    try {
        const { code } = req.body;

        if (!code || !code.trim()) {
            return res.status(400).json({ error: "Code snippet is required" });
        }

        const documentation = await generateAIDoc(code);

        res.json({ documentation });
    } catch (error) {
        console.error("Generate doc error:", error);
        res.status(500).json({
            error: error.message || "Failed to generate documentation"
        });
    }
}