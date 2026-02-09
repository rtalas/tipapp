'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'

export function NavigationProgress() {
  const pathname = usePathname()
  const [state, setState] = useState<'idle' | 'loading' | 'completing'>('idle')
  const prevPathname = useRef(pathname)

  useEffect(() => {
    if (pathname !== prevPathname.current) {
      // New pathname arrived — complete the animation
      setState('completing')
      const timeout = setTimeout(() => {
        setState('idle')
      }, 300)
      prevPathname.current = pathname
      return () => clearTimeout(timeout)
    }
  }, [pathname])

  // Start loading on click of any internal link
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const anchor = (e.target as HTMLElement).closest('a')
      if (!anchor) return
      const href = anchor.getAttribute('href')
      if (!href || href.startsWith('http') || href.startsWith('#')) return
      // Only trigger for internal navigation that will change the path
      if (href !== pathname) {
        setState('loading')
      }
    }

    document.addEventListener('click', handleClick, { capture: true })
    return () => document.removeEventListener('click', handleClick, { capture: true })
  }, [pathname])

  if (state === 'idle') return null

  return (
    <div className="fixed top-0 left-0 right-0 z-[60] h-0.5">
      <div
        className={
          state === 'loading'
            ? 'h-full bg-primary transition-all duration-[2000ms] ease-out w-[80%]'
            : 'h-full bg-primary transition-all duration-200 ease-in w-full opacity-0'
        }
      />
    </div>
  )
}
