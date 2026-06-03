// 模板数据 - 22个剧本模板（重新设计分集结构）

export interface ScriptTemplate {
  id: string;
  title: string;
  style: string; // 风格分类
  styleLabel: string; // 风格显示名
  cover: string; // 封面图URL
  description: string;
  genre: string;
  episodes: number;
  tags: string[];
  characters: {
    name: string;
    role: string;
    description: string;
  }[];
  outline: {
    episode: number; // 第几集
    title: string;   // 集标题
    scenes: {        // 场景列表
      scene: number; // 场景号
      title: string; // 场景标题
      description: string; // 场景描述
    }[];
  }[];
}

// 风格分类
export const styleCategories = [
  { key: 'urban-sweet', label: '都市甜宠', color: '#FF6B9D', count: 10 },
  { key: 'suspense', label: '悬疑推理', color: '#7C5CFF', count: 3 },
  { key: 'ancient', label: '古风穿越', color: '#FFB347', count: 3 },
  { key: 'revenge', label: '复仇爽剧', color: '#FF4757', count: 3 },
  { key: 'inspiration', label: '现代励志', color: '#2ED573', count: 3 },
];

// 完整图片URL（带签名）- 2026-05-23 更新
const COVER_URLS: Record<string, string> = {
  // 都市甜宠
  'sweet-1': 'https://coze-coding-project.tos.coze.site/coze_storage_7637875881058336774/image/generate_image_ae3ae160-3f88-464d-ad5d-1d2dc3299239.jpeg?sign=1811066798-26d0304b4a-0-08e04959e3d07a3817f81721a6e097580cc887df3640c4b69a3c724bf7fa6e1b',
  'sweet-2': 'https://coze-coding-project.tos.coze.site/coze_storage_7637875881058336774/image/generate_image_4120322c-065a-4141-bf48-140d706fef06.jpeg?sign=1811066800-de396397fd-0-17d408234c68c46b64f11072fd6c34a108898eb8543d045a9baba839eb3a7cc9',
  'sweet-3': 'https://coze-coding-project.tos.coze.site/coze_storage_7637875881058336774/image/generate_image_49b8fe24-edd5-4734-ba47-5f5b303d01cf.jpeg?sign=1811066801-dad37a47d4-0-a5b0bc5e7970fd09c5f12d828d077f07cdbff8cdc6b9cb0625f50cd622a6e9db',
  'sweet-4': 'https://coze-coding-project.tos.coze.site/coze_storage_7637875881058336774/image/generate_image_89b5932b-e85e-49f2-90fa-656b66f5d664.jpeg?sign=1811066801-53fe045f6a-0-70210f38fd5fe877dbf174bcfd249612261d73f642596c593f4dd8863800092f',
  'sweet-5': 'https://coze-coding-project.tos.coze.site/coze_storage_7637875881058336774/image/generate_image_c79a61ee-5f79-4c79-b2b3-eb098edba8c7.jpeg?sign=1811066800-7a9fe83af3-0-b8385d644c761fff36fec041bcb87261daaa0917a3721bc98a5f4af5dba9de07',
  'sweet-6': 'https://coze-coding-project.tos.coze.site/coze_storage_7637875881058336774/image/generate_image_b9c16120-b0ab-4bf2-9ce0-9063d29f7d5e.jpeg?sign=1811066801-c8e5d86c08-0-1a2f6fd87ced1d769d551948cd89941f581f9d7a32718330a4194df4416a7e4c',
  'sweet-7': 'https://coze-coding-project.tos.coze.site/coze_storage_7637875881058336774/image/generate_image_42e3becb-c3e8-40e0-bd82-8b95f894ac64.jpeg?sign=1811066801-4073f9d518-0-5155c75409ae9e95f6db6a3a708241c8e82984911b940b25137a14de24383db5',
  'sweet-8': 'https://coze-coding-project.tos.coze.site/coze_storage_7637875881058336774/image/generate_image_6ceec85c-4f7c-4a0b-ad35-269491efa7f0.jpeg?sign=1811066802-2bd115f235-0-ee90367e30c1d1d461bb2442379b1d0b0c17309cc638627edeaa95886a39b51f',
  'sweet-9': 'https://coze-coding-project.tos.coze.site/coze_storage_7637875881058336774/image/generate_image_95a1c756-3374-43c4-ab2c-c658fa939a46.jpeg?sign=1811066800-4d8df0867e-0-5db2026dac30b9741900b4aeb6c54f1c2a831469e8a3264b524d21e88938287e',
  'sweet-10': 'https://coze-coding-project.tos.coze.site/coze_storage_7637875881058336774/image/generate_image_39b8c1ba-7d0b-41b5-9fe8-bcea36e231f2.jpeg?sign=1811066803-561d01bfbf-0-e6cc36eea1f6523303408d743e2122e159b9c15a57d950e458b85f731ab12ff3',
  // 悬疑推理
  'suspense-1': 'https://coze-coding-project.tos.coze.site/coze_storage_7637875881058336774/image/generate_image_a30c8731-65b6-4f0b-a8f4-aeaebf454881.jpeg?sign=1811066857-e20eb88f6a-0-c06ee6243dcfa321e4b399fdb4da52ffd224d6d03c84b9fee92350ba902c105d',
  'suspense-2': 'https://coze-coding-project.tos.coze.site/coze_storage_7637875881058336774/image/generate_image_a0ed5670-d0e3-406d-a230-3528b3a82b4a.jpeg?sign=1811066857-33871e44ad-0-76b4ff96aa7fe0d7ecc3cd0aa1c4cd025e805e0342e66ef174fdf9481d741037',
  'suspense-3': 'https://coze-coding-project.tos.coze.site/coze_storage_7637875881058336774/image/generate_image_5f7ee5d1-6353-42a0-b141-49a417770f2d.jpeg?sign=1811066861-f20c76040e-0-333464cb171fa944e037660a089031654a33a2f9d4c3baf2eff251cc857983cc',
  // 古风穿越
  'ancient-1': 'https://coze-coding-project.tos.coze.site/coze_storage_7637875881058336774/image/generate_image_5412a49a-8c42-459c-832c-d4082fe47d7c.jpeg?sign=1811066855-dbb3c8ccdc-0-7965a9ec8a3516273a2348913dda475da2d203b42ddae4ac49d3162010d52779',
  'ancient-2': 'https://coze-coding-project.tos.coze.site/coze_storage_7637875881058336774/image/generate_image_83545c6c-105f-4236-8896-2e2706e8c9b1.jpeg?sign=1811066856-93f09f5b21-0-207a88066ff5cbbe062aaad95f5fb162a709f4ec22a864847151e6b66fc1259c',
  'ancient-3': 'https://coze-coding-project.tos.coze.site/coze_storage_7637875881058336774/image/generate_image_a6e2e836-420e-498e-a0bd-e9526066cc28.jpeg?sign=1811066857-ffab8870d5-0-80e410ace60135ec7a8580a2969421b6832aba596f5a6ace526b310f9193231e',
  // 复仇爽剧
  'revenge-1': 'https://coze-coding-project.tos.coze.site/coze_storage_7637875881058336774/image/generate_image_dfe46995-9aab-473e-82f2-3c1649855c2a.jpeg?sign=1811066856-42dedf4af9-0-836006defa39314a00d2600623aadfd741c8dc48501c2d65792cb485a788cbc0',
  'revenge-2': 'https://coze-coding-project.tos.coze.site/coze_storage_7637875881058336774/image/generate_image_f8fdd620-0c66-403e-a3ed-63b0c792d1ba.jpeg?sign=1811066857-157fb6ff5d-0-cbc67e51859c105e55a86a834a9c452c2fcf207613985cc931ccaa8a38a9f6d2',
  'revenge-3': 'https://coze-coding-project.tos.coze.site/coze_storage_7637875881058336774/image/generate_image_edc79ed6-a144-4a8e-b418-9e9d5e96ee50.jpeg?sign=1811066858-52bbb6c3ea-0-92ec9f992065423e2f44f47a0f28b41e9fc8e44a421befe422454e81722aa5f2',
  // 现代励志
  'inspiration-1': 'https://coze-coding-project.tos.coze.site/coze_storage_7637875881058336774/image/generate_image_518a95db-dc2e-4ec3-9649-60aab2ea29dd.jpeg?sign=1811066855-647456e060-0-76106a3bc43b5c99ee5be2c442d64f9e8a19b7e98317aba3248e35a383816dba',
  'inspiration-2': 'https://coze-coding-project.tos.coze.site/coze_storage_7637875881058336774/image/generate_image_a03c6dc3-37ac-466c-9c9e-683101e03193.jpeg?sign=1811066855-b9a9be6890-0-f98f852353b3ee0c5beedaabd51dc85b66df21cbcf3cdfb8e2a57bd2a61b55d9',
  'inspiration-3': 'https://coze-coding-project.tos.coze.site/coze_storage_7637875881058336774/image/generate_image_9488a9da-38f6-4a59-b49b-31594a8a9c43.jpeg?sign=1811066856-598742d147-0-2152d9e76df6cced1df919be2e8b0a7ab4a2c30a15c1734218ea062e30790761',
};

