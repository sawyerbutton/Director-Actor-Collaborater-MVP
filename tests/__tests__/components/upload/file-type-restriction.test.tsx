import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DragDropUpload } from '@/components/upload/DragDropUpload';
import '@testing-library/jest-dom';

describe('File Type Restriction Tests', () => {
  const mockOnUpload = jest.fn();
  const mockOnFileSelect = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('DragDropUpload Component', () => {
    it('should accept TXT files', async () => {
      render(
        <DragDropUpload
          onUpload={mockOnUpload}
          onFileSelect={mockOnFileSelect}
        />
      );

      const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
      const input = screen.getByRole('button', { name: /选择文件/i }).parentElement?.querySelector('input[type="file"]') as HTMLInputElement;

      await userEvent.upload(input, file);

      expect(mockOnFileSelect).toHaveBeenCalledWith([file]);
      expect(screen.queryByText(/格式不支持/)).not.toBeInTheDocument();
    });

    it('should accept Markdown files (.md)', async () => {
      render(
        <DragDropUpload
          onUpload={mockOnUpload}
          onFileSelect={mockOnFileSelect}
        />
      );

      const file = new File(['# Test'], 'test.md', { type: 'text/markdown' });
      const input = screen.getByRole('button', { name: /选择文件/i }).parentElement?.querySelector('input[type="file"]') as HTMLInputElement;

      await userEvent.upload(input, file);

      expect(mockOnFileSelect).toHaveBeenCalledWith([file]);
      expect(screen.queryByText(/格式不支持/)).not.toBeInTheDocument();
    });

    it('should accept Markdown files (.markdown)', async () => {
      render(
        <DragDropUpload
          onUpload={mockOnUpload}
          onFileSelect={mockOnFileSelect}
        />
      );

      const file = new File(['# Test'], 'test.markdown', { type: 'text/markdown' });
      const input = screen.getByRole('button', { name: /选择文件/i }).parentElement?.querySelector('input[type="file"]') as HTMLInputElement;

      await userEvent.upload(input, file);

      expect(mockOnFileSelect).toHaveBeenCalledWith([file]);
      expect(screen.queryByText(/格式不支持/)).not.toBeInTheDocument();
    });

    it('should reject FDX files', async () => {
      render(
        <DragDropUpload
          onUpload={mockOnUpload}
          onFileSelect={mockOnFileSelect}
        />
      );

      const file = new File(['<?xml version="1.0"?>'], 'test.fdx', { type: 'application/xml' });
      const input = screen.getByRole('button', { name: /选择文件/i }).parentElement?.querySelector('input[type="file"]') as HTMLInputElement;

      await userEvent.upload(input, file);

      await waitFor(() => {
        expect(screen.getByText(/格式不支持/)).toBeInTheDocument();
      });
      expect(mockOnFileSelect).not.toHaveBeenCalled();
    });

    it('should reject Fountain files', async () => {
      render(
        <DragDropUpload
          onUpload={mockOnUpload}
          onFileSelect={mockOnFileSelect}
        />
      );

      const file = new File(['INT. OFFICE - DAY'], 'test.fountain', { type: 'text/plain' });
      const input = screen.getByRole('button', { name: /选择文件/i }).parentElement?.querySelector('input[type="file"]') as HTMLInputElement;

      await userEvent.upload(input, file);

      await waitFor(() => {
        expect(screen.getByText(/格式不支持/)).toBeInTheDocument();
      });
      expect(mockOnFileSelect).not.toHaveBeenCalled();
    });

    it('should show only supported formats in help text', () => {
      render(
        <DragDropUpload
          onUpload={mockOnUpload}
          onFileSelect={mockOnFileSelect}
        />
      );

      const helpText = screen.getByText(/支持.*格式/);
      expect(helpText).toBeInTheDocument();
      expect(helpText.textContent).toContain('.txt');
      expect(helpText.textContent).toContain('.md');
      expect(helpText.textContent).toContain('.markdown');
      expect(helpText.textContent).not.toContain('.fdx');
      expect(helpText.textContent).not.toContain('.fountain');
    });

    it('should handle multiple files with mixed formats', async () => {
      render(
        <DragDropUpload
          onUpload={mockOnUpload}
          onFileSelect={mockOnFileSelect}
          multiple={true}
        />
      );

      const txtFile = new File(['test'], 'test.txt', { type: 'text/plain' });
      const fdxFile = new File(['<?xml ?>'], 'test.fdx', { type: 'application/xml' });
      const mdFile = new File(['# Test'], 'test.md', { type: 'text/markdown' });

      const input = screen.getByRole('button', { name: /选择文件/i }).parentElement?.querySelector('input[type="file"]') as HTMLInputElement;

      // Mock the file input to accept multiple files
      Object.defineProperty(input, 'files', {
        value: [txtFile, fdxFile, mdFile],
        writable: false,
      });

      fireEvent.change(input);

      await waitFor(() => {
        // Should show error for fdx file
        expect(screen.getByText(/test.fdx.*格式不支持/)).toBeInTheDocument();
      });

      // Should still process valid files
      expect(mockOnFileSelect).toHaveBeenCalled();
    });
  });
});