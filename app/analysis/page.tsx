'use client';

import { useState } from 'react';
import { ScriptUpload } from '@/components/analysis/script-upload';
import { AnalysisControl } from '@/components/analysis/analysis-control';
import { AnalysisResults } from '@/components/analysis/analysis-results';
import { useAnalysisStore } from '@/lib/stores/analysis-store';

export default function AnalysisPage() {
  const { 
    scriptContent, 
    analysisStatus, 
    analysisResults,
    taskId 
  } = useAnalysisStore();

  return (
    <div className="space-y-8">
      <section className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-semibold mb-4">上传剧本</h2>
        <ScriptUpload />
      </section>

      {scriptContent && (
        <section className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-4">分析控制</h2>
          <AnalysisControl />
        </section>
      )}

      {analysisResults && (
        <section className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-4">分析结果</h2>
          <AnalysisResults results={analysisResults} />
        </section>
      )}
    </div>
  );
}