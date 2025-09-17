'use client';

import React, { useMemo } from 'react';
import { ResponsiveContainer, Tooltip, Rectangle } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LogicError, ErrorSeverity } from '@/types/analysis';
import { HeatmapData, DEFAULT_THEME } from '@/types/visualization';

interface SeverityHeatmapProps {
  errors: LogicError[];
  title?: string;
  height?: number;
  maxScenes?: number;
}

export const SeverityHeatmap = React.memo<SeverityHeatmapProps>(({
  errors,
  title = 'Error Severity Heatmap',
  height = 300,
  maxScenes = 20
}) => {
  const heatmapData = useMemo<HeatmapData[]>(() => {
    const sceneErrorMap = new Map<number, Map<ErrorSeverity, number>>();
    
    errors.forEach(error => {
      const sceneNumber = error.location.sceneNumber || 0;
      if (!sceneErrorMap.has(sceneNumber)) {
        sceneErrorMap.set(sceneNumber, new Map());
      }
      const severityMap = sceneErrorMap.get(sceneNumber)!;
      severityMap.set(error.severity, (severityMap.get(error.severity) || 0) + 1);
    });

    const data: HeatmapData[] = [];
    const maxCount = Math.max(...Array.from(sceneErrorMap.values()).flatMap(
      map => Array.from(map.values())
    ), 1);

    sceneErrorMap.forEach((severityMap, sceneNumber) => {
      if (sceneNumber <= maxScenes) {
        (['critical', 'high', 'medium', 'low'] as ErrorSeverity[]).forEach(severity => {
          const count = severityMap.get(severity) || 0;
          data.push({
            sceneNumber,
            severity,
            count,
            intensity: count / maxCount
          });
        });
      }
    });

    return data;
  }, [errors, maxScenes]);

  const scenes = useMemo(() => {
    const uniqueScenes = Array.from(new Set(heatmapData.map(d => d.sceneNumber)));
    return uniqueScenes.sort((a, b) => a - b).slice(0, maxScenes);
  }, [heatmapData, maxScenes]);

  const severities: ErrorSeverity[] = ['critical', 'high', 'medium', 'low'];

  const getColor = (severity: ErrorSeverity, intensity: number): string => {
    const baseColor = DEFAULT_THEME.colors[severity];
    return `${baseColor}${Math.round(intensity * 255).toString(16).padStart(2, '0')}`;
  };

  const cellSize = Math.min(40, (height - 60) / severities.length);
  const gridWidth = scenes.length * cellSize;
  const gridHeight = severities.length * cellSize;

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload[0]) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-2 border rounded shadow-lg">
          <p className="font-semibold">Scene {data.sceneNumber}</p>
          <p className="text-sm capitalize">Severity: {data.severity}</p>
          <p className="text-sm">Errors: {data.count}</p>
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
        <div className="overflow-x-auto">
          <div className="min-w-0">
            <div className="flex mb-2">
              <div className="w-20" />
              {scenes.map(scene => (
                <div
                  key={scene}
                  className="text-xs text-center"
                  style={{ width: cellSize }}
                >
                  S{scene}
                </div>
              ))}
            </div>
            
            <div className="flex">
              <div className="flex flex-col justify-around pr-2">
                {severities.map(severity => (
                  <div
                    key={severity}
                    className="text-xs capitalize text-right"
                    style={{ height: cellSize, lineHeight: `${cellSize}px` }}
                  >
                    {severity}
                  </div>
                ))}
              </div>
              
              <div className="relative">
                <svg width={gridWidth} height={gridHeight}>
                  {heatmapData.map((cell, index) => {
                    const x = scenes.indexOf(cell.sceneNumber) * cellSize;
                    const y = severities.indexOf(cell.severity) * cellSize;
                    
                    if (x < 0 || y < 0) return null;
                    
                    return (
                      <g key={index}>
                        <rect
                          x={x}
                          y={y}
                          width={cellSize - 2}
                          height={cellSize - 2}
                          fill={cell.count > 0 ? getColor(cell.severity, cell.intensity) : '#f3f4f6'}
                          stroke="#e5e7eb"
                          strokeWidth="1"
                          className="cursor-pointer transition-opacity hover:opacity-80"
                        />
                        {cell.count > 0 && (
                          <text
                            x={x + cellSize / 2}
                            y={y + cellSize / 2}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            fill={cell.intensity > 0.5 ? 'white' : 'black'}
                            fontSize="12"
                            fontWeight="500"
                          >
                            {cell.count}
                          </text>
                        )}
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>
            
            <div className="mt-4 flex items-center gap-4">
              <span className="text-xs text-gray-600">Legend:</span>
              {severities.map(severity => (
                <div key={severity} className="flex items-center gap-1">
                  <div
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: DEFAULT_THEME.colors[severity] }}
                  />
                  <span className="text-xs capitalize">{severity}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

SeverityHeatmap.displayName = 'SeverityHeatmap';