const API_BASE_URL = `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api`;

class ApiService {
  // Auth endpoints
  static async register(userData) {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Registration failed');
    }
    
    return data;
  }

  static async login(credentials) {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Login failed');
    }
    
    return data;
  }

  // Company endpoints
  static async getCompanies() {
    const response = await fetch(`${API_BASE_URL}/companies`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch companies');
    }
    
    return response.json();
  }

  static async createCompany(companyData, token) {
    const response = await fetch(`${API_BASE_URL}/companies`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(companyData),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to create company');
    }
    
    return data;
  }

  static async seedCompanies() {
    const response = await fetch(`${API_BASE_URL}/companies/seed`, {
      method: 'POST',
    });
    
    return response.json();
  }

  // Message endpoints
  static async getMessages(companyId) {
    const response = await fetch(`${API_BASE_URL}/messages/${companyId}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch messages');
    }
    
    return response.json();
  }

  static async sendMessage(messageData, token) {
    const response = await fetch(`${API_BASE_URL}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(messageData),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to send message');
    }
    
    return data;
  }

  // Test endpoint
  static async testConnection() {
    try {
      const response = await fetch(`${API_BASE_URL}/test`);
      return response.json();
    } catch (error) {
      throw new Error('Backend connection failed');
    }
  }
}

export default ApiService;
