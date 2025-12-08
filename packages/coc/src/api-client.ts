/**
 * COC API Client
 * 
 * Bridges COC to the real API infrastructure in apps/api
 * Captures response headers for rate limit tracking
 */

import fetch from 'node-fetch';
import { extractRateLimitHeaders, storeRateLimitData } from './rate-limit-tracker';

export interface APICallRequest {
  provider: string;
  modelId: string;
  prompt: string;
  messages?: Array<{ role: string; content: string }>;
  temperature?: number;
  maxTokens?: number;
  apiKey?: string;
  baseURL?: string;
}

export interface APICallResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  headers: Record<string, string>;
}

/**
 * Map provider names to their adapter types
 */
function getProviderAdapter(provider: string): string {
  const normalized = provider.toLowerCase();
  
  if (normalized.includes('openrouter') || normalized === 'openai') {
    return 'openai';
  }
  if (normalized.includes('google') || normalized.includes('gemini') || normalized === 'vertex') {
    return 'vertex-studio';
  }
  if (normalized.includes('anthropic') || normalized.includes('claude')) {
    return 'anthropic';
  }
  if (normalized.includes('mistral')) {
    return 'mistral';
  }
  if (normalized.includes('groq')) {
    return 'openai'; // Groq uses OpenAI-compatible API
  }
  
  // Default to OpenAI-compatible
  return 'openai';
}

/**
 * Make a real API call through the appropriate adapter
 * This will eventually call the actual apps/api infrastructure
 * For now, we'll make direct calls and capture headers
 */
export async function makeAPICall(request: APICallRequest): Promise<APICallResponse> {
  const adapter = getProviderAdapter(request.provider);
  
  try {
    console.log(`[APIClient] Calling ${request.provider}/${request.modelId} via ${adapter} adapter`);
    
    let response: APICallResponse;
    
    switch (adapter) {
      case 'openai':
        response = await callOpenAICompatible(request);
        break;
      case 'vertex-studio':
        response = await callGemini(request);
        break;
      case 'mistral':
        response = await callMistral(request);
        break;
      default:
        response = await callOpenAICompatible(request);
    }
    
    // Extract and store rate limit headers
    const rateLimitData = extractRateLimitHeaders(response.headers);
    await storeRateLimitData(request.provider, request.modelId, rateLimitData, false);
    
    return response;
    
  } catch (error: any) {
    console.error(`[APIClient] Error calling ${request.provider}/${request.modelId}:`, error.message);
    
    // Check error type
    const status = error.status || error.response?.status;
    const isRateLimit = status === 429;
    const isAuthError = status === 401 || status === 403;
    
    if (isAuthError) {
      console.error(`[APIClient] ⚠️  Authentication failed - API key may be invalid or expired`);
    }
    
    // Extract headers even from error responses
    const headers = error.response?.headers || error.headers || {};
    const rateLimitData = extractRateLimitHeaders(headers);
    
    // Only store rate limit data for actual rate limit errors
    if (isRateLimit) {
      await storeRateLimitData(request.provider, request.modelId, rateLimitData, true);
    }
    
    throw error;
  }
}

/**
 * Call OpenAI-compatible APIs (OpenAI, OpenRouter, Groq, TogetherAI, etc.)
 */
async function callOpenAICompatible(request: APICallRequest): Promise<APICallResponse> {
  const baseURL = request.baseURL || getDefaultBaseURL(request.provider);
  const apiKey = request.apiKey || getAPIKeyFromEnv(request.provider);
  
  if (!apiKey) {
    throw new Error(`API key not found for provider: ${request.provider}`);
  }
  
  const url = `${baseURL}/chat/completions`;
  
  const body = {
    model: request.modelId,
    messages: request.messages || [{ role: 'user', content: request.prompt }],
    temperature: request.temperature ?? 0.7,
    max_tokens: request.maxTokens ?? 2000,
  };
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://core.domoreai.com',
      'X-Title': 'C.O.R.E. Agent System',
    },
    body: JSON.stringify(body),
  });
  
  // Capture all headers
  const headers: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    headers[key] = value;
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    const error: any = new Error(`API call failed: ${response.status} ${response.statusText}`);
    error.status = response.status;
    error.response = { status: response.status, data: errorText };
    error.headers = headers;
    throw error;
  }
  
  const data = await response.json() as any;
  
  return {
    content: data.choices?.[0]?.message?.content || '',
    usage: data.usage ? {
      promptTokens: data.usage.prompt_tokens || 0,
      completionTokens: data.usage.completion_tokens || 0,
      totalTokens: data.usage.total_tokens || 0,
    } : undefined,
    headers,
  };
}

