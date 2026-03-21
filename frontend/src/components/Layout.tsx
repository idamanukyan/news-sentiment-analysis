import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useState, useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useAuthStore, UserRole } from '../contexts/authStore'
import { useLanguageStore } from '../contexts/languageStore'
import GlobalSearch from './GlobalSearch'
import OnboardingTour from './OnboardingTour'
import MobileBottomNav from './MobileBottomNav'
import {
  LayoutDashboard,
  Newspaper,
  MessageSquare,
  Bell,
  Database,
  FileText,
  LogOut,
  ChevronDown,
  Calendar,
  Tags,
  Settings,
  BookOpen,
  Menu,
  X,
  SlidersHorizontal,
  Building2,
  Users,
  MessageCircle,
  Sun,
  Moon,
  Bookmark,
} from 'lucide-react'
import { useThemeStore } from '../contexts/themeStore'
import { useDateRangeStore, DateRangeValue } from '../contexts/dateRangeStore'
import { useKeyboardShortcuts, ShortcutConfig } from '../hooks/useKeyboardShortcuts'
import KeyboardShortcutsHelp from './KeyboardShortcutsHelp'

interface NavItem {
  path: string
  labelKey: string
  icon: React.ReactNode
  roles?: UserRole[]
  section?: 'main' | 'admin'
}

const navItems: NavItem[] = [
  { path: '/election', labelKey: 'nav.dashboard', icon: <LayoutDashboard size={20} />, section: 'main' },
  { path: '/news', labelKey: 'nav.contentFeed', icon: <Newspaper size={20} />, section: 'main' },
  { path: '/bookmarks', labelKey: 'nav.bookmarks', icon: <Bookmark size={20} />, section: 'main' },
  { path: '/narratives', labelKey: 'nav.narratives', icon: <MessageSquare size={20} />, section: 'main' },
  { path: '/alerts', labelKey: 'nav.alerts', icon: <Bell size={20} />, section: 'main' },
  { path: '/team', labelKey: 'nav.team', icon: <MessageCircle size={20} />, section: 'main' },
  { path: '/alert-rules', labelKey: 'nav.alertRules', icon: <SlidersHorizontal size={20} />, section: 'admin', roles: ['SUPER_ADMIN', 'ORG_ADMIN', 'ANALYST'] },
  { path: '/sources', labelKey: 'nav.sources', icon: <Database size={20} />, section: 'admin' },
  { path: '/topics', labelKey: 'nav.topics', icon: <Tags size={20} />, section: 'admin' },
  { path: '/reports', labelKey: 'nav.reports', icon: <FileText size={20} />, section: 'admin', roles: ['SUPER_ADMIN', 'ORG_ADMIN', 'ANALYST'] },
  { path: '/team/settings', labelKey: 'nav.teamSettings', icon: <Users size={20} />, section: 'admin', roles: ['SUPER_ADMIN', 'ORG_ADMIN'] },
  { path: '/admin', labelKey: 'nav.adminPanel', icon: <Building2 size={20} />, section: 'admin', roles: ['SUPER_ADMIN'] },
  { path: '/guide', labelKey: 'nav.userGuide', icon: <BookOpen size={20} />, section: 'admin' },
]

const pageTitleKeys: Record<string, string> = {
  '/election': 'pageTitles.dashboard',
  '/news': 'pageTitles.contentFeed',
  '/bookmarks': 'pageTitles.bookmarks',
  '/narratives': 'pageTitles.narrativeTracking',
  '/alerts': 'pageTitles.threatAlerts',
  '/alert-rules': 'pageTitles.alertRules',
  '/sources': 'pageTitles.sourceManagement',
  '/topics': 'pageTitles.topicTracking',
  '/reports': 'pageTitles.reports',
  '/settings': 'pageTitles.settings',
  '/guide': 'pageTitles.userGuide',
  '/team': 'pageTitles.teamDiscussions',
  '/team/settings': 'pageTitles.teamSettings',
  '/admin': 'pageTitles.adminPanel',
}

const roleColors: Record<UserRole, string> = {
  SUPER_ADMIN: 'bg-purple-500',
  ORG_ADMIN: 'bg-amber-500',
  ANALYST: 'bg-blue-500',
  VIEWER: 'bg-gray-500',
}

const roleLabelKeys: Record<UserRole, string> = {
  SUPER_ADMIN: 'roles.superAdmin',
  ORG_ADMIN: 'roles.orgAdmin',
  ANALYST: 'roles.analyst',
  VIEWER: 'roles.viewer',
}

