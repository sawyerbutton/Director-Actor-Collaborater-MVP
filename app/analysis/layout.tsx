'use client';

import { ErrorBoundary } from '@/components/error-boundary';

export default function AnalysisLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        // Log to error tracking service in production
        console.error('Analysis page error:', error, errorInfo);
      }}
    >
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            剧本分析
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            上传您的剧本，系统将自动检测逻辑错误并提供修改建议
          </p>
        </header>
        <main>{children}</main>
      </div>
    </ErrorBoundary>
  );
}