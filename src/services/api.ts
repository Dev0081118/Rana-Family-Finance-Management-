import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api/v1';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear token and redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth services
export const authService = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  register: (name: string, email: string, password: string, role?: 'admin' | 'member') =>
    api.post('/auth/register', { name, email, password, role }),
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },
  getCurrentUser: () => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },
};

// Income services
export const incomeService = {
  getAll: (params?: { page?: number; limit?: number; category?: string; startDate?: string; endDate?: string; sortBy?: string; sortOrder?: string }) =>
    api.get('/income', { params }),
  getById: (id: string) => api.get(`/income/${id}`),
  create: (data: {
    amount: number;
    category: string;
    date?: string;
    description?: string;
  }) => api.post('/income', data),
  update: (id: string, data: {
    amount: number;
    category: string;
    date?: string;
    description?: string;
  }) => api.put(`/income/${id}`, data),
  delete: (id: string) => api.delete(`/income/${id}`),
  getSummary: () => api.get('/income/summary'),
};

// Expense services
export const expenseService = {
  getAll: (params?: { page?: number; limit?: number; category?: string; startDate?: string; endDate?: string; sortBy?: string; sortOrder?: string }) =>
    api.get('/expenses', { params }),
  getById: (id: string) => api.get(`/expenses/${id}`),
  create: (data: {
    amount: number;
    category: string;
    date?: string;
    description?: string;
  }) => api.post('/expenses', data),
  update: (id: string, data: {
    amount: number;
    category: string;
    date?: string;
    description?: string;
  }) => api.put(`/expenses/${id}`, data),
  delete: (id: string) => api.delete(`/expenses/${id}`),
  getSummary: () => api.get('/expenses/summary'),
};

// Savings services
export const savingsService = {
  getAll: (params?: { page?: number; limit?: number; type?: string; startDate?: string; endDate?: string; sortBy?: string; sortOrder?: string }) =>
    api.get('/savings', { params }),
  getById: (id: string) => api.get(`/savings/${id}`),
  create: (data: {
    type: 'deposit' | 'withdraw';
    amount: number;
    date?: string;
    note?: string;
  }) => api.post('/savings', data),
  update: (id: string, data: {
    type: 'deposit' | 'withdraw';
    amount: number;
    date?: string;
    note?: string;
  }) => api.put(`/savings/${id}`, data),
  delete: (id: string) => api.delete(`/savings/${id}`),
  getSummary: () => api.get('/savings/summary'),
};

// Investment services
export const investmentService = {
  getAll: (params?: { page?: number; limit?: number; assetType?: string; minValue?: number; maxValue?: number; sortBy?: string; sortOrder?: string }) =>
    api.get('/investments', { params }),
  getById: (id: string) => api.get(`/investments/${id}`),
  create: (data: {
    assetName: string;
    assetType: string;
    investedAmount: number;
    currentValue: number;
    purchaseDate?: string;
  }) => api.post('/investments', data),
  update: (id: string, data: {
    assetName: string;
    assetType: string;
    investedAmount: number;
    currentValue: number;
    purchaseDate?: string;
  }) => api.put(`/investments/${id}`, data),
  delete: (id: string) => api.delete(`/investments/${id}`),
  getSummary: () => api.get('/investments/summary'),
};

export default api;
