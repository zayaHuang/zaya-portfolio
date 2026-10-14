// src/components/BadgePanel.jsx
// 工牌详情页（全屏，不是浮层）：双击工牌后进入
// 阶段流转：'initial' 初始 → 'detail' 详情 → 'keyPoints' 提炼重点 ⇄ 'detail'
// 提炼动画（layoutId 共享元素方案，id 用文字本身做 key，不依赖出现顺序）：
//   1. 详情页：content 里的 [[K:文字]] → <motion.span layoutId="keypoint-文字">，
//      [[E:文字]] → <motion.span layoutId="evidence-文字">，渲染成普通文字
//   2. 点“提炼重点”：无关文字以“模糊溶解”方式缓慢消失（y:-80 + opacity:0 + blur，
//      staggerChildren 控制节奏）；关键词/佐证保持在原位，等正文消失得差不多后
//      以弹簧（stiffness 200 / damping 15）从各自原位弹性归位到提炼页的最终位置
//   3. 点“回到详情”：提炼页元素卸载、正文反向溶解重现，关键词/佐证借 layoutId 弹回原句
//   4. 归位完成的那一刻，屏幕上方中间直接出现 experience.summaryText（无动画），
//      点“回到详情”立刻消失
// 防误触：动画期间 isAnimating = true，主按钮禁用（变灰），动画完成（定时器到期）才恢复；
//   每次回到详情还用一个 round 计数给 AnimatePresence 换 key，强制重新挂载 sections，
//   避免复用未完成的 exit/enter 状态导致正文回不来、关键词卡在提炼页
import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { portfolioData } from '../data'
import './BadgePanel.css'

// 布局移动用弹簧（头像 / 名字块），淡入淡出用缓动曲线
const SPRING = { type: 'spring', stiffness: 260, damping: 30 }
const EASE = { duration: 0.45, ease: [0.22, 1, 0.36, 1] }
// 关键词/佐证弹性归位 / 回句用的弹簧（用户指定参数）
const KEY_SPRING = { type: 'spring', stiffness: 200, damping: 15 }
// 正文溶解约 1.3s；等它几乎消失完，关键词/佐证才开始弹性归位（“快消失完时”）
const KEY_MOVE_DELAY = 2
// 弹簧（stiffness 200 / damping 15）视觉上基本落定的时间（可调大）
const SPRING_SETTLE = 1.2
// 正文溶解 / 反向溶解（stagger 叠加）的总时长，用于算按钮禁用时长
const DISSOLVE_MS = 1300

/* ====== 模糊溶解 variants（sections 进出场共用，进场 = 反向溶解） ====== */
const sectionsList = {
  hidden: { transition: { staggerChildren: 0.1 } },
  visible: { transition: { staggerChildren: 0.1 } },
  dissolve: { transition: { staggerChildren: 0.12 } },   // 四段文字逐个开始溶解
}
const sectionBlock = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.045 } },
  dissolve: { transition: { staggerChildren: 0.035 } },  // 每段内部：标题 → 短句逐个溶解
}
const dissolveItem = {
  hidden: { opacity: 0, y: -80, filter: 'blur(10px)' },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
  },
  dissolve: {
    opacity: 0,
    y: -80,
    filter: 'blur(10px)',
    transition: { duration: 0.45, ease: 'easeIn' },
  },
}

/* 关键词专用：进场跟着渐入，出场原地不动（交给 layoutId 动画） */
const keywordItem = {
  hidden: {
    opacity: 0,
    y: -80,
    filter: 'blur(10px)',
  },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
  },
  dissolve: {
    opacity: 1,       // 保持不变
    y: 0,             // 保持原位
    filter: 'blur(0px)',
    transition: { duration: 0 },   // 瞬间，不做动画
  },
}

/* 佐证专用：与关键词相同（也是“留下的”元素，溶解时保持原位） */
const evidenceItem = {
  hidden: {
    opacity: 0,
    y: -80,
    filter: 'blur(10px)',
  },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
  },
  dissolve: {
    opacity: 1,       // 保持不变
    y: 0,             // 保持原位
    filter: 'blur(0px)',
    transition: { duration: 0 },   // 瞬间，不做动画
  },
}

/* ====== content 解析 ====== */

// 把 content 按 [[K:...]] / [[E:...]] 拆开（出现顺序 = 自然行文顺序，可以完全打乱）：
//   [[K:文字]] → { type: 'keyword',  text }
//   [[E:文字]] → { type: 'evidence', text }
//   其余      → { type: 'text',     text }
function parseContent(content) {
  return String(content)
    .split(/(\[\[[KE]:[^\]]+\]\])/)
    .filter(Boolean)
    .map((token) => {
      const m = token.match(/^\[\[([KE]):([^\]]+)\]\]$/)
      return m
        ? { type: m[1] === 'K' ? 'keyword' : 'evidence', text: m[2].trim() }
        : { type: 'text', text: token }
    })
}

