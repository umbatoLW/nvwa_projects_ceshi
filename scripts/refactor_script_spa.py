#!/usr/bin/env python3
import re

with open('/workspace/projects/src/app/scripts/[id]/page.tsx', 'r') as f:
    content = f.read()

# 1. Replace activeTab state with activeView
content = content.replace(
    'const [activeTab, setActiveTab] = useState<"script" | "storyboard" | "roles">("script");',
    'const [activeView, setActiveView] = useState<"script" | "storyboard" | "roles" | "costumes" | "scenes" | "props" | "optimize" | "redline">("script");'
)

# 2. Replace setActiveTab calls with setActiveView
content = content.replace('setActiveTab("storyboard")', 'setActiveView("storyboard")')
content = content.replace('setActiveTab("roles")', 'setActiveView("roles")')

# 3. Replace handleExtractOutline to also set synopsis
old_outline = '''const handleExtractOutline = async () => {
    if (!editContent) return console.log("剧本内容为空");
    setIsExtractingOutline(true);
    try {
      const res = await apiFetch("/api/ai/execute-node", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nodeType: "storyInput", content: `请为以下剧本提炼大纲（300字以内）：\\n\\n${editContent}` }),
      });
      const data = await res.json();
      if (data.success) {
        setExtractedOutline(String(data.result || ""));
      } else {
        console.log(data.error || "提炼失败");
      }
    } catch {
      console.log("提炼失败");
    } finally {
      setIsExtractingOutline(false);
    }
  };'''

new_outline = '''const handleExtractOutline = async () => {
    if (!editContent) return console.log("剧本内容为空");
    setIsExtractingOutline(true);
    try {
      const res = await apiFetch("/api/ai/execute-node", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nodeType: "storyInput", content: `请为以下剧本提炼大纲（300字以内）：\\n\\n${editContent}` }),
      });
      const data = await res.json();
      if (data.success) {
        const outline = String(data.result || "");
        setEditSynopsis(outline);
        setScript((prev) => (prev ? { ...prev, synopsis: outline } : null));
        try {
          await apiFetch(`/api/scripts/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ synopsis: outline }),
          });
        } catch {
          console.warn("大纲保存到数据库失败");
        }
      } else {
        console.log(data.error || "提炼失败");
      }
    } catch {
      console.log("提炼失败");
    } finally {
      setIsExtractingOutline(false);
    }
  };'''

content = content.replace(old_outline, new_outline)

# 4. Rewrite left panel buttons to be view switchers
old_left_buttons = '''<div>
                  <h3 className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider">
                    AI 助手
                  </h3>
                  <div className="space-y-2">
                    <div>
                      <button
                        onClick={handleSplitScenes}
                        disabled={isSplitting}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-[#1A1A1A] hover:bg-[#222] text-sm text-foreground transition-colors disabled:opacity-50 text-left"
                      >
                        {isSplitting ? <Loader2 className="w-4 h-4 text-[#0ABAB5] animate-spin" /> : <Film className="w-4 h-4 text-[#0ABAB5]" />}
                        <span>生成分镜</span>
                      </button>
                      <AIProgressBar stream={splitStream} />
                    </div>
                    <div>
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
                      {isExtractingProps ? <Loader2 className="w-4 h-4 text-[#0ABAB5] animate-spin" /> : <Package className="w-4 h-4 text-[#0ABAB5]" />}
                      <span>提取道具</span>
                    </button>
                    <button
                      onClick={handleOptimize}
                      disabled={isOptimizing}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-[#1A1A1A] hover:bg-[#222] text-sm text-foreground transition-colors disabled:opacity-50 text-left"
                    >
                      {isOptimizing ? <Loader2 className="w-4 h-4 text-[#0ABAB5] animate-spin" /> : <Wand2 className="w-4 h-4 text-[#0ABAB5]" />}
                      <span>AI优化</span>
                    </button>
                    <button
                      onClick={handleComplianceCheck}
                      disabled={isChecking}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-[#1A1A1A] hover:bg-[#222] text-sm text-foreground transition-colors disabled:opacity-50 text-left"
                    >
                      {isChecking ? <Loader2 className="w-4 h-4 text-red-400 animate-spin" /> : <ShieldAlert className="w-4 h-4 text-red-400" />}
                      <span>红线检测</span>
                    </button>
                  </div>
                </div>'''

