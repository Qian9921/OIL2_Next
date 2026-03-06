export const MONITOR_SESSION_COOKIE_NAME = 'oil_monitor_session';

interface MonitorAuthStatus {
  authenticated: boolean;
  configured: boolean;
  message?: string;
}

export const loginToMonitor = async (
  username: string,
  password: string,
): Promise<MonitorAuthStatus> => {
  const response = await fetch('/api/admin/monitor-auth', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username, password }),
  });

  const data = (await response.json()) as MonitorAuthStatus;

  if (!response.ok) {
    return {
      authenticated: false,
      configured: data.configured ?? true,
      message: data.message ?? 'Authentication failed.',
    };
  }

  return data;
};

export const getMonitorAuthStatus = async (): Promise<MonitorAuthStatus> => {
  try {
    const response = await fetch('/api/admin/monitor-auth', {
      method: 'GET',
      cache: 'no-store',
    });

    if (!response.ok) {
      return {
        authenticated: false,
        configured: true,
        message: 'Unable to verify monitor session.',
      };
    }

    return (await response.json()) as MonitorAuthStatus;
  } catch {
    return {
      authenticated: false,
      configured: true,
      message: 'Unable to verify monitor session.',
    };
  }
};

export const isMonitorAuthenticated = async (): Promise<boolean> => {
  const status = await getMonitorAuthStatus();
  return status.authenticated;
};

export const logoutFromMonitor = async (): Promise<void> => {
  await fetch('/api/admin/monitor-auth', {
    method: 'DELETE',
  });
};
