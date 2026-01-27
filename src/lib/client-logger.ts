/**
 * Client-side logging service
 * Centralized logging for client-side errors, warnings, and info
 * Can be extended to send logs to external service (Sentry, LogRocket, etc.)
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogEntry {
  level: LogLevel
  message: string
  context?: Record<string, unknown>
  timestamp: string
  userAgent?: string
  url?: string
}

/**
 * Client-side logger
 * In development: logs to console
 * In production: can be extended to send to logging service
 */
export const logger = {
  debug: (message: string, context?: Record<string, unknown>) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[DEBUG] ${message}`, context || {})
    }
    captureLog('debug', message, context)
  },

  info: (message: string, context?: Record<string, unknown>) => {
    if (process.env.NODE_ENV === 'development') {
      console.info(`[INFO] ${message}`, context || {})
    }
    captureLog('info', message, context)
  },

  warn: (message: string, context?: Record<string, unknown>) => {
    console.warn(`[WARN] ${message}`, context || {})
    captureLog('warn', message, context)
  },

  error: (message: string, context?: Record<string, unknown>) => {
    console.error(`[ERROR] ${message}`, context || {})
    captureLog('error', message, context)
  },
}

/**
 * Capture logs for external service integration
 * Currently stores in sessionStorage, can be extended to send to backend
 */
function captureLog(level: LogLevel, message: string, context?: Record<string, unknown>) {
  const entry: LogEntry = {
    level,
    message,
    context,
    timestamp: new Date().toISOString(),
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
    url: typeof window !== 'undefined' ? window.location.href : undefined,
  }

  // Store in sessionStorage for debugging (max 50 entries)
  try {
    if (typeof sessionStorage !== 'undefined') {
      const logs = JSON.parse(sessionStorage.getItem('_app_logs') || '[]')
      logs.push(entry)
      if (logs.length > 50) logs.shift()
      sessionStorage.setItem('_app_logs', JSON.stringify(logs))
    }
  } catch {
    // Silently fail if sessionStorage is unavailable
  }

  // TODO: In production, send to external logging service:
  // await fetch('/api/logs', { method: 'POST', body: JSON.stringify(entry) })
}

