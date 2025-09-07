'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Download, FileText, FileType } from 'lucide-react';
import { useRevisionStore } from '@/lib/stores/revision-store';
import { useAnalysisStore } from '@/lib/stores/analysis-store';
import { ExportService, ExportFormat } from '@/lib/services/export-service';
import { toast } from '@/hooks/use-toast';

export const ExportDialog: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [format, setFormat] = useState<ExportFormat>('txt');
  const [filename, setFilename] = useState('');
  const [includeMetadata, setIncludeMetadata] = useState(true);
  const [includeHighlights, setIncludeHighlights] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const originalScript = useAnalysisStore((state) => state.scriptContent) || '';
  const { errors, getAcceptedSuggestions } = useRevisionStore();
  const acceptedCount = getAcceptedSuggestions().length;

  const handleExport = async () => {
    if (!originalScript) {
      toast({
        title: '导出失败',
        description: '未找到原始剧本内容',
        variant: 'destructive',
      });
      return;
    }

    if (acceptedCount === 0) {
      toast({
        title: '提示',
        description: '没有已接受的修改，将导出原始剧本',
        variant: 'default',
      });
    }

    setIsExporting(true);

    try {
      const exportService = new ExportService(originalScript);
      
      await exportService.exportScript(errors, {
        format,
        filename: filename || undefined,
        includeHighlights,
        includeMetadata,
      });

      toast({
        title: '导出成功',
        description: `剧本已成功导出为 ${format.toUpperCase()} 格式`,
        variant: 'default',
      });

      setOpen(false);
      // Reset form
      setFilename('');
      setFormat('txt');
      setIncludeMetadata(true);
      setIncludeHighlights(false);
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: '导出失败',
        description: '导出过程中发生错误，请重试',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportReport = async () => {
    if (!originalScript) {
      toast({
        title: '导出失败',
        description: '未找到原始剧本内容',
        variant: 'destructive',
      });
      return;
    }

    try {
      const exportService = new ExportService(originalScript);
      const report = exportService.generateSummaryReport(errors);
      
      const blob = new Blob([report], { type: 'text/markdown;charset=utf-8' });
      const timestamp = new Date().toISOString().split('T')[0];
      const { saveAs } = await import('file-saver');
      saveAs(blob, `修订报告_${timestamp}.md`);

      toast({
        title: '报告生成成功',
        description: '修订报告已成功导出',
        variant: 'default',
      });
    } catch (error) {
      console.error('Report export error:', error);
      toast({
        title: '导出失败',
        description: '生成报告时发生错误',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Download className="h-4 w-4 mr-2" />
          导出剧本
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>导出剧本</DialogTitle>
          <DialogDescription>
            选择导出格式和选项，生成包含已接受修改的新版本剧本
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* File format selection */}
          <div className="space-y-3">
            <Label>导出格式</Label>
            <RadioGroup value={format} onValueChange={(v) => setFormat(v as ExportFormat)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="txt" id="txt" />
                <Label htmlFor="txt" className="flex items-center gap-2 cursor-pointer">
                  <FileText className="h-4 w-4" />
                  纯文本 (.txt) - 保持原始格式
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="docx" id="docx" />
                <Label htmlFor="docx" className="flex items-center gap-2 cursor-pointer">
                  <FileType className="h-4 w-4" />
                  Word文档 (.docx) - 包含样式格式
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Filename input */}
          <div className="space-y-2">
            <Label htmlFor="filename">文件名（可选）</Label>
            <Input
              id="filename"
              placeholder={`剧本_修订版_${new Date().toISOString().split('T')[0]}`}
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
            />
          </div>

          {/* Options */}
          <div className="space-y-3">
            <Label>导出选项</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="metadata"
                  checked={includeMetadata}
                  onCheckedChange={(checked) => setIncludeMetadata(checked as boolean)}
                />
                <Label htmlFor="metadata" className="cursor-pointer">
                  包含修改统计信息
                </Label>
              </div>
              {format === 'txt' && (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="highlights"
                    checked={includeHighlights}
                    onCheckedChange={(checked) => setIncludeHighlights(checked as boolean)}
                  />
                  <Label htmlFor="highlights" className="cursor-pointer">
                    显示修改标记（+/- 符号）
                  </Label>
                </div>
              )}
            </div>
          </div>

          {/* Statistics */}
          <div className="rounded-lg bg-muted p-3 space-y-1">
            <p className="text-sm font-medium">导出统计</p>
            <p className="text-xs text-muted-foreground">
              将应用 {acceptedCount} 项已接受的修改
            </p>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={handleExportReport}
            disabled={isExporting}
            className="w-full sm:w-auto"
          >
            生成修订报告
          </Button>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isExporting}>
              取消
            </Button>
            <Button onClick={handleExport} disabled={isExporting}>
              {isExporting ? '导出中...' : '导出'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ExportDialog;