import { redirect } from 'next/navigation';

/**
 * /scripts/[id]/storyboard 页面
 * 分镜脚本视图 - 重定向到主页面 storyboard 视图
 */
export default function StoryboardPage({ params }: { params: Promise<{ id: string }> }) {
  const redirectPage = async () => {
    const { id } = await params;
    redirect(`/scripts/${id}?view=storyboard`);
  };
  
  return redirectPage();
}