new_left_buttons = '''<div>
                  <h3 className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider">
                    功能视图
                  </h3>
                  <div className="space-y-2">
                    <button
                      onClick={() => setActiveView("script")}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors text-left ${activeView === "script" ? "bg-[#0ABAB5]/20 text-[#0ABAB5] ring-1 ring-[#0ABAB5]/30" : "bg-[#1A1A1A] hover:bg-[#222] text-foreground"}`}
                    >
                      <FileText className="w-4 h-4 text-[#0ABAB5]" />
                      <span>剧本预览</span>
                    </button>
                    <div>
                      <button
                        onClick={() => { handleSplitScenes(); setActiveView("storyboard"); }}
                        disabled={isSplitting}
                        className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors disabled:opacity-50 text-left ${activeView === "storyboard" ? "bg-[#0ABAB5]/20 text-[#0ABAB5] ring-1 ring-[#0ABAB5]/30" : "bg-[#1A1A1A] hover:bg-[#222] text-foreground"}`}
                      >
                        {isSplitting ? <Loader2 className="w-4 h-4 text-[#0ABAB5] animate-spin" /> : <Film className="w-4 h-4 text-[#0ABAB5]" />}
                        <span>生成分镜</span>
                      </button>
                      <AIProgressBar stream={splitStream} />
                    </div>
                    <div>
                      <button
                        onClick={() => { handleExtractRoles(); setActiveView("roles"); }}
                        disabled={isExtracting}
                        className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors disabled:opacity-50 text-left ${activeView === "roles" ? "bg-[#0ABAB5]/20 text-[#0ABAB5] ring-1 ring-[#0ABAB5]/30" : "bg-[#1A1A1A] hover:bg-[#222] text-foreground"}`}
                      >
                        {isExtracting ? <Loader2 className="w-4 h-4 text-[#0ABAB5] animate-spin" /> : <Users className="w-4 h-4 text-[#0ABAB5]" />}
                        <span>提取角色</span>
                      </button>
                      <AIProgressBar stream={extractStream} />
                    </div>
                    <button
                      onClick={() => { handleExtractCostumes(); setActiveView("costumes"); }}
                      disabled={isExtractingCostumes}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors disabled:opacity-50 text-left ${activeView === "costumes" ? "bg-[#0ABAB5]/20 text-[#0ABAB5] ring-1 ring-[#0ABAB5]/30" : "bg-[#1A1A1A] hover:bg-[#222] text-foreground"}`}
                    >
                      {isExtractingCostumes ? <Loader2 className="w-4 h-4 text-[#0ABAB5] animate-spin" /> : <Shirt className="w-4 h-4 text-[#0ABAB5]" />}
                      <span>提取服装</span>
                    </button>
                    <button
                      onClick={() => { handleExtractScenes(); setActiveView("scenes"); }}
                      disabled={isExtractingScenes}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors disabled:opacity-50 text-left ${activeView === "scenes" ? "bg-[#0ABAB5]/20 text-[#0ABAB5] ring-1 ring-[#0ABAB5]/30" : "bg-[#1A1A1A] hover:bg-[#222] text-foreground"}`}
                    >
                      {isExtractingScenes ? <Loader2 className="w-4 h-4 text-[#0ABAB5] animate-spin" /> : <MapPin className="w-4 h-4 text-[#0ABAB5]" />}
                      <span>提取场景</span>
                    </button>
                    <button
                      onClick={() => { handleExtractProps(); setActiveView("props"); }}
                      disabled={isExtractingProps}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors disabled:opacity-50 text-left ${activeView === "props" ? "bg-[#0ABAB5]/20 text-[#0ABAB5] ring-1 ring-[#0ABAB5]/30" : "bg-[#1A1A1A] hover:bg-[#222] text-foreground"}`}
                    >
                      {isExtractingProps ? <Loader2 className="w-4 h-4 text-[#0ABAB5] animate-spin" /> : <Package className="w-4 h-4 text-[#0ABAB5]" />}
                      <span>提取道具</span>
                    </button>
                    <button
                      onClick={() => { handleOptimize(); setActiveView("optimize"); }}
                      disabled={isOptimizing}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors disabled:opacity-50 text-left ${activeView === "optimize" ? "bg-[#0ABAB5]/20 text-[#0ABAB5] ring-1 ring-[#0ABAB5]/30" : "bg-[#1A1A1A] hover:bg-[#222] text-foreground"}`}
                    >
                      {isOptimizing ? <Loader2 className="w-4 h-4 text-[#0ABAB5] animate-spin" /> : <Wand2 className="w-4 h-4 text-[#0ABAB5]" />}
                      <span>AI优化</span>
                    </button>
                    <button
                      onClick={() => { handleComplianceCheck(); setActiveView("redline"); }}
                      disabled={isChecking}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors disabled:opacity-50 text-left ${activeView === "redline" ? "bg-red-400/20 text-red-400 ring-1 ring-red-400/30" : "bg-[#1A1A1A] hover:bg-[#222] text-foreground"}`}
                    >
                      {isChecking ? <Loader2 className="w-4 h-4 text-red-400 animate-spin" /> : <ShieldAlert className="w-4 h-4 text-red-400" />}
                      <span>红线检测</span>
                    </button>
                  </div>
                </div>'''

