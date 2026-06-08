import { redirect } from 'next/navigation';

/**
 * /scripts/[id]/optimize 页面
 * AI 优化视图 - 重定向到主页面 optimize 视图
 */
export default function OptimizePage({ params }: { params: Promise<{ id: string }> }) {
  const redirectPage = async () => {
    const { id } = await params;
    redirect(`/scripts/${id}?view=optimize`);
  };
  
  return redirectPage();
}
