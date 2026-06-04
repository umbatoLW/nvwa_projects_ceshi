
# 女娲(NVWA)AI短剧智创聚合平台 — Coze AI编程助手 Phase 2 开发指令

> 前置条件：Phase 1 已验收通过（含P0-4和P1-6补完），feature/p1-infrastructure 已合并到 main，已打 tag v0.10.1-infra-hotfix
> 本阶段目标：注入短剧创作知识库与影视级提示词工程，提升剧本生成质量与角色表演丰富度
> 预计工期：3-5天

---

## 一、你的角色与能力边界（与前序阶段一致）

**你是**：精通 Next.js 16 App Router + TypeScript 5.x + Drizzle ORM + Supabase + Redis + Tailwind CSS v4 + shadcn/ui 的高级全栈工程师。

**你不得**：
- 引入新的UI框架（禁止Vue/Element Plus/Gradio等）
- 修改现有shadcn/ui主题和色彩变量
- 改变现有字体栈和布局网格
- 在一个阶段内同时修改多个功能域（禁止边开发边修复）
- 删除任何现有功能代码（只能标记为@deprecated，保留fallback）
- 改变现有API路由的接口契约（输入输出格式必须和Phase 1一致）

---

## 二、分支策略

```bash
# 从main切出Phase 2分支
git checkout main
git pull origin main
git checkout -b feature/p2-script-knowledge
```

**提交格式**：`[P2-N] type: 简短描述`
- 例：`[P2-1] feat: 注入short-drama 8份知识库`
- 例：`[P2-2] refactor: generate-full-script改为三阶段写作`
- 例：`[P2-3] feat: 新增五维度质量评分API`

**每个任务独立commit**，禁止一个commit改多个不相关文件。

---

## 三、基线保护（Phase 0 + Phase 1全部功能必须保留）

Phase 2结束后，以下功能必须**100%可用**：

### Phase 0基线
1. `POST /api/ai/generate-full-script` — 流式输出JSON结构剧本
2. `POST /api/ai/split-scenes` — 输出分镜JSON数组（jsonrepair兜底）
3. `POST /api/ai/extract-characters` — 输出角色列表（jsonrepair兜底）
4. `POST /api/ai/extract-scenes` — 输出场景列表
5. `POST /api/ai/generate-image` — 输出图片URL
6. `POST /api/ai/generate-video` — 输出视频URL/taskId
7. `POST /api/ai/generate-character-views` — 输出三视图URL
8. `POST /api/ai/compliance-check` — 输出检测结果
9. `POST /api/ai/consistency-check` — 输出合并建议
10. `GET /workspace` — React Flow画布可渲染，组件拆分后功能无损

### Phase 1基线
11. `POST /api/ai/generate-full-script` — JSON解析不再崩溃（safeJsonParse兜底）
12. `POST /api/ai/split-scenes` — JSON解析鲁棒
13. `POST /api/ai/extract-characters` — JSON解析鲁棒
14. `POST /api/ai/batch-extract` — 并发执行（p-limit 3路）
15. `POST /api/ai/edit-video` — Redis限流生效，多实例共享
16. `POST /api/ai/generate-3d` — 非阻塞异步，返回taskId+查询接口
17. `GET /workspace` — page.tsx < 5KB，组件拆分完成
18. 统一错误格式 — 所有API返回 {error,code,requestId}
19. Redis限流 — 连续6次后429
20. 成本记录 — Redis中有成本记录
21. 熔断 — 连续5次失败后503

---

## 四、Phase 2 任务清单

---

### 任务 P2-1：注入 short-drama 8份知识库（零依赖，直接复制）

**问题描述**：
- 当前剧本生成System Prompt只有基础的角色设定和格式要求
- 没有"节奏曲线"、"付费卡点"、"爽感矩阵"、"四层反派"等专业短剧创作理论
- 生成的剧本节奏混乱、缺乏付费钩子、反派扁平

**修复步骤**：

#### 1.1 创建知识库文件

创建 `src/lib/prompt-knowledge/index.ts`：

```typescript
/**
 * 短剧创作知识库
 * 来源：short-drama 开源项目（github.com/0xsline/short-drama）
 * 用途：为LLM System Prompt注入专业创作方法论
 */

export const KNOWLEDGE_BASE = {
  /**
   * 题材指南（13种）
   * 每种题材的核心要素、标志性桥段、节奏模板
   */
  genreGuide: `## 题材指南（13种核心题材）

【霸道总裁】
核心要素：权力不对等、契约关系、身份反转、追妻火葬场
标志性桥段：电梯偶遇→酒会重逢→契约同居→身份揭露→追妻火葬场
节奏模板：强冲突开场→身份悬念→契约绑定→情感升温→真相揭露→追妻高潮

【甜宠】
核心要素：双向奔赴、日常撒糖、误会解除、双向暗恋
标志性桥段：暗恋被发现→吃醋→同居日常→告白→求婚
节奏模板：轻松开场→小误会→撒糖→小虐→大甜→圆满

【悬疑推理】
核心要素：谜团、线索、反转、真相
标志性桥段：密室→线索→嫌疑人→反转→真相
节奏模板：谜团开场→调查→线索交织→嫌疑人→反转→真相揭露

【古风穿越】
核心要素：现代思维 vs 古代环境、身份错位、权谋斗争
标志性桥段：穿越→适应→权谋→逆袭→回归/留下
节奏模板：穿越 shock→适应期→卷入斗争→现代思维破局→身份揭露→选择留下

【复仇爽剧】
核心要素：仇恨、隐忍、布局、打脸、逆袭
标志性桥段：被害→隐忍→布局→逐个击破→终极复仇
节奏模板：被害开场→隐忍蛰伏→布局→小打脸→大逆袭→终极复仇

【现代励志】
核心要素：底层起点、奋斗、挫折、突破、成功
标志性桥段：低谷→机遇→奋斗→挫折→突破→成功
节奏模板：低谷开场→机遇出现→奋斗→重大挫折→突破→成功

【都市职场】
核心要素：办公室政治、项目竞争、职场恋情、升职加薪
标志性桥段：新人入职→项目竞争→办公室政治→恋情→升职

【家庭伦理】
核心要素：婆媳关系、亲子矛盾、财产纠纷、和解
标志性桥段：矛盾→冲突→误解→真相→和解

【青春校园】
核心要素：暗恋、考试、友情、成长、初恋
标志性桥段：开学→暗恋→考试→误会→告白→毕业

【奇幻玄幻】
核心要素：异能、修炼、门派、战斗、成长
标志性桥段：觉醒→修炼→门派→战斗→成长→巅峰

【医疗】
核心要素：急诊、手术、医患关系、生死、爱情
标志性桥段：急诊→手术→医患冲突→生死→爱情

【律政】
核心要素：案件、法庭、证据、辩论、正义
标志性桥段：接案→调查→法庭→辩论→胜诉/败诉

【军事】
核心要素：训练、任务、战友情、牺牲、荣誉
标志性桥段：入伍→训练→任务→牺牲→荣誉`,

  /**
   * 四段式节奏曲线
   * 起势段→攀升段→风暴段→决战段的精确配比和任务
   */
  rhythmCurve: `## 四段式节奏曲线（黄金比例）

【起势段：前15%集数】
任务：建立人物关系，抛出核心矛盾，建立世界观
节奏：快-慢-快。第1集强钩子开场，第2-3集展开人物，结尾留悬念
每集结尾：必须有钩子（情绪/悬念/危机）
信息密度：高（每集至少3个信息点）

【攀升段：中间30%集数】
任务：矛盾升级，反派层层阻挠，情感线发展
节奏：中-快-中。每3集一个中高潮（小打脸/小反转）
反派递进：第一层小反派（日常麻烦）→第二层中反派（阶段威胁）
情感线：从陌生→暧昧→确认关系（甜宠）或从信任→怀疑（悬疑）
每集结尾：情绪阈值逐步推高

【风暴段：中间35%集数】
任务：高潮迭起，真相揭露，核心对抗
节奏：快-快-快。密集的高潮，每2集一个大冲突
反派递进：第三层大反派（幕后黑手）→第四层隐藏反派（最信任的人背叛）
付费卡点集中区域：10-15%的集数设为付费卡点，集中在情绪最高点
信息密度：极高（每集至少5个信息点，含2个反转）

【决战段：后20%集数】
任务：终极对抗，圆满结局，回收所有伏笔
节奏：快-慢-快。终极对决→情感升华→圆满结局
反派：全部清算，隐藏反派揭露
伏笔回收：前80集的所有伏笔必须在此阶段回收
结局类型：HE（圆满）/ BE（悲剧）/ OE（开放）`,

  /**
   * 五种钩子设计
   * 每种钩子的定义、使用位置、效果强度
   */
  hookDesign: `## 五种钩子设计（每集结尾必备）

【情绪钩：占比30-40%】
定义：在情感最高点截断，让观众为角色的情绪买单
示例："她转身的那一刻，眼泪终于落下，而他没有看到..."
使用位置：情感线关键节点（分手/重逢/告白）
效果：最强，观众情绪被调动，必须看下一集

【悬念钩：占比20-30%】
定义：抛出未解之谜，让观众好奇答案
示例："那个神秘人究竟是谁？为什么他知道20年前的秘密？"
使用位置：谜团推进、身份揭露前
效果：强，好奇心驱动

【危机钩：占比10-20%】
定义：主角陷入绝境，让观众担心角色安危
示例："她被推下悬崖，生死未卜。而凶手正站在崖边冷笑..."
使用位置：动作戏、追杀、灾难
效果：极强，紧张感驱动

【信息钩：占比10-20%】
定义：关键信息即将揭露，让观众期待真相
示例："DNA报告出来了，结果竟是..."（画面定格在报告上）
使用位置：真相揭露前、身份确认前
效果：强，信息饥渴驱动

【反转钩：占比5-15%】
定义：剧情180度转折，颠覆观众预期
示例："原来他才是幕后黑手！而她一直信任的人，从一开始就在利用她..."
使用位置：中后期，每10集至少1次大反转
效果：最强，震撼感驱动

【钩子使用规则】
1. 每集结尾必须有且只有一个主钩子
2. 连续3集不能是同类型钩子（避免疲劳）
3. 付费卡点集必须使用情绪钩或反转钩（转化率最高）
4. 钩子必须与下集开头无缝衔接（不能突兀）`,

  /**
   * 付费卡点设计
   * 卡点位置、类型、转化率优化
   */
  paywallDesign: `## 付费卡点设计（短剧变现核心）

【卡点占比】
总集数的10-15%设为付费卡点
60集剧本：约6-9个卡点
80集剧本：约8-12个卡点
100集剧本：约10-15个卡点

【卡点位置选择（按转化率排序）】
1. 情绪阈值最高点（转化率最高，35-40%）
   示例：男女主终于相认，即将亲吻时画面定格
2. 悬念最强烈处（转化率次高，25-30%）
   示例：凶手身份即将揭露，关键证人出现
3. 危机最紧急时（转化率中高，20-25%）
   示例：女主被绑架，男主赶到时门已锁
4. 信息揭露前一刻（转化率中，15-20%）
   示例：DNA报告打开前，亲子鉴定结果即将公布
5. 反转即将发生时（转化率中，15-20%）
   示例："其实我才是..."（话未说完）

【卡点避坑】
1. 连续2集以上都是卡点（用户流失率+40%）
2. 卡点在平淡剧情上（转化率<5%）
3. 卡点过早（前10集就卡点，用户未建立粘性）
4. 卡点过晚（后5集才卡点，错过变现窗口）

【卡点前后衔接】
卡点集结尾：强钩子，画面定格/黑屏/字幕"解锁看后续"
下集开头：3秒内必须给出卡点承诺的内容（不能吊胃口太久）`,

  /**
   * 爽感矩阵（8类爽感要素配比）
   */
  satisfactionMatrix: `## 8类爽感要素配比矩阵

【打脸：被轻视→展现实力→对方震惊→跪舔】
适用题材：逆袭/复仇/职场/总裁
配比建议：逆袭类30-35%，总裁类20-25%
关键节拍：轻视（铺垫3集）→展现（1集高潮）→震惊（半集反应）→跪舔（半集收尾）

【逆袭：绝境→机遇→崛起→碾压】
适用题材：重生/穿越/励志/创业
配比建议：逆袭类35%，重生类40%
关键节拍：绝境（5集铺垫）→机遇（1集转折）→崛起（10集过程）→碾压（3集高潮）

【甜宠：误会→撒糖→小虐→大甜】
适用题材：甜宠/校园/总裁
配比建议：甜宠类40%，校园类35%
关键节拍：误会（2集）→撒糖（5集）→小虐（3集）→大甜（5集）

【虐心：相爱→阻碍→分离→重逢】
适用题材：虐恋/古风/家庭
配比建议：虐恋类30%，古风类25%
关键节拍：相爱（5集）→阻碍（10集层层加码）→分离（3集高潮）→重逢（5集后）

【悬疑：疑点→调查→反转→真相】
适用题材：悬疑/推理/刑侦
配比建议：悬疑类40%，推理类35%
关键节拍：疑点（每集1-2个）→调查（3集推进）→反转（每5集1次）→真相（最后5集）

【燃：低谷→觉醒→战斗→胜利】
适用题材：励志/军事/体育/电竞
配比建议：励志类25%，军事类30%
关键节拍：低谷（5集）→觉醒（1集转折）→战斗（10集过程）→胜利（3集高潮）

【搞笑：反差→误会→乌龙→和解】
适用题材：轻喜剧/校园/家庭
配比建议：轻喜剧类35%，校园类20%
关键节拍：反差设定（前3集）→误会（每集1-2个笑点）→乌龙（每3集1次大乌龙）→和解（每集结尾）

【感动：苦难→善意→牺牲→回报】
适用题材：温情/医疗/家庭/励志
配比建议：温情类30%，医疗类25%
关键节拍：苦难（3集铺垫）→善意（2集展现）→牺牲（1集高潮）→回报（2集收尾）

【不同题材爽感配比参考】
甜宠类：甜宠40% + 虐心20% + 打脸15% + 搞笑15% + 其他10%
逆袭类：逆袭35% + 打脸30% + 燃20% + 悬疑10% + 其他5%
悬疑类：悬疑40% + 反转25% + 打脸15% + 燃10% + 其他10%
总裁类：打脸25% + 甜宠25% + 虐心20% + 逆袭15% + 其他15%
古风类：虐心25% + 逆袭20% + 甜宠20% + 打脸15% + 悬疑10% + 其他10%`,

  /**
   * 四层反派递进体系
   */
  villainDesign: `## 四层反派递进体系（短剧反派设计核心）

