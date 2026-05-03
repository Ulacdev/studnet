/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = process.env.GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(API_KEY);

export interface HousingAIOptions {
  name: string;
  category: string;
  specialty: string;
  price?: number;
}

export async function enhanceDormDescription(options: HousingAIOptions): Promise<{ description: string; specialty: string }> {
  try {
    if (!API_KEY) {
      return { 
        description: "AI enhancement requires a Gemini API key. Please check your configuration.",
        specialty: options.specialty
      };
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const prompt = `
      You are a specialized student housing expert. 
      Create a compelling, short description (max 3 sentences) and a punchy 2-3 word specialty label for the following housing:
      Name: ${options.name}
      Category: ${options.category}
      Key Vibe/Feature: ${options.specialty}
      Price: ${options.price ? `$ ${options.price}` : 'Contact for price'}
      
      Output JSON format:
      {"description": "...", "specialty": "..."}
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Clean JSON from potential markdown blocks
    const jsonStr = text.replace(/```json|```/g, "").trim();
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error("AI Enhancement Error:", error);
    return {
      description: `A unique ${options.category} offering a ${options.specialty} lived experience. Perfect for students looking for quality housing.`,
      specialty: options.specialty
    };
  }
}
