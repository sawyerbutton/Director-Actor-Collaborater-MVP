import { LogicError } from '@/types/analysis';
import { Suggestion } from '@/types/revision';
import { csrfService } from './csrf-service';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';
const DEFAULT_TIMEOUT = 30000; // 30 seconds
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

interface StartAnalysisResponse {
  taskId: string;
  status: 'accepted';
}

interface AnalysisStatusResponse {
  taskId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number;
  results?: {
    errors: LogicError[];
    suggestions: Suggestion[];
    metadata?: {
      analysisTime?: number;
      scriptLength?: number;
      errorCount?: number;
    };
  };
  error?: string;
}

interface CancelAnalysisResponse {
  success: boolean;
  message?: string;
}

class AnalysisService {
  private abortControllers: Map<string, AbortController> = new Map();

  private async fetchWithTimeout(
    url: string, 
    options: RequestInit = {}, 
    timeout: number = DEFAULT_TIMEOUT
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('请求超时');
      }
      throw error;
    }
  }

  private async fetchWithRetry(
    url: string,
    options: RequestInit = {},
    retries: number = MAX_RETRIES
  ): Promise<Response> {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await this.fetchWithTimeout(url, options);
        
        if (response.ok || response.status === 202) {
          return response;
        }
        
        // Don't retry for client errors
        if (response.status >= 400 && response.status < 500) {
          throw new Error(`请求失败: ${response.status} ${response.statusText}`);
        }
        
        // Retry for server errors
        if (i === retries - 1) {
          throw new Error(`请求失败: ${response.status} ${response.statusText}`);
        }
        
        // Wait before retry with exponential backoff
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * Math.pow(2, i)));
      } catch (error) {
        if (i === retries - 1) {
          throw error;
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * Math.pow(2, i)));
      }
    }
    
    throw new Error('请求失败');
  }

  async startAnalysis(scriptContent: string): Promise<StartAnalysisResponse> {
    try {
      // Get CSRF token
      const csrfToken = await csrfService.getToken();
      
      const response = await this.fetchWithRetry(
        `${API_BASE_URL}/analysis/start`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': csrfToken,
          },
          body: JSON.stringify({ 
            scriptContent,
            timestamp: new Date().toISOString()
          }),
        }
      );

      if (!response.ok && response.status !== 202) {
        const error = await response.text();
        throw new Error(error || '启动分析失败');
      }

      const data = await response.json();
      
      if (!data.taskId) {
        throw new Error('服务器未返回任务ID');
      }
      
      return data;
    } catch (error) {
      console.error('Failed to start analysis:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('启动分析失败');
    }
  }

  async getAnalysisStatus(taskId: string): Promise<AnalysisStatusResponse> {
    try {
      const controller = new AbortController();
      this.abortControllers.set(taskId, controller);
      
      const response = await this.fetchWithTimeout(
        `${API_BASE_URL}/analysis/status/${taskId}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: controller.signal
        },
        10000 // Shorter timeout for status checks
      );

      this.abortControllers.delete(taskId);

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || '获取分析状态失败');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      this.abortControllers.delete(taskId);
      console.error('Failed to get analysis status:', error);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('状态检查已取消');
      }
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('获取分析状态失败');
    }
  }

  async cancelAnalysis(taskId: string): Promise<CancelAnalysisResponse> {
    try {
      // Cancel any ongoing status check
      const controller = this.abortControllers.get(taskId);
      if (controller) {
        controller.abort();
        this.abortControllers.delete(taskId);
      }

      const response = await this.fetchWithTimeout(
        `${API_BASE_URL}/analysis/cancel/${taskId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        },
        5000 // Short timeout for cancel
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || '取消分析失败');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Failed to cancel analysis:', error);
      // Even if cancel fails, we should clean up
      return { success: false, message: '取消请求失败，但本地已停止轮询' };
    }
  }

  // Upload file method for future use
  async uploadFile(file: File): Promise<string> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('timestamp', new Date().toISOString());

      const response = await this.fetchWithRetry(
        `${API_BASE_URL}/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || '文件上传失败');
      }

      const data = await response.json();
      return data.content;
    } catch (error) {
      console.error('Failed to upload file:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('文件上传失败');
    }
  }

  // Cleanup method
  cleanup() {
    // Abort all ongoing requests
    this.abortControllers.forEach(controller => controller.abort());
    this.abortControllers.clear();
  }
}

export const analysisService = new AnalysisService();