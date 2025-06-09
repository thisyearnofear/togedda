"use client";

import { useState, useCallback, useRef } from "react";

interface UseLazyLoadOptions {
  delay?: number;
  enableOnInteraction?: boolean;
  enableOnVisible?: boolean;
}

interface UseLazyLoadReturn {
  isLoaded: boolean;
  isLoading: boolean;
  error: string | null;
  load: () => Promise<void>;
  reset: () => void;
  hasInteracted: boolean;
}

/**
 * Hook to defer heavy operations until user interaction or explicit trigger
 * Helps improve initial page load performance
 */
export function useLazyLoad(
  loadFn: () => Promise<void>,
  options: UseLazyLoadOptions = {}
): UseLazyLoadReturn {
  const {
    delay = 0,
    enableOnInteraction = true,
    enableOnVisible = false,
  } = options;

  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasInteracted, setHasInteracted] = useState(false);
  const loadedRef = useRef(false);

  const load = useCallback(async () => {
    if (loadedRef.current || isLoading) return;

    setIsLoading(true);
    setError(null);
    loadedRef.current = true;

    try {
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      await loadFn();
      setIsLoaded(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Load failed";
      setError(errorMessage);
      loadedRef.current = false; // Allow retry
      console.warn("Lazy load failed:", err);
    } finally {
      setIsLoading(false);
    }
  }, [loadFn, delay, isLoading]);

  const reset = useCallback(() => {
    setIsLoaded(false);
    setIsLoading(false);
    setError(null);
    setHasInteracted(false);
    loadedRef.current = false;
  }, []);

  // Set up interaction listeners if enabled
  const handleInteraction = useCallback(() => {
    if (!hasInteracted) {
      setHasInteracted(true);
      if (enableOnInteraction && !loadedRef.current) {
        load();
      }
    }
  }, [hasInteracted, enableOnInteraction, load]);

  // Set up intersection observer if enabled
  const observerRef = useRef<IntersectionObserver | null>(null);
  const elementRef = useCallback((node: HTMLElement | null) => {
    if (!enableOnVisible) return;

    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    if (node && !loadedRef.current) {
      observerRef.current = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            load();
            observerRef.current?.disconnect();
          }
        },
        { threshold: 0.1 }
      );
      observerRef.current.observe(node);
    }
  }, [enableOnVisible, load]);

  // Attach interaction handlers to window if enabled
  if (enableOnInteraction && typeof window !== "undefined") {
    const events = ['click', 'scroll', 'keydown', 'touchstart'];
    
    events.forEach(event => {
      window.addEventListener(event, handleInteraction, { 
        once: true, 
        passive: true 
      });
    });

    // Cleanup function (though not returned, handled by React)
    const cleanup = () => {
      events.forEach(event => {
        window.removeEventListener(event, handleInteraction);
      });
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }

  return {
    isLoaded,
    isLoading,
    error,
    load,
    reset,
    hasInteracted,
  };
}

/**
 * Simple hook to track if user has interacted with the page
 */
export function useUserInteraction(): {
  hasInteracted: boolean;
  setInteracted: () => void;
} {
  const [hasInteracted, setHasInteracted] = useState(false);

  const setInteracted = useCallback(() => {
    setHasInteracted(true);
  }, []);

  return { hasInteracted, setInteracted };
}

/**
 * Hook to defer component mounting until interaction
 */
export function useDeferredMount(deps: any[] = []): boolean {
  const [shouldMount, setShouldMount] = useState(false);
  const { hasInteracted } = useUserInteraction();

  // Mount component after interaction or dependency change
  if (hasInteracted && !shouldMount) {
    setShouldMount(true);
  }

  return shouldMount || deps.some(dep => dep);
}