【第一层：小反派·日常对抗】
出场时机：前1/4集数（1-20集）
角色定位：制造日常麻烦，推动主角行动
典型角色：
- 女主的表妹/堂妹（嫉妒女主，制造小麻烦）
- 男主的前女友/追求者（制造情感误会）
- 职场中的同事/下属（抢功劳、打小报告）
- 邻居/路人（制造生活麻烦）
作用：建立冲突氛围，让观众对主角产生同情
退场方式：被主角小打脸（不是终极清算）

【第二层：中反派·阶段威胁】
出场时机：前2/3集数（20-50集）
角色定位：制造阶段性危机，推动剧情升级
典型角色：
- 商业对手（抢项目、挖客户、恶意竞争）
- 情敌（有竞争力的追求者，不是小打小闹）
- 上司/领导（打压主角、职场PUA）
- 家族中的长辈（反对男女主关系）
作用：制造阶段性高潮，每10集左右一个小高潮
退场方式：被主角阶段性击败（但背后还有更大势力）

【第三层：大反派·核心对抗】
出场时机：中后期（50-80集）
角色定位：幕后黑手，制造核心冲突
典型角色：
- 男主/女主的家族敌人（商业世仇、政治对立）
- 犯罪集团头目（悬疑/刑侦题材）
- 终极情敌（有权有势，几乎无法战胜）
- 背叛的合伙人/朋友（创业题材）
作用：推动剧情进入风暴段，制造终极危机
退场方式：被主角终极击败（法律制裁/商业破产/身败名裂）

【第四层：隐藏反派·终极反转】
出场时机：后1/3集数（60-80集揭露，80-100集清算）
角色定位：身边最信任的人，制造最大反转
典型角色：
- 女主的闺蜜（从一开始就嫉妒女主，暗中破坏）
- 男主的兄弟/合伙人（觊觎男主的地位/财产）
- 主角的亲人（父母/兄弟姐妹，因利益背叛）
- 一直帮助主角的导师/恩人（其实是利用主角）
揭露方式：
- 线索铺垫：前60集散布微小疑点（观众 hindsight 时恍然大悟）
- 揭露时机：主角最脆弱/最成功时（打击最大）
- 揭露方式：不是直白告诉，而是通过一个意外事件让主角自己发现
作用：制造全剧最大反转，提升剧本深度和讨论度
退场方式：情感+物理双重打击（身败名裂+失去一切）

【反派设计原则】
1. 每层反派必须与前一层有联系（中反派是小反派的靠山/大反派是中反派的靠山）
2. 反派不能纯坏，必须有动机（嫉妒/利益/仇恨/爱情）
3. 反派智商必须在线，不能降智（否则打脸不爽）
4. 隐藏反派的线索必须前呼后应（不能突兀揭露）
5. 每层反派的退场必须让观众爽（打脸/逆袭/复仇）`,

  /**
   * 内容红线清单
   */
  complianceChecklist: `## 内容红线清单（合规审核必查）

【政治敏感】
- 涉及国家领导人、政治事件、军事机密的描写
- 歪曲重大历史事件、抹黑英雄人物
- 宣扬分裂主义、恐怖主义
- 使用不当的政治隐喻或影射

【违法犯罪美化】
- 吸毒、赌博、诈骗、暴力犯罪的详细过程描写
- 黑社会、走私、贩毒等行为被主角使用且不受惩罚
- 黑客攻击、网络犯罪被美化为主角能力
- 逃税、行贿等经济犯罪被合理化

【色情暴力】
- 露骨的性行为描写（即使隐晦也不行）
- 性暗示过于明显的场景（如"床戏"详细动作）
- 虐待、家暴的详细过程描写（不能展示施暴细节）
- 血腥、暴力的详细画面描写（如分尸、酷刑）

【歧视侮辱】
- 种族歧视言论或情节设定
- 性别歧视（如"女人就该在家带孩子"作为正面价值观）
- 地域歧视（如"XX地方的人都小气"）
- 职业歧视（如"清洁工就是低人一等"）
- 对残疾人、病人、弱势群体的侮辱

【封建迷信】
- 宣扬邪教、算命决定命运（玄幻题材除外，但需标注虚构）
- 传播伪科学（如"喝尿治病""辟谷成仙"）
- 过度渲染鬼怪、灵异作为真实存在（需标注虚构）

【未成年人伤害】
- 儿童/青少年遭受虐待、性侵害的详细描写
- 校园霸凌的详细过程（不能展示施暴细节）
- 诱导未成年人犯罪、早恋过度美化
- 未成年人吸烟、喝酒、纹身等行为被美化

【历史虚无】
- 歪曲重大历史事件（如歪曲抗战、解放战争）
- 抹黑英雄人物、革命先烈
- 美化侵略、殖民历史
- 否定社会主义核心价值观

【其他红线】
- 过度炫富、拜金主义作为唯一价值观
- 宣扬自杀、自残（不能展示详细过程）
- 侵犯他人隐私（如偷拍、跟踪被合理化）
- 虚假广告、虚假宣传（如"包治百病"）

【审核原则】
1. 所有红线内容必须100%删除或改写
2. 擦边内容（如暗示性内容）必须弱化到无法解读
3. 价值观必须正向（即使反派也不能宣扬错误价值观）
4. 历史题材必须标注"本故事纯属虚构"`,

  /**
   * 开篇黄金30秒（前3集结构公式）
   */
  openingRules: `## 开篇黄金30秒（前3集结构公式）

【第1集：钩子开场 + 世界观建立 + 核心人物登场 + 首集结尾悬念】
开场3秒：必须有强钩子（冲突/悬念/情绪/动作/对话）
前30秒：观众必须知道：主角是谁、核心冲突是什么、故事发生在哪
第1-3分钟：核心人物全部登场（主角+第一层反派+关键配角）
第3-5分钟：核心矛盾抛出（为什么这个故事值得看100集）
结尾：强钩子（必须是5种钩子中最强的：情绪/危机/反转）

【第2集：冲突升级 + 人物关系展开 + 首次小高潮 + 结尾留钩子】
开场：承接第1集结尾钩子（3秒内给出回应）
中段：冲突升级（第一层反派加码/新人物登场增加复杂度）
高潮：首次小高潮（小打脸/小反转/小危机）
结尾：新钩子（与第1集不同类型，避免疲劳）

【第3集：首次反转 + 核心矛盾明确 + 付费卡点（如适用）】
开场：承接第2集钩子
中段：首次反转（颠覆观众对前2集的认知，但不要太早揭露隐藏反派）
高潮：核心矛盾明确（观众清楚知道：主角要达成什么目标，阻碍是什么）
结尾：如果是付费模式，第3集可作为第一个付费卡点（此时用户已建立粘性）

【5种开场模式】

1. 冲突开场（最常用，适合90%题材）
示例："离婚吧！"（女主把离婚协议拍在桌上，男主冷笑"你确定？"）
适用：总裁/家庭/复仇/职场
效果：立即建立冲突，观众想知道为什么

2. 悬念开场（适合悬疑/推理/玄幻）
示例：一个神秘包裹放在门口，打开后是一枚20年前的戒指...
适用：悬疑/推理/穿越/重生
效果：好奇心立即被调动

3. 情绪开场（适合虐恋/温情/励志）
示例：女主跪在雨中，手里攥着病危通知书，泪水混着雨水流下...
适用：虐恋/医疗/家庭/励志
效果：情感共鸣，观众同情主角

4. 动作开场（适合动作/军事/玄幻）
示例：女主从高楼一跃而下，身后是爆炸的火光...
适用：动作/军事/玄幻/悬疑
效果：肾上腺素飙升，紧张感拉满

5. 对话开场（适合喜剧/职场/家庭）
示例："我怀孕了。" "谁的？" "你的。" "不可能，我是gay。"
适用：喜剧/职场/家庭/轻喜剧
效果：金句记忆点，轻松有趣

【开场禁忌】
1. 前30秒没有冲突/悬念/情绪（观众划走）
2. 人物太多前3集登场（观众记不住）
3. 世界观解释太长（观众不耐烦）
4. 开场与后续剧情脱节（观众感觉被骗）
5. 前3集节奏太平（观众没有追下去的动力）`
} as const;

export type KnowledgeKey = keyof typeof KNOWLEDGE_BASE;

/**
 * 按需加载知识库
 * 不同任务只加载相关文档，避免超出LLM上下文窗口
 */
export function loadKnowledgeForTask(task: string): string {
  const mapping: Record<string, KnowledgeKey[]> = {
    'script-generate': ['genreGuide', 'rhythmCurve', 'openingRules'],
    'character-design': ['villainDesign', 'genreGuide'],
    'outline-create': ['rhythmCurve', 'hookDesign', 'paywallDesign', 'villainDesign'],
    'episode-write': ['openingRules', 'hookDesign', 'satisfactionMatrix', 'rhythmCurve'],
    'script-review': ['rhythmCurve', 'hookDesign', 'satisfactionMatrix', 'complianceChecklist'],
    'compliance-check': ['complianceChecklist'],
    'paywall-design': ['paywallDesign', 'rhythmCurve', 'hookDesign'],
    'villain-design': ['villainDesign', 'genreGuide'],
  };

  const keys = mapping[task] || [];
  if (keys.length === 0) {
    // 默认加载核心知识
    return [
      KNOWLEDGE_BASE.genreGuide,
      KNOWLEDGE_BASE.rhythmCurve,
      KNOWLEDGE_BASE.hookDesign,
    ].join('

');
  }

  return keys.map(k => KNOWLEDGE_BASE[k]).join('

');
}

/**
 * 获取单份知识库（用于特定场景）
 */
export function getKnowledge(key: KnowledgeKey): string {
  return KNOWLEDGE_BASE[key];
}

/**
 * 计算知识库token数（粗略估算，用于监控）
 */
export function estimateKnowledgeTokens(task: string): number {
  const knowledge = loadKnowledgeForTask(task);
  // 粗略估算：1个中文字符≈1.5 tokens，1个英文字符≈0.5 tokens
  const chineseChars = (knowledge.match(/[一-龥]/g) || []).length;
  const otherChars = knowledge.length - chineseChars;
  return Math.ceil(chineseChars * 1.5 + otherChars * 0.5);
}
```

**验收标准**：
```bash
# 1. 构建测试
pnpm build
# 预期：0错误

# 2. 知识库内容检查
node -e "
const { loadKnowledgeForTask, estimateKnowledgeTokens } = require('./src/lib/prompt-knowledge/index.ts');
console.log('script-generate tokens:', estimateKnowledgeTokens('script-generate'));
console.log('compliance-check tokens:', estimateKnowledgeTokens('compliance-check'));
"
# 预期：script-generate约3000-5000 tokens，compliance-check约1500-2000 tokens

# 3. 内容完整性检查
grep -c "霸道总裁" src/lib/prompt-knowledge/index.ts
grep -c "四层反派" src/lib/prompt-knowledge/index.ts
grep -c "五种钩子" src/lib/prompt-knowledge/index.ts
# 预期：都有匹配
```

**回滚命令**：
```bash
git revert <commit-hash-of-p2-1>
```

---

### 任务 P2-2：改造 generate-full-script 为三阶段写作（MM-StoryAgent）

**问题描述**：
- 当前 `generate-full-script` 是"一步到位"：输入创意→输出完整剧本
- 没有中间环节质量控制，LLM容易在长篇生成中"遗忘"早期设定
- 默认只生成前3集预览，后续集数需要手动触发，流程断裂
- 没有知识库注入，生成的剧本节奏混乱、缺乏付费钩子

**修复步骤**：

#### 2.1 修改 System Prompt 注入知识库

打开 `src/app/api/ai/generate-full-script/route.ts`，在原有逻辑基础上改造：

```typescript
import { loadKnowledgeForTask, estimateKnowledgeTokens } from '@/lib/prompt-knowledge';
import { safeJsonParse } from '@/lib/safe-json'; // Phase 1创建的
import { createApiHandler } from '@/lib/api-handler'; // Phase 1创建的
import { logger } from '@/lib/logger';

// 三阶段写作配置
const STAGE_CONFIG = {
  stage1: { name: 'dialogue', label: '核心对话', maxTokens: 2000 },
  stage2: { name: 'outline', label: '完整大纲', maxTokens: 4000 },
  stage3: { name: 'episodes', label: '逐集撰写', maxTokens: 8000 },
};

// 构建带知识库的System Prompt
function buildSystemPrompt(genre: string, tone: string, audience: string): string {
  const knowledge = loadKnowledgeForTask('script-generate');
  const outlineKnowledge = loadKnowledgeForTask('outline-create');

  return `你是一位资深短剧编剧，精通以下创作方法论：

${knowledge}

${outlineKnowledge}

【当前项目要求】
题材：${genre}
受众：${audience}
调性：${tone}

【输出规范】
1. 严格遵循标准短剧格式
2. 每集包含2-5个场景
3. 每集结尾必须有钩子（情绪钩/悬念钩/危机钩/信息钩/反转钩）
4. 角色对话符合人物设定，有金句设计
5. 标注付费卡点位置（用[PAYWALL]标记）
6. 标注爽感要素类型（用[爽感:类型]标记）
7. 反派设计遵循四层递进体系
8. 节奏遵循四段式曲线`;
}

// Stage 1: 核心对话生成（快速验证创意可行性）
async function stage1Dialogue(
  config: ScriptConfig,
  systemPrompt: string
): Promise<{ dialogue: string; characters: any[] }> {
  const prompt = `【阶段1：核心对话片段】

基于以下创意，生成3-5个核心对话片段，验证创意可行性：

创意：${config.prompt || config.outline}
题材：${config.genre}
受众：${config.audience}
调性：${config.tone}

要求：
1. 每个片段展示一个关键冲突或情感高潮
2. 对话体现人物性格（通过语言风格区分角色）
3. 包含至少1个金句（让观众记住的台词）
4. 展示核心矛盾（为什么这个故事值得看100集）
5. 标注每个片段的爽感类型（打脸/甜宠/虐心/悬疑等）

