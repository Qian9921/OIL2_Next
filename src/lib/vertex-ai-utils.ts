import { VertexAI, HarmCategory, HarmBlockThreshold } from '@google-cloud/vertexai';

export type LLMTaskType =
  | 'chat'
  | 'prompt-evaluation'
  | 'project-refinement'
  | 'subtask-refinement';

interface GenerationOverrides {
  maxOutputTokens?: number;
  temperature?: number;
  topP?: number;
  topK?: number;
  stopSequences?: string[];
  responseMimeType?: string;
}

export type GenerativeModelInstance = ReturnType<VertexAI['getGenerativeModel']>;

interface GenerativeModelBundle {
  primary: GenerativeModelInstance;
  fallback: GenerativeModelInstance | null;
  primaryModel: string;
  fallbackModel: string | null;
  primaryLocation: string;
  fallbackLocation: string | null;
}

const CONFIGURED_PROJECT_ID =
  process.env.GOOGLE_CLOUD_PROJECT ?? process.env.GCLOUD_PROJECT ?? 'openimpactlab-v2';
const CONFIGURED_LOCATION = process.env.GOOGLE_CLOUD_LOCATION;
const CONFIGURED_FAST_MODEL = process.env.VERTEX_FAST_MODEL;
const CONFIGURED_COMPLEX_MODEL = process.env.VERTEX_COMPLEX_MODEL;
const CONFIGURED_FAST_FALLBACK_MODEL = process.env.VERTEX_FAST_FALLBACK_MODEL;
const CONFIGURED_COMPLEX_FALLBACK_MODEL = process.env.VERTEX_COMPLEX_FALLBACK_MODEL;
const CONFIGURED_GENERIC_MODEL = process.env.VERTEX_MODEL_NAME;
const CONFIGURED_REGIONAL_LOCATION = process.env.VERTEX_REGIONAL_LOCATION;

const MODEL_ALIASES: Record<string, string> = {
  'gemini-3-pro-preview': 'gemini-3.1-pro-preview',
};

const DEFAULT_FAST_MODEL = 'gemini-3-flash-preview';
const DEFAULT_COMPLEX_MODEL = 'gemini-3.1-pro-preview';
const DEFAULT_FAST_FALLBACK_MODEL = 'gemini-2.5-flash';
const DEFAULT_COMPLEX_FALLBACK_MODEL = 'gemini-2.5-pro';
const DEFAULT_REGIONAL_LOCATION = 'asia-east1';

const SAFETY_SETTINGS = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
];

export const PROJECT_ID = CONFIGURED_PROJECT_ID;

function normalizeModelName(modelName: string | undefined | null, fallback: string) {
  const requestedModel = modelName?.trim() || fallback;
  return MODEL_ALIASES[requestedModel] || requestedModel;
}

function resolveLocationForModel(_modelName: string) {
  return CONFIGURED_LOCATION || CONFIGURED_REGIONAL_LOCATION || DEFAULT_REGIONAL_LOCATION;
}

function getPrimaryModelForTask(taskType: LLMTaskType) {
  if (CONFIGURED_GENERIC_MODEL) {
    return normalizeModelName(CONFIGURED_GENERIC_MODEL, DEFAULT_COMPLEX_MODEL);
  }

  if (taskType === 'chat' || taskType === 'prompt-evaluation') {
    return normalizeModelName(CONFIGURED_FAST_MODEL, DEFAULT_FAST_MODEL);
  }

  return normalizeModelName(CONFIGURED_COMPLEX_MODEL, DEFAULT_COMPLEX_MODEL);
}

function getFallbackModelForTask(taskType: LLMTaskType) {
  if (CONFIGURED_GENERIC_MODEL) {
    return normalizeModelName(CONFIGURED_COMPLEX_FALLBACK_MODEL, DEFAULT_COMPLEX_FALLBACK_MODEL);
  }

  if (taskType === 'chat' || taskType === 'prompt-evaluation') {
    return normalizeModelName(CONFIGURED_FAST_FALLBACK_MODEL, DEFAULT_FAST_FALLBACK_MODEL);
  }

  return normalizeModelName(CONFIGURED_COMPLEX_FALLBACK_MODEL, DEFAULT_COMPLEX_FALLBACK_MODEL);
}

