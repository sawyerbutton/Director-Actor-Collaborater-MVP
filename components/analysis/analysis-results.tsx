'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  AlertTriangle, 
  Info, 
  ChevronDown, 
  ChevronUp,
  Filter,
  Search,
  Lightbulb,
  MapPin,
  Clock
} from 'lucide-react';
import { LogicError, ErrorSeverity, LogicErrorType } from '@/types/analysis';
import { Suggestion } from '@/types/revision';

interface AnalysisResultsProps {
  results: {
    errors: LogicError[];
    suggestions: Suggestion[];
    metadata?: {
      analysisTime?: number;
      scriptLength?: number;
      errorCount?: number;
    };
  };
}

export function AnalysisResults({ results }: AnalysisResultsProps) {
  const [expandedErrors, setExpandedErrors] = useState<Set<string>>(new Set());
  const [filterType, setFilterType] = useState<LogicErrorType | 'all'>('all');
  const [filterSeverity, setFilterSeverity] = useState<ErrorSeverity | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'severity' | 'type' | 'location'>('severity');

  const toggleError = (errorId: string) => {
    setExpandedErrors(prev => {
      const newSet = new Set(prev);
      if (newSet.has(errorId)) {
        newSet.delete(errorId);
      } else {
        newSet.add(errorId);
      }
      return newSet;
    });
  };

  const filteredAndSortedErrors = useMemo(() => {
    let filtered = results.errors;

    // Apply type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(error => error.type === filterType);
    }

    // Apply severity filter
    if (filterSeverity !== 'all') {
      filtered = filtered.filter(error => error.severity === filterSeverity);
    }

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(error => 
        error.description.toLowerCase().includes(searchLower) ||
        error.suggestion?.toLowerCase().includes(searchLower)
      );
    }

    // Sort
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'severity':
          return severityOrder[a.severity] - severityOrder[b.severity];
        case 'type':
          return a.type.localeCompare(b.type);
        case 'location':
          const aLine = a.location.line || 0;
          const bLine = b.location.line || 0;
          return aLine - bLine;
        default:
          return 0;
      }
    });

    return filtered;
  }, [results.errors, filterType, filterSeverity, searchTerm, sortBy]);

  const getSeverityColor = (severity: ErrorSeverity) => {
    switch (severity) {
      case 'critical':
        return 'destructive';
      case 'high':
        return 'default';
      case 'medium':
        return 'secondary';
      case 'low':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const getSeverityIcon = (severity: ErrorSeverity) => {
    switch (severity) {
      case 'critical':
      case 'high':
        return <AlertTriangle className="w-4 h-4" />;
      case 'medium':
      case 'low':
        return <Info className="w-4 h-4" />;
      default:
        return <Info className="w-4 h-4" />;
    }
  };

  const getErrorTypeLabel = (type: LogicErrorType) => {
    const labels: Record<LogicErrorType, string> = {
      timeline: '时间线错误',
      character: '角色一致性',
      plot: '情节逻辑',
      dialogue: '对话问题',
      scene: '场景转换'
    };
    return labels[type] || type;
  };

  const getSuggestionForError = (errorId: string) => {
    return results.suggestions.find(s => s.errorId === errorId);
  };

  return (
    <div className="space-y-6">
      {/* Summary Statistics */}
      {results.metadata && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{results.metadata.errorCount || results.errors.length}</div>
              <p className="text-sm text-gray-600 dark:text-gray-400">检测到的错误</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{results.suggestions.length}</div>
              <p className="text-sm text-gray-600 dark:text-gray-400">修改建议</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">
                {results.metadata.analysisTime ? `${(results.metadata.analysisTime / 1000).toFixed(1)}s` : '-'}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">分析用时</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            筛选和搜索
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Select value={filterType} onValueChange={(value) => setFilterType(value as LogicErrorType | 'all')}>
              <SelectTrigger>
                <SelectValue placeholder="错误类型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">所有类型</SelectItem>
                <SelectItem value="timeline">时间线错误</SelectItem>
                <SelectItem value="character">角色一致性</SelectItem>
                <SelectItem value="plot">情节逻辑</SelectItem>
                <SelectItem value="dialogue">对话问题</SelectItem>
                <SelectItem value="scene">场景转换</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterSeverity} onValueChange={(value) => setFilterSeverity(value as ErrorSeverity | 'all')}>
              <SelectTrigger>
                <SelectValue placeholder="严重程度" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">所有级别</SelectItem>
                <SelectItem value="critical">严重</SelectItem>
                <SelectItem value="high">高</SelectItem>
                <SelectItem value="medium">中</SelectItem>
                <SelectItem value="low">低</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={(value) => setSortBy(value as 'severity' | 'type' | 'location')}>
              <SelectTrigger>
                <SelectValue placeholder="排序方式" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="severity">按严重程度</SelectItem>
                <SelectItem value="type">按类型</SelectItem>
                <SelectItem value="location">按位置</SelectItem>
              </SelectContent>
            </Select>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="搜索错误描述..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error List */}
      <Tabs defaultValue="errors" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="errors">错误列表 ({filteredAndSortedErrors.length})</TabsTrigger>
          <TabsTrigger value="suggestions">修改建议 ({results.suggestions.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="errors" className="space-y-4 mt-4">
          {filteredAndSortedErrors.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-gray-500">
                没有找到符合条件的错误
              </CardContent>
            </Card>
          ) : (
            filteredAndSortedErrors.map(error => {
              const suggestion = getSuggestionForError(error.id);
              const isExpanded = expandedErrors.has(error.id);

              return (
                <Card key={error.id} className="overflow-hidden">
                  <CardHeader 
                    className="cursor-pointer"
                    onClick={() => toggleError(error.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          {getSeverityIcon(error.severity)}
                          <Badge variant={getSeverityColor(error.severity)}>
                            {error.severity.toUpperCase()}
                          </Badge>
                          <Badge variant="outline">
                            {getErrorTypeLabel(error.type)}
                          </Badge>
                          {error.location.line && (
                            <span className="flex items-center gap-1 text-sm text-gray-600">
                              <MapPin className="w-3 h-3" />
                              行 {error.location.line}
                              {error.location.column && `, 列 ${error.location.column}`}
                            </span>
                          )}
                        </div>
                        <p className="text-sm">{error.description}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="ml-2"
                      >
                        {isExpanded ? <ChevronUp /> : <ChevronDown />}
                      </Button>
                    </div>
                  </CardHeader>

                  {isExpanded && (
                    <CardContent className="border-t">
                      {error.context && (
                        <div className="mb-4">
                          <h4 className="font-semibold mb-2">上下文</h4>
                          <pre className="text-sm bg-gray-50 dark:bg-gray-900 p-3 rounded overflow-x-auto">
                            {error.context}
                          </pre>
                        </div>
                      )}

                      {suggestion && (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <Lightbulb className="w-4 h-4 text-yellow-600" />
                            <h4 className="font-semibold">修改建议</h4>
                          </div>
                          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded">
                            <p className="text-sm mb-2">{suggestion.modification}</p>
                            {suggestion.rationale && (
                              <p className="text-xs text-gray-600 dark:text-gray-400">
                                理由: {suggestion.rationale}
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      {error.suggestion && !suggestion && (
                        <div className="mt-3">
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            建议: {error.suggestion}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  )}
                </Card>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="suggestions" className="space-y-4 mt-4">
          {results.suggestions.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-gray-500">
                暂无修改建议
              </CardContent>
            </Card>
          ) : (
            results.suggestions.map(suggestion => (
              <Card key={suggestion.id}>
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Badge variant={suggestion.priority === 'high' ? 'default' : 'secondary'}>
                        {suggestion.priority === 'high' ? '高优先级' : suggestion.priority === 'medium' ? '中优先级' : '低优先级'}
                      </Badge>
                      {suggestion.confidence && (
                        <span className="text-sm text-gray-600">
                          置信度: {(suggestion.confidence * 100).toFixed(0)}%
                        </span>
                      )}
                    </div>
                    
                    <p className="text-sm font-medium">{suggestion.modification}</p>
                    
                    {suggestion.rationale && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {suggestion.rationale}
                      </p>
                    )}
                    
                    {suggestion.impact && (
                      <div className="text-xs text-gray-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        预期影响: {suggestion.impact}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}