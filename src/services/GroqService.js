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
                        "You are an assistant for code documentation. Provide complete, well-structured documentation with clear sections. Always finish your thoughts completely.",
                },
                {
                    role: "user",
                    content: `Document this code with a complete analysis. Include:
1. Overview (2-3 sentences)
2. Key Features (bullet points)
3. Important Methods/Functions
4. Usage Notes

Code to document:
${snippet}

Provide complete documentation and ensure you finish all sections.`,
                },
            ],
            temperature: 0.7,
            max_completion_tokens: 4096,  // Realistic limit for most models
        });

        const text = completion.choices[0]?.message?.content?.trim() || "No output.";
        return text;
    } catch (err) {
        console.error("Groq API error full details:");
        if (err.response) {
            console.error("Status:", err.response.status);
            console.error("Data:", err.response.data);
        } else {
            console.error("Message:", err.message);
        }
        throw new Error("Failed to generate AI documentation.");
    }
}