输出JSON格式：
{
  "dialogues": [
    {
      "scene": "场景描述",
      "characters": ["角色A", "角色B"],
      "dialogue": "角色A：台词\n角色B：台词",
      "satisfactionType": "爽感类型",
      "emotionalPeak": "情感高潮描述",
      "goldenLine": "金句"
    }
  ],
  "characterDrafts": [
    { "name": "角色名", "archetype": "原型", "speechPattern": "语言风格", "coreDesire": "核心欲望", "coreFear": "核心恐惧" }
  ]
}`;

  const response = await aiClient.chat({
    model: config.model || 'qwen-plus',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt }
    ],
    response_format: { type: 'json_object' }
  });

  return safeJsonParse(response, 'stage1-dialogue');
}

// Stage 2: 完整大纲生成（基于对话提炼结构）
async function stage2Outline(
  config: ScriptConfig,
  systemPrompt: string,
  stage1Result: any
): Promise<{ outline: any; paywallEpisodes: number[] }> {
  const prompt = `【阶段2：完整故事大纲】

基于以下核心对话片段，生成完整的${config.totalEpisodes}集故事大纲：

核心对话片段：
${JSON.stringify(stage1Result.dialogues, null, 2)}

角色草稿：
${JSON.stringify(stage1Result.characterDrafts, null, 2)}

要求：
1. 三幕结构：入局（前20%）→ 纠缠（中间60%）→ 决战（后20%）
2. 四段式节奏曲线：起势→攀升→风暴→决战
3. 四层反派递进：小反派（前25%）→ 中反派（25-60%）→ 大反派（60-85%）→ 隐藏反派（85-100%）
4. 每集标注：集数、场景数、钩子类型、爽感要素、情感基调
5. 标注付费卡点位置（10-15%的集数，集中在风暴段）
6. 标注伏笔位置（前80集的伏笔必须在后20集回收）
7. 每5集一个中高潮，每10集一个大高潮

输出JSON格式：
{
  "title": "剧本标题",
  "genre": "题材",
  "totalEpisodes": ${config.totalEpisodes},
  "synopsis": "一句话梗概",
  "characters": [
    { "name": "角色名", "role": " protagonist/antagonist/supporting", "archetype": "原型", "arc": "角色弧线", "keyEpisodes": [1, 10, 20] }
  ],
  "episodes": [
    {
      "episodeNumber": 1,
      "title": "集标题",
      "sceneCount": 3,
      "hookType": "钩子类型",
      "satisfactionType": "爽感类型",
      "emotionalTone": "情感基调",
      "keyEvent": "关键事件",
      "isPaywall": false,
      "isCliffhanger": true,
      "foreshadowing": ["伏笔1", "伏笔2"],
      "payoff": ["回收1"]
    }
  ],
  "paywallEpisodes": [5, 12, 25, 38, 52, 65, 78],
  "structure": {
    "act1": { "start": 1, "end": 12, "goal": "建立人物关系，抛出核心矛盾" },
    "act2": { "start": 13, "end": 72, "goal": "矛盾升级，反派层层阻挠" },
    "act3": { "start": 73, "end": ${config.totalEpisodes}, "goal": "终极对抗，圆满结局" }
  }
}`;

  const response = await aiClient.chat({
    model: config.model || 'qwen-plus',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt }
    ],
    response_format: { type: 'json_object' }
  });

  return safeJsonParse(response, 'stage2-outline');
}

// Stage 3: 逐集撰写（基于大纲生成完整剧本）
async function stage3Episode(
  config: ScriptConfig,
  systemPrompt: string,
  outline: any,
  episodeNumber: number
): Promise<{ episode: any }> {
  const episodeOutline = outline.episodes.find((e: any) => e.episodeNumber === episodeNumber);
  const prevEpisode = episodeNumber > 1 
    ? outline.episodes.find((e: any) => e.episodeNumber === episodeNumber - 1)
    : null;

  const prompt = `【阶段3：第${episodeNumber}集完整剧本】

基于以下大纲，撰写第${episodeNumber}集完整剧本：

大纲信息：
${JSON.stringify(episodeOutline, null, 2)}

前集衔接：
${prevEpisode ? `第${episodeNumber - 1}集结尾：${prevEpisode.keyEvent}` : '首集'}

角色档案：
${JSON.stringify(outline.characters, null, 2)}

要求：
1. 2-5个场景，每场景标注：场景号、地点、时间、人物
2. 对话符合人物语言风格（通过用词、句式、语气区分角色）
3. 每集至少1个金句（让观众截图传播的台词）
4. 结尾必须有钩子（与大纲指定的钩子类型一致）
5. 标注爽感要素（如适用）
6. 标注付费卡点（如本集是卡点集，用[PAYWALL]标记高潮位置）
7. 场景切换自然，信息密度适中
8. 与前集衔接自然（如果是续集）

输出JSON格式：
{
  "episodeNumber": ${episodeNumber},
  "title": "集标题",
  "scenes": [
    {
      "sceneNumber": 1,
      "location": "地点",
      "time": "日/夜/晨/昏",
      "characters": ["角色A", "角色B"],
      "description": "场景描述（含动作、表情、镜头提示）",
      "dialogues": [
        { "character": "角色A", "line": "台词", "emotion": "情绪", "action": "动作" }
      ],
      "satisfactionType": "爽感类型（如有）",
      "hookType": "钩子类型（最后一集必填）"
    }
  ],
  "goldenLines": ["金句1", "金句2"],
  "isPaywall": false,
  "paywallPosition": "钩子位置描述（如适用）",
  "foreshadowing": ["本集埋下的伏笔"],
  "payoff": ["本集回收的伏笔"]
}`;

  const response = await aiClient.chat({
    model: config.model || 'qwen-plus',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt }
    ],
    response_format: { type: 'json_object' }
  });

  return safeJsonParse(response, `stage3-episode-${episodeNumber}`);
}
```

#### 2.2 改造 API 路由为 SSE 三阶段流式输出

```typescript
// 在 POST handler 中改造 SSE 输出
export const POST = createApiHandler(async (req) => {
  // ...原有认证、限流、积分检查...

  const config: ScriptConfig = await req.json();
  const systemPrompt = buildSystemPrompt(config.genre, config.tone, config.audience);

  // 估算知识库token数，记录日志
  const knowledgeTokens = estimateKnowledgeTokens('script-generate');
  logger.info({ task: 'generate-full-script', knowledgeTokens, model: config.model });

  // 创建 SSE 流
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Stage 1: 核心对话
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
          stage: 'stage1', 
          status: 'running', 
          message: '正在生成核心对话片段...' 
        })}\n\n`));

        const stage1Result = await stage1Dialogue(config, systemPrompt);
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
          stage: 'stage1', 
          status: 'completed', 
          data: stage1Result 
        })}\n\n`));

        // Stage 2: 完整大纲
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
          stage: 'stage2', 
          status: 'running', 
          message: '正在生成完整故事大纲...' 
        })}\n\n`));

        const stage2Result = await stage2Outline(config, systemPrompt, stage1Result);
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
          stage: 'stage2', 
          status: 'completed', 
          data: stage2Result 
        })}\n\n`));

        // Stage 3: 逐集撰写（默认生成前3集作为预览，可配置）
        const previewEpisodes = config.previewEpisodes || 3;
        const totalEpisodes = config.totalEpisodes || 60;

        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
          stage: 'stage3', 
          status: 'running', 
          message: `正在撰写前${previewEpisodes}集预览...`,
          totalEpisodes,
          previewEpisodes
        })}\n\n`));

        const episodes = [];
        for (let i = 1; i <= Math.min(previewEpisodes, totalEpisodes); i++) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
            stage: 'stage3', 
            status: 'progress',
            currentEpisode: i,
            totalPreview: previewEpisodes,
            message: `正在撰写第${i}集...`
          })}\n\n`));

          const episodeResult = await stage3Episode(config, systemPrompt, stage2Result.outline, i);
          episodes.push(episodeResult.episode);

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
            stage: 'stage3', 
            status: 'episode_complete',
            currentEpisode: i,
            episode: episodeResult.episode
          })}\n\n`));
        }

        // 最终输出
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
          stage: 'complete', 
          status: 'completed',
          data: {
            title: stage2Result.outline.title,
            genre: stage2Result.outline.genre,
            totalEpisodes,
            previewEpisodes,
            synopsis: stage2Result.outline.synopsis,
            characters: stage2Result.outline.characters,
            outline: stage2Result.outline.episodes,
            paywallEpisodes: stage2Result.paywallEpisodes,
            structure: stage2Result.outline.structure,
            episodes,
            stage1Dialogues: stage1Result.dialogues,
          }
        })}\n\n`));

        controller.close();
      } catch (error) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
          stage: 'error', 
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
          code: 'GENERATION_FAILED'
        })}\n\n`));
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
});
```

**关键变更说明**：
1. **保留原有接口契约**：输入格式不变（`{prompt, genre, tone, audience, totalEpisodes, model}`）
2. **输出格式增强**：SSE 流中增加 `stage` 字段（stage1/stage2/stage3/complete/error）
3. **默认前3集预览**：`previewEpisodes` 默认3，可配置，后续集数通过新API触发
4. **知识库注入**：System Prompt 自动加载 `script-generate` + `outline-create` 知识
5. **JSON解析兜底**：所有 LLM 输出使用 `safeJsonParse`（Phase 1创建）

**验收标准**：
```bash
# 1. 测试三阶段SSE流
curl -N -X POST http://localhost:3000/api/ai/generate-full-script   -H "Content-Type: application/json"   -H "Cookie: session=..."   -d '{
    "prompt": "一个被家族抛弃的女孩，凭借设计天赋逆袭成为时尚界女王，并找到真爱",
    "genre": "都市逆袭",
    "tone": "励志爽文",
    "audience": "18-35岁女性",
    "totalEpisodes": 60,
    "previewEpisodes": 3
  }'

# 预期SSE流输出：
# data: {"stage":"stage1","status":"running","message":"正在生成核心对话片段..."}
# data: {"stage":"stage1","status":"completed","data":{...}}
# data: {"stage":"stage2","status":"running","message":"正在生成完整故事大纲..."}
# data: {"stage":"stage2","status":"completed","data":{...}}
# data: {"stage":"stage3","status":"running","message":"正在撰写前3集预览...","totalEpisodes":60,"previewEpisodes":3}
# data: {"stage":"stage3","status":"progress","currentEpisode":1,...}
# data: {"stage":"stage3","status":"episode_complete","currentEpisode":1,"episode":{...}}
# ...（第2、3集类似）
# data: {"stage":"complete","status":"completed","data":{title,genre,synopsis,characters,outline,paywallEpisodes,structure,episodes,stage1Dialogues}}

# 2. 验证知识库注入
# 检查生成的剧本是否包含：
# - 四层反派递进（至少提到不同层级的反派）
# - 付费卡点标记（[PAYWALL]）
# - 爽感要素标记（[爽感:类型]）
# - 金句（对话中有记忆点台词）

# 3. 验证JSON解析兜底
# 如果LLM输出畸形JSON，应自动修复或返回详细错误
```

**回滚命令**：
```bash
git revert <commit-hash-of-p2-2>
```

---

### 任务 P2-3：新增 review-script API（五维度质量评分）

**问题描述**：
- 当前只有 `compliance-check`（合规检测），没有**质量评分**
- 用户无法知道生成的剧本质量如何，是否需要修改
- 没有量化的评分标准，无法自动判断是否需要重写

**修复步骤**：

#### 3.1 创建评分API

创建 `src/app/api/ai/review-script/route.ts`：

```typescript
import { z } from 'zod';
import { createApiHandler } from '@/lib/api-handler';
import { aiClient } from '@/lib/ai-client';
import { loadKnowledgeForTask } from '@/lib/prompt-knowledge';
import { safeJsonParse } from '@/lib/safe-json';

// 五维度评分Schema
const ReviewSchema = z.object({
  // 五个维度各10分
  rhythm: z.number().min(1).max(10).describe('节奏评分'),
  satisfaction: z.number().min(1).max(10).describe('爽点评分'),
  dialogue: z.number().min(1).max(10).describe('台词评分'),
  format: z.number().min(1).max(10).describe('格式评分'),
  continuity: z.number().min(1).max(10).describe('连贯性评分'),

  // 总分
  total: z.number().min(5).max(50).describe('总分'),

  // 评级
  rating: z.enum(['卓越', '优良', '合格', '需改进', '需重写']).describe('综合评级'),

  // 亮点（最多5个）
  highlights: z.array(z.string()).max(5).describe('剧本亮点'),

  // 问题清单
  issues: z.array(z.object({
    level: z.enum(['阻断', '建议', '微调']).describe('问题严重程度'),
    dimension: z.enum(['节奏', '爽点', '台词', '格式', '连贯性']).describe('所属维度'),
    description: z.string().describe('问题描述'),
    suggestion: z.string().describe('修改建议'),
    episodeNumber: z.number().optional().describe('问题所在集数'),
    sceneNumber: z.number().optional().describe('问题所在场景'),
  })).describe('问题清单'),

  // 修订优先级
  revisionPriority: z.array(z.object({
    priority: z.number().min(1).max(10).describe('优先级1-10'),
    issue: z.string().describe('优先修复的问题'),
    reason: z.string().describe('优先原因'),
  })).describe('修订优先级排序'),

  // 付费卡点评估
  paywallAssessment: z.object({
    totalPaywalls: z.number().describe('卡点总数'),
    strongPaywalls: z.number().describe('强卡点数量'),
    weakPaywalls: z.number().describe('弱卡点数量'),
    suggestions: z.array(z.string()).describe('卡点优化建议'),
  }).optional().describe('付费卡点评估'),

  // 反派设计评估
  villainAssessment: z.object({
    layers: z.number().min(0).max(4).describe('反派层级数'),
    isLayered: z.boolean().describe('是否遵循四层递进'),
    hiddenVillainSurprise: z.number().min(1).max(10).optional().describe('隐藏反派反转惊喜度'),
    suggestions: z.array(z.string()).describe('反派优化建议'),
  }).optional().describe('反派设计评估'),
});

export type ScriptReview = z.infer<typeof ReviewSchema>;

// 评级标准
const RATING_THRESHOLDS = [
  { min: 45, rating: '卓越' as const, label: '45-50分', description: '可直接投流，具备爆款潜质' },
  { min: 38, rating: '优良' as const, label: '38-44分', description: '质量优秀，微调后可投流' },
  { min: 30, rating: '合格' as const, label: '30-37分', description: '基本可用，需针对性修改' },
  { min: 25, rating: '需改进' as const, label: '25-29分', description: '问题较多，需大幅修改' },
  { min: 0, rating: '需重写' as const, label: '<25分', description: '建议重新创作' },
];

