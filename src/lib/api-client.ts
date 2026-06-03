export function apiFetch(input: string | URL | Request, init?: RequestInit) {
  const session = typeof window !== "undefined" ? localStorage.getItem("nvwa_session") : null;
  let token = "";
  if (session) {
    try {
      const parsed = JSON.parse(session);
      token = parsed?.access_token || "";
    } catch (err) {
      console.error("解析session失败:", err);
    }
  }
  const headers: Record<string, string> = {
    ...(init?.headers as Record<string, string>),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const promise = fetch(input, { ...init, headers });
  promise.then((res) => {
    if (res.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("nvwa_session");
      window.location.href = "/login";
    }
  }).catch((err) => {
    console.error("API请求失败:", err);
  });
  return promise;
}
