import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LLMProvider, LLMRequest, LLMResponse } from './interfaces/llm.interface';
import { OllamaProvider } from './providers/ollama.provider';

/**
 * LLM Service
 * 
 * Provider-portable service that routes requests to the appropriate provider
 * based on model name. This is the single entry point for all LLM operations.
 */
@Injectable()
export class LLMService {
  private readonly logger = new Logger(LLMService.name);
  private readonly providers: Map<string, LLMProvider> = new Map();
  private readonly defaultModel: string;
  private readonly enabled: boolean;

  constructor(
    private readonly configService: ConfigService,
    private readonly ollamaProvider: OllamaProvider,
  ) {
    // Register providers
    this.providers.set('ollama', ollamaProvider);
    
    // Register model-to-provider mappings
    // Models starting with 'llama' or 'ollama' route to Ollama
    this.providers.set('llama3', ollamaProvider);
    this.providers.set('llama2', ollamaProvider);
    this.providers.set('llama', ollamaProvider);

    this.defaultModel = this.configService.get<string>('LLM_DEFAULT_MODEL', 'llama3');
    
    // Feature gating: disabled by default unless explicitly enabled
    const llmEnabled = this.configService.get<string>('LLM_ENABLED', 'false');
    this.enabled = llmEnabled === 'true';
  }

  /**
   * Check if LLM features are enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Get the provider for a given model
   */
  private getProviderForModel(model: string): LLMProvider {
    // Direct provider match
    if (this.providers.has(model)) {
      return this.providers.get(model)!;
    }

    // Model name patterns
    if (model.startsWith('llama') || model.startsWith('ollama')) {
      return this.ollamaProvider;
    }

    // Default to Ollama if no match
    return this.ollamaProvider;
  }

  /**
   * Generate a response from the LLM
   * 
   * This is the main entry point for all LLM operations.
   * It routes requests to the appropriate provider based on model name.
   * 
   * @param request - LLM request
   * @param allowAdminOverride - DEV ONLY: Allow admin@example.com to bypass enabled check
   */
  async generate(request: LLMRequest, allowAdminOverride = false): Promise<LLMResponse> {
    if (!this.isEnabled() && !allowAdminOverride) {
      throw new ServiceUnavailableException('LLM features are disabled');
    }

    const model = request.model || this.defaultModel;
    const provider = this.getProviderForModel(model);
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    this.logger.log(`LLM request: ${requestId}`, {
      requestId,
      model,
      provider: provider.getName(),
      messageCount: request.messages.length,
    });

    try {
      // Check provider availability
      const isAvailable = await provider.isAvailable();
      if (!isAvailable) {
        throw new ServiceUnavailableException(
          `LLM provider ${provider.getName()} is not available`
        );
      }

      const response = await provider.generate({
        ...request,
        model,
      });

      this.logger.log(`LLM response: ${requestId}`, {
        requestId,
        model,
        provider: provider.getName(),
        latency: response.meta?.latency,
        tokens: response.usage?.totalTokens,
      });

      return response;
    } catch (error) {
      this.logger.error(`LLM error: ${requestId}`, {
        requestId,
        model,
        provider: provider.getName(),
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw error;
    }
  }
}

