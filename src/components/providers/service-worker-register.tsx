'use client'

import { useEffect, useCallback, useState } from 'react'

// Convert VAPID key from base64url to Uint8Array
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const buffer = new ArrayBuffer(rawData.length)
  const outputArray = new Uint8Array(buffer)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export type PushPermissionState = 'granted' | 'denied' | 'default' | 'unsupported'

interface PushNotificationHook {
  isSupported: boolean
  permissionState: PushPermissionState
  isSubscribed: boolean
  isLoading: boolean
  subscribe: () => Promise<boolean>
  unsubscribe: () => Promise<boolean>
}

// Store the service worker registration globally
let swRegistration: ServiceWorkerRegistration | null = null

export function usePushNotifications(): PushNotificationHook {
  const [isSupported, setIsSupported] = useState(false)
  const [permissionState, setPermissionState] = useState<PushPermissionState>('default')
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Check current subscription status
  const checkSubscription = useCallback(async () => {
    if (!swRegistration) {
      setIsLoading(false)
      return
    }

    try {
      const subscription = await swRegistration.pushManager.getSubscription()
      setIsSubscribed(!!subscription)
    } catch (error) {
      console.error('Error checking subscription:', error)
    }
    setIsLoading(false)
  }, [])

  useEffect(() => {
    // Check if push notifications are supported
    const supported = 'serviceWorker' in navigator && 'PushManager' in window
    setIsSupported(supported)

    if (!supported) {
      setPermissionState('unsupported')
      setIsLoading(false)
      return
    }

    // Check permission state
    if ('Notification' in window) {
      setPermissionState(Notification.permission as PushPermissionState)
    }

    // Wait for service worker to be ready
    navigator.serviceWorker.ready.then((registration) => {
      swRegistration = registration
      checkSubscription()
    })
  }, [checkSubscription])

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!swRegistration || !isSupported) return false

    setIsLoading(true)

    try {
      // Request notification permission if not granted
      if (Notification.permission === 'default') {
        const permission = await Notification.requestPermission()
        setPermissionState(permission as PushPermissionState)
        if (permission !== 'granted') {
          setIsLoading(false)
          return false
        }
      } else if (Notification.permission === 'denied') {
        setIsLoading(false)
        return false
      }

      // Get VAPID public key from server
      const response = await fetch('/api/push/subscribe')
      if (!response.ok) {
        console.error('Failed to get VAPID key')
        setIsLoading(false)
        return false
      }

      const { vapidPublicKey } = await response.json()
      if (!vapidPublicKey) {
        console.error('VAPID key not available')
        setIsLoading(false)
        return false
      }

      // Subscribe to push notifications
      const subscription = await swRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      })

      // Send subscription to server
      const subscribeResponse = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          keys: {
            p256dh: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('p256dh')!))),
            auth: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('auth')!))),
          },
        }),
      })

      if (!subscribeResponse.ok) {
        // Rollback subscription on server error
        await subscription.unsubscribe()
        console.error('Failed to save subscription to server')
        setIsLoading(false)
        return false
      }

      setIsSubscribed(true)
      setIsLoading(false)
      return true
    } catch (error) {
      console.error('Error subscribing to push notifications:', error)
      setIsLoading(false)
      return false
    }
  }, [isSupported])

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!swRegistration) return false

    setIsLoading(true)

    try {
      const subscription = await swRegistration.pushManager.getSubscription()

      if (subscription) {
        // Notify server
        await fetch('/api/push/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        })

        // Unsubscribe from browser
        await subscription.unsubscribe()
      }

      setIsSubscribed(false)
      setIsLoading(false)
      return true
    } catch (error) {
      console.error('Error unsubscribing from push notifications:', error)
      setIsLoading(false)
      return false
    }
  }, [])

  return {
    isSupported,
    permissionState,
    isSubscribed,
    isLoading,
    subscribe,
    unsubscribe,
  }
}

export function ServiceWorkerRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          swRegistration = registration
          console.log('SW registered:', registration.scope)
        })
        .catch((error) => {
          console.log('SW registration failed:', error)
        })
    }
  }, [])

  return null
}
