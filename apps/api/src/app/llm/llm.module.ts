import { Module } from '@nestjs/common';
import { LLMService } from './llm.service';
import { OllamaProvider } from './providers/ollama.provider';

/**
 * LLM Module
 * 
 * Provides provider-portable LLM services.
 * All LLM operations must go through LLMService.
 */
@Module({
  providers: [LLMService, OllamaProvider],
  exports: [LLMService],
})
export class LLMModule {}

