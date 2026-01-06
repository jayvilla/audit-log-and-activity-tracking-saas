import { z } from 'zod';

/**
 * Environment variable validation schema for API
 * Validates all required and optional environment variables
 */
export const envSchema = z.object({
  // Database configuration (required)
  DB_HOST: z.string().min(1, 'DB_HOST is required'),
  DB_PORT: z.coerce.number().int().positive('DB_PORT must be a positive integer'),
  DB_USERNAME: z.string().min(1, 'DB_USERNAME is required'),
  DB_PASSWORD: z.string().min(1, 'DB_PASSWORD is required'),
  DB_DATABASE: z.string().min(1, 'DB_DATABASE is required'),
  DB_SSL: z.enum(['true', 'false']).optional().default('false'),

  // Application configuration
  NODE_ENV: z.enum(['development', 'production', 'test']).optional().default('development'),
  PORT: z.coerce.number().int().positive('PORT must be a positive integer').optional().default(8000),

  // Session configuration (required in production, optional in development with warning)
  SESSION_SECRET: z.string().min(1, 'SESSION_SECRET is required').optional(),

  // CORS configuration
  WEB_ORIGIN: z.string().url('WEB_ORIGIN must be a valid URL').optional().default('http://localhost:3000'),

  // Sentry (optional)
  SENTRY_DSN: z.string().url('SENTRY_DSN must be a valid URL').optional(),

  // Rate limiting (optional, with defaults)
  RATE_LIMIT_AUTH_MAX_REQUESTS: z.coerce.number().int().positive().optional().default(5),
  RATE_LIMIT_AUDIT_INGEST_MAX_REQUESTS: z.coerce.number().int().positive().optional().default(300),
  RATE_LIMIT_AUDIT_QUERY_MAX_REQUESTS: z.coerce.number().int().positive().optional().default(60),
  RATE_LIMIT_API_KEY_MANAGEMENT_MAX_REQUESTS: z.coerce.number().int().positive().optional().default(10),

  // API Documentation (optional, enabled by default)
  DOCS_ENABLED: z.enum(['true', 'false']).optional().default('true'),

  // LLM Configuration (DEV ONLY - optional, disabled by default)
  LLM_ENABLED: z.enum(['true', 'false']).optional().default('false'),
  LLM_OLLAMA_BASE_URL: z.string().url('LLM_OLLAMA_BASE_URL must be a valid URL').optional(),
  LLM_DEFAULT_MODEL: z.string().min(1).optional().default('llama3'),
});

export type EnvSchema = z.infer<typeof envSchema>;

/**
 * Validate environment variables and return validated config
 * Throws error with clear messages if validation fails
 */
export function validateEnv(): EnvSchema {
  try {
    const result = envSchema.parse(process.env);
    
    // Additional validation: SESSION_SECRET must be at least 32 chars in production
    if (process.env.NODE_ENV === 'production' && result.SESSION_SECRET && result.SESSION_SECRET.length < 32) {
      throw new Error(
        '❌ SESSION_SECRET must be at least 32 characters in production for security.\n' +
        '   Please generate a secure random string (e.g., using `openssl rand -base64 32`).'
      );
    }
    
    return result;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.issues.map((err) => {
        const path = err.path.join('.');
        return `  - ${path}: ${err.message}`;
      }).join('\n');

      throw new Error(
        `❌ Environment variable validation failed:\n${errors}\n\n` +
        'Please check your .env file and ensure all required variables are set correctly.'
      );
    }
    throw error;
  }
}

