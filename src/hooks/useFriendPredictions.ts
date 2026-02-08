import { useState } from 'react'
import { toast } from 'sonner'
import { logger } from '@/lib/logging/client-logger'

interface UseFriendPredictionsOptions<T> {
  isLocked: boolean
  entityId: number
  entityName: string
  fetchPredictions: (id: number) => Promise<{ predictions: T[] }>
  errorToast: string
}

export function useFriendPredictions<T>({
  isLocked,
  entityId,
  entityName,
  fetchPredictions,
  errorToast,
}: UseFriendPredictionsOptions<T>) {
  const [showModal, setShowModal] = useState(false)
  const [predictions, setPredictions] = useState<T[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const open = async () => {
    setShowModal(true)
    if (isLocked && predictions.length === 0) {
      setIsLoading(true)
      try {
        const result = await fetchPredictions(entityId)
        setPredictions(result.predictions)
      } catch (error) {
        logger.error('Failed to load friend predictions', {
          error: error instanceof Error ? error.message : String(error),
          [`${entityName}Id`]: entityId,
        })
        toast.error(errorToast)
      } finally {
        setIsLoading(false)
      }
    }
  }

  return { showModal, setShowModal, predictions, isLoading, open }
}