// Date range options with translation keys
const dateRangeItems = [
  { labelKey: 'dateRanges.last24Hours', value: '24h' },
  { labelKey: 'dateRanges.last7Days', value: '7d' },
  { labelKey: 'dateRanges.last30Days', value: '30d' },
  { labelKey: 'dateRanges.last90Days', value: '90d' },
  { labelKey: 'dateRanges.allTime', value: 'all' },
]

// Format date in Armenia timezone (UTC+4)
function formatArmeniaDate(short = false): string {
  if (short) {
    return new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      timeZone: 'Asia/Yerevan',
    })
  }
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Yerevan',
  })
}

export default function Layout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const logout = useAuthStore((state) => state.logout)
  const user = useAuthStore((state) => state.user)
  const organization = useAuthStore((state) => state.organization)
  const hasAnyRole = useAuthStore((state) => state.hasAnyRole)
  const { dateRange, setDateRange } = useDateRangeStore()
  const [showDateDropdown, setShowDateDropdown] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarExpanded, setSidebarExpanded] = useState(false)
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false)
  const { setTheme, resolvedTheme } = useThemeStore()
  const isDark = resolvedTheme() === 'dark'

  // Keyboard shortcuts
  const shortcuts: ShortcutConfig[] = useMemo(() => [
    // Navigation shortcuts (g + key)
    { key: 'g d', action: () => navigate('/election'), description: 'Go to Dashboard', category: 'navigation' },
    { key: 'g n', action: () => navigate('/news'), description: 'Go to News', category: 'navigation' },
    { key: 'g b', action: () => navigate('/bookmarks'), description: 'Go to Bookmarks', category: 'navigation' },
    { key: 'g r', action: () => navigate('/narratives'), description: 'Go to Narratives', category: 'navigation' },
    { key: 'g a', action: () => navigate('/alerts'), description: 'Go to Alerts', category: 'navigation' },
    { key: 'g t', action: () => navigate('/team'), description: 'Go to Team', category: 'navigation' },
    { key: 'g s', action: () => navigate('/sources'), description: 'Go to Sources', category: 'navigation' },
    { key: 'g p', action: () => navigate('/topics'), description: 'Go to Topics', category: 'navigation' },
    { key: 'g e', action: () => navigate('/reports'), description: 'Go to Reports', category: 'navigation' },
    { key: 'g ,', action: () => navigate('/settings'), description: 'Go to Settings', category: 'navigation' },
    // Global shortcuts
    { key: '?', action: () => setShowShortcutsHelp(true), description: 'Show keyboard shortcuts', category: 'global' },
    { key: 'escape', action: () => {
      setShowShortcutsHelp(false)
      setShowDateDropdown(false)
      setSidebarOpen(false)
    }, description: 'Close modal / dialog', category: 'global' },
  ], [navigate])

  useKeyboardShortcuts(shortcuts)

  // System health check
  const { data: healthData } = useQuery({
    queryKey: ['system-health'],
    queryFn: async () => {
      const res = await fetch('/api/v1/system/health')
      if (!res.ok) throw new Error('Health check failed')
      return res.json()
    },
    refetchInterval: 60000, // Check every minute
    retry: 1,
    staleTime: 30000,
  })

  const systemStatus = healthData?.status === 'UP' ? 'operational' : 'degraded'

  const visibleNavItems = navItems.filter(item => {
    if (!item.roles) return true
    return hasAnyRole(...item.roles)
  })

  const mainNavItems = visibleNavItems.filter(item => item.section === 'main')
  const adminNavItems = visibleNavItems.filter(item => item.section === 'admin')

  const currentPageTitleKey = pageTitleKeys[location.pathname]
  const currentPageTitle = currentPageTitleKey ? t(currentPageTitleKey) : 'AIIM'
  const selectedDateRange = dateRangeItems.find(r => r.value === dateRange)

  // Update document title when page changes
  useEffect(() => {
    document.title = `AIIM — ${currentPageTitle}`
  }, [currentPageTitle])

  // Close sidebar on navigation (mobile)
  useEffect(() => {
    setSidebarOpen(false)
  }, [location.pathname])

  // Prevent body scroll when sidebar is open on mobile
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [sidebarOpen])

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 flex">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        onMouseEnter={() => setSidebarExpanded(true)}
        onMouseLeave={() => setSidebarExpanded(false)}
        className={`
          bg-sidebar-bg fixed top-0 left-0 h-screen flex flex-col z-50
          transition-all duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0 w-[280px]' : '-translate-x-full w-[280px]'}
          lg:translate-x-0 ${sidebarExpanded ? 'lg:w-[250px]' : 'lg:w-[72px]'}
        `}
      >
        {/* Logo */}
        <div className={`py-5 border-b border-white/10 flex items-center ${sidebarExpanded ? 'px-5 justify-between' : 'px-4 justify-center lg:justify-center'}`}>
          <Link to="/election" className="flex items-center space-x-3">
            <img
              src="/aiim-icon.svg"
              alt="AIIM"
              className="w-10 h-10 flex-shrink-0"
            />
            <div className={`${sidebarExpanded ? 'block' : 'hidden lg:hidden'}`}>
              <h1 className="text-lg font-bold text-white tracking-tight">AIIM</h1>
              {organization ? (
                <p className="text-[10px] text-amber-400 -mt-0.5 font-medium truncate max-w-[120px]">
                  {organization.name}
                </p>
              ) : (
                <p className="text-[10px] text-sidebar-text -mt-0.5 leading-tight">
                  Armenia Information<br />Integrity Monitor
                </p>
              )}
            </div>
          </Link>
          {/* Close button - mobile only */}
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 text-sidebar-text hover:text-white hover:bg-sidebar-hover rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-4 overflow-y-auto overflow-x-hidden">
          {/* Main section */}
          <div className="mb-6">
            <p className={`px-3 mb-2 text-[10px] font-semibold uppercase tracking-wider text-sidebar-text/60 whitespace-nowrap transition-opacity duration-200 ${sidebarExpanded ? 'opacity-100' : 'opacity-0 lg:opacity-0'}`}>
              {t('nav.analysis')}
            </p>
            <ul className="space-y-1">
              {mainNavItems.map((item) => {
                const isActive = location.pathname === item.path
                const label = t(item.labelKey)
                return (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      title={!sidebarExpanded ? label : undefined}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                        isActive
                          ? 'bg-sidebar-active text-white'
                          : 'text-sidebar-text hover:bg-sidebar-hover hover:text-white'
                      } ${!sidebarExpanded ? 'lg:justify-center' : ''}`}
                    >
                      <span className={`flex-shrink-0 ${isActive ? 'text-amber-400' : ''}`}>{item.icon}</span>
                      <span className={`${sidebarExpanded ? 'block' : 'hidden lg:hidden'}`}>{label}</span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>

          {/* Admin section */}
          {adminNavItems.length > 0 && (
            <div>
              <p className={`px-3 mb-2 text-[10px] font-semibold uppercase tracking-wider text-sidebar-text/60 whitespace-nowrap transition-opacity duration-200 ${sidebarExpanded ? 'opacity-100' : 'opacity-0 lg:opacity-0'}`}>
                {t('nav.management')}
              </p>
              <ul className="space-y-1">
                {adminNavItems.map((item) => {
                  const isActive = location.pathname === item.path
                  const label = t(item.labelKey)
                  return (
                    <li key={item.path}>
                      <Link
                        to={item.path}
                        title={!sidebarExpanded ? label : undefined}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                          isActive
                            ? 'bg-sidebar-active text-white'
                            : 'text-sidebar-text hover:bg-sidebar-hover hover:text-white'
                        } ${!sidebarExpanded ? 'lg:justify-center' : ''}`}
                      >
                        <span className={`flex-shrink-0 ${isActive ? 'text-amber-400' : ''}`}>{item.icon}</span>
                        <span className={`${sidebarExpanded ? 'block' : 'hidden lg:hidden'}`}>{label}</span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
        </nav>

        {/* User section */}
        <div className="p-3 border-t border-white/10">
          <div className={`flex items-center ${sidebarExpanded ? 'justify-between' : 'lg:justify-center'}`}>
            <div className={`flex items-center gap-3 min-w-0 ${sidebarExpanded ? 'flex-1' : ''}`}>
              <div className="w-9 h-9 rounded-full bg-sidebar-hover flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-medium text-white">
                  {user?.email?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className={`min-w-0 flex-1 ${sidebarExpanded ? 'block' : 'hidden lg:hidden'}`}>
                <p className="text-sm font-medium text-white truncate">{user?.email}</p>
                {user?.role && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded text-white ${roleColors[user.role]}`}>
                    {t(roleLabelKeys[user.role])}
                  </span>
                )}
              </div>
            </div>
            <div className={`flex items-center gap-1 ${sidebarExpanded ? 'flex' : 'hidden lg:hidden'}`}>
              <Link
                to="/settings"
                className="p-2 text-sidebar-text hover:text-white hover:bg-sidebar-hover rounded-lg transition-colors"
                title={t('nav.settings')}
              >
                <Settings size={18} />
              </Link>
              <button
                onClick={logout}
                className="p-2 text-sidebar-text hover:text-white hover:bg-sidebar-hover rounded-lg transition-colors"
                title={t('nav.logout')}
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Version & Language */}
        <div className={`px-4 py-2 border-t border-white/10 ${sidebarExpanded ? 'block' : 'hidden lg:hidden'}`}>
          <p className="text-[10px] text-sidebar-text/50 text-center mb-2">
            v1.0.0-beta
          </p>
          {/* Language Toggle */}
          <LanguageToggle />
        </div>
      </aside>

      {/* Main content */}
      <div className={`flex-1 transition-all duration-300 ${sidebarExpanded ? 'lg:ml-[250px]' : 'lg:ml-[72px]'}`}>
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-4">
            {/* Left side: hamburger + title */}
            <div className="flex items-center gap-3 min-w-0">
              {/* Hamburger menu - mobile only */}
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 -ml-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                <Menu size={24} />
              </button>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white truncate">{currentPageTitle}</h1>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-0.5 hidden sm:block">
                  {formatArmeniaDate()} (Yerevan)
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 sm:hidden">
                  {formatArmeniaDate(true)}
                </p>
              </div>
            </div>

            {/* Right side: controls */}
            <div className="flex items-center gap-2 sm:gap-4">
              {/* Global search */}
              <div data-tour="global-search" className="hidden sm:block">
                <GlobalSearch />
              </div>

              {/* Mobile search button */}
              <div className="sm:hidden">
                <GlobalSearch mobile />
              </div>

              {/* System status indicator - hide text on mobile */}
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-gray-50 dark:bg-slate-700 rounded-lg">
                <span className={`w-2 h-2 rounded-full ${systemStatus === 'operational' ? 'bg-green-500' : 'bg-yellow-500'} animate-pulse`} />
                <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                  {systemStatus === 'operational' ? t('systemStatus.operational') : t('systemStatus.degraded')}
                </span>
              </div>

              {/* Status dot only on mobile */}
              <div className="md:hidden flex items-center">
                <span className={`w-2.5 h-2.5 rounded-full ${systemStatus === 'operational' ? 'bg-green-500' : 'bg-yellow-500'}`} />
              </div>

              {/* Theme toggle */}
              <button
                onClick={() => setTheme(isDark ? 'light' : 'dark')}
                className="p-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-600 transition-colors"
                title={isDark ? t('theme.switchToLight') : t('theme.switchToDark')}
              >
                {isDark ? <Sun size={18} /> : <Moon size={18} />}
              </button>

              {/* Date range selector */}
              <div className="relative">
                <button
                  onClick={() => setShowDateDropdown(!showDateDropdown)}
                  className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-600 transition-colors"
                >
                  <Calendar size={16} />
                  <span className="hidden sm:inline">{selectedDateRange ? t(selectedDateRange.labelKey) : ''}</span>
                  <span className="sm:hidden">{dateRange}</span>
                  <ChevronDown size={16} className={`transition-transform ${showDateDropdown ? 'rotate-180' : ''}`} />
                </button>

                {showDateDropdown && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowDateDropdown(false)}
                    />
                    <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-gray-200 dark:border-slate-700 py-1 z-20 animate-fade-in">
                      {dateRangeItems.map((range) => (
                        <button
                          key={range.value}
                          onClick={() => {
                            setDateRange(range.value as DateRangeValue)
                            setShowDateDropdown(false)
                          }}
                          className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                            dateRange === range.value
                              ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 font-medium'
                              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700'
                          }`}
                        >
                          {t(range.labelKey)}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 sm:p-6 main-content-with-nav md:pb-6">
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />

      {/* Onboarding Tour */}
      <OnboardingTour />

      {/* Keyboard Shortcuts Help */}
      <KeyboardShortcutsHelp
        isOpen={showShortcutsHelp}
        onClose={() => setShowShortcutsHelp(false)}
      />
    </div>
  )
}

// Language Toggle Component
function LanguageToggle() {
  const { language, setLanguage } = useLanguageStore()
  const { t } = useTranslation()

  return (
    <div className="flex justify-center gap-1">
      <button
        onClick={() => setLanguage('en')}
        className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
          language === 'en'
            ? 'bg-blue-600 text-white'
            : 'bg-sidebar-hover text-sidebar-text/60 hover:text-sidebar-text hover:bg-sidebar-active'
        }`}
      >
        {t('languageSwitch.en')}
      </button>
      <button
        onClick={() => setLanguage('hy')}
        className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
          language === 'hy'
            ? 'bg-blue-600 text-white'
            : 'bg-sidebar-hover text-sidebar-text/60 hover:text-sidebar-text hover:bg-sidebar-active'
        }`}
      >
        {t('languageSwitch.hy')}
      </button>
    </div>
  )
}
