#!/usr/bin/env python3

with open('/workspace/projects/src/app/scripts/[id]/page.tsx', 'r') as f:
    lines = f.readlines()

# Find the start and end of the right panel
start_line = None
end_line = None
for i, line in enumerate(lines):
    if '/* Right Panel - Content */' in line:
        start_line = i
    if start_line is not None and i > start_line and line.strip() == '</div>' and lines[i+1].strip() == '</div>' and lines[i+2].strip().startswith('/* Delete Confirmation'):
        end_line = i + 1  # Include the closing </div> for the right panel
        break

if start_line is None or end_line is None:
    print(f"Could not find boundaries: start={start_line}, end={end_line}")
    # Fallback: try to find by line numbers
    start_line = 980
    end_line = 1136

print(f"Replacing lines {start_line+1} to {end_line+1}")

new_right_panel = '''          {/* Right Panel - Dynamic Content Container */}
          <div className="flex-1 flex flex-col min-w-0 bg-background">
            {activeView === "script" && (
              <div className="flex-1 flex flex-col min-h-0 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">剧本编辑</h2>
                </div>
                <textarea
                  className="flex-1 w-full bg-[#1A1A1A] border border-[#333] rounded-lg px-4 py-3 text-sm text-foreground focus:outline-none focus:border-[#0ABAB5] resize-none font-mono leading-relaxed"
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  placeholder="在此输入或粘贴剧本内容，支持上传 .txt/.md/.docx/.pdf..."
                />
              </div>
            )}

            {activeView === "storyboard" && (
              <div className="flex-1 flex flex-col min-h-0 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">分镜脚本</h2>
                  <Button size="sm" onClick={handleSplitScenes} disabled={isSplitting}>
                    {isSplitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Film className="w-4 h-4" />}
                    重新生成分镜
                  </Button>
                </div>
                {script.storyboards && script.storyboards.length > 0 ? (
                  <div className="flex-1 overflow-auto space-y-3">
                    {script.storyboards.map((sb, index) => (
                      <StoryboardCard
                        key={index}
                        sb={sb}
                        index={index}
                        imageUrl={storyboardImages[index]}
                        generating={generatingImageFor === index}
                        onOptimize={() => handleOptimizeStoryboardPrompt(index)}
                        onGenerateImage={(ratio: string) => handleGenerateStoryboardImage(index, ratio)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-muted-foreground">
                    暂无分镜数据，点击左侧"生成分镜"按钮生成
                  </div>
                )}
              </div>
            )}

            {activeView === "roles" && (
              <div className="flex-1 flex flex-col min-h-0 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">角色设定</h2>
                  <Button size="sm" onClick={handleExtractRoles} disabled={isExtracting}>
                    {isExtracting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
                    重新提取
                  </Button>
                </div>
                {script.roles && script.roles.length > 0 ? (
                  <div className="flex-1 overflow-auto grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {script.roles.map((role, index) => (
                      <div key={index} className="bg-[#141414] border border-[#333] rounded-xl p-5 space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-[#0ABAB5]/20 flex items-center justify-center">
                            <Users className="w-5 h-5 text-[#0ABAB5]" />
                          </div>
                          <div>
                            <h3 className="font-medium text-foreground">{role.name}</h3>
                            <Badge variant="secondary" className="text-xs bg-[#1A1A1A] text-[#888888] border-none">{role.tag}</Badge>
                          </div>
                        </div>
                        <div className="space-y-2 text-sm">
                          {role.description && <p className="text-muted-foreground"><span className="text-[#0ABAB5]">性格：</span>{role.description}</p>}
                          {role.appearance && <p className="text-muted-foreground"><span className="text-[#0ABAB5]">外貌：</span>{role.appearance}</p>}
                          {role.costume && <p className="text-muted-foreground"><span className="text-[#0ABAB5]">服装：</span>{role.costume}</p>}
                          {role.feature && <p className="text-muted-foreground"><span className="text-[#0ABAB5]">关系：</span>{role.feature}</p>}
                          <p className="text-muted-foreground"><span className="text-[#0ABAB5]">台词数：</span>{role.lines}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-muted-foreground">
                    暂无角色数据，点击左侧"提取角色"按钮生成
                  </div>
                )}
              </div>
            )}

            {activeView === "costumes" && (
              <div className="flex-1 flex flex-col min-h-0 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">服装提取</h2>
                  <Button size="sm" onClick={handleExtractCostumes} disabled={isExtractingCostumes}>
                    {isExtractingCostumes ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shirt className="w-4 h-4" />}
                    重新提取
                  </Button>
                </div>
                {extractedCostumes ? (
                  <div className="flex-1 overflow-auto">
                    <div className="bg-[#141414] border border-[#333] rounded-xl p-6 whitespace-pre-wrap text-sm text-muted-foreground leading-relaxed">
                      {extractedCostumes}
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-muted-foreground">
                    暂无服装数据，点击左侧"提取服装"按钮生成
                  </div>
                )}
              </div>
            )}

            {activeView === "scenes" && (
              <div className="flex-1 flex flex-col min-h-0 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">场景提取</h2>
                  <Button size="sm" onClick={handleExtractScenes} disabled={isExtractingScenes}>
                    {isExtractingScenes ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
                    重新提取
                  </Button>
                </div>
                {extractedScenes ? (
                  <div className="flex-1 overflow-auto">
                    <div className="bg-[#141414] border border-[#333] rounded-xl p-6 whitespace-pre-wrap text-sm text-muted-foreground leading-relaxed">
                      {extractedScenes}
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-muted-foreground">
                    暂无场景数据，点击左侧"提取场景"按钮生成
                  </div>
                )}
              </div>
            )}

            {activeView === "props" && (
              <div className="flex-1 flex flex-col min-h-0 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">道具提取</h2>
                  <Button size="sm" onClick={handleExtractProps} disabled={isExtractingProps}>
                    {isExtractingProps ? <Loader2 className="w-4 h-4 animate-spin" /> : <Package className="w-4 h-4" />}
                    重新提取
                  </Button>
                </div>
                {extractedProps ? (
                  <div className="flex-1 overflow-auto">
                    <div className="bg-[#141414] border border-[#333] rounded-xl p-6 whitespace-pre-wrap text-sm text-muted-foreground leading-relaxed">
                      {extractedProps}
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-muted-foreground">
                    暂无道具数据，点击左侧"提取道具"按钮生成
                  </div>
                )}
              </div>
            )}

            {activeView === "optimize" && (
              <div className="flex-1 flex flex-col min-h-0 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">AI 优化</h2>
                  <Button size="sm" onClick={handleOptimize} disabled={isOptimizing}>
                    {isOptimizing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                    优化剧本
                  </Button>
                </div>
                <div className="flex-1 flex flex-col space-y-4">
                  <div className="text-sm text-muted-foreground">AI 将基于当前剧本内容生成优化版本</div>
                  <textarea
                    className="flex-1 bg-[#1A1A1A] border border-[#333] rounded-lg p-4 text-sm text-foreground leading-relaxed focus:outline-none focus:border-[#0ABAB5] resize-none"
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    placeholder="优化后的剧本内容..."
                  />
                </div>
              </div>
            )}

            {activeView === "redline" && (
              <div className="flex-1 flex flex-col min-h-0 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">红线检测</h2>
                  <Button size="sm" onClick={handleComplianceCheck} disabled={isChecking}>
                    {isChecking ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldAlert className="w-4 h-4" />}
                    重新检测
                  </Button>
                </div>
                <div className="flex-1 flex flex-col space-y-4">
                  <div className="text-sm text-muted-foreground">AI 将分析剧本中的敏感内容和合规风险</div>
                  {checkResult ? (
                    <div className="flex-1 bg-[#141414] border border-[#333] rounded-xl p-6 whitespace-pre-wrap text-sm text-muted-foreground leading-relaxed overflow-auto">
                      {checkResult}
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center justify-center text-muted-foreground">
                      点击右上角"红线检测"开始分析
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
'''

# Replace the old right panel with new one
new_lines = lines[:start_line] + [new_right_panel] + lines[end_line:]

with open('/workspace/projects/src/app/scripts/[id]/page.tsx', 'w') as f:
    f.writelines(new_lines)

print(f"Done! Replaced lines {start_line+1}-{end_line+1}")
