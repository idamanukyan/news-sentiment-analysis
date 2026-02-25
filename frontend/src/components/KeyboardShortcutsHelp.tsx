import { X, Keyboard } from 'lucide-react'
import { SHORTCUT_DEFINITIONS } from '../hooks/useKeyboardShortcuts'

interface KeyboardShortcutsHelpProps {
  isOpen: boolean
  onClose: () => void
}

function formatKey(key: string): React.ReactNode {
  // Handle two-key sequences
  if (key.includes(' ')) {
    const parts = key.split(' ')
    return (
      <>
        {parts.map((part, i) => (
          <span key={i}>
            <kbd className="kbd">{part.toUpperCase()}</kbd>
            {i < parts.length - 1 && <span className="text-gray-400 mx-1">then</span>}
          </span>
        ))}
      </>
    )
  }

  // Handle modifier combinations
  if (key.includes('+')) {
    const parts = key.split('+')
    return (
      <>
        {parts.map((part, i) => (
          <span key={i}>
            <kbd className="kbd">
              {part === 'ctrl' ? (navigator.platform.includes('Mac') ? '⌃' : 'Ctrl') :
               part === 'meta' || part === 'cmd' ? '⌘' :
               part === 'shift' ? '⇧' :
               part === 'alt' ? (navigator.platform.includes('Mac') ? '⌥' : 'Alt') :
               part.toUpperCase()}
            </kbd>
            {i < parts.length - 1 && <span className="text-gray-400 mx-0.5">+</span>}
          </span>
        ))}
      </>
    )
  }

  // Handle special keys
  const specialKeys: Record<string, string> = {
    'escape': 'Esc',
    '?': '?',
    ',': ',',
  }

  return <kbd className="kbd">{specialKeys[key.toLowerCase()] || key.toUpperCase()}</kbd>
}

export default function KeyboardShortcutsHelp({ isOpen, onClose }: KeyboardShortcutsHelpProps) {
  if (!isOpen) return null

  const navigationShortcuts = SHORTCUT_DEFINITIONS.filter(s => s.category === 'navigation')
  const globalShortcuts = SHORTCUT_DEFINITIONS.filter(s => s.category === 'global')

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative min-h-screen flex items-center justify-center p-4">
        <div className="relative bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg animate-fade-in">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <Keyboard size={20} className="text-primary-600" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Keyboard Shortcuts</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Content */}
          <div className="p-4 space-y-6 max-h-[60vh] overflow-y-auto">
            {/* Navigation */}
            <div>
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                Navigation
              </h3>
              <div className="space-y-2">
                {navigationShortcuts.map((shortcut) => (
                  <div
                    key={shortcut.key}
                    className="flex items-center justify-between py-1.5"
                  >
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {shortcut.description}
                    </span>
                    <div className="flex items-center gap-1">
                      {formatKey(shortcut.key)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Global */}
            <div>
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                Global
              </h3>
              <div className="space-y-2">
                {globalShortcuts.map((shortcut) => (
                  <div
                    key={shortcut.key}
                    className="flex items-center justify-between py-1.5"
                  >
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {shortcut.description}
                    </span>
                    <div className="flex items-center gap-1">
                      {formatKey(shortcut.key)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/50 rounded-b-xl">
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
              Press <kbd className="kbd">?</kbd> anytime to show this help
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
