import { useLocation, Link } from 'react-router-dom'
import {
  HomeIcon,
  NewspaperIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline'
import {
  HomeIcon as HomeIconSolid,
  NewspaperIcon as NewspaperIconSolid,
  ExclamationTriangleIcon as ExclamationTriangleIconSolid,
  ChartBarIcon as ChartBarIconSolid,
  Cog6ToothIcon as Cog6ToothIconSolid,
} from '@heroicons/react/24/solid'

const navItems = [
  { path: '/', label: 'Home', Icon: HomeIcon, IconActive: HomeIconSolid },
  { path: '/news', label: 'News', Icon: NewspaperIcon, IconActive: NewspaperIconSolid },
  { path: '/alerts', label: 'Alerts', Icon: ExclamationTriangleIcon, IconActive: ExclamationTriangleIconSolid },
  { path: '/narratives', label: 'Narratives', Icon: ChartBarIcon, IconActive: ChartBarIconSolid },
  { path: '/sources', label: 'Sources', Icon: Cog6ToothIcon, IconActive: Cog6ToothIconSolid },
]

export function MobileBottomNav() {
  const location = useLocation()

  return (
    <nav className="mobile-bottom-nav md:hidden dark:bg-slate-800 dark:border-slate-700">
      {navItems.map(({ path, label, Icon, IconActive }) => {
        const isActive = location.pathname === path ||
          (path !== '/' && location.pathname.startsWith(path))
        const IconComponent = isActive ? IconActive : Icon

        return (
          <Link
            key={path}
            to={path}
            className={`flex flex-col items-center justify-center py-2 px-3 touch-target ${
              isActive
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            <IconComponent className="h-6 w-6" />
            <span className="text-[10px] mt-1 font-medium">{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}

export default MobileBottomNav
