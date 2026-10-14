// src/components/ComputerPanel.jsx
// 显示器项目经历面板（全屏）：左侧 slogan + 右侧垂直时间轴
// 布局：slogan 垂直居中；时间轴是一根渐变线（transparent → 主色 → transparent），
//   三个节点按各自 spacing 拉开间距（large 120 / medium 80 / small 50）
// 进场动画（挂载时触发，全部只动 transform/opacity/filter，不影响后续点击交互）：
//   slogan 模糊溶解：opacity 0→1 + blur(12px→0)，0.8s
//   时间轴直线：scaleY 0→1 从顶部向下生长，1.2s（transform-origin: top 在 CSS 里）
//   三个节点：直线长完后（延迟 1.2s）依次弹出 scale 0→1 + opacity 0→1，
//   每个 0.4s、错开 0.15s（delay = 1.2 + 序号 × 0.15）
// 点击图片放大：点击手机框（及普通图）里的图片 → 全屏 lightbox
//   （半透明黑底 + 原图尺寸，点任意位置或按 Esc 关闭，淡入淡出）
// 交互：点击节点 → 详情卡片在节点左侧展开（卡片可遮住 slogan，但不遮时间轴）；
//   点卡片外的空白处（左侧区域的透明遮罩）收起；点其他节点自动收起当前卡片并展开新卡片。
//   节点单击、双击都能打开（节点旁的文案是“点击查看详情”，单击同样响应，两者不冲突；
//   重复点同一个节点不会收起，收起只走“点空白 / 切节点”两条路径）
// 卡片内容：desc（\n 分段 + **粗体**）+ media
//   media.type === 'phone' 用纯 CSS 手机框：32px 圆角、新拟物双向阴影、
//   内部 overflow: hidden + object-fit: cover、顶部听筒小横条，下方显示 label · name
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { portfolioData } from '../data'
import './ComputerPanel.css'

const EASE = { duration: 0.28, ease: [0.22, 1, 0.36, 1] }

// 节点间距：large 最大 / medium 中等 / small 最小
const SPACING_MAP = { large: 120, medium: 80, small: 50 }

// desc 里的 **粗体** 解析：按 **...** 切分，命中的渲染成 <strong>
function renderBold(text) {
  return String(text)
    .split(/(\*\*[^*]+\*\*)/)
    .filter(Boolean)
    .map((part, i) =>
      part.startsWith('**') && part.endsWith('**') ? (
        <strong key={i}>{part.slice(2, -2)}</strong>
      ) : (
        <span key={i}>{part}</span>
      )
    )
}

