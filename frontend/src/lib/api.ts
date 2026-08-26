const BASE = process.env.EXPO_PUBLIC_BACKEND_URL;

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}/api${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const j = await res.json();
      msg = j.detail || msg;
    } catch (_) {}
    throw new Error(msg);
  }
  if (res.status === 204) return undefined as any;
  return (await res.json()) as T;
}

// Auth
export const authApi = {
  status: () => request<{ is_setup: boolean }>('/auth/status'),
  setup: (pin: string) =>
    request<{ ok: boolean }>('/auth/setup', { method: 'POST', body: JSON.stringify({ pin }) }),
  verify: (pin: string) =>
    request<{ ok: boolean }>('/auth/verify', { method: 'POST', body: JSON.stringify({ pin }) }),
  reset: (pin: string) =>
    request<{ ok: boolean }>('/auth/reset', { method: 'POST', body: JSON.stringify({ pin }) }),
};

export type Physician = { id: string; name: string; code: string; color: string };

export const physicianApi = {
  list: () => request<Physician[]>('/physicians'),
  create: (p: Omit<Physician, 'id'>) =>
    request<Physician>('/physicians', { method: 'POST', body: JSON.stringify(p) }),
  update: (id: string, p: Partial<Omit<Physician, 'id'>>) =>
    request<Physician>(`/physicians/${id}`, { method: 'PATCH', body: JSON.stringify(p) }),
  remove: (id: string) => request<{ ok: boolean }>(`/physicians/${id}`, { method: 'DELETE' }),
};

export type Template = Record<string, string[]>; // "1".."7" -> physicianIds

export const templateApi = {
  get: () => request<{ template: Template }>('/template'),
  put: (template: Template) =>
    request<{ ok: boolean }>('/template', {
      method: 'PUT',
      body: JSON.stringify({ template }),
    }),
};

export type Assignment = { date: string; physician_ids: string[] };

export const assignmentApi = {
  list: (year: number, month: number) =>
    request<Assignment[]>(`/assignments?year=${year}&month=${month}`),
  put: (date: string, ids: string[]) =>
    request<{ ok: boolean }>(`/assignments/${date}`, {
      method: 'PUT',
      body: JSON.stringify({ date, physician_ids: ids }),
    }),
  bulk: (items: Assignment[]) =>
    request<{ ok: boolean; count: number }>('/assignments/bulk', {
      method: 'POST',
      body: JSON.stringify(items),
    }),
};

export type HolidayOverride = { date: string; is_holiday: boolean; label: string };

export const holidayApi = {
  list: (year: number, month: number) =>
    request<HolidayOverride[]>(`/holidays?year=${year}&month=${month}`),
  put: (date: string, is_holiday: boolean, label = 'İdari İzin') =>
    request<{ ok: boolean }>(`/holidays/${date}`, {
      method: 'PUT',
      body: JSON.stringify({ date, is_holiday, label }),
    }),
};
