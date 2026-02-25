import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Book,
  ChevronDown,
  LayoutDashboard,
  Newspaper,
  MessageSquare,
  Bell,
  Database,
  Tags,
  FileText,
  Shield,
  AlertTriangle,
  TrendingUp,
  Users,
  Globe,
  Clock,
  Zap,
  ExternalLink,
  Play,
  Target,
  Eye,
  Download,
  Settings,
  HelpCircle,
  Lightbulb,
  ArrowRight,
} from 'lucide-react'
import { useOnboardingTour } from '../components/OnboardingTour'

interface GuideSection {
  id: string
  title: string
  icon: React.ReactNode
  content: React.ReactNode
}

function TableOfContents({
  sections,
  activeSection,
  onSelect,
}: {
  sections: GuideSection[]
  activeSection: string
  onSelect: (id: string) => void
}) {
  return (
    <nav className="space-y-1">
      {sections.map((section) => (
        <button
          key={section.id}
          onClick={() => onSelect(section.id)}
          className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors text-left ${
            activeSection === section.id
              ? 'bg-primary-50 text-primary-700 font-medium'
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
          }`}
        >
          <span className={activeSection === section.id ? 'text-primary-500' : 'text-gray-400'}>
            {section.icon}
          </span>
          {section.title}
        </button>
      ))}
    </nav>
  )
}

function StepCard({
  number,
  title,
  description,
  icon,
}: {
  number: number
  title: string
  description: string
  icon: React.ReactNode
}) {
  return (
    <div className="flex gap-4 p-4 bg-gray-50 rounded-lg">
      <div className="flex-shrink-0 w-8 h-8 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center font-bold text-sm">
        {number}
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-primary-600">{icon}</span>
          <h4 className="font-medium text-gray-900">{title}</h4>
        </div>
        <p className="text-sm text-gray-600">{description}</p>
      </div>
    </div>
  )
}

function TipBox({ children, type = 'tip' }: { children: React.ReactNode; type?: 'tip' | 'warning' | 'info' }) {
  const styles = {
    tip: 'bg-green-50 border-green-200 text-green-800',
    warning: 'bg-amber-50 border-amber-200 text-amber-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
  }
  const icons = {
    tip: <Lightbulb size={16} />,
    warning: <AlertTriangle size={16} />,
    info: <HelpCircle size={16} />,
  }
  return (
    <div className={`flex gap-3 p-4 rounded-lg border ${styles[type]}`}>
      <span className="flex-shrink-0 mt-0.5">{icons[type]}</span>
      <div className="text-sm">{children}</div>
    </div>
  )
}

function KeyboardShortcut({ keys }: { keys: string[] }) {
  return (
    <span className="inline-flex items-center gap-1">
      {keys.map((key, i) => (
        <span key={i}>
          <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-xs font-mono">
            {key}
          </kbd>
          {i < keys.length - 1 && <span className="text-gray-400 mx-1">+</span>}
        </span>
      ))}
    </span>
  )
}

export default function UserGuidePage() {
  const [activeSection, setActiveSection] = useState('overview')
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null)
  const { resetTour } = useOnboardingTour()

  const sections: GuideSection[] = [
    {
      id: 'overview',
      title: 'Overview',
      icon: <Book size={18} />,
      content: (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Welcome to AIIM</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              The <strong>Armenia Information Integrity Monitor (AIIM)</strong> is a comprehensive platform
              designed to monitor, analyze, and respond to information threats during critical events
              such as elections. AIIM provides real-time insights into media narratives, detects
              coordinated disinformation campaigns, and helps analysts maintain information integrity.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="card p-4 text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Eye size={24} className="text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">Monitor</h3>
              <p className="text-sm text-gray-600">Track news sources across the political spectrum</p>
            </div>
            <div className="card p-4 text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Target size={24} className="text-purple-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">Detect</h3>
              <p className="text-sm text-gray-600">Identify disinformation narratives and threats</p>
            </div>
            <div className="card p-4 text-center">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Shield size={24} className="text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">Respond</h3>
              <p className="text-sm text-gray-600">Take action with alerts and reports</p>
            </div>
          </div>

          <TipBox type="info">
            <strong>New to AIIM?</strong> Take the interactive product tour to learn the basics.
            <button onClick={resetTour} className="ml-2 text-blue-700 underline font-medium">
              Start Tour
            </button>
          </TipBox>
        </div>
      ),
    },
    {
      id: 'dashboard',
      title: 'Dashboard',
      icon: <LayoutDashboard size={18} />,
      content: (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Election Dashboard</h2>
            <p className="text-gray-600 mb-4">
              The Dashboard is your command center for monitoring election-related information threats.
              It provides a real-time overview of the information landscape.
            </p>
          </div>

          <h3 className="text-lg font-semibold text-gray-900">Key Components</h3>

          <div className="space-y-3">
            <StepCard
              number={1}
              title="Threat Level Gauge"
              description="Shows the current overall threat level based on active alerts, narrative severity, and volume anomalies. Ranges from LOW to CRITICAL."
              icon={<AlertTriangle size={16} />}
            />
            <StepCard
              number={2}
              title="Active Narratives"
              description="Displays the most concerning narratives currently being tracked, sorted by threat level and recent activity."
              icon={<MessageSquare size={16} />}
            />
            <StepCard
              number={3}
              title="Sentiment Trends"
              description="7-day chart showing positive, negative, and neutral sentiment distribution across monitored content."
              icon={<TrendingUp size={16} />}
            />
            <StepCard
              number={4}
              title="Source Distribution"
              description="Breakdown of content by political leaning (Government, Opposition, Independent) to ensure balanced monitoring."
              icon={<Users size={16} />}
            />
          </div>

          <TipBox>
            Use the date range selector in the top-right corner to adjust the time period for all dashboard metrics.
          </TipBox>
        </div>
      ),
    },
    {
      id: 'content-feed',
      title: 'Content Feed',
      icon: <Newspaper size={18} />,
      content: (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Content Feed</h2>
            <p className="text-gray-600 mb-4">
              The Content Feed displays all articles collected from monitored sources. Use filters
              to find specific content and analyze sentiment patterns.
            </p>
          </div>

          <h3 className="text-lg font-semibold text-gray-900">Filtering Content</h3>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 font-medium text-gray-700">Filter</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-700">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr>
                  <td className="py-2 px-3 font-medium">Source</td>
                  <td className="py-2 px-3 text-gray-600">Filter by specific news outlet</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-medium">Sentiment</td>
                  <td className="py-2 px-3 text-gray-600">Positive, Negative, or Neutral</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-medium">Language</td>
                  <td className="py-2 px-3 text-gray-600">Armenian, Russian, or English</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-medium">Political Leaning</td>
                  <td className="py-2 px-3 text-gray-600">Government, Opposition, Independent, Diaspora</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-medium">Date Range</td>
                  <td className="py-2 px-3 text-gray-600">Filter by publication date</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-medium">Search</td>
                  <td className="py-2 px-3 text-gray-600">Full-text search in titles and content</td>
                </tr>
              </tbody>
            </table>
          </div>

          <TipBox>
            <strong>Pro tip:</strong> Use <KeyboardShortcut keys={['Cmd', 'K']} /> (or <KeyboardShortcut keys={['Ctrl', 'K']} />)
            to quickly search across all articles, narratives, and alerts from anywhere in the app.
          </TipBox>
        </div>
      ),
    },
    {
      id: 'narratives',
      title: 'Narrative Tracking',
      icon: <MessageSquare size={18} />,
      content: (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Narrative Tracking</h2>
            <p className="text-gray-600 mb-4">
              Narratives are recurring themes or stories in the media that may indicate coordinated
              messaging or disinformation campaigns. AIIM helps you track and analyze these narratives.
            </p>
          </div>

          <h3 className="text-lg font-semibold text-gray-900">Threat Levels</h3>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <div className="p-3 bg-gray-100 rounded-lg text-center">
              <div className="text-2xl font-bold text-gray-600 mb-1">LOW</div>
              <p className="text-xs text-gray-600">Minor presence, no action needed</p>
            </div>
            <div className="p-3 bg-amber-100 rounded-lg text-center">
              <div className="text-2xl font-bold text-amber-600 mb-1">MEDIUM</div>
              <p className="text-xs text-amber-700">Growing presence, monitor closely</p>
            </div>
            <div className="p-3 bg-red-100 rounded-lg text-center">
              <div className="text-2xl font-bold text-red-600 mb-1">HIGH</div>
              <p className="text-xs text-red-700">Significant spread, action recommended</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg text-center">
              <div className="text-2xl font-bold text-purple-600 mb-1">CRITICAL</div>
              <p className="text-xs text-purple-700">Urgent response required</p>
            </div>
          </div>

          <h3 className="text-lg font-semibold text-gray-900">Creating a Narrative</h3>

          <div className="space-y-3">
            <StepCard
              number={1}
              title="Click 'Create Narrative'"
              description="Open the narrative creation form from the Narratives page."
              icon={<Plus size={16} />}
            />
            <StepCard
              number={2}
              title="Enter Details"
              description="Provide a name, description, and keywords that identify this narrative in articles."
              icon={<FileText size={16} />}
            />
            <StepCard
              number={3}
              title="Set Threat Level"
              description="Assign an initial threat level based on your assessment."
              icon={<AlertTriangle size={16} />}
            />
            <StepCard
              number={4}
              title="Monitor & Update"
              description="The system will match articles to this narrative. Update threat level as the situation evolves."
              icon={<Eye size={16} />}
            />
          </div>

          <TipBox type="warning">
            Narratives with HIGH or CRITICAL threat levels will automatically generate alerts for the team.
          </TipBox>
        </div>
      ),
    },
    {
      id: 'alerts',
      title: 'Threat Alerts',
      icon: <Bell size={18} />,
      content: (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Threat Alerts</h2>
            <p className="text-gray-600 mb-4">
              Alerts notify you about important events that require attention. AIIM automatically
              generates alerts based on predefined rules and thresholds.
            </p>
          </div>

          <h3 className="text-lg font-semibold text-gray-900">Alert Types</h3>

          <div className="space-y-3 mb-6">
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <TrendingUp size={20} className="text-blue-500 mt-0.5" />
              <div>
                <h4 className="font-medium text-gray-900">Volume Spike</h4>
                <p className="text-sm text-gray-600">Unusual increase in article volume for a narrative or topic</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <Zap size={20} className="text-purple-500 mt-0.5" />
              <div>
                <h4 className="font-medium text-gray-900">New Narrative</h4>
                <p className="text-sm text-gray-600">A new potentially harmful narrative has been detected</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <Globe size={20} className="text-orange-500 mt-0.5" />
              <div>
                <h4 className="font-medium text-gray-900">Cross-Platform</h4>
                <p className="text-sm text-gray-600">A narrative is spreading across multiple platforms</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <Target size={20} className="text-red-500 mt-0.5" />
              <div>
                <h4 className="font-medium text-gray-900">Coordinated Activity</h4>
                <p className="text-sm text-gray-600">Signs of coordinated inauthentic behavior detected</p>
              </div>
            </div>
          </div>

          <h3 className="text-lg font-semibold text-gray-900">Alert Workflow</h3>

          <div className="flex items-center gap-2 flex-wrap mb-4">
            <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">ACTIVE</span>
            <ArrowRight size={16} className="text-gray-400" />
            <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm font-medium">ACKNOWLEDGED</span>
            <ArrowRight size={16} className="text-gray-400" />
            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">RESOLVED</span>
          </div>

          <p className="text-sm text-gray-600 mb-4">
            <strong>Acknowledge</strong> an alert to indicate you're aware and investigating.
            <strong> Resolve</strong> it when the threat has been addressed or is no longer relevant.
          </p>

          <TipBox>
            Click the <strong>Investigate</strong> button on any alert to open the Investigation Panel
            with full context, related articles, and timeline.
          </TipBox>
        </div>
      ),
    },
    {
      id: 'sources',
      title: 'Source Management',
      icon: <Database size={18} />,
      content: (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Source Management</h2>
            <p className="text-gray-600 mb-4">
              AIIM monitors news from multiple sources including RSS feeds, Telegram channels, and web scrapers.
              Sources are categorized by type, language, and political leaning for balanced coverage.
            </p>
          </div>

          <h3 className="text-lg font-semibold text-gray-900">Source Types</h3>

          <div className="grid md:grid-cols-3 gap-4 mb-6">
            <div className="card p-4">
              <div className="flex items-center gap-2 mb-2">
                <Newspaper size={20} className="text-green-600" />
                <h4 className="font-semibold">RSS Feeds</h4>
              </div>
              <p className="text-sm text-gray-600">Traditional news outlets with RSS/Atom feeds</p>
            </div>
            <div className="card p-4">
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare size={20} className="text-purple-600" />
                <h4 className="font-semibold">Telegram</h4>
              </div>
              <p className="text-sm text-gray-600">Public Telegram channels and groups</p>
            </div>
            <div className="card p-4">
              <div className="flex items-center gap-2 mb-2">
                <Globe size={20} className="text-blue-600" />
                <h4 className="font-semibold">Web Scrape</h4>
              </div>
              <p className="text-sm text-gray-600">Direct website scraping for sources without feeds</p>
            </div>
          </div>

          <h3 className="text-lg font-semibold text-gray-900">Political Balance</h3>

          <p className="text-gray-600 mb-4">
            AIIM maintains non-partisan coverage by monitoring sources across the political spectrum:
          </p>

          <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-blue-50 via-gray-50 to-red-50 rounded-lg">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-blue-500" />
              <span className="text-sm font-medium">Government</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-gray-400" />
              <span className="text-sm font-medium">Independent</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-sm font-medium">Opposition</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-purple-500" />
              <span className="text-sm font-medium">Diaspora</span>
            </div>
          </div>

          <TipBox type="info">
            Only users with <strong>ADMIN</strong> role can add, edit, or delete sources.
          </TipBox>
        </div>
      ),
    },
    {
      id: 'topics',
      title: 'Topic Tracking',
      icon: <Tags size={18} />,
      content: (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Topic Tracking</h2>
            <p className="text-gray-600 mb-4">
              Topics allow you to track specific subjects across worldwide news using keyword-based searches.
              Unlike narratives (which track potentially harmful themes), topics are neutral monitoring subjects.
            </p>
          </div>

          <h3 className="text-lg font-semibold text-gray-900">Global News Search</h3>

          <p className="text-gray-600 mb-4">
            Topics with Global Search enabled automatically fetch articles from NewsAPI every hour,
            expanding your monitoring beyond local sources.
          </p>

          <div className="space-y-3">
            <StepCard
              number={1}
              title="Create Topic"
              description="Define a topic name and relevant keywords (comma-separated)."
              icon={<Tags size={16} />}
            />
            <StepCard
              number={2}
              title="Enable Global Search"
              description="Turn on worldwide search to fetch international coverage via NewsAPI."
              icon={<Globe size={16} />}
            />
            <StepCard
              number={3}
              title="Select Language"
              description="Choose the primary language for search results."
              icon={<FileText size={16} />}
            />
            <StepCard
              number={4}
              title="Monitor Results"
              description="View matched articles in the Content Feed, filtered by topic."
              icon={<Eye size={16} />}
            />
          </div>

          <TipBox>
            Use quotes in keywords for exact phrase matching: <code className="bg-gray-100 px-1 rounded">"Armenia election"</code>
          </TipBox>
        </div>
      ),
    },
    {
      id: 'reports',
      title: 'Reports',
      icon: <FileText size={18} />,
      content: (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Reports</h2>
            <p className="text-gray-600 mb-4">
              Generate comprehensive reports summarizing activity, threats, and trends.
              Reports can be exported for sharing with stakeholders.
            </p>
          </div>

          <h3 className="text-lg font-semibold text-gray-900">Report Types</h3>

          <div className="space-y-3 mb-6">
            <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
              <Clock size={20} className="text-blue-500 mt-0.5" />
              <div>
                <h4 className="font-medium text-gray-900">Daily Summary</h4>
                <p className="text-sm text-gray-600">24-hour overview of activity, new alerts, and sentiment shifts</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
              <TrendingUp size={20} className="text-green-500 mt-0.5" />
              <div>
                <h4 className="font-medium text-gray-900">Weekly Analysis</h4>
                <p className="text-sm text-gray-600">Week-long trends, top narratives, and source analysis</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
              <AlertTriangle size={20} className="text-red-500 mt-0.5" />
              <div>
                <h4 className="font-medium text-gray-900">Incident Report</h4>
                <p className="text-sm text-gray-600">Detailed analysis of a specific narrative or threat</p>
              </div>
            </div>
          </div>

          <h3 className="text-lg font-semibold text-gray-900">Export Formats</h3>

          <div className="flex gap-3">
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg">
              <Download size={16} className="text-gray-600" />
              <span className="text-sm font-medium">CSV</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg">
              <Download size={16} className="text-gray-600" />
              <span className="text-sm font-medium">Markdown</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'api',
      title: 'API Documentation',
      icon: <ExternalLink size={18} />,
      content: (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">API Documentation</h2>
            <p className="text-gray-600 mb-4">
              AIIM provides a comprehensive REST API for programmatic access to all features.
              The API documentation is available via Swagger UI.
            </p>
          </div>

          <div className="card p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Swagger UI</h3>
                <p className="text-sm text-gray-600">Interactive API documentation with try-it-out functionality</p>
              </div>
              <a
                href="http://localhost:8080/swagger-ui/index.html"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary flex items-center gap-2"
              >
                <ExternalLink size={16} />
                Open Swagger
              </a>
            </div>
          </div>

          <h3 className="text-lg font-semibold text-gray-900">Authentication</h3>

          <p className="text-gray-600 mb-4">
            API requests require JWT authentication. Include the token in the Authorization header:
          </p>

          <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm overflow-x-auto">
            <code>Authorization: Bearer {'<your-token>'}</code>
          </div>

          <h3 className="text-lg font-semibold text-gray-900 mt-6">Key Endpoints</h3>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 font-medium text-gray-700">Endpoint</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-700">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-mono text-xs">
                <tr>
                  <td className="py-2 px-3">POST /api/v1/auth/login</td>
                  <td className="py-2 px-3 font-sans text-gray-600">Authenticate and get JWT token</td>
                </tr>
                <tr>
                  <td className="py-2 px-3">GET /api/v1/articles</td>
                  <td className="py-2 px-3 font-sans text-gray-600">List articles with filters</td>
                </tr>
                <tr>
                  <td className="py-2 px-3">GET /api/v1/narratives</td>
                  <td className="py-2 px-3 font-sans text-gray-600">List tracked narratives</td>
                </tr>
                <tr>
                  <td className="py-2 px-3">GET /api/v1/alerts</td>
                  <td className="py-2 px-3 font-sans text-gray-600">List threat alerts</td>
                </tr>
                <tr>
                  <td className="py-2 px-3">GET /api/v1/dashboard/stats</td>
                  <td className="py-2 px-3 font-sans text-gray-600">Dashboard statistics</td>
                </tr>
              </tbody>
            </table>
          </div>

          <TipBox type="info">
            See the full API documentation in Swagger for all available endpoints, request/response schemas, and try-it-out functionality.
          </TipBox>
        </div>
      ),
    },
    {
      id: 'shortcuts',
      title: 'Keyboard Shortcuts',
      icon: <Zap size={18} />,
      content: (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Keyboard Shortcuts</h2>
            <p className="text-gray-600 mb-4">
              Use these keyboard shortcuts to navigate AIIM more efficiently.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Shortcut</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr>
                  <td className="py-3 px-4"><KeyboardShortcut keys={['Cmd', 'K']} /></td>
                  <td className="py-3 px-4 text-gray-600">Open global search</td>
                </tr>
                <tr>
                  <td className="py-3 px-4"><KeyboardShortcut keys={['Esc']} /></td>
                  <td className="py-3 px-4 text-gray-600">Close modal/dialog</td>
                </tr>
                <tr>
                  <td className="py-3 px-4"><KeyboardShortcut keys={['↑']} /> / <KeyboardShortcut keys={['↓']} /></td>
                  <td className="py-3 px-4 text-gray-600">Navigate search results</td>
                </tr>
                <tr>
                  <td className="py-3 px-4"><KeyboardShortcut keys={['Enter']} /></td>
                  <td className="py-3 px-4 text-gray-600">Select search result</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      ),
    },
    {
      id: 'faq',
      title: 'FAQ',
      icon: <HelpCircle size={18} />,
      content: (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Frequently Asked Questions</h2>
          </div>

          {[
            {
              id: 'faq-1',
              q: 'How often is content updated?',
              a: 'RSS feeds are checked every 15 minutes. Telegram channels are monitored in real-time. Global topic searches run hourly.',
            },
            {
              id: 'faq-2',
              q: 'How is sentiment determined?',
              a: 'AIIM uses AI-powered sentiment analysis to classify articles as Positive, Negative, or Neutral based on the content and language patterns.',
            },
            {
              id: 'faq-3',
              q: 'What triggers an alert?',
              a: 'Alerts are triggered by: volume spikes (unusual increase in articles), threat level changes, cross-platform spread, or signs of coordinated activity.',
            },
            {
              id: 'faq-4',
              q: 'Can I add custom news sources?',
              a: 'Yes, users with ADMIN role can add RSS feeds, Telegram channels, or configure web scrapers for custom sources.',
            },
            {
              id: 'faq-5',
              q: 'How do I export data?',
              a: 'Reports can be exported in CSV or Markdown format from the Reports page. API access also allows programmatic data export.',
            },
            {
              id: 'faq-6',
              q: 'What languages are supported?',
              a: 'AIIM fully supports Armenian, Russian, and English content with language-specific sentiment analysis.',
            },
          ].map((faq) => (
            <div key={faq.id} className="border border-gray-200 rounded-lg overflow-hidden">
              <button
                onClick={() => setExpandedFaq(expandedFaq === faq.id ? null : faq.id)}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
              >
                <span className="font-medium text-gray-900">{faq.q}</span>
                <ChevronDown
                  size={20}
                  className={`text-gray-400 transition-transform ${
                    expandedFaq === faq.id ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {expandedFaq === faq.id && (
                <div className="px-4 pb-4 text-gray-600">{faq.a}</div>
              )}
            </div>
          ))}
        </div>
      ),
    },
  ]

  const scrollToSection = (id: string) => {
    setActiveSection(id)
    const element = document.getElementById(`section-${id}`)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <div className="flex gap-8">
      {/* Sidebar TOC */}
      <aside className="w-64 flex-shrink-0 hidden lg:block">
        <div className="sticky top-24">
          <div className="flex items-center gap-2 mb-4 px-3">
            <Book size={20} className="text-primary-600" />
            <h2 className="font-semibold text-gray-900">User Guide</h2>
          </div>
          <TableOfContents
            sections={sections}
            activeSection={activeSection}
            onSelect={scrollToSection}
          />

          <div className="mt-6 p-4 bg-amber-50 rounded-lg border border-amber-200">
            <div className="flex items-center gap-2 mb-2">
              <Play size={16} className="text-amber-600" />
              <span className="font-medium text-amber-900 text-sm">Interactive Tour</span>
            </div>
            <p className="text-xs text-amber-700 mb-3">
              Learn the basics with a guided walkthrough
            </p>
            <button onClick={resetTour} className="btn btn-sm w-full bg-amber-500 text-white hover:bg-amber-600">
              Start Tour
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0">
        <div className="space-y-12">
          {sections.map((section) => (
            <section
              key={section.id}
              id={`section-${section.id}`}
              className="scroll-mt-24"
            >
              <div className="card p-6 lg:p-8">{section.content}</div>
            </section>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-8 p-6 bg-gray-50 rounded-lg text-center">
          <p className="text-gray-600 mb-4">
            Need more help? Contact your team administrator or check the API documentation.
          </p>
          <div className="flex justify-center gap-4">
            <a
              href="http://localhost:8080/swagger-ui/index.html"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary flex items-center gap-2"
            >
              <ExternalLink size={16} />
              API Docs
            </a>
            <Link to="/settings" className="btn btn-secondary flex items-center gap-2">
              <Settings size={16} />
              Settings
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}

// Missing Plus icon - add to imports workaround
function Plus({ size, className }: { size: number; className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <line x1="12" y1="5" x2="12" y2="19"></line>
      <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>
  )
}
