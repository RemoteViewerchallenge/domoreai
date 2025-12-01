import { GoogleGenAI, GenerateContentParameters, Part } from '@google/genai';
import { BaseLLMProvider, CompletionRequest, LLMModel } from './BaseLLMProvider.js';

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
      { id: 'gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash Exp', contextWindow: 1000000, isFree: true, providerId: this.id },
      { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', contextWindow: 1000000, isFree: true, providerId: this.id },
      { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', contextWindow: 2000000, isFree: false, providerId: this.id },
      // ... others
    ];
  }

  private formatMessages(messages: any[]): { systemInstruction?: string, contents: any[] } {
    let systemInstruction: string | undefined;
    const contents: any[] = [];

    // 1. Extract System Prompt (if any)
    const systemMessages = messages.filter(m => m.role === 'system');
    if (systemMessages.length > 0) {
      systemInstruction = systemMessages.map(m => m.content).join('\n');
    }

    // 2. Format User/Assistant Messages
    let isFirstUserMessage = true;
    
    for (const msg of messages) {
      if (msg.role === 'system') continue; // Handled above

      let content = msg.content;
      
      // Merge system prompt into first user message
      if (isFirstUserMessage && msg.role === 'user' && systemInstruction) {
        content = `${systemInstruction}\n\n${content}`;
        systemInstruction = undefined; // Clear it so we don't use it again
        isFirstUserMessage = false;
      } else if (msg.role === 'user') {
        isFirstUserMessage = false;
      }

      contents.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: content }]
      });
    }
    
    return { contents };
  }

  async generateCompletion(request: CompletionRequest): Promise<string> {
    const { contents } = this.formatMessages(request.messages);

    const params: GenerateContentParameters = { 
      model: request.modelId,
      contents: contents,
      config: {
        temperature: request.temperature,
        maxOutputTokens: request.max_tokens,
      },
    };

    try {
      const response = await this.client.models.generateContent(params);
      return response.text || "";
    } catch (error: any) {
      console.error("GoogleGenAIProvider Error:", error);
      throw error;
    }
  }
}
