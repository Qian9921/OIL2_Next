import { VertexAI, HarmCategory, HarmBlockThreshold } from '@google-cloud/vertexai';

// Common configuration for Vertex AI
export const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT || 'openimpactlab-v2';
export const LOCATION = process.env.GOOGLE_CLOUD_LOCATION || 'us-central1';
export const MODEL_NAME = 'gemini-2.5-flash-preview-05-20';

/**
 * Creates and configures a Vertex AI generative model with optimal settings
 * @param maxOutputTokens Maximum tokens for the response
 * @returns Configured generative model instance
 */
export function createGenerativeModel(maxOutputTokens = 2048) {
  const vertex_ai = new VertexAI({ project: PROJECT_ID, location: LOCATION });
  return vertex_ai.getGenerativeModel({
    model: MODEL_NAME,
    safetySettings: [
      { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    ],
    generationConfig: {
      maxOutputTokens,
      temperature: 0.4,
      topP: 0.95,
      topK: 40,
      stopSequences: [],
      responseMimeType: "text/plain",
    },
  });
}

/**
 * Helper function to sanitize input strings to handle markdown and special formatting
 * @param input Input string to sanitize
 * @returns Sanitized string
 */
export function sanitizeInput(input: string | undefined | null): string {
  if (!input) return '';
  
  // Replace problematic markdown characters with their escaped versions
  return input
    .replace(/\\/g, '\\\\') // Escape backslashes first
    .replace(/\*/g, '\\*')  // Escape asterisks
    .replace(/\_/g, '\\_')  // Escape underscores
    .replace(/\`/g, '\\`')  // Escape backticks
    .replace(/\]/g, '\\]')  // Escape closing brackets
    .replace(/\[/g, '\\[')  // Escape opening brackets
    .replace(/\)/g, '\\)')  // Escape closing parentheses
    .replace(/\(/g, '\\(')  // Escape opening parentheses
    .replace(/\>/g, '\\>')  // Escape greater than
    .replace(/\</g, '\\<')  // Escape less than
    .replace(/\|/g, '\\|')  // Escape pipes
    .replace(/\~\~/g, '\\~\\~') // Escape strikethrough
    .replace(/\&/g, '&amp;') // Replace ampersands with HTML entity
    // Remove or replace control characters
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
}

/**
 * Helper function to sanitize array inputs
 * @param items Array of strings to sanitize
 * @returns Sanitized array
 */
export function sanitizeArrayInput(items: string[] | undefined | null): string[] {
  if (!items || !Array.isArray(items)) return [];
  return items.map(item => sanitizeInput(item));
}

/**
 * Validates and logs the structure of a Vertex AI response
 * @param response The Vertex AI response object
 * @returns An object with validation results and debug info
 */
export function validateAIResponse(response: any) {
  const debugInfo = {
    hasResponse: !!response,
    hasCandidates: !!response?.candidates,
    candidatesLength: response?.candidates?.length,
    hasContent: !!response?.candidates?.[0]?.content,
    hasParts: !!response?.candidates?.[0]?.content?.parts,
    partsLength: response?.candidates?.[0]?.content?.parts?.length,
    finishReason: response?.candidates?.[0]?.finishReason || 'unknown',
  };
  
  console.log("Vertex AI response structure:", JSON.stringify(debugInfo, null, 2));
  
  // Check for missing candidates
  if (!response || !response.candidates || response.candidates.length === 0) {
    console.error("Vertex AI response missing candidates:", JSON.stringify(response, null, 2));
    return { 
      isValid: false, 
      error: 'AI response was empty (no candidates). Please try again with simpler input.',
      debugInfo 
    };
  }
  
  const candidate = response.candidates[0];
  
  // Check for missing content
  if (!candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
    console.error("Vertex AI candidate missing content or parts:", JSON.stringify(candidate, null, 2));
    return { 
      isValid: false, 
      error: 'AI response was empty (no content). Please try again with simpler input.',
      debugInfo,
      candidate 
    };
  }
  
  // Check for safety or recitation finish reasons
  if (candidate.finishReason === 'SAFETY' || candidate.finishReason === 'RECITATION') {
    console.error("Vertex AI response terminated due to:", candidate.finishReason);
    return { 
      isValid: false, 
      error: `AI response was terminated due to ${candidate.finishReason}. Please try modifying your input.`,
      debugInfo,
      candidate 
    };
  }
  
  const responseText = candidate.content.parts[0].text;
  
  // Check for empty text
  if (!responseText) {
    console.error("Vertex AI response text is empty:", JSON.stringify(candidate.content.parts[0], null, 2));
    return { 
      isValid: false, 
      error: 'AI response text was empty. Please try again with simpler input.',
      debugInfo,
      candidate 
    };
  }
  
  // Response is valid
  return { 
    isValid: true, 
    responseText,
    debugInfo,
    candidate 
  };
}

/**
 * Attempts to clean and parse a JSON object from an AI response
 * @param responseText The raw text response from the AI
 * @returns The parsed JSON object or error information
 */
export function parseJsonObjectResponse(responseText: string) {
  try {
    // First, clean up any markdown code blocks or other formatting
    let cleanedResponseText = responseText
      .replace(/```json\n|```/g, '')
      .replace(/^\s*\{\s*/, '{') // Clean up leading whitespace before opening brace
      .replace(/\s*\}\s*$/, '}') // Clean up trailing whitespace after closing brace
      .trim();
    
    // Check if response seems to be truncated or malformed
    if (!cleanedResponseText.startsWith('{') || !cleanedResponseText.endsWith('}')) {
      console.error("Response may be truncated or malformed:", cleanedResponseText);
      
      // Try to fix common issues with the response format
      if (!cleanedResponseText.startsWith('{')) {
        const jsonStart = cleanedResponseText.indexOf('{');
        if (jsonStart >= 0) {
          cleanedResponseText = cleanedResponseText.substring(jsonStart);
        } else {
          cleanedResponseText = '{' + cleanedResponseText;
        }
      }
      
      if (!cleanedResponseText.endsWith('}')) {
        const jsonEnd = cleanedResponseText.lastIndexOf('}');
        if (jsonEnd >= 0) {
          cleanedResponseText = cleanedResponseText.substring(0, jsonEnd + 1);
        } else {
          cleanedResponseText = cleanedResponseText + '}';
        }
      }
      
      // Log the attempt to recover
      console.log("Attempting to recover from malformed JSON response:", cleanedResponseText);
    }
    
    // Try to parse the JSON
    try {
      return { 
        success: true, 
        parsedJson: JSON.parse(cleanedResponseText) 
      };
    } catch (initialParseError) {
      console.error("Initial parse error:", initialParseError);
      
      // Try to recover by doing a more aggressive cleanup
      let recoverableText = cleanedResponseText
        .replace(/,\s*\}/g, '}') // Remove trailing commas
        .replace(/,\s*,/g, ',')  // Remove duplicate commas
        .replace(/"\s*:/g, '":') // Fix spacing in key-value pairs
        .replace(/:\s*"/g, ':"') // Fix spacing in key-value pairs
        .replace(/(['"])?([a-zA-Z0-9_]+)(['"])?:/g, '"$2":') // Ensure all keys are properly quoted
        .replace(/:\s*'([^']*)'/g, ':"$1"'); // Replace single quotes with double quotes for values
        
      console.log("Attempting to recover with cleaned text:", recoverableText);
      
      try {
        return { 
          success: true, 
          parsedJson: JSON.parse(recoverableText),
          recovered: true
        };
      } catch (secondParseError) {
        console.error("Second parse attempt failed:", secondParseError);
        return { 
          success: false, 
          error: "Failed to parse response as JSON object", 
          cleanedText: cleanedResponseText,
          recoverableText
        };
      }
    }
  } catch (error) {
    console.error("Error in parseJsonObjectResponse:", error);
    return { 
      success: false, 
      error: "Unexpected error processing JSON object response" 
    };
  }
}

/**
 * Attempts to clean and parse a JSON array from an AI response
 * @param responseText The raw text response from the AI
 * @returns The parsed JSON array or error information
 */
export function parseJsonArrayResponse(responseText: string) {
  try {
    // Clean the response of any markdown code blocks or extra characters
    let cleanedResponseText = responseText
      .replace(/```json\n|\```/g, '')
      .replace(/^\s*\[\s*/, '[') // Clean up leading whitespace before opening bracket
      .replace(/\s*\]\s*$/, ']') // Clean up trailing whitespace after closing bracket
      .trim();
    
    // Check if the JSON is possibly truncated or malformed
    if (!cleanedResponseText.startsWith('[') || !cleanedResponseText.endsWith(']') || 
        cleanedResponseText.includes('...') || 
        (cleanedResponseText.match(/\{/g) || []).length !== (cleanedResponseText.match(/\}/g) || []).length) {
      console.error("Potentially truncated or incomplete JSON from AI:", cleanedResponseText);
      
      // Try to fix common issues with the response format
      if (!cleanedResponseText.startsWith('[')) {
        const jsonStart = cleanedResponseText.indexOf('[');
        if (jsonStart >= 0) {
          cleanedResponseText = cleanedResponseText.substring(jsonStart);
        } else {
          cleanedResponseText = '[' + cleanedResponseText;
        }
      }
      
      if (!cleanedResponseText.endsWith(']')) {
        const jsonEnd = cleanedResponseText.lastIndexOf(']');
        if (jsonEnd >= 0) {
          cleanedResponseText = cleanedResponseText.substring(0, jsonEnd + 1);
        } else {
          // Find the last complete object and close the array
          const lastObjectEnd = cleanedResponseText.lastIndexOf('}');
          if (lastObjectEnd >= 0) {
            cleanedResponseText = cleanedResponseText.substring(0, lastObjectEnd + 1) + ']';
          } else {
            cleanedResponseText = cleanedResponseText + ']';
          }
        }
      }
      
      // Log the attempt to recover
      console.log("Attempting to recover from malformed array JSON:", cleanedResponseText);
    }
    
    // Try to parse the JSON
    try {
      return { 
        success: true, 
        parsedJson: JSON.parse(cleanedResponseText) 
      };
    } catch (initialParseError) {
      console.error("Initial parse error for array:", initialParseError);
      
      // Try to recover by doing a more aggressive cleanup
      let recoverableText = cleanedResponseText
        .replace(/,\s*\}/g, '}') // Remove trailing commas in objects
        .replace(/,\s*\]/g, ']') // Remove trailing commas in arrays
        .replace(/,\s*,/g, ',')  // Remove duplicate commas
        .replace(/"\s*:/g, '":') // Fix spacing in key-value pairs
        .replace(/:\s*"/g, ':"') // Fix spacing in key-value pairs
        .replace(/(['"])?([a-zA-Z0-9_]+)(['"])?:/g, '"$2":') // Ensure all keys are properly quoted
        .replace(/:\s*'([^']*)'/g, ':"$1"'); // Replace single quotes with double quotes for values
        
      console.log("Attempting to recover array with cleaned text:", recoverableText);
      
      try {
        return { 
          success: true, 
          parsedJson: JSON.parse(recoverableText),
          recovered: true
        };
      } catch (secondParseError) {
        console.error("Second parse attempt failed for array:", secondParseError);
        
        // Try to extract individual objects as a last resort
        const objectMatches = cleanedResponseText.match(/\{[^\{\}]*\}/g);
        if (objectMatches && objectMatches.length > 0) {
          const extractedObjects = [];
          
          for (const objMatch of objectMatches) {
            try {
              extractedObjects.push(JSON.parse(objMatch));
            } catch (e) {
              console.error("Could not parse individual object:", e);
            }
          }
          
          if (extractedObjects.length > 0) {
            console.log("Using extracted objects:", extractedObjects);
            return { 
              success: true, 
              parsedJson: extractedObjects,
              recovered: true,
              extracted: true
            };
          }
        }
        
        return { 
          success: false, 
          error: "Failed to parse response as JSON array", 
          cleanedText: cleanedResponseText,
          recoverableText
        };
      }
    }
  } catch (error) {
    console.error("Error in parseJsonArrayResponse:", error);
    return { 
      success: false, 
      error: "Unexpected error processing JSON array response" 
    };
  }
} 