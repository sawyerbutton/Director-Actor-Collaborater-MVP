'use client';

import { useState, useRef, ChangeEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, FileText, AlertCircle } from 'lucide-react';
import { useAnalysisStore } from '@/lib/stores/analysis-store';
import { sanitizeInput, sanitizeFileName } from '@/lib/utils/sanitize';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_FILE_TYPES = ['.txt', '.docx'];

export function ScriptUpload() {
  const [uploadMethod, setUploadMethod] = useState<'text' | 'file'>('text');
  const [textContent, setTextContent] = useState('');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { setScriptContent, resetAnalysis } = useAnalysisStore();

  const validateFile = async (file: File): Promise<string | null> => {
    // Size validation
    if (file.size > MAX_FILE_SIZE) {
      return `文件大小不能超过 ${MAX_FILE_SIZE / 1024 / 1024}MB`;
    }
    
    // Extension validation
    const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (!ALLOWED_FILE_TYPES.includes(fileExtension)) {
      return `不支持的文件类型。请上传 ${ALLOWED_FILE_TYPES.join(' 或 ')} 文件`;
    }
    
    // Path traversal prevention
    if (file.name.includes('../') || file.name.includes('..\\')) {
      return '文件名包含非法字符';
    }
    
    // MIME type validation
    const allowedMimeTypes = [
      'text/plain',
      'text/csv',
      'text/html',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    if (!allowedMimeTypes.some(type => file.type.startsWith(type.split('/')[0]))) {
      return '文件类型不匹配';
    }
    
    // Content validation - check file signature (magic numbers)
    const buffer = await file.slice(0, 4).arrayBuffer();
    const bytes = new Uint8Array(buffer);
    
    // Check for executable file signatures
    const executableSignatures = [
      [0x4D, 0x5A], // PE/COFF executables (Windows .exe, .dll)
      [0x7F, 0x45, 0x4C, 0x46], // ELF executables (Linux)
      [0xCF, 0xFA, 0xED, 0xFE], // Mach-O executables (macOS)
      [0xCA, 0xFE, 0xBA, 0xBE], // Mach-O Fat Binary
      [0x23, 0x21], // Shebang (#!) for scripts
    ];
    
    for (const signature of executableSignatures) {
      let matches = true;
      for (let i = 0; i < signature.length && i < bytes.length; i++) {
        if (bytes[i] !== signature[i]) {
          matches = false;
          break;
        }
      }
      if (matches) {
        return '检测到可执行文件，出于安全考虑已拒绝';
      }
    }
    
    return null;
  };

  const readFileContent = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = (event.loaded / event.total) * 100;
          setUploadProgress(progress);
        }
      };
      
      reader.onload = (event) => {
        const content = event.target?.result as string;
        resolve(content);
      };
      
      reader.onerror = () => {
        reject(new Error('文件读取失败'));
      };
      
      if (file.name.endsWith('.docx')) {
        // For docx files, we'll need to handle them differently in production
        // For now, we'll just read as text with a note
        reject(new Error('DOCX 文件支持即将推出'));
      } else {
        reader.readAsText(file);
      }
    });
  };

  const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    setUploadProgress(0);
    
    const validationError = await validateFile(file);
    if (validationError) {
      setUploadError(validationError);
      return;
    }

    setIsUploading(true);
    try {
      const content = await readFileContent(file);
      // Sanitize file name and content
      const sanitizedFileName = sanitizeFileName(file.name);
      const sanitizedContent = sanitizeInput(content);
      setScriptContent(sanitizedContent, sanitizedFileName);
      setUploadProgress(100);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : '文件上传失败');
      setUploadProgress(0);
    } finally {
      setIsUploading(false);
    }
  };

  const handleTextSubmit = () => {
    if (!textContent.trim()) {
      setUploadError('请输入剧本内容');
      return;
    }
    
    // Sanitize input to prevent XSS
    const sanitizedContent = sanitizeInput(textContent);
    
    resetAnalysis();
    setScriptContent(sanitizedContent, 'text-input');
    setUploadError(null);
  };

  const handleMethodSwitch = (method: 'text' | 'file') => {
    setUploadMethod(method);
    setUploadError(null);
    setUploadProgress(0);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 mb-4">
        <Button
          variant={uploadMethod === 'text' ? 'default' : 'outline'}
          onClick={() => handleMethodSwitch('text')}
          className="flex items-center gap-2"
        >
          <FileText className="w-4 h-4" />
          文本输入
        </Button>
        <Button
          variant={uploadMethod === 'file' ? 'default' : 'outline'}
          onClick={() => handleMethodSwitch('file')}
          className="flex items-center gap-2"
        >
          <Upload className="w-4 h-4" />
          文件上传
        </Button>
      </div>

      {uploadError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{uploadError}</AlertDescription>
        </Alert>
      )}

      {uploadMethod === 'text' ? (
        <div className="space-y-4">
          <Textarea
            placeholder="在此粘贴您的剧本内容..."
            value={textContent}
            onChange={(e) => setTextContent(e.target.value)}
            className="min-h-[300px] font-mono text-sm"
          />
          <Button 
            onClick={handleTextSubmit}
            disabled={!textContent.trim()}
            className="w-full sm:w-auto"
          >
            确认上传
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center">
            <input
              ref={fileInputRef}
              type="file"
              accept={ALLOWED_FILE_TYPES.join(',')}
              onChange={handleFileUpload}
              className="hidden"
            />
            <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              拖放文件到此处，或点击选择文件
            </p>
            <p className="text-xs text-gray-500">
              支持 {ALLOWED_FILE_TYPES.join(', ')} 格式，最大 {MAX_FILE_SIZE / 1024 / 1024}MB
            </p>
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="mt-4"
            >
              选择文件
            </Button>
          </div>
          
          {isUploading && (
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}