// 模板列表
export const scriptTemplates: ScriptTemplate[] = [
  // 都市甜宠
  {
    id: 'urban-sweet-1',
    title: '霸道总裁爱上我',
    style: 'urban-sweet',
    styleLabel: '都市甜宠',
    cover: COVER_URLS['sweet-1'],
    description: '霸道总裁与灰姑娘的浪漫爱情故事，身份差距下的真情碰撞',
    genre: '都市爱情',
    episodes: 12,
    tags: ['总裁', '甜宠', '职场', '逆袭'],
    characters: [
      { name: '陆晨曦', role: '男主', description: '霸道总裁，外冷内热，对女主一见钟情' },
      { name: '苏婉清', role: '女主', description: '普通职员，善良坚强，不卑不亢' },
      { name: '林子涵', role: '男配', description: '女主青梅竹马，暗恋女主多年' }
    ],
    outline: [
      {
        episode: 1, title: '意外相遇',
        scenes: [
          { scene: 1, title: '电梯偶遇', description: '女主入职第一天在电梯与总裁相遇' },
          { scene: 2, title: '面试冲突', description: '面试时因观点不同与总裁发生争执' },
          { scene: 3, title: '意外录用', description: '总裁破格录用女主，引起议论' }
        ]
      },
      {
        episode: 2, title: '身份差距',
        scenes: [
          { scene: 1, title: '同事排挤', description: '因被总裁关注，遭同事孤立' },
          { scene: 2, title: '总裁解围', description: '总裁在公司聚会上为女主解围' },
          { scene: 3, title: '暗生好感', description: '女主发现总裁温柔的一面' }
        ]
      },
      {
        episode: 3, title: '误会加深',
        scenes: [
          { scene: 1, title: '前女友出现', description: '总裁前女友回国，高调示爱' },
          { scene: 2, title: '误解产生', description: '女主目睹二人亲密，产生误会' },
          { scene: 3, title: '故意疏远', description: '女主开始有意避开总裁' }
        ]
      },
      {
        episode: 4, title: '真相大白',
        scenes: [
          { scene: 1, title: '总裁坦白', description: '总裁找到女主坦白与前女友关系' },
          { scene: 2, title: '消除误会', description: '误会解除，两人关系回暖' },
          { scene: 3, title: '确定心意', description: '总裁明确表达对女主的心意' }
        ]
      },
      {
        episode: 5, title: '幸福结局',
        scenes: [
          { scene: 1, title: '浪漫告白', description: '总裁在公司年会上公开告白' },
          { scene: 2, title: '接受表白', description: '女主接受总裁，众人祝福' },
          { scene: 3, title: '甜蜜未来', description: '两人携手展望美好未来' }
        ]
      }
    ]
  },
  {
    id: 'urban-sweet-2',
    title: '契约婚姻',
    style: 'urban-sweet',
    styleLabel: '都市甜宠',
    cover: COVER_URLS['sweet-2'],
    description: '契约婚姻从假戏真做到真情流露，都市男女的爱情博弈',
    genre: '都市爱情',
    episodes: 10,
    tags: ['契约', '婚姻', '职场', '甜宠'],
    characters: [
      { name: '顾言深', role: '男主', description: '家族企业继承人，为继承权需要假结婚' },
      { name: '沈初夏', role: '女主', description: '独立设计师，为救父亲答应契约婚姻' },
      { name: '陈雅婷', role: '女配', description: '男主青梅竹马，一直暗恋男主' }
    ],
    outline: [
      {
        episode: 1, title: '契约签订',
        scenes: [
          { scene: 1, title: '困境相遇', description: '女主为救父亲四处借钱，偶遇男主' },
          { scene: 2, title: '契约提出', description: '男主提出假结婚的条件' },
          { scene: 3, title: '达成协议', description: '女主为救父亲答应契约婚姻' }
        ]
      },
      {
        episode: 2, title: '同住屋檐',
        scenes: [
          { scene: 1, title: '搬入豪宅', description: '女主搬入男主家中，开始同居生活' },
          { scene: 2, title: '生活习惯', description: '两人生活习惯不同，摩擦不断' },
          { scene: 3, title: '首次和解', description: '男主主动让步，关系缓和' }
        ]
      },
      {
        episode: 3, title: '假戏真做',
        scenes: [
          { scene: 1, title: '家族宴会', description: '参加家族宴会，女主表现得体' },
          { scene: 2, title: '心动瞬间', description: '男主看到女主的闪光点，开始动心' },
          { scene: 3, title: '暗生情愫', description: '女主也发现自己对男主的感情' }
        ]
      },
      {
        episode: 4, title: '危机出现',
        scenes: [
          { scene: 1, title: '契约曝光', description: '契约婚姻的秘密被人发现' },
          { scene: 2, title: '女主离开', description: '女主伤心离开，回到自己家' },
          { scene: 3, title: '男主醒悟', description: '男主意识到自己已深爱上女主' }
        ]
      },
      {
        episode: 5, title: '追妻之路',
        scenes: [
          { scene: 1, title: '真诚道歉', description: '男主找到女主，真诚道歉' },
          { scene: 2, title: '表达爱意', description: '男主表白真心，请求原谅' },
          { scene: 3, title: '真正婚礼', description: '两人举办真正的婚礼，幸福结局' }
        ]
      }
    ]
  },
  {
    id: 'urban-sweet-3',
    title: '欢喜冤家',
    style: 'urban-sweet',
    styleLabel: '都市甜宠',
    cover: COVER_URLS['sweet-3'],
    description: '职场欢喜冤家，从互看不顺眼到暗生情愫',
    genre: '都市爱情',
    episodes: 8,
    tags: ['职场', '冤家', '搞笑', '甜宠'],
    characters: [
      { name: '江逸尘', role: '男主', description: '毒舌总监，表面冷酷实则细心' },
      { name: '林小雨', role: '女主', description: '元气策划，乐观开朗不服输' },
      { name: '周子墨', role: '男配', description: '温和上司，一直照顾女主' }
    ],
    outline: [
      {
        episode: 1, title: '冤家初见',
        scenes: [
          { scene: 1, title: '入职第一天', description: '女主入职第一天就与男主结下梁子' },
          { scene: 2, title: '针锋相对', description: '工作中处处被男主针对' },
          { scene: 3, title: '不服输', description: '女主决心要证明自己' }
        ]
      },
      {
        episode: 2, title: '斗智斗勇',
        scenes: [
          { scene: 1, title: '项目竞争', description: '两人分到同一项目组' },
          { scene: 2, title: '方案之争', description: '各自提出方案，互相否定' },
          { scene: 3, title: '意外合作', description: '被迫合作完成项目' }
        ]
      },
      {
        episode: 3, title: '发现优点',
        scenes: [
          { scene: 1, title: '加班夜晚', description: '深夜加班，男主送女主回家' },
          { scene: 2, title: '温柔一面', description: '女主发现男主温柔的一面' },
          { scene: 3, title: '好感萌芽', description: '两人对彼此的看法开始改变' }
        ]
      },
      {
        episode: 4, title: '情愫暗生',
        scenes: [
          { scene: 1, title: '共处一晚', description: '因出差被困酒店，共处一晚' },
          { scene: 2, title: '心动时刻', description: '男主的细心照顾让女主动心' },
          { scene: 3, title: '暧昧升级', description: '两人关系变得暧昧' }
        ]
      },
      {
        episode: 5, title: '表白成功',
        scenes: [
          { scene: 1, title: '勇敢表白', description: '男主放下架子追求女主' },
          { scene: 2, title: '接受心意', description: '女主接受男主的表白' },
          { scene: 3, title: '甜蜜恋爱', description: '两人开始甜蜜恋爱' }
        ]
      }
    ]
  },
  {
    id: 'urban-sweet-4',
    title: '暗恋成真',
    style: 'urban-sweet',
    styleLabel: '都市甜宠',
    cover: COVER_URLS['sweet-4'],
    description: '校园暗恋到都市重逢，十年等待终有回响',
    genre: '都市爱情',
    episodes: 12,
    tags: ['暗恋', '重逢', '校园', '治愈'],
    characters: [
      { name: '许子轩', role: '男主', description: '学霸男神，高中时暗恋女主' },
      { name: '苏念晴', role: '女主', description: '高中普通女孩，毕业后失去联系' },
      { name: '方雅琳', role: '女配', description: '高中校花，曾追求男主' }
    ],
    outline: [
      {
        episode: 1, title: '高中回忆',
        scenes: [
          { scene: 1, title: '暗恋开始', description: '男主在高中暗恋女主' },
          { scene: 2, title: '错过表白', description: '毕业前错过表白机会' },
          { scene: 3, title: '失去联系', description: '毕业后各奔东西，失去联系' }
        ]
      },
      {
        episode: 2, title: '都市重逢',
        scenes: [
          { scene: 1, title: '职场相遇', description: '十年后职场重逢' },
          { scene: 2, title: '物是人非', description: '发现对方变化很大' },
          { scene: 3, title: '重新认识', description: '开始重新了解彼此' }
        ]
      },
      {
        episode: 3, title: '主动接近',
        scenes: [
          { scene: 1, title: '发现单身', description: '男主发现女主单身' },
          { scene: 2, title: '创造机会', description: '男主开始主动接近女主' },
          { scene: 3, title: '加班相伴', description: '以加班为由多陪伴女主' }
        ]
      },
      {
        episode: 4, title: '揭开真相',
        scenes: [
          { scene: 1, title: '高中日记', description: '女主发现男主高中日记' },
          { scene: 2, title: '当年真相', description: '得知男主当年暗恋自己' },
          { scene: 3, title: '感动落泪', description: '女主被男主的深情感动' }
        ]
      },
      {
        episode: 5, title: '终成眷属',
        scenes: [
          { scene: 1, title: '勇敢告白', description: '男主正式向女主表白' },
          { scene: 2, title: '十年等待', description: '女主接受，十年暗恋终成真' },
          { scene: 3, title: '幸福结局', description: '两人携手走向未来' }
        ]
      }
    ]
  },
  {
    id: 'urban-sweet-5',
    title: '医者仁心',
    style: 'urban-sweet',
    styleLabel: '都市甜宠',
    cover: COVER_URLS['sweet-5'],
    description: '外科医生与住院患者家属的温馨爱情',
    genre: '都市爱情',
    episodes: 10,
    tags: ['医生', '医院', '治愈', '甜宠'],
    characters: [
      { name: '陆明轩', role: '男主', description: '心外科主任，医术精湛，外冷内热' },
      { name: '苏晚晴', role: '女主', description: '画家，父亲住院期间与男主相识' },
      { name: '林小雅', role: '女配', description: '护士长，暗恋男主多年' }
    ],
    outline: [
      {
        episode: 1, title: '相遇医院',
        scenes: [
          { scene: 1, title: '父亲住院', description: '女主父亲突发心脏病住院' },
          { scene: 2, title: '主治医生', description: '男主是父亲的主治医生' },
          { scene: 3, title: '初识印象', description: '女主被男主的专业态度打动' }
        ]
      },
      {
        episode: 2, title: '守护病房',
        scenes: [
          { scene: 1, title: '日夜守护', description: '女主日夜守护在病房' },
          { scene: 2, title: '细心照顾', description: '男主下班后也来关心病人' },
          { scene: 3, title: '感情升温', description: '两人在病房外的交流增多' }
        ]
      },
      {
        episode: 3, title: '手术成功',
        scenes: [
          { scene: 1, title: '手术准备', description: '父亲进行手术，女主焦急等待' },
          { scene: 2, title: '成功消息', description: '手术成功，女主感激涕零' },
          { scene: 3, title: '心动时刻', description: '女主发现自己爱上了男主' }
        ]
      },
      {
        episode: 4, title: '误会与离开',
        scenes: [
          { scene: 1, title: '流言四起', description: '医院里流传两人的闲话' },
          { scene: 2, title: '女主误会', description: '女主误以为男主有女友' },
          { scene: 3, title: '选择离开', description: '女主带着父亲出院离开' }
        ]
      },
      {
        episode: 5, title: '追寻真爱',
        scenes: [
          { scene: 1, title: '男主表白', description: '男主找到女主表白心意' },
          { scene: 2, title: '误会解除', description: '解释清楚误会' },
          { scene: 3, title: '幸福结局', description: '两人走到一起' }
        ]
      }
    ]
  },
  {
    id: 'urban-sweet-6',
    title: '急诊室恋人',
    style: 'urban-sweet',
    styleLabel: '都市甜宠',
    cover: COVER_URLS['sweet-6'],
    description: '急诊科医生与患者之间的意外情缘',
    genre: '都市爱情',
    episodes: 12,
    tags: ['急诊', '医院', '职业', '甜宠'],
    characters: [
      { name: '顾言深', role: '男主', description: '急诊科副主任，冷静果断' },
      { name: '沈小雨', role: '女主', description: '意外受伤的患者，乐观坚强' },
      { name: '陈医生', role: '男配', description: '急诊科住院医师，暗恋女主' }
    ],
    outline: [
      {
        episode: 1, title: '急诊相遇',
        scenes: [
          { scene: 1, title: '意外受伤', description: '女主因意外被送入急诊室' },
          { scene: 2, title: '主治医生', description: '男主负责处理女主的伤情' },
          { scene: 3, title: '初次印象', description: '男主被女主乐观的态度吸引' }
        ]
      },
      {
        episode: 2, title: '住院期间',
        scenes: [
          { scene: 1, title: '需要住院', description: '女主需要住院观察' },
          { scene: 2, title: '日常查房', description: '男主每天来查房' },
          { scene: 3, title: '聊天解闷', description: '两人聊天中逐渐熟悉' }
        ]
      },
      {
        episode: 3, title: '心动时刻',
        scenes: [
          { scene: 1, title: '细心照顾', description: '男主在下班后也来照顾女主' },
          { scene: 2, title: '心动萌芽', description: '女主被男主的温柔打动' },
          { scene: 3, title: '暧昧氛围', description: '两人之间的氛围变得暧昧' }
        ]
      },
      {
        episode: 4, title: '出院之后',
        scenes: [
          { scene: 1, title: '顺利出院', description: '女主康复出院' },
          { scene: 2, title: '失去联系', description: '出院后两人失去联系' },
          { scene: 3, title: '思念之情', description: '男主发现自己很想念女主' }
        ]
      },
      {
        episode: 5, title: '追爱成功',
        scenes: [
          { scene: 1, title: '主动寻找', description: '男主主动找到女主' },
          { scene: 2, title: '表白心意', description: '男主向女主表白' },
          { scene: 3, title: '甜蜜结局', description: '两人开始甜蜜恋爱' }
        ]
      }
    ]
  },
  {
    id: 'urban-sweet-7',
    title: '白衣守护',
    style: 'urban-sweet',
    styleLabel: '都市甜宠',
    cover: COVER_URLS['sweet-7'],
    description: 'ICU医生与护士的职场恋情',
    genre: '都市爱情',
    episodes: 8,
    tags: ['ICU', '医院', '职场', '甜宠'],
    characters: [
      { name: '秦默', role: '男主', description: 'ICU主任医师，沉默寡言但内心温暖' },
      { name: '林晓晓', role: '女主', description: '新调入的ICU护士，活泼开朗' },
      { name: '张护士长', role: '女配', description: 'ICU护士长，热心红娘' }
    ],
    outline: [
      {
        episode: 1, title: '新来护士',
        scenes: [
          { scene: 1, title: '调科第一天', description: '女主调入ICU科室' },
          { scene: 2, title: '严厉医生', description: '男主是出了名的严厉医生' },
          { scene: 3, title: '初次交锋', description: '女主犯错被男主批评' }
        ]
      },
      {
        episode: 2, title: '工作磨合',
        scenes: [
          { scene: 1, title: '配合工作', description: '两人开始配合工作' },
          { scene: 2, title: '发现优点', description: '男主发现女主工作认真负责' },
          { scene: 3, title: '态度改变', description: '男主对女主态度缓和' }
        ]
      },
      {
        episode: 3, title: '生死时刻',
        scenes: [
          { scene: 1, title: '紧急抢救', description: '病人突发状况需要抢救' },
          { scene: 2, title: '并肩作战', description: '两人并肩抢救病人' },
          { scene: 3, title: '成功挽救', description: '成功挽救病人生命' }
        ]
      },
      {
        episode: 4, title: '告白时刻',
        scenes: [
          { scene: 1, title: '打破沉默', description: '男主打破沉默向女主表白' },
          { scene: 2, title: '接受心意', description: '女主接受男主的表白' },
          { scene: 3, title: '甜蜜结局', description: '白大褂下的甜蜜爱情' }
        ]
      }
    ]
  },
  {
    id: 'urban-sweet-8',
    title: '婚礼策划师',
    style: 'urban-sweet',
    styleLabel: '都市甜宠',
    cover: COVER_URLS['sweet-8'],
    description: '婚礼策划师与婚纱设计师的浪漫邂逅',
    genre: '都市爱情',
    episodes: 10,
    tags: ['婚礼', '浪漫', '职业', '甜宠'],
    characters: [
      { name: '许念晴', role: '女主', description: '婚礼策划师，浪漫主义者' },
      { name: '陆子轩', role: '男主', description: '婚纱设计师，才华横溢' },
      { name: '周雨婷', role: '女配', description: '女主闺蜜，已婚' }
    ],
    outline: [
      {
        episode: 1, title: '工作合作',
        scenes: [
          { scene: 1, title: '婚礼项目', description: '女主接到高端婚礼策划项目' },
          { scene: 2, title: '婚纱定制', description: '需要找婚纱设计师合作' },
          { scene: 3, title: '初次见面', description: '与男主婚纱设计师相识' }
        ]
      },
      {
        episode: 2, title: '默契配合',
        scenes: [
          { scene: 1, title: '设计讨论', description: '两人讨论婚纱设计方案' },
          { scene: 2, title: '工作默契', description: '发现彼此工作配合默契' },
          { scene: 3, title: '互相欣赏', description: '开始欣赏对方的才华' }
        ]
      },
      {
        episode: 3, title: '心动瞬间',
        scenes: [
          { scene: 1, title: '婚纱试穿', description: '模特试穿婚纱时男主亲自调整' },
          { scene: 2, title: '心动时刻', description: '女主看到男主专注的样子心动' },
          { scene: 3, title: '暧昧氛围', description: '两人之间有了暧昧氛围' }
        ]
      },
      {
        episode: 4, title: '误会与解除',
        scenes: [
          { scene: 1, title: '前女友出现', description: '男主前女友突然出现' },
          { scene: 2, title: '女主误会', description: '女主误以为两人还有感情' },
          { scene: 3, title: '解释清楚', description: '男主解释清楚误会' }
        ]
      },
      {
        episode: 5, title: '专属婚纱',
        scenes: [
          { scene: 1, title: '特别设计', description: '男主为女主设计专属婚纱' },
          { scene: 2, title: '浪漫告白', description: '男主借婚纱向女主告白' },
          { scene: 3, title: '幸福结局', description: '两人举办自己的婚礼' }
        ]
      }
    ]
  },
  {
    id: 'urban-sweet-9',
    title: '誓言永恒',
    style: 'urban-sweet',
    styleLabel: '都市甜宠',
    cover: COVER_URLS['sweet-9'],
    description: '婚礼现场意外重逢的初恋',
    genre: '都市爱情',
    episodes: 12,
    tags: ['初恋', '重逢', '婚礼', '甜宠'],
    characters: [
      { name: '林若曦', role: '女主', description: '婚庆公司老板，单身' },
      { name: '顾晨', role: '男主', description: '新郎的伴郎，女主十年前的初恋' },
      { name: '苏婉', role: '女配', description: '新娘，女主大学同学' }
    ],
    outline: [
      {
        episode: 1, title: '婚礼重逢',
        scenes: [
          { scene: 1, title: '接单工作', description: '女主接到大学同学的婚礼订单' },
          { scene: 2, title: '伴郎身份', description: '发现男主是新郎的伴郎' },
          { scene: 3, title: '十年未见', description: '两人十年未见，尴尬相遇' }
        ]
      },
      {
        episode: 2, title: '回忆涌现',
        scenes: [
          { scene: 1, title: '筹备婚礼', description: '一起参与婚礼筹备工作' },
          { scene: 2, title: '回忆往昔', description: '相处中回忆起当年的感情' },
          { scene: 3, title: '分手原因', description: '逐渐揭开当年分手的原因' }
        ]
      },
      {
        episode: 3, title: '试探心意',
        scenes: [
          { scene: 1, title: '单独相处', description: '婚礼彩排时单独相处' },
          { scene: 2, title: '暗示情感', description: '男主暗示自己仍爱女主' },
          { scene: 3, title: '内心挣扎', description: '女主内心开始动摇' }
        ]
      },
      {
        episode: 4, title: '婚礼告白',
        scenes: [
          { scene: 1, title: '婚礼当天', description: '婚礼当天，两人情绪复杂' },
          { scene: 2, title: '当众告白', description: '男主在婚礼上向女主告白' },
          { scene: 3, title: '接受爱情', description: '女主勇敢接受男主的爱' }
        ]
      },
      {
        episode: 5, title: '十年等待',
        scenes: [
          { scene: 1, title: '解释真相', description: '男主解释当年为何没有坚持' },
          { scene: 2, title: '原谅与理解', description: '女主选择原谅和理解' },
          { scene: 3, title: '终成眷属', description: '十年等待，终成眷属' }
        ]
      }
    ]
  },
  {
    id: 'urban-sweet-10',
    title: '花嫁之约',
    style: 'urban-sweet',
    styleLabel: '都市甜宠',
    cover: COVER_URLS['sweet-10'],
    description: '花店老板娘与准新郎的意外情缘',
    genre: '都市爱情',
    episodes: 8,
    tags: ['花店', '婚礼', '治愈', '甜宠'],
    characters: [
      { name: '苏小暖', role: '女主', description: '花店老板娘，温柔善良' },
      { name: '江亦辰', role: '男主', description: '为婚礼来订花的准新郎' },
      { name: '陈若琳', role: '女配', description: '男主原未婚妻，后解除婚约' }
    ],
    outline: [
      {
        episode: 1, title: '订花相遇',
        scenes: [
          { scene: 1, title: '婚礼订花', description: '男主来花店订婚礼用花' },
          { scene: 2, title: '定制设计', description: '女主为男主设计专属花艺' },
          { scene: 3, title: '初次印象', description: '两人对彼此留下好印象' }
        ]
      },
      {
        episode: 2, title: '婚礼取消',
        scenes: [
          { scene: 1, title: '取消婚礼', description: '男主的婚礼突然取消' },
          { scene: 2, title: '情绪低落', description: '男主来花店取消订单' },
          { scene: 3, title: '女主安慰', description: '女主用花艺安慰男主' }
        ]
      },
      {
        episode: 3, title: '治愈陪伴',
        scenes: [
          { scene: 1, title: '常来花店', description: '男主开始经常来花店' },
          { scene: 2, title: '花艺治愈', description: '女主用花艺治愈男主' },
          { scene: 3, title: '关系亲近', description: '两人关系逐渐亲近' }
        ]
      },
      {
        episode: 4, title: '发现爱情',
        scenes: [
          { scene: 1, title: '心动时刻', description: '男主发现自己已爱上女主' },
          { scene: 2, title: '表白心意', description: '男主向女主表白' },
          { scene: 3, title: '接受爱情', description: '女主接受男主的爱' }
        ]
      },
      {
        episode: 5, title: '新的婚礼',
        scenes: [
          { scene: 1, title: '重新求婚', description: '男主用花艺向女主求婚' },
          { scene: 2, title: '幸福婚礼', description: '新的婚礼，新的新娘' },
          { scene: 3, title: '花嫁之约', description: '花店见证两人的幸福' }
        ]
      }
    ]
  },
  // 悬疑推理
  {
    id: 'suspense-1',
    title: '密室逃脱',
    style: 'suspense',
    styleLabel: '悬疑推理',
    cover: COVER_URLS['suspense-1'],
    description: '一群人被困神秘密室，每过一关就有人消失',
    genre: '悬疑推理',
    episodes: 12,
    tags: ['密室', '生存', '人性', '悬疑'],
    characters: [
      { name: '陈默', role: '男主', description: '沉默寡言的程序员，推理能力极强' },
      { name: '林若雪', role: '女主', description: '心理医生，善于观察人心' },
      { name: '王浩', role: '男配', description: '健身教练，体格强壮但性格冲动' }
    ],
    outline: [
      {
        episode: 1, title: '被困密室',
        scenes: [
          { scene: 1, title: '神秘邀请', description: '众人收到神秘邀请函' },
          { scene: 2, title: '醒来被困', description: '众人醒来发现自己身处密室' },
          { scene: 3, title: '第一道谜题', description: '密室开启第一道谜题' }
        ]
      },
      {
        episode: 2, title: '第一关',
        scenes: [
          { scene: 1, title: '解开谜题', description: '众人合力解开第一道谜题' },
          { scene: 2, title: '有人消失', description: '过关后有人神秘消失' },
          { scene: 3, title: '恐惧蔓延', description: '众人开始感到恐惧' }
        ]
      },
      {
        episode: 3, title: '信任危机',
        scenes: [
          { scene: 1, title: '互相猜疑', description: '众人开始相互猜疑' },
          { scene: 2, title: '内讧爆发', description: '恐惧导致内讧' },
          { scene: 3, title: '真相线索', description: '男主发现密室背后的线索' }
        ]
      },
      {
        episode: 4, title: '揭开阴谋',
        scenes: [
          { scene: 1, title: '发现真相', description: '发现密室背后的阴谋' },
          { scene: 2, title: '找出内鬼', description: '找出游戏组织者安插的内鬼' },
          { scene: 3, title: '制定计划', description: '制定逃脱计划' }
        ]
      },
      {
        episode: 5, title: '逃出生天',
        scenes: [
          { scene: 1, title: '最后一关', description: '面对最后一道关卡' },
          { scene: 2, title: '联手破局', description: '众人联手破局' },
          { scene: 3, title: '逃出密室', description: '成功逃出密室，重获自由' }
        ]
      }
    ]
  },
  {
    id: 'suspense-2',
    title: '连环案件',
    style: 'suspense',
    styleLabel: '悬疑推理',
    cover: COVER_URLS['suspense-2'],
    description: '连环杀人案背后的惊天秘密',
    genre: '悬疑推理',
    episodes: 16,
    tags: ['刑侦', '连环', '烧脑', '悬疑'],
    characters: [
      { name: '秦锋', role: '男主', description: '资深刑警，破案无数但内心有阴影' },
      { name: '苏婉', role: '女主', description: '法医，冷静专业，有独特见解' },
      { name: '李明辉', role: '男配', description: '年轻警官，热血但经验不足' }
    ],
    outline: [
      {
        episode: 1, title: '首案发现',
        scenes: [
          { scene: 1, title: '接警出动', description: '接到报警赶赴现场' },
          { scene: 2, title: '诡异尸体', description: '发现手法诡异的尸体' },
          { scene: 3, title: '初步调查', description: '开始初步调查取证' }
        ]
      },
      {
        episode: 2, title: '连环作案',
        scenes: [
          { scene: 1, title: '第二具尸体', description: '发现第二具类似手法的尸体' },
          { scene: 2, title: '确认连环', description: '确认是连环杀人案' },
          { scene: 3, title: '成立专案组', description: '成立专案组全力侦破' }
        ]
      },
      {
        episode: 3, title: '线索追踪',
        scenes: [
          { scene: 1, title: '发现联系', description: '发现案件之间的联系' },
          { scene: 2, title: '锁定嫌疑人', description: '锁定犯罪嫌疑人' },
          { scene: 3, title: '抓捕行动', description: '展开抓捕行动' }
        ]
      },
      {
        episode: 4, title: '惊天反转',
        scenes: [
          { scene: 1, title: '证据指向', description: '所有证据指向意想不到的人' },
          { scene: 2, title: '真凶现身', description: '真正的凶手现身' },
          { scene: 3, title: '惊天秘密', description: '揭开背后的惊天秘密' }
        ]
      },
      {
        episode: 5, title: '真相大白',
        scenes: [
          { scene: 1, title: '最终对决', description: '与真凶的最终对决' },
          { scene: 2, title: '真相揭晓', description: '案件真相全部揭晓' },
          { scene: 3, title: '正义伸张', description: '正义得到伸张' }
        ]
      }
    ]
  },
  {
    id: 'suspense-3',
    title: '时间循环',
    style: 'suspense',
    styleLabel: '悬疑推理',
    cover: COVER_URLS['suspense-3'],
    description: '女主陷入时间循环，必须找出凶手才能打破循环',
    genre: '悬疑推理',
    episodes: 10,
    tags: ['时间循环', '悬疑', '烧脑', '救赎'],
    characters: [
      { name: '林晚', role: '女主', description: '普通白领，陷入时间循环' },
      { name: '顾言', role: '男主', description: '神秘男子，似乎知道循环真相' },
      { name: '张晓', role: '女配', description: '女主闺蜜，在循环中总是死去' }
    ],
    outline: [
      {
        episode: 1, title: '循环开始',
        scenes: [
          { scene: 1, title: '普通一天', description: '女主度过看似普通的一天' },
          { scene: 2, title: '朋友死亡', description: '闺蜜在当天意外死亡' },
          { scene: 3, title: '再次醒来', description: '女主再次醒来发现是同一天' }
        ]
      },
      {
        episode: 2, title: '尝试改变',
        scenes: [
          { scene: 1, title: '阻止死亡', description: '女主尝试阻止闺蜜死亡' },
          { scene: 2, title: '失败重来', description: '阻止失败，循环重来' },
          { scene: 3, title: '发现规律', description: '发现死亡时间和规律' }
        ]
      },
      {
        episode: 3, title: '寻找凶手',
        scenes: [
          { scene: 1, title: '调查线索', description: '每次循环都收集新线索' },
          { scene: 2, title: '神秘男子', description: '发现神秘男子顾言' },
          { scene: 3, title: '得到帮助', description: '顾言似乎知道循环真相' }
        ]
      },
      {
        episode: 4, title: '真相揭晓',
        scenes: [
          { scene: 1, title: '凶手身份', description: '发现凶手的真实身份' },
          { scene: 2, title: '作案动机', description: '揭开凶手的作案动机' },
          { scene: 3, title: '最后机会', description: '最后一次循环的机会' }
        ]
      },
      {
        episode: 5, title: '打破循环',
        scenes: [
          { scene: 1, title: '成功救人', description: '成功救下闺蜜' },
          { scene: 2, title: '打破循环', description: '终于打破时间循环' },
          { scene: 3, title: '新的开始', description: '迎来全新的一天' }
        ]
      }
    ]
  },
  // 古风穿越
  {
    id: 'ancient-1',
    title: '宫廷权谋',
    style: 'ancient',
    styleLabel: '古风穿越',
    cover: COVER_URLS['ancient-1'],
    description: '深宫权谋，皇后与妃嫔之间的尔虞我诈',
    genre: '古风宫廷',
    episodes: 20,
    tags: ['宫廷', '权谋', '后宫', '古风'],
    characters: [
      { name: '萧若水', role: '女主', description: '皇后，表面柔弱实则心机深沉' },
      { name: '萧玄', role: '男主', description: '皇帝，深不可测，爱江山也爱美人' },
      { name: '苏贵妃', role: '女配', description: '贵妃，野心勃勃，觊觎后位' }
    ],
    outline: [
      {
        episode: 1, title: '入宫选秀',
        scenes: [
          { scene: 1, title: '家族安排', description: '女主作为秀女被选入宫' },
          { scene: 2, title: '初入宫廷', description: '第一次踏入深宫禁苑' },
          { scene: 3, title: '初见皇帝', description: '选秀时第一次见到皇帝' }
        ]
      },
      {
        episode: 2, title: '步步为营',
        scenes: [
          { scene: 1, title: '后宫规矩', description: '学习后宫生存之道' },
          { scene: 2, title: '结交盟友', description: '在后宫中寻找盟友' },
          { scene: 3, title: '避开陷阱', description: '小心避开他人的陷阱' }
        ]
      },
      {
        episode: 3, title: '圣宠降临',
        scenes: [
          { scene: 1, title: '得宠契机', description: '意外获得皇帝关注' },
          { scene: 2, title: '晋升之喜', description: '因得宠而获得晋升' },
          { scene: 3, title: '众矢之的', description: '成为众人嫉妒的对象' }
        ]
      },
      {
        episode: 4, title: '后宫风云',
        scenes: [
          { scene: 1, title: '阴谋算计', description: '遭遇他人的阴谋算计' },
          { scene: 2, title: '化险为夷', description: '凭借智慧化险为夷' },
          { scene: 3, title: '反败为胜', description: '反而借机除掉敌人' }
        ]
      },
      {
        episode: 5, title: '母仪天下',
        scenes: [
          { scene: 1, title: '皇后之位', description: '最终登上皇后之位' },
          { scene: 2, title: '肃清敌人', description: '肃清所有敌人' },
          { scene: 3, title: '母仪天下', description: '成为真正的母仪天下' }
        ]
      }
    ]
  },
  {
    id: 'ancient-2',
    title: '穿越逆袭',
    style: 'ancient',
    styleLabel: '古风穿越',
    cover: COVER_URLS['ancient-2'],
    description: '现代女强人穿越古代，用现代智慧逆袭人生',
    genre: '古风穿越',
    episodes: 12,
    tags: ['穿越', '逆袭', '商战', '古风'],
    characters: [
      { name: '苏瑶', role: '女主', description: '现代CEO穿越成古代弃女' },
      { name: '慕容寒', role: '男主', description: '冷面王爷，被女主才华吸引' },
      { name: '苏婉', role: '女配', description: '原身庶妹，心机女' }
    ],
    outline: [
      {
        episode: 1, title: '意外穿越',
        scenes: [
          { scene: 1, title: '现代CEO', description: '现代职场女强人的日常' },
          { scene: 2, title: '意外穿越', description: '意外穿越到古代' },
          { scene: 3, title: '发现身份', description: '发现自己穿越成弃女' }
        ]
      },
      {
        episode: 2, title: '经商致富',
        scenes: [
          { scene: 1, title: '发现商机', description: '用现代知识发现商机' },
          { scene: 2, title: '开创事业', description: '开创自己的商业帝国' },
          { scene: 3, title: '初见成效', description: '事业初见成效' }
        ]
      },
      {
        episode: 3, title: '王爷相遇',
        scenes: [
          { scene: 1, title: '生意往来', description: '与王爷有生意往来' },
          { scene: 2, title: '才华展现', description: '展现经商才华吸引王爷' },
          { scene: 3, title: '暗生情愫', description: '两人互生好感' }
        ]
      },
      {
        episode: 4, title: '家族危机',
        scenes: [
          { scene: 1, title: '阴谋揭露', description: '揭露家族阴谋' },
          { scene: 2, title: '反击敌人', description: '用智慧反击敌人' },
          { scene: 3, title: '化险为夷', description: '成功化解危机' }
        ]
      },
      {
        episode: 5, title: '逆袭成功',
        scenes: [
          { scene: 1, title: '成为首富', description: '成功成为首富' },
          { scene: 2, title: '王爷求婚', description: '王爷向女主求婚' },
          { scene: 3, title: '幸福结局', description: '成为王妃，幸福结局' }
        ]
      }
    ]
  },
  {
    id: 'ancient-3',
    title: '仙侠虐恋',
    style: 'ancient',
    styleLabel: '古风穿越',
    cover: COVER_URLS['ancient-3'],
    description: '仙门弟子之间的虐心之恋',
    genre: '仙侠',
    episodes: 16,
    tags: ['仙侠', '虐恋', '轮回', '古风'],
    characters: [
      { name: '白芷', role: '女主', description: '仙门弟子，前世是天界仙子' },
      { name: '墨染', role: '男主', description: '魔界少主，深爱女主千年' },
      { name: '青玄', role: '男配', description: '仙门师兄，默默守护女主' }
    ],
    outline: [
      {
        episode: 1, title: '仙门初遇',
        scenes: [
          { scene: 1, title: '仙门弟子', description: '女主是仙门的普通弟子' },
          { scene: 2, title: '魔界少主', description: '与魔界少主意外相遇' },
          { scene: 3, title: '初生好感', description: '两人对彼此产生好感' }
        ]
      },
      {
        episode: 2, title: '暗生情愫',
        scenes: [
          { scene: 1, title: '秘密相会', description: '两人秘密相会' },
          { scene: 2, title: '感情加深', description: '相处中感情加深' },
          { scene: 3, title: '被师门发现', description: '被仙门发现两人关系' }
        ]
      },
      {
        episode: 3, title: '正邪对立',
        scenes: [
          { scene: 1, title: '师门反对', description: '师门强烈反对两人在一起' },
          { scene: 2, title: '被迫分离', description: '被迫分离' },
          { scene: 3, title: '痛苦抉择', description: '面临痛苦的抉择' }
        ]
      },
      {
        episode: 4, title: '生死牺牲',
        scenes: [
          { scene: 1, title: '大战爆发', description: '仙魔大战爆发' },
          { scene: 2, title: '为爱牺牲', description: '为救对方甘愿牺牲' },
          { scene: 3, title: '轮回转世', description: '转世轮回等待重逢' }
        ]
      },
      {
        episode: 5, title: '千年重逢',
        scenes: [
          { scene: 1, title: '千年等待', description: '千年后再次相遇' },
          { scene: 2, title: '记忆恢复', description: '恢复前世记忆' },
          { scene: 3, title: '终成眷属', description: '千年等待终得圆满' }
        ]
      }
    ]
  },
  // 复仇爽剧
  {
    id: 'revenge-1',
    title: '重生复仇',
    style: 'revenge',
    styleLabel: '复仇爽剧',
    cover: COVER_URLS['revenge-1'],
    description: '前世被渣男恶女害死，重生归来开启复仇之路',
    genre: '复仇爽剧',
    episodes: 16,
    tags: ['重生', '复仇', '爽剧', '逆袭'],
    characters: [
      { name: '林晚晴', role: '女主', description: '前世是傻白甜，重生后心机深沉' },
      { name: '顾北辰', role: '男主', description: '暗恋女主多年，默默守护' },
      { name: '陈俊豪', role: '男配', description: '渣男，前世害死女主' }
    ],
    outline: [
      {
        episode: 1, title: '含恨重生',
        scenes: [
          { scene: 1, title: '前世惨死', description: '女主前世被渣男恶女害死' },
          { scene: 2, title: '重生归来', description: '重生回到三年前' },
          { scene: 3, title: '决心复仇', description: '下定决心复仇' }
        ]
      },
      {
        episode: 2, title: '布局开始',
        scenes: [
          { scene: 1, title: '改变轨迹', description: '改变前世的人生轨迹' },
          { scene: 2, title: '收集证据', description: '收集渣男恶女的罪证' },
          { scene: 3, title: '寻找盟友', description: '找到愿意帮助自己的人' }
        ]
      },
      {
        episode: 3, title: '步步反击',
        scenes: [
          { scene: 1, title: '打脸恶女', description: '在众人面前打脸恶女' },
          { scene: 2, title: '揭露渣男', description: '揭露渣男的真面目' },
          { scene: 3, title: '众人震惊', description: '众人被女主的反击震惊' }
        ]
      },
      {
        episode: 4, title: '真相大白',
        scenes: [
          { scene: 1, title: '死亡真相', description: '揭露前世死亡真相' },
          { scene: 2, title: '众人愤怒', description: '众人对渣男恶女愤怒' },
          { scene: 3, title: '惩罚降临', description: '渣男恶女得到惩罚' }
        ]
      },
      {
        episode: 5, title: '复仇成功',
        scenes: [
          { scene: 1, title: '彻底胜利', description: '彻底战胜所有敌人' },
          { scene: 2, title: '收获真爱', description: '发现一直守护自己的真爱' },
          { scene: 3, title: '幸福人生', description: '开启全新幸福人生' }
        ]
      }
    ]
  },
  {
    id: 'revenge-2',
    title: '豪门恩怨',
    style: 'revenge',
    styleLabel: '复仇爽剧',
    cover: COVER_URLS['revenge-2'],
    description: '豪门私生子回归复仇，夺回属于自己的家族',
    genre: '复仇爽剧',
    episodes: 14,
    tags: ['豪门', '复仇', '家族', '爽剧'],
    characters: [
      { name: '秦枭', role: '男主', description: '豪门私生子，为夺回家族而归来' },
      { name: '林婉清', role: '女主', description: '落魄千金，与男主结盟' },
      { name: '秦明', role: '男配', description: '家族嫡子，阴险狡诈' }
    ],
    outline: [
      {
        episode: 1, title: '私生子归来',
        scenes: [
          { scene: 1, title: '隐藏身份', description: '男主以新身份回归家族' },
          { scene: 2, title: '进入集团', description: '进入家族集团工作' },
          { scene: 3, title: '暗中调查', description: '暗中调查家族内部情况' }
        ]
      },
      {
        episode: 2, title: '蛰伏等待',
        scenes: [
          { scene: 1, title: '低调行事', description: '低调蛰伏不引人注目' },
          { scene: 2, title: '收集证据', description: '收集嫡子违法的证据' },
          { scene: 3, title: '寻找盟友', description: '找到同样被排挤的盟友' }
        ]
      },
      {
        episode: 3, title: '反击出击',
        scenes: [
          { scene: 1, title: '揭露丑闻', description: '揭露嫡子的丑闻' },
          { scene: 2, title: '股价大跌', description: '家族集团股价大跌' },
          { scene: 3, title: '趁势崛起', description: '男主趁机在集团崛起' }
        ]
      },
      {
        episode: 4, title: '终极对决',
        scenes: [
          { scene: 1, title: '家族大会', description: '家族大会上的终极对决' },
          { scene: 2, title: '真相揭晓', description: '揭晓男主真实身份' },
          { scene: 3, title: '夺回一切', description: '成功夺回属于自己的一切' }
        ]
      },
      {
        episode: 5, title: '新掌门人',
        scenes: [
          { scene: 1, title: '肃清敌人', description: '肃清所有敌人' },
          { scene: 2, title: '重振家族', description: '重振家族企业' },
          { scene: 3, title: '新掌门人', description: '成为家族新掌门人' }
        ]
      }
    ]
  },
  {
    id: 'revenge-3',
    title: '复仇女王',
    style: 'revenge',
    styleLabel: '复仇爽剧',
    cover: COVER_URLS['revenge-3'],
    description: '被闺蜜和未婚夫背叛，华丽蜕变复仇',
    genre: '复仇爽剧',
    episodes: 12,
    tags: ['背叛', '复仇', '蜕变', '爽剧'],
    characters: [
      { name: '苏念', role: '女主', description: '被背叛后华丽蜕变' },
      { name: '陆晨', role: '男主', description: '帮助女主复仇的神秘人' },
      { name: '林小曼', role: '女配', description: '背叛女主的闺蜜' }
    ],
    outline: [
      {
        episode: 1, title: '背叛之痛',
        scenes: [
          { scene: 1, title: '发现背叛', description: '女主发现闺蜜和未婚夫的背叛' },
          { scene: 2, title: '遭受打击', description: '遭受巨大打击' },
          { scene: 3, title: '决心复仇', description: '决心华丽蜕变复仇' }
        ]
      },
      {
        episode: 2, title: '华丽蜕变',
        scenes: [
          { scene: 1, title: '改变自己', description: '彻底改变自己的形象' },
          { scene: 2, title: '提升能力', description: '提升自己的能力' },
          { scene: 3, title: '神秘帮手', description: '遇到帮助自己的神秘人' }
        ]
      },
      {
        episode: 3, title: '步步为营',
        scenes: [
          { scene: 1, title: '接近敌人', description: '以新身份接近敌人' },
          { scene: 2, title: '收集罪证', description: '收集背叛者的罪证' },
          { scene: 3, title: '设下陷阱', description: '为敌人设下陷阱' }
        ]
      },
      {
        episode: 4, title: '复仇高潮',
        scenes: [
          { scene: 1, title: '公开真相', description: '公开背叛者的真相' },
          { scene: 2, title: '众人唾弃', description: '背叛者被众人唾弃' },
          { scene: 3, title: '身败名裂', description: '背叛者身败名裂' }
        ]
      },
      {
        episode: 5, title: '女王归来',
        scenes: [
          { scene: 1, title: '事业成功', description: '女主事业大获成功' },
          { scene: 2, title: '收获真爱', description: '与神秘帮手收获真爱' },
          { scene: 3, title: '女王归来', description: '成为真正的女王' }
        ]
      }
    ]
  },
  // 现代励志
  {
    id: 'inspiration-1',
    title: '创业传奇',
    style: 'inspiration',
    styleLabel: '现代励志',
    cover: COVER_URLS['inspiration-1'],
    description: '草根创业者的逆袭之路，从零到上市的传奇',
    genre: '现代励志',
    episodes: 16,
    tags: ['创业', '励志', '逆袭', '商业'],
    characters: [
      { name: '陈阳', role: '男主', description: '草根创业者，白手起家' },
      { name: '林晓', role: '女主', description: '投资人，看中男主潜力' },
      { name: '王强', role: '男配', description: '男主创业伙伴' }
    ],
    outline: [
      {
        episode: 1, title: '创业梦想',
        scenes: [
          { scene: 1, title: '草根出身', description: '男主出身草根但有大梦想' },
          { scene: 2, title: '发现商机', description: '发现一个创业商机' },
          { scene: 3, title: '开始创业', description: '决定开始创业之路' }
        ]
      },
      {
        episode: 2, title: '艰难起步',
        scenes: [
          { scene: 1, title: '资金困难', description: '面临资金短缺困难' },
          { scene: 2, title: '寻找投资', description: '四处寻找投资' },
          { scene: 3, title: '遇到贵人', description: '遇到赏识自己的投资人' }
        ]
      },
      {
        episode: 3, title: '团队建设',
        scenes: [
          { scene: 1, title: '招兵买马', description: '开始招兵买马组建团队' },
          { scene: 2, title: '团队磨合', description: '团队磨合期的困难' },
          { scene: 3, title: '形成默契', description: '团队终于形成默契' }
        ]
      },
      {
        episode: 4, title: '突破困境',
        scenes: [
          { scene: 1, title: '竞争对手', description: '遭遇强大竞争对手' },
          { scene: 2, title: '市场危机', description: '面临市场危机' },
          { scene: 3, title: '转危为安', description: '成功转危为安' }
        ]
      },
      {
        episode: 5, title: '上市成功',
        scenes: [
          { scene: 1, title: '公司壮大', description: '公司逐渐壮大' },
          { scene: 2, title: 'IPO成功', description: '公司成功上市' },
          { scene: 3, title: '创业传奇', description: '成为创业传奇' }
        ]
      }
    ]
  },
  {
    id: 'inspiration-2',
    title: '职场逆袭',
    style: 'inspiration',
    styleLabel: '现代励志',
    cover: COVER_URLS['inspiration-2'],
    description: '职场小透明逆袭成为高管的热血故事',
    genre: '现代励志',
    episodes: 12,
    tags: ['职场', '励志', '逆袭', '成长'],
    characters: [
      { name: '李明', role: '男主', description: '职场小透明，默默无闻' },
      { name: '苏雨', role: '女主', description: '职场女强人，男主的上司' },
      { name: '张伟', role: '男配', description: '职场对手，心机深沉' }
    ],
    outline: [
      {
        episode: 1, title: '小透明',
        scenes: [
          { scene: 1, title: '默默无闻', description: '男主在公司是毫无存在感的小透明' },
          { scene: 2, title: '被人忽视', description: '总是被同事忽视' },
          { scene: 3, title: '渴望改变', description: '渴望改变现状' }
        ]
      },
      {
        episode: 2, title: '抓住机会',
        scenes: [
          { scene: 1, title: '意外机会', description: '意外获得一个机会' },
          { scene: 2, title: '努力表现', description: '努力抓住这个机会表现' },
          { scene: 3, title: '获得认可', description: '终于获得上司认可' }
        ]
      },
      {
        episode: 3, title: '不断成长',
        scenes: [
          { scene: 1, title: '接手项目', description: '开始接手重要项目' },
          { scene: 2, title: '克服困难', description: '克服各种困难' },
          { scene: 3, title: '能力提升', description: '能力快速提升' }
        ]
      },
      {
        episode: 4, title: '职场斗争',
        scenes: [
          { scene: 1, title: '遭遇嫉妒', description: '遭遇同事嫉妒和排挤' },
          { scene: 2, title: '正面交锋', description: '与职场对手正面交锋' },
          { scene: 3, title: '完胜对手', description: '完胜对手赢得尊重' }
        ]
      },
      {
        episode: 5, title: '成为高管',
        scenes: [
          { scene: 1, title: '晋升机会', description: '获得晋升机会' },
          { scene: 2, title: '成功晋升', description: '成功晋升为高管' },
          { scene: 3, title: '逆袭成功', description: '职场逆袭成功' }
        ]
      }
    ]
  },
  {
    id: 'inspiration-3',
    title: '追梦青春',
    style: 'inspiration',
    styleLabel: '现代励志',
    cover: COVER_URLS['inspiration-3'],
    description: '年轻人追逐音乐梦想的热血故事',
    genre: '现代励志',
    episodes: 10,
    tags: ['音乐', '梦想', '青春', '励志'],
    characters: [
      { name: '林风', role: '男主', description: '有音乐梦想的普通青年' },
      { name: '陈雪', role: '女主', description: '同样有音乐梦想的女孩' },
      { name: '张教练', role: '男配', description: '音乐导师，严厉但用心' }
    ],
    outline: [
      {
        episode: 1, title: '音乐梦想',
        scenes: [
          { scene: 1, title: '平凡生活', description: '男主过着平凡的打工生活' },
          { scene: 2, title: '音乐热爱', description: '内心一直热爱音乐' },
          { scene: 3, title: '决定追梦', description: '决定追寻音乐梦想' }
        ]
      },
      {
        episode: 2, title: '艰难练习',
        scenes: [
          { scene: 1, title: '报名比赛', description: '报名参加音乐比赛' },
          { scene: 2, title: '刻苦练习', description: '每天刻苦练习' },
          { scene: 3, title: '遇到困难', description: '遇到技术和资金困难' }
        ]
      },
      {
        episode: 3, title: '找到伙伴',
        scenes: [
          { scene: 1, title: '志同道合', description: '遇到志同道合的音乐伙伴' },
          { scene: 2, title: '组建乐队', description: '一起组建乐队' },
          { scene: 3, title: '互相鼓励', description: '互相鼓励共同进步' }
        ]
      },
      {
        episode: 4, title: '比赛征程',
        scenes: [
          { scene: 1, title: '初赛过关', description: '初赛顺利过关' },
          { scene: 2, title: '复赛压力', description: '复赛面临巨大压力' },
          { scene: 3, title: '突破自我', description: '突破自我闯入决赛' }
        ]
      },
      {
        episode: 5, title: '梦想成真',
        scenes: [
          { scene: 1, title: '决赛舞台', description: '站上决赛舞台' },
          { scene: 2, title: '精彩演出', description: '奉献精彩演出' },
          { scene: 3, title: '梦想成真', description: '实现音乐梦想' }
        ]
      }
    ]
  }
];
