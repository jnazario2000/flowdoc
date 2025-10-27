// backend/services/groqService.js
import Groq from "groq-sdk";

const client = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

/**
 * Generate AI documentation for a code snippet using Groq.
 * Uses GPT-oss-120b model which can be changed under model.
 * Model now is similar to GPT 4
 * @param {string} snippet - The code snippet to summarize.
 * @returns {Promise<string>} - The AI-generated documentation.
 */
export async function generateAIDoc(snippet) {
    try {
        const completion = await client.chat.completions.create({
            model: "openai/gpt-oss-120b",
            messages: [
                {
                    role: "system",
                    content:
                        "You are an assistant for code documentation.",
                },
                {
                    role: "user",
                    content: `Document this code and summarize the important features:\n${snippet}`,
                },
            ],
            temperature: 0.7,
            max_completion_tokens: 256,
        });

        const text = completion.choices[0]?.message?.content?.trim() || "No output.";
        return text;
    } catch (err) {
        console.error("Groq API error:", err);
        throw new Error("Failed to generate AI documentation.");
    }
}