/**
 * Call Google Gemini API
 */
async function callGemini(request: APICallRequest): Promise<APICallResponse> {
  const apiKey = request.apiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  
  if (!apiKey) {
    throw new Error('Gemini API key not found');
  }
  
  // Map generic model names to Gemini-specific ones
  let modelName = request.modelId;
  if (!modelName.startsWith('models/')) {
    modelName = `models/${modelName}`;
  }
  
  const url = `https://generativelanguage.googleapis.com/v1beta/${modelName}:generateContent?key=${apiKey}`;
  
  const body = {
    contents: [{
      parts: [{ text: request.prompt }]
    }],
    generationConfig: {
      temperature: request.temperature ?? 0.7,
      maxOutputTokens: request.maxTokens ?? 2000,
    }
  };
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  
  const headers: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    headers[key] = value;
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    const error: any = new Error(`Gemini API call failed: ${response.status} ${response.statusText}`);
    error.status = response.status;
    error.response = { status: response.status, data: errorText };
    error.headers = headers;
    throw error;
  }
  
  const data = await response.json() as any;
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  
  return {
    content,
    usage: data.usageMetadata ? {
      promptTokens: data.usageMetadata.promptTokenCount || 0,
      completionTokens: data.usageMetadata.candidatesTokenCount || 0,
      totalTokens: data.usageMetadata.totalTokenCount || 0,
    } : undefined,
    headers,
  };
}

/**
 * Call Mistral API
 */
async function callMistral(request: APICallRequest): Promise<APICallResponse> {
  const apiKey = request.apiKey || process.env.MISTRAL_API_KEY;
  
  if (!apiKey) {
    throw new Error('Mistral API key not found');
  }
  
  const url = 'https://api.mistral.ai/v1/chat/completions';
  
  const body = {
    model: request.modelId,
    messages: request.messages || [{ role: 'user', content: request.prompt }],
    temperature: request.temperature ?? 0.7,
    max_tokens: request.maxTokens ?? 2000,
  };
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  
  const headers: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    headers[key] = value;
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    const error: any = new Error(`Mistral API call failed: ${response.status} ${response.statusText}`);
    error.status = response.status;
    error.response = { status: response.status, data: errorText };
    error.headers = headers;
    throw error;
  }
  
  const data = await response.json() as any;
  
  return {
    content: data.choices?.[0]?.message?.content || '',
    usage: data.usage ? {
      promptTokens: data.usage.prompt_tokens || 0,
      completionTokens: data.usage.completion_tokens || 0,
      totalTokens: data.usage.total_tokens || 0,
    } : undefined,
    headers,
  };
}

/**
 * Get default base URL for a provider
 */
function getDefaultBaseURL(provider: string): string {
  const normalized = provider.toLowerCase();
  
  if (normalized.includes('openrouter')) {
    return 'https://openrouter.ai/api/v1';
  }
  if (normalized.includes('groq')) {
    return 'https://api.groq.com/openai/v1';
  }
  if (normalized.includes('together')) {
    return 'https://api.together.xyz/v1';
  }
  
  // Default OpenAI
  return 'https://api.openai.com/v1';
}

/**
 * Get API key from environment based on provider
 */
function getAPIKeyFromEnv(provider: string): string | undefined {
  const normalized = provider.toLowerCase();
  
  if (normalized.includes('openrouter')) {
    return process.env.OPENROUTER_API_KEY;
  }
  if (normalized.includes('groq')) {
    return process.env.GROQ_API_KEY;
  }
  if (normalized.includes('together')) {
    return process.env.TOGETHER_API_KEY;
  }
  if (normalized.includes('openai')) {
    return process.env.OPENAI_API_KEY;
  }
  if (normalized.includes('anthropic')) {
    return process.env.ANTHROPIC_API_KEY;
  }
  if (normalized.includes('gemini') || normalized.includes('google')) {
    return process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  }
  if (normalized.includes('mistral')) {
    return process.env.MISTRAL_API_KEY;
  }
  
  return undefined;
}
