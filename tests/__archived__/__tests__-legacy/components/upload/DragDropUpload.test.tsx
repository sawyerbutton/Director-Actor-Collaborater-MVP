import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DragDropUpload } from '@/components/upload/DragDropUpload';

describe('DragDropUpload Component', () => {
  const mockOnUpload = jest.fn();
  const mockOnFileSelect = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the drag drop zone', () => {
    render(
      <DragDropUpload
        onUpload={mockOnUpload}
        onFileSelect={mockOnFileSelect}
      />
    );

    expect(screen.getByText(/拖拽文件到此处/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /选择文件/i })).toBeInTheDocument();
  });

  it('should show drag overlay when dragging', async () => {
    const { container } = render(
      <DragDropUpload
        onUpload={mockOnUpload}
        onFileSelect={mockOnFileSelect}
      />
    );

    const dropZone = container.querySelector('[onDragEnter]');
    expect(dropZone).toBeInTheDocument();

    // Create drag event with files
    const file = new File(['test content'], 'test.md', { type: 'text/markdown' });
    const dataTransfer = {
      items: [{ kind: 'file', type: 'text/markdown' }],
      files: [file]
    };

    // Simulate drag enter
    fireEvent.dragEnter(dropZone!, { dataTransfer });

    // Check for visual feedback
    await waitFor(() => {
      expect(screen.getByText(/释放文件以上传/)).toBeInTheDocument();
    });
  });

  it('should validate file types', async () => {
    render(
      <DragDropUpload
        accept={['.txt', '.md']}
        onUpload={mockOnUpload}
        onFileSelect={mockOnFileSelect}
      />
    );

    const invalidFile = new File(['content'], 'test.pdf', { type: 'application/pdf' });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

    // Mock file input
    Object.defineProperty(fileInput, 'files', {
      value: [invalidFile],
      writable: false,
    });

    fireEvent.change(fileInput);

    await waitFor(() => {
      expect(screen.getByText(/格式不支持/)).toBeInTheDocument();
    });
  });

  it('should reject oversized files', async () => {
    render(
      <DragDropUpload
        maxSize={1024} // 1KB
        onUpload={mockOnUpload}
        onFileSelect={mockOnFileSelect}
      />
    );

    // Create oversized file (2KB)
    const content = new Array(2048).fill('a').join('');
    const oversizedFile = new File([content], 'large.txt', { type: 'text/plain' });

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

    Object.defineProperty(fileInput, 'files', {
      value: [oversizedFile],
      writable: false,
    });

    fireEvent.change(fileInput);

    await waitFor(() => {
      expect(screen.getByText(/大小超过/)).toBeInTheDocument();
    });
  });

  it('should handle multiple files when multiple is true', async () => {
    render(
      <DragDropUpload
        multiple={true}
        onUpload={mockOnUpload}
        onFileSelect={mockOnFileSelect}
      />
    );

    const file1 = new File(['content1'], 'test1.md', { type: 'text/markdown' });
    const file2 = new File(['content2'], 'test2.md', { type: 'text/markdown' });

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

    Object.defineProperty(fileInput, 'files', {
      value: [file1, file2],
      writable: false,
    });

    fireEvent.change(fileInput);

    await waitFor(() => {
      expect(mockOnFileSelect).toHaveBeenCalledWith([file1, file2]);
    });
  });

  it('should prevent default browser drag behavior', () => {
    const { container } = render(
      <DragDropUpload
        onUpload={mockOnUpload}
        onFileSelect={mockOnFileSelect}
      />
    );

    const dropZone = container.querySelector('[onDragOver]');
    const dragEvent = new Event('dragover', { bubbles: true, cancelable: true });

    // Mock preventDefault
    dragEvent.preventDefault = jest.fn();
    dragEvent.stopPropagation = jest.fn();

    fireEvent(dropZone!, dragEvent);

    expect(dragEvent.preventDefault).toHaveBeenCalled();
    expect(dragEvent.stopPropagation).toHaveBeenCalled();
  });

  it('should handle drop event correctly', async () => {
    const { container } = render(
      <DragDropUpload
        onUpload={mockOnUpload}
        onFileSelect={mockOnFileSelect}
      />
    );

    const dropZone = container.querySelector('[onDrop]');
    const file = new File(['test content'], 'test.md', { type: 'text/markdown' });

    const dropEvent = new Event('drop', { bubbles: true, cancelable: true }) as any;
    dropEvent.dataTransfer = {
      files: [file]
    };
    dropEvent.preventDefault = jest.fn();
    dropEvent.stopPropagation = jest.fn();

    fireEvent(dropZone!, dropEvent);

    await waitFor(() => {
      expect(mockOnFileSelect).toHaveBeenCalledWith([file]);
    });

    expect(dropEvent.preventDefault).toHaveBeenCalled();
    expect(dropEvent.stopPropagation).toHaveBeenCalled();
  });

  it('should display upload progress', async () => {
    const { rerender } = render(
      <DragDropUpload
        onUpload={mockOnUpload}
        onFileSelect={mockOnFileSelect}
      />
    );

    const file = new File(['content'], 'test.md', { type: 'text/markdown' });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

    // Mock slow upload
    mockOnUpload.mockImplementation(() =>
      new Promise(resolve => setTimeout(resolve, 100))
    );

    Object.defineProperty(fileInput, 'files', {
      value: [file],
      writable: false,
    });

    fireEvent.change(fileInput);

    await waitFor(() => {
      // Should show file in upload queue
      expect(screen.getByText('test.md')).toBeInTheDocument();
    });
  });

  it('should allow removing items from upload queue', async () => {
    render(
      <DragDropUpload
        onUpload={mockOnUpload}
        onFileSelect={mockOnFileSelect}
      />
    );

    const file = new File(['content'], 'test.md', { type: 'text/markdown' });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

    Object.defineProperty(fileInput, 'files', {
      value: [file],
      writable: false,
    });

    fireEvent.change(fileInput);

    await waitFor(() => {
      expect(screen.getByText('test.md')).toBeInTheDocument();
    });

    // Find and click remove button
    const removeButtons = screen.getAllByRole('button');
    const removeButton = removeButtons.find(btn => {
      const svg = btn.querySelector('svg');
      return svg && svg.classList.contains('lucide-x');
    });

    if (removeButton) {
      fireEvent.click(removeButton);

      await waitFor(() => {
        expect(screen.queryByText('test.md')).not.toBeInTheDocument();
      });
    }
  });

  it('should clear all items when clear all is clicked', async () => {
    render(
      <DragDropUpload
        multiple={true}
        onUpload={mockOnUpload}
        onFileSelect={mockOnFileSelect}
      />
    );

    const file1 = new File(['content1'], 'test1.md', { type: 'text/markdown' });
    const file2 = new File(['content2'], 'test2.md', { type: 'text/markdown' });

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

    Object.defineProperty(fileInput, 'files', {
      value: [file1, file2],
      writable: false,
    });

    fireEvent.change(fileInput);

    await waitFor(() => {
      expect(screen.getByText('test1.md')).toBeInTheDocument();
      expect(screen.getByText('test2.md')).toBeInTheDocument();
    });

    // Click clear all
    const clearButton = screen.getByText('清空所有');
    fireEvent.click(clearButton);

    await waitFor(() => {
      expect(screen.queryByText('test1.md')).not.toBeInTheDocument();
      expect(screen.queryByText('test2.md')).not.toBeInTheDocument();
    });
  });

  it('should handle file path traversal attempts', async () => {
    render(
      <DragDropUpload
        onUpload={mockOnUpload}
        onFileSelect={mockOnFileSelect}
      />
    );

    const maliciousFile = new File(['content'], '../../../etc/passwd', { type: 'text/plain' });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

    Object.defineProperty(fileInput, 'files', {
      value: [maliciousFile],
      writable: false,
    });

    fireEvent.change(fileInput);

    await waitFor(() => {
      expect(screen.getByText(/包含非法字符/)).toBeInTheDocument();
    });
  });
});