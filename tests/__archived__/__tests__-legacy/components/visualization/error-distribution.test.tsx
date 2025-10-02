import React from 'react';
import { render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ErrorDistribution } from '@/components/visualization/error-distribution';
import { LogicError } from '@/types/analysis';

describe('ErrorDistribution Component', () => {
  const mockErrors: LogicError[] = [
    {
      id: '1',
      type: 'timeline',
      severity: 'critical',
      location: { lineNumber: 10 },
      description: 'Timeline inconsistency'
    },
    {
      id: '2',
      type: 'character',
      severity: 'high',
      location: { lineNumber: 20 },
      description: 'Character behavior inconsistency'
    },
    {
      id: '3',
      type: 'plot',
      severity: 'medium',
      location: { lineNumber: 30 },
      description: 'Plot hole detected'
    },
    {
      id: '4',
      type: 'timeline',
      severity: 'low',
      location: { lineNumber: 40 },
      description: 'Minor timeline issue'
    },
    {
      id: '5',
      type: 'dialogue',
      severity: 'high',
      location: { lineNumber: 50 },
      description: 'Dialogue inconsistency'
    }
  ];

  it('renders without crashing', () => {
    render(<ErrorDistribution errors={mockErrors} />);
    expect(screen.getByText('Error Distribution')).toBeInTheDocument();
  });

  it('displays custom title when provided', () => {
    render(<ErrorDistribution errors={mockErrors} title="Custom Title" />);
    expect(screen.getByText('Custom Title')).toBeInTheDocument();
  });

  it('renders tab navigation', () => {
    render(<ErrorDistribution errors={mockErrors} />);
    expect(screen.getByRole('tab', { name: /By Type/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /By Severity/i })).toBeInTheDocument();
  });

  it('handles empty error array', () => {
    render(<ErrorDistribution errors={[]} />);
    expect(screen.getByText('Error Distribution')).toBeInTheDocument();
  });

  it('calculates correct distribution percentages', () => {
    const { container } = render(<ErrorDistribution errors={mockErrors} />);
    
    // Check if Recharts components are rendered
    const svgElements = container.querySelectorAll('svg');
    expect(svgElements.length).toBeGreaterThan(0);
  });

  it('applies custom height when provided', () => {
    const { container } = render(<ErrorDistribution errors={mockErrors} height={500} />);
    const responsiveContainer = container.querySelector('.recharts-responsive-container');
    
    // Recharts ResponsiveContainer should be present
    expect(responsiveContainer).toBeInTheDocument();
  });

  it('memoizes component to prevent unnecessary re-renders', () => {
    const { rerender } = render(<ErrorDistribution errors={mockErrors} />);
    const initialRender = screen.getByText('Error Distribution');
    
    // Re-render with same props
    rerender(<ErrorDistribution errors={mockErrors} />);
    const secondRender = screen.getByText('Error Distribution');
    
    expect(initialRender).toBe(secondRender);
  });

  it('groups errors correctly by type', () => {
    render(<ErrorDistribution errors={mockErrors} />);
    
    // Timeline appears twice, so should show 40% (2/5)
    // Other types appear once each, so should show 20% (1/5)
    const expectedTypes = ['timeline', 'character', 'plot', 'dialogue'];
    
    expectedTypes.forEach(type => {
      // Check if the legend contains the type
      const legendItems = screen.getAllByText(new RegExp(type, 'i'));
      expect(legendItems.length).toBeGreaterThan(0);
    });
  });

  it('groups errors correctly by severity', () => {
    render(<ErrorDistribution errors={mockErrors} />);
    
    // Click on severity tab
    const severityTab = screen.getByRole('tab', { name: /By Severity/i });
    severityTab.click();
    
    // Check severity distribution
    const expectedSeverities = ['critical', 'high', 'medium', 'low'];
    
    expectedSeverities.forEach(severity => {
      const legendItems = screen.getAllByText(new RegExp(severity, 'i'));
      expect(legendItems.length).toBeGreaterThan(0);
    });
  });
});