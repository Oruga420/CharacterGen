
import { GoogleGenAI } from "@google/genai";

export async function generateAnimeArt(prompt: string, referenceImages: string[] = []): Promise<string> {
  // Always initialize GoogleGenAI with a fresh instance right before the call
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Clean prompt instruction focused on the requested style
  const fullPrompt = `${prompt}`;

  try {
    const parts: any[] = [{ text: fullPrompt }];
    
    // Add reference images to the parts if they exist
    referenceImages.forEach((base64) => {
      // Remove data URL prefix if present
      const data = base64.includes(',') ? base64.split(',')[1] : base64;
      const mimeType = base64.includes('image/png') ? 'image/png' : 'image/jpeg';
      
      parts.push({
        inlineData: {
          data: data,
          mimeType: mimeType,
        },
      });
    });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: parts
      },
      config: {
        imageConfig: {
          aspectRatio: "9:16" // Vertical orientation for the requested trio interaction
        }
      }
    });

    if (!response.candidates || response.candidates.length === 0) {
      throw new Error("Generation failed. Please try again.");
    }

    const candidate = response.candidates[0];
    
    if (!candidate.content?.parts || candidate.content.parts.length === 0) {
      throw new Error("The AI was unable to generate this specific composition due to safety guidelines.");
    }

    let base64Image: string | undefined;
    for (const part of candidate.content.parts) {
      if (part.inlineData) {
        base64Image = part.inlineData.data;
        break;
      }
    }

    if (!base64Image) {
      throw new Error("No image data received.");
    }

    return `data:image/png;base64,${base64Image}`;
  } catch (error: any) {
    console.error("Generation Error:", error);
    if (error.message?.includes('SAFETY')) {
      throw new Error("The specific character combination or physical details triggered content filters. Try a different trio or slightly less descriptive prompt.");
    }
    throw error;
  }
}
