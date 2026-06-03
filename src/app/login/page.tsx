"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export default function LoginPage() {
  const router = useRouter();
  const { login, register } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "register">("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await register(email, password);
      }
      router.push("/dashboard");
      router.refresh();
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "操作失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#141414] border border-[#333333]/50 rounded-2xl p-8 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-[#F5F5F5]">
            {mode === "login" ? "欢迎回来" : "创建账号"}
          </h1>
          <p className="text-sm text-[#888888]">
            {mode === "login" ? "登录 NVWA 女娲平台" : "注册 NVWA 女娲平台"}
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-[#888888] mb-1.5">邮箱</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full px-4 py-2.5 bg-[#1A1A1A] border border-[#333333]/50 rounded-lg text-[#F5F5F5] placeholder:text-[#666666] focus:outline-none focus:border-[#0ABAB5]/50 transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm text-[#888888] mb-1.5">密码</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="至少6位字符"
              className="w-full px-4 py-2.5 bg-[#1A1A1A] border border-[#333333]/50 rounded-lg text-[#F5F5F5] placeholder:text-[#666666] focus:outline-none focus:border-[#0ABAB5]/50 transition-colors"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-[#0ABAB5] text-black font-medium rounded-lg hover:shadow-[0_0_16px_rgba(10,186,181,0.3)] transition-all disabled:opacity-50"
          >
            {loading ? "处理中..." : mode === "login" ? "登录" : "注册"}
          </button>
        </form>

        <div className="text-center text-sm text-[#888888]">
          {mode === "login" ? (
            <>
              还没有账号？
              <button
                onClick={() => setMode("register")}
                className="text-[#0ABAB5] hover:underline ml-1"
              >
                立即注册
              </button>
            </>
          ) : (
            <>
              已有账号？
              <button
                onClick={() => setMode("login")}
                className="text-[#0ABAB5] hover:underline ml-1"
              >
                直接登录
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