export default function ComputerPanel({ onClose }) {
  const computer = portfolioData.computer ?? {}
  const { slogan = '', projects = [] } = computer

  // 展开卡片的项目 id；null = 全部收起
  const [openId, setOpenId] = useState(null)
  // 卡片定位：锚点 y（点击的节点中心相对左侧区域顶部的距离）+
  // 实测卡片高度 / 左侧区域高度，用来把卡片垂直居中到锚点并夹在屏幕范围内
  const [anchorY, setAnchorY] = useState(0)
  const [cardH, setCardH] = useState(0)
  const [areaH, setAreaH] = useState(0)

  const leftRef = useRef(null)      // 左侧区域：slogan / 遮罩 / 卡片的定位基准
  const nodeRefs = useRef({})       // id → 时间轴节点行元素
  const cardRef = useRef(null)

  // lightbox：非 null = { url, name }，点击图片放大后展示；null = 关闭
  const [lightbox, setLightbox] = useState(null)

  const openProject = projects.find((p) => p.id === openId) ?? null

  // 点节点：记录节点中心的 y 并展开（点同一个节点保持展开，收起只走点空白/切节点）
  function openCard(id) {
    const row = nodeRefs.current[id]
    const left = leftRef.current
    let y = 0
    if (row && left) {
      const rowRect = row.getBoundingClientRect()
      const leftRect = left.getBoundingClientRect()
      y = rowRect.top + rowRect.height / 2 - leftRect.top
    }
    setAnchorY(y)
    setCardH(0)   // 重置实测高度，卡片挂载后重新量
    setOpenId(id)
  }

  function closeCard() {
    setOpenId(null)
  }

  // 卡片挂载/内容变化后：实测卡片高度和左侧区域高度（layout effect 在绘制前执行，
  // 首帧就能把 top 算对，不会闪跳）
  useLayoutEffect(() => {
    if (!openId) return
    const card = cardRef.current
    const left = leftRef.current
    if (!card || !left) return
    const h = card.offsetHeight
    const a = left.clientHeight
    if (h !== cardH) setCardH(h)
    if (a !== areaH) setAreaH(a)
  }, [openId, cardH, areaH])

  // 窗口尺寸变化时重算锚点，卡片跟着节点走
  useEffect(() => {
    function onResize() {
      if (openId) openCard(openId)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [openId])

  // lightbox 打开时按 Esc 关闭
  useEffect(() => {
    if (!lightbox) return
    function onKey(e) {
      if (e.key === 'Escape') setLightbox(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lightbox])

  // 卡片 top：以节点锚点为中心，夹在 [24, 区域高 - 卡片高 - 24] 之间（不超出屏幕上下）
  const cardTop = openId
    ? Math.min(
        Math.max(anchorY - cardH / 2, 24),
        Math.max(24, areaH - cardH - 24)
      )
    : 0

  return (
    <motion.div
      className="computer-panel"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* 左上角返回：回到 3D 场景 */}
      <button className="computer-back" onClick={onClose}>← 返回</button>

      <div className="computer-layout">
        {/* 左侧：slogan 垂直居中；详情卡片展开时叠加在它上面 */}
        <section className="computer-slogan-area" ref={leftRef}>
          {/* 进场：模糊溶解（opacity + blur 一起动，0.8s） */}
<motion.div
           className="computer-slogan"
           initial={{ opacity: 0, filter: 'blur(12px)' }}
           animate={{ opacity: 1, filter: 'blur(0px)' }}
           transition={{ duration: 0.8, ease: 'easeOut' }}
>
     <span className="computer-slogan-lead">{slogan.lead}</span>
  <span className="computer-slogan-rest">{slogan.rest}</span>
</motion.div>

          {/* 点卡片外空白收起的透明遮罩：只盖左侧区域，时间轴始终可点 */}
          <AnimatePresence>
            {openProject && (
              <motion.div
                className="computer-backdrop"
                onClick={closeCard}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              />
            )}
          </AnimatePresence>

          {/* 详情卡片：绝对定位，右边缘贴着时间轴一侧（不遮时间轴），
              垂直方向以点击的节点为中心；key 用项目 id，切换节点时旧卡收起、新卡展开 */}
          <AnimatePresence>
            {openProject && (
              <motion.div
                className="computer-card"
                key={openProject.id}
                ref={cardRef}
                style={{ top: cardTop }}
                initial={{ opacity: 0, x: 28 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 28 }}
                transition={EASE}
              >
                <header className="computer-card-header">
                  <h2 className="computer-card-name">{openProject.name}</h2>
                  <p className="computer-card-meta">
                    {openProject.role} · {openProject.period}
                  </p>
                </header>

                <div className="computer-card-desc">
                  {String(openProject.desc ?? '')
                    .split('\n')
                    .filter((line) => line.trim() !== '')
                    .map((line, i) => (
                      <p key={i}>{renderBold(line)}</p>
                    ))}
                </div>

                {(openProject.media ?? []).length > 0 && (
                  <div className="computer-media">
                    {openProject.media.map((m, i) => (
                      <figure className="computer-media-item" key={`${m.name}-${i}`}>
                        {m.type === 'phone' ? (
                          /* 纯 CSS 手机框：新拟物双向阴影 + 32px 圆角 +
                             内部图片 overflow: hidden / object-fit: cover 撑满 +
                             顶部听筒小横条 */
                          <div className="computer-phone">
                            <span className="computer-phone-speaker" />
                            <div
                              className="computer-phone-screen"
                              title="点击查看原图"
                              onClick={() => setLightbox({ url: m.url, name: m.name })}
                            >
                              <img src={m.url} alt={m.name} />
                            </div>
                          </div>
                        ) : (
                          /* 非 phone 类型的兜底：普通圆角图 */
                          <div
                            className="computer-media-plain"
                            title="点击查看原图"
                            onClick={() => setLightbox({ url: m.url, name: m.name })}
                          >
                            <img src={m.url} alt={m.name} />
                          </div>
                        )}
                        <figcaption className="computer-media-caption">
                          {m.label ? `${m.label} · ${m.name}` : m.name}
                        </figcaption>
                      </figure>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* 右侧：垂直时间轴（渐变线 + 三个节点），从上到下 */}
        <section className="computer-timeline">
          {/* 进场：直线从顶部向下生长（transform-origin: top 在 CSS 里） */}
          <motion.div
            className="computer-timeline-line"
            initial={{ scaleY: 0 }}
            animate={{ scaleY: 1 }}
            transition={{ duration: 1.2, ease: 'easeInOut' }}
          />
          <div className="computer-timeline-items">
            {/* 进场：直线长完后（1.2s）三个节点依次弹出，每个 0.4s、错开 0.15s；
                节点只动 transform/opacity，不碰布局和点击区域 */}
            {projects.map((p, i) => (
              <motion.div
                className="computer-timeline-item"
                key={p.id}
                ref={(el) => {
                  nodeRefs.current[p.id] = el
                }}
                style={{
                  marginTop: i === 0 ? 0 : (SPACING_MAP[p.spacing] ?? SPACING_MAP.medium),
                }}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 1.2 + i * 0.15, duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
              >
                <button
                  className={`computer-node${openId === p.id ? ' computer-node--open' : ''}`}
                  onClick={() => openCard(p.id)}
                  onDoubleClick={() => openCard(p.id)}   // 单击双击都能打开
                >
                  <span className="computer-node-dot" />
                  <span className="computer-node-info">
                    <span className="computer-node-name">{p.name}</span>
                    <span className="computer-node-hint">点击查看详情</span>
                  </span>
                </button>
              </motion.div>
            ))}
          </div>
        </section>
      </div>

      {/* 点击图片放大：全屏 lightbox，点任意位置关闭（淡入淡出） */}
      <AnimatePresence>
        {lightbox && (
          <motion.div
            className="computer-lightbox"
            onClick={() => setLightbox(null)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <img src={lightbox.url} alt={lightbox.name} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
