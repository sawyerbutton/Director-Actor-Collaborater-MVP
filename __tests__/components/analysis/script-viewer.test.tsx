import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ScriptViewer } from '@/components/analysis/script-viewer';
import { LogicError } from '@/types/analysis';

describe('ScriptViewer Component', () => {
  const mockScriptContent = `INT. COFFEE SHOP - DAY
John enters the coffee shop.
JOHN
Hello, I'd like a coffee.
BARISTA
Coming right up!`;

  const mockErrors: LogicError[] = [
    {
      id: '1',
      type: 'dialogue',
      severity: 'high',
      location: { lineNumber: 3, line: 3 },
      description: 'Character dialogue issue',
      suggestion: 'Review character voice'
    },
    {
      id: '2',
      type: 'scene',
      severity: 'critical',
      location: { lineNumber: 1, line: 1 },
      description: 'Scene continuity error'
    }
  ];

  const mockOnErrorClick = jest.fn();

  beforeEach(() => {
    mockOnErrorClick.mockClear();
  });

  it('renders script content with line numbers', () => {
    render(
      <ScriptViewer
        scriptContent={mockScriptContent}
        errors={[]}
        showLineNumbers={true}
      />
    );

    // Check if line numbers are displayed
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('displays script content correctly', () => {
    render(
      <ScriptViewer
        scriptContent={mockScriptContent}
        errors={[]}
      />
    );

    expect(screen.getByText(/INT\. COFFEE SHOP - DAY/)).toBeInTheDocument();
    expect(screen.getByText(/John enters the coffee shop/)).toBeInTheDocument();
    expect(screen.getByText(/Hello, I'd like a coffee/)).toBeInTheDocument();
  });

  it('highlights lines with errors', () => {
    const { container } = render(
      <ScriptViewer
        scriptContent={mockScriptContent}
        errors={mockErrors}
      />
    );

    // Check if error highlighting classes are applied
    const highlightedLines = container.querySelectorAll('.border-l-4');
    expect(highlightedLines.length).toBeGreaterThan(0);
  });

  it('shows error markers on lines with errors', () => {
    render(
      <ScriptViewer
        scriptContent={mockScriptContent}
        errors={mockErrors}
      />
    );

    // Check for error badges
    const badges = screen.getAllByRole('button');
    expect(badges.length).toBeGreaterThanOrEqual(mockErrors.length);
  });

  it('calls onErrorClick when error marker is clicked', () => {
    render(
      <ScriptViewer
        scriptContent={mockScriptContent}
        errors={mockErrors}
        onErrorClick={mockOnErrorClick}
      />
    );

    const errorButtons = screen.getAllByRole('button');
    fireEvent.click(errorButtons[0]);
    
    expect(mockOnErrorClick).toHaveBeenCalledTimes(1);
    expect(mockOnErrorClick).toHaveBeenCalledWith(expect.objectContaining({
      id: expect.any(String)
    }));
  });

  it('highlights selected error line', () => {
    const { container } = render(
      <ScriptViewer
        scriptContent={mockScriptContent}
        errors={mockErrors}
        selectedError={mockErrors[0]}
      />
    );

    // Check for selection highlighting
    const selectedLine = container.querySelector('.ring-2.ring-blue-500');
    expect(selectedLine).toBeInTheDocument();
  });

  it('renders without line numbers when showLineNumbers is false', () => {
    render(
      <ScriptViewer
        scriptContent={mockScriptContent}
        errors={[]}
        showLineNumbers={false}
      />
    );

    // Line numbers should not be visible
    const lineNumbers = screen.queryAllByText(/^[0-9]+$/);
    expect(lineNumbers.length).toBe(0);
  });

  it('displays custom title', () => {
    render(
      <ScriptViewer
        scriptContent={mockScriptContent}
        errors={[]}
        title="Custom Script Title"
      />
    );

    expect(screen.getByText('Custom Script Title')).toBeInTheDocument();
  });

  it('shows error and line count in header', () => {
    render(
      <ScriptViewer
        scriptContent={mockScriptContent}
        errors={mockErrors}
      />
    );

    expect(screen.getByText(/Lines:/)).toBeInTheDocument();
    expect(screen.getByText(/Errors:/)).toBeInTheDocument();
  });

  it('handles empty script content', () => {
    render(
      <ScriptViewer
        scriptContent=""
        errors={[]}
      />
    );

    expect(screen.getByText('Script Viewer')).toBeInTheDocument();
  });

  it('applies custom height', () => {
    const { container } = render(
      <ScriptViewer
        scriptContent={mockScriptContent}
        errors={[]}
        height={800}
      />
    );

    const scrollArea = container.querySelector('[style*="height"]');
    expect(scrollArea).toHaveStyle({ height: '800px' });
  });
});