import { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueries } from '@tanstack/react-query';
import { ResolvedProfile, getDisplayName, hasProfileData } from '@/lib/services/address-resolution';

/**
 * Hook for resolving a single address
 */
export function useAddressResolution(address: string | undefined) {
  return useQuery({
    queryKey: ['address-resolution', address],
    queryFn: async (): Promise<ResolvedProfile> => {
      if (!address) throw new Error('No address provided');
      
      const response = await fetch(`/api/resolve/address?address=${encodeURIComponent(address)}`);
      
      if (!response.ok) {
        throw new Error(`Resolution failed: ${response.status}`);
      }
      
      const data = await response.json();
      return data.profile;
    },
    enabled: !!address,
    staleTime: 15 * 60 * 1000, // 15 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    retry: (failureCount: number, error: any) => {
      // Don't retry on 4xx errors
      if (error && typeof error === 'object' && 'status' in error) {
        const status = error.status as number;
        if (status >= 400 && status < 500) return false;
      }
      return failureCount < 2;
    },
  });
}

/**
 * Hook for resolving multiple addresses
 */
export function useAddressResolutions(addresses: string[]) {
  return useQueries({
    queries: addresses.map(address => ({
      queryKey: ['address-resolution', address],
      queryFn: async (): Promise<ResolvedProfile> => {
        const response = await fetch(`/api/resolve/address?address=${encodeURIComponent(address)}`);
        
        if (!response.ok) {
          throw new Error(`Resolution failed: ${response.status}`);
        }
        
        const data = await response.json();
        return data.profile;
      },
      enabled: !!address,
      staleTime: 15 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      retry: (failureCount: number, error: any) => {
        if (error && typeof error === 'object' && 'status' in error) {
          const status = error.status as number;
          if (status >= 400 && status < 500) return false;
        }
        return failureCount < 2;
      },
    })),
  });
}

/**
 * Hook for batch resolving addresses (more efficient for large lists)
 */
export function useBatchAddressResolution(addresses: string[]) {
  return useQuery({
    queryKey: ['batch-address-resolution', addresses.sort().join(',')],
    queryFn: async (): Promise<ResolvedProfile[]> => {
      if (addresses.length === 0) return [];
      
      const response = await fetch('/api/resolve/address', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ addresses }),
      });
      
      if (!response.ok) {
        throw new Error(`Batch resolution failed: ${response.status}`);
      }
      
      const data = await response.json();
      return data.profiles;
    },
    enabled: addresses.length > 0,
    staleTime: 15 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 2,
  });
}

/**
 * Hook with display utilities
 */
export function useAddressDisplay(address: string | undefined) {
  const { data: profile, isLoading, error } = useAddressResolution(address);
  
  const displayName = profile ? getDisplayName(profile) : 
    address ? `${address.slice(0, 6)}...${address.slice(-4)}` : '';
  
  const hasProfile = profile ? hasProfileData(profile) : false;
  
  return {
    profile,
    displayName,
    hasProfile,
    isLoading,
    error,
    source: profile?.source,
    cached: profile?.cached
  };
}

/**
 * Hook for leaderboard-style address resolution
 */
export function useLeaderboardAddresses(addresses: string[]) {
  const { data: profiles, isLoading, error } = useBatchAddressResolution(addresses);
  
  const addressMap = new Map<string, ResolvedProfile>();
  
  if (profiles) {
    profiles.forEach(profile => {
      addressMap.set(profile.address, profile);
    });
  }
  
  const getProfileForAddress = useCallback((address: string): ResolvedProfile | undefined => {
    return addressMap.get(address.toLowerCase());
  }, [addressMap]);
  
  const getDisplayNameForAddress = useCallback((address: string): string => {
    const profile = getProfileForAddress(address);
    return profile ? getDisplayName(profile) : `${address.slice(0, 6)}...${address.slice(-4)}`;
  }, [getProfileForAddress]);
  
  return {
    profiles,
    addressMap,
    getProfileForAddress,
    getDisplayNameForAddress,
    isLoading,
    error,
    resolved: profiles?.filter(p => hasProfileData(p)).length || 0,
    total: addresses.length
  };
}

/**
 * Preload addresses for better UX
 */
export function usePreloadAddresses() {
  const [preloadedAddresses] = useState(new Set<string>());
  
  const preload = useCallback(async (addresses: string[]) => {
    const newAddresses = addresses.filter(addr => !preloadedAddresses.has(addr));
    
    if (newAddresses.length === 0) return;
    
    try {
      // Preload in background
      fetch('/api/resolve/address', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ addresses: newAddresses }),
      });
      
      newAddresses.forEach(addr => preloadedAddresses.add(addr));
    } catch (error) {
      console.warn('Failed to preload addresses:', error);
    }
  }, [preloadedAddresses]);
  
  return { preload };
}