content = content.replace(old_left_buttons, new_left_buttons)

# 5. Rewrite the right content area
old_right_start = '''<div className="flex-1 min-w-0 overflow-auto bg-background">
                  <div className="max-w-[1400px] mx-auto p-6 space-y-6">'''

new_right_start = '''<div className="flex-1 min-w-0 overflow-auto bg-background">
                  <div className="h-full p-6">'''

content = content.replace(old_right_start, new_right_start)

# 6. Replace the old right content area (from old right start to the storyboard section)
# We need to find the old content area and replace it with the new dynamic view system
# This is complex, so let's find and replace the entire right panel content

# Find where the right content area starts after the old_right_start
# and ends before the delete confirmation dialog

old_script_preview = '''{/* Script Preview */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold">剧本编辑</h2>
                      </div>
                      <textarea
                        className="w-full flex-1 bg-[#1A1A1A] border border-[#333] rounded-lg p-4 text-sm text-foreground leading-relaxed focus:outline-none focus:border-[#0ABAB5] resize-none"
                        style={{ minHeight: "calc(100vh - 300px)" }}
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        placeholder="在此输入或编辑剧本内容..."
                      />
                    </div>

                    {/* Smart Extraction */}
                    <div className="bg-[#141414] border border-[#333] rounded-xl p-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-[#0ABAB5]">智能提取</h3>
                        <div className="flex gap-2">
                          <button
                            onClick={handleSplitScenes}
                            disabled={isSplitting}
                            className="px-4 py-2 bg-[#0ABAB5] text-[#0A0A0A] rounded-lg text-sm font-medium hover:bg-[#0ABAB5]/90 transition-colors disabled:opacity-50"
                          >
                            {isSplitting ? (
                              <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />分析中...</span>
                            ) : "生成分镜"}
                          </button>
                          <button
                            onClick={handleExtractRoles}
                            disabled={isExtracting}
                            className="px-4 py-2 bg-[#1A1A1A] text-foreground border border-[#333] rounded-lg text-sm hover:bg-[#222] transition-colors disabled:opacity-50"
                          >
                            {isExtracting ? (
                              <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />提取中...</span>
                            ) : "提取角色"}
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <button
                          onClick={handleExtractCostumes}
                          disabled={isExtractingCostumes}
                          className="px-4 py-2 bg-[#1A1A1A] text-foreground border border-[#333] rounded-lg text-sm hover:bg-[#222] transition-colors disabled:opacity-50"
                        >
                          {isExtractingCostumes ? <Loader2 className="w-4 h-4 animate-spin" /> : "提取服装"}
                        </button>
                        <button
                          onClick={handleExtractScenes}
                          disabled={isExtractingScenes}
                          className="px-4 py-2 bg-[#1A1A1A] text-foreground border border-[#333] rounded-lg text-sm hover:bg-[#222] transition-colors disabled:opacity-50"
                        >
                          {isExtractingScenes ? <Loader2 className="w-4 h-4 animate-spin" /> : "提取场景"}
                        </button>
                        <button
                          onClick={handleExtractProps}
                          disabled={isExtractingProps}
                          className="px-4 py-2 bg-[#1A1A1A] text-foreground border border-[#333] rounded-lg text-sm hover:bg-[#222] transition-colors disabled:opacity-50"
                        >
                          {isExtractingProps ? <Loader2 className="w-4 h-4 animate-spin" /> : "提取道具"}
                        </button>
                      </div>
                      {(splitStream.isRunning || splitStream.message) && (
                        <div className="bg-[#1A1A1A] rounded-lg p-4 space-y-2">
                          <div className="flex items-center gap-2 text-sm text-[#0ABAB5]">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>{splitStream.message || "正在分析剧本..."}</span>
                          </div>
                          {splitStream.progress > 0 && (
                            <div className="h-1 bg-[#333] rounded-full overflow-hidden">
                              <div
                                className="h-full bg-[#0ABAB5] rounded-full transition-all duration-300"
                                style={{ width: `${splitStream.progress}%` }}
                              />
                            </div>
                          )}
                        </div>
                      )}
                      {(extractStream.isRunning || extractStream.message) && (
                        <div className="bg-[#1A1A1A] rounded-lg p-4 space-y-2">
                          <div className="flex items-center gap-2 text-sm text-[#0ABAB5]">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>{extractStream.message || "正在提取角色..."}</span>
                          </div>
                          {extractStream.progress > 0 && (
                            <div className="h-1 bg-[#333] rounded-full overflow-hidden">
                              <div
                                className="h-full bg-[#0ABAB5] rounded-full transition-all duration-300"
                                style={{ width: `${extractStream.progress}%` }}
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>'''

