/**
 * LLM Service Interface
 * 
 * Provider-portable interface for LLM operations.
 * All model calls must go through this interface.
 */

export interface LLMRequest {
  model: string;
  messages: LLMMessage[];
  temperature?: number;
  maxTokens?: number;
  jsonSchema?: Record<string, unknown>;
}

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMResponse {
  text: string;
  json?: unknown;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
  meta?: {
    model: string;
    provider: string;
    latency?: number;
  };
}

export interface LLMProvider {
  /**
   * Generate a response from the LLM
   */
  generate(request: LLMRequest): Promise<LLMResponse>;
  
  /**
   * Check if the provider is available
   */
  isAvailable(): Promise<boolean>;
  
  /**
   * Get the provider name
   */
  getName(): string;
}

