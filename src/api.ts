/**
 * API Utility for DormPulse
 * Connects the React Frontend to the Python (FastAPI) Backend
 */

const API_URL = import.meta.env.VITE_API_URL || "/api";

export const api = {
  // Housing Units
  async getUnits() {
    const res = await fetch(`${API_URL}/units`);
    if (!res.ok) throw new Error("Failed to fetch units");
    return res.json();
  },

  async createUnit(unit: any) {
    const res = await fetch(`${API_URL}/units`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(unit),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to create unit");
    }
    return res.json();
  },

  async updateUnit(id: string, unit: any) {
    const res = await fetch(`${API_URL}/units/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(unit),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to update unit");
    }
    return res.json();
  },

  async deleteUnit(id: string) {
    const res = await fetch(`${API_URL}/units/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("Failed to delete unit");
    return res.json();
  },

  // User Management
  async getUsers() {
    const res = await fetch(`${API_URL}/users`);
    if (!res.ok) throw new Error("Failed to fetch users");
    return res.json();
  },

  async updateUserRole(id: string, role: string) {
    const res = await fetch(`${API_URL}/users/${id}/role`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    if (!res.ok) throw new Error("Failed to update user role");
    return res.json();
  },

  async deleteUser(id: string) {
    const res = await fetch(`${API_URL}/users/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("Failed to delete user");
    return res.json();
  },

  async login(credentials: any) {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(credentials),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Invalid credentials");
    }
    return res.json();
  },

  async signup(data: any) {
    const res = await fetch(`${API_URL}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Signup failed");
    }
    return res.json();
  },

  async forgotPassword(email: string) {
    const res = await fetch(`${API_URL}/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to process request");
    }
    return res.json();
  },

  async resetPassword(data: { email: string, token: string, newPassword: string }) {
    const res = await fetch(`${API_URL}/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to reset password");
    }
    return res.json();
  },

  async updateUser(id: string, data: any) {
    const res = await fetch(`${API_URL}/users/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to update profile");
    return res.json();
  },

  // Audit Logs
  async getAuditLogs() {
    const res = await fetch(`${API_URL}/audit`);
    if (!res.ok) throw new Error("Failed to fetch audit logs");
    return res.json();
  },

  async logAction(action: { user_id?: string, user_email?: string, action: string, details?: string }) {
    try {
      await fetch(`${API_URL}/audit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action),
      });
    } catch (e) {
      console.error("Audit log failed", e);
    }
  },

  // Favorites
  async getFavorites(userId: string) {
    const res = await fetch(`${API_URL}/favorites/${userId}`);
    if (!res.ok) throw new Error("Failed to fetch favorites");
    return res.json();
  },

  async addFavorite(userId: string, unitId: string) {
    const res = await fetch(`${API_URL}/favorites`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, unit_id: unitId }),
    });
    if (!res.ok) throw new Error("Failed to add to favorites");
    return res.json();
  },

  async removeFavorite(userId: string, unitId: string) {
    const res = await fetch(`${API_URL}/favorites/${userId}/${unitId}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("Failed to remove from favorites");
    return res.json();
  }
};