export const POST = createApiHandler(async (req) => {
  const { script, episodes, characters, outline, paywallEpisodes } = await req.json();

  // 加载评审知识库
  const reviewKnowledge = loadKnowledgeForTask('script-review');

  const prompt = `你是一位资深短剧剧本评审专家，请对以下剧本进行五维度质量评分。

【评审标准】
${reviewKnowledge}

【评分维度】（每项1-10分，总分50分）

1. 节奏（10分）：
   - 场景切换节奏是否流畅
   - 信息密度是否适中（不拖沓不跳跃）
   - 前30秒是否能抓住观众
   - 每集结尾是否有有效钩子
   - 四段式节奏曲线是否合理

2. 爽点（10分）：
   - 爽感要素密度是否足够（每集至少1个）
   - 情绪高潮设计是否到位
   - 观众满足感是否强烈
   - 打脸/逆袭/甜宠等要素是否充分
   - 付费卡点位置是否 optimal

3. 台词（10分）：
   - 人物语言是否个性化（不同角色说话方式不同）
   - 是否有金句（让观众截图传播的台词）
   - 对话是否自然（不尬不啰嗦）
   - 画外音/旁白使用是否得当
   - 台词是否推动剧情（不是废话）

4. 格式（10分）：
   - 镜头语言是否规范（景别/运镜/灯光标注）
   - 配乐提示是否恰当
   - 场景头标注是否清晰（地点/时间/人物）
   - 角色标注是否一致
   - 是否符合标准短剧格式

5. 连贯性（10分）：
   - 与角色档案是否一致（性格/外貌/行为不崩）
   - 前后集衔接是否自然
   - 伏笔是否有效回收（前80集伏笔后20集回收）
   - 时间线是否合理
   - 剧情逻辑是否自洽（无硬伤）

【评级标准】
45-50分：卓越（可直接投流，具备爆款潜质）
38-44分：优良（质量优秀，微调后可投流）
30-37分：合格（基本可用，需针对性修改）
25-29分：需改进（问题较多，需大幅修改）
<25分：需重写（建议重新创作）

【待评审剧本】
${script || JSON.stringify(episodes, null, 2)}

【角色档案】
${JSON.stringify(characters, null, 2)}

${outline ? `【大纲信息】\n${JSON.stringify(outline, null, 2)}` : ''}

${paywallEpisodes ? `【付费卡点位置】\n${JSON.stringify(paywallEpisodes)}` : ''}

请按JSON格式输出评审结果。`;

  const response = await aiClient.chat({
    model: 'qwen-plus',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' }
  });

  const parsed = safeJsonParse(response, 'script-review');
  const review = ReviewSchema.parse(parsed);

  // 验证总分计算
  const calculatedTotal = review.rhythm + review.satisfaction + review.dialogue + review.format + review.continuity;
  if (Math.abs(calculatedTotal - review.total) > 1) {
    logger.warn({ 
      message: '总分计算不一致', 
      calculated: calculatedTotal, 
      returned: review.total 
    });
    review.total = calculatedTotal;
  }

  // 验证评级匹配
  const expectedRating = RATING_THRESHOLDS.find(t => review.total >= t.min)?.rating || '需重写';
  if (review.rating !== expectedRating) {
    logger.warn({ 
      message: '评级不匹配', 
      expected: expectedRating, 
      returned: review.rating 
    });
    review.rating = expectedRating;
  }

  return review;
});
```

#### 3.2 在剧本生成后自动触发评分（可选增强）

在 `generate-full-script` 的 Stage 3 完成后，可选择自动调用评分：

```typescript
// 在 stage3 完成后，自动评审前3集
const reviewResult = await reviewScript({
  episodes: episodes.slice(0, 3),
  characters: stage2Result.outline.characters,
  outline: stage2Result.outline,
  paywallEpisodes: stage2Result.paywallEpisodes,
});

// 如果评分<30分（合格线），在SSE流中提示
if (reviewResult.total < 30) {
  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
    stage: 'review_warning', 
    status: 'warning',
    message: `前3集评分${reviewResult.total}分（${reviewResult.rating}），建议优化后再继续`,
    review: reviewResult
  })}\n\n`));
}
```

**验收标准**：
```bash
# 1. 测试五维度评分
curl -X POST http://localhost:3000/api/ai/review-script   -H "Content-Type: application/json"   -H "Cookie: session=..."   -d '{
    "episodes": [
      {
        "episodeNumber": 1,
        "title": "被抛弃的新娘",
        "scenes": [
          {
            "sceneNumber": 1,
            "location": "婚礼现场",
            "time": "日",
            "characters": ["林婉儿", "顾景深"],
            "description": "婚礼现场，林婉儿穿着婚纱等待新郎",
            "dialogues": [
              {"character": "林婉儿", "line": "景深，你终于来了", "emotion": "期待", "action": "整理婚纱"},
              {"character": "顾景深", "line": "对不起，我不能娶你", "emotion": "冷漠", "action": "转身离开"}
            ]
          }
        ]
      }
    ],
    "characters": [
      {"name": "林婉儿", "role": "protagonist", "archetype": "逆袭女主"},
      {"name": "顾景深", "role": "antagonist", "archetype": "冷酷总裁"}
    ]
  }'

# 预期返回：
# {
#   "rhythm": 7,
#   "satisfaction": 6,
#   "dialogue": 8,
#   "format": 7,
#   "continuity": 7,
#   "total": 35,
#   "rating": "合格",
#   "highlights": ["开场冲突强烈", "对话简洁有力"],
#   "issues": [
#     {"level": "建议", "dimension": "爽点", "description": "第1集爽点不足", "suggestion": "增加打脸或反转要素"}
#   ],
#   "revisionPriority": [...]
# }

# 2. 验证评分计算
# rhythm + satisfaction + dialogue + format + continuity = total

# 3. 验证评级匹配
# total=35 → rating应为"合格"
```

**回滚命令**：
```bash
git revert <commit-hash-of-p2-3>
```

---

### 任务 P2-4：注入 SkyReels 33种表情 + 400+动作语义库

**问题描述**：
- 当前生图/生视频提示词中只有基础动作描述（"微笑"、"哭泣"）
- 没有专业影视表情和动作术语
- 生成的角色表演单一、缺乏层次，没有"电影感"

**修复步骤**：

#### 4.1 创建表情动作库

创建 `src/lib/prompt-engineering/expression-library.ts`：

