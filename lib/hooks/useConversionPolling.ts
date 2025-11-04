/**
 * Conversion Polling Hook
 *
 * Polls conversion status for a project with exponential backoff
 */

import { useState, useEffect, useCallback, useRef } from 'react';

export type ConversionStatus = 'idle' | 'processing' | 'completed' | 'failed' | 'partial';

export interface ConversionStatusData {
  projectId: string;
  totalFiles: number;
  completed: number;
  processing: number;
  pending: number;
  failed: number;
  progress: number; // 0-100
  status: ConversionStatus;
  files: Array<{
    id: string;
    filename: string;
    episodeNumber: number | null;
    conversionStatus: string;
    conversionError: string | null;
    updatedAt: Date;
  }>;
}

export interface UseConversionPollingOptions {
  /**
   * Project ID to poll
   */
  projectId: string;

  /**
   * Enable automatic polling
   * @default false
   */
  enabled?: boolean;

  /**
   * Initial polling delay in milliseconds
   * @default 2000 (2 seconds)
   */
  initialDelay?: number;

  /**
   * Maximum polling delay in milliseconds
   * @default 10000 (10 seconds)
   */
  maxDelay?: number;

  /**
   * Maximum number of polls before timeout
   * @default 60 (about 5-10 minutes with exponential backoff)
   */
  maxPolls?: number;

  /**
   * Callback when conversion completes successfully
   */
  onCompleted?: (data: ConversionStatusData) => void;

  /**
   * Callback when conversion fails or times out
   */
  onError?: (error: string) => void;
}

export interface UseConversionPollingResult {
  /**
   * Current conversion status
   */
  status: ConversionStatus;

  /**
   * Progress percentage (0-100)
   */
  progress: number;

  /**
   * Latest status data
   */
  data: ConversionStatusData | null;

  /**
   * Error message if any
   */
  error: string | null;

  /**
   * Whether polling is active
   */
  isPolling: boolean;

  /**
   * Number of polls executed
   */
  pollCount: number;

  /**
   * Start polling manually
   */
  startPolling: () => void;

  /**
   * Stop polling manually
   */
  stopPolling: () => void;

  /**
   * Reset polling state
   */
  reset: () => void;
}

export function useConversionPolling(
  options: UseConversionPollingOptions
): UseConversionPollingResult {
  const {
    projectId,
    enabled = false,
    initialDelay = 2000,
    maxDelay = 10000,
    maxPolls = 60,
    onCompleted,
    onError,
  } = options;

  const [status, setStatus] = useState<ConversionStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [data, setData] = useState<ConversionStatusData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [pollCount, setPollCount] = useState(0);

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pollDelayRef = useRef(initialDelay);
  const mountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const stopPolling = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsPolling(false);
  }, []);

  const poll = useCallback(async () => {
    if (!mountedRef.current) return;

    try {
      const response = await fetch(`/api/conversion/status/${projectId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Status check failed: ${response.status}`);
      }

      const result = await response.json();
      const statusData: ConversionStatusData = result.data;

      if (!mountedRef.current) return;

      // Update state
      setData(statusData);
      setStatus(statusData.status);
      setProgress(statusData.progress);

      // Check if polling should stop
      if (statusData.status === 'completed') {
        stopPolling();
        onCompleted?.(statusData);
        return;
      }

      if (statusData.status === 'failed') {
        stopPolling();
        const errorMsg = 'Conversion failed for all files';
        setError(errorMsg);
        onError?.(errorMsg);
        return;
      }

      // Check if max polls reached
      const currentPollCount = pollCount + 1;
      setPollCount(currentPollCount);

      if (currentPollCount >= maxPolls) {
        stopPolling();
        const timeoutMsg = 'Conversion timeout - exceeded maximum polling attempts';
        setError(timeoutMsg);
        onError?.(timeoutMsg);
        return;
      }

      // Continue polling with exponential backoff + jitter
      pollDelayRef.current = Math.min(pollDelayRef.current * 1.5, maxDelay);
      const jitter = Math.random() * 1000; // 0-1000ms jitter
      const nextDelay = pollDelayRef.current + jitter;

      timeoutRef.current = setTimeout(() => {
        poll();
      }, nextDelay);
    } catch (err) {
      if (!mountedRef.current) return;

      stopPolling();
      const errorMsg = err instanceof Error ? err.message : 'Status check failed';
      setError(errorMsg);
      onError?.(errorMsg);
    }
  }, [projectId, pollCount, maxPolls, maxDelay, stopPolling, onCompleted, onError]);

  const startPolling = useCallback(() => {
    if (isPolling) return;

    // Reset state
    setError(null);
    setPollCount(0);
    pollDelayRef.current = initialDelay;
    setIsPolling(true);

    // Start polling immediately
    poll();
  }, [isPolling, initialDelay, poll]);

  const reset = useCallback(() => {
    stopPolling();
    setStatus('idle');
    setProgress(0);
    setData(null);
    setError(null);
    setPollCount(0);
    pollDelayRef.current = initialDelay;
  }, [stopPolling, initialDelay]);

  // Auto-start polling if enabled
  useEffect(() => {
    if (enabled && !isPolling && projectId) {
      startPolling();
    }
  }, [enabled, isPolling, projectId, startPolling]);

  return {
    status,
    progress,
    data,
    error,
    isPolling,
    pollCount,
    startPolling,
    stopPolling,
    reset,
  };
}
