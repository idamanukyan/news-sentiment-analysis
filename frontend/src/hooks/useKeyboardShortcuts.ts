import { useEffect, useRef, useCallback } from 'react'

export interface ShortcutConfig {
  key: string // e.g., 'g d', '?', 'ctrl+k', 'escape'
  action: () => void
  description: string
  category: 'navigation' | 'global' | 'action'
}

// Check if the active element is an input field
function isInputElement(element: Element | null): boolean {
  if (!element) return false
  const tagName = element.tagName.toLowerCase()
  if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') {
    return true
  }
  if (element.getAttribute('contenteditable') === 'true') {
    return true
  }
  return false
}

// Parse a shortcut key string into components
function parseShortcut(key: string): {
  modifiers: { ctrl: boolean; meta: boolean; shift: boolean; alt: boolean }
  keys: string[]
} {
  const parts = key.toLowerCase().split('+').map(p => p.trim())
  const modifiers = {
    ctrl: parts.includes('ctrl'),
    meta: parts.includes('meta') || parts.includes('cmd'),
    shift: parts.includes('shift'),
    alt: parts.includes('alt'),
  }

  // Filter out modifiers to get the actual keys
  const keys = parts.filter(p => !['ctrl', 'meta', 'cmd', 'shift', 'alt'].includes(p))

  // Handle space-separated sequences like 'g d'
  if (keys.length === 1 && keys[0].includes(' ')) {
    return { modifiers, keys: keys[0].split(' ').map(k => k.trim()) }
  }

  return { modifiers, keys }
}

export function useKeyboardShortcuts(shortcuts: ShortcutConfig[]) {
  const pendingKeyRef = useRef<string | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const activeElement = document.activeElement
    const isInInput = isInputElement(activeElement)

    // Always allow Escape
    if (e.key === 'Escape') {
      const escapeShortcut = shortcuts.find(s => s.key.toLowerCase() === 'escape')
      if (escapeShortcut) {
        escapeShortcut.action()
      }
      return
    }

    // Skip other shortcuts when in input fields
    if (isInInput) {
      return
    }

    // Get the pressed key
    const pressedKey = e.key.toLowerCase()

    // Check each shortcut
    for (const shortcut of shortcuts) {
      const { modifiers, keys } = parseShortcut(shortcut.key)

      // Check modifier combinations (e.g., ctrl+k)
      const hasModifier = modifiers.ctrl || modifiers.meta || modifiers.shift || modifiers.alt
      if (hasModifier) {
        const ctrlMatch = !modifiers.ctrl || e.ctrlKey
        const metaMatch = !modifiers.meta || e.metaKey
        const shiftMatch = !modifiers.shift || e.shiftKey
        const altMatch = !modifiers.alt || e.altKey

        if (ctrlMatch && metaMatch && shiftMatch && altMatch && keys.length === 1 && pressedKey === keys[0]) {
          e.preventDefault()
          shortcut.action()
          return
        }
        continue
      }

      // Handle two-key sequences (e.g., 'g d')
      if (keys.length === 2) {
        if (pendingKeyRef.current === keys[0] && pressedKey === keys[1]) {
          // Complete the sequence
          e.preventDefault()
          pendingKeyRef.current = null
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current)
            timeoutRef.current = null
          }
          shortcut.action()
          return
        }

        // Start a new sequence
        if (pressedKey === keys[0] && !pendingKeyRef.current) {
          pendingKeyRef.current = pressedKey
          // Reset after 500ms
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current)
          }
          timeoutRef.current = setTimeout(() => {
            pendingKeyRef.current = null
            timeoutRef.current = null
          }, 500)
          return
        }
        continue
      }

      // Handle single key shortcuts (e.g., '?')
      if (keys.length === 1 && pressedKey === keys[0]) {
        // Handle shift for '?' (which is shift + /)
        if (keys[0] === '?' && !e.shiftKey) continue

        e.preventDefault()
        shortcut.action()
        return
      }
    }

    // Reset pending key if we pressed something else
    if (pendingKeyRef.current && !shortcuts.some(s => {
      const { keys } = parseShortcut(s.key)
      return keys.length === 2 && keys[0] === pendingKeyRef.current
    })) {
      pendingKeyRef.current = null
    }
  }, [shortcuts])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [handleKeyDown])
}

// Export shortcut definitions for the help modal
export const SHORTCUT_DEFINITIONS: Omit<ShortcutConfig, 'action'>[] = [
  // Navigation
  { key: 'g d', description: 'Go to Dashboard', category: 'navigation' },
  { key: 'g n', description: 'Go to News', category: 'navigation' },
  { key: 'g b', description: 'Go to Bookmarks', category: 'navigation' },
  { key: 'g r', description: 'Go to Narratives', category: 'navigation' },
  { key: 'g a', description: 'Go to Alerts', category: 'navigation' },
  { key: 'g t', description: 'Go to Team', category: 'navigation' },
  { key: 'g s', description: 'Go to Sources', category: 'navigation' },
  { key: 'g p', description: 'Go to Topics', category: 'navigation' },
  { key: 'g e', description: 'Go to Reports', category: 'navigation' },
  { key: 'g ,', description: 'Go to Settings', category: 'navigation' },
  // Global
  { key: 'ctrl+k', description: 'Open search', category: 'global' },
  { key: '?', description: 'Show keyboard shortcuts', category: 'global' },
  { key: 'escape', description: 'Close modal / dialog', category: 'global' },
]
