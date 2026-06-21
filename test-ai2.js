import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.VITE_GEMINI_API_KEY });
async function testModel(modelName) {
  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: "hello",
    });
    console.log(`Success with ${modelName}:`, !!response.text);
  } catch (err) {
    console.log(`Failed with ${modelName}:`, err.message);
  }
}
async function run() {
  await testModel("gemini-2.5-flash");
  await testModel("gemini-2.5-flash-lite");
  await testModel("gemini-2.0-flash-lite");
  await testModel("gemini-3.5-flash");
}
run();
