'use client';

import { useEffect, useState } from 'react';
import { Coins, Zap, Crown, Diamond, CreditCard, History, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface Transaction {
  id: string;
  type: 'recharge' | 'consume';
  amount: number;
  balance_after: number;
  description: string;
  model?: string;
  created_at: string;
}

interface PricingConfig {
  model_key: string;
  model_name: string;
  category: string;
  cost_per_call: number;
}

const RECHARGE_PACKAGES = [
  { amount: 10, bonus: 0, label: '入门', icon: Zap },
  { amount: 50, bonus: 5, label: '标准', icon: Coins, popular: true },
  { amount: 200, bonus: 30, label: '专业', icon: Crown },
  { amount: 500, bonus: 100, label: '企业', icon: Diamond },
];

export default function CreditsPage() {
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [pricing, setPricing] = useState<PricingConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [recharging, setRecharging] = useState(false);

  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') || 'dev-token' : 'dev-token';

  const fetchData = async () => {
    try {
      setLoading(true);
      const [balanceRes, txRes, pricingRes] = await Promise.all([
        fetch('/api/credits', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/credits/transactions?limit=20', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/credits/pricing'),
      ]);

      const balanceData = await balanceRes.json();
      const txData = await txRes.json();
      const pricingData = await pricingRes.json();

      if (balanceData.success) setBalance(balanceData.data.balance ?? 0);
      if (txData.success) setTransactions(txData.data ?? []);
      if (pricingData.success) setPricing(pricingData.data ?? []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRecharge = async (amount: number) => {
    try {
      setRecharging(true);
      const res = await fetch('/api/credits/recharge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ amount }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`充值成功！获得 ${amount} 积分`);
        fetchData();
      } else {
        alert(data.error || '充值失败');
      }
    } catch {
      alert('充值失败');
    } finally {
      setRecharging(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const categoryLabels: Record<string, string> = {
    image: '图像生成',
    video: '视频生成',
    '3d': '3D生成',
    edit: '图像编辑',
    text: '文本生成',
  };

  return (
    <div className="min-h-[calc(100vh-3.5rem)] p-6">
      {/* 返回个人中心 */}
      <div className="max-w-5xl mx-auto mb-4">
        <Link
          href="/settings"
          className="inline-flex items-center gap-2 text-sm text-[#888888] hover:text-[#0ABAB5] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          返回个人中心
        </Link>
      </div>
      <div className="max-w-5xl mx-auto space-y-8">
        {/* 余额卡片 */}
        <div className="relative overflow-hidden rounded-2xl bg-[#141414] border border-[#333333]/30 p-8">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#0ABAB5]/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="relative z-10">
            <div className="text-sm text-[#888888] mb-2">当前积分余额</div>
            <div className="text-5xl font-bold text-[#F5F5F5] mb-4">
              {balance.toFixed(0)}
              <span className="text-lg font-normal text-[#888888] ml-2">积分</span>
            </div>
            <div className="flex gap-2">
              <span className="text-xs text-[#0ABAB5] bg-[#0ABAB5]/10 px-2 py-1 rounded">
                可用于所有AI生成功能
              </span>
            </div>
          </div>
        </div>

        {/* 充值套餐 */}
        <div>
          <h2 className="text-lg font-semibold text-[#F5F5F5] mb-4 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-[#0ABAB5]" />
            充值套餐
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {RECHARGE_PACKAGES.map((pkg) => {
              const Icon = pkg.icon;
              const total = pkg.amount + pkg.bonus;
              return (
                <div
                  key={pkg.amount}
                  className={`relative rounded-xl border p-5 transition-all hover:scale-[1.02] ${
                    pkg.popular
                      ? 'border-[#0ABAB5]/50 bg-[#0ABAB5]/5'
                      : 'border-[#333333]/30 bg-[#141414]'
                  }`}
                >
                  {pkg.popular && (
                    <span className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-[#0ABAB5] text-black text-[10px] font-bold rounded-full">
                      最受欢迎
                    </span>
                  )}
                  <div className="flex items-center gap-2 mb-3">
                    <Icon className="w-5 h-5 text-[#0ABAB5]" />
                    <span className="text-sm font-medium text-[#F5F5F5]">{pkg.label}</span>
                  </div>
                  <div className="text-3xl font-bold text-[#F5F5F5] mb-1">
                    {pkg.amount}
                    <span className="text-sm font-normal text-[#888888]"> 积分</span>
                  </div>
                  {pkg.bonus > 0 && (
                    <div className="text-xs text-[#0ABAB5] mb-3">
                      + 赠送 {pkg.bonus} 积分 = 共 {total} 积分
                    </div>
                  )}
                  <button
                    onClick={() => handleRecharge(pkg.amount)}
                    disabled={recharging}
                    className="w-full mt-2 py-2 rounded-lg bg-[#0ABAB5] text-black font-medium text-sm hover:bg-[#0ABAB5]/80 transition-colors disabled:opacity-50"
                  >
                    {recharging ? '处理中...' : '立即充值'}
                  </button>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-[#888888] mt-3 text-center">
            以上为演示充值，实际运营中需接入微信支付/支付宝等支付通道
          </p>
        </div>

        {/* 定价说明 */}
        <div>
          <h2 className="text-lg font-semibold text-[#F5F5F5] mb-4">功能定价</h2>
          <div className="rounded-xl border border-[#333333]/30 bg-[#141414] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#333333]/30">
                    <th className="text-left px-4 py-3 text-[#888888] font-medium">功能分类</th>
                    <th className="text-left px-4 py-3 text-[#888888] font-medium">模型</th>
                    <th className="text-right px-4 py-3 text-[#888888] font-medium">每次消耗</th>
                  </tr>
                </thead>
                <tbody>
                  {pricing.map((p) => (
                    <tr key={p.model_key} className="border-b border-[#333333]/20 last:border-0">
                      <td className="px-4 py-3 text-[#F5F5F5]">
                        {categoryLabels[p.category] || p.category}
                      </td>
                      <td className="px-4 py-3 text-[#F5F5F5]">{p.model_name}</td>
                      <td className="px-4 py-3 text-right text-[#0ABAB5] font-medium">
                        {p.cost_per_call} 积分
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* 交易记录 */}
        <div>
          <h2 className="text-lg font-semibold text-[#F5F5F5] mb-4 flex items-center gap-2">
            <History className="w-5 h-5 text-[#0ABAB5]" />
            交易记录
          </h2>
          <div className="rounded-xl border border-[#333333]/30 bg-[#141414] overflow-hidden">
            {transactions.length === 0 ? (
              <div className="p-8 text-center text-[#888888]">暂无交易记录</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#333333]/30">
                      <th className="text-left px-4 py-3 text-[#888888] font-medium">类型</th>
                      <th className="text-left px-4 py-3 text-[#888888] font-medium">描述</th>
                      <th className="text-right px-4 py-3 text-[#888888] font-medium">变动</th>
                      <th className="text-right px-4 py-3 text-[#888888] font-medium">余额</th>
                      <th className="text-right px-4 py-3 text-[#888888] font-medium">时间</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((tx) => (
                      <tr key={tx.id} className="border-b border-[#333333]/20 last:border-0">
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                              tx.type === 'recharge'
                                ? 'bg-green-500/10 text-green-400'
                                : 'bg-red-500/10 text-red-400'
                            }`}
                          >
                            {tx.type === 'recharge' ? '充值' : '消费'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[#F5F5F5]">{tx.description}</td>
                        <td
                          className={`px-4 py-3 text-right font-medium ${
                            tx.type === 'recharge' ? 'text-green-400' : 'text-red-400'
                          }`}
                        >
                          {tx.type === 'recharge' ? '+' : ''}
                          {tx.amount}
                        </td>
                        <td className="px-4 py-3 text-right text-[#888888]">
                          {tx.balance_after}
                        </td>
                        <td className="px-4 py-3 text-right text-[#888888] text-xs">
                          {formatDate(tx.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
