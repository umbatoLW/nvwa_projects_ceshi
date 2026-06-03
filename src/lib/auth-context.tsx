"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

interface User {
  id: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
});

// 开发模式：绕过登录检查
const BYPASS_AUTH = true;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 开发模式：自动创建模拟用户
    if (BYPASS_AUTH) {
      const devUser = { id: "dev-user", email: "dev@example.com" };
      setUser(devUser);
      localStorage.setItem(
        "nvwa_session",
        JSON.stringify({ user: devUser, access_token: "dev-token" })
      );
      setLoading(false);
      return;
    }

    // 检查本地存储的 session
    let cachedToken: string | undefined;
    const session = localStorage.getItem("nvwa_session");
    if (session) {
      try {
        const parsed = JSON.parse(session);
        if (parsed?.user) {
          setUser(parsed.user);
        }
        cachedToken = parsed?.access_token;
      } catch {
        localStorage.removeItem("nvwa_session");
      }
    }
    // 同时向后端验证
    fetch("/api/auth/me", { headers: getAuthHeaders() })
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.data) {
          const u = { id: data.data.id, email: data.data.email || "" };
          setUser(u);
          localStorage.setItem(
            "nvwa_session",
            JSON.stringify({ user: u, access_token: cachedToken })
          );
        } else {
          localStorage.removeItem("nvwa_session");
          setUser(null);
        }
      })
      .catch(() => {
        localStorage.removeItem("nvwa_session");
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || "登录失败");
    const u = { id: data.data.user.id, email: data.data.user.email || "" };
    setUser(u);
    localStorage.setItem(
      "nvwa_session",
      JSON.stringify({
        user: u,
        access_token: data.data.session?.access_token,
      })
    );
  };

  const register = async (email: string, password: string) => {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || "注册失败");
    const u = { id: data.data.user.id, email: data.data.user.email || "" };
    setUser(u);
    localStorage.setItem(
      "nvwa_session",
      JSON.stringify({
        user: u,
        access_token: data.data.session?.access_token,
      })
    );
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    localStorage.removeItem("nvwa_session");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export function getAuthHeaders(): Record<string, string> {
  // 开发模式：返回开发 token
  if (BYPASS_AUTH) {
    return { Authorization: "Bearer dev-token" };
  }
  
  const session = localStorage.getItem("nvwa_session");
  if (!session) return {};
  try {
    const parsed = JSON.parse(session);
    if (parsed?.access_token) {
      return { Authorization: `Bearer ${parsed.access_token}` };
    }
  } catch {
    // ignore
  }
  return {};
}
