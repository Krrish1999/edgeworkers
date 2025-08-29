import { useState, useEffect } from 'react';
import axios from 'axios';

// Configure axios defaults
//axios.defaults.baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
axios.defaults.timeout = 10000;

// Add request interceptor for error handling
axios.interceptors.response.use(
  response => response,
  error => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export const useApi = (url, options = {}) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const { refreshInterval, dependencies = [] } = options;

  const fetchData = async () => {
    if (!url) return;

    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.get(url);
      setData(response.data);
    } catch (err) {
      setError(err);
      console.error(`API fetch error for ${url}:`, err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Set up refresh interval if specified
    let interval;
    if (refreshInterval) {
      interval = setInterval(fetchData, refreshInterval);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [url, ...dependencies]);

  return { 
    data, 
    loading, 
    error, 
    refetch: fetchData 
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