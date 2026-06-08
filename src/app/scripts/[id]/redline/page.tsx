import { redirect } from 'next/navigation';

/**
 * /scripts/[id]/redline 页面
 * 修改痕迹视图 - 重定向到主页面 redline 视图
 */
export default function RedlinePage({ params }: { params: Promise<{ id: string }> }) {
  const redirectPage = async () => {
    const { id } = await params;
    redirect(`/scripts/${id}?view=redline`);
  };
  
  return redirectPage();
}
