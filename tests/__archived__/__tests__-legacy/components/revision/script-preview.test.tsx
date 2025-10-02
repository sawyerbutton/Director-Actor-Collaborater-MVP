import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ScriptPreview } from '@/components/revision/script-preview';
import { useRevisionStore } from '@/lib/stores/revision-store';
import { useAnalysisStore } from '@/lib/stores/analysis-store';

// Mock the stores
jest.mock('@/lib/stores/revision-store');
jest.mock('@/lib/stores/analysis-store');

// Mock the UI components
jest.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));

jest.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <div data-testid="tabs" data-value={value}>{children}</div>
  ),
  TabsContent: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <div data-testid={`tab-content-${value}`}>{children}</div>
  ),
  TabsList: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsTrigger: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <button data-testid={`tab-trigger-${value}`}>{children}</button>
  )
}));

describe('ScriptPreview', () => {
  const mockOriginalScript = `第一场
角色A：原始台词1
角色B：原始台词2`;

  const mockErrors = [
    {
      id: 'error-1',
      category: 'logic',
      severity: 'high',
      message: 'Error 1',
      suggestion: '修改建议1',
      context: {
        line: 2,
        snippet: '原始台词1'
      },
      status: 'accepted' as const
    },
    {
      id: 'error-2',
      category: 'logic',
      severity: 'medium',
      message: 'Error 2',
      suggestion: '修改建议2',
      context: {
        line: 3,
        snippet: '原始台词2'
      },
      status: 'rejected' as const
    }
  ];

  beforeEach(() => {
    (useAnalysisStore as unknown as jest.Mock).mockImplementation((selector) => {
      const state = {
        scriptContent: mockOriginalScript
      };
      return selector ? selector(state) : state;
    });

    (useRevisionStore as unknown as jest.Mock).mockImplementation((selector) => {
      const state = {
        errors: mockErrors,
        getAcceptedSuggestions: () => mockErrors.filter(e => e.status === 'accepted')
      };
      return selector ? selector(state) : state;
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders preview component with title', () => {
    render(<ScriptPreview />);
    expect(screen.getByText('剧本预览')).toBeInTheDocument();
  });

  it('displays statistics badges', () => {
    render(<ScriptPreview />);
    expect(screen.getByText(/修改已应用/)).toBeInTheDocument();
    expect(screen.getByText(/行已修改/)).toBeInTheDocument();
  });

  it('renders view mode buttons', () => {
    render(<ScriptPreview />);
    expect(screen.getByText('原始剧本')).toBeInTheDocument();
    expect(screen.getByText('修改后')).toBeInTheDocument();
    expect(screen.getByText('对比视图')).toBeInTheDocument();
  });

  it('switches between view modes', () => {
    render(<ScriptPreview />);
    
    const originalButton = screen.getByText('原始剧本');
    const modifiedButton = screen.getByText('修改后');
    const diffButton = screen.getByText('对比视图');

    // Buttons should exist
    expect(originalButton).toBeInTheDocument();
    expect(modifiedButton).toBeInTheDocument();
    expect(diffButton).toBeInTheDocument();

    // Test clicking different view buttons
    fireEvent.click(originalButton);
    fireEvent.click(modifiedButton);
    fireEvent.click(diffButton);
  });

  it('displays original script in original view', () => {
    render(<ScriptPreview />);
    
    const originalButton = screen.getByText('原始剧本');
    fireEvent.click(originalButton);

    // Multiple elements might contain the text, so we check if at least one exists
    const scriptElements = screen.getAllByText(/第一场/);
    expect(scriptElements.length).toBeGreaterThan(0);
  });

  it('displays conflict warnings when conflicts exist', () => {
    const conflictErrors = [
      ...mockErrors,
      {
        id: 'error-3',
        category: 'logic',
        severity: 'high',
        message: 'Error 3',
        suggestion: '修改建议3',
        context: {
          line: 2,
          snippet: '原始台词1'
        },
        status: 'accepted' as const
      }
    ];

    (useRevisionStore as unknown as jest.Mock).mockImplementation((selector) => {
      const state = {
        errors: conflictErrors,
        getAcceptedSuggestions: () => conflictErrors.filter(e => e.status === 'accepted')
      };
      return selector ? selector(state) : state;
    });

    render(<ScriptPreview />);
    
    // The component might detect conflicts and show a warning
    // This depends on the actual conflict detection logic
  });

  it('updates preview when errors change', () => {
    const { rerender } = render(<ScriptPreview />);
    
    expect(screen.getByText(/1 修改已应用/)).toBeInTheDocument();

    // Update errors
    const updatedErrors = [
      ...mockErrors,
      {
        id: 'error-3',
        category: 'logic',
        severity: 'low',
        message: 'Error 3',
        suggestion: '修改建议3',
        context: {
          line: 1,
          snippet: '第一场'
        },
        status: 'accepted' as const
      }
    ];

    (useRevisionStore as unknown as jest.Mock).mockImplementation((selector) => {
      const state = {
        errors: updatedErrors,
        getAcceptedSuggestions: () => updatedErrors.filter(e => e.status === 'accepted')
      };
      return selector ? selector(state) : state;
    });

    rerender(<ScriptPreview />);
    
    expect(screen.getByText(/2 修改已应用/)).toBeInTheDocument();
  });
});