```typescript
/**
 * SkyReels-V1 影视级表情与动作语义库
 * 来源：SkyworkAI/SkyReels-V1（基于1000万+影视片段训练数据）
 * 用途：为角色生图/生视频提示词注入专业影视表演术语
 */

// ============================================
// 33种面部表情（基于SkyReels训练数据标注）
// ============================================

export interface ExpressionConfig {
  name: string;           // 中文名称
  englishName: string;    // 英文名称（用于提示词）
  description: string;      // 详细描述（用于提示词构建）
  intensity: number;        // 强度 0-1
  category: 'positive' | 'negative' | 'neutral' | 'complex' | 'micro';
  suitableScenes: string[]; // 适用场景
}

export const FACIAL_EXPRESSIONS: Record<string, ExpressionConfig> = {
  // 基础情绪（6种）
  neutral: {
    name: '平静',
    englishName: 'neutral expression',
    description: '面部放松，无特定情绪表达，眼神平静，嘴角自然闭合',
    intensity: 0,
    category: 'neutral',
    suitableScenes: ['日常对话', '思考', '等待', '观察'],
  },
  slight_smile: {
    name: '微微笑',
    englishName: 'slight smile',
    description: '嘴角轻微上扬2-3毫米，眼神温和，面部肌肉轻微牵动，含蓄而温暖',
    intensity: 0.3,
    category: 'positive',
    suitableScenes: ['初次见面', '礼貌回应', '内心喜悦但克制', '温柔时刻'],
  },
  smile: {
    name: '微笑',
    englishName: 'warm smile',
    description: '嘴角上扬，眼睛微眯形成笑纹，牙齿微露，面部肌肉自然舒展',
    intensity: 0.5,
    category: 'positive',
    suitableScenes: ['开心时刻', '恋爱场景', '和解', '庆祝'],
  },
  broad_smile: {
    name: '大笑',
    englishName: 'broad smile',
    description: '嘴角大幅上扬，牙齿明显显露，眼角皱纹深刻，面部肌肉充分舒展',
    intensity: 0.8,
    category: 'positive',
    suitableScenes: ['极度开心', '听到好消息', '庆祝胜利', '喜剧场景'],
  },
  laugh: {
    name: '欢笑',
    englishName: 'laughing',
    description: '嘴巴张开，牙齿显露，眼睛眯成缝，面部肌肉剧烈活动，可能伴随身体动作',
    intensity: 1.0,
    category: 'positive',
    suitableScenes: ['喜剧高潮', '极度开心', '恶作剧成功', '聚会'],
  },

  // 负面情绪（8种）
  frown: {
    name: '皱眉',
    englishName: 'frowning',
    description: '眉头紧锁，眉心出现皱纹，嘴角下撇，眼神凝重，表达不满或担忧',
    intensity: 0.4,
    category: 'negative',
    suitableScenes: ['不满', '担忧', '思考难题', '听到坏消息'],
  },
  sad: {
    name: '悲伤',
    englishName: 'sad expression',
    description: '嘴角下撇，眼神下垂，眉头微蹙，面部肌肉松弛，整体情绪低沉',
    intensity: 0.6,
    category: 'negative',
    suitableScenes: ['失恋', '离别', '失败', '回忆痛苦'],
  },
  heartbroken: {
    name: '心碎',
    englishName: 'heartbroken',
    description: '眼泪盈眶但未流出，面部肌肉松弛无力，眼神空洞，嘴角微微颤抖',
    intensity: 0.9,
    category: 'negative',
    suitableScenes: ['被背叛', '失去至亲', '绝望', '分手'],
  },
  crying: {
    name: '哭泣',
    englishName: 'crying',
    description: '眼泪流下，面部扭曲，嘴巴张开或紧咬，身体可能伴随颤抖',
    intensity: 0.8,
    category: 'negative',
    suitableScenes: ['极度悲伤', '崩溃', '发泄', '感动落泪'],
  },
  angry: {
    name: '愤怒',
    englishName: 'angry expression',
    description: '眉头紧锁，眼神锐利如刀，嘴角紧绷或咬牙切齿，面部肌肉紧张',
    intensity: 0.9,
    category: 'negative',
    suitableScenes: ['被挑衅', '背叛揭露', '正义被践踏', '复仇时刻'],
  },
  furious: {
    name: '暴怒',
    englishName: 'furious',
    description: '面部扭曲，瞪大眼睛，咬牙切齿，额头青筋暴起，呼吸急促的表情',
    intensity: 1.0,
    category: 'negative',
    suitableScenes: ['终极背叛', '至亲被害', '忍无可忍', '爆发'],
  },
  disgusted: {
    name: '厌恶',
    englishName: 'disgusted',
    description: '鼻子皱起，嘴角下撇，眼神轻蔑，面部肌肉收缩，表达强烈反感',
    intensity: 0.6,
    category: 'negative',
    suitableScenes: ['看到恶心事物', '被侮辱', '对反派行为反感'],
  },
  contempt: {
    name: '轻蔑',
    englishName: 'contemptuous',
    description: '单侧嘴角上扬，眼神斜视，眉毛微挑，表达不屑和优越感',
    intensity: 0.5,
    category: 'negative',
    suitableScenes: ['看不起对手', '嘲讽', '上位者姿态', '打脸前'],
  },

  // 惊讶情绪（3种）
  surprised: {
    name: '惊讶',
    englishName: 'surprised',
    description: '眼睛睁大，嘴巴微张，眉毛上扬，面部肌肉瞬间紧张后放松',
    intensity: 0.7,
    category: 'complex',
    suitableScenes: ['意外消息', '突然事件', '发现秘密'],
  },
  shocked: {
    name: '震惊',
    englishName: 'shocked',
    description: '眼睛瞪大瞳孔收缩，嘴巴大张，面部僵硬，身体可能后仰',
    intensity: 0.9,
    category: 'complex',
    suitableScenes: ['真相揭露', '重大反转', '意外死亡', '难以置信'],
  },
  stunned: {
    name: '呆住',
    englishName: 'stunned',
    description: '眼睛睁大但无神，嘴巴微张，面部肌肉完全僵硬，仿佛时间静止',
    intensity: 0.8,
    category: 'complex',
    suitableScenes: ['巨大打击', '无法反应', '大脑空白'],
  },

  // 恐惧情绪（3种）
  fearful: {
    name: '恐惧',
    englishName: 'fearful',
    description: '眼睛睁大，瞳孔收缩，嘴巴微张，面部肌肉紧张，身体可能后退',
    intensity: 0.8,
    category: 'negative',
    suitableScenes: ['遇到危险', '被威胁', '看到恐怖事物'],
  },
  terrified: {
    name: '惊恐',
    englishName: 'terrified',
    description: '面部扭曲，眼睛瞪大，呼吸急促的表情，可能伴随尖叫口型',
    intensity: 1.0,
    category: 'negative',
    suitableScenes: ['生命威胁', '极度恐怖', '绝望逃生'],
  },
  anxious: {
    name: '焦虑',
    englishName: 'anxious',
    description: '眉头微蹙，眼神游移，嘴角紧绷，面部肌肉轻微颤抖，坐立不安的表情',
    intensity: 0.5,
    category: 'negative',
    suitableScenes: ['等待结果', '担心', '紧张', '不确定'],
  },

  // 复杂情绪（6种）
  thoughtful: {
    name: '沉思',
    englishName: 'thoughtful',
    description: '眼神凝视远方，眉头微蹙，嘴角放松，手指可能轻触下巴或嘴唇',
    intensity: 0.3,
    category: 'complex',
    suitableScenes: ['思考对策', '回忆', '规划', '怀疑'],
  },
  confused: {
    name: '困惑',
    englishName: 'confused',
    description: '眉头微蹙，眼神游移，嘴巴微张或轻咬嘴唇，头部微倾',
    intensity: 0.4,
    category: 'complex',
    suitableScenes: ['听到矛盾信息', '不理解', '迷茫', '被误导'],
  },
  suspicious: {
    name: '怀疑',
    englishName: 'suspicious',
    description: '眼睛微眯，单侧眉毛上扬，嘴角紧绷，眼神审视对方',
    intensity: 0.5,
    category: 'complex',
    suitableScenes: ['发现疑点', '不信任', '调查', '试探'],
  },
  determined: {
    name: '坚定',
    englishName: 'determined',
    description: '眼神坚定直视前方，下巴微抬，嘴角紧绷，面部肌肉刚毅',
    intensity: 0.6,
    category: 'complex',
    suitableScenes: ['下定决心', '战斗前', '宣誓', '不屈'],
  },
  resigned: {
    name: '认命',
    englishName: 'resigned',
    description: '眼神空洞，嘴角下撇，面部肌肉松弛，肩膀微垂（通过姿态暗示）',
    intensity: 0.5,
    category: 'complex',
    suitableScenes: ['接受失败', '放弃', '无奈', '妥协'],
  },
  hopeful: {
    name: '期待',
    englishName: 'hopeful',
    description: '眼睛明亮，嘴角微微上扬，面部肌肉放松但专注，眼神看向远方',
    intensity: 0.6,
    category: 'positive',
    suitableScenes: ['等待好消息', '憧憬未来', '即将成功', '重逢前'],
  },

  // 特殊情绪（4种）
  flirtatious: {
    name: '挑逗',
    englishName: 'flirtatious',
    description: '眼神妩媚，嘴角单侧上扬，眨眼，头部微倾，手指可能轻触嘴唇',
    intensity: 0.6,
    category: 'complex',
    suitableScenes: ['调情', '诱惑', '暧昧', '勾引'],
  },
  embarrassed: {
    name: '尴尬',
    englishName: 'embarrassed',
    description: '眼神游移，嘴角抽搐，面部微红，可能伴随挠头或摸鼻子动作',
    intensity: 0.5,
    category: 'complex',
    suitableScenes: ['被揭穿', '出丑', '误会', '说错话'],
  },
  shy: {
    name: '害羞',
    englishName: 'shy',
    description: '眼神低垂，嘴角微扬，面部泛红，手指可能绞在一起',
    intensity: 0.4,
    category: 'positive',
    suitableScenes: ['告白', '被夸奖', '初次亲密', '暗恋被发现'],
  },
  arrogant: {
    name: '傲慢',
    englishName: 'arrogant',
    description: '下巴抬高，眼神俯视，嘴角轻蔑上扬，面部肌肉紧绷，表达优越感',
    intensity: 0.6,
    category: 'negative',
    suitableScenes: ['上位者', '看不起人', '炫耀', '打脸前'],
  },

  // 微表情（3种）
  micro_twitch: {
    name: '微抽搐',
    englishName: 'micro twitch',
    description: '面部肌肉轻微抽搐（眼角/嘴角），眼神闪烁，表达内心剧烈波动但表面克制',
    intensity: 0.3,
    category: 'micro',
    suitableScenes: ['强忍情绪', '内心挣扎', '克制愤怒', '隐藏悲伤'],
  },
  lip_bite: {
    name: '咬唇',
    englishName: 'lip biting',
    description: '下唇轻咬，眼神专注或游移，表达紧张、诱惑或克制',
    intensity: 0.4,
    category: 'micro',
    suitableScenes: ['紧张', '诱惑', '克制', '犹豫'],
  },
  eye_roll: {
    name: '翻白眼',
    englishName: 'eye rolling',
    description: '眼球上翻，表达无奈、讽刺、不屑或无语',
    intensity: 0.5,
    category: 'micro',
    suitableScenes: ['无语', '讽刺', '无奈', '对愚蠢行为反应'],
  },
};

// ============================================
// 400+动作语义单元（精选常用，按场景分类）
// ============================================

export interface ActionConfig {
  name: string;
  englishName: string;
  description: string;
  category: 'posture' | 'movement' | 'emotional' | 'interaction' | 'dramatic' | 'daily';
  intensity: number; // 0-1
  suitableExpressions: string[]; // 配套表情
}

export const ACTION_SEMANTICS: Record<string, ActionConfig> = {
  // 基础姿态（6种）
  stand: {
    name: '站立',
    englishName: 'standing',
    description: '双脚站立，身体直立，重心均匀分布，肩膀自然下垂',
    category: 'posture',
    intensity: 0,
    suitableExpressions: ['neutral', 'determined', 'angry'],
  },
  sit: {
    name: '坐姿',
    englishName: 'sitting',
    description: '臀部着地，背部可能挺直或放松，双腿自然放置或交叉',
    category: 'posture',
    intensity: 0,
    suitableExpressions: ['neutral', 'thoughtful', 'sad'],
  },
  lean: {
    name: '倚靠',
    englishName: 'leaning',
    description: '身体倚靠在墙壁/栏杆/家具上，姿态放松或慵懒',
    category: 'posture',
    intensity: 0.2,
    suitableExpressions: ['contempt', 'relaxed', 'thoughtful'],
  },
  cross_arms: {
    name: '抱臂',
    englishName: 'crossing arms',
    description: '双臂交叉抱于胸前，表达防御、自信或拒绝',
    category: 'posture',
    intensity: 0.3,
    suitableExpressions: ['contempt', 'determined', 'angry', 'defensive'],
  },
  hands_on_hips: {
    name: '叉腰',
    englishName: 'hands on hips',
    description: '双手叉腰，手肘外展，表达自信、愤怒或准备行动',
    category: 'posture',
    intensity: 0.4,
    suitableExpressions: ['angry', 'determined', 'arrogant'],
  },
  hands_in_pockets: {
    name: '插兜',
    englishName: 'hands in pockets',
    description: '双手插在裤兜或衣兜中，姿态放松或掩饰紧张',
    category: 'posture',
    intensity: 0.2,
    suitableExpressions: ['neutral', 'contempt', 'nervous'],
  },

  // 基础移动（6种）
  walk: {
    name: '行走',
    englishName: 'walking',
    description: '双脚交替前进，步伐速度表达情绪（慢=沉重/快=急切）',
    category: 'movement',
    intensity: 0.2,
    suitableExpressions: ['neutral', 'determined', 'anxious'],
  },
  run: {
    name: '奔跑',
    englishName: 'running',
    description: '快速移动，身体前倾，双臂摆动，表达急切或逃生',
    category: 'movement',
    intensity: 0.7,
    suitableExpressions: ['terrified', 'determined', 'anxious', 'hopeful'],
  },
  pace: {
    name: '踱步',
    englishName: 'pacing',
    description: '来回走动，步伐急促，表达焦虑、思考或等待',
    category: 'movement',
    intensity: 0.4,
    suitableExpressions: ['anxious', 'thoughtful', 'angry'],
  },
  stride: {
    name: '大步走',
    englishName: 'striding',
    description: '大步流星，步伐坚定有力，表达自信或决心',
    category: 'movement',
    intensity: 0.5,
    suitableExpressions: ['determined', 'arrogant', 'angry'],
  },
  sneak: {
    name: '潜行',
    englishName: 'sneaking',
    description: '身体压低，脚步轻盈，表达隐秘、跟踪或潜入',
    category: 'movement',
    intensity: 0.4,
    suitableExpressions: ['suspicious', 'fearful', 'determined'],
  },
  stumble: {
    name: '踉跄',
    englishName: 'stumbling',
    description: '脚步不稳，身体摇晃，表达醉酒、虚弱或受打击',
    category: 'movement',
    intensity: 0.5,
    suitableExpressions: ['sad', 'heartbroken', 'terrified', 'drunk'],
  },

  // 情绪动作（8种）
  clench_fist: {
    name: '握拳',
    englishName: 'clenching fist',
    description: '双手紧握成拳，表达愤怒、决心或忍耐',
    category: 'emotional',
    intensity: 0.6,
    suitableExpressions: ['angry', 'furious', 'determined', 'sad'],
  },
  touch_face: {
    name: '摸脸',
    englishName: 'touching face',
    description: '手触面部（脸颊/额头/下巴），表达思考、不安或掩饰',
    category: 'emotional',
    intensity: 0.3,
    suitableExpressions: ['thoughtful', 'confused', 'sad', 'shy'],
  },
  wipe_tear: {
    name: '擦泪',
    englishName: 'wiping tear',
    description: '手指轻拭眼角泪水，表达悲伤但克制',
    category: 'emotional',
    intensity: 0.5,
    suitableExpressions: ['sad', 'heartbroken', 'crying'],
  },
  cover_mouth: {
    name: '捂嘴',
    englishName: 'covering mouth',
    description: '手捂嘴巴，表达震惊、抑制尖叫或隐藏情绪',
    category: 'emotional',
    intensity: 0.6,
    suitableExpressions: ['shocked', 'surprised', 'terrified'],
  },
  hold_head: {
    name: '抱头',
    englishName: 'holding head',
    description: '双手抱头，表达崩溃、绝望或极度痛苦',
    category: 'emotional',
    intensity: 0.8,
    suitableExpressions: ['heartbroken', 'terrified', 'furious', 'crying'],
  },
  adjust_clothes: {
    name: '整理衣服',
    englishName: 'adjusting clothes',
    description: '整理衣领/袖口/裙摆，表达紧张、准备或掩饰不安',
    category: 'emotional',
    intensity: 0.3,
    suitableExpressions: ['anxious', 'nervous', 'shy', 'determined'],
  },
  tremble: {
    name: '颤抖',
    englishName: 'trembling',
    description: '身体轻微或剧烈颤抖，表达寒冷、恐惧或情绪激动',
    category: 'emotional',
    intensity: 0.6,
    suitableExpressions: ['fearful', 'terrified', 'heartbroken', 'angry'],
  },
  sigh: {
    name: '叹气',
    englishName: 'sighing',
    description: '深呼气，肩膀下沉，表达无奈、疲惫或释然',
    category: 'emotional',
    intensity: 0.3,
    suitableExpressions: ['resigned', 'sad', 'tired', 'relieved'],
  },

  // 互动动作（8种）
  point: {
    name: '指向',
    englishName: 'pointing',
    description: '手指指向某处或某人，表达指责、指示或强调',
    category: 'interaction',
    intensity: 0.5,
    suitableExpressions: ['angry', 'determined', 'contempt', 'surprised'],
  },
  grab: {
    name: '抓取',
    englishName: 'grabbing',
    description: '手部抓握动作，表达控制、抢夺或挽留',
    category: 'interaction',
    intensity: 0.6,
    suitableExpressions: ['angry', 'determined', 'fearful', 'desperate'],
  },
  push: {
    name: '推',
    englishName: 'pushing',
    description: '手掌向前推出，表达拒绝、攻击或推开',
    category: 'interaction',
    intensity: 0.6,
    suitableExpressions: ['angry', 'disgusted', 'furious', 'defensive'],
  },
  pull: {
    name: '拉',
    englishName: 'pulling',
    description: '手臂向后拉扯，表达挽留、拖拽或保护',
    category: 'interaction',
    intensity: 0.5,
    suitableExpressions: ['desperate', 'fearful', 'determined', 'sad'],
  },
  embrace: {
    name: '拥抱',
    englishName: 'embracing',
    description: '双臂环绕对方身体，表达爱意、安慰或告别',
    category: 'interaction',
    intensity: 0.5,
    suitableExpressions: ['happy', 'sad', 'relieved', 'loving'],
  },
  hold_face: {
    name: '捧脸',
    englishName: 'holding face',
    description: '双手轻捧对方面颊，表达深情、安慰或即将亲吻',
    category: 'interaction',
    intensity: 0.6,
    suitableExpressions: ['loving', 'sad', 'tender', 'passionate'],
  },
  slap: {
    name: '扇巴掌',
    englishName: 'slapping',
    description: '手掌快速击打面部，表达愤怒、羞辱或惩罚',
    category: 'interaction',
    intensity: 0.9,
    suitableExpressions: ['furious', 'contempt', 'angry', 'shocked'],
  },
  kneel: {
    name: '下跪',
    englishName: 'kneeling',
    description: '单膝或双膝着地，表达恳求、求婚、臣服或绝望',
    category: 'interaction',
    intensity: 0.8,
    suitableExpressions: ['desperate', 'loving', 'resigned', 'hopeful'],
  },

  // 戏剧性动作（8种）
  fall: {
    name: '跌倒',
    englishName: 'falling',
    description: '身体失去平衡倒下，表达受打击、虚弱或意外',
    category: 'dramatic',
    intensity: 0.7,
    suitableExpressions: ['shocked', 'terrified', 'heartbroken', 'surprised'],
  },
  collapse: {
    name: '瘫倒',
    englishName: 'collapsing',
    description: '身体无力瘫软倒下，表达崩溃、昏迷或极度虚弱',
    category: 'dramatic',
    intensity: 0.9,
    suitableExpressions: ['heartbroken', 'terrified', 'exhausted', 'fainting'],
  },
  throw: {
    name: '摔东西',
    englishName: 'throwing object',
    description: '将物品用力摔出或砸碎，表达愤怒、绝望或发泄',
    category: 'dramatic',
    intensity: 0.8,
    suitableExpressions: ['furious', 'angry', 'desperate', 'heartbroken'],
  },
  smash: {
    name: '砸碎',
    englishName: 'smashing',
    description: '用拳头或物品砸碎玻璃/桌面等，表达极致愤怒或决心',
    category: 'dramatic',
    intensity: 0.9,
    suitableExpressions: ['furious', 'determined', 'heartbroken'],
  },
  tear: {
    name: '撕毁',
    englishName: 'tearing',
    description: '将纸张/照片/合同等撕碎，表达决裂、愤怒或告别',
    category: 'dramatic',
    intensity: 0.7,
    suitableExpressions: ['angry', 'heartbroken', 'determined', 'resigned'],
  },
  climb: {
    name: '攀爬',
    englishName: 'climbing',
    description: '攀爬墙壁/楼梯/悬崖等，表达逃生、追求或挑战',
    category: 'dramatic',
    intensity: 0.7,
    suitableExpressions: ['determined', 'fearful', 'desperate', 'hopeful'],
  },
  jump: {
    name: '跳跃',
    englishName: 'jumping',
    description: '从高处跃下或跳起，表达逃生、自杀、激动或庆祝',
    category: 'dramatic',
    intensity: 0.8,
    suitableExpressions: ['terrified', 'determined', 'hopeful', 'desperate'],
  },
  crawl: {
    name: '爬行',
    englishName: 'crawling',
    description: '身体贴地爬行，表达逃生、受伤、卑微或隐秘',
    category: 'dramatic',
    intensity: 0.7,
    suitableExpressions: ['terrified', 'desperate', 'fearful', 'determined'],
  },

  // 日常动作（4种）
  drink: {
    name: '喝水/喝酒',
    englishName: 'drinking',
    description: '手持杯子饮用，表达平静、掩饰紧张或借酒消愁',
    category: 'daily',
    intensity: 0.2,
    suitableExpressions: ['neutral', 'sad', 'anxious', 'thoughtful'],
  },
  eat: {
    name: '进食',
    englishName: 'eating',
    description: '手持餐具进食，表达日常、庆祝或心不在焉',
    category: 'daily',
    intensity: 0.2,
    suitableExpressions: ['neutral', 'happy', 'sad', 'distracted'],
  },
  read: {
    name: '阅读',
    englishName: 'reading',
    description: '手持书本/文件/手机阅读，表达专注、思考或发现秘密',
    category: 'daily',
    intensity: 0.2,
    suitableExpressions: ['thoughtful', 'surprised', 'shocked', 'neutral'],
  },
  write: {
    name: '书写',
    englishName: 'writing',
    description: '手持笔书写或签名，表达记录、签署合同或留下遗言',
    category: 'daily',
    intensity: 0.3,
    suitableExpressions: ['determined', 'sad', 'thoughtful', 'resigned'],
  },
};

// ============================================
// 提示词构建工具函数
// ============================================

/**
 * 构建角色表情+动作提示词
 * 用于生图/生视频的 prompt 构建
 */
export function buildExpressionPrompt(
  expressionKey: string,
  actionKey: string,
  intensity?: number
): string {
  const expr = FACIAL_EXPRESSIONS[expressionKey];
  const act = ACTION_SEMANTICS[actionKey];

  if (!expr || !act) return '';

  const finalIntensity = intensity !== undefined ? intensity : expr.intensity;

  return `${expr.englishName}, ${act.englishName}. 
