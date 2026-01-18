import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';
dotenv.config();

async function listModels() {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const modelsToTest = ["gemini-1.5-flash"];

    for (const modelName of modelsToTest) {
        console.log(`Testing model: ${modelName}`);
        try {
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent("Hello");
            console.log(`PASS: ${modelName}`);
        } catch (e) {
            console.log(`FAIL: ${modelName} - ${e.message}`);
        }
    }
}

listModels();
