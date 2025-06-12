"use client";

import { useEffect } from 'react';

interface PerformanceMetrics {
  chatLoadTime?: number;
  botConnectionTime?: number;
  messageResponseTime?: number;
  bundleSize?: number;
}

const PerformanceMonitor = () => {
  useEffect(() => {
    // Track initial page load performance
    const trackPageLoad = () => {
      if (typeof window !== 'undefined' && window.performance) {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        
        const metrics = {
          pageLoadTime: navigation.loadEventEnd - navigation.fetchStart,
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.fetchStart,
          firstContentfulPaint: 0,
          largestContentfulPaint: 0
        };

        // Get paint metrics
        const paintEntries = performance.getEntriesByType('paint');
        paintEntries.forEach((entry) => {
          if (entry.name === 'first-contentful-paint') {
            metrics.firstContentfulPaint = entry.startTime;
          }
        });

        // Get LCP
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          metrics.largestContentfulPaint = lastEntry.startTime;
        });
        
        try {
          observer.observe({ entryTypes: ['largest-contentful-paint'] });
        } catch (e) {
          // LCP not supported in all browsers
        }

        // Log metrics for development
        if (process.env.NODE_ENV === 'development') {
          console.log('🚀 Performance Metrics:', metrics);
        }

        // Send to analytics in production
        if (typeof window !== 'undefined' && (window as any).analytics) {
          (window as any).analytics.track('page_performance', metrics);
        }
      }
    };

    // Track after page is fully loaded
    if (document.readyState === 'complete') {
      trackPageLoad();
    } else {
      window.addEventListener('load', trackPageLoad);
      return () => window.removeEventListener('load', trackPageLoad);
    }
  }, []);

  // Track chat-specific performance
  useEffect(() => {
    const trackChatPerformance = (eventName: string, startTime: number) => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`💬 ${eventName}: ${duration.toFixed(2)}ms`);
      }

      if (typeof window !== 'undefined' && (window as any).analytics) {
        (window as any).analytics.track('chat_performance', {
          event: eventName,
          duration,
          timestamp: Date.now()
        });
      }
    };

    // Expose performance tracking globally for chat components
    (window as any).trackChatPerformance = trackChatPerformance;

    return () => {
      delete (window as any).trackChatPerformance;
    };
  }, []);

  // Monitor memory usage (development only)
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;

    const monitorMemory = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        console.log('🧠 Memory Usage:', {
          used: `${(memory.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
          total: `${(memory.totalJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
          limit: `${(memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2)} MB`
        });
      }
    };

    const interval = setInterval(monitorMemory, 30000); // Every 30 seconds
    return () => clearInterval(interval);
  }, []);

  return null; // This component doesn't render anything
};

// Helper function to track specific operations
export const trackOperation = (operationName: string) => {
  const startTime = performance.now();
  
  return {
    end: () => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`⏱️ ${operationName}: ${duration.toFixed(2)}ms`);
      }

      if (typeof window !== 'undefined' && (window as any).analytics) {
        (window as any).analytics.track('operation_performance', {
          operation: operationName,
          duration,
          timestamp: Date.now()
        });
      }

      return duration;
    }
  };
};

// Helper to track bundle sizes
export const trackBundleSize = (componentName: string, size: number) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`📦 ${componentName} bundle: ${(size / 1024).toFixed(2)} KB`);
  }

  if (typeof window !== 'undefined' && (window as any).analytics) {
    (window as any).analytics.track('bundle_size', {
      component: componentName,
      size,
      timestamp: Date.now()
    });
  }
};

export default PerformanceMonitor;
