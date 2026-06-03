import re

path = '/workspace/projects/src/app/scripts/[id]/page.tsx'

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

new_right = '''{/* Right Panel - Content */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Check Result Banner */}
            {checkResult && (
              <div className="mx-6 mt-4 p-3 rounded-lg bg-[#1A1A1A] border border-[#333] text-sm text-foreground">
                <div className="flex items-start gap-2">
                  <ShieldAlert className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                  <div>
                    <span className="font-medium">红线检测结果：</span>
                    <span className="text-muted-foreground whitespace-pre-wrap">{checkResult}</span>
                  </div>
                </div>
                <button onClick={() => setCheckResult(null)} className="mt-2 text-xs text-[#0ABAB5] hover:underline">
                  关闭
                </button>
              </div>
            )}

            {/* Main Editor */}
            <div className="flex-1 flex flex-col min-h-0 p-6">
              <textarea
                className="flex-1 w-full bg-[#1A1A1A] border border-[#333] rounded-lg px-4 py-3 text-sm text-foreground focus:outline-none focus:border-[#0ABAB5] resize-none font-mono leading-relaxed"
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                placeholder="在此输入或粘贴剧本内容，支持上传 .txt/.md/.docx/.pdf..."
              />
            </div>

            {/* Extract Toolbar */}
            <div className="px-6 pb-3 border-t border-border bg-[#0A0A0A]">
              <div className="flex items-center gap-2 py-3 flex-wrap">
                <span className="text-xs text-muted-foreground mr-1">智能提取：</span>
                <button
                  onClick={handleExtractRoles}
                  disabled={isExtracting}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#1A1A1A] hover:bg-[#222] text-xs text-foreground transition-colors disabled:opacity-50"
                >
                  {isExtracting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Users className="w-3 h-3 text-[#0ABAB5]" />}
                  提取角色
                </button>
                <button
                  onClick={handleExtractCostumes}
                  disabled={isExtractingCostumes}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#1A1A1A] hover:bg-[#222] text-xs text-foreground transition-colors disabled:opacity-50"
                >
                  {isExtractingCostumes ? <Loader2 className="w-3 h-3 animate-spin" /> : <Shirt className="w-3 h-3 text-[#0ABAB5]" />}
                  提取服装
                </button>
                <button
                  onClick={handleExtractScenes}
                  disabled={isExtractingScenes}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#1A1A1A] hover:bg-[#222] text-xs text-foreground transition-colors disabled:opacity-50"
                >
                  {isExtractingScenes ? <Loader2 className="w-3 h-3 animate-spin" /> : <MapPin className="w-3 h-3 text-[#0ABAB5]" />}
                  提取场景
                </button>
                <button
                  onClick={handleExtractProps}
                  disabled={isExtractingProps}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#1A1A1A] hover:bg-[#222] text-xs text-foreground transition-colors disabled:opacity-50"
                >
                  {isExtractingProps ? <Loader2 className="w-3 h-3 animate-spin" /> : <Hammer className="w-3 h-3 text-[#0ABAB5]" />}
                  提取道具
                </button>
              </div>

              {/* Extracted Content Panels */}
              {(extractStream || extractedCostumes || extractedScenes || extractedProps) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-3">
                  {extractStream && (
                    <div className="p-3 rounded-lg bg-[#1A1A1A] border border-[#333]">
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="w-3.5 h-3.5 text-[#0ABAB5]" />
                        <span className="text-xs font-medium text-foreground">角色设定</span>
                      </div>
                      <div className="text-xs text-muted-foreground whitespace-pre-wrap">{extractStream}</div>
                    </div>
                  )}
                  {extractedCostumes && (
                    <div className="p-3 rounded-lg bg-[#1A1A1A] border border-[#333]">
                      <div className="flex items-center gap-2 mb-2">
                        <Shirt className="w-3.5 h-3.5 text-[#0ABAB5]" />
                        <span className="text-xs font-medium text-foreground">服装设定</span>
                      </div>
                      <div className="text-xs text-muted-foreground whitespace-pre-wrap">{extractedCostumes}</div>
                    </div>
                  )}
                  {extractedScenes && (
                    <div className="p-3 rounded-lg bg-[#1A1A1A] border border-[#333]">
                      <div className="flex items-center gap-2 mb-2">
                        <MapPin className="w-3.5 h-3.5 text-[#0ABAB5]" />
                        <span className="text-xs font-medium text-foreground">场景设定</span>
                      </div>
                      <div className="text-xs text-muted-foreground whitespace-pre-wrap">{extractedScenes}</div>
                    </div>
                  )}
                  {extractedProps && (
                    <div className="p-3 rounded-lg bg-[#1A1A1A] border border-[#333]">
                      <div className="flex items-center gap-2 mb-2">
                        <Hammer className="w-3.5 h-3.5 text-[#0ABAB5]" />
                        <span className="text-xs font-medium text-foreground">道具设定</span>
                      </div>
                      <div className="text-xs text-muted-foreground whitespace-pre-wrap">{extractedProps}</div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Storyboard Section */}
            <div className="px-6 pb-6 overflow-auto" style={{ maxHeight: '40vh' }}>
              {script.storyboards.length > 0 && (
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <Film className="w-4 h-4 text-[#0ABAB5]" />
                      分镜脚本 ({script.storyboards.length} 镜)
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {script.storyboards.map((sb) => {
                      const [optimizing, setOptimizing] = useState(false);
                      const [optimized, setOptimized] = useState('');
                      const [generatingImg, setGeneratingImg] = useState(false);
                      const [imgUrl, setImgUrl] = useState<string | null>(null);
                      const [imgRatio, setImgRatio] = useState('16:9');
                      const promptText = optimized || sb.description;

                      const handleOptimize = async () => {
                        setOptimizing(true);
                        try {
                          const res = await fetch('/api/ai/execute-node', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              nodeType: 'text2image',
                              input: `请优化以下分镜描述，使其更适合作为AI图像生成提示词。保留中文描述，增加画面细节、光影、氛围、风格描述，直接输出优化后的提示词（不要解释）：\\n\\n${sb.description}`,
                              config: { mode: 'optimize' }
                            }),
                          });
                          const data = await res.json();
                          setOptimized(data.result?.content || data.result || data.data || '');
                        } catch (e) { console.error(e); }
                        finally { setOptimizing(false); }
                      };

                      const handleGenerateImage = async () => {
                        setGeneratingImg(true);
                        try {
                          const res = await fetch('/api/ai/generate-image', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ prompt: promptText, ratio: imgRatio, count: 1 }),
                          });
                          const data = await res.json();
                          if (data.imageUrls?.[0]) setImgUrl(data.imageUrls[0]);
                        } catch (e) { console.error(e); }
                        finally { setGeneratingImg(false); }
                      };

                      return (
                        <div key={sb.num} className="rounded-xl bg-[#141414] border border-[#333] overflow-hidden flex flex-col">
                          <div className="p-3 flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-xs font-mono font-bold text-[#0ABAB5] bg-[#0ABAB5]/10 px-2 py-0.5 rounded">
                                {String(sb.num).padStart(3, '0')}
                              </span>
                              <span className="text-xs text-muted-foreground">{sb.shot || '—'}</span>
                            </div>
                            <p className="text-sm text-foreground mb-2 leading-relaxed">
                              {optimized || sb.description}
                            </p>
                            <div className="flex flex-wrap gap-1.5 mb-2">
                              {sb.character && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1A1A1A] text-muted-foreground border border-[#333]">
                                  {sb.character}
                                </span>
                              )}
                              {sb.camera && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1A1A1A] text-muted-foreground border border-[#333]">
                                  {sb.camera}
                                </span>
                              )}
                              {sb.audio && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1A1A1A] text-muted-foreground border border-[#333]">
                                  {sb.audio}
                                </span>
                              )}
                              {sb.duration && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1A1A1A] text-muted-foreground border border-[#333]">
                                  {sb.duration}
                                </span>
                              )}
                            </div>
                          </div>

                          {imgUrl && (
                            <div className="px-3 pb-2">
                              <img src={imgUrl} alt={`分镜${sb.num}`} className="w-full rounded-lg border border-[#333]" />
                            </div>
                          )}

                          <div className="px-3 pb-3 flex items-center gap-2">
                            <button
                              onClick={handleOptimize}
                              disabled={optimizing}
                              className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-md bg-[#1A1A1A] hover:bg-[#222] text-[10px] text-foreground transition-colors disabled:opacity-50"
                            >
                              {optimizing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3 text-[#0ABAB5]" />}
                              AI优化
                            </button>
                            <select
                              value={imgRatio}
                              onChange={(e) => setImgRatio(e.target.value)}
                              className="bg-[#1A1A1A] border border-[#333] rounded-md text-[10px] px-1.5 py-1 text-foreground outline-none"
                            >
                              <option value="16:9">16:9</option>
                              <option value="9:16">9:16</option>
                              <option value="1:1">1:1</option>
                              <option value="4:3">4:3</option>
                            </select>
                            <button
                              onClick={handleGenerateImage}
                              disabled={generatingImg}
                              className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-md bg-[#0ABAB5]/10 hover:bg-[#0ABAB5]/20 text-[10px] text-[#0ABAB5] transition-colors disabled:opacity-50"
                            >
                              {generatingImg ? <Loader2 className="w-3 h-3 animate-spin" /> : <ImageIcon className="w-3 h-3" />}
                              生图
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Roles Section */}
              {script.roles.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
                    <Users className="w-4 h-4 text-[#0ABAB5]" />
                    角色设定 ({script.roles.length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {script.roles.map((role, index) => (
                      <div key={index} className="p-4 rounded-xl bg-[#141414] border border-[#333]">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <h4 className="text-sm font-semibold text-foreground">{role.name}</h4>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1A1A1A] text-muted-foreground border border-[#333]">{role.tag}</span>
                          </div>
                        </div>
                        <div className="space-y-1 text-xs text-muted-foreground">
                          {role.appearance && <div><span className="text-foreground">外貌:</span> {role.appearance}</div>}
                          {role.description && <div><span className="text-foreground">性格:</span> {role.description}</div>}
                          {role.costume && <div><span className="text-foreground">服装:</span> {role.costume}</div>}
                          {role.feature && <div><span className="text-foreground">关系:</span> {role.feature}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>'''

pattern = re.compile(r'\{\/\* Right Panel - Content \*\/\}.*?\{\/\* Delete Confirmation \*\/\}', re.DOTALL)
match = pattern.search(content)
if match:
    content = content[:match.start()] + new_right + '\n\n        {/* Delete Confirmation */}' + content[match.end():]
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print('Right panel replaced successfully')
else:
    print('Pattern not found')
