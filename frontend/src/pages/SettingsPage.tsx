import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../contexts/authStore'
import { useOnboardingTour } from '../components/OnboardingTour'
import { useThemeStore, Theme } from '../contexts/themeStore'
import { userApi, NotificationPreferences } from '../services/api'
import {
  User,
  Mail,
  Bell,
  Key,
  RefreshCw,
  Shield,
  HelpCircle,
  ExternalLink,
  Loader2,
  Send,
  CheckCircle,
  Sun,
  Moon,
  Monitor,
  Palette,
  Building2,
} from 'lucide-react'

export default function SettingsPage() {
  const { t } = useTranslation()
  const user = useAuthStore((state) => state.user)
  const organization = useAuthStore((state) => state.organization)
  const { resetTour, isTourCompleted } = useOnboardingTour()
  const { theme, setTheme } = useThemeStore()
  const queryClient = useQueryClient()

  // Local state for form values
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    emailNotificationsEnabled: false,
    reportFrequency: 'WEEKLY',
    alertNotificationsEnabled: true,
    alertSeverityThreshold: 'HIGH',
  })

  // Fetch current preferences
  const { data: savedPreferences, isLoading: loadingPrefs } = useQuery({
    queryKey: ['notification-preferences'],
    queryFn: async () => {
      const res = await userApi.getNotificationPreferences()
      return res.data
    },
  })

  // Sync local state when data loads
  useEffect(() => {
    if (savedPreferences) {
      setPreferences(savedPreferences)
    }
  }, [savedPreferences])

  // Update preferences mutation
  const updateMutation = useMutation({
    mutationFn: userApi.updateNotificationPreferences,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-preferences'] })
      toast.success(t('settings.notifications.preferencesSaved'))
    },
  })

  // Send test report mutation
  const testReportMutation = useMutation({
    mutationFn: (type: 'DAILY' | 'WEEKLY') => userApi.sendTestReport(type),
    onSuccess: () => {
      toast.success(t('settings.notifications.testReportSent'))
    },
  })

  const handlePreferenceChange = (key: keyof NotificationPreferences, value: unknown) => {
    const newPrefs = { ...preferences, [key]: value }
    setPreferences(newPrefs)
    updateMutation.mutate(newPrefs)
  }

  const roleColors: Record<string, string> = {
    VIEWER: 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-slate-700 dark:text-gray-300 dark:border-slate-600',
    ANALYST: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/50 dark:text-blue-300 dark:border-blue-800',
    ADMIN: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/50 dark:text-amber-300 dark:border-amber-800',
  }

  const themeOptions: { value: Theme; label: string; icon: typeof Sun; description: string }[] = [
    { value: 'light', label: 'Light', icon: Sun, description: 'Always use light mode' },
    { value: 'dark', label: 'Dark', icon: Moon, description: 'Always use dark mode' },
    { value: 'system', label: 'System', icon: Monitor, description: 'Follow system preference' },
  ]

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Profile Section */}
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-gray-100 dark:bg-slate-700 rounded-lg">
            <User size={20} className="text-gray-600 dark:text-gray-300" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Profile</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">Your account information</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg">
              <span className="text-2xl font-bold text-white">
                {user?.email?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-900 dark:text-white">{user?.name || user?.email?.split('@')[0]}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                <Mail size={14} />
                {user?.email}
              </p>
            </div>
            {user?.role && (
              <span className={`px-3 py-1 text-sm font-medium rounded-full border ${roleColors[user.role] || roleColors.VIEWER}`}>
                <span className="flex items-center gap-1.5">
                  <Shield size={14} />
                  {user.role}
                </span>
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Email Address</label>
              <div className="input bg-gray-50 dark:bg-slate-700/50 flex items-center gap-2 text-gray-600 dark:text-gray-300">
                <Mail size={16} className="text-gray-400" />
                {user?.email || '—'}
              </div>
            </div>
            <div>
              <label className="label">Role</label>
              <div className="input bg-gray-50 dark:bg-slate-700/50 flex items-center gap-2 text-gray-600 dark:text-gray-300">
                <Shield size={16} className="text-gray-400" />
                {user?.role || 'VIEWER'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Organization Section */}
      {organization && (
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg">
              <Building2 size={20} className="text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Organization</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">Your organization details</p>
            </div>
          </div>

          <div className="p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center shadow-lg">
                <span className="text-lg font-bold text-white">
                  {organization.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">{organization.name}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  ID: {organization.slug}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Appearance Section */}
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-violet-100 dark:bg-violet-900/50 rounded-lg">
            <Palette size={20} className="text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Appearance</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">Customize your visual experience</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <p className="font-medium text-gray-900 dark:text-white mb-3">Theme</p>
            <div className="grid grid-cols-3 gap-3">
              {themeOptions.map((option) => {
                const Icon = option.icon
                const isSelected = theme === option.value
                return (
                  <button
                    key={option.value}
                    onClick={() => setTheme(option.value)}
                    className={`p-4 rounded-lg border-2 transition-all text-center ${
                      isSelected
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30'
                        : 'border-gray-200 dark:border-slate-600 hover:border-gray-300 dark:hover:border-slate-500 bg-white dark:bg-slate-800'
                    }`}
                  >
                    <Icon
                      size={24}
                      className={`mx-auto mb-2 ${
                        isSelected
                          ? 'text-primary-600 dark:text-primary-400'
                          : 'text-gray-500 dark:text-gray-400'
                      }`}
                    />
                    <p
                      className={`font-medium text-sm ${
                        isSelected
                          ? 'text-primary-700 dark:text-primary-300'
                          : 'text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {option.label}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 hidden sm:block">
                      {option.description}
                    </p>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Notifications Section */}
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
            <Bell size={20} className="text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Email Notifications</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">Manage your email alert preferences</p>
          </div>
          {updateMutation.isPending && (
            <Loader2 size={18} className="ml-auto text-primary-500 animate-spin" />
          )}
          {updateMutation.isSuccess && !updateMutation.isPending && (
            <CheckCircle size={18} className="ml-auto text-green-500" />
          )}
        </div>

        {loadingPrefs ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={24} className="text-gray-400 animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Email Reports Toggle */}
            <label className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors cursor-pointer">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Email reports</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Receive scheduled intelligence reports via email</p>
              </div>
              <input
                type="checkbox"
                checked={preferences.emailNotificationsEnabled}
                onChange={(e) => handlePreferenceChange('emailNotificationsEnabled', e.target.checked)}
                className="h-5 w-5 text-primary-600 border-gray-300 dark:border-slate-500 rounded focus:ring-primary-500 dark:bg-slate-600"
              />
            </label>

            {/* Report Frequency */}
            {preferences.emailNotificationsEnabled && (
              <div className="p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                <p className="font-medium text-gray-900 dark:text-white mb-2">Report frequency</p>
                <div className="flex gap-3">
                  {(['DAILY', 'WEEKLY'] as const).map((freq) => (
                    <button
                      key={freq}
                      onClick={() => handlePreferenceChange('reportFrequency', freq)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        preferences.reportFrequency === freq
                          ? 'bg-primary-600 text-white'
                          : 'bg-white dark:bg-slate-600 border border-gray-300 dark:border-slate-500 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-500'
                      }`}
                    >
                      {freq.charAt(0) + freq.slice(1).toLowerCase()}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  {preferences.reportFrequency === 'DAILY'
                    ? 'Reports sent every morning at 8:00 AM (Yerevan time)'
                    : 'Reports sent every Monday at 9:00 AM (Yerevan time)'}
                </p>
              </div>
            )}

            {/* Alert Notifications Toggle */}
            <label className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors cursor-pointer">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Alert notifications</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Get email notifications for new threat alerts</p>
              </div>
              <input
                type="checkbox"
                checked={preferences.alertNotificationsEnabled}
                onChange={(e) => handlePreferenceChange('alertNotificationsEnabled', e.target.checked)}
                className="h-5 w-5 text-primary-600 border-gray-300 dark:border-slate-500 rounded focus:ring-primary-500 dark:bg-slate-600"
              />
            </label>

            {/* Alert Severity Threshold */}
            {preferences.alertNotificationsEnabled && (
              <div className="p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                <p className="font-medium text-gray-900 dark:text-white mb-2">Minimum alert severity</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Only receive notifications for alerts at this level or higher</p>
                <div className="flex flex-wrap gap-2">
                  {(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const).map((sev) => {
                    const colors: Record<string, string> = {
                      LOW: 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700',
                      MEDIUM: 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700',
                      HIGH: 'bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700',
                      CRITICAL: 'bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700',
                    }
                    const activeColors: Record<string, string> = {
                      LOW: 'bg-blue-600 text-white border-blue-600',
                      MEDIUM: 'bg-amber-600 text-white border-amber-600',
                      HIGH: 'bg-red-600 text-white border-red-600',
                      CRITICAL: 'bg-purple-600 text-white border-purple-600',
                    }
                    return (
                      <button
                        key={sev}
                        onClick={() => handlePreferenceChange('alertSeverityThreshold', sev)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                          preferences.alertSeverityThreshold === sev
                            ? activeColors[sev]
                            : colors[sev]
                        }`}
                      >
                        {sev}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Test Report Button */}
            {preferences.emailNotificationsEnabled && (
              <div className="p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-100 dark:border-blue-800">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-blue-900 dark:text-blue-200">Send test report</p>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      Receive a sample report to verify your email settings
                    </p>
                  </div>
                  <button
                    onClick={() => testReportMutation.mutate(preferences.reportFrequency === 'DAILY' ? 'DAILY' : 'WEEKLY')}
                    disabled={testReportMutation.isPending}
                    className="btn btn-primary btn-sm"
                  >
                    {testReportMutation.isPending ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Send size={16} />
                    )}
                    Send Test
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Help & Onboarding Section */}
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-purple-100 dark:bg-purple-900/50 rounded-lg">
            <HelpCircle size={20} className="text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Help & Onboarding</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">Learn how to use AIIM effectively</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Product Tour</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {isTourCompleted()
                  ? 'You\'ve completed the tour. Restart to see it again.'
                  : 'Take a guided tour of AIIM features'}
              </p>
            </div>
            <button
              onClick={resetTour}
              className="btn btn-secondary flex items-center gap-2"
            >
              <RefreshCw size={16} />
              {isTourCompleted() ? 'Restart Tour' : 'Start Tour'}
            </button>
          </div>

          <Link
            to="/guide"
            className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
          >
            <div>
              <p className="font-medium text-gray-900 dark:text-white">User Guide</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Read the full documentation and workflow guide</p>
            </div>
            <ExternalLink size={18} className="text-gray-400" />
          </Link>

          <a
            href="/swagger-ui/index.html"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
          >
            <div>
              <p className="font-medium text-gray-900 dark:text-white">API Documentation</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Interactive REST API docs (Swagger)</p>
            </div>
            <ExternalLink size={18} className="text-gray-400" />
          </a>
        </div>
      </div>

      {/* API Access Section */}
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-green-100 dark:bg-green-900/50 rounded-lg">
            <Key size={20} className="text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">API Access</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">Integrate AIIM with your systems</p>
          </div>
        </div>

        <div className="p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg border border-dashed border-gray-300 dark:border-slate-600">
          <div className="text-center">
            <Key size={32} className="mx-auto text-gray-300 dark:text-slate-500 mb-2" />
            <p className="font-medium text-gray-700 dark:text-gray-300">API access coming soon</p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Programmatic access to AIIM data will be available in a future release.
            </p>
          </div>
        </div>
      </div>

      {/* Version Info */}
      <div className="text-center text-sm text-gray-500 dark:text-gray-400 py-4">
        <p>AIIM v1.0.0-beta</p>
        <p className="text-xs mt-1">AI Information Integrity Monitor</p>
      </div>
    </div>
  )
}
