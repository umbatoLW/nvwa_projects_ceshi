import re

with open('/workspace/projects/src/app/scripts/[id]/page.tsx', 'r') as f:
    content = f.read()

# 1. 在提取角色按钮后添加提取服装/场景/道具按钮
old_extract_roles = '''                    <div>
                      <button
                        onClick={handleExtractRoles}
                        disabled={isExtracting}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-[#1A1A1A] hover:bg-[#222] text-sm text-foreground transition-colors disabled:opacity-50 text-left"
                      >
                        {isExtracting ? <Loader2 className="w-4 h-4 text-[#0ABAB5] animate-spin" /> : <Users className="w-4 h-4 text-[#0ABAB5]" />}
                        <span>提取角色</span>
                      </button>
                      <AIProgressBar stream={extractStream} />
                    </div>'''

new_extract_roles = '''                    <div>
                      <button
                        onClick={handleExtractRoles}
                        disabled={isExtracting}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-[#1A1A1A] hover:bg-[#222] text-sm text-foreground transition-colors disabled:opacity-50 text-left"
                      >
                        {isExtracting ? <Loader2 className="w-4 h-4 text-[#0ABAB5] animate-spin" /> : <Users className="w-4 h-4 text-[#0ABAB5]" />}
                        <span>提取角色</span>
                      </button>
                      <AIProgressBar stream={extractStream} />
                    </div>
                    <button
                      onClick={handleExtractCostumes}
                      disabled={isExtractingCostumes}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-[#1A1A1A] hover:bg-[#222] text-sm text-foreground transition-colors disabled:opacity-50 text-left"
                    >
                      {isExtractingCostumes ? <Loader2 className="w-4 h-4 text-[#0ABAB5] animate-spin" /> : <Shirt className="w-4 h-4 text-[#0ABAB5]" />}
                      <span>提取服装</span>
                    </button>
                    <button
                      onClick={handleExtractScenes}
                      disabled={isExtractingScenes}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-[#1A1A1A] hover:bg-[#222] text-sm text-foreground transition-colors disabled:opacity-50 text-left"
                    >
                      {isExtractingScenes ? <Loader2 className="w-4 h-4 text-[#0ABAB5] animate-spin" /> : <MapPin className="w-4 h-4 text-[#0ABAB5]" />}
                      <span>提取场景</span>
                    </button>
                    <button
                      onClick={handleExtractProps}
                      disabled={isExtractingProps}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-[#1A1A1A] hover:bg-[#222] text-sm text-foreground transition-colors disabled:opacity-50 text-left"
                    >
                      {isExtractingProps ? <Loader2 className="w-4 h-4 text-[#0ABAB5] animate-spin" /> : <Box className="w-4 h-4 text-[#0ABAB5]" />}
                      <span>提取道具</span>
                    </button>'''

content = content.replace(old_extract_roles, new_extract_roles)

# 2. 在简介栏添加提炼大纲按钮
old_synopsis = '''                {/* Synopsis */}
                <div>
                  <h3 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
                    简介
                  </h3>
                  <textarea
                    className="w-full bg-[#1A1A1A] border border-[#333] rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-[#0ABAB5] resize-none"
                    rows={3}
                    value={editSynopsis}
                    onChange={(e) => setEditSynopsis(e.target.value)}
                    placeholder="输入剧本简介..."
                  />
                </div>'''

new_synopsis = '''                {/* Synopsis */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      简介
                    </h3>
                    <button
                      onClick={handleExtractOutline}
                      disabled={isExtractingOutline || !editContent.trim()}
                      className="text-xs text-[#0ABAB5] hover:underline disabled:opacity-50"
                    >
                      {isExtractingOutline ? '提炼中...' : '提炼大纲'}
                    </button>
                  </div>
                  <textarea
                    className="w-full bg-[#1A1A1A] border border-[#333] rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-[#0ABAB5] resize-none"
                    rows={3}
                    value={editSynopsis}
                    onChange={(e) => setEditSynopsis(e.target.value)}
                    placeholder="输入剧本简介，或点击提炼大纲自动分析..."
                  />
                </div>'''

content = content.replace(old_synopsis, new_synopsis)

with open('/workspace/projects/src/app/scripts/[id]/page.tsx', 'w') as f:
    f.write(content)

print("Done")
