'use client';

export const dynamic = 'force-dynamic';

import { V1ScriptUpload } from '@/components/analysis/v1-script-upload';
import { V1AnalysisControl } from '@/components/analysis/v1-analysis-control';
import { useV1AnalysisStore } from '@/lib/stores/v1-analysis-store';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Database,
  GitBranch,
  Cloud,
  Activity
} from 'lucide-react';

export default function V1DemoPage() {
  const {
    currentProject,
    analysisResults,
    workflowData,
    errorMessage
  } = useV1AnalysisStore();

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Database className="h-8 w-8" />
            V1 API Migration Demo
          </h1>
          <p className="text-gray-600 mt-2">
            Five-Act Workflow System with Database Persistence
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="secondary">
            <Cloud className="h-3 w-3 mr-1" />
            V1 API
          </Badge>
          <Badge variant="secondary">
            <GitBranch className="h-3 w-3 mr-1" />
            Act 1
          </Badge>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column - Upload & Control */}
        <div className="lg:col-span-1 space-y-6">
          <V1ScriptUpload />
          <V1AnalysisControl />
        </div>

        {/* Right Column - Results & Status */}
        <div className="lg:col-span-2 space-y-6">
          {/* Workflow Status Card */}
          {workflowData && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Workflow Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Workflow Stage</p>
                    <p className="font-semibold">{workflowData.workflowStatus}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Script Versions</p>
                    <p className="font-semibold">{workflowData.scriptVersions}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Jobs Statistics</p>
                    <div className="flex gap-2 mt-1">
                      <Badge variant="outline">
                        Queued: {workflowData.statistics.queued}
                      </Badge>
                      <Badge variant="outline">
                        Completed: {workflowData.statistics.completed}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Last Updated</p>
                    <p className="font-semibold">
                      {new Date(workflowData.updatedAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Analysis Results */}
          {analysisResults ? (
            <Card>
              <CardHeader>
                <CardTitle>Analysis Results</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="errors">
                  <TabsList>
                    <TabsTrigger value="errors">
                      Errors ({analysisResults.errors.length})
                    </TabsTrigger>
                    <TabsTrigger value="suggestions">
                      Suggestions ({analysisResults.suggestions.length})
                    </TabsTrigger>
                    <TabsTrigger value="metadata">
                      Metadata
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="errors" className="space-y-3">
                    {analysisResults.errors.length === 0 ? (
                      <Alert>
                        <CheckCircle2 className="h-4 w-4" />
                        <AlertTitle>No Errors Found</AlertTitle>
                        <AlertDescription>
                          The script analysis found no logic errors.
                        </AlertDescription>
                      </Alert>
                    ) : (
                      analysisResults.errors.map((error, index) => (
                        <Alert
                          key={error.id || index}
                          variant={error.severity === 'high' ? 'destructive' : 'default'}
                        >
                          <AlertCircle className="h-4 w-4" />
                          <AlertTitle>
                            {error.type} - {error.severity}
                          </AlertTitle>
                          <AlertDescription>
                            {error.description}
                            {error.suggestion && (
                              <p className="mt-2 text-sm">
                                💡 {error.suggestion}
                              </p>
                            )}
                          </AlertDescription>
                        </Alert>
                      ))
                    )}
                  </TabsContent>

                  <TabsContent value="suggestions" className="space-y-3">
                    {analysisResults.suggestions.length === 0 ? (
                      <Alert>
                        <AlertDescription>
                          No suggestions available.
                        </AlertDescription>
                      </Alert>
                    ) : (
                      analysisResults.suggestions.map((suggestion, index) => (
                        <Alert key={suggestion.id || index}>
                          <AlertDescription>
                            <strong>Type:</strong> {(suggestion as any).type || 'correction'}<br />
                            <strong>Description:</strong> {(suggestion as any).description || suggestion.rationale}<br />
                            <strong>Impact:</strong> {(suggestion as any).impact || suggestion.priority}
                          </AlertDescription>
                        </Alert>
                      ))
                    )}
                  </TabsContent>

                  <TabsContent value="metadata" className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Error Count</p>
                        <p className="font-semibold">
                          {analysisResults.metadata?.errorCount || 0}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Confidence</p>
                        <p className="font-semibold">
                          {((analysisResults.metadata?.confidence || 0) * 100).toFixed(1)}%
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Script Length</p>
                        <p className="font-semibold">
                          {analysisResults.metadata?.scriptLength || 0} chars
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Analysis Time</p>
                        <p className="font-semibold">
                          {analysisResults.metadata?.analysisTime
                            ? new Date(analysisResults.metadata.analysisTime).toLocaleString()
                            : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          ) : currentProject ? (
            <Alert>
              <Database className="h-4 w-4" />
              <AlertTitle>Project Loaded</AlertTitle>
              <AlertDescription>
                Project "{currentProject.title}" is ready for analysis.
                Click "开始 Act 1 分析" to begin.
              </AlertDescription>
            </Alert>
          ) : (
            <Alert>
              <AlertDescription>
                Upload a script or select an existing project to begin analysis.
              </AlertDescription>
            </Alert>
          )}

          {/* Error Display */}
          {errorMessage && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}
        </div>
      </div>
    </div>
  );
}