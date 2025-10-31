// backend/services/aiDocService.js
//import OpenAI from "openai";
import Groq from "groq-sdk";

//const provider = process.env.AI_PROVIDER?.toLowerCase() || "openai";
const provider = "groq";

let client;
let generateAIDoc;

if (provider === "groq") {
    /* ---------------- GROQ PROVIDER ---------------- */
    const groqClient = new Groq({
        apiKey: process.env.GROQ_API_KEY,
    });

    generateAIDoc = async (snippet) => {
        const completion = await groqClient.chat.completions.create({
            model: "llama-3.3-70b-versatile", // Using Llama 3.3 70B - fast and capable
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
            max_completion_tokens: 4096,
        });

        return completion.choices?.[0]?.message?.content?.trim() || "No output.";
    };
} //else {
    /* ---------------- OPENAI PROVIDER ---------------- */
//     const openaiClient = new OpenAI({
//         apiKey: process.env.OPENAI_API_KEY,
//     });

//     generateAIDoc = async (snippet) => {
//         const completion = await openaiClient.chat.completions.create({
//             model: "gpt-4o-mini", // or "gpt-4o"
//             messages: [
//                 {
//                     role: "system",
//                     content:
//                         "You are an assistant for code documentation. Provide complete, well-structured documentation with clear sections. Always finish your thoughts completely.",
//                 },
//                 {
//                     role: "user",
//                     content: `Document this code with a complete analysis. Include:
// 1. Overview (2-3 sentences)
// 2. Key Features (bullet points)
// 3. Important Methods/Functions
// 4. Usage Notes

// Code to document:
// ${snippet}

// Provide complete documentation and ensure you finish all sections.`,
//                 },
//             ],
//             temperature: 0.7,
//             max_completion_tokens: 4096,
//         });

//         return completion.choices?.[0]?.message?.content?.trim() || "No output.";
//     };
// }

/* ---------------- EXPORT ---------------- */
export { generateAIDoc };
