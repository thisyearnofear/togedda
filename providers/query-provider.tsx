/**
 * React Query Provider with optimized configuration for prediction market
 * Provides caching, background updates, and error handling
 */

"use client";

import React, { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
// import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

// Optimized query client configuration for prediction market
function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Cache configuration
        staleTime: 30 * 1000, // 30 seconds
        gcTime: 5 * 60 * 1000, // 5 minutes (formerly cacheTime)

        // Retry configuration
        retry: (failureCount, error: any) => {
          // Don't retry on 4xx errors (client errors)
          if (error?.status >= 400 && error?.status < 500) {
            return false;
          }
          // Retry up to 3 times for other errors
          return failureCount < 3;
        },
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),

        // Background refetch configuration
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
        refetchOnMount: true,

        // Network mode
        networkMode: "online",
      },
      mutations: {
        // Retry configuration for mutations
        retry: 1,
        retryDelay: 2000,

        // Network mode
        networkMode: "online",
      },
    },

    // Global error handler
    // logger: {
    //   log: console.log,
    //   warn: console.warn,
    //   error: (error) => {
    //     console.error("React Query Error:", error);

    //     // You could integrate with error reporting service here
    //     // e.g., Sentry, LogRocket, etc.
    //   },
    // },
  });
}

interface QueryProviderProps {
  children: React.ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps) {
  // Create query client with stable reference
  const [queryClient] = useState(() => createQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* Show React Query DevTools in development */}
      {/* {process.env.NODE_ENV === "development" && (
        <ReactQueryDevtools
          initialIsOpen={false}
          position="bottom-right"
          buttonPosition="bottom-right"
        />
      )} */}
    </QueryClientProvider>
  );
}

/**
 * Hook to access the query client instance
 */
export { useQueryClient } from "@tanstack/react-query";
