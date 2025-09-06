'use client';

import React, { useMemo } from 'react';
import DOMPurify from 'isomorphic-dompurify';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { LogicError } from '@/types/analysis';
import { ErrorContext } from '@/types/visualization';
import { AlertCircle, FileText, Users, MapPin, Clock } from 'lucide-react';

interface ContextPanelProps {
  error: LogicError | null;
  scriptContent?: string;
  onNavigateToError?: (error: LogicError) => void;
  contextLines?: number;
}

export const ContextPanel = React.memo<ContextPanelProps>(({
  error,
  scriptContent,
  onNavigateToError,
  contextLines = 5
}) => {
  const context = useMemo<ErrorContext | null>(() => {
    if (!error || !scriptContent) return null;
    
    // Sanitize script content
    const sanitized = DOMPurify.sanitize(scriptContent, { 
      ALLOWED_TAGS: [],
      KEEP_CONTENT: true 
    });
    const lines = sanitized.split('\n');
    const lineNumber = error.location.lineNumber || error.location.line || 0;
    
    if (lineNumber === 0) return null;
    
    const startLine = Math.max(1, lineNumber - contextLines);
    const endLine = Math.min(lines.length, lineNumber + contextLines);
    
    return {
      before: lines.slice(startLine - 1, lineNumber - 1),
      after: lines.slice(lineNumber, endLine),
      scene: error.location.sceneId,
      characters: error.location.characterName ? [error.location.characterName] : [],
      lineNumber,
      columnNumber: error.location.column
    };
  }, [error, scriptContent, contextLines]);

  if (!error) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Error Context</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <AlertCircle size={48} className="mb-4" />
            <p>Select an error to view its context</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getSeverityColor = (severity: string) => {
    const colors = {
      critical: 'destructive',
      high: 'destructive',
      medium: 'secondary',
      low: 'outline'
    };
    return colors[severity as keyof typeof colors] || 'outline';
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Error Context</span>
          <Badge variant={getSeverityColor(error.severity) as any}>
            {error.severity}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="details" className="h-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="context">Context</TabsTrigger>
            <TabsTrigger value="related">Related</TabsTrigger>
          </TabsList>
          
          <TabsContent value="details" className="space-y-4">
            <div className="space-y-3">
              <div>
                <h3 className="text-sm font-semibold mb-1">Error Type</h3>
                <Badge variant="outline" className="capitalize">
                  {error.type}
                </Badge>
              </div>
              
              <div>
                <h3 className="text-sm font-semibold mb-1">Description</h3>
                <p className="text-sm text-gray-700">
                  {DOMPurify.sanitize(error.description, { ALLOWED_TAGS: [] })}
                </p>
              </div>
              
              {error.suggestion && (
                <div>
                  <h3 className="text-sm font-semibold mb-1">Suggestion</h3>
                  <p className="text-sm text-blue-600">
                    {DOMPurify.sanitize(error.suggestion, { ALLOWED_TAGS: [] })}
                  </p>
                </div>
              )}
              
              <div>
                <h3 className="text-sm font-semibold mb-1">Location</h3>
                <div className="flex flex-wrap gap-2">
                  {error.location.sceneNumber !== undefined && (
                    <div className="flex items-center gap-1 text-sm">
                      <MapPin size={14} />
                      <span>Scene {error.location.sceneNumber}</span>
                    </div>
                  )}
                  {error.location.lineNumber !== undefined && (
                    <div className="flex items-center gap-1 text-sm">
                      <FileText size={14} />
                      <span>Line {error.location.lineNumber}</span>
                    </div>
                  )}
                  {error.location.characterName && (
                    <div className="flex items-center gap-1 text-sm">
                      <Users size={14} />
                      <span>{error.location.characterName}</span>
                    </div>
                  )}
                  {error.location.timeReference && (
                    <div className="flex items-center gap-1 text-sm">
                      <Clock size={14} />
                      <span>{error.location.timeReference}</span>
                    </div>
                  )}
                </div>
              </div>
              
              <button
                onClick={() => onNavigateToError?.(error)}
                className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              >
                Go to Error Location
              </button>
            </div>
          </TabsContent>
          
          <TabsContent value="context">
            {context ? (
              <ScrollArea className="h-96">
                <div className="font-mono text-sm space-y-1">
                  {context.before.map((line, index) => (
                    <div key={`before-${index}`} className="flex">
                      <span className="w-12 text-right pr-2 text-gray-500">
                        {context.lineNumber - context.before.length + index}
                      </span>
                      <pre className="text-gray-600">{line}</pre>
                    </div>
                  ))}
                  
                  <div className="flex bg-red-50 border-l-4 border-red-500">
                    <span className="w-12 text-right pr-2 font-semibold text-red-600">
                      {context.lineNumber}
                    </span>
                    <pre className="font-semibold text-red-900">
                      {DOMPurify.sanitize(scriptContent?.split('\n')[context.lineNumber - 1] || '', { ALLOWED_TAGS: [] })}
                    </pre>
                  </div>
                  
                  {context.after.map((line, index) => (
                    <div key={`after-${index}`} className="flex">
                      <span className="w-12 text-right pr-2 text-gray-500">
                        {context.lineNumber + index + 1}
                      </span>
                      <pre className="text-gray-600">{line}</pre>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="text-center text-gray-500 py-8">
                No context available
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="related">
            <div className="space-y-2">
              {error.relatedElements && error.relatedElements.length > 0 ? (
                <>
                  <h3 className="text-sm font-semibold mb-2">Related Elements</h3>
                  <div className="flex flex-wrap gap-2">
                    {error.relatedElements.map((element, index) => (
                      <Badge key={index} variant="outline">
                        {element}
                      </Badge>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  No related elements found
                </div>
              )}
              
              {error.context && (
                <div className="mt-4">
                  <h3 className="text-sm font-semibold mb-2">Additional Context</h3>
                  <p className="text-sm text-gray-700">{error.context}</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
});

ContextPanel.displayName = 'ContextPanel';