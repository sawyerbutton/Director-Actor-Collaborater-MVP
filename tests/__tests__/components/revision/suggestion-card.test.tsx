import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SuggestionCard } from '@/components/revision/suggestion-card';
import type { LogicError } from '@/types/analysis';

describe('SuggestionCard', () => {
  const mockError: LogicError & { status?: 'pending' | 'accepted' | 'rejected' } = {
    id: 'error-1',
    type: 'plot',
    severity: 'high',
    description: 'Test error message',
    suggestion: 'Test suggestion',
    location: {
      line: 10,
      character: 5,
      snippet: 'test snippet'
    },
    status: 'pending'
  } as any;

  const mockOnAccept = jest.fn();
  const mockOnReject = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders error information correctly', () => {
    render(
      <SuggestionCard
        error={mockError}
        onAccept={mockOnAccept}
        onReject={mockOnReject}
      />
    );

    expect(screen.getByText('问题描述')).toBeInTheDocument();
    expect(screen.getByText('Test error message')).toBeInTheDocument();
    expect(screen.getByText('修改建议')).toBeInTheDocument();
    expect(screen.getByText('Test suggestion')).toBeInTheDocument();
    expect(screen.getByText(/第 10 行/)).toBeInTheDocument();
  });

  it('displays correct severity badge', () => {
    render(
      <SuggestionCard
        error={mockError}
        onAccept={mockOnAccept}
        onReject={mockOnReject}
      />
    );

    expect(screen.getByText('高')).toBeInTheDocument();
  });

  it('calls onAccept when accept button is clicked', () => {
    render(
      <SuggestionCard
        error={mockError}
        onAccept={mockOnAccept}
        onReject={mockOnReject}
      />
    );

    const acceptButton = screen.getByText('接受');
    fireEvent.click(acceptButton);

    expect(mockOnAccept).toHaveBeenCalledWith('error-1');
    expect(mockOnReject).not.toHaveBeenCalled();
  });

  it('calls onReject when reject button is clicked', () => {
    render(
      <SuggestionCard
        error={mockError}
        onAccept={mockOnAccept}
        onReject={mockOnReject}
      />
    );

    const rejectButton = screen.getByText('拒绝');
    fireEvent.click(rejectButton);

    expect(mockOnReject).toHaveBeenCalledWith('error-1');
    expect(mockOnAccept).not.toHaveBeenCalled();
  });

  it('disables buttons when status is accepted', () => {
    const acceptedError = { ...mockError, status: 'accepted' as const };
    
    render(
      <SuggestionCard
        error={acceptedError}
        onAccept={mockOnAccept}
        onReject={mockOnReject}
      />
    );

    const acceptButton = screen.getByText('接受');
    const rejectButton = screen.getByText('拒绝');

    expect(acceptButton).toBeDisabled();
    expect(rejectButton).toBeDisabled();
    expect(screen.getByText('已接受')).toBeInTheDocument();
  });

  it('disables buttons when status is rejected', () => {
    const rejectedError = { ...mockError, status: 'rejected' as const };
    
    render(
      <SuggestionCard
        error={rejectedError}
        onAccept={mockOnAccept}
        onReject={mockOnReject}
      />
    );

    const acceptButton = screen.getByText('接受');
    const rejectButton = screen.getByText('拒绝');

    expect(acceptButton).toBeDisabled();
    expect(rejectButton).toBeDisabled();
    expect(screen.getByText('已拒绝')).toBeInTheDocument();
  });

  it('applies correct styling for accepted state', () => {
    const acceptedError = { ...mockError, status: 'accepted' as const };
    
    const { container } = render(
      <SuggestionCard
        error={acceptedError}
        onAccept={mockOnAccept}
        onReject={mockOnReject}
      />
    );

    const card = container.querySelector('.bg-green-50');
    expect(card).toBeInTheDocument();
  });

  it('applies correct styling for rejected state', () => {
    const rejectedError = { ...mockError, status: 'rejected' as const };
    
    const { container } = render(
      <SuggestionCard
        error={rejectedError}
        onAccept={mockOnAccept}
        onReject={mockOnReject}
      />
    );

    const card = container.querySelector('.bg-gray-50');
    expect(card).toBeInTheDocument();
  });
});