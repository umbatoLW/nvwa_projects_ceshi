import { redirect } from 'next/navigation';

/**
 * /scripts/[id]/assets 页面
 * 资产库视图 - 重定向到主页面 assets 视图
 */
export default function AssetsPage({ params }: { params: Promise<{ id: string }> }) {
  const redirectPage = async () => {
    const { id } = await params;
    redirect(`/scripts/${id}?view=assets`);
  };
  
  return redirectPage();
}
