import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LLMProvider, LLMRequest, LLMResponse } from '../interfaces/llm.interface';

/**
 * Ollama Provider Adapter
 * 
 * Implements LLMProvider interface for Ollama API.
 * This is the ONLY file that should import/use Ollama-specific code.
 */
@Injectable()
export class OllamaProvider implements LLMProvider {
  private readonly logger = new Logger(OllamaProvider.name);
  private readonly baseUrl: string;
  private readonly defaultModel: string;
  private readonly timeout: number = 120000; // 120 seconds (2 minutes) - LLM generation can take time

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = this.configService.get<string>('LLM_OLLAMA_BASE_URL', 'http://localhost:11434');
    this.defaultModel = this.configService.get<string>('LLM_DEFAULT_MODEL', 'llama3');
    
    // Log the configured base URL for debugging
    this.logger.log(`Ollama provider initialized with base URL: ${this.baseUrl}`);
  }

  getName(): string {
    return 'ollama';
  }

  async isAvailable(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const url = `${this.baseUrl}/api/tags`;
      this.logger.debug(`Checking Ollama availability at: ${url}`);

      const response = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      
      if (!response.ok) {
        this.logger.warn(`Ollama availability check returned ${response.status}: ${response.statusText}`);
        return false;
      }

      // Check if the model is actually available
      const data = await response.json() as { models?: Array<{ name?: string }> };
      const models = data.models || [];
      const modelExists = models.some((m) => 
        m.name === this.defaultModel || m.name?.includes(this.defaultModel)
      );

      if (!modelExists) {
        this.logger.warn(`Model ${this.defaultModel} not found in Ollama. Available models: ${models.map((m) => m.name || 'unknown').join(', ')}`);
        return false;
      }

      this.logger.debug(`Ollama is available at: ${url} with model ${this.defaultModel}`);
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorName = error instanceof Error ? error.name : 'Unknown';
      
      this.logger.warn(`Ollama availability check failed: ${errorName} - ${errorMessage}`, {
        baseUrl: this.baseUrl,
        error: errorMessage,
      });
      return false;
    }
  }

  async generate(request: LLMRequest): Promise<LLMResponse> {
    const model = request.model || this.defaultModel;
    const startTime = Date.now();

    // Use request timeout if provided, otherwise use default
    const timeout = request.maxTokens ? Math.max(this.timeout, 60000) : this.timeout;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      this.logger.debug(`Generating LLM response with timeout: ${timeout}ms, model: ${model}`);

      // Convert messages to Ollama format
      const ollamaMessages = request.messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      const requestBody: {
        model: string;
        messages: Array<{ role: string; content: string }>;
        options: {
          temperature: number;
          num_predict?: number;
        };
        format?: string;
        stream?: boolean;
      } = {
        model,
        messages: ollamaMessages,
        options: {
          temperature: request.temperature ?? 0.7,
          num_predict: request.maxTokens,
        },
        stream: false, // Explicitly disable streaming
      };

      if (request.jsonSchema) {
        requestBody.format = 'json';
      }

      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
        body: JSON.stringify(requestBody),
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`Ollama API error: ${response.status} ${errorText}`);
      }

      // Parse response - Ollama /api/chat returns JSON directly
      let data: {
        message?: { content?: string; role?: string };
        response?: string;
        prompt_eval_count?: number;
        eval_count?: number;
        done?: boolean;
      } | null = null;
      
      try {
        const responseText = await response.text();
        this.logger.debug('Ollama response received', {
          status: response.status,
          contentType: response.headers.get('content-type'),
          textLength: responseText.length,
          textPreview: responseText.substring(0, 300),
        });
        
        try {
          data = JSON.parse(responseText);
        } catch (parseError) {
          // If the response isn't valid JSON, try to extract JSON from it
          this.logger.warn('Ollama response is not valid JSON, attempting to extract JSON', {
            error: parseError instanceof Error ? parseError.message : 'Unknown error',
            responsePreview: responseText.substring(0, 500),
          });
          
          const jsonMatch = responseText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            try {
              data = JSON.parse(jsonMatch[0]);
            } catch (innerError) {
            this.logger.error('Failed to parse Ollama response as JSON', {
              error: innerError instanceof Error ? innerError.message : 'Unknown error',
              responsePreview: responseText.substring(0, 500),
              responseLength: responseText.length,
              firstChars: responseText.substring(0, 100),
              lastChars: responseText.substring(Math.max(0, responseText.length - 100)),
            });
            // Don't throw - instead, try to continue with text only
            this.logger.warn('Continuing without JSON parsing, using raw text response');
            data = {
              message: { content: responseText },
              response: responseText,
            };
            }
          } else {
            // No JSON found - use the raw text as the response
            this.logger.warn('No JSON found in Ollama response, using raw text', {
              responsePreview: responseText.substring(0, 500),
            });
            data = {
              message: { content: responseText },
              response: responseText,
            };
          }
        }
      } catch (error) {
        // If we already set data, continue
        if (data) {
          this.logger.warn('Error during parsing but data was extracted, continuing', {
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        } else {
          // Otherwise wrap it
          this.logger.error('Unexpected error parsing Ollama response', {
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          throw new Error(`Failed to parse Ollama response: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Ensure data is set
      if (!data) {
        throw new Error('Failed to parse Ollama response: no data extracted');
      }

      const latency = Date.now() - startTime;

      // Extract response text
      const text = data.message?.content || data.response || '';

      // Parse JSON if format was requested
      let json: unknown = undefined;
      if (request.jsonSchema && text) {
        try {
          // Clean the text - remove markdown code blocks if present
          let textToParse = text.trim();
          if (textToParse.startsWith('```')) {
            const codeBlockMatch = textToParse.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
            if (codeBlockMatch) {
              textToParse = codeBlockMatch[1].trim();
            }
          }
          
          // Extract JSON object if there's extra text
          const jsonMatch = textToParse.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            textToParse = jsonMatch[0];
          }
          
          json = JSON.parse(textToParse);
        } catch (parseError) {
          this.logger.warn('Failed to parse JSON response from Ollama', {
            error: parseError instanceof Error ? parseError.message : 'Unknown error',
            textPreview: text.substring(0, 200),
          });
        }
      }

      return {
        text,
        json,
        usage: {
          promptTokens: data.prompt_eval_count,
          completionTokens: data.eval_count,
          totalTokens: (data.prompt_eval_count || 0) + (data.eval_count || 0),
        },
        meta: {
          model,
          provider: 'ollama',
          latency,
        },
      };
    } catch (error) {
      const latency = Date.now() - startTime;
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`LLM request timeout after ${this.timeout}ms`);
      }

      this.logger.error(`Ollama generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`, {
        model,
        latency,
      });

      throw error;
    }
  }
}

