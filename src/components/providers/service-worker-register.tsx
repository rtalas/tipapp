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
      console.log('Push notifications require installing the app to home screen on iOS')
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

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!swRegistration || !isSupported) {
      console.error('Push notifications not supported:', { swRegistration: !!swRegistration, isSupported })
      return false
    }

    setIsLoading(true)

    try {
      // Log current state
      console.log('Starting subscription process...')
      console.log('Current permission:', Notification.permission)
      console.log('SW ready:', swRegistration.active ? 'Yes' : 'No')
      console.log('Is iOS:', isIOS())
      console.log('Is standalone:', window.matchMedia('(display-mode: standalone)').matches)

      // Request notification permission if not granted
      if (Notification.permission === 'default') {
        console.log('Requesting notification permission...')
        const permission = await Notification.requestPermission()
        console.log('Permission result:', permission)
        setPermissionState(permission as PushPermissionState)
        if (permission !== 'granted') {
          console.warn('Notification permission not granted:', permission)
          setIsLoading(false)
          return false
        }
      } else if (Notification.permission === 'denied') {
        console.error('Notification permission denied. User must reset in browser settings.')
        setIsLoading(false)
        return false
      } else if (Notification.permission === 'granted') {
        console.log('Permission already granted, proceeding with subscription...')
      }

      // Get VAPID public key from server
      console.log('Fetching VAPID key from server...')
      const response = await fetch('/api/push/subscribe', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Failed to get VAPID key:', response.status, errorText)
        setIsLoading(false)
        return false
      }

      const { vapidPublicKey } = await response.json()
      console.log('VAPID key received:', vapidPublicKey ? 'Yes' : 'No')

      if (!vapidPublicKey) {
        console.error('VAPID key not available in response')
        setIsLoading(false)
        return false
      }

      // Check for existing subscription first
      const existingSubscription = await swRegistration.pushManager.getSubscription()
      if (existingSubscription) {
        console.log('Unsubscribing from existing subscription...')
        await existingSubscription.unsubscribe()
      }

      // Subscribe to push notifications
      console.log('Subscribing to push notifications...')
      const subscription = await swRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      })
      console.log('Push subscription successful:', subscription.endpoint.substring(0, 50) + '...')

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
        const errorText = await subscribeResponse.text()
        console.error('Failed to save subscription to server:', subscribeResponse.status, errorText)
        await subscription.unsubscribe()
        setIsLoading(false)
        return false
      }

      setIsSubscribed(true)
      setIsLoading(false)
      return true
    } catch (error) {
      console.error('Error subscribing to push notifications:', error)

      // Provide specific error details
      if (error instanceof Error) {
        console.error('Error name:', error.name)
        console.error('Error message:', error.message)

        // Check for specific error types
        if (error.name === 'NotAllowedError') {
          console.error('NotAllowedError: This can happen if:')
          console.error('1. User denied permission')
          console.error('2. App is not in standalone mode on iOS')
          console.error('3. Service worker scope issues')
          console.error('4. Permission was revoked')

          // Check current permission state
          console.error('Current permission:', Notification.permission)
          console.error('Is standalone:', window.matchMedia('(display-mode: standalone)').matches)
          console.error('SW registration scope:', swRegistration?.scope)
        } else if (error.name === 'NotSupportedError') {
          console.error('Push notifications are not supported on this device/browser')
        } else if (error.name === 'AbortError') {
          console.error('Subscription was aborted, possibly due to another pending subscription')
        }
      }

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
        .register('/sw.js', { scope: '/' })
        .then((registration) => {
          swRegistration = registration
          console.log('SW registered:', registration.scope)
          console.log('SW active:', registration.active ? 'Yes' : 'No')
          console.log('SW installing:', registration.installing ? 'Yes' : 'No')

          // Wait for service worker to be ready
          if (!registration.active && registration.installing) {
            console.log('Waiting for SW to activate...')
            registration.installing.addEventListener('statechange', (e) => {
              const sw = e.target as ServiceWorker
              console.log('SW state changed to:', sw.state)
            })
          }
        })
        .catch((error) => {
          console.error('SW registration failed:', error)
        })
    }
  }, [])

  return null
}