${expr.description} 
${act.description}
Intensity: ${(finalIntensity * 100).toFixed(0)}%.
The character's face and body language are perfectly synchronized, showing authentic human emotion.
Detailed skin texture, natural muscle movement, professional film lighting, cinematic quality.`;
}

/**
 * 根据场景类型推荐表情+动作组合
 */
export function recommendExpressionAction(sceneType: string): Array<{expression: string; action: string; reason: string}> {
  const recommendations: Record<string, Array<{expression: string; action: string; reason: string}>> = {
    '告白': [
      { expression: 'shy', action: 'hold_face', reason: '害羞+捧脸=深情告白经典组合' },
      { expression: 'hopeful', action: 'stand', reason: '期待+站立=紧张等待回应' },
    ],
    '分手': [
      { expression: 'heartbroken', action: 'wipe_tear', reason: '心碎+擦泪=克制悲伤' },
      { expression: 'sad', action: 'turn_away', reason: '悲伤+转身=决绝告别' },
    ],
    '打脸': [
      { expression: 'contempt', action: 'cross_arms', reason: '轻蔑+抱臂=上位者姿态' },
      { expression: 'shocked', action: 'step_back', reason: '震惊+后退=被打脸反应' },
    ],
    '复仇': [
      { expression: 'determined', action: 'clench_fist', reason: '坚定+握拳=决心复仇' },
      { expression: 'furious', action: 'point', reason: '暴怒+指向=终极控诉' },
    ],
    '重逢': [
      { expression: 'surprised', action: 'cover_mouth', reason: '惊讶+捂嘴=难以置信' },
      { expression: 'hopeful', action: 'run', reason: '期待+奔跑=急切重逢' },
    ],
    '危机': [
      { expression: 'terrified', action: 'tremble', reason: '惊恐+颤抖=极度恐惧' },
      { expression: 'fearful', action: 'grab', reason: '恐惧+抓取=求生本能' },
    ],
    '阴谋揭露': [
      { expression: 'shocked', action: 'stumble', reason: '震惊+踉跄=巨大打击' },
      { expression: 'suspicious', action: 'point', reason: '怀疑+指向=指控揭露' },
    ],
    '胜利': [
      { expression: 'broad_smile', action: 'hands_on_hips', reason: '大笑+叉腰=胜利姿态' },
      { expression: 'determined', action: 'stride', reason: '坚定+大步=王者归来' },
    ],
  };

  return recommendations[sceneType] || [
    { expression: 'neutral', action: 'stand', reason: '默认组合' }
  ];
}

/**
 * 获取所有表情名称（用于UI选择器）
 */
export function getExpressionList(): Array<{key: string; name: string; category: string; intensity: number}> {
  return Object.entries(FACIAL_EXPRESSIONS).map(([key, config]) => ({
    key,
    name: config.name,
    category: config.category,
    intensity: config.intensity,
  }));
}

/**
 * 获取所有动作名称（用于UI选择器）
 */
export function getActionList(): Array<{key: string; name: string; category: string; intensity: number}> {
  return Object.entries(ACTION_SEMANTICS).map(([key, config]) => ({
    key,
    name: config.name,
    category: config.category,
    intensity: config.intensity,
  }));
}
```

**验收标准**：
```bash
# 1. 构建测试
pnpm build
# 预期：0错误

# 2. 验证表情数量
node -e "
const { FACIAL_EXPRESSIONS, ACTION_SEMANTICS } = require('./src/lib/prompt-engineering/expression-library.ts');
console.log('Expressions:', Object.keys(FACIAL_EXPRESSIONS).length);
console.log('Actions:', Object.keys(ACTION_SEMANTICS).length);
"
# 预期：Expressions >= 33, Actions >= 40

# 3. 验证提示词构建
node -e "
const { buildExpressionPrompt } = require('./src/lib/prompt-engineering/expression-library.ts');
console.log(buildExpressionPrompt('angry', 'clench_fist'));
"
# 预期：输出包含 "angry expression, clenching fist" 和详细描述

# 4. 验证场景推荐
node -e "
const { recommendExpressionAction } = require('./src/lib/prompt-engineering/expression-library.ts');
console.log(recommendExpressionAction('告白'));
"
# 预期：返回 [{expression:'shy', action:'hold_face', reason:'...'}, ...]
```

**回滚命令**：
```bash
git revert <commit-hash-of-p2-4>
```

---

### 任务 P2-5：SkyReels 影视级提示词模板

**问题描述**：
- 当前视频生成提示词是简单场景描述，缺乏 FPS、运镜、灯光、构图等专业参数
- 没有景别、摄像机运动、灯光设置等影视术语
- 生成的视频缺乏"电影感"

**修复步骤**：

#### 5.1 创建影视级提示词模板

创建 `src/lib/prompt-engineering/video-prompt.ts`：

```typescript
/**
 * SkyReels-V1 影视级视频提示词模板
 * 来源：SkyworkAI/SkyReels-V1（基于1000万+影视片段训练）
 * 核心规范：提示词必须以 "FPS-24, " 开头
 */

// ============================================
// 景别（Shot Type）
// ============================================

export const SHOT_TYPES = {
  EXTREME_CLOSE_UP: {
    name: '大特写',
    english: 'extreme close-up',
    description: '聚焦面部局部（眼睛/嘴唇/手指），强调细节和情绪',
    useCase: '情绪高潮、关键细节、眼神变化',
  },
  CLOSE_UP: {
    name: '特写',
    english: 'close-up',
    description: '头部和肩膀，强调面部表情',
    useCase: '对话、情绪表达、反应镜头',
  },
  MEDIUM_CLOSE_UP: {
    name: '近景',
    english: 'medium close-up',
    description: '胸部以上，兼顾表情和姿态',
    useCase: '对话、单人表演',
  },
  MEDIUM_SHOT: {
    name: '中景',
    english: 'medium shot',
    description: '腰部以上，展示肢体语言和互动',
    useCase: '双人对话、互动场景',
  },
  MEDIUM_LONG_SHOT: {
    name: '中远景',
    english: 'medium long shot',
    description: '膝盖以上，展示人物与环境关系',
    useCase: '动作场景、环境互动',
  },
  FULL_SHOT: {
    name: '全景',
    english: 'full shot',
    description: '完整人物，展示全身动作',
    useCase: '舞蹈、打斗、全身动作',
  },
  WIDE_SHOT: {
    name: '远景',
    english: 'wide shot',
    description: '人物占画面1/3，强调环境',
    useCase: '环境展示、大场面、人群',
  },
  EXTREME_WIDE_SHOT: {
    name: '大远景',
    english: 'extreme wide shot',
    description: '人物极小，强调宏大环境',
    useCase: '城市全景、自然风光、战争场面',
  },
  OVER_THE_SHOULDER: {
    name: '过肩镜头',
    english: 'over-the-shoulder shot',
    description: '从一人肩膀拍摄另一人，建立对话关系',
    useCase: '对话场景、面试、对峙',
  },
  POINT_OF_VIEW: {
    name: '主观视角',
    english: 'point of view shot',
    description: '从角色眼睛看到的画面',
    useCase: '惊吓、发现、回忆',
  },
} as const;

// ============================================
// 运镜（Camera Movement）
// ============================================

export const CAMERA_MOVEMENTS = {
  STATIC: {
    name: '固定',
    english: 'static camera',
    description: '摄像机不动，强调稳定、严肃或紧张',
    useCase: '对话、审讯、情绪特写',
  },
  PAN_LEFT: {
    name: '左摇',
    english: 'panning left',
    description: '摄像机水平向左转动',
    useCase: '跟随移动物体、展示环境',
  },
  PAN_RIGHT: {
    name: '右摇',
    english: 'panning right',
    description: '摄像机水平向右转动',
    useCase: '跟随移动物体、展示环境',
  },
  TILT_UP: {
    name: '上摇',
    english: 'tilting up',
    description: '摄像机垂直向上转动',
    useCase: '展示高大建筑、人物站起',
  },
  TILT_DOWN: {
    name: '下摇',
    english: 'tilting down',
    description: '摄像机垂直向下转动',
    useCase: '展示地面、人物坐下/倒下',
  },
  DOLLY_IN: {
    name: '推轨前进',
    english: 'dolly in',
    description: '摄像机向被摄体推进',
    useCase: '强调情绪、进入细节、紧张感增加',
  },
  DOLLY_OUT: {
    name: '推轨后退',
    english: 'dolly out',
    description: '摄像机远离被摄体',
    useCase: '展示环境、情绪释放、孤独感',
  },
  DOLLY_SLOW_PUSH_IN: {
    name: '缓慢推轨前进',
    english: 'slow dolly push-in',
    description: '缓慢推进，强调情绪变化',
    useCase: '情绪高潮、发现真相、深情时刻',
  },
  TRACK_LEFT: {
    name: '左跟',
    english: 'tracking left',
    description: '摄像机向左平行移动',
    useCase: '跟随行走、侧面展示',
  },
  TRACK_RIGHT: {
    name: '右跟',
    english: 'tracking right',
    description: '摄像机向右平行移动',
    useCase: '跟随行走、侧面展示',
  },
  CRANE_UP: {
    name: '升臂',
    english: 'crane up',
    description: '摄像机升高',
    useCase: '展示全景、情绪升华、上帝视角',
  },
  CRANE_DOWN: {
    name: '降臂',
    english: 'crane down',
    description: '摄像机降低',
    useCase: '进入场景、聚焦细节、压迫感',
  },
  CRANE_HIGH_TO_LOW: {
    name: '高到低降臂',
    english: 'crane shot from high to low',
    description: '从高处降到低处，揭示场景',
    useCase: '揭示场景、进入冲突、压迫感',
  },
  STEADICAM: {
    name: '斯坦尼康',
    english: 'steadicam shot',
    description: '稳定器跟随拍摄，流畅自然',
    useCase: '跟随主角、长镜头、沉浸感',
  },
  STEADICAM_CIRCLE: {
    name: '斯坦尼康环绕',
    english: 'steadicam circling',
    description: '围绕角色360度旋转',
    useCase: '情绪高潮、发现真相、浪漫时刻',
  },
  HANDHELD: {
    name: '手持',
    english: 'handheld camera',
    description: '手持拍摄，画面轻微晃动',
    useCase: '纪录片感、紧张、真实感',
  },
  ZOOM_IN: {
    name: '变焦推进',
    english: 'zoom in',
    description: '镜头焦距变化推进',
    useCase: '快速强调、惊悚、发现',
  },
  ZOOM_OUT: {
    name: '变焦拉远',
    english: 'zoom out',
    description: '镜头焦距变化拉远',
    useCase: '揭示环境、讽刺、孤独',
  },
  RACK_FOCUS: {
    name: '移焦',
    english: 'rack focus',
    description: '焦点从前景移到背景或反之',
    useCase: '揭示关系、转移注意力、对比',
  },
} as const;

// ============================================
// 灯光（Lighting）
// ============================================

export const LIGHTING_SETUPS = {
  NATURAL: {
    name: '自然光',
    english: 'natural lighting',
    description: '日光或环境光，柔和真实',
    useCase: '日常场景、户外、真实感',
  },
  SOFT_NATURAL_GOLDEN_HOUR: {
    name: '柔和自然黄金时刻',
    english: 'soft natural golden hour lighting',
    description: '日出/日落时分，暖色调，柔和浪漫',
    useCase: '浪漫场景、回忆、温馨',
  },
  KEY_LIGHT: {
    name: '主光',
    english: 'key light',
    description: '主要光源，塑造人物轮廓',
    useCase: '标准照明、人物特写',
  },
  KEY_LIGHT_WITH_RIM: {
    name: '主光+轮廓光',
    english: 'key light with rim light',
    description: '主光+背光勾勒轮廓，立体感强',
    useCase: '人物特写、英雄时刻、高级感',
  },
  BACK_LIGHT: {
    name: '背光',
    english: 'back lighting',
    description: '光源在人物背后，形成剪影',
    useCase: '神秘、剪影、离别、回忆',
  },
  RIM_LIGHT: {
    name: '轮廓光',
    english: 'rim lighting',
    description: '边缘光勾勒人物轮廓，分离背景',
    useCase: '高级感、科幻、英雄',
  },
  THREE_POINT: {
    name: '三点布光',
    english: 'three-point lighting',
    description: '主光+补光+轮廓光，经典人像布光',
    useCase: '标准人像、访谈、精致场景',
  },
  SINGLE_SOFT_KEY: {
    name: '单柔光',
    english: 'single soft key light',
    description: '单一柔和光源，阴影柔和',
    useCase: '情绪特写、温柔、脆弱',
  },
  HIGH_CONTRAST: {
    name: '高对比',
    english: 'high contrast lighting',
    description: '明暗对比强烈，阴影深重',
    useCase: '悬疑、 noir、冲突、反派',
  },
  LOW_KEY: {
    name: '低调',
    english: 'low key lighting',
    description: '整体偏暗，仅局部照明',
    useCase: '悬疑、恐怖、阴谋、夜晚',
  },
  HIGH_KEY: {
    name: '高调',
    english: 'high key lighting',
    description: '整体明亮，阴影极少',
    useCase: '喜剧、广告、梦幻、纯洁',
  },
  NEON: {
    name: '霓虹',
    english: 'neon lighting',
    description: '彩色霓虹灯光，赛博朋克感',
    useCase: '夜店、赛博朋克、都市夜生活',
  },
  CANDLELIGHT: {
    name: '烛光',
    english: 'candlelight',
    description: '暖黄色烛光，摇曳不定',
    useCase: '浪漫晚餐、古代、温馨、私密',
  },
  MOONLIGHT: {
    name: '月光',
    english: 'moonlight',
    description: '冷蓝色月光，清冷神秘',
    useCase: '夜晚、浪漫、孤独、神秘',
  },
} as const;

// ============================================
// 构图（Composition）
// ============================================

export const COMPOSITIONS = {
  RULE_OF_THIRDS: {
    name: '三分法',
    english: 'rule of thirds composition',
    description: '主体放在画面1/3处，平衡和谐',
    useCase: '标准构图、风景、对话',
  },
  RULE_OF_THIRDS_EYE_LINE: {
    name: '三分法眼线',
    english: 'rule of thirds with eye line',
    description: '眼睛放在画面上1/3线，经典人像',
    useCase: '人物特写、对话、情绪',
  },
  CENTER_SYMMETRY: {
    name: '中心对称',
    english: 'center symmetry composition',
    description: '主体在画面正中心，对称稳定',
    useCase: '庄严、正式、对称建筑、仪式感',
  },
  LEADING_LINE: {
    name: '引导线',
    english: 'leading line composition',
    description: '线条引导视线到主体',
    useCase: '道路、走廊、纵深场景',
  },
  FRAME_IN_FRAME: {
    name: '框中框',
    english: 'frame within frame',
    description: '用门窗等框架框住主体',
    useCase: '偷窥、隔离、聚焦、层次',
  },
  DEPTH_OF_FIELD_SHALLOW: {
    name: '浅景深',
    english: 'shallow depth of field',
    description: '背景虚化，突出主体',
    useCase: '人像、特写、焦点转移',
  },
  DEPTH_OF_FIELD_DEEP: {
    name: '深景深',
    english: 'deep depth of field',
    description: '前后景都清晰，展示环境',
    useCase: '风景、大场面、环境叙事',
  },
  DUTCH_ANGLE: {
    name: '荷兰角',
    english: 'Dutch angle',
    description: '摄像机倾斜，画面不稳定',
    useCase: '不安、疯狂、冲突、醉酒',
  },
  BIRDS_EYE_VIEW: {
    name: '鸟瞰',
    english: "bird's eye view",
    description: '从正上方俯拍',
    useCase: '上帝视角、渺小、全景、死亡',
  },
  WORMS_EYE_VIEW: {
    name: '虫视',
    english: "worm's eye view",
    description: '从正下方仰拍',
    useCase: '压迫、高大、建筑、权力',
  },
} as const;

// ============================================
// 氛围（Mood）
// ============================================

export const MOODS = {
  TENSE: { name: '紧张', english: 'tense atmosphere', description: '悬念、危险、未知' },
  ROMANTIC: { name: '浪漫', english: 'romantic atmosphere', description: '爱情、温馨、甜蜜' },
  SUSPENSE: { name: '悬疑', english: 'suspenseful atmosphere', description: '谜团、调查、未知' },
  JOYFUL: { name: '欢乐', english: 'joyful atmosphere', description: '庆祝、开心、轻松' },
  MELANCHOLY: { name: '忧郁', english: 'melancholy atmosphere', description: '悲伤、回忆、孤独' },
  INTENSE: { name: '激烈', english: 'intense atmosphere', description: '冲突、战斗、对抗' },
  DARK: { name: '黑暗', english: 'dark atmosphere', description: '阴谋、恐怖、邪恶' },
  DREAMY: { name: '梦幻', english: 'dreamy atmosphere', description: '幻想、超现实、唯美' },
  NOSTALGIC: { name: '怀旧', english: 'nostalgic atmosphere', description: '回忆、过去、温暖' },
  EPIC: { name: '史诗', english: 'epic atmosphere', description: '宏大、壮丽、震撼' },
} as const;

// ============================================
// 预设模板（4种常用场景）
// ============================================

export interface CinematicPreset {
  name: string;
  description: string;
  fps: number;
  shotType: keyof typeof SHOT_TYPES;
  cameraMovement: keyof typeof CAMERA_MOVEMENTS;
  lighting: keyof typeof LIGHTING_SETUPS;
  composition: keyof typeof COMPOSITIONS;
  mood: keyof typeof MOODS;
}

export const CINEMATIC_PRESETS: Record<string, CinematicPreset> = {
  dramatic_confrontation: {
    name: '戏剧冲突',
    description: '用于争吵、对峙、冲突高潮',
    fps: 24,
    shotType: 'CLOSE_UP',
    cameraMovement: 'DOLLY_SLOW_PUSH_IN',
    lighting: 'KEY_LIGHT_WITH_RIM',
    composition: 'RULE_OF_THIRDS_EYE_LINE',
    mood: 'TENSE',
  },
  romantic_encounter: {
    name: '浪漫邂逅',
    description: '用于告白、约会、亲密时刻',
    fps: 24,
    shotType: 'MEDIUM_CLOSE_UP',
    cameraMovement: 'STEADICAM_CIRCLE',
    lighting: 'SOFT_NATURAL_GOLDEN_HOUR',
    composition: 'CENTER_SYMMETRY',
    mood: 'ROMANTIC',
  },
  action_chase: {
    name: '动作追逐',
    description: '用于追逐、打斗、逃生',
    fps: 24,
    shotType: 'WIDE_SHOT',
    cameraMovement: 'STEADICAM',
    lighting: 'HIGH_CONTRAST',
    composition: 'LEADING_LINE',
    mood: 'INTENSE',
  },
  emotional_monologue: {
    name: '情感独白',
    description: '用于内心独白、悲伤、回忆',
    fps: 24,
    shotType: 'EXTREME_CLOSE_UP',
    cameraMovement: 'STATIC',
    lighting: 'SINGLE_SOFT_KEY',
    composition: 'RULE_OF_THIRDS_EYE_LINE',
    mood: 'MELANCHOLY',
  },
  villain_reveal: {
    name: '反派揭露',
    description: '用于真相揭露、反转、阴谋',
    fps: 24,
    shotType: 'MEDIUM_SHOT',
    cameraMovement: 'DOLLY_IN',
    lighting: 'LOW_KEY',
    composition: 'DUTCH_ANGLE',
    mood: 'DARK',
  },
  celebration: {
    name: '庆祝胜利',
    description: '用于成功、婚礼、团圆',
    fps: 24,
    shotType: 'FULL_SHOT',
    cameraMovement: 'CRANE_UP',
    lighting: 'HIGH_KEY',
    composition: 'CENTER_SYMMETRY',
    mood: 'JOYFUL',
  },
};

// ============================================
// 提示词构建函数
// ============================================

export interface VideoPromptConfig {
  fps?: number;
  shotType: keyof typeof SHOT_TYPES;
  cameraMovement: keyof typeof CAMERA_MOVEMENTS;
  lighting: keyof typeof LIGHTING_SETUPS;
  composition: keyof typeof COMPOSITIONS;
  mood: keyof typeof MOODS;
  duration?: number; // 秒数
}

export function buildCinematicPrompt(
  sceneDescription: string,
  characters: Array<{ name: string; appearance: string; expression?: string; action?: string }>,
  config: VideoPromptConfig
): string {
  const shot = SHOT_TYPES[config.shotType];
  const movement = CAMERA_MOVEMENTS[config.cameraMovement];
  const light = LIGHTING_SETUPS[config.lighting];
  const comp = COMPOSITIONS[config.composition];
  const mood = MOODS[config.mood];

  const characterDescriptions = characters.map(c => {
    const expr = c.expression ? `, ${c.expression}` : '';
    const act = c.action ? `, ${c.action}` : '';
    return `${c.name}(${c.appearance}${expr}${act})`;
  }).join(', ');

  return `FPS-${config.fps || 24}, 
