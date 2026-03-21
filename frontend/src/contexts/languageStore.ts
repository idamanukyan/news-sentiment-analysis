import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import i18n from '../i18n'

export type Language = 'en' | 'hy'

interface LanguageState {
  language: Language
  setLanguage: (language: Language) => void
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      language: 'en',

      setLanguage: (language: Language) => {
        i18n.changeLanguage(language)
        set({ language })
      },
    }),
    {
      name: 'language-storage',
      onRehydrateStorage: () => (state) => {
        // Sync i18n with stored language when store is rehydrated
        if (state?.language) {
          i18n.changeLanguage(state.language)
        }
      },
    }
  )
)
