import { GoogleGenAI, GenerateContentParameters, Part } from '@google/genai';
import { BaseLLMProvider, CompletionRequest, LLMModel } from './BaseLLMProvider.js';

// Convert our standard message format to Google's Part format
function toGoogleParts(messages: any[]): Part[] {
  // Simple concatenation for now, as the SDK handles role mapping in chat sessions usually,
  // but for single generation, we might just want the text.
  // However, for a chat-like structure, we might need to format differently.
  // The user provided snippet just maps content to text.
  return messages.map(msg => ({ text: msg.content }));
}

export class GoogleGenAIProvider implements BaseLLMProvider {
  id: string;
  private client: GoogleGenAI;
  private projectConfig: { projectId?: string, location?: string } = {};

  constructor(config: { id: string; apiKey: string; baseURL?: string; projectId?: string; location?: string }) {
    this.id = config.id;
    
    // Initialize the new unified client
    this.client = new GoogleGenAI({
      apiKey: config.apiKey, // Used for AI Studio / simplest API key auth
      // The SDK automatically uses GOOGLE_CLOUD_PROJECT/LOCATION env vars if set,
      // or falls back to API Key.
    });

    this.projectConfig.projectId = config.projectId;
    this.projectConfig.location = config.location;
  }

  setUsageCollector(collector: any) {
    // Implement if needed for sniffing headers (Google doesn't usually use headers)
  }

  async getModels(): Promise<LLMModel[]> {
    // NOTE: Gemini API models are hardcoded or fetched differently than OpenAI.
    // For simplicity, we hardcode the most common models.
    return [
      { id: 'gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash Exp', contextWindow: 1000000, isFree: true },
      { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', contextWindow: 1000000, isFree: true },
      { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', contextWindow: 2000000, isFree: false },
      // ... others
    ];
  }

  async generateCompletion(request: CompletionRequest): Promise<string> {
    // The SDK types might have changed slightly, verifying GenerateContentParameters vs GenerateContentRequest
    // The user snippet used GenerateContentParameters. I will use what was requested but keep in mind type safety.
    
    const params: GenerateContentParameters = { 
      model: request.modelId,
      contents: toGoogleParts(request.messages),
      config: {
        // Map our CompletionRequest to the GenAI SDK config
        temperature: request.temperature,
        maxOutputTokens: request.max_tokens,
      },
    };

    const response = await this.client.models.generateContent(params);
    
    // Ensure response.text is treated as string, handling potential undefined if needed, 
    // though the type error said "possibly undefined", usually we expect text.
    return response.text || "";
  }
}
