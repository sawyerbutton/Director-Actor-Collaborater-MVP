import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AdvancedFilter } from '@/components/analysis/advanced-filter';
import { LogicError } from '@/types/analysis';

describe('AdvancedFilter Component', () => {
  const mockErrors: LogicError[] = [
    {
      id: '1',
      type: 'timeline',
      severity: 'critical',
      location: { sceneNumber: 1, characterName: 'John', lineNumber: 10 },
      description: 'Timeline inconsistency in scene 1'
    },
    {
      id: '2',
      type: 'character',
      severity: 'high',
      location: { sceneNumber: 2, characterName: 'Jane', lineNumber: 20 },
      description: 'Character behavior issue'
    },
    {
      id: '3',
      type: 'plot',
      severity: 'medium',
      location: { sceneNumber: 1, characterName: 'John', lineNumber: 30 },
      description: 'Plot hole detected'
    },
    {
      id: '4',
      type: 'dialogue',
      severity: 'low',
      location: { sceneNumber: 3, characterName: 'Bob', lineNumber: 40 },
      description: 'Dialogue inconsistency'
    }
  ];

  const mockOnFilterChange = jest.fn();
  const mockOnCriteriaChange = jest.fn();
  const mockOnSaveFilter = jest.fn();
  const mockOnDeleteFilter = jest.fn();

  beforeEach(() => {
    mockOnFilterChange.mockClear();
    mockOnCriteriaChange.mockClear();
    mockOnSaveFilter.mockClear();
    mockOnDeleteFilter.mockClear();
  });

  it('renders with basic elements', () => {
    render(
      <AdvancedFilter
        errors={mockErrors}
        onFilterChange={mockOnFilterChange}
      />
    );

    expect(screen.getByText('Advanced Filters')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search errors...')).toBeInTheDocument();
  });

  it('expands and collapses filter options', () => {
    render(
      <AdvancedFilter
        errors={mockErrors}
        onFilterChange={mockOnFilterChange}
      />
    );

    const expandButton = screen.getByText('Expand');
    fireEvent.click(expandButton);
    
    expect(screen.getByText('Error Types')).toBeInTheDocument();
    expect(screen.getByText('Severity Levels')).toBeInTheDocument();
    
    const collapseButton = screen.getByText('Collapse');
    fireEvent.click(collapseButton);
    
    expect(screen.queryByText('Error Types')).not.toBeInTheDocument();
  });

  it('filters errors by search text', async () => {
    render(
      <AdvancedFilter
        errors={mockErrors}
        onFilterChange={mockOnFilterChange}
      />
    );

    const searchInput = screen.getByPlaceholderText('Search errors...');
    fireEvent.change(searchInput, { target: { value: 'Timeline' } });

    await waitFor(() => {
      expect(mockOnFilterChange).toHaveBeenCalled();
      const filteredErrors = mockOnFilterChange.mock.calls[mockOnFilterChange.mock.calls.length - 1][0];
      expect(filteredErrors).toHaveLength(1);
      expect(filteredErrors[0].id).toBe('1');
    });
  });

  it('filters errors by type', async () => {
    render(
      <AdvancedFilter
        errors={mockErrors}
        onFilterChange={mockOnFilterChange}
      />
    );

    // Expand filters
    fireEvent.click(screen.getByText('Expand'));
    
    // Click on timeline type
    const timelineBadge = screen.getByText('timeline');
    fireEvent.click(timelineBadge);

    await waitFor(() => {
      expect(mockOnFilterChange).toHaveBeenCalled();
      const filteredErrors = mockOnFilterChange.mock.calls[mockOnFilterChange.mock.calls.length - 1][0];
      expect(filteredErrors).toHaveLength(1);
      expect(filteredErrors[0].type).toBe('timeline');
    });
  });

  it('filters errors by severity', async () => {
    render(
      <AdvancedFilter
        errors={mockErrors}
        onFilterChange={mockOnFilterChange}
      />
    );

    // Expand filters
    fireEvent.click(screen.getByText('Expand'));
    
    // Click on critical severity
    const criticalBadge = screen.getByText('critical');
    fireEvent.click(criticalBadge);

    await waitFor(() => {
      expect(mockOnFilterChange).toHaveBeenCalled();
      const filteredErrors = mockOnFilterChange.mock.calls[mockOnFilterChange.mock.calls.length - 1][0];
      expect(filteredErrors).toHaveLength(1);
      expect(filteredErrors[0].severity).toBe('critical');
    });
  });

  it('filters errors by scene', async () => {
    render(
      <AdvancedFilter
        errors={mockErrors}
        onFilterChange={mockOnFilterChange}
      />
    );

    // Expand filters
    fireEvent.click(screen.getByText('Expand'));
    
    // Click on Scene 1
    const scene1Badge = screen.getByText('Scene 1');
    fireEvent.click(scene1Badge);

    await waitFor(() => {
      expect(mockOnFilterChange).toHaveBeenCalled();
      const filteredErrors = mockOnFilterChange.mock.calls[mockOnFilterChange.mock.calls.length - 1][0];
      expect(filteredErrors).toHaveLength(2); // Errors 1 and 3 are in scene 1
    });
  });

  it('filters errors by character', async () => {
    render(
      <AdvancedFilter
        errors={mockErrors}
        onFilterChange={mockOnFilterChange}
      />
    );

    // Expand filters
    fireEvent.click(screen.getByText('Expand'));
    
    // Click on John character
    const johnBadge = screen.getByText('John');
    fireEvent.click(johnBadge);

    await waitFor(() => {
      expect(mockOnFilterChange).toHaveBeenCalled();
      const filteredErrors = mockOnFilterChange.mock.calls[mockOnFilterChange.mock.calls.length - 1][0];
      expect(filteredErrors).toHaveLength(2); // Errors 1 and 3 have John
    });
  });

  it('shows active filter count', async () => {
    render(
      <AdvancedFilter
        errors={mockErrors}
        onFilterChange={mockOnFilterChange}
      />
    );

    // Expand filters
    fireEvent.click(screen.getByText('Expand'));
    
    // Apply multiple filters
    fireEvent.click(screen.getByText('timeline'));
    fireEvent.click(screen.getByText('critical'));

    await waitFor(() => {
      expect(screen.getByText('2 active')).toBeInTheDocument();
    });
  });

  it('resets all filters', async () => {
    render(
      <AdvancedFilter
        errors={mockErrors}
        onFilterChange={mockOnFilterChange}
      />
    );

    // Expand and apply filters
    fireEvent.click(screen.getByText('Expand'));
    fireEvent.click(screen.getByText('timeline'));
    
    // Reset filters
    const resetButton = screen.getByRole('button', { name: /RotateCcw/i });
    fireEvent.click(resetButton);

    await waitFor(() => {
      const lastCall = mockOnFilterChange.mock.calls[mockOnFilterChange.mock.calls.length - 1];
      expect(lastCall[0]).toHaveLength(mockErrors.length);
    });
  });

  it('saves a filter configuration', async () => {
    render(
      <AdvancedFilter
        errors={mockErrors}
        onFilterChange={mockOnFilterChange}
        onSaveFilter={mockOnSaveFilter}
      />
    );

    // Expand and apply filters
    fireEvent.click(screen.getByText('Expand'));
    fireEvent.click(screen.getByText('timeline'));
    
    // Save filter
    const filterNameInput = screen.getByPlaceholderText('Filter name...');
    fireEvent.change(filterNameInput, { target: { value: 'My Filter' } });
    
    const saveButton = screen.getByText('Save');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockOnSaveFilter).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'My Filter',
          criteria: expect.objectContaining({
            types: ['timeline']
          })
        })
      );
    });
  });

  it('loads a saved filter', () => {
    const savedFilters = [{
      id: '1',
      name: 'Saved Filter',
      criteria: { types: ['timeline'], severities: ['critical'] },
      createdAt: new Date()
    }];

    render(
      <AdvancedFilter
        errors={mockErrors}
        onFilterChange={mockOnFilterChange}
        savedFilters={savedFilters}
      />
    );

    // Expand to see saved filters
    fireEvent.click(screen.getByText('Expand'));
    
    // Click on saved filter
    fireEvent.click(screen.getByText('Saved Filter'));

    expect(mockOnFilterChange).toHaveBeenCalled();
  });

  it('deletes a saved filter', () => {
    const savedFilters = [{
      id: '1',
      name: 'Saved Filter',
      criteria: { types: ['timeline'] },
      createdAt: new Date()
    }];

    render(
      <AdvancedFilter
        errors={mockErrors}
        onFilterChange={mockOnFilterChange}
        savedFilters={savedFilters}
        onDeleteFilter={mockOnDeleteFilter}
      />
    );

    // Expand to see saved filters
    fireEvent.click(screen.getByText('Expand'));
    
    // Click delete button
    const deleteButton = screen.getByRole('button', { name: /Trash2/i });
    fireEvent.click(deleteButton);

    expect(mockOnDeleteFilter).toHaveBeenCalledWith('1');
  });

  it('triggers criteria change callback', async () => {
    render(
      <AdvancedFilter
        errors={mockErrors}
        onFilterChange={mockOnFilterChange}
        onCriteriaChange={mockOnCriteriaChange}
      />
    );

    const searchInput = screen.getByPlaceholderText('Search errors...');
    fireEvent.change(searchInput, { target: { value: 'test' } });

    await waitFor(() => {
      expect(mockOnCriteriaChange).toHaveBeenCalledWith(
        expect.objectContaining({
          searchText: 'test'
        })
      );
    });
  });
});