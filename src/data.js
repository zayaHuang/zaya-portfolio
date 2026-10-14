// src/data.js
export const portfolioData = {
 // ===== 工牌：职业经历（一键重点提炼 + 时间） =====
  badge: {
    id: 'badge',
    tooltip: '她的职业经历',       // 第一行
    tooltipHint: '双击查看详情',   // 第二行（小灰字）
    panelTitle: '职业经历',
    experiences: [
      {
        company: '追觅科技',
        role: '扫地机产品经理',
        period: '2024.11 - 2026.05', // 起止时间
header: {
    greeting: '你好，我是',
    name: '黄皓冉（zaya）',
    period: '2024.11 - 2026.5',
    title: '追觅扫地机BU/产品经理',
    avatar: '/images/avatar.jpg'
  },
 // 新增：四段文字，每段有标题 + 内容
 sections: [
  {
    title: '整机项目概览',
    content: '负责扫地机双圆盘海外产品线Gen 3等八款圆盘产品，从立项到量产的全过程，包含市场竞争力把控，硬件规格定义，MO撰写，输出商业认证，宣称需求，跟进开发至量产过程中的硬件问题，以及KOL竞品拉踩攻防SOP材料。其中Gen 3落地后成为畅销爆品，七大区[[E:爆款年销80w台]]，主销西南欧、北美大区，亚马逊扫地机榜单销量第二。'

  },
  {
    title: '中国区域对接',
    content: '对接前端，规划中国区扫地机多品线路标，[[K:捕捉用户痛点]]，监控区域竞品舆情，制定应对方案。把控全年产品上市节奏、配置、外观、命名、毛利、交付情况。关注市占、营收结果。推动品质解决区域重大市场舆情问题。结合产品净利及配置，转化为区域各渠道定制品需求。'
  },
  {
    title: '履带品线规划',
    content: '负责履带产品线整体规划，爬取历代网评，收集KOL、销售反馈。把控成本定价、高低配产品迭代方案。[[E:主导蒸汽、泡沫喷射等重大创新功能开发]]，定义使用场景，撰写硬件PRD、[[E:识别高市场价值机会点]]，拉通实验室、策划团队制定显性演示方案，并确保产品竞争力。'
  },
  {
    title: '其他重点产出',
    content: '作为主要负责人主导AWE、CES展会，制定方案和参与验收，参与硅谷发布会、经销商大会，等对外宣讲活动；负责S、L系列，全生命周期维护，关注市场、展陈、售后反馈，识别并导入优化方案；定期监控竞品动态，输出新品快报、静态体验报告，掌握竞品迭代逻辑，明确竞品本品优劣势，[[K:转化为技术方案]]，重点关注硬件配置和多维度体验，[[K:达到商业成功]]。'
  }
],
                // 提炼后的关键词 + 佐证
        keyPoints: [
  { text: '捕捉用户痛点', evidence: ['识别高市场价值机会点'] },
  { text: '转化为技术方案', evidence: ['主导蒸汽、泡沫喷射等重大创新功能开发'] },
  { text: '达到商业成功', evidence: ['爆款年销80w台'] }
],
        summaryText: '简而言之，我聚焦...：',
        animation: 'text-fly'
      }
    ]
  },


      // ===== 显示器：项目经历（时间轴 + 节点展开卡片） =====
  computer: {
    id: 'computer',
    tooltip: '她的项目经历',
    tooltipHint: '双击查看详情',
    panelTitle: '项目经历',
    slogan: {
  lead: '观察，创作，然后实现。',
  rest: '除了标准的职场经历，我也经历了数个闭环。'
},
    // 时间轴上的三个节点，从上到下
    projects: [
      {
        id: 'ai-project',
        name: 'AI 独立项目',
        role: '开发者',
        period: '2026.02 - 至今',
        // 节点间距：'large' 大 / 'medium' 中 / 'small' 小
        spacing: 'large',
        // 详情卡片内容
        desc: `探索AI技术在解决用户在大额消费决策，小众运动记录及自我管理中的痛点解决与落地应用，最终成功上线三款产品，其中核心产品用户数突破1w+，总点击量超6w。\n**财务管理**：主要针对大额消费决策痛点，设计基于AI对话的“使用成本”模型，通过多轮问答引导用户模拟使用场景，购前自动计算日均、次均收益，辅助用户决策。同时包含购中的比价核价功能，和购后的实际支出量化模块。\n**垂直兴趣**：围绕自由潜爱好，核心聚焦潜点回忆管理，出行规划指南维度，利用AI实现智能匹配潜点适宜季节、鱼群信息，及日常个性化训练计划生成助手。\n**效率工具**：整合打卡、待办与提醒功能，引入数据可视化看板，帮助用户直观量化时间投入与任务完成率，提升自我管理效率及生产趣味性。`,
        // 图片：用手机框展示
        media: [
          { type: 'phone', name: '极简记', url: '/images/vc01.jpg' },
          { type: 'phone', name: '一格一意', url: '/images/vc02.jpg' }
        ]
      },
      {
        id: 'microsoft',
        name: 'Microsoft',
        role: 'User Research',
        period: '2024.07 - 2024.10',
        spacing: 'medium',
        desc: `回顾英文文献，进行桌面研究收集各类活动障碍与运动障碍如何影响患者与计算机的互动，明确捕捉残疾用户痛点，使用fMRI，EEG等器械对被试与数字设备交互时的脑部激活区域进行监控，并使用R语言，SPSS，进行方差分析，显著性检验等可视化处理。\n配合NHS partners，分别对残疾用户在操作MotionInput 3-Facial Navigation的手势导航，杆式导航以及语言导航的可用性及易用性进行了评估，设计实验制定与观察指标化操作，协助软件开发改进个性化交互设置等逻辑，优化用户引导流程与用户体验。`,
        media: []   // 无图片
      },
      {
        id: 'mew-studio',
        name: '晴天 Mew Studio',
        role: 'Project Assistant',
        period: '2021.09 - 2022.05',
        spacing: 'small',
        desc: `图片美化、视频编辑、账号运营：独立使用PS，Pr等软件对摄影师提供的照片、视频进行后期处理，色彩，构图美化，剪辑等。同时关注账号数据，根据目标观众喜好，与摄影师沟通，协助以呈现更好的效果。\n运营期间账号累计获赞与收藏超80w，较运营前期，互动数量，点赞数量均提升20%。运营期间发布笔记150篇，账号涨粉10w，成功转化50名以上新客户，其中包含20名长期客户。`,
        media: []
      }
    ],
    animation: 'timeline',
    style: 'neumorphism'   // 新拟物风格
  },

  // ===== 软木板：关于她（3D 封面轮播） =====
  board: {
    id: 'board',
    tooltip: '关于她',
    tooltipHint: '双击查看详情',
    panelTitle: '关于她',
    cards: [
      { title: '学历', content: '伦敦大学心理学(QS9)', image: '/images/education.jpg' },
      { title: 'AI技能', content: '有Vibecoding能力，理解各大生成式AI能力边界，持续关注AI大模型产品动态，有个人思考和见解。'},
      { title: '语言', content: '商务英语水准，曾参与IFA、CES、硅谷发布会，等展会搭建和讲解支持(证书：IETLS7)'},
      { title: '数据分析', content: '心理学专业累计了坚实的数据分析基础，有20+次独立设计实验经验，熟练运用R语言, SPSS, Power BI'},
      { title: '修图建模', content: 'Blender/Style3D/Ps/Pr'}
    ],
    animation: 'cover-flow'
  },

  phone: {
    id: 'phone',
    tooltip: '她的联系方式',
    tooltipHint: '双击查看详情',
    panelTitle: '联系方式',
    // 方阵布局：左列 = 候选人姓名 + 状态，右列 = 手机/微信号 + 邮箱
    content: {
      left: [
        { label: '候选人姓名：', value: '黄皓冉（zaya）' },
        { label: '状态：', value: '正在考虑新机会' },
      ],
      right: [
        { label: '手机/微信号：', value: '13914930304' },
       { label: '邮箱：', value: 'zayayayaya@outlook.com', display: 'zayayayaya|@outlook.com', copyable: true },
      ],
      slogan: '让我们保持联系吧',
    },
  },

  // ===== 软木板：关于她（滚动叙事，Neumorphism + 单色） =====
  scrollStory: {
    id: 'scrollStory',
    tooltip: '关于她',
    tooltipHint: '双击查看详情',
    panelTitle: '关于她',
    style: 'neumorphism',
    // 每一屏是一个 section，按顺序从上到下滚动
    sections: [
      // ---- 第 1 屏：学历 ----
      {
        id: 'education',
        type: 'education',
        title: '学历',
        main: '伦敦大学（QS9） · 心理学',
        note: '主修：普通心理学，行为认知学，脑机交互行为，统计方法与研究设计，定性研究方法',
        image: '/images/education.jpg',
        animation: 'fade-up-slide-in'
      },

      // ---- 第 2 屏：专业技能（滚多少，卡片转多少） ----
      {
        id: 'skills',
        type: 'cover-flow',
        title: '专业技能',
        // 滚动驱动：scrollYProgress 0→1 时，卡片从第 1 张转到第 4 张
        cards: [
          {
            id: 'ai',
            title: 'AI技能',
            content: '有Vibe coding经验，独立搭建过小程序，理解各大生成式AI能力边界，持续关注AI大模型产品动态，有个人思考和见解。'
          },
          {
            id: 'language',
            title: '语言',
            content: '商务英语水准，曾参与IFA、CES、硅谷发布会, 等海外展会的讲解支持（证书：IELTS 7）。'
          },
          {
            id: 'data',
            title: '数据分析',
            content: '心理学专业累计了坚实的数据分析基础，有20+次独立设计实验、A/B test经验，熟练运用R语言、SPSS、Power BI。'
          },
          {
            id: 'modeling',
            title: '建模修图',
            content: '熟练使用Blender / Style3D / Ps / Pr，有建模、摄影爱好，产出过100+份自由潜视频剪辑成品。'
          }
        ],
        animation: 'cover-flow-scroll'
      },

      // ---- 第 3 屏：自由潜（3D 椭圆画廊 + 中心视频，滚动驱动） ----
      {
        id: 'diving',
        type: 'ellipse-gallery',
        title: '我也是：潜水员',
        desc: 'AIDA-4星，PADI-AOW持证潜水员',
        // 10 张照片重复两遍：顺序 01→10→01→10，均匀分布在椭圆上
        photos: [
          '/images/01.jpg',
          '/images/02.jpg',
          '/images/03.jpg',
          '/images/04.jpg',
          '/images/05.jpg',
          '/images/06.jpg',
          '/images/07.jpg',
          '/images/08.jpg',
          '/images/09.jpg',
          '/images/10.jpg',
          '/images/01.jpg',
          '/images/02.jpg',
          '/images/03.jpg',
          '/images/04.jpg',
          '/images/05.jpg',
          '/images/06.jpg',
          '/images/07.jpg',
          '/images/08.jpg',
          '/images/09.jpg',
          '/images/10.jpg',
        ],
        video: '/images/diving.mp4',
      },

      // ---- 第 4 屏：户外爱好者（胶片横向滚动） ----
      {
        id: 'cycling',
        type: 'film-strip',
        title: '我也是：户外爱好者',
        desc: '曾山地车骑行川藏线、济州岛、多洛米蒂大环线',
        photos: [
          '/images/cycling-1.jpg',
          '/images/cycling-2.jpg',
          '/images/cycling-3.jpg',
          '/images/cycling-4.png',
          '/images/cycling-5.jpg',
          '/images/cycling-6.jpg',
          '/images/cycling-7.jpg',
          '/images/cycling-8.jpg'
        ],
        animation: 'film-strip'
      },

      // ---- 第 5 屏：宠物服装设计师（照片挂在衣架上摆动） ----
      {
        id: 'pet-design',
        type: 'hanging-photos',
        title: '我也是：宠物服装设计师',
        desc: '熟练使用建模、3D服装建模软件，作为业余宠物建模、服装设计师',
        photos: [
          '/images/pet-1.jpg',
          '/images/pet-2.jpg',
          '/images/pet-3.jpg',
          '/images/pet-4.jpg'
        ],
        animation: 'hanging-photos'
      },

      // ---- 第 6 屏：结尾 ----
      {
        id: 'end',
        type: 'end',
        text: 'to be continued',
        animation: 'fade-in'
      }
    ]
  }
}