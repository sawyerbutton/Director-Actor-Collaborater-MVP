import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ScriptUpload } from '@/components/analysis/script-upload';
import { useAnalysisStore } from '@/lib/stores/analysis-store';

jest.mock('@/lib/stores/analysis-store');

describe('ScriptUpload', () => {
  const mockSetScriptContent = jest.fn();
  const mockResetAnalysis = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useAnalysisStore as unknown as jest.Mock).mockReturnValue({
      setScriptContent: mockSetScriptContent,
      resetAnalysis: mockResetAnalysis,
    });
  });

  it('renders upload method toggle buttons', () => {
    render(<ScriptUpload />);
    expect(screen.getByText('文本输入')).toBeInTheDocument();
    expect(screen.getByText('文件上传')).toBeInTheDocument();
  });

  it('switches between text and file upload methods', () => {
    render(<ScriptUpload />);
    
    const fileUploadBtn = screen.getByText('文件上传');
    fireEvent.click(fileUploadBtn);
    
    expect(screen.getByText('选择文件')).toBeInTheDocument();
    
    const textInputBtn = screen.getByText('文本输入');
    fireEvent.click(textInputBtn);
    
    expect(screen.getByPlaceholderText('在此粘贴您的剧本内容...')).toBeInTheDocument();
  });

  describe('Text Input Method', () => {
    it('enables submit button when text is entered', async () => {
      render(<ScriptUpload />);
      
      const textarea = screen.getByPlaceholderText('在此粘贴您的剧本内容...');
      const submitBtn = screen.getByText('确认上传');
      
      expect(submitBtn).toBeDisabled();
      
      await userEvent.type(textarea, 'Test script content');
      
      expect(submitBtn).not.toBeDisabled();
    });

    it('calls setScriptContent when text is submitted', async () => {
      render(<ScriptUpload />);
      
      const textarea = screen.getByPlaceholderText('在此粘贴您的剧本内容...');
      await userEvent.type(textarea, 'Test script content');
      
      const submitBtn = screen.getByText('确认上传');
      fireEvent.click(submitBtn);
      
      expect(mockResetAnalysis).toHaveBeenCalled();
      expect(mockSetScriptContent).toHaveBeenCalledWith('Test script content', 'text-input');
    });

    it('shows error when submitting empty text', () => {
      render(<ScriptUpload />);
      
      const submitBtn = screen.getByText('确认上传');
      fireEvent.click(submitBtn);
      
      expect(screen.getByText('请输入剧本内容')).toBeInTheDocument();
      expect(mockSetScriptContent).not.toHaveBeenCalled();
    });
  });

  describe('File Upload Method', () => {
    it('validates file size', async () => {
      render(<ScriptUpload />);
      
      fireEvent.click(screen.getByText('文件上传'));
      
      const file = new File(['x'.repeat(6 * 1024 * 1024)], 'large.txt', { type: 'text/plain' });
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      
      Object.defineProperty(input, 'files', {
        value: [file],
        writable: false,
      });
      
      fireEvent.change(input);
      
      await waitFor(() => {
        expect(screen.getByText(/文件大小不能超过/)).toBeInTheDocument();
      });
    });

    it('validates file type', async () => {
      render(<ScriptUpload />);
      
      fireEvent.click(screen.getByText('文件上传'));
      
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      
      Object.defineProperty(input, 'files', {
        value: [file],
        writable: false,
      });
      
      fireEvent.change(input);
      
      await waitFor(() => {
        expect(screen.getByText(/不支持的文件类型/)).toBeInTheDocument();
      });
    });

    it('accepts valid text files', async () => {
      render(<ScriptUpload />);
      
      fireEvent.click(screen.getByText('文件上传'));
      
      const fileContent = 'Script file content';
      const file = new File([fileContent], 'script.txt', { type: 'text/plain' });
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      
      // Mock FileReader
      const mockFileReader = {
        readAsText: jest.fn(),
        onload: null as any,
        onprogress: null as any,
        onerror: null as any,
        result: fileContent,
      };
      
      jest.spyOn(global, 'FileReader').mockImplementation(() => mockFileReader as any);
      
      Object.defineProperty(input, 'files', {
        value: [file],
        writable: false,
      });
      
      fireEvent.change(input);
      
      // Simulate file read completion
      if (mockFileReader.onload) {
        mockFileReader.onload({ target: { result: fileContent } });
      }
      
      await waitFor(() => {
        expect(mockSetScriptContent).toHaveBeenCalledWith(fileContent, 'script.txt');
      });
    });
  });
});