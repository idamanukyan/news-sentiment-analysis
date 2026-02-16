import { useAuthStore } from '../contexts/authStore'

export default function SettingsPage() {
  const user = useAuthStore((state) => state.user)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Settings</h1>

      {/* Profile Section */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Profile</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={user?.email || ''}
              disabled
              className="input bg-gray-50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name
            </label>
            <input
              type="text"
              value={user?.name || ''}
              disabled
              className="input bg-gray-50"
            />
          </div>
        </div>
      </div>

      {/* Notifications Section */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Notifications</h2>
        <div className="space-y-3">
          <label className="flex items-center">
            <input
              type="checkbox"
              defaultChecked
              className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
            />
            <span className="ml-2 text-gray-700">Daily digest email</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              defaultChecked
              className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
            />
            <span className="ml-2 text-gray-700">Sentiment spike alerts</span>
          </label>
        </div>
      </div>

      {/* API Section */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">API Access</h2>
        <p className="text-gray-600 text-sm mb-4">
          API access is available on the Professional plan.
        </p>
        <button className="btn btn-secondary" disabled>
          Generate API Key
        </button>
      </div>
    </div>
  )
}
