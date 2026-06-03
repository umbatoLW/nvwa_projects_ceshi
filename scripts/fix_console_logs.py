import re

with open('src/app/scripts/[id]/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace console.log in handleSaveScript success path
content = content.replace(
    '        console.log("保存成功");',
    '        toast.success("保存成功");'
)
content = content.replace(
    '        console.log(data.error || "保存失败");',
    '        toast.error(data.error || "保存失败");'
)
content = content.replace(
    '      console.log("保存失败");',
    '      toast.error("保存失败");'
)

# Replace handleFileUpload console.log
content = content.replace(
    '      console.log("目前仅支持 .txt / .md / .docx / .pdf 格式文件");',
    '      toast.error("目前仅支持 .txt / .md / .docx / .pdf 格式文件");'
)
content = content.replace(
    '      console.log(err instanceof Error ? err.message : "文件读取失败");',
    '      toast.error(err instanceof Error ? err.message : "文件读取失败");'
)

# Replace handleImportContent console.log
content = content.replace(
    '      console.log("剧本内容已导入并保存");',
    '      toast.success("剧本内容已导入并保存");'
)
content = content.replace(
    '      console.log("内容已加载到编辑器，但保存失败，请点击保存按钮手动保存");',
    '      toast.error("内容已加载到编辑器，但保存失败，请点击保存按钮手动保存");'
)

# Replace handleSplitScenes console.log
content = content.replace(
    '    if (!script?.content) return console.log("剧本内容为空，无法拆分");',
    '    if (!script?.content) { toast.error("剧本内容为空，无法拆分"); return; }'
)
content = content.replace(
    '        console.log(`成功拆分出 ${scenes.length} 个分镜`);',
    '        toast.success(`成功拆分出 ${scenes.length} 个分镜`);'
)
content = content.replace(
    '        console.log("分镜拆分失败");',
    '        toast.error("分镜拆分失败");'
)
content = content.replace(
    '      console.log("分镜拆分失败");',
    '      toast.error("分镜拆分失败");'
)

# Replace handleExtractRoles console.log
content = content.replace(
    '    if (!script?.content) return console.log("剧本内容为空，无法提取角色");',
    '    if (!script?.content) { toast.error("剧本内容为空，无法提取角色"); return; }'
)
content = content.replace(
    '        console.log(`成功提取 ${roles.length} 个角色`);',
    '        toast.success(`成功提取 ${roles.length} 个角色`);'
)
content = content.replace(
    '        console.log("角色提取失败");',
    '        toast.error("角色提取失败");'
)
content = content.replace(
    '      console.log("角色提取失败");',
    '      toast.error("角色提取失败");'
)

# Replace handleOptimize console.log
content = content.replace(
    '    if (!content) return console.log("剧本内容为空");',
    '    if (!content) { toast.error("剧本内容为空"); return; }'
)
content = content.replace(
    '        console.log("已优化剧本内容");',
    '        toast.success("已优化剧本内容");'
)
content = content.replace(
    '      console.log("优化失败");',
    '      toast.error("优化失败");'
)

# Replace handleComplianceCheck console.log
content = content.replace(
    '    if (!content) return console.log("剧本内容为空");',
    '    if (!content) { toast.error("剧本内容为空"); return; }'
)
content = content.replace(
    '        console.log(data.error || "检测失败");',
    '        toast.error(data.error || "检测失败");'
)
content = content.replace(
    '      console.log("检测失败");',
    '      toast.error("检测失败");'
)

# Replace handleExtractOutline console.log
content = content.replace(
    '    if (!editContent) return console.log("剧本内容为空");',
    '    if (!editContent) { toast.error("剧本内容为空"); return; }'
)

# Replace handleExtractCostumes console.log
content = content.replace(
    '    if (!editContent) return console.log("剧本内容为空");',
    '    if (!editContent) { toast.error("剧本内容为空"); return; }'
)

# Replace handleExtractScenes console.log
content = content.replace(
    '    if (!editContent) return console.log("剧本内容为空");',
    '    if (!editContent) { toast.error("剧本内容为空"); return; }'
)

# Replace handleExtractProps console.log
content = content.replace(
    '    if (!editContent) return console.log("剧本内容为空");',
    '    if (!editContent) { toast.error("剧本内容为空"); return; }'
)

# Replace handleOptimizeScenePrompt console.log
content = content.replace(
    '      console.log("优化失败");',
    '      toast.error("优化失败");'
)

# Replace handleGenerateImage console.log
content = content.replace(
    '        console.log(data.error || "生图失败");',
    '        toast.error(data.error || "生图失败");'
)
content = content.replace(
    '      console.log("生图失败");',
    '      toast.error("生图失败");'
)

# Replace handleDeleteScript console.log
content = content.replace(
    '        console.log(data.error || "删除失败");',
    '        toast.error(data.error || "删除失败");'
)
content = content.replace(
    '      console.log("删除失败，请重试");',
    '      toast.error("删除失败，请重试");'
)

with open('src/app/scripts/[id]/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Done")
