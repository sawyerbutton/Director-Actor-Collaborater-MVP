'use client'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { AlertTriangle, XCircle, AlertCircle, FileText } from 'lucide-react'
import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export interface CrossFileFinding {
  id: string
  type: 'cross_file_timeline' | 'cross_file_character' | 'cross_file_plot' | 'cross_file_setting'
  severity: 'high' | 'medium' | 'low'
  affectedFiles: Array<{
    fileId: string
    filename: string
    episodeNumber: number | null
    location?: {
      sceneId?: string
      line?: number
    }
  }>
  description: string
  suggestion: string
  confidence: number
  evidence: string[]
}

interface CrossFileFindingsDisplayProps {
  findings: CrossFileFinding[]
}

const getCrossFileTypeLabel = (type: string) => {
  switch (type) {
    case 'cross_file_timeline': return '时间线'
    case 'cross_file_character': return '角色'
    case 'cross_file_plot': return '情节'
    case 'cross_file_setting': return '设定'
    default: return type
  }
}

const getCrossFileSeverityColor = (severity: string) => {
  switch (severity) {
    case 'high': return 'destructive'
    case 'medium': return 'secondary'
    case 'low': return 'outline'
    default: return 'default'
  }
}

const getCrossFileSeverityIcon = (severity: string) => {
  switch (severity) {
    case 'high': return <XCircle className="h-4 w-4" />
    case 'medium': return <AlertTriangle className="h-4 w-4" />
    case 'low': return <AlertCircle className="h-4 w-4" />
    default: return <AlertCircle className="h-4 w-4" />
  }
}

const getCrossFileSeverityLabel = (severity: string) => {
  switch (severity) {
    case 'high': return '高'
    case 'medium': return '中'
    case 'low': return '低'
    default: return severity
  }
}

export function CrossFileFindingsDisplay({ findings }: CrossFileFindingsDisplayProps) {
  const [viewMode, setViewMode] = useState<'all' | 'grouped'>('all')

  // Group findings by type
  const groupedFindings = findings.reduce((acc, finding) => {
    const type = finding.type
    if (!acc[type]) {
      acc[type] = []
    }
    acc[type].push(finding)
    return acc
  }, {} as Record<string, CrossFileFinding[]>)

  const findingTypes = Object.keys(groupedFindings)

  if (findings.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-gray-500">未发现跨文件一致性问题</p>
        </CardContent>
      </Card>
    )
  }

  const renderFinding = (finding: CrossFileFinding) => (
    <Card key={finding.id} className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="space-y-3">
          {/* Header with badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={getCrossFileSeverityColor(finding.severity) as any}>
              {getCrossFileSeverityIcon(finding.severity)}
              <span className="ml-1">{getCrossFileSeverityLabel(finding.severity)}</span>
            </Badge>
            <Badge variant="outline">{getCrossFileTypeLabel(finding.type)}</Badge>
            <span className="text-sm text-gray-500">
              置信度: {(finding.confidence * 100).toFixed(0)}%
            </span>
          </div>

          {/* Description */}
          <p className="font-medium text-base">{finding.description}</p>

          {/* Affected Files */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">涉及文件:</p>
            <div className="flex flex-wrap gap-2">
              {finding.affectedFiles.map((file, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 rounded-md border border-gray-200"
                >
                  <FileText className="h-3.5 w-3.5 text-gray-500" />
                  <span className="text-sm">{file.filename}</span>
                  {file.episodeNumber && (
                    <Badge variant="outline" className="text-xs">
                      第{file.episodeNumber}集
                    </Badge>
                  )}
                  {file.location?.sceneId && (
                    <span className="text-xs text-gray-500">
                      {file.location.sceneId}
                    </span>
                  )}
                  {file.location?.line && (
                    <span className="text-xs text-gray-500">
                      L{file.location.line}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Evidence */}
          {finding.evidence && finding.evidence.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">问题证据:</p>
              <ul className="list-disc list-inside space-y-1">
                {finding.evidence.map((item, idx) => (
                  <li key={idx} className="text-sm text-gray-600">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Suggestion */}
          {finding.suggestion && (
            <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm font-medium text-blue-900 mb-1">修复建议:</p>
              <p className="text-sm text-blue-800">{finding.suggestion}</p>
            </div>
          )}
        </div>
      </CardHeader>
    </Card>
  )

  if (viewMode === 'grouped' && findingTypes.length > 1) {
    return (
      <div className="space-y-4">
        <div className="flex justify-end">
          <button
            onClick={() => setViewMode('all')}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            显示全部
          </button>
        </div>
        <Tabs defaultValue={findingTypes[0]} className="w-full">
          <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${findingTypes.length}, 1fr)` }}>
            {findingTypes.map(type => (
              <TabsTrigger key={type} value={type}>
                {getCrossFileTypeLabel(type)}
                <Badge className="ml-2" variant="outline">
                  {groupedFindings[type].length}
                </Badge>
              </TabsTrigger>
            ))}
          </TabsList>
          {findingTypes.map(type => (
            <TabsContent key={type} value={type} className="space-y-4 mt-4">
              {groupedFindings[type].map(renderFinding)}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {findingTypes.length > 1 && (
        <div className="flex justify-end">
          <button
            onClick={() => setViewMode('grouped')}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            按类型分组
          </button>
        </div>
      )}
      {findings.map(renderFinding)}
    </div>
  )
}
