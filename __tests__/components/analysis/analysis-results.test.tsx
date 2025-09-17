import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AnalysisResults } from '@/components/analysis/analysis-results';
import { LogicError } from '@/types/analysis';
import { Suggestion } from '@/types/revision';

describe('AnalysisResults', () => {
  const mockErrors: LogicError[] = [
    {
      id: 'error-1',
      type: 'timeline',
      severity: 'critical',
      location: { line: 10 },
      description: 'Timeline inconsistency detected',
      suggestion: 'Check timeline order',
      context: 'Scene 1 context',
    },
    {
      id: 'error-2',
      type: 'character',
      severity: 'medium',
      location: { line: 20 },
      description: 'Character inconsistency',
      suggestion: 'Review character behavior',
    },
  ];

  const mockSuggestions: Suggestion[] = [
    {
      id: 'sug-1',
      errorId: 'error-1',
      modification: 'Reorder events in scene 1',
      location: {},
      rationale: 'Maintains chronological order',
      priority: 'high',
      impact: 'Fixes timeline issue',
      confidence: 0.9,
      createdAt: '2025-01-01T00:00:00Z',
    },
  ];

  const mockResults = {
    errors: mockErrors,
    suggestions: mockSuggestions,
    metadata: {
      analysisTime: 5000,
      scriptLength: 1000,
      errorCount: 2,
    },
  };

  it('renders summary statistics', () => {
    render(<AnalysisResults results={mockResults} />);
    
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('检测到的错误')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('修改建议')).toBeInTheDocument();
    expect(screen.getByText('5.0s')).toBeInTheDocument();
    expect(screen.getByText('分析用时')).toBeInTheDocument();
  });

  it('renders filter controls', () => {
    render(<AnalysisResults results={mockResults} />);
    
    expect(screen.getByText('筛选和搜索')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('搜索错误描述...')).toBeInTheDocument();
  });

  it('filters errors by type', () => {
    render(<AnalysisResults results={mockResults} />);
    
    const typeFilter = screen.getAllByRole('combobox')[0];
    fireEvent.click(typeFilter);
    
    const timelineOption = screen.getByText('时间线错误');
    fireEvent.click(timelineOption);
    
    expect(screen.getByText('Timeline inconsistency detected')).toBeInTheDocument();
    expect(screen.queryByText('Character inconsistency')).not.toBeInTheDocument();
  });

  it('filters errors by severity', () => {
    render(<AnalysisResults results={mockResults} />);
    
    const severityFilter = screen.getAllByRole('combobox')[1];
    fireEvent.click(severityFilter);
    
    const criticalOption = screen.getByText('严重');
    fireEvent.click(criticalOption);
    
    expect(screen.getByText('Timeline inconsistency detected')).toBeInTheDocument();
    expect(screen.queryByText('Character inconsistency')).not.toBeInTheDocument();
  });

  it('searches errors by description', async () => {
    render(<AnalysisResults results={mockResults} />);
    
    const searchInput = screen.getByPlaceholderText('搜索错误描述...');
    await userEvent.type(searchInput, 'timeline');
    
    expect(screen.getByText('Timeline inconsistency detected')).toBeInTheDocument();
    expect(screen.queryByText('Character inconsistency')).not.toBeInTheDocument();
  });

  it('expands and collapses error details', () => {
    render(<AnalysisResults results={mockResults} />);
    
    const errorCard = screen.getByText('Timeline inconsistency detected').closest('.cursor-pointer');
    
    // Initially collapsed - context not visible
    expect(screen.queryByText('Scene 1 context')).not.toBeInTheDocument();
    
    // Click to expand
    fireEvent.click(errorCard!);
    expect(screen.getByText('Scene 1 context')).toBeInTheDocument();
    
    // Click to collapse
    fireEvent.click(errorCard!);
    expect(screen.queryByText('Scene 1 context')).not.toBeInTheDocument();
  });

  it('displays suggestions for errors', () => {
    render(<AnalysisResults results={mockResults} />);
    
    const errorCard = screen.getByText('Timeline inconsistency detected').closest('.cursor-pointer');
    fireEvent.click(errorCard!);
    
    expect(screen.getByText('修改建议')).toBeInTheDocument();
    expect(screen.getByText('Reorder events in scene 1')).toBeInTheDocument();
    expect(screen.getByText(/理由:.*Maintains chronological order/)).toBeInTheDocument();
  });

  it('switches between errors and suggestions tabs', () => {
    render(<AnalysisResults results={mockResults} />);
    
    // Initially shows errors
    expect(screen.getByText('Timeline inconsistency detected')).toBeInTheDocument();
    
    // Switch to suggestions tab
    const suggestionsTab = screen.getByRole('tab', { name: /修改建议/ });
    fireEvent.click(suggestionsTab);
    
    expect(screen.getByText('Reorder events in scene 1')).toBeInTheDocument();
    expect(screen.getByText('置信度: 90%')).toBeInTheDocument();
  });

  it('sorts errors by different criteria', () => {
    const unsortedErrors = [
      { ...mockErrors[1], id: 'error-3', location: { line: 5 } },
      { ...mockErrors[0], id: 'error-4', location: { line: 15 } },
    ];
    
    render(<AnalysisResults results={{ ...mockResults, errors: unsortedErrors }} />);
    
    const sortSelect = screen.getAllByRole('combobox')[2];
    fireEvent.click(sortSelect);
    
    const locationOption = screen.getByText('按位置');
    fireEvent.click(locationOption);
    
    const errorTexts = screen.getAllByText(/inconsistency/);
    expect(errorTexts[0]).toHaveTextContent('Character inconsistency');
    expect(errorTexts[1]).toHaveTextContent('Timeline inconsistency');
  });

  it('handles empty results gracefully', () => {
    render(<AnalysisResults results={{ errors: [], suggestions: [] }} />);
    
    expect(screen.getByText('没有找到符合条件的错误')).toBeInTheDocument();
    
    const suggestionsTab = screen.getByRole('tab', { name: /修改建议/ });
    fireEvent.click(suggestionsTab);
    
    expect(screen.getByText('暂无修改建议')).toBeInTheDocument();
  });
});