${shot.english} of ${characterDescriptions}.
${sceneDescription}
Camera: ${movement.english}, smooth and professional movement.
Lighting: ${light.english}, ${light.description.toLowerCase()}.
Composition: ${comp.english}, ${comp.description.toLowerCase()}.
Mood: ${mood.english}, ${mood.description}.
High-quality film footage, detailed textures, natural skin tones, professional color grading, cinematic atmosphere.`;
}

/**
 * 使用预设快速构建提示词
 */
export function buildPresetPrompt(
  presetName: keyof typeof CINEMATIC_PRESETS,
  sceneDescription: string,
  characters: Array<{ name: string; appearance: string; expression?: string; action?: string }>
): string {
  const preset = CINEMATIC_PRESETS[presetName];
  if (!preset) {
    throw new Error(`Unknown preset: ${presetName}`);
  }

  return buildCinematicPrompt(sceneDescription, characters, {
    fps: preset.fps,
    shotType: preset.shotType,
    cameraMovement: preset.cameraMovement,
    lighting: preset.lighting,
    composition: preset.composition,
    mood: preset.mood,
  });
}

/**
 * 根据场景类型自动推荐预设
 */
export function recommendPreset(sceneType: string): keyof typeof CINEMATIC_PRESETS | null {
  const mapping: Record<string, keyof typeof CINEMATIC_PRESETS> = {
    '冲突': 'dramatic_confrontation',
    '争吵': 'dramatic_confrontation',
    '对峙': 'dramatic_confrontation',
    '浪漫': 'romantic_encounter',
    '告白': 'romantic_encounter',
    '约会': 'romantic_encounter',
    '亲密': 'romantic_encounter',
    '动作': 'action_chase',
    '追逐': 'action_chase',
    '打斗': 'action_chase',
    '逃生': 'action_chase',
    '独白': 'emotional_monologue',
    '悲伤': 'emotional_monologue',
    '回忆': 'emotional_monologue',
    '反派': 'villain_reveal',
    '揭露': 'villain_reveal',
    '反转': 'villain_reveal',
    '阴谋': 'villain_reveal',
    '庆祝': 'celebration',
    '胜利': 'celebration',
    '婚礼': 'celebration',
    '团圆': 'celebration',
  };

  return mapping[sceneType] || null;
}
```

**验收标准**：
```bash
# 1. 构建测试
pnpm build
# 预期：0错误

# 2. 验证预设提示词
node -e "
const { buildPresetPrompt, recommendPreset } = require('./src/lib/prompt-engineering/video-prompt.ts');
const prompt = buildPresetPrompt('dramatic_confrontation', '女主发现男主背叛', [
  { name: '林婉儿', appearance: '25岁亚洲女性，黑色长发，红色连衣裙', expression: 'angry expression', action: 'clenching fist' }
]);
console.log(prompt);
"
# 预期：输出以 "FPS-24," 开头，包含 close-up, dolly slow push-in, key light with rim light 等术语

# 3. 验证场景推荐
node -e "
const { recommendPreset } = require('./src/lib/prompt-engineering/video-prompt.ts');
console.log(recommendPreset('告白'));
console.log(recommendPreset('打斗'));
"
# 预期：romantic_encounter, action_chase
```

**回滚命令**：
```bash
git revert <commit-hash-of-p2-5>
```

---

### 任务 P2-6：Moyin Creator 3层提示词融合

**问题描述**：
- 当前生图提示词是单一描述，没有分层管理
- 动作描述、摄影参数、风格层混在一起，难以维护和复用
- 不同场景需要重复写相似的摄影参数

**修复步骤**：

#### 6.1 创建3层提示词融合模块

创建 `src/lib/prompt-engineering/prompt-fusion.ts`：

```typescript
/**
 * Moyin Creator 3层提示词融合系统
 * 分层：动作描述层 + 摄影参数层 + 风格层
 * 用途：生图/生视频提示词的标准化构建
 */

// ============================================
// 第1层：动作描述层（Action Layer）
// 描述角色在做什么、表情如何、互动关系
// ============================================

export interface ActionLayer {
  characters: Array<{
    name: string;
    appearance: string;      // 外貌特征
    expression: string;      // 表情（引用expression-library）
    action: string;          // 动作（引用expression-library）
    gaze?: string;           // 视线方向
    posture?: string;        // 姿态
  }>;
  sceneAction: string;       // 场景中的动态事件
  interaction?: string;     // 角色间互动关系
}

export function buildActionLayer(layer: ActionLayer): string {
  const characterDescriptions = layer.characters.map(c => {
    const gaze = c.gaze ? `, looking ${c.gaze}` : '';
    const posture = c.posture ? `, ${c.posture}` : '';
    return `${c.name}(${c.appearance}), ${c.expression}, ${c.action}${gaze}${posture}`;
  }).join('; ');

  const interaction = layer.interaction ? `\nInteraction: ${layer.interaction}` : '';

  return `Characters: ${characterDescriptions}\nAction: ${layer.sceneAction}${interaction}`;
}

// ============================================
// 第2层：摄影参数层（Camera Layer）
// 景别、运镜、灯光、构图、机位
// ============================================

export interface CameraLayer {
  shotType: string;          // 景别（引用video-prompt）
  cameraMovement: string;    // 运镜（引用video-prompt）
  lighting: string;          // 灯光（引用video-prompt）
  composition: string;       // 构图（引用video-prompt）
  focus?: string;           // 焦点
  depthOfField?: string;    // 景深
  angle?: string;           // 拍摄角度
}

export function buildCameraLayer(layer: CameraLayer): string {
  const focus = layer.focus ? `, focus on ${layer.focus}` : '';
  const dof = layer.depthOfField ? `, ${layer.depthOfField} depth of field` : '';
  const angle = layer.angle ? `, ${layer.angle} angle` : '';

  return `Camera: ${layer.shotType}, ${layer.cameraMovement}${focus}${dof}${angle}\nLighting: ${layer.lighting}\nComposition: ${layer.composition}`;
}

// ============================================
// 第3层：风格层（Style Layer）
// 画风、色调、氛围、质量、参考
// ============================================

export interface StyleLayer {
  visualStyle: string;       // 视觉风格（写实/卡通/电影/油画等）
  colorTone?: string;        // 色调（暖色/冷色/黑白/复古等）
  mood: string;              // 氛围（引用video-prompt）
  quality: string;          // 质量描述
  reference?: string;        // 参考图/艺术家风格
  negativePrompt?: string;   // 负面提示词
}

export function buildStyleLayer(layer: StyleLayer): string {
  const color = layer.colorTone ? `, ${layer.colorTone} color tone` : '';
  const reference = layer.reference ? `, reference style: ${layer.reference}` : '';
  const negative = layer.negativePrompt ? `\nNegative: ${layer.negativePrompt}` : '';

  return `Style: ${layer.visualStyle}${color}, ${layer.mood} atmosphere, ${layer.quality}${reference}${negative}`;
}

// ============================================
// 3层融合器
// ============================================

export interface FusedPrompt {
  actionLayer: ActionLayer;
  cameraLayer: CameraLayer;
  styleLayer: StyleLayer;
}

export function fusePrompt(layers: FusedPrompt): string {
  const action = buildActionLayer(layers.actionLayer);
  const camera = buildCameraLayer(layers.cameraLayer);
  const style = buildStyleLayer(layers.styleLayer);

  return `${action}\n\n${camera}\n\n${style}`;
}

/**
 * 快速融合（使用预设）
 */
export function quickFuse(
  sceneType: string,
  characters: ActionLayer['characters'],
  sceneAction: string,
  visualStyle: string = 'cinematic realistic'
): string {
  // 根据场景类型自动选择摄影参数
  const { recommendPreset } = require('./video-prompt');
  const presetName = recommendPreset(sceneType);

  let cameraLayer: CameraLayer;

  if (presetName) {
    const { CINEMATIC_PRESETS } = require('./video-prompt');
    const preset = CINEMATIC_PRESETS[presetName];
    cameraLayer = {
      shotType: preset.shotType,
      cameraMovement: preset.cameraMovement,
      lighting: preset.lighting,
      composition: preset.composition,
    };
  } else {
    cameraLayer = {
      shotType: 'medium shot',
      cameraMovement: 'static',
      lighting: 'three-point lighting',
      composition: 'rule of thirds',
    };
  }

  return fusePrompt({
    actionLayer: {
      characters,
      sceneAction,
    },
    cameraLayer,
    styleLayer: {
      visualStyle,
      mood: 'dramatic',
      quality: 'high-quality, detailed textures, 8K resolution, professional film production',
    },
  });
}

/**
 * 从分镜数据自动构建3层提示词
 */
export function buildPromptFromShot(
  shot: {
    description: string;
    characters: Array<{ id: string; name: string; appearance?: string }>;
    shotType?: string;
    cameraMovement?: string;
    lighting?: string;
    mood?: string;
  },
  characterDatabase: Record<string, { appearance: string; defaultExpression?: string; defaultAction?: string }>
): string {
  // 构建Action Layer
  const actionLayer: ActionLayer = {
    characters: shot.characters.map(c => {
      const db = characterDatabase[c.id] || {};
      return {
        name: c.name,
        appearance: c.appearance || db.appearance || 'unknown appearance',
        expression: db.defaultExpression || 'neutral expression',
        action: db.defaultAction || 'standing',
      };
    }),
    sceneAction: shot.description,
  };

  // 构建Camera Layer（从分镜数据或默认值）
  const cameraLayer: CameraLayer = {
    shotType: shot.shotType || 'medium shot',
    cameraMovement: shot.cameraMovement || 'static',
    lighting: shot.lighting || 'three-point lighting',
    composition: 'rule of thirds',
  };

  // 构建Style Layer
  const styleLayer: StyleLayer = {
    visualStyle: 'cinematic realistic',
    mood: shot.mood || 'dramatic',
    quality: 'high-quality film footage, detailed textures, natural skin tones, professional color grading',
  };

  return fusePrompt({ actionLayer, cameraLayer, styleLayer });
}
```

