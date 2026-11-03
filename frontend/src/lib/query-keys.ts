export const queryKeys = {
  auth: {
    user: ['auth', 'user'] as const,
  },
  dashboard: {
    summary: (filters?: unknown) => ['dashboard', 'summary', filters] as const,
    sales: (filters?: unknown) => ['dashboard', 'sales', filters] as const,
    leads: (filters?: unknown) => ['dashboard', 'leads', filters] as const,
    agents: (filters?: unknown) => ['dashboard', 'agents', filters] as const,
  },
  properties: {
    all: ['properties'] as const,
    list: (filters?: unknown) => ['properties', 'list', filters] as const,
    detail: (id: string) => ['properties', 'detail', id] as const,
  },
  clients: {
    all: ['clients'] as const,
    list: (filters?: unknown) => ['clients', 'list', filters] as const,
    detail: (id: string) => ['clients', 'detail', id] as const,
  },
  leads: {
    all: ['leads'] as const,
    list: (filters?: unknown) => ['leads', 'list', filters] as const,
    detail: (id: string) => ['leads', 'detail', id] as const,
  },
  visits: {
    all: ['visits'] as const,
    list: (filters?: unknown) => ['visits', 'list', filters] as const,
    detail: (id: string) => ['visits', 'detail', id] as const,
  },
  owners: {
    all: ['owners'] as const,
    options: ['owners', 'options'] as const,
    list: (filters?: unknown) => ['owners', 'list', filters] as const,
    detail: (id: string) => ['owners', 'detail', id] as const,
  },
  agents: {
    all: ['agents'] as const,
    options: ['agents', 'options'] as const,
    list: (filters?: unknown) => ['agents', 'list', filters] as const,
    detail: (id: string) => ['agents', 'detail', id] as const,
  },
  transactions: {
    all: ['transactions'] as const,
    list: (filters?: unknown) => ['transactions', 'list', filters] as const,
  },
  cash: {
    all: ['cash'] as const,
    access: ['cash', 'access'] as const,
    day: (date: string) => ['cash', 'day', date] as const,
    summary: (from: string, to: string) => ['cash', 'summary', from, to] as const,
    visits: (date: string) => ['cash', 'visits', date] as const,
  },
  notifications: {
    all: ['notifications'] as const,
    list: (params?: unknown) => ['notifications', 'list', params] as const,
    unreadCount: ['notifications', 'unread-count'] as const,
  },
} as const;