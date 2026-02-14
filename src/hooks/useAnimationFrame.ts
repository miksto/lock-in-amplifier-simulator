import { useEffect, useRef, useCallback } from 'react';

/**
 * Hook for running a callback on each animation frame
 * Useful for smooth 60fps updates
 */
export function useAnimationFrame(callback: (deltaTime: number) => void, isActive: boolean = true) {
  const requestRef = useRef<number>(undefined);
  const previousTimeRef = useRef<number>(undefined);
  const callbackRef = useRef(callback);

  // Update callback ref when callback changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const animate = useCallback((time: number) => {
    if (previousTimeRef.current !== undefined) {
      const deltaTime = time - previousTimeRef.current;
      callbackRef.current(deltaTime);
    }
    previousTimeRef.current = time;
    requestRef.current = requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    if (isActive) {
      requestRef.current = requestAnimationFrame(animate);
    }

    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [isActive, animate]);
}

/**
 * Hook for throttled updates at a specific frame rate
 */
export function useThrottledCallback<T extends (...args: Parameters<T>) => void>(
  callback: T,
  fps: number = 60
): T {
  const lastCallRef = useRef<number>(0);
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const throttledCallback = useCallback(
    (...args: Parameters<T>) => {
      const now = performance.now();
      const interval = 1000 / fps;

      if (now - lastCallRef.current >= interval) {
        lastCallRef.current = now;
        callbackRef.current(...args);
      }
    },
    [fps]
  ) as T;

  return throttledCallback;
}