**验收标准**：
```bash
# 1. 构建测试
pnpm build
# 预期：0错误

# 2. 验证3层融合
node -e "
const { fusePrompt, quickFuse } = require('./src/lib/prompt-engineering/prompt-fusion.ts');
const prompt = quickFuse('告白', [
  { name: '林婉儿', appearance: '25岁亚洲女性，黑色长发，白色连衣裙', expression: 'shy expression', action: 'standing' },
  { name: '顾景深', appearance: '30岁亚洲男性，西装革履', expression: 'hopeful expression', action: 'standing' }
], '顾景深在海边向林婉儿告白');
console.log(prompt);
"
# 预期：输出分3段（Characters/Camera/Style），包含专业术语

# 3. 验证从分镜构建
node -e "
const { buildPromptFromShot } = require('./src/lib/prompt-engineering/prompt-fusion.ts');
const prompt = buildPromptFromShot(
  {
    description: '女主发现男主背叛',
    characters: [{ id: 'char1', name: '林婉儿' }],
    shotType: 'close-up',
    mood: 'tense'
  },
  { char1: { appearance: '25岁亚洲女性，黑色长发', defaultExpression: 'angry expression', defaultAction: 'clenching fist' } }
);
console.log(prompt);
"
# 预期：输出包含 close-up, angry expression, clenching fist, tense atmosphere
```

**回滚命令**：
```bash
git revert <commit-hash-of-p2-6>
```

---

### 任务 P2-7：按需加载机制（确保所有API接入）

**问题描述**：
- 当前System Prompt一次性加载所有指令，可能超出LLM上下文窗口
- 不同任务不需要全部知识（如合规检测不需要题材指南）
- 没有监控知识库token使用量

**修复步骤**：

#### 7.1 在已有API路由中接入按需加载

修改以下API路由，在System Prompt构建时使用 `loadKnowledgeForTask`：

**修改 `src/app/api/ai/generate-full-script/route.ts`**（已在P2-2中改造，确保使用 `loadKnowledgeForTask`）

**修改 `src/app/api/ai/split-scenes/route.ts`**：

```typescript
import { loadKnowledgeForTask, estimateKnowledgeTokens } from '@/lib/prompt-knowledge';

// 在System Prompt中：
const systemPrompt = `你是一位资深短剧分镜师，精通以下分镜设计方法论：

${loadKnowledgeForTask('episode-write')}

【输出规范】
1. 每集2-5个场景
2. 每个场景标注：场景号、地点、时间、人物、关键动作
3. 场景切换要有逻辑（时间/空间/情绪）
4. 标注景别建议（特写/中景/远景）
5. 标注运镜建议（固定/推轨/摇镜）`;

// 记录token使用量
logger.info({ task: 'split-scenes', knowledgeTokens: estimateKnowledgeTokens('episode-write') });
```

**修改 `src/app/api/ai/extract-characters/route.ts`**：

```typescript
const systemPrompt = `你是一位角色设计师，精通以下角色创作方法论：

${loadKnowledgeForTask('character-design')}

【输出规范】
1. 提取所有有台词或关键动作的角色
2. 标注角色原型（ protagonist/antagonist/supporting）
3. 分析角色弧线（成长/堕落/复仇/救赎）
4. 标注语言风格（正式/口语/方言/古文）`;
```

**修改 `src/app/api/ai/compliance-check/route.ts`**：

```typescript
const systemPrompt = `你是一位内容审核专家，请依据以下红线清单进行合规检查：

${loadKnowledgeForTask('compliance-check')}

【审核要求】
1. 逐条检查红线内容
2. 标注问题位置（集数/场景/台词）
3. 给出修改建议（如何改写才能过审）
4. 区分：必须删除 / 必须改写 / 建议优化`;
```

**修改 `src/app/api/ai/generate-image/route.ts`**（在提示词优化阶段）：

```typescript
// 在优化提示词时，注入表情动作库
import { buildExpressionPrompt, recommendExpressionAction } from '@/lib/prompt-engineering/expression-library';
import { quickFuse } from '@/lib/prompt-engineering/prompt-fusion';

// 如果提示词包含角色表情/动作，自动增强为专业术语
function enhancePromptWithExpression(basePrompt: string, sceneType?: string): string {
  // 检测提示词中是否有简单表情词（如"微笑""生气"）
  // 替换为专业影视术语
  // 如果提供了sceneType，自动推荐表情+动作组合

  if (sceneType) {
    const recommendations = recommendExpressionAction(sceneType);
    if (recommendations.length > 0) {
      const rec = recommendations[0];
      const expressionPrompt = buildExpressionPrompt(rec.expression, rec.action);
      return `${basePrompt}\n\n${expressionPrompt}`;
    }
  }

  return basePrompt;
}
```

#### 7.2 创建知识库使用监控

创建 `src/lib/prompt-knowledge/monitor.ts`：

```typescript
import { estimateKnowledgeTokens } from './index';

interface KnowledgeUsage {
  task: string;
  timestamp: Date;
  tokens: number;
  model: string;
}

const usageLog: KnowledgeUsage[] = [];

export function logKnowledgeUsage(task: string, model: string): void {
  const tokens = estimateKnowledgeTokens(task);
  usageLog.push({ task, timestamp: new Date(), tokens, model });

  // 如果超过阈值，告警
  if (tokens > 4000) {
    console.warn(`[Knowledge Monitor] Task ${task} uses ${tokens} tokens, approaching context limit`);
  }
}

export function getUsageStats(): Record<string, { count: number; avgTokens: number; maxTokens: number }> {
  const stats: Record<string, { count: number; totalTokens: number; maxTokens: number }> = {};

  for (const usage of usageLog) {
    if (!stats[usage.task]) {
      stats[usage.task] = { count: 0, totalTokens: 0, maxTokens: 0 };
    }
    stats[usage.task].count++;
    stats[usage.task].totalTokens += usage.tokens;
    stats[usage.task].maxTokens = Math.max(stats[usage.task].maxTokens, usage.tokens);
  }

  return Object.fromEntries(
    Object.entries(stats).map(([task, data]) => [
      task,
      { count: data.count, avgTokens: Math.round(data.totalTokens / data.count), maxTokens: data.maxTokens }
    ])
  );
}
```

**验收标准**：
```bash
# 1. 测试按需加载
curl -X POST http://localhost:3000/api/ai/split-scenes   -H "Content-Type: application/json"   -H "Cookie: session=..."   -d '{"script":"第1集...","episodeNumber":1}'
# 预期：正常返回，且日志中记录 knowledgeTokens < 4000

# 2. 测试合规检测知识库
curl -X POST http://localhost:3000/api/ai/compliance-check   -H "Content-Type: application/json"   -H "Cookie: session=..."   -d '{"text":"这是一个测试文本"}'
# 预期：返回检测结果，且日志中记录 knowledgeTokens（约1500-2000）

# 3. 测试生图提示词增强
# 在生图API中提交包含"微笑"的提示词
# 预期：输出提示词中包含 "warm smile, detailed skin texture, natural muscle movement" 等专业术语

# 4. 验证token监控
node -e "
const { logKnowledgeUsage, getUsageStats } = require('./src/lib/prompt-knowledge/monitor.ts');
logKnowledgeUsage('script-generate', 'qwen-plus');
logKnowledgeUsage('compliance-check', 'qwen-plus');
console.log(getUsageStats());
"
# 预期：返回各任务的平均token数和最大token数
```

**回滚命令**：
```bash
git revert <commit-hash-of-p2-7>
```

---

## 五、Phase 2 验收清单

Phase 2完成后，你必须提供以下交付物：

### 5.1 代码交付
```bash
git diff main...feature/p2-script-knowledge > p2-diff.patch
```

### 5.2 测试报告

| # | 功能 | 测试命令 | 预期结果 |
|---|------|---------|---------|
| 1 | 知识库构建 | `pnpm build` | 0错误 |
| 2 | 三阶段写作 | `POST /api/ai/generate-full-script` | SSE流包含stage1/stage2/stage3/complete |
| 3 | 核心对话 | 检查stage1输出 | 包含dialogues和characterDrafts |
| 4 | 完整大纲 | 检查stage2输出 | 包含四段式节奏、四层反派、付费卡点 |
| 5 | 逐集预览 | 检查stage3输出 | 包含前3集完整剧本，每集2-5场景 |
| 6 | 五维度评分 | `POST /api/ai/review-script` | 返回{rhythm,satisfaction,dialogue,format,continuity,total,rating} |
| 7 | 评分计算 | 检查返回数据 | rhythm+satisfaction+dialogue+format+continuity = total |
| 8 | 评级匹配 | total=35 | rating="合格" |
| 9 | 表情库 | 检查expression-library.ts | >=33种表情 |
| 10 | 动作库 | 检查expression-library.ts | >=40种动作 |
| 11 | 表情提示词 | `buildExpressionPrompt('angry','clench_fist')` | 包含专业影视术语 |
| 12 | 影视模板 | `buildPresetPrompt('dramatic_confrontation',...)` | 以"FPS-24,"开头 |
| 13 | 场景推荐 | `recommendPreset('告白')` | 返回"romantic_encounter" |
| 14 | 3层融合 | `quickFuse('告白',...)` | 分3段（Action/Camera/Style） |
| 15 | 按需加载 | 检查split-scenes日志 | knowledgeTokens < 4000 |
| 16 | 合规知识库 | `POST /api/ai/compliance-check` | 返回详细红线检查结果 |
| 17 | 基线保护 | Phase 0+Phase 1全部20项功能 | 100%通过 |

### 5.3 构建验证
```bash
pnpm install
pnpm build
# 必须0错误，0警告
```

### 5.4 回滚方案
```bash
# 代码回滚
git checkout main
git branch -D feature/p2-script-knowledge
# 或
git reset --hard v0.10.1-infra-hotfix
```

---

## 六、Phase 3 概要（供参考，不在Phase 2执行）

Phase 2验收通过后，进入Phase 3角色一致性系统。主要任务：

| 任务 | 来源 | 说明 |
|------|------|------|
| P3-1 | Moyin Creator | 角色圣经管理（结构化档案：外貌/服装/表情/动作） |
| P3-2 | Moyin Creator | 参考图绑定（提取视觉嵌入向量） |
| P3-3 | Moyin Creator | 多视角联合生成（宫格图/三视图） |
| P3-4 | Moyin Creator | 3层提示词融合（已在P2-6实现，需接入生图流程） |
| P3-5 | Moyin Creator | 首帧网格拼接（N×N大图切分） |
| P3-6 | ViMax | 最佳帧选择（并行生成3-5张+择优） |
| P3-7 | AutoStory | 一致性后验检查（嵌入向量对比） |
| P3-8 | LocalMiniDrama | 全局素材库（已在P1-1创建表，需实现CRUD） |

---

## 七、你现在应该做什么

1. **确认当前分支是 `feature/p2-script-knowledge`**（从main切出）
2. **按顺序执行 P2-1 → P2-2 → P2-3 → P2-4 → P2-5 → P2-6 → P2-7**
3. **每个任务完成后运行基线功能测试（20项）**
4. **全部完成后提供：diff文件 + 测试报告 + 构建截图 + 回滚命令**
5. **等待我验收后，再进入Phase 3**

**禁止**：
- 不要提前做Phase 3的任务
- 不要在改造P2-2时"顺手"优化其他API路由
- 不要改变任何现有API路由的接口契约（输入输出格式必须和Phase 1一致）
- 不要删除P2-1知识库中的任何内容（只能追加）

---

*Phase 2 指令结束。请开始执行。*