export function getTaskModelConfig(taskType: LLMTaskType) {
  const primaryModel = getPrimaryModelForTask(taskType);
  const fallbackModel = getFallbackModelForTask(taskType);

  return {
    taskType,
    primaryModel,
    fallbackModel,
    primaryLocation: resolveLocationForModel(primaryModel),
    fallbackLocation: fallbackModel ? resolveLocationForModel(fallbackModel) : null,
  };
}

function createGenerativeModelInstance(modelName: string, location: string, overrides: GenerationOverrides = {}) {
  const vertexAI = new VertexAI({
    project: PROJECT_ID,
    location,
  });

  return vertexAI.getGenerativeModel({
    model: modelName,
    safetySettings: SAFETY_SETTINGS,
    generationConfig: {
      maxOutputTokens: overrides.maxOutputTokens ?? 2048,
      temperature: overrides.temperature ?? 0.4,
      topP: overrides.topP ?? 0.95,
      topK: overrides.topK ?? 40,
      stopSequences: overrides.stopSequences ?? [],
      responseMimeType: overrides.responseMimeType ?? 'text/plain',
    },
  });
}

export function createGenerativeModelBundle(taskType: LLMTaskType, overrides: GenerationOverrides = {}): GenerativeModelBundle {
  const config = getTaskModelConfig(taskType);

  const primary = createGenerativeModelInstance(
    config.primaryModel,
    config.primaryLocation,
    overrides,
  );

  const fallback = config.fallbackModel
    ? createGenerativeModelInstance(
        config.fallbackModel,
        config.fallbackLocation || DEFAULT_REGIONAL_LOCATION,
        overrides,
      )
    : null;

  return {
    primary,
    fallback,
    primaryModel: config.primaryModel,
    fallbackModel: config.fallbackModel,
    primaryLocation: config.primaryLocation,
    fallbackLocation: config.fallbackLocation,
  };
}

/**
 * Backward-compatible helper. Defaults to the complex-task routing tier.
 */
export function createGenerativeModel(maxOutputTokens = 2048) {
  return createGenerativeModelBundle('project-refinement', { maxOutputTokens }).primary;
}

export async function withGenerativeModelFallback<T>(
  bundle: GenerativeModelBundle,
  operation: (model: GenerativeModelInstance) => Promise<T>,
): Promise<{ value: T; usedModel: string; usedFallback: boolean }> {
  try {
    const value = await operation(bundle.primary);

    return {
      value,
      usedModel: bundle.primaryModel,
      usedFallback: false,
    };
  } catch (error) {
    if (!bundle.fallback || !shouldRetryWithFallback(error)) {
      throw error;
    }

    console.warn(
      `Primary model ${bundle.primaryModel} failed for location ${bundle.primaryLocation}; retrying with fallback ${bundle.fallbackModel} in ${bundle.fallbackLocation}.`,
      error,
    );

    const value = await operation(bundle.fallback);

    return {
      value,
      usedModel: bundle.fallbackModel || bundle.primaryModel,
      usedFallback: true,
    };
  }
}

