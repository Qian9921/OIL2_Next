// 监控系统认证工具
export const MONITOR_CREDENTIALS = {
  username: "admin",
  password: "monitor123"
};

export const MONITOR_SESSION_KEY = "monitor_session";

export const loginToMonitor = (username: string, password: string): boolean => {
  if (username === MONITOR_CREDENTIALS.username && password === MONITOR_CREDENTIALS.password) {
    localStorage.setItem(MONITOR_SESSION_KEY, "authenticated");
    return true;
  }
  return false;
};

export const isMonitorAuthenticated = (): boolean => {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(MONITOR_SESSION_KEY) === "authenticated";
};

export const logoutFromMonitor = (): void => {
  localStorage.removeItem(MONITOR_SESSION_KEY);
}; 