// 把普通文本按标点切成短句，让“模糊溶解”逐句发生
//（想逐字溶解就把下面正则换成 split('')）
function splitClauses(text) {
  const parts = String(text).match(/[^，。；：、！？]+[，。；：、！？]?/g)
  return parts ?? [String(text)]
}

export default function BadgePanel({ onClose }) {
  const experience = portfolioData.badge?.experiences?.[0] ?? {}
  const { header = {}, sections = [], keyPoints = [], summaryText = '' } = experience

  // step: 'initial' 初始 | 'detail' 详情 | 'keyPoints' 提炼重点
  const [step, setStep] = useState('initial')
  // 完成过一轮“详情 → 提炼重点”后，常驻显示“下载简历”按钮
  const [cycleDone, setCycleDone] = useState(false)
  // 动画进行中：期间禁用“提炼重点 / 回到详情”按钮，防止中途点击打断动画
  const [isAnimating, setIsAnimating] = useState(false)
  // 每次回到详情 +1，用它给 AnimatePresence 的 sections 换 key，
  // 强制重新挂载（不复用未完成的 exit/enter 状态，避免正文回不来）
  const [round, setRound] = useState(0)
  // 摘要文字（experience.summaryText）：关键词/佐证归位完成的那一刻直接出现（无动画）
  const [showSummary, setShowSummary] = useState(false)

  // 动画结束定时器：切阶段时重新计时；组件卸载时全部清掉
  const timersRef = useRef([])
  function scheduleAnimEnd(ms) {
    timersRef.current.forEach(clearTimeout)
    timersRef.current = []
    timersRef.current.push(setTimeout(() => setIsAnimating(false), ms))
  }
  // 摘要出现定时器：与动画结束定时器分开管理，避免互相清除。
  // 用估算时间点而不是 onAnimationComplete：layoutId 交接 + delay 场景下
  // 该回调触发不稳定（initial={false} 时可能提前/不触发），这里沿用和
  // isAnimating 完全相同的公式，保证“落定的那一刻”和按钮恢复是同一瞬间
  const summaryTimerRef = useRef(null)
  function scheduleShowSummary(ms) {
    if (summaryTimerRef.current) clearTimeout(summaryTimerRef.current)
    summaryTimerRef.current = setTimeout(() => setShowSummary(true), ms)
  }
  useEffect(() => () => {
    timersRef.current.forEach(clearTimeout)
    if (summaryTimerRef.current) clearTimeout(summaryTimerRef.current)
  }, [])

  const isInitial = step === 'initial'
  const buttonLabel = isInitial ? '详情' : step === 'detail' ? '提炼重点' : '回到详情'

  // 解析好的四段正文（tokens 按行文顺序）
  const sectionsWithTokens = sections.map((section) => ({
    ...section,
    tokens: parseContent(section.content),
  }))

  // 正文里出现过的关键词/佐证文字（用来判断提炼页元素是否有原位可交接）
  const inlineKeywords = new Set()
  const inlineEvidence = new Set()
  sectionsWithTokens.forEach((s) =>
    s.tokens.forEach((t) => {
      if (t.type === 'keyword') inlineKeywords.add(t.text)
      if (t.type === 'evidence') inlineEvidence.add(t.text)
    })
  )

  // 文字 → 在 keyPoints 里的位置（决定归位 / 回句的先后顺序）
  const keywordOrder = new Map(keyPoints.map((p, i) => [p.text, i]))
  const evidenceOrder = new Map()
  keyPoints.forEach((p, i) =>
    p.evidence.forEach((ev, j) => evidenceOrder.set(ev, { i, j }))
  )

  // 回详情时：关键词按 keyPoints 顺序逐个回句，佐证跟在各自关键词后面
  const keywordReturnDelay = (text) => 0.15 * (keywordOrder.get(text) ?? 0)
  const evidenceReturnDelay = (text) => {
    const pos = evidenceOrder.get(text)
    return pos ? 0.45 + 0.15 * pos.i + 0.12 * pos.j : 0
  }

  // 动画总时长（按钮禁用到什么时候）：
  // 详情 → 提炼重点：等待正文消失 + 最后一个关键词错开 + 佐证跟随 + 弹簧落定
  const lastKeywordDelay = 0.15 * Math.max(keyPoints.length - 1, 0)
  const lastEvidenceDelay =
    0.12 * Math.max(...keyPoints.map((p) => p.evidence.length - 1), 0)
  const toKeyPointsMs =
    (KEY_MOVE_DELAY + lastKeywordDelay + 0.45 + lastEvidenceDelay + SPRING_SETTLE) * 1000
  // 提炼重点 → 详情：正文反向溶解与回句动画并发，取较长的那个
  const toDetailMs = Math.max(
    DISSOLVE_MS,
    (0.45 + lastKeywordDelay + lastEvidenceDelay + SPRING_SETTLE) * 1000
  )

  function handleMainClick() {
    if (isAnimating) return // 双保险：动画未完成时不响应
    if (isInitial) {
      setStep('detail')
      setRound((r) => r + 1)
      setShowSummary(false)
      setIsAnimating(true)
      scheduleAnimEnd(DISSOLVE_MS) // 等正文入场动画完成
    } else if (step === 'detail') {
      setCycleDone(true)
      setStep('keyPoints') // 正文开始溶解；关键词/佐证先停原位，delay 结束再弹性归位
      setShowSummary(false)
      setIsAnimating(true)
      scheduleAnimEnd(toKeyPointsMs) // 等关键词归位动画完成（KEY_MOVE_DELAY + 弹簧）
      scheduleShowSummary(toKeyPointsMs) // 归位完成的那一刻，摘要直接出现（无动画）
    } else {
      // 回到详情：摘要立刻消失（清掉还没触发的出现定时器，双保险），
      // 提炼页卸载，关键词/佐证借 layoutId 弹回原句，正文反向溶解重现
      if (summaryTimerRef.current) clearTimeout(summaryTimerRef.current)
      setShowSummary(false)
      setStep('detail')
      setRound((r) => r + 1) // 换 key 强制重新挂载 sections，避免复用未完成的动画状态
      setIsAnimating(true)
      scheduleAnimEnd(toDetailMs) // 等正文恢复动画完成
    }
  }

  return (
    <motion.div
      className={isInitial ? 'badge-panel badge-panel--initial' : 'badge-panel'}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* 左上角返回：回到 3D 场景（App 里 onClose = () => setActivePanel(null)） */}
      <button className="badge-back" onClick={onClose}>← 返回</button>

      {/* 顶部：名字信息（左） + 头像（右），layout 让它们在阶段切换时平滑移动、缩放 */}
      <header className="badge-top">
        <motion.div layout transition={SPRING} className="badge-name-block">
          <motion.div
  className="badge-name-content"
  initial="hidden"
  animate="visible"
  variants={{
    hidden: {},
    visible: { transition: { staggerChildren: 0.15 } },
  }}
>
  <motion.p
    className="badge-greeting"
    variants={{
      hidden: { opacity: 0, y: 12 },
      visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
    }}
  >
    {header.greeting}
  </motion.p>
  <motion.h1
    className="badge-name"
    variants={{
      hidden: { opacity: 0, y: 12 },
      visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
    }}
  >
    {header.name}
  </motion.h1>
  <motion.p
    className="badge-meta"
    variants={{
      hidden: { opacity: 0, y: 12 },
      visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
    }}
  >
    {header.period}
    {isInitial && ` · ${header.title}`}
  </motion.p>
</motion.div>
        </motion.div>

        <motion.div layout transition={SPRING} className="badge-avatar-block">
          <motion.img
  layout
  transition={SPRING}
  className="badge-avatar"
  src={header.avatar}
  alt="头像"
  initial={{ opacity: 0, scale: 0.9 }}
  animate={{ opacity: 1, scale: 1 }}
/>
          <AnimatePresence>
            {/* 阶段 2/3：头像后面跟灰色小字角色 */}
            {!isInitial && (
              <motion.span
                className="badge-role"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={EASE}
              >/产品经理</motion.span>
            )}
          </AnimatePresence>
        </motion.div>
      </header>

      {/* 摘要：关键词/佐证归位完成的瞬间直接出现（无淡入动画），回到详情立刻消失。
          普通 <p> 不做 motion 包装，出现/消失都是瞬间的 */}
      {step === 'keyPoints' && showSummary && summaryText && (
        <p className="badge-summary">{summaryText}</p>
      )}

      {/* 主体（阶段 1 留白） */}
      {!isInitial && (
        <main className="badge-body">
          {/* 四段详情：退出时模糊溶解（AnimatePresence 控制消失/恢复）。
              key 带 round：每次回到详情都换 key 重新挂载，
              AnimatePresence 不会复用中断的 exit/enter 状态 */}
          <AnimatePresence>
            {step === 'detail' && (
              <motion.div
                key={`sections-${round}`}
                className="badge-sections"
                variants={sectionsList}
                initial="hidden"
                animate="visible"
                exit="dissolve"
              >
                {sectionsWithTokens.map((section) => (
                  <motion.section
                    className="badge-section"
                    key={section.title}
                    variants={sectionBlock}
                  >
                    {/* 段落标题：字体偏大，前面有圆点 */}
                    <motion.h2 className="badge-section-title" variants={dissolveItem}>
                      <span className="badge-dot" />
                      {section.title}
                    </motion.h2>
                    <p className="badge-section-content">
                      {section.tokens.map((token, ti) => {
                        if (token.type === 'keyword') {
                          /* [[K:文字]]：渲染成普通文字，layoutId 与提炼页的 h2 共享；
                             溶解时保持在原位，被 h2 接替后由 h2 显示同一份文字 */
                          return (
                            <motion.span
                              className="badge-keyword-inline"
                              key={`k-${ti}`}
                              layoutId={`keypoint-${token.text}`}
                              variants={keywordItem}
                              transition={{
                                ...KEY_SPRING,
                                delay: keywordReturnDelay(token.text),
                              }}
                            >
                              {token.text}
                            </motion.span>
                          )
                        }
                        if (token.type === 'evidence') {
                          /* [[E:文字]]：灰色小字，layoutId 与提炼页的 evidence 共享，
                             同样保持在原位等待交接 */
                          return (
                            <motion.span
                              className="badge-evidence-inline"
                              key={`e-${ti}`}
                              layoutId={`evidence-${token.text}`}
                              variants={evidenceItem}
                              transition={{
                                ...KEY_SPRING,
                                delay: evidenceReturnDelay(token.text),
                              }}
                            >
                              {token.text}
                            </motion.span>
                          )
                        }
                        /* 无关文字：切成短句，溶解时逐句 y:-80 + 模糊消失 */
                        return splitClauses(token.text).map((clause, ci) => (
                          <motion.span
                            className="badge-clause"
                            variants={dissolveItem}
                            key={`t-${ti}-${ci}`}
                          >
                            {clause}
                          </motion.span>
                        ))
                      })}
                    </p>
                  </motion.section>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* 提炼页：关键词/佐证的最终位置（CSS 绝对定位 + 居中）。
              与正文里的 span 共享 layoutId（keypoint-文字 / evidence-文字）：
              挂载时 framer 让它们从原句的包围盒出发，transition.delay 期间停在原位，
              delay 结束（正文快消失完）后弹性归位到最终位置。
              注意：staggerChildren 无法直接错开 layoutId 交接动画，这里用 delay
              错开实现“逐个落位”；没有原位（正文里没标记）的元素改为落位后淡入 */}
          {step === 'keyPoints' && (
            <div className="badge-keypoints">
              {keyPoints.map((point, i) => {
                const keywordHasInline = inlineKeywords.has(point.text)
                return (
                  <div className="badge-keypoint" key={point.text}>
                    <motion.h2
                      className="badge-keypoint-text"
                      layoutId={`keypoint-${point.text}`}
                      initial={keywordHasInline ? false : { opacity: 0 }}
                      animate={keywordHasInline ? undefined : { opacity: 1 }}
                      transition={
                        keywordHasInline
                          ? { ...KEY_SPRING, delay: KEY_MOVE_DELAY + 0.15 * i }
                          : { delay: KEY_MOVE_DELAY + 0.15 * i, duration: 0.4 }
                      }
                    >
                      {point.text}
                    </motion.h2>
                    <div className="badge-keypoint-evidence">
                      {point.evidence.map((ev, j) => {
                        const evHasInline = inlineEvidence.has(ev)
                        return (
                          <motion.div
                            className="badge-evidence"
                            key={ev}
                            layoutId={`evidence-${ev}`}
                            initial={evHasInline ? false : { opacity: 0 }}
                            animate={evHasInline ? undefined : { opacity: 1 }}
                            transition={
                              evHasInline
                                ? {
                                    ...KEY_SPRING,
                                    delay: KEY_MOVE_DELAY + 0.45 + 0.15 * i + 0.12 * j,
                                  }
                                : {
                                    delay: KEY_MOVE_DELAY + 0.45 + 0.15 * i + 0.12 * j,
                                    duration: 0.4,
                                  }
                            }
                          >
                            {ev}
                          </motion.div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </main>
      )}

      {/* 按钮区：位置固定不变 */}
      <div className="badge-actions">
        <AnimatePresence>
          {/* 第一轮切换完成后出现“下载简历”（在主按钮左边） */}
          {cycleDone && (
            <motion.a
              className="badge-btn badge-btn--ghost"
              href="/resume-zaya.pdf"   // public 里的实际文件名
              download
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 12 }}
              transition={EASE}
            >下载简历</motion.a>
          )}
        </AnimatePresence>
        {/* 动画期间禁用主按钮，防止中途打断（CSS 里 :disabled 变灰） */}
        <motion.button
          className="badge-btn badge-btn--primary"
          onClick={handleMainClick}
          disabled={isAnimating}
          whileTap={isAnimating ? undefined : { scale: 0.96 }}
        >{buttonLabel}</motion.button>
      </div>
    </motion.div>
  )
}
