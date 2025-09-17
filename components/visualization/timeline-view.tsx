'use client';

import React, { useMemo } from 'react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LogicError } from '@/types/analysis';
import { TimelineDistributionData, DEFAULT_THEME } from '@/types/visualization';

interface TimelineViewProps {
  errors: LogicError[];
  title?: string;
  height?: number;
  showCumulative?: boolean;
}

export const TimelineView = React.memo<TimelineViewProps>(({
  errors,
  title = 'Error Timeline Distribution',
  height = 400,
  showCumulative = false
}) => {
  const timelineData = useMemo(() => {
    const sceneMap = new Map<number, LogicError[]>();
    
    errors.forEach(error => {
      const sceneNumber = error.location.sceneNumber || 0;
      if (!sceneMap.has(sceneNumber)) {
        sceneMap.set(sceneNumber, []);
      }
      sceneMap.get(sceneNumber)!.push(error);
    });

    const scenes = Array.from(sceneMap.keys()).sort((a, b) => a - b);
    let cumulativeCount = 0;
    
    return scenes.map(scene => {
      const sceneErrors = sceneMap.get(scene) || [];
      const errorCount = sceneErrors.length;
      cumulativeCount += errorCount;
      
      const severityCounts = {
        critical: sceneErrors.filter(e => e.severity === 'critical').length,
        high: sceneErrors.filter(e => e.severity === 'high').length,
        medium: sceneErrors.filter(e => e.severity === 'medium').length,
        low: sceneErrors.filter(e => e.severity === 'low').length
      };
      
      return {
        scene,
        errors: errorCount,
        cumulative: cumulativeCount,
        ...severityCounts
      };
    });
  }, [errors]);

  const averageErrors = useMemo(() => {
    if (timelineData.length === 0) return 0;
    const total = timelineData.reduce((sum, d) => sum + d.errors, 0);
    return total / timelineData.length;
  }, [timelineData]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded shadow-lg">
          <p className="font-semibold">Scene {label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <AreaChart data={timelineData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="scene" 
              label={{ value: 'Scene Number', position: 'insideBottom', offset: -5 }}
            />
            <YAxis 
              label={{ value: 'Error Count', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            
            {showCumulative ? (
              <>
                <Area
                  type="monotone"
                  dataKey="cumulative"
                  stroke={DEFAULT_THEME.colors.high}
                  fill={DEFAULT_THEME.colors.high}
                  fillOpacity={0.3}
                  strokeWidth={2}
                  name="Cumulative Errors"
                  animationDuration={DEFAULT_THEME.animation.duration}
                />
                <Line
                  type="monotone"
                  dataKey="errors"
                  stroke={DEFAULT_THEME.colors.critical}
                  strokeWidth={2}
                  dot={{ fill: DEFAULT_THEME.colors.critical, r: 4 }}
                  name="Errors per Scene"
                  animationDuration={DEFAULT_THEME.animation.duration}
                />
              </>
            ) : (
              <>
                <Area
                  type="monotone"
                  dataKey="critical"
                  stackId="1"
                  stroke={DEFAULT_THEME.colors.critical}
                  fill={DEFAULT_THEME.colors.critical}
                  name="Critical"
                  animationDuration={DEFAULT_THEME.animation.duration}
                />
                <Area
                  type="monotone"
                  dataKey="high"
                  stackId="1"
                  stroke={DEFAULT_THEME.colors.high}
                  fill={DEFAULT_THEME.colors.high}
                  name="High"
                  animationDuration={DEFAULT_THEME.animation.duration}
                />
                <Area
                  type="monotone"
                  dataKey="medium"
                  stackId="1"
                  stroke={DEFAULT_THEME.colors.medium}
                  fill={DEFAULT_THEME.colors.medium}
                  name="Medium"
                  animationDuration={DEFAULT_THEME.animation.duration}
                />
                <Area
                  type="monotone"
                  dataKey="low"
                  stackId="1"
                  stroke={DEFAULT_THEME.colors.low}
                  fill={DEFAULT_THEME.colors.low}
                  name="Low"
                  animationDuration={DEFAULT_THEME.animation.duration}
                />
              </>
            )}
            
            <ReferenceLine
              y={averageErrors}
              stroke="#6b7280"
              strokeDasharray="5 5"
              label={{ value: `Average: ${averageErrors.toFixed(1)}`, position: 'right' }}
            />
          </AreaChart>
        </ResponsiveContainer>
        
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Total Errors:</span>
            <span className="ml-2 font-semibold">{errors.length}</span>
          </div>
          <div>
            <span className="text-gray-600">Affected Scenes:</span>
            <span className="ml-2 font-semibold">{timelineData.length}</span>
          </div>
          <div>
            <span className="text-gray-600">Average per Scene:</span>
            <span className="ml-2 font-semibold">{averageErrors.toFixed(1)}</span>
          </div>
          <div>
            <span className="text-gray-600">Peak Errors:</span>
            <span className="ml-2 font-semibold">
              {Math.max(...timelineData.map(d => d.errors), 0)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

TimelineView.displayName = 'TimelineView';