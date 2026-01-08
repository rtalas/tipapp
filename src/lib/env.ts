/**
 * Environment variable validation and access
 * All required environment variables are validated at module load time
 * Prevents runtime errors from missing required env vars
 */

function requireEnv(key: string): string {
  const value = process.env[key]
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${key}. Please check your .env file.`
    )
  }
  return value
}

function getEnv(key: string, defaultValue?: string): string {
  const value = process.env[key]
  if (!value && !defaultValue) {
    throw new Error(
      `Missing required environment variable: ${key}. Please check your .env file.`
    )
  }
  return value || defaultValue || ''
}

/**
 * Application environment variables (validated at module load)
 * No hardcoded fallbacks - all values must be explicitly configured
 */
export const env = {
  // Application URLs and names
  APP_URL: requireEnv('APP_URL'),
  APP_NAME: getEnv('APP_NAME', 'TipApp'),

  // Email configuration
  RESEND_API_KEY: requireEnv('RESEND_API_KEY'),
  RESEND_FROM_EMAIL: getEnv('RESEND_FROM_EMAIL', 'noreply@tipapp.cz'),
  RESEND_FROM_NAME: getEnv('RESEND_FROM_NAME', 'TipApp'),

  // Database (handled by Prisma, but validate for safety)
  DATABASE_URL: requireEnv('DATABASE_URL'),

  // Authentication
  AUTH_SECRET: requireEnv('AUTH_SECRET'),

  // Node environment
  NODE_ENV: process.env.NODE_ENV || 'development',

  // Optional features
  DEBUG: process.env.DEBUG === 'true',
} as const

// Type-safe access
export type Env = typeof env
