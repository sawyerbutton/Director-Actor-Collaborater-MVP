'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { FileText, Upload, AlertCircle, Info, Database, FolderOpen } from 'lucide-react';
import { DragDropUpload } from '@/components/upload/DragDropUpload';
import { FilePreview } from '@/components/upload/FilePreview';
import { useV1AnalysisStore } from '@/lib/stores/v1-analysis-store';
import { sanitizeInput, sanitizeFileName } from '@/lib/utils/sanitize';
import { parseScriptClient } from '@/lib/parser/script-parser';

export function V1ScriptUpload() {
  const [uploadMethod, setUploadMethod] = useState<'text' | 'file' | 'existing'>('file');
  const [textContent, setTextContent] = useState('');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [markdownHint, setMarkdownHint] = useState(false);
  const [projectTitle, setProjectTitle] = useState('');

  const {
    projects,
    currentProject,
    setScriptContent,
    resetAll,
    loadProjects,
    loadProject,
    createProject,
    parseScript
  } = useV1AnalysisStore();

  // Load projects on component mount
  useState(() => {
    loadProjects();
  });

  const detectFormat = (content: string): 'standard' | 'markdown' => {
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

        const isMarkdown = file.name.endsWith('.md') ||
                          file.name.endsWith('.markdown') ||
                          detectFormat(content) === 'markdown';

        if (isMarkdown) {
          setMarkdownHint(true);
        }

        try {
          // Parse the script with format detection
          const parsedScript = parseScriptClient(content, {
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

          // Set script content in store
          setScriptContent(sanitizedContent, sanitizedFileName);

          // Create project with the script
          const title = projectTitle || sanitizedFileName.replace(/\.[^/.]+$/, '');
          await createProject(title, sanitizedContent, `Uploaded from ${sanitizedFileName}`);

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
      if (files.length > 0) {
        await processFile(files[0]);
      }
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : '文件处理失败');
    } finally {
      setIsProcessing(false);
    }
  }, [projectTitle]);

  const handleTextSubmit = async () => {
    if (!textContent.trim()) {
      setUploadError('请输入剧本内容');
      return;
    }

    if (!projectTitle.trim()) {
      setUploadError('请输入项目标题');
      return;
    }

    setIsProcessing(true);
    setUploadError(null);

    try {
      const sanitizedContent = sanitizeInput(textContent);
      setScriptContent(sanitizedContent, 'text-input.txt');

      // Create project with the script
      await createProject(projectTitle, sanitizedContent, 'Manual text input');

      // Parse the script
      parseScript();
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : '处理失败');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLoadProject = async (projectId: string) => {
    setIsProcessing(true);
    setUploadError(null);

    try {
      await loadProject(projectId);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : '加载项目失败');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    resetAll();
    setTextContent('');
    setUploadError(null);
    setSelectedFiles([]);
    setProjectTitle('');
    setMarkdownHint(false);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          V1 API 剧本上传
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={uploadMethod} onValueChange={(v) => setUploadMethod(v as any)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="file">
              <Upload className="h-4 w-4 mr-2" />
              文件上传
            </TabsTrigger>
            <TabsTrigger value="text">
              <FileText className="h-4 w-4 mr-2" />
              文本输入
            </TabsTrigger>
            <TabsTrigger value="existing">
              <FolderOpen className="h-4 w-4 mr-2" />
              已有项目
            </TabsTrigger>
          </TabsList>

          <TabsContent value="file" className="space-y-4">
            <div>
              <label className="text-sm font-medium">项目标题 (可选)</label>
              <input
                type="text"
                className="w-full mt-1 px-3 py-2 border rounded-md"
                placeholder="留空则使用文件名"
                value={projectTitle}
                onChange={(e) => setProjectTitle(e.target.value)}
              />
            </div>

            <DragDropUpload
              onUpload={handleUpload}
              disabled={isProcessing}
            />

            {selectedFiles.length > 0 && selectedFiles.map(file => (
              <FilePreview
                key={file.name}
                fileName={file.name}
                fileSize={file.size}
                fileType={file.type}
              />
            ))}

            {markdownHint && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  检测到 Markdown 格式剧本，将使用专门的解析器处理。
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>

          <TabsContent value="text" className="space-y-4">
            <div>
              <label className="text-sm font-medium">项目标题 *</label>
              <input
                type="text"
                className="w-full mt-1 px-3 py-2 border rounded-md"
                placeholder="输入项目标题"
                value={projectTitle}
                onChange={(e) => setProjectTitle(e.target.value)}
                required
              />
            </div>

            <Textarea
              placeholder="在此粘贴或输入剧本内容..."
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              className="min-h-[300px] font-mono"
            />

            <Button
              onClick={handleTextSubmit}
              disabled={!textContent.trim() || !projectTitle.trim() || isProcessing}
              className="w-full"
            >
              {isProcessing ? '处理中...' : '创建项目并分析'}
            </Button>
          </TabsContent>

          <TabsContent value="existing" className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-gray-600">选择一个已存在的项目：</p>
              {projects.length === 0 ? (
                <Alert>
                  <AlertDescription>
                    还没有任何项目。请先上传剧本创建项目。
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {projects.map(project => (
                    <button
                      key={project.id}
                      onClick={() => handleLoadProject(project.id)}
                      disabled={isProcessing || currentProject?.id === project.id}
                      className={`w-full text-left p-3 rounded-lg border transition-colors ${
                        currentProject?.id === project.id
                          ? 'bg-blue-50 border-blue-300'
                          : 'hover:bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="font-medium">{project.title}</div>
                      <div className="text-sm text-gray-500">
                        {project.workflowStatus} · {new Date(project.createdAt).toLocaleDateString()}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {uploadError && (
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{uploadError}</AlertDescription>
          </Alert>
        )}

        {currentProject && (
          <Alert className="mt-4">
            <Database className="h-4 w-4" />
            <AlertDescription>
              当前项目: <strong>{currentProject.title}</strong>
              <br />
              状态: {currentProject.workflowStatus}
            </AlertDescription>
          </Alert>
        )}

        {(currentProject || textContent || selectedFiles.length > 0) && (
          <Button
            onClick={handleReset}
            variant="outline"
            className="w-full mt-4"
          >
            重置
          </Button>
        )}
      </CardContent>
    </Card>
  );
}