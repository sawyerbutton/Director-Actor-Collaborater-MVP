'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, Edit3, CheckCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAnalysisStore } from '@/lib/stores/analysis-store';

export const RevisionLink: React.FC = () => {
  const router = useRouter();
  const errors = useAnalysisStore((state) => state.errors);
  
  const handleNavigateToRevision = () => {
    router.push('/revision');
  };

  if (errors.length === 0) {
    return null;
  }

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Edit3 className="h-5 w-5" />
          准备修订剧本
        </CardTitle>
        <CardDescription>
          AI已识别出 {errors.length} 个可以改进的地方
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium">审查修改建议</p>
              <p className="text-xs text-muted-foreground">
                逐个查看AI的建议，选择接受或拒绝
              </p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium">实时预览</p>
              <p className="text-xs text-muted-foreground">
                即时查看修改后的剧本效果
              </p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium">导出新版本</p>
              <p className="text-xs text-muted-foreground">
                生成包含已接受修改的剧本文件
              </p>
            </div>
          </div>

          <Button 
            onClick={handleNavigateToRevision}
            className="w-full"
            size="lg"
          >
            开始修订剧本
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default RevisionLink;