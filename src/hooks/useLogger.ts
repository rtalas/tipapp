/**
 * React hook for client-side logging
 * Provides logging methods for components
 */

'use client'

import { logger, type LogLevel } from '@/lib/client-logger'

/**
 * Hook to use logger in React components
 * Usage:
 * ```tsx
 * const { log } = useLogger()
 * log.info('User clicked submit', { userId: 123 })
 * ```
 */
export function useLogger() {
  return {
    log: logger,

    // Convenience methods with component name prefix
    info: (message: string, context?: Record<string, unknown>) => {
      logger.info(message, context)
    },

    warn: (message: string, context?: Record<string, unknown>) => {
      logger.warn(message, context)
    },

    error: (message: string, context?: Record<string, unknown>) => {
      logger.error(message, context)
    },

    debug: (message: string, context?: Record<string, unknown>) => {
      logger.debug(message, context)
    },
  }
}

/**
 * Async action wrapper with logging
 * Automatically logs success and errors
 */
export function useActionLogger() {
  return {
    async executeAction<T>(
      action: () => Promise<T>,
      actionName: string,
    ): Promise<T | null> {
      try {
        logger.debug(`Starting action: ${actionName}`)
        const result = await action()
        logger.info(`Action completed: ${actionName}`)
        return result
      } catch (error) {
        logger.error(`Action failed: ${actionName}`, {
          error: error instanceof Error ? error.message : String(error),
        })
        throw error
      }
    },
  }
}
