import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';

// Configure axios defaults
axios.defaults.baseURL = import.meta.env.VITE_API_BASE_URL || '/api';
axios.defaults.timeout = 10000;

// Add request interceptor for error handling
axios.interceptors.response.use(
  response => response,
  error => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// Simple cache to prevent duplicate requests
const requestCache = new Map();
const CACHE_DURATION = 5000; // 5 seconds cache for identical requests

export const useApi = (url, options = {}) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const intervalRef = useRef(null);
  const mountedRef = useRef(true);

  const { 
    refreshInterval, 
    dependencies = [], 
    enabled = true,
    cacheKey 
  } = options;

  const fetchData = useCallback(async (skipCache = false) => {
    if (!url || !enabled) return;

    const fullCacheKey = cacheKey || url;
    const now = Date.now();

    // Check cache first (unless skipping cache)
    if (!skipCache && requestCache.has(fullCacheKey)) {
      const cached = requestCache.get(fullCacheKey);
      if (now - cached.timestamp < CACHE_DURATION) {
        if (mountedRef.current) {
          setData(cached.data);
          setLoading(false);
          setError(null);
        }
        return;
      }
    }

    try {
      if (mountedRef.current) {
        setLoading(true);
        setError(null);
      }
      
      const response = await axios.get(url);
      
      if (mountedRef.current) {
        setData(response.data);
        
        // Cache the response
        requestCache.set(fullCacheKey, {
          data: response.data,
          timestamp: now
        });
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err);
        console.error(`API fetch error for ${url}:`, err);
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [url, enabled, cacheKey]);

  useEffect(() => {
    mountedRef.current = true;
    
    // Initial fetch
    fetchData();

    // Set up refresh interval if specified
    if (refreshInterval && enabled) {
      intervalRef.current = setInterval(() => {
        fetchData(true); // Skip cache on interval refresh
      }, refreshInterval);
    }

    return () => {
      mountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [url, refreshInterval, enabled, ...dependencies]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const refetch = useCallback(() => {
    fetchData(true); // Skip cache on manual refetch
  }, [fetchData]);

  return { 
    data, 
    loading, 
    error, 
    refetch 
  };
};

// Custom hook for posting data
export const useApiPost = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const post = async (url, data) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.post(url, data);
      return response.data;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const patch = async (url, data) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.patch(url, data);
      return response.data;
    } finally {
      setLoading(false);
    }
  };

  return { post, patch, loading, error };
};