import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { reportsApi, narrativesApi } from '../services/api'

interface ReportType {
  id: string
  name: string
  description: string
  formats: string[]
}

interface ReportData {
  title: string
  type: string
  generatedAt: string
  periodStart: string
  periodEnd: string
  summary: {
    totalArticles: number
    totalNarratives: number
    totalAlerts: number
    highThreatNarratives: number
    overallThreatLevel: string
  }
  narratives: Array<{
    id: number
    name: string
    threatLevel: string
    articleCount: number
  }>
  alerts: Array<{
    id: number
    title: string
    severity: string
    status: string
  }>
}

const reportIcons: Record<string, string> = {
  weekly: '📊',
  daily: '📋',
  incident: '🚨',
  'eu-dsa': '🇪🇺',
}

function downloadBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  window.URL.revokeObjectURL(url)
  document.body.removeChild(a)
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function ReportsPage() {
  const [selectedType, setSelectedType] = useState<string | null>(null)
  const [selectedNarrativeId, setSelectedNarrativeId] = useState<number | null>(null)
  const [previewData, setPreviewData] = useState<ReportData | null>(null)
  const [exporting, setExporting] = useState(false)

  // Fetch report types
  const { data: reportTypes } = useQuery({
    queryKey: ['report-types'],
    queryFn: async () => {
      const res = await reportsApi.getTypes()
      return res.data as ReportType[]
    },
  })

  // Fetch narratives for incident reports
  const { data: narrativesData } = useQuery({
    queryKey: ['narratives-for-reports'],
    queryFn: async () => {
      const res = await narrativesApi.getAll()
      return res.data
    },
  })

  const narratives = narrativesData?.content || []

  // Generate report preview
  const generatePreview = async () => {
    if (!selectedType) return

    try {
      let res
      if (selectedType === 'weekly') {
        res = await reportsApi.getWeekly()
      } else if (selectedType === 'daily') {
        res = await reportsApi.getDaily()
      } else if (selectedType === 'incident' && selectedNarrativeId) {
        res = await reportsApi.getIncident(selectedNarrativeId)
      } else {
        return
      }
      setPreviewData(res.data)
    } catch (error) {
      toast.error('Failed to generate preview')
    }
  }

  // Export handlers
  const handleExportCSV = async () => {
    if (!selectedType) return
    setExporting(true)

    try {
      let res
      let filename = 'aiim-report.csv'

      if (selectedType === 'weekly') {
        res = await reportsApi.exportWeeklyCSV()
        filename = `aiim-weekly-${new Date().toISOString().split('T')[0]}.csv`
      } else if (selectedType === 'daily') {
        res = await reportsApi.exportDailyCSV()
        filename = `aiim-daily-${new Date().toISOString().split('T')[0]}.csv`
      } else if (selectedType === 'incident' && selectedNarrativeId) {
        res = await reportsApi.exportIncidentCSV(selectedNarrativeId)
        filename = `aiim-incident-${selectedNarrativeId}-${new Date().toISOString().split('T')[0]}.csv`
      } else {
        return
      }

      downloadBlob(res.data, filename)
      toast.success('Report exported successfully')
    } catch (error) {
      toast.error('Export failed')
    } finally {
      setExporting(false)
    }
  }

  const handleExportMarkdown = async () => {
    if (!selectedType) return
    setExporting(true)

    try {
      let res
      let filename = 'aiim-report.md'

      if (selectedType === 'weekly') {
        res = await reportsApi.exportWeeklyMarkdown()
        filename = `aiim-weekly-${new Date().toISOString().split('T')[0]}.md`
      } else if (selectedType === 'incident' && selectedNarrativeId) {
        res = await reportsApi.exportIncidentMarkdown(selectedNarrativeId)
        filename = `aiim-incident-${selectedNarrativeId}-${new Date().toISOString().split('T')[0]}.md`
      } else {
        return
      }

      downloadBlob(res.data, filename)
      toast.success('Report exported successfully')
    } catch (error) {
      toast.error('Export failed')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header with branding */}
      <div className="bg-gradient-to-r from-indigo-600 to-blue-600 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Reports & Analytics</h1>
            <p className="text-indigo-100 mt-1">
              Generate professional reports for stakeholders, donors, and EU compliance
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-indigo-200">Report formats</p>
            <div className="flex gap-2 mt-1">
              <span className="px-2 py-1 bg-white/20 rounded text-xs">CSV</span>
              <span className="px-2 py-1 bg-white/20 rounded text-xs">Markdown</span>
              <span className="px-2 py-1 bg-white/20 rounded text-xs">JSON</span>
            </div>
          </div>
        </div>
      </div>

      {/* Report Templates */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Report Templates</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {reportTypes?.map(type => (
            <div
              key={type.id}
              onClick={() => {
                setSelectedType(type.id)
                setPreviewData(null)
                setSelectedNarrativeId(null)
              }}
              className={`bg-white rounded-xl border-2 p-6 cursor-pointer transition-all hover:shadow-md ${
                selectedType === type.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
              }`}
            >
              <span className="text-3xl mb-3 block">{reportIcons[type.id] || '📄'}</span>
              <h3 className="font-semibold text-gray-900">{type.name}</h3>
              <p className="text-sm text-gray-600 mt-1">{type.description}</p>
              <div className="mt-3 flex flex-wrap gap-1">
                {type.formats.map(fmt => (
                  <span key={fmt} className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                    {fmt.toUpperCase()}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Report Configuration */}
      {selectedType && (
        <div className="bg-white rounded-xl border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Generate: {reportTypes?.find(t => t.id === selectedType)?.name}
          </h2>

          {selectedType === 'incident' && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Narrative for Incident Report
              </label>
              <select
                value={selectedNarrativeId || ''}
                onChange={e => setSelectedNarrativeId(Number(e.target.value) || null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select a narrative...</option>
                {narratives.map((n: { id: number; name: string; threatLevel: string }) => (
                  <option key={n.id} value={n.id}>
                    {n.name} ({n.threatLevel})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <button
              onClick={generatePreview}
              disabled={selectedType === 'incident' && !selectedNarrativeId}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Preview Report
            </button>
            <button
              onClick={handleExportCSV}
              disabled={exporting || (selectedType === 'incident' && !selectedNarrativeId)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {exporting ? 'Exporting...' : 'Export CSV'}
            </button>
            {(selectedType === 'weekly' || selectedType === 'incident') && (
              <button
                onClick={handleExportMarkdown}
                disabled={exporting || (selectedType === 'incident' && !selectedNarrativeId)}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                Export Markdown
              </button>
            )}
            <button
              onClick={() => {
                setSelectedType(null)
                setPreviewData(null)
              }}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Report Preview */}
      {previewData && (
        <div className="bg-white rounded-xl border p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">{previewData.title}</h2>
            <span className="text-sm text-gray-600">
              Generated: {formatDate(previewData.generatedAt)}
            </span>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{previewData.summary.totalArticles}</p>
              <p className="text-xs text-gray-600">Articles</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{previewData.summary.totalNarratives}</p>
              <p className="text-xs text-gray-600">Narratives</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{previewData.summary.totalAlerts}</p>
              <p className="text-xs text-gray-600">Alerts</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-red-600">{previewData.summary.highThreatNarratives}</p>
              <p className="text-xs text-gray-600">High Threat</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <p className={`text-2xl font-bold ${
                previewData.summary.overallThreatLevel === 'HIGH' || previewData.summary.overallThreatLevel === 'CRITICAL'
                  ? 'text-red-600'
                  : previewData.summary.overallThreatLevel === 'MEDIUM'
                  ? 'text-amber-600'
                  : 'text-green-600'
              }`}>
                {previewData.summary.overallThreatLevel}
              </p>
              <p className="text-xs text-gray-600">Threat Level</p>
            </div>
          </div>

          {/* Period */}
          <div className="mb-6 text-sm text-gray-600">
            <strong>Report Period:</strong> {formatDate(previewData.periodStart)} — {formatDate(previewData.periodEnd)}
          </div>

          {/* Narratives Table */}
          {previewData.narratives && previewData.narratives.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-3">Active Narratives</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left border-b">
                      <th className="pb-2 font-medium text-gray-600">Narrative</th>
                      <th className="pb-2 font-medium text-gray-600">Threat Level</th>
                      <th className="pb-2 font-medium text-gray-600">Articles</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {previewData.narratives.filter(n => n).map(n => (
                      <tr key={n.id}>
                        <td className="py-2 font-medium">{n.name}</td>
                        <td className="py-2">
                          <span className={`px-2 py-0.5 text-xs rounded text-white ${
                            n.threatLevel === 'HIGH' || n.threatLevel === 'CRITICAL' ? 'bg-red-600' :
                            n.threatLevel === 'MEDIUM' ? 'bg-amber-500' : 'bg-gray-500'
                          }`}>
                            {n.threatLevel}
                          </span>
                        </td>
                        <td className="py-2">{n.articleCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Alerts Table */}
          {previewData.alerts && previewData.alerts.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Alerts in Period</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left border-b">
                      <th className="pb-2 font-medium text-gray-600">Alert</th>
                      <th className="pb-2 font-medium text-gray-600">Severity</th>
                      <th className="pb-2 font-medium text-gray-600">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {previewData.alerts.map(a => (
                      <tr key={a.id}>
                        <td className="py-2 font-medium">{a.title}</td>
                        <td className="py-2">
                          <span className={`px-2 py-0.5 text-xs rounded text-white ${
                            a.severity === 'HIGH' || a.severity === 'CRITICAL' ? 'bg-red-600' :
                            a.severity === 'MEDIUM' ? 'bg-amber-500' : 'bg-blue-500'
                          }`}>
                            {a.severity}
                          </span>
                        </td>
                        <td className="py-2">
                          <span className={`px-2 py-0.5 text-xs rounded border ${
                            a.status === 'ACTIVE' ? 'bg-red-50 text-red-700 border-red-200' :
                            a.status === 'ACKNOWLEDGED' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                            'bg-green-50 text-green-700 border-green-200'
                          }`}>
                            {a.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Donor Reporting Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h3 className="font-semibold text-blue-900 mb-2">Donor Reporting Ready</h3>
        <p className="text-sm text-blue-700">
          All reports are formatted to meet EU and international donor reporting requirements.
          Export formats include CSV for data analysis and Markdown for documentation.
          Reports include logframe-compatible metrics, narrative analysis, and impact indicators.
        </p>
      </div>
    </div>
  )
}
