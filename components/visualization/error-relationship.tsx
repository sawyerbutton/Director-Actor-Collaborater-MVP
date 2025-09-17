'use client';

import React, { useMemo, useRef, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LogicError } from '@/types/analysis';
import { ErrorRelationship, ErrorNode, DEFAULT_THEME } from '@/types/visualization';
import { ZoomIn, ZoomOut, Move, Maximize2 } from 'lucide-react';

interface ErrorRelationshipGraphProps {
  errors: LogicError[];
  relationships?: ErrorRelationship[];
  selectedError?: LogicError | null;
  onErrorClick?: (error: LogicError) => void;
  title?: string;
  height?: number;
}

export const ErrorRelationshipGraph = React.memo<ErrorRelationshipGraphProps>(({
  errors,
  relationships = [],
  selectedError,
  onErrorClick,
  title = 'Error Relationships',
  height = 600
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  const nodes = useMemo<ErrorNode[]>(() => {
    const nodeMap = new Map<string, ErrorNode>();
    
    errors.forEach((error, index) => {
      const angle = (2 * Math.PI * index) / errors.length;
      const radius = Math.min(height / 3, 200);
      const centerX = height / 2;
      const centerY = height / 2;
      
      nodeMap.set(error.id, {
        id: error.id,
        error,
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
        connections: []
      });
    });
    
    relationships.forEach(rel => {
      const sourceNode = nodeMap.get(rel.sourceId);
      const targetNode = nodeMap.get(rel.targetId);
      if (sourceNode && targetNode) {
        sourceNode.connections.push(rel.targetId);
      }
    });
    
    return Array.from(nodeMap.values());
  }, [errors, relationships, height]);

  const detectRelationships = useMemo<ErrorRelationship[]>(() => {
    if (relationships.length > 0) return relationships;
    
    const detected: ErrorRelationship[] = [];
    
    errors.forEach((error1, i) => {
      errors.slice(i + 1).forEach(error2 => {
        let strength = 0;
        let type: ErrorRelationship['type'] = 'related';
        
        if (error1.location.sceneNumber === error2.location.sceneNumber) {
          strength += 0.3;
        }
        
        if (error1.location.characterName === error2.location.characterName && 
            error1.location.characterName) {
          strength += 0.4;
        }
        
        if (error1.type === error2.type) {
          strength += 0.2;
        }
        
        const timeDiff = Math.abs(
          (error1.location.lineNumber || 0) - (error2.location.lineNumber || 0)
        );
        if (timeDiff < 10) {
          strength += 0.3;
          type = 'causes';
        }
        
        if (error1.type === 'timeline' && error2.type === 'plot') {
          type = 'conflicts';
          strength += 0.2;
        }
        
        if (strength > 0.3) {
          detected.push({
            sourceId: error1.id,
            targetId: error2.id,
            type,
            strength: Math.min(strength, 1)
          });
        }
      });
    });
    
    return detected;
  }, [errors, relationships]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvas.offsetWidth * dpr;
    canvas.height = canvas.offsetHeight * dpr;
    ctx.scale(dpr, dpr);
    
    ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);
    
    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);
    
    detectRelationships.forEach(rel => {
      const sourceNode = nodes.find(n => n.id === rel.sourceId);
      const targetNode = nodes.find(n => n.id === rel.targetId);
      
      if (sourceNode && targetNode && sourceNode.x && sourceNode.y && targetNode.x && targetNode.y) {
        ctx.beginPath();
        ctx.moveTo(sourceNode.x, sourceNode.y);
        
        const midX = (sourceNode.x + targetNode.x) / 2;
        const midY = (sourceNode.y + targetNode.y) / 2;
        const offset = rel.type === 'conflicts' ? 50 : 0;
        
        ctx.quadraticCurveTo(
          midX + offset,
          midY - offset,
          targetNode.x,
          targetNode.y
        );
        
        ctx.strokeStyle = rel.type === 'conflicts' 
          ? DEFAULT_THEME.colors.critical 
          : rel.type === 'causes'
          ? DEFAULT_THEME.colors.high
          : DEFAULT_THEME.colors.medium;
        ctx.lineWidth = rel.strength * 3;
        ctx.globalAlpha = 0.3 + rel.strength * 0.4;
        ctx.stroke();
        
        const angle = Math.atan2(targetNode.y - sourceNode.y, targetNode.x - sourceNode.x);
        const arrowLength = 10;
        const arrowAngle = Math.PI / 6;
        
        ctx.beginPath();
        ctx.moveTo(targetNode.x, targetNode.y);
        ctx.lineTo(
          targetNode.x - arrowLength * Math.cos(angle - arrowAngle),
          targetNode.y - arrowLength * Math.sin(angle - arrowAngle)
        );
        ctx.lineTo(
          targetNode.x - arrowLength * Math.cos(angle + arrowAngle),
          targetNode.y - arrowLength * Math.sin(angle + arrowAngle)
        );
        ctx.closePath();
        ctx.fillStyle = ctx.strokeStyle;
        ctx.fill();
      }
    });
    
    ctx.globalAlpha = 1;
    
    nodes.forEach(node => {
      if (!node.x || !node.y) return;
      
      const isSelected = selectedError?.id === node.id;
      const isHovered = hoveredNode === node.id;
      const radius = isSelected ? 25 : isHovered ? 22 : 20;
      
      ctx.beginPath();
      ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI);
      ctx.fillStyle = DEFAULT_THEME.colors[node.error.severity];
      ctx.fill();
      
      if (isSelected) {
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 3;
        ctx.stroke();
      }
      
      ctx.fillStyle = 'white';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        node.error.type.substring(0, 1).toUpperCase(),
        node.x,
        node.y
      );
    });
    
    ctx.restore();
  }, [nodes, detectRelationships, zoom, pan, selectedError, hoveredNode]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left - pan.x) / zoom;
    const y = (e.clientY - rect.top - pan.y) / zoom;
    
    const clickedNode = nodes.find(node => {
      if (!node.x || !node.y) return false;
      const distance = Math.sqrt((node.x - x) ** 2 + (node.y - y) ** 2);
      return distance <= 20;
    });
    
    if (clickedNode && onErrorClick) {
      onErrorClick(clickedNode.error);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    } else {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left - pan.x) / zoom;
      const y = (e.clientY - rect.top - pan.y) / zoom;
      
      const hoveredNode = nodes.find(node => {
        if (!node.x || !node.y) return false;
        const distance = Math.sqrt((node.x - x) ** 2 + (node.y - y) ** 2);
        return distance <= 20;
      });
      
      setHoveredNode(hoveredNode?.id || null);
      canvas.style.cursor = hoveredNode ? 'pointer' : isDragging ? 'grabbing' : 'grab';
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(prev => Math.max(0.5, Math.min(3, prev * delta)));
  };

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{title}</span>
          <div className="flex gap-2">
            <button
              onClick={() => setZoom(prev => Math.min(3, prev * 1.2))}
              className="p-1 hover:bg-gray-100 rounded"
              title="Zoom In"
            >
              <ZoomIn size={20} />
            </button>
            <button
              onClick={() => setZoom(prev => Math.max(0.5, prev / 1.2))}
              className="p-1 hover:bg-gray-100 rounded"
              title="Zoom Out"
            >
              <ZoomOut size={20} />
            </button>
            <button
              onClick={resetView}
              className="p-1 hover:bg-gray-100 rounded"
              title="Reset View"
            >
              <Maximize2 size={20} />
            </button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div ref={containerRef} className="relative" style={{ height }}>
          <canvas
            ref={canvasRef}
            className="w-full h-full"
            onClick={handleCanvasClick}
            onMouseDown={(e) => {
              setIsDragging(true);
              setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
            }}
            onMouseUp={() => setIsDragging(false)}
            onMouseLeave={() => setIsDragging(false)}
            onMouseMove={handleMouseMove}
            onWheel={handleWheel}
          />
          
          {hoveredNode && (
            <div className="absolute top-4 left-4 bg-white p-3 rounded shadow-lg max-w-xs">
              {(() => {
                const node = nodes.find(n => n.id === hoveredNode);
                if (!node) return null;
                return (
                  <>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant={node.error.severity === 'critical' ? 'destructive' : 'outline'}>
                        {node.error.severity}
                      </Badge>
                      <Badge variant="outline">{node.error.type}</Badge>
                    </div>
                    <p className="text-sm">{node.error.description}</p>
                    {node.connections.length > 0 && (
                      <p className="text-xs text-gray-500 mt-2">
                        Connected to {node.connections.length} error(s)
                      </p>
                    )}
                  </>
                );
              })()}
            </div>
          )}
          
          <div className="absolute bottom-4 left-4 bg-white p-2 rounded shadow">
            <div className="text-xs space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-3 h-0.5 bg-red-500"></div>
                <span>Conflicts</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-0.5 bg-orange-500"></div>
                <span>Causes</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-0.5 bg-yellow-500"></div>
                <span>Related</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

ErrorRelationshipGraph.displayName = 'ErrorRelationshipGraph';