function shouldRetryWithFallback(error: unknown) {
  const errorMessage = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

  return [
    'could not find location',
    'model',
    'not found',
    'resource_exhausted',
    'quota',
    '429',
    '503',
    'unavailable',
    'deadline exceeded',
  ].some((signal) => errorMessage.includes(signal));
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
  
  console.log('Vertex AI response structure:', JSON.stringify(debugInfo, null, 2));
  
  // Check for missing candidates
  if (!response || !response.candidates || response.candidates.length === 0) {
    console.error('Vertex AI response missing candidates:', JSON.stringify(response, null, 2));
    return { 
      isValid: false, 
      error: 'AI response was empty (no candidates). Please try again with simpler input.',
      debugInfo 
    };
  }
  
  const candidate = response.candidates[0];
  
  // Check for missing content
  if (!candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
    console.error('Vertex AI candidate missing content or parts:', JSON.stringify(candidate, null, 2));
    return { 
      isValid: false, 
      error: 'AI response was empty (no content). Please try again with simpler input.',
      debugInfo,
      candidate 
    };
  }
  
  // Check for safety or recitation finish reasons
  if (candidate.finishReason === 'SAFETY' || candidate.finishReason === 'RECITATION') {
    console.error('Vertex AI response terminated due to:', candidate.finishReason);
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
    console.error('Vertex AI response text is empty:', JSON.stringify(candidate.content.parts[0], null, 2));
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
      console.error('Response may be truncated or malformed:', cleanedResponseText);
      
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
      console.log('Attempting to recover from malformed JSON response:', cleanedResponseText);
    }
    
    // Try to parse the JSON
    try {
      return { 
        success: true, 
        parsedJson: JSON.parse(cleanedResponseText) 
      };
    } catch (initialParseError) {
      console.error('Initial parse error:', initialParseError);
      
      // Try to recover by doing a more aggressive cleanup
      const recoverableText = cleanedResponseText
        .replace(/,\s*\}/g, '}') // Remove trailing commas
        .replace(/,\s*,/g, ',')  // Remove duplicate commas
        .replace(/"\s*:/g, '":') // Fix spacing in key-value pairs
        .replace(/:\s*"/g, ':"') // Fix spacing in key-value pairs
        .replace(/(['"])?([a-zA-Z0-9_]+)(['"])?:/g, '"$2":') // Ensure all keys are properly quoted
        .replace(/:\s*'([^']*)'/g, ':"$1"'); // Replace single quotes with double quotes for values
        
      console.log('Attempting to recover with cleaned text:', recoverableText);
      
      try {
        return { 
          success: true, 
          parsedJson: JSON.parse(recoverableText),
          recovered: true
        };
      } catch (secondParseError) {
        console.error('Second parse attempt failed:', secondParseError);
        return { 
          success: false, 
          error: cleanedResponseText.startsWith('<!DOCTYPE') ? 'Model returned HTML instead of JSON object' : 'Failed to parse response as JSON object', 
          cleanedText: cleanedResponseText,
          recoverableText
        };
      }
    }
  } catch (error) {
    console.error('Error in parseJsonObjectResponse:', error);
    return { 
      success: false, 
      error: 'Unexpected error processing JSON object response' 
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
      console.error('Potentially truncated or incomplete JSON from AI:', cleanedResponseText);
      
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
      console.log('Attempting to recover from malformed array JSON:', cleanedResponseText);
    }
    
    // Try to parse the JSON
    try {
      return { 
        success: true, 
        parsedJson: JSON.parse(cleanedResponseText) 
      };
    } catch (initialParseError) {
      console.error('Initial parse error for array:', initialParseError);
      
      // Try to recover by doing a more aggressive cleanup
      const recoverableText = cleanedResponseText
        .replace(/,\s*\}/g, '}') // Remove trailing commas in objects
        .replace(/,\s*\]/g, ']') // Remove trailing commas in arrays
        .replace(/,\s*,/g, ',')  // Remove duplicate commas
        .replace(/"\s*:/g, '":') // Fix spacing in key-value pairs
        .replace(/:\s*"/g, ':"') // Fix spacing in key-value pairs
        .replace(/(['"])?([a-zA-Z0-9_]+)(['"])?:/g, '"$2":') // Ensure all keys are properly quoted
        .replace(/:\s*'([^']*)'/g, ':"$1"'); // Replace single quotes with double quotes for values
        
      console.log('Attempting to recover array with cleaned text:', recoverableText);
      
      try {
        return { 
          success: true, 
          parsedJson: JSON.parse(recoverableText),
          recovered: true
        };
      } catch (secondParseError) {
        console.error('Second parse attempt failed for array:', secondParseError);
        
        // Try to extract individual objects as a last resort
        const objectMatches = cleanedResponseText.match(/\{[^\{\}]*\}/g);
        if (objectMatches && objectMatches.length > 0) {
          const extractedObjects = [];
          
          for (const objMatch of objectMatches) {
            try {
              extractedObjects.push(JSON.parse(objMatch));
            } catch (e) {
              console.error('Could not parse individual object:', e);
            }
          }
          
          if (extractedObjects.length > 0) {
            console.log('Using extracted objects:', extractedObjects);
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
          error: cleanedResponseText.startsWith('<!DOCTYPE') ? 'Model returned HTML instead of JSON array' : 'Failed to parse response as JSON array', 
          cleanedText: cleanedResponseText,
          recoverableText
        };
      }
    }
  } catch (error) {
    console.error('Error in parseJsonArrayResponse:', error);
    return { 
      success: false, 
      error: 'Unexpected error processing JSON array response' 
    };
  }
}
