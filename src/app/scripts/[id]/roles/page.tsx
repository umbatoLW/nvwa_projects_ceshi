import { redirect } from 'next/navigation';

/**
 * /scripts/[id]/roles 页面
 * 角色设定视图 - 重定向到主页面 roles 视图
 */
export default function RolesPage({ params }: { params: Promise<{ id: string }> }) {
  const redirectPage = async () => {
    const { id } = await params;
    redirect(`/scripts/${id}?view=roles`);
  };
  
  return redirectPage();
}
