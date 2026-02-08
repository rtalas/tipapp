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

export type SubscribeResult =
  | { success: true }
  | { success: false; reason: 'denied' | 'unsupported' | 'error' }

interface PushNotificationHook {
  isSupported: boolean
  permissionState: PushPermissionState
  isSubscribed: boolean
  isLoading: boolean
  subscribe: () => Promise<SubscribeResult>
  unsubscribe: () => Promise<boolean>
}

// Store the service worker registration globally
let swRegistration: ServiceWorkerRegistration | null = null

// Check if we're on iOS
function isIOS(): boolean {
  if (typeof window === 'undefined') return false
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
         (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

// Check if push notifications are supported (safe for SSR)
function checkPushSupport(): boolean {
  if (typeof window === 'undefined') return false

  // Basic support check
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return false
  }

  // iOS-specific checks (iOS 16.4+ required, must be standalone PWA)
  if (isIOS()) {
    // Check if running as standalone PWA
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                         (window.navigator as Navigator & { standalone?: boolean }).standalone === true
    if (!isStandalone) {
      return false
    }
  }

  return true
}

// Get initial permission state (safe for SSR)
function getInitialPermissionState(): PushPermissionState {
  if (typeof window === 'undefined') return 'default'
  if (!checkPushSupport()) return 'unsupported'
  if ('Notification' in window) return Notification.permission as PushPermissionState
  return 'default'
}

// Get initial loading state - only loading if supported (async work needed)
function getInitialLoadingState(): boolean {
  return checkPushSupport()
}

export function usePushNotifications(): PushNotificationHook {
  const [isSupported, setIsSupported] = useState(checkPushSupport)
  const [permissionState, setPermissionState] = useState<PushPermissionState>(getInitialPermissionState)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isLoading, setIsLoading] = useState(getInitialLoadingState)

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
    // Initial values are computed by state initializers, just handle async setup
    if (!isSupported) {
      return
    }

    // In development, service worker is not registered, so check immediately
    if (process.env.NODE_ENV !== 'production') {
      navigator.serviceWorker.getRegistration().then((registration) => {
        if (registration) {
          swRegistration = registration
          checkSubscription()
        } else {
          // No SW in dev mode - mark as unsupported
          setIsSupported(false)
          setIsLoading(false)
        }
      })
      return
    }

    // In production, wait for service worker to be ready
    navigator.serviceWorker.ready.then((registration) => {
      swRegistration = registration
      checkSubscription()
    })
  }, [isSupported, checkSubscription])

  const subscribe = useCallback(async (): Promise<SubscribeResult> => {
    if (!swRegistration || !isSupported) {
      return { success: false, reason: 'unsupported' }
    }

    setIsLoading(true)

    try {
      // Request notification permission if not granted
      if (Notification.permission === 'default') {
        const permission = await Notification.requestPermission()
        setPermissionState(permission as PushPermissionState)
        if (permission !== 'granted') {
          setIsLoading(false)
          return { success: false, reason: 'denied' }
        }
      } else if (Notification.permission === 'denied') {
        setIsLoading(false)
        return { success: false, reason: 'denied' }
      }

      // Get VAPID public key from server
      const response = await fetch('/api/push/subscribe', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        console.error('Failed to get VAPID key:', response.status)
        setIsLoading(false)
        return { success: false, reason: 'error' }
      }

      const { vapidPublicKey } = await response.json()

      if (!vapidPublicKey) {
        console.error('VAPID key not available in response')
        setIsLoading(false)
        return { success: false, reason: 'error' }
      }

      // Check for existing subscription first
      const existingSubscription = await swRegistration.pushManager.getSubscription()
      if (existingSubscription) {
        await existingSubscription.unsubscribe()
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
        console.error('Failed to save subscription to server:', subscribeResponse.status)
        await subscription.unsubscribe()
        setIsLoading(false)
        return { success: false, reason: 'error' }
      }

      setIsSubscribed(true)
      setIsLoading(false)
      return { success: true }
    } catch (error) {
      console.error('Error subscribing to push notifications:', error)
      setIsLoading(false)
      return { success: false, reason: 'error' }
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
    const enableInDev = process.env.NEXT_PUBLIC_ENABLE_SW_DEV === 'true'
    if ('serviceWorker' in navigator && (process.env.NODE_ENV === 'production' || enableInDev)) {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((registration) => {
          swRegistration = registration
        })
        .catch((error) => {
          console.error('SW registration failed:', error)
        })
    }
  }, [])

  return null
}
