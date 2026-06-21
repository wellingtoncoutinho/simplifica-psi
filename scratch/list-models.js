import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
dotenv.config();

const apiKey = process.env.VITE_GEMINI_API_KEY;
const ai = new GoogleGenAI({ apiKey });

async function run() {
  try {
    const response = await ai.models.list();
    console.log("Keys:", Object.keys(response));
    for (const key of Object.keys(response)) {
      if (Array.isArray(response[key])) {
        console.log(`Array field ${key}:`, response[key].map(m => m.name));
      } else {
        console.log(`Field ${key}:`, typeof response[key]);
      }
    }
  } catch (err) {
    console.error("Error:", err.message);
  }
}
run();
