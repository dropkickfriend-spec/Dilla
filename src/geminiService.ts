/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function generateBeatMetadata() {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: "Generate a list of 5 creative, soulful song titles for a J Dilla inspired beat tape. Return as JSON array of strings.",
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });

    const titles = JSON.parse(response.text || "[]");
    return titles;
  } catch (error) {
    console.error("Gemini Error:", error);
    return ["Donuts Forever", "Vintage Soul", "Detroit Nights", "The Light", "Fantastic Vol. 3"];
  }
}
