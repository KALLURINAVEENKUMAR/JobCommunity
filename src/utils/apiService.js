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
    
    // Store the token separately for easy access
    if (data.token) {
      localStorage.setItem('token', data.token);
    }
    
    return data;
  }

  static logout() {
    // Clear token from localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('userData');
    localStorage.removeItem('keepLoggedIn');
  }

  // Get all users for mentions
  static async getAllUsers(token) {
    const response = await fetch(`${API_BASE_URL}/auth/users`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch users');
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

  static async sendMessage(messageData) {
    const token = this.getToken();
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

  static async sendGroupMessage(messageData) {
    const token = this.getToken();
    const response = await fetch(`${API_BASE_URL}/groups/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(messageData),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to send group message');
    }
    
    return data;
  }

  static async clearMessages(companyId) {
    const token = this.getToken();
    const response = await fetch(`${API_BASE_URL}/messages/${companyId}/clear`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to clear messages');
    }
    return response.json();
  }

  static async clearGroupMessages(groupId) {
    const token = this.getToken();
    const response = await fetch(`${API_BASE_URL}/groups/${groupId}/messages/clear`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to clear group messages');
    }
    return response.json();
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

  // Group Management APIs
  static async createGroup(groupData) {
    const token = this.getToken();
    const response = await fetch(`${API_BASE_URL}/groups`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(groupData),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Failed to create group');
    }
    return data;
  }

  static async getUserGroups() {
    const token = this.getToken();
    const response = await fetch(`${API_BASE_URL}/groups/user`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch user groups');
    }
    return response.json();
  }

  static async getGroup(groupId) {
    const token = this.getToken();
    const response = await fetch(`${API_BASE_URL}/groups/${groupId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch group');
    }
    return response.json();
  }

  static async getGroupMessages(groupId) {
    const token = this.getToken();
    const response = await fetch(`${API_BASE_URL}/groups/${groupId}/messages`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch group messages');
    }
    return response.json();
  }

  static async sendGroupMessage(groupId, messageData) {
    const token = this.getToken();
    const response = await fetch(`${API_BASE_URL}/groups/${groupId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(messageData),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Failed to send group message');
    }
    return data;
  }

  static async updateGroupName(groupId, newName) {
    const token = this.getToken();
    const response = await fetch(`${API_BASE_URL}/groups/${groupId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ name: newName }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Failed to update group name');
    }
    return data;
  }

  static async addGroupMembers(groupId, members) {
    const token = this.getToken();
    const response = await fetch(`${API_BASE_URL}/groups/${groupId}/members`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ members }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Failed to add group members');
    }
    return data;
  }

  static async leaveGroup(groupId) {
    const token = this.getToken();
    const response = await fetch(`${API_BASE_URL}/groups/${groupId}/leave`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Failed to leave group');
    }
    return data;
  }

  // Helper method to get token from localStorage
  static getToken() {
    // First try to get token directly
    const token = localStorage.getItem('token');
    if (token) {
      return token;
    }
    
    // If not found, try to get it from userData
    const userData = localStorage.getItem('userData');
    if (userData) {
      try {
        const user = JSON.parse(userData);
        return user.token;
      } catch (error) {
        console.error('Error parsing userData from localStorage:', error);
        return null;
      }
    }
    
    return null;
  }
}

export default ApiService;
