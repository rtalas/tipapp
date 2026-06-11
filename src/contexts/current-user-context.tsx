'use client'

import React from 'react'
import { AppError } from '@/lib/error-handler'

export interface CurrentUser {
  id: string
  username: string
  firstName?: string | null
  lastName?: string | null
  avatarUrl?: string | null
}

const CurrentUserContext = React.createContext<CurrentUser | undefined>(undefined)

interface CurrentUserProviderProps {
  user: CurrentUser
  children: React.ReactNode
}

export function CurrentUserProvider({ user, children }: CurrentUserProviderProps) {
  return (
    <CurrentUserContext.Provider value={user}>
      {children}
    </CurrentUserContext.Provider>
  )
}

export function useCurrentUser(): CurrentUser {
  const context = React.useContext(CurrentUserContext)
  if (context === undefined) {
    throw new AppError(
      'useCurrentUser must be used within a CurrentUserProvider',
      'INTERNAL_ERROR',
      500
    )
  }
  return context
}
