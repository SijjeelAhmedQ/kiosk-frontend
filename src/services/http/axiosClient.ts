import axios, { AxiosError, type AxiosInstance } from 'axios';
import type { ApiError } from '@/types';

const baseURL = (import.meta.env.VITE_API_BASE_URL as string) ?? '/api/v1';

export const axiosClient: AxiosInstance = axios.create({
  baseURL,
  timeout: 12000,
  headers: { 'Content-Type': 'application/json' },
});

// --- Request interceptor: attach Friends Kitchen/session headers ---
axiosClient.interceptors.request.use((config) => {
  config.headers.set('X-Terminal-Id', 'terminal-01');
  return config;
});

// --- Response interceptor: normalize errors to ApiError ---
axiosClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ code?: string; message?: string }>) => {
    const normalized: ApiError = {
      status: error.response?.status ?? 0,
      code: error.response?.data?.code ?? error.code ?? 'NETWORK_ERROR',
      message: error.response?.data?.message ?? error.message ?? 'Something went wrong',
    };
    return Promise.reject(normalized);
  },
);
