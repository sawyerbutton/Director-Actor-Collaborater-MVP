'use client';

import React, { useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { RotateCcw, Redo } from 'lucide-react';
import { useRevisionStore } from '@/lib/stores/revision-store';
import { cn } from '@/lib/utils';

interface RevisionControlsProps {
  className?: string;
}

export const RevisionControls: React.FC<RevisionControlsProps> = ({ className }) => {
  const { undo, redo, canUndo, canRedo } = useRevisionStore();

  const handleUndo = useCallback(() => {
    if (canUndo()) {
      undo();
    }
  }, [canUndo, undo]);

  const handleRedo = useCallback(() => {
    if (canRedo()) {
      redo();
    }
  }, [canRedo, redo]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key === 'z') {
        e.preventDefault();
        handleUndo();
      } else if (
        ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'z') ||
        ((e.metaKey || e.ctrlKey) && e.key === 'y')
      ) {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <Button
        size="sm"
        variant="outline"
        onClick={handleUndo}
        disabled={!canUndo()}
        title="撤销 (Ctrl+Z)"
        aria-label="撤销"
      >
        <RotateCcw className="h-4 w-4" />
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={handleRedo}
        disabled={!canRedo()}
        title="重做 (Ctrl+Y)"
        aria-label="重做"
      >
        <Redo className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default RevisionControls;