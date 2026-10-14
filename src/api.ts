import {
  DocumentRecord,
  DocumentVersionRecord,
  StatusHistoryRecord,
  AppSettings,
  ReminderRuleRecord,
  ReminderLogRecord,
  UserProfile,
  GoogleConnectionStatus,
  KpiSummary,
} from './types';

const API_BASE = '/api';

function getToken(): string | null {
  return localStorage.getItem('token');
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers = new Headers(options.headers || {});

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  // Jangan set Content-Type jika body FormData (browser akan auto set boundary)
  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include', // kirim httpOnly cookie
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.message || `Request gagal dengan status ${res.status}`);
  }

  return data;
}

export const api = {
  // Auth
  async login(username: string, password: string): Promise<{ token: string; user: UserProfile }> {
    const res = await request<{ success: boolean; token: string; user: UserProfile }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    localStorage.setItem('token', res.token);
    return res;
  },

  async logout(): Promise<void> {
    try {
      await request('/auth/logout', { method: 'POST' });
    } finally {
      localStorage.removeItem('token');
    }
  },

  async getMe(): Promise<{ user: UserProfile; googleConnection: GoogleConnectionStatus }> {
    return request('/auth/me');
  },

  // Documents
  async getDocuments(params: {
    q?: string;
    status?: string;
    vendor?: string;
    sort?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    data: DocumentRecord[];
    pagination: { page: number; limit: number; totalItems: number; totalPages: number };
    kpi: KpiSummary;
    vendors: string[];
  }> {
    const query = new URLSearchParams();
    if (params.q) query.set('q', params.q);
    if (params.status) query.set('status', params.status);
    if (params.vendor) query.set('vendor', params.vendor);
    if (params.sort) query.set('sort', params.sort);
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));

    return request(`/documents?${query.toString()}`);
  },

  async getDocumentDetail(id: string): Promise<{
    data: {
      document: DocumentRecord;
      versions: DocumentVersionRecord[];
      history: StatusHistoryRecord[];
    };
  }> {
    return request(`/documents/${id}`);
  },

  async createDocument(formData: FormData): Promise<{ data: DocumentRecord; message: string }> {
    return request('/documents', {
      method: 'POST',
      body: formData,
    });
  },

  async updateDocument(
    id: string,
    payload: Partial<Pick<DocumentRecord, 'vendor' | 'wa_vendor' | 'judul' | 'deadline' | 'catatan'>>
  ): Promise<{ data: DocumentRecord; message: string }> {
    return request(`/documents/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  async deleteDocument(id: string): Promise<{ message: string }> {
    return request(`/documents/${id}`, {
      method: 'DELETE',
    });
  },

  async changeStatus(
    id: string,
    status: string,
    catatan: string
  ): Promise<{ data: DocumentRecord; message: string }> {
    return request(`/documents/${id}/status`, {
      method: 'POST',
      body: JSON.stringify({ status, catatan }),
    });
  },

  async uploadNewVersion(
    id: string,
    formData: FormData
  ): Promise<{ data: DocumentRecord; message: string }> {
    return request(`/documents/${id}/version`, {
      method: 'POST',
      body: formData,
    });
  },

  // Settings
  async getSettings(): Promise<{
    data: {
      settings: AppSettings;
      reminderRules: ReminderRuleRecord[];
      googleConnection: GoogleConnectionStatus;
    };
  }> {
    return request('/settings');
  },

  async updateSettings(payload: {
    settings?: Partial<AppSettings>;
    reminderRules?: ReminderRuleRecord[];
  }): Promise<{
    message: string;
    data: {
      settings: AppSettings;
      reminderRules: ReminderRuleRecord[];
    };
  }> {
    return request('/settings', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  // Reminders & WhatsApp
  async testSendWhatsApp(phone: string, message: string): Promise<{ message: string }> {
    return request('/reminders/test-send', {
      method: 'POST',
      body: JSON.stringify({ phone, message }),
    });
  },

  async sendNowWhatsApp(
    documentId: string,
    customMessage?: string
  ): Promise<{ message: string; data: { sent: number; total: number; message: string } }> {
    return request(`/reminders/${documentId}/send-now`, {
      method: 'POST',
      body: JSON.stringify({ customMessage }),
    });
  },

  // Logs
  async getLogs(params: { status?: string; q?: string; limit?: number }): Promise<{
    data: ReminderLogRecord[];
    total: number;
  }> {
    const query = new URLSearchParams();
    if (params.status) query.set('status', params.status);
    if (params.q) query.set('q', params.q);
    if (params.limit) query.set('limit', String(params.limit));

    return request(`/logs?${query.toString()}`);
  },
};
