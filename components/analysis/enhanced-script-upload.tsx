'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Upload, AlertCircle, Info } from 'lucide-react';
import { DragDropUpload } from '@/components/upload/DragDropUpload';
import { FilePreview } from '@/components/upload/FilePreview';
import { useAnalysisStore } from '@/lib/stores/analysis-store';
import { sanitizeInput, sanitizeFileName } from '@/lib/utils/sanitize';
import { parseScriptClient } from '@/lib/parser/script-parser';

export function EnhancedScriptUpload() {
  const [uploadMethod, setUploadMethod] = useState<'text' | 'file'>('file');
  const [textContent, setTextContent] = useState('');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [markdownHint, setMarkdownHint] = useState(false);

  const { setScriptContent, resetAnalysis } = useAnalysisStore();

  const detectFormat = (content: string): 'standard' | 'markdown' => {
    // Check for markdown patterns
    const markdownPatterns = [
      /^#\s+场景/m,
      /^#\s+SCENE/mi,
      /\*\*[^*]+\*\*:/,
      /\*\([^)]+\)\*/
    ];

    const hasMarkdownPatterns = markdownPatterns.some(pattern => pattern.test(content));
    return hasMarkdownPatterns ? 'markdown' : 'standard';
  };

  const processFile = async (file: File): Promise<void> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = async (event) => {
        const content = event.target?.result as string;

        // Detect if it\'s markdown
        const isMarkdown = file.name.endsWith('.md') ||
                          file.name.endsWith('.markdown') ||
                          detectFormat(content) === 'markdown';

        if (isMarkdown) {
          setMarkdownHint(true);
        }

        try {
          // Parse the script with format detection
          const parsedScript = await parseScriptClient(content, {
            format: isMarkdown ? 'markdown' : 'standard',
            detectCharacterAliases: true
          });

          // Check for parsing errors
          if (parsedScript.errors && parsedScript.errors.length > 0) {
            const criticalErrors = parsedScript.errors.filter(e => e.type === 'error');
            if (criticalErrors.length > 0) {
              reject(new Error(criticalErrors[0].message));
              return;
            }
          }

          // Sanitize and set content
          const sanitizedContent = sanitizeInput(content);
          const sanitizedFileName = sanitizeFileName(file.name);

          setScriptContent(sanitizedContent, sanitizedFileName);
          resolve();
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => {
        reject(new Error('文件读取失败'));
      };

      reader.readAsText(file);
    });
  };

  const handleUpload = useCallback(async (files: File[]) => {
    setUploadError(null);
    setIsProcessing(true);

    try {
      // Process first file (or all if implementing multi-file support)
      if (files.length > 0) {
        await processFile(files[0]);
      }
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : '文件处理失败');
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const handleTextSubmit = async () => {
    if (!textContent.trim()) {
      setUploadError('请输入剧本内容');
      return;
    }

    setUploadError(null);
    setIsProcessing(true);

    try {
      // Detect format
      const format = detectFormat(textContent);
      if (format === 'markdown') {
        setMarkdownHint(true);
      }

      // Parse the script
      const parsedScript = await parseScriptClient(textContent, {
        format,
        detectCharacterAliases: true
      });

      // Check for parsing errors
      if (parsedScript.errors && parsedScript.errors.length > 0) {
        const criticalErrors = parsedScript.errors.filter(e => e.type === 'error');
        if (criticalErrors.length > 0) {
          setUploadError(criticalErrors[0].message);
          return;
        }
      }

      // Sanitize and set content
      const sanitizedContent = sanitizeInput(textContent);
      resetAnalysis();
      setScriptContent(sanitizedContent, 'text-input');
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : '文本处理失败');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileSelect = (files: File[]) => {
    setSelectedFiles(files);
    setUploadError(null);
  };

  const getMarkdownTemplate = () => {
    return `# 场景 1 - 内景 - 咖啡店 - 日

咖啡店里人来人往，午后的阳光透过窗户洒在木质桌面上。

**服务员**: 欢迎光临！请问需要点什么？

**顾客**: 一杯拿铁，谢谢。

*(服务员微笑着记下订单)*

**服务员**: 好的，请稍等。

## 淡出

# 场景 2 - 外景 - 街道 - 夜`;
  };

  return (
    <div className="space-y-4">
      <Tabs defaultValue="file" value={uploadMethod} onValueChange={(v) => setUploadMethod(v as 'text' | 'file')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="file">
            <Upload className="w-4 h-4 mr-2" />
            文件上传
          </TabsTrigger>
          <TabsTrigger value="text">
            <FileText className="w-4 h-4 mr-2" />
            文本输入
          </TabsTrigger>
        </TabsList>

        {uploadError && (
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{uploadError}</AlertDescription>
          </Alert>
        )}

        {markdownHint && (
          <Alert className="mt-4">
            <Info className="h-4 w-4" />
            <AlertDescription>
              检测到 Markdown 格式剧本，将自动使用 Markdown 解析器处理。
            </AlertDescription>
          </Alert>
        )}

        <TabsContent value="file" className="space-y-4">
          <DragDropUpload
            accept={['.txt', '.md', '.markdown']}
            maxSize={10 * 1024 * 1024}
            multiple={false}
            onUpload={handleUpload}
            onFileSelect={handleFileSelect}
          />

          {selectedFiles.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium">选中的文件</h3>
              {selectedFiles.map((file, index) => (
                <FilePreview
                  key={index}
                  fileName={file.name}
                  fileSize={file.size}
                  fileType={file.type || 'text/plain'}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="text" className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium">剧本内容</label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setTextContent(getMarkdownTemplate())}
              >
                使用 Markdown 模板
              </Button>
            </div>
            <Textarea
              placeholder="在此粘贴您的剧本内容，支持标准格式或 Markdown 格式..."
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              className="min-h-[400px] font-mono text-sm"
            />
          </div>

          <div className="flex justify-between items-center">
            <p className="text-xs text-gray-500">
              支持标准剧本格式和 Markdown 格式（使用 ** 标记角色名，* 标记动作）
            </p>
            <Button
              onClick={handleTextSubmit}
              disabled={!textContent.trim() || isProcessing}
            >
              {isProcessing ? '处理中...' : '确认上传'}
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Markdown 格式说明：</strong>
          <ul className="mt-2 ml-5 list-disc text-xs">
            <li># 场景 N - 地点 - 时间：标记场景</li>
            <li>**角色名**: 对话内容：标记角色对话</li>
            <li>*(动作描述)*：标记动作或舞台指示</li>
            <li>## 转场：标记场景转换</li>
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  );
}