new_script_preview = '''{activeView === "script" && (
                    <div className="h-full flex flex-col space-y-4">
                      <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold">剧本编辑</h2>
                      </div>
                      <textarea
                        className="w-full flex-1 bg-[#1A1A1A] border border-[#333] rounded-lg p-4 text-sm text-foreground leading-relaxed focus:outline-none focus:border-[#0ABAB5] resize-none"
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        placeholder="在此输入或编辑剧本内容..."
                      />
                    </div>
                  )}

                  {activeView === "storyboard" && (
                    <div className="h-full flex flex-col space-y-4">
                      <div className="flex items-center justify-between">
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
                              onGenerateImage={(ratio) => handleGenerateStoryboardImage(index, ratio)}
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
                    <div className="h-full flex flex-col space-y-4">
                      <div className="flex items-center justify-between">
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
                    <div className="h-full flex flex-col space-y-4">
                      <div className="flex items-center justify-between">
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
                    <div className="h-full flex flex-col space-y-4">
                      <div className="flex items-center justify-between">
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
                    <div className="h-full flex flex-col space-y-4">
                      <div className="flex items-center justify-between">
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
                    <div className="h-full flex flex-col space-y-4">
                      <div className="flex items-center justify-between">
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
                    <div className="h-full flex flex-col space-y-4">
                      <div className="flex items-center justify-between">
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
                  )}'''

content = content.replace(old_script_preview, new_script_preview)

# Remove the old right panel content that is now duplicated/replaced
# Find and remove the old storyboard section from the right panel
# since it's now in the activeView === "storyboard" block

# Remove old storyboard section
old_storyboard_section = '''{/* Storyboard Section */}
                    {script.storyboards && script.storyboards.length > 0 && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h2 className="text-lg font-semibold">分镜脚本</h2>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const csvContent = [
                                  ["镜号", "描述", "景别", "运镜", "时长", "角色", "音效"].join(","),
                                  ...script.storyboards.map((sb) =>
                                    [sb.num, `"${sb.description}"`, sb.shot, sb.camera, sb.duration, sb.character, sb.audio].join(",")
                                  ),
                                ].join("\\n");
                                const blob = new Blob(["\\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement("a");
                                a.href = url;
                                a.download = `${script.title}_分镜表.csv`;
                                a.click();
                                URL.revokeObjectURL(url);
                              }}
                              className="gap-1.5"
                            >
                              <Download className="w-4 h-4" />
                              导出CSV
                            </Button>
                          </div>
                        </div>
                        <div className="space-y-3">
                          {script.storyboards.map((sb, index) => (
                            <StoryboardCard
                              key={index}
                              sb={sb}
                              index={index}
                              imageUrl={storyboardImages[index]}
                              generating={generatingImageFor === index}
                              onOptimize={() => handleOptimizeStoryboardPrompt(index)}
                              onGenerateImage={(ratio) => handleGenerateStoryboardImage(index, ratio)}
                            />
                          ))}
                        </div>
                      </div>
                    )}'''

