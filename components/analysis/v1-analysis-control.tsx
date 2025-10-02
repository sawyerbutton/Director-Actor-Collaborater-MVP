'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Play,
  Square,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Loader2,
  Database,
  Cloud
} from 'lucide-react';
import { useV1AnalysisStore } from '@/lib/stores/v1-analysis-store';

export function V1AnalysisControl() {
  const {
    currentProject,
    analysisStatus,
    workflowStatus,
    analysisProgress,
    scriptContent,
    errorMessage,
    startAnalysis,
    cancelAnalysis,
    updateWorkflowStatus,
    setErrorMessage
  } = useV1AnalysisStore();

  const [isStarting, setIsStarting] = useState(false);

  // Auto-refresh workflow status when analysis is running
  useEffect(() => {
    if (analysisStatus === 'processing') {
      const interval = setInterval(() => {
        updateWorkflowStatus();
      }, 5000); // Every 5 seconds

      return () => clearInterval(interval);
    }
  }, [analysisStatus, updateWorkflowStatus]);

  const handleStartAnalysis = async () => {
    if (!scriptContent) {
      setErrorMessage('请先上传剧本');
      return;
    }

    setIsStarting(true);
    try {
      await startAnalysis();
    } finally {
      setIsStarting(false);
    }
  };

  const handleCancelAnalysis = () => {
    cancelAnalysis();
  };

  const getStatusIcon = () => {
    switch (analysisStatus) {
      case 'idle':
        return <Cloud className="h-4 w-4" />;
      case 'starting':
      case 'processing':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'cancelled':
        return <Square className="h-4 w-4 text-yellow-500" />;
      default:
        return null;
    }
  };

  const getWorkflowBadge = () => {
    const statusColors: Record<string, string> = {
      'INITIALIZED': 'bg-gray-500',
      'ACT1_RUNNING': 'bg-blue-500',
      'ACT1_COMPLETE': 'bg-green-500',
      'ITERATING': 'bg-yellow-500',
      'SYNTHESIZING': 'bg-purple-500',
      'COMPLETED': 'bg-green-600'
    };

    return (
      <Badge className={`${statusColors[workflowStatus] || 'bg-gray-400'} text-white`}>
        {workflowStatus.replace(/_/g, ' ')}
      </Badge>
    );
  };

  const getStatusText = () => {
    switch (analysisStatus) {
      case 'idle':
        return '准备就绪';
      case 'starting':
        return '正在初始化...';
      case 'processing':
        return `分析中... (${analysisProgress}%)`;
      case 'completed':
        return '分析完成';
      case 'failed':
        return '分析失败';
      case 'cancelled':
        return '已取消';
      default:
        return '未知状态';
    }
  };

  return (
    <div className="space-y-4">
      {/* Status Display */}
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center space-x-3">
          {getStatusIcon()}
          <div>
            <p className="font-medium">{getStatusText()}</p>
            {currentProject && (
              <p className="text-sm text-gray-500">
                项目: {currentProject.title}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-3">
          {getWorkflowBadge()}
          <Database className="h-4 w-4 text-gray-500" />
        </div>
      </div>

      {/* Progress Bar */}
      {analysisStatus === 'processing' && (
        <div className="space-y-2">
          <Progress value={analysisProgress} />
          <p className="text-sm text-center text-gray-500">
            正在使用 Act 1 诊断系统分析剧本...
          </p>
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <Alert variant="destructive">
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      {/* Control Buttons */}
      <div className="flex space-x-3">
        {analysisStatus === 'idle' || analysisStatus === 'failed' || analysisStatus === 'cancelled' ? (
          <Button
            onClick={handleStartAnalysis}
            disabled={!scriptContent || isStarting}
            className="flex-1"
          >
            {isStarting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                启动中...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                开始 Act 1 分析
              </>
            )}
          </Button>
        ) : analysisStatus === 'processing' || analysisStatus === 'starting' ? (
          <Button
            onClick={handleCancelAnalysis}
            variant="destructive"
            className="flex-1"
          >
            <Square className="mr-2 h-4 w-4" />
            取消分析
          </Button>
        ) : analysisStatus === 'completed' ? (
          <Button
            onClick={handleStartAnalysis}
            variant="outline"
            className="flex-1"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            重新分析
          </Button>
        ) : null}
      </div>

      {/* Info Card */}
      <div className="p-4 bg-blue-50 rounded-lg">
        <h4 className="font-medium text-blue-900 mb-2">V1 API 特性</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>✓ 数据库持久化存储</li>
          <li>✓ 异步任务队列处理</li>
          <li>✓ 五幕工作流状态跟踪</li>
          <li>✓ Act 1 基础诊断分析</li>
        </ul>
      </div>
    </div>
  );
}