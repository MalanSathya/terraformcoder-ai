import axios from 'axios';

// API Base URL - Update this to match your backend deployment
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://terraformcoder-ai-dev.up.railway.app';

export const register = async (data) => axios.post(`${API_BASE_URL}/api/auth/register`, data);
export const login = async (data) => axios.post(`${API_BASE_URL}/api/auth/login`, data);

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,

  timeout: 30000, // Increased timeout for AI processing

  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
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

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API calls
export const authAPI = {
  register: async (userData) => {
    try {
      const response = await api.post('/api/auth/register', userData);
      return response;
    } catch (error) {
      throw error;
    }
  },

  login: async (credentials) => {
    try {
      const response = await api.post('/api/auth/login', credentials);
      return response;
    } catch (error) {
      throw error;
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  }
};



// Enhanced code generation service
export const generateCode = (description, provider = 'aws', token = null, includeDiagram = true) => {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  
  return api.post('/api/generate', {
    description,
    provider,
    include_diagram: includeDiagram
  }, { headers });
};


// Get user's generation history
export const getGenerationHistory = async (limit = 10) => {
  try {
    const response = await api.get(`/api/history?limit=${limit}`);
    return response;
  } catch (error) {
    console.error('Error fetching history:', error);
    throw error;
  }
};

// Diagram generation service (for future Phind integration)
export const generateDiagram = (description, resources) => {
  return api.post('/api/generate-diagram', {
    description,
    resources
  });
};





// Health check
export const healthCheck = async () => {
  try {
    const response = await api.get('/health');
    return response;
  } catch (error) {
    console.error('Health check failed:', error);
    throw error;
  }
};

// Utility functions
export const utils = {
  // Check if user is authenticated
  isAuthenticated: () => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    return !!(token && user);
  },

  // Get current user from localStorage
  getCurrentUser: () => {
    try {
      const user = localStorage.getItem('user');
      return user ? JSON.parse(user) : null;
    } catch (error) {
      console.error('Error parsing user data:', error);
      return null;
    }
  },

  // Save user and token to localStorage
  saveAuthData: (user, token) => {
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('token', token);
  },

  // Clear auth data
  clearAuthData: () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  },

  // Format date for display
  formatDate: (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Invalid date';
    }
  },

  // Validate infrastructure description
  validateInfrastructureDescription: (description) => {
    if (!description || description.trim().length < 10) {
      return {
        isValid: false,
        message: 'Description must be at least 10 characters long'
      };
    }

    if (description.trim().length > 1000) {
      return {
        isValid: false,
        message: 'Description must be less than 1000 characters'
      };
    }

    // Check for infrastructure-related keywords
    const infrastructureKeywords = [
      'vm', 'virtual machine', 'ec2', 'instance', 'server', 'compute',
      'vpc', 'network', 'subnet', 'security group', 'firewall',
      'database', 'rds', 'mysql', 'postgresql', 'storage', 's3', 'blob',
      'load balancer', 'alb', 'nlb', 'api gateway', 'lambda', 'function',
      'kubernetes', 'container', 'docker', 'ecs', 'aks', 'gke',
      'terraform', 'infrastructure', 'cloud', 'aws', 'azure', 'gcp',
      'deploy', 'provision', 'create', 'setup', 'configure'
    ];

    const hasInfraKeywords = infrastructureKeywords.some(keyword => 
      description.toLowerCase().includes(keyword)
    );

    if (!hasInfraKeywords) {
      return {
        isValid: false,
        message: 'Please provide a description related to cloud infrastructure (e.g., VPC, EC2, database, etc.)'
      };
    }

    return {
      isValid: true,
      message: 'Valid infrastructure description'
    };
  },

  // Detect cloud provider from description
  detectCloudProvider: (description) => {
    const providers = [];
    const descriptionLower = description.toLowerCase();
    
    if (/aws|amazon|ec2|s3|rds|lambda|cloudformation/.test(descriptionLower)) {
      providers.push('aws');
    }
    if (/azure|microsoft|vm|blob|cosmos|arm template/.test(descriptionLower)) {
      providers.push('azure');
    }
    if (/gcp|google|gce|cloud storage|bigquery|deployment manager/.test(descriptionLower)) {
      providers.push('gcp');
    }
    
    return providers.length > 0 ? providers : ['aws']; // Default to AWS
  },

  // Copy text to clipboard
  copyToClipboard: async (text, successCallback, errorCallback) => {
    try {
      await navigator.clipboard.writeText(text);
      if (successCallback) successCallback();
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      if (errorCallback) errorCallback(error);
    }
  },

  // Download text as file
  downloadAsFile: (content, filename, contentType = 'text/plain') => {
    const blob = new Blob([content], { type: contentType });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }
};

// Export default API instance for custom requests
export default api;


// import axios from 'axios';

// const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://terraformcoder-ai-dev.up.railway.app';

// export const register = async (data) => axios.post(`${API_BASE_URL}/api/auth/register`, data);
// export const login = async (data) => axios.post(`${API_BASE_URL}/api/auth/login`, data);
// export const generateCode = async (description, provider, token) =>
//   axios.post(`${API_BASE_URL}/api/generate`, { description, provider }, {
//     headers: { Authorization: `Bearer ${token}` }
//   });