content = content.replace(old_storyboard_section, '')

# Remove old roles section
old_roles_section = '''{/* Roles Section */}
                    {script.roles && script.roles.length > 0 && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h2 className="text-lg font-semibold">角色设定</h2>
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
                      </div>
                    )}'''

content = content.replace(old_roles_section, '')

# Remove old extracted content sections (costumes, scenes, props, redline)
old_extracted_section = '''{/* Extracted Content */}
                    {extractedOutline && (
                      <div className="bg-[#141414] border border-[#333] rounded-xl p-6 space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-semibold text-[#0ABAB5]">提炼大纲</h3>
                        </div>
                        <div className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{extractedOutline}</div>
                      </div>
                    )}
                    {extractedCostumes && (
                      <div className="bg-[#141414] border border-[#333] rounded-xl p-6 space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-semibold text-[#0ABAB5]">服装提取</h3>
                        </div>
                        <div className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{extractedCostumes}</div>
                      </div>
                    )}
                    {extractedScenes && (
                      <div className="bg-[#141414] border border-[#333] rounded-xl p-6 space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-semibold text-[#0ABAB5]">场景提取</h3>
                        </div>
                        <div className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{extractedScenes}</div>
                      </div>
                    )}
                    {extractedProps && (
                      <div className="bg-[#141414] border border-[#333] rounded-xl p-6 space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-semibold text-[#0ABAB5]">道具提取</h3>
                        </div>
                        <div className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{extractedProps}</div>
                      </div>
                    )}
                    {checkResult && (
                      <div className="bg-[#141414] border border-[#333] rounded-xl p-6 space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-semibold text-red-400">红线检测结果</h3>
                        </div>
                        <div className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{checkResult}</div>
                      </div>
                    )}'''

content = content.replace(old_extracted_section, '')

# Also remove the old "Upload file" button from the right panel
# Find and remove the upload button in the right content area
old_upload_in_right = '''{/* Upload */}
                    <div className="bg-[#141414] border border-[#333] rounded-xl p-6 space-y-4">
                      <h3 className="text-sm font-semibold text-[#0ABAB5]">上传剧本</h3>
                      <div className="border-2 border-dashed border-[#333] rounded-lg p-8 text-center">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".txt,.md,.docx,.pdf"
                          className="hidden"
                          onChange={handleFileUpload}
                        />
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="w-full flex flex-col items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Upload className="w-8 h-8" />
                          <span className="text-sm">上传剧本文件 (.txt/.md)</span>
                        </button>
                      </div>
                    </div>'''

content = content.replace(old_upload_in_right, '')

# Remove old save button from the right side (it's already in the top bar)
# The "Save" button in the right panel was removed earlier

# Remove the old closing divs that were specific to the old layout
# Fix the closing divs for the right content area
content = content.replace(
    '''                  </div>
                </div>
              </div>
            </div>
          </div>''',
    '''                  </div>
                </div>
              </div>
            </div>
          </div>'''
)

# Remove unused imports
content = content.replace(
    'import { FileText, Wand2, Upload, ShieldAlert, Sparkles, ArrowLeft, Save, Download, Trash2, Users, Film, Loader2, Shirt, MapPin, Package } from "lucide-react";',
    'import { FileText, Wand2, Upload, ShieldAlert, ArrowLeft, Save, Download, Trash2, Users, Film, Loader2, Shirt, MapPin, Package } from "lucide-react";'
)

with open('/workspace/projects/src/app/scripts/[id]/page.tsx', 'w') as f:
    f.write(content)

print("Refactored successfully")
