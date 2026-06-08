import { redirect } from 'next/navigation';

/**
 * /scripts/[id]/chat 页面
 * AI 对话创作视图 - 重定向到主页面 chat 视图
 */
export default function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  // 服务端重定向到主页面并带上 view 参数
  const redirectPage = async () => {
    const { id } = await params;
    redirect(`/scripts/${id}?view=chat`);
  };
  
  return redirectPage();
}
