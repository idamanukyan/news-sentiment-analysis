import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  ChevronRight,
  ChevronLeft,
  X,
  LayoutDashboard,
  Newspaper,
  MessageSquare,
  Bell,
  Database,
  Search,
  Sparkles,
  CheckCircle,
  Shield,
} from 'lucide-react'

interface TourStep {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  route?: string
  target?: string // CSS selector for spotlight
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center'
}

const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to AIIM',
    description: 'AI Information Integrity Monitor helps you track narratives, detect disinformation, and monitor media coverage during critical events like elections.',
    icon: <Shield size={32} className="text-amber-500" />,
    position: 'center',
  },
  {
    id: 'dashboard',
    title: 'Election Dashboard',
    description: 'Your command center. View real-time threat levels, active narratives, sentiment trends, and source distribution at a glance.',
    icon: <LayoutDashboard size={32} className="text-blue-500" />,
    route: '/election',
    target: '[data-tour="dashboard-stats"]',
    position: 'bottom',
  },
  {
    id: 'content',
    title: 'Content Feed',
    description: 'Browse all monitored articles with powerful filters. Search by source, sentiment, language, or political leaning.',
    icon: <Newspaper size={32} className="text-green-500" />,
    route: '/news',
    target: '[data-tour="content-filters"]',
    position: 'bottom',
  },
  {
    id: 'narratives',
    title: 'Narrative Tracking',
    description: 'Track disinformation narratives as they emerge and spread. Monitor threat levels and see which sources are amplifying them.',
    icon: <MessageSquare size={32} className="text-purple-500" />,
    route: '/narratives',
    target: '[data-tour="narratives-list"]',
    position: 'bottom',
  },
  {
    id: 'alerts',
    title: 'Threat Alerts',
    description: 'Get notified about volume spikes, coordinated activity, and emerging threats. Investigate alerts with full context.',
    icon: <Bell size={32} className="text-red-500" />,
    route: '/alerts',
    target: '[data-tour="alerts-list"]',
    position: 'bottom',
  },
  {
    id: 'search',
    title: 'Global Search',
    description: 'Press Cmd+K (or Ctrl+K) anytime to search across articles, narratives, and alerts instantly.',
    icon: <Search size={32} className="text-gray-500" />,
    target: '[data-tour="global-search"]',
    position: 'bottom',
  },
  {
    id: 'sources',
    title: 'Source Management',
    description: 'AIIM monitors news from across the political spectrum - government, opposition, and independent sources for balanced coverage.',
    icon: <Database size={32} className="text-amber-500" />,
    route: '/sources',
    position: 'center',
  },
  {
    id: 'complete',
    title: 'You\'re All Set!',
    description: 'Start exploring the dashboard. If you need help, check the documentation or reach out to your team administrator.',
    icon: <Sparkles size={32} className="text-amber-500" />,
    route: '/election',
    position: 'center',
  },
]

const TOUR_STORAGE_KEY = 'aiim_onboarding_completed'

interface OnboardingTourProps {
  onComplete?: () => void
}

export default function OnboardingTour({ onComplete }: OnboardingTourProps) {
  const [isActive, setIsActive] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  const step = TOUR_STEPS[currentStep]
  const isFirstStep = currentStep === 0
  const isLastStep = currentStep === TOUR_STEPS.length - 1
  const progress = ((currentStep + 1) / TOUR_STEPS.length) * 100

  // Check if tour should be shown
  useEffect(() => {
    const hasCompleted = localStorage.getItem(TOUR_STORAGE_KEY)
    if (!hasCompleted) {
      // Small delay to let the page render
      const timer = setTimeout(() => setIsActive(true), 500)
      return () => clearTimeout(timer)
    }
  }, [])

  // Navigate to step route if needed
  useEffect(() => {
    if (isActive && step.route && location.pathname !== step.route) {
      navigate(step.route)
    }
  }, [isActive, step, location.pathname, navigate])

  const handleNext = useCallback(() => {
    if (isLastStep) {
      completeTour()
    } else {
      setIsAnimating(true)
      setTimeout(() => {
        setCurrentStep((prev) => prev + 1)
        setIsAnimating(false)
      }, 150)
    }
  }, [isLastStep])

  const handlePrev = useCallback(() => {
    if (!isFirstStep) {
      setIsAnimating(true)
      setTimeout(() => {
        setCurrentStep((prev) => prev - 1)
        setIsAnimating(false)
      }, 150)
    }
  }, [isFirstStep])

  const handleSkip = useCallback(() => {
    completeTour()
  }, [])

  const completeTour = () => {
    localStorage.setItem(TOUR_STORAGE_KEY, 'true')
    setIsActive(false)
    onComplete?.()
  }

  // Keyboard navigation
  useEffect(() => {
    if (!isActive) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleSkip()
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        handleNext()
      } else if (e.key === 'ArrowLeft') {
        handlePrev()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isActive, handleNext, handlePrev, handleSkip])

  if (!isActive) return null

  return (
    <div className="fixed inset-0 z-[100]">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Tour card */}
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div
          className={`relative bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden transition-all duration-150 ${
            isAnimating ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
          }`}
        >
          {/* Progress bar */}
          <div className="h-1 bg-gray-100">
            <div
              className="h-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Close button */}
          <button
            onClick={handleSkip}
            className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors z-10"
            title="Skip tour"
          >
            <X size={20} />
          </button>

          {/* Content */}
          <div className="p-8">
            {/* Icon */}
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl flex items-center justify-center shadow-inner">
                {step.icon}
              </div>
            </div>

            {/* Text */}
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-3">{step.title}</h2>
              <p className="text-gray-600 leading-relaxed">{step.description}</p>
            </div>

            {/* Step indicators */}
            <div className="flex justify-center gap-1.5 mb-8">
              {TOUR_STEPS.map((_, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setIsAnimating(true)
                    setTimeout(() => {
                      setCurrentStep(index)
                      setIsAnimating(false)
                    }, 150)
                  }}
                  className={`h-2 rounded-full transition-all ${
                    index === currentStep
                      ? 'w-8 bg-amber-500'
                      : index < currentStep
                      ? 'w-2 bg-amber-300'
                      : 'w-2 bg-gray-200 hover:bg-gray-300'
                  }`}
                  title={`Step ${index + 1}: ${TOUR_STEPS[index].title}`}
                />
              ))}
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between">
              <button
                onClick={handleSkip}
                className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                Skip tour
              </button>

              <div className="flex gap-3">
                {!isFirstStep && (
                  <button
                    onClick={handlePrev}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    <ChevronLeft size={16} />
                    Back
                  </button>
                )}
                <button
                  onClick={handleNext}
                  className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 rounded-lg shadow-lg shadow-amber-500/25 transition-all"
                >
                  {isLastStep ? (
                    <>
                      <CheckCircle size={16} />
                      Get Started
                    </>
                  ) : (
                    <>
                      Next
                      <ChevronRight size={16} />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Step counter */}
          <div className="px-8 pb-4 text-center">
            <span className="text-xs text-gray-400">
              Step {currentStep + 1} of {TOUR_STEPS.length}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

// Hook to manually trigger tour
export function useOnboardingTour() {
  const resetTour = () => {
    localStorage.removeItem(TOUR_STORAGE_KEY)
    window.location.reload()
  }

  const isTourCompleted = () => {
    return localStorage.getItem(TOUR_STORAGE_KEY) === 'true'
  }

  return { resetTour, isTourCompleted }
}
