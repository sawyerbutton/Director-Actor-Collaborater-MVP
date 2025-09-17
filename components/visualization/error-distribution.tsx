'use client';

import React, { useMemo } from 'react';
import { PieChart, Pie, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LogicError } from '@/types/analysis';
import { ErrorDistributionData, SeverityDistributionData, DEFAULT_THEME } from '@/types/visualization';

interface ErrorDistributionProps {
  errors: LogicError[];
  title?: string;
  height?: number;
}

export const ErrorDistribution = React.memo<ErrorDistributionProps>(({ 
  errors, 
  title = 'Error Distribution',
  height = 400 
}) => {
  const typeDistribution = useMemo<ErrorDistributionData[]>(() => {
    const counts = errors.reduce((acc, error) => {
      acc[error.type] = (acc[error.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const total = errors.length;
    return Object.entries(counts).map(([type, count]) => ({
      type: type as ErrorDistributionData['type'],
      count,
      percentage: total > 0 ? (count / total) * 100 : 0,
      color: DEFAULT_THEME.colors[type as keyof typeof DEFAULT_THEME.colors]
    }));
  }, [errors]);

  const severityDistribution = useMemo<SeverityDistributionData[]>(() => {
    const counts = errors.reduce((acc, error) => {
      acc[error.severity] = (acc[error.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const total = errors.length;
    return Object.entries(counts).map(([severity, count]) => ({
      severity: severity as SeverityDistributionData['severity'],
      count,
      percentage: total > 0 ? (count / total) * 100 : 0,
      color: DEFAULT_THEME.colors[severity as keyof typeof DEFAULT_THEME.colors]
    }));
  }, [errors]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload[0]) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-2 border rounded shadow-lg">
          <p className="font-semibold">{data.type || data.severity}</p>
          <p className="text-sm">Count: {data.count}</p>
          <p className="text-sm">Percentage: {data.percentage.toFixed(1)}%</p>
        </div>
      );
    }
    return null;
  };

  const renderPieLabel = (entry: any) => {
    return `${entry.percentage.toFixed(0)}%`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="type" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="type">By Type</TabsTrigger>
            <TabsTrigger value="severity">By Severity</TabsTrigger>
          </TabsList>
          
          <TabsContent value="type" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium mb-2">Distribution Chart</h3>
                <ResponsiveContainer width="100%" height={height}>
                  <PieChart>
                    <Pie
                      data={typeDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={renderPieLabel}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                      animationBegin={0}
                      animationDuration={DEFAULT_THEME.animation.duration}
                    >
                      {typeDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              
              <div>
                <h3 className="text-sm font-medium mb-2">Count Comparison</h3>
                <ResponsiveContainer width="100%" height={height}>
                  <BarChart data={typeDistribution}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="type" />
                    <YAxis />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar 
                      dataKey="count" 
                      animationDuration={DEFAULT_THEME.animation.duration}
                    >
                      {typeDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="severity" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium mb-2">Severity Distribution</h3>
                <ResponsiveContainer width="100%" height={height}>
                  <PieChart>
                    <Pie
                      data={severityDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={renderPieLabel}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                      animationBegin={0}
                      animationDuration={DEFAULT_THEME.animation.duration}
                    >
                      {severityDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              
              <div>
                <h3 className="text-sm font-medium mb-2">Severity Levels</h3>
                <ResponsiveContainer width="100%" height={height}>
                  <BarChart data={severityDistribution}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="severity" />
                    <YAxis />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar 
                      dataKey="count"
                      animationDuration={DEFAULT_THEME.animation.duration}
                    >
                      {severityDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
});

ErrorDistribution.displayName = 'ErrorDistribution';