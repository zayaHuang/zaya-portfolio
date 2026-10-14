// src/components/InteractiveWrapper.jsx
// 可交互物体包装器：悬停浮起 + 白底黑字气泡 + 双击打开面板 + 待机发光（轻打扰）
// 附带音效：悬停播 /sound/select.wav，双击播 /sound/click.wav（音量 0.5，不吵 HR）
//
// 用法（直接包在物体外面即可，物体的 position/rotation/scale 原样保留）：
//   <InteractiveWrapper id="badge" onOpen={setActivePanel} tooltipY={0.3} glowSize={0.4}>
//     <group position={[0.6, 0.68, 0.3]}>...</group>
//   </InteractiveWrapper>
//
// 说明：
// - id：data.js 里的面板 id（'badge' | 'computer' | 'board' | 'bookshelf'），
//       气泡文案自动取自 portfolioData[id].tooltip
// - onOpen：双击回调，参数是 id，用于 setActivePanel(id)
// - 气泡和发光圈以 children 的实际包围盒中心为锚点自动居中，
//   物体自带 position、或者嵌在桌子等其他 group 里，都不用重复填坐标
// - tooltipY：气泡在物体中心上方多高（世界单位）
// - glowY：发光圈相对物体中心的高度（默认 0 = 物体中心）
// - glowSize：发光圈初始半径
// - 音效：Audio 对象 useRef 懒创建一次、之后复用（不每次 new，避免内存泄漏）；
//   每次播放前 currentTime = 0，快速连续悬停也能每次听到；
//   悬停音效只在真正进入物体的那一刻播一次（网格间移动的连续 over/out 不重播）
import { useEffect, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Billboard, Html } from '@react-three/drei'
import * as THREE from 'three'
import { portfolioData } from '../data'
import './InteractiveWrapper.css'

/* ================================================================
   待机发光（全局共享）
   规则：5 秒无操作 → 进入待机，之后每 3 秒，4 个物体同时散一圈柔和白光；
         用户一移动鼠标 / 点击 / 滚轮 / 按键，立刻停止。
   实现：模块级单例状态 + 按时间戳计算脉冲相位（纯函数）。
         不用定时器驱动动画、不每帧 setState —— 各组件在 useFrame 里读，
         因此 4 个实例天然同步，也不产生 React 重渲染开销。
   ================================================================ */
const IDLE_DELAY = 5000       // 5 秒无操作进入待机
const PULSE_INTERVAL = 3000   // 待机期间每 3 秒一次脉冲
const PULSE_DURATION = 1300   // 单次脉冲时长（光圈向外扩散 + 淡出）

const glowState = {
  idle: false,      // 是否处于待机
  idleStartAt: 0,   // 进入待机的时间戳（performance.now()）
}

let idleTimer = null
let listenersAttached = false

function enterIdle() {
  glowState.idle = true
  glowState.idleStartAt = performance.now()
}

function onUserActivity() {
  if (glowState.idle) glowState.idle = false // 一有操作，立刻熄灭
  clearTimeout(idleTimer)
  idleTimer = setTimeout(enterIdle, IDLE_DELAY) // 重新计 5 秒
}

// 全局只挂一次监听；页面加载后就开始计 5 秒
function ensureActivityListeners() {
  if (listenersAttached) return
  listenersAttached = true
  ;['pointermove', 'pointerdown', 'wheel', 'keydown', 'touchstart'].forEach((evt) =>
    window.addEventListener(evt, onUserActivity)
  )
  idleTimer = setTimeout(enterIdle, IDLE_DELAY)
}

// 当前脉冲强度 0 → 1 → 0（正弦曲线，柔和淡入淡出）
function pulseStrength(now) {
  if (!glowState.idle) return 0
  const t = (now - glowState.idleStartAt) % PULSE_INTERVAL
  if (t >= PULSE_DURATION) return 0
  return Math.sin((t / PULSE_DURATION) * Math.PI)
}

/* ================================================================
   音效（select = 悬停，click = 双击）
   Audio 对象由各实例 useRef 懒创建、创建后复用（不每次 new，避免内存泄漏）。
   浏览器自动播放策略：pointerover 不算"用户激活"，用户第一次点击/按键前
   hover 播放会被拦截 —— 全局一次性解锁：首个手势时把所有已创建的 Audio
   静音 play 一下（手势回调里 play 必成功，成功后页面即获得出声授权，
   之后新创建的 Audio 也无需再解锁）。
   ================================================================ */
const SFX_VOLUME = 0.5    // 音量：默认 0.5，避免吵到 HR
const sfxAudios = []      // 已创建的 Audio 元素（解锁时遍历用）
let sfxUnlockAttached = false

function createSfx(src) {
  const audio = new Audio(src)
  audio.preload = 'auto'
  audio.volume = SFX_VOLUME
  sfxAudios.push(audio)
  ensureSfxUnlock()
  return audio
}

function ensureSfxUnlock() {
  if (sfxUnlockAttached) return
  sfxUnlockAttached = true
  const unlock = () => {
    sfxAudios.forEach((audio) => {
      audio.muted = true
      audio
        .play()
        .then(() => {
          audio.pause()
          audio.currentTime = 0
          audio.muted = false
        })
        .catch(() => {})
    })
    window.removeEventListener('pointerdown', unlock)
    window.removeEventListener('keydown', unlock)
  }
  window.addEventListener('pointerdown', unlock)
  window.addEventListener('keydown', unlock)
}

export default function InteractiveWrapper({
  id,
  children,
  position = [0, 0, 0],   // 可选：物体位置（不传时由 children 自带）
  rotation = [0, 0, 0],   // 可选：物体旋转
  scale = 1,              // 可选：物体缩放
  floatHeight = 0.05,     // 悬停上浮高度（世界单位）
  tooltipY = 0.5,         // 气泡在物体中心上方多高（世界单位）
  glowY = 0,              // 发光圈相对物体中心的高度
  glowSize = 0.6,         // 发光圈初始半径
  onOpen,                 // (id) => void，双击时触发，用于 setActivePanel(id)
}) {
  const floatRef = useRef()    // 浮起动画组
  const contentRef = useRef()  // 物体内容组（算包围盒中心用）
  const anchorRef = useRef()   // 气泡/发光圈的锚点组
  const ringRef = useRef()     // 向外扩散的光圈
  const haloRef = useRef()     // 物体周围的光晕
  const glowValue = useRef(0)  // 当前发光强度（每帧平滑后的值）
  const leaveTimer = useRef(null)
  const [hovered, setHovered] = useState(false)
  const selectSfxRef = useRef(null)  // 悬停音效 Audio（懒创建一次，之后复用）
  const clickSfxRef = useRef(null)   // 双击音效 Audio
  const isHoveredRef = useRef(false) // 悬停会话标记：只在真正进入物体的那一刻播一次

  // 复用 Audio：首次调用时才创建（模块级 createSfx），每次 currentTime = 0
  // 从头播 —— 快速连续悬停多个物体，每次都能听到
  function playSfx(ref, src) {
    if (!ref.current) ref.current = createSfx(src)
    const audio = ref.current
    audio.currentTime = 0
    audio.play().catch(() => {}) // 解锁前被自动播放策略拦截时静默，不报错
  }

  // 气泡文案直接读 data.js，改一处文案全场景生效
const tooltipText = portfolioData[id]?.tooltip
const tooltipHint = portfolioData[id]?.tooltipHint

  useEffect(() => {
    ensureActivityListeners()
    return () => {
      clearTimeout(leaveTimer.current)
      document.body.style.cursor = 'auto'
      selectSfxRef.current?.pause()
      clickSfxRef.current?.pause()
    }
  }, [])

  // 以 children 的实际包围盒中心为锚点，气泡和发光圈自动出现在物体正上方：
  // 物体自带 position（如 <Model position={...}/>）或嵌在别的 group 里都适用
  useEffect(() => {
    floatRef.current.updateWorldMatrix(true, true) // 先确保祖先矩阵已更新
    const box = new THREE.Box3().setFromObject(contentRef.current)
    if (box.isEmpty()) return
    const center = new THREE.Vector3()
    box.getCenter(center)
    // 把世界坐标中心转回 floatRef 的局部坐标（floatRef 可能嵌在桌子的 group 里）
    center.applyMatrix4(floatRef.current.matrixWorld.clone().invert())
    anchorRef.current.position.copy(center)
  }, [])

  // 浮起 + 发光全部在 useFrame 里做，不触发 React 重渲染
  useFrame((state, delta) => {
    // 1) 悬停浮起：目标 0 或 +floatHeight，damp 平滑过渡
    const targetY = hovered ? floatHeight : 0
    floatRef.current.position.y = THREE.MathUtils.damp(
      floatRef.current.position.y,
      targetY,
      8,
      delta
    )

    // 2) 待机发光：脉冲相位每帧按时间算；用户一动目标立刻回 0，
    //    damp(lambda 10) 用约 0.1 秒淡出 —— 视觉上就是“立刻停止”
    const targetGlow = pulseStrength(performance.now())
    glowValue.current = THREE.MathUtils.damp(glowValue.current, targetGlow, 10, delta)
    const g = glowValue.current

    const expand = 0.9 + 0.45 * g        // 光圈向外扩散至 1.35 倍
    ringRef.current.scale.setScalar(expand)
    ringRef.current.material.opacity = 0.4 * g
    haloRef.current.material.opacity = 0.13 * g
  })

  /* —— 悬停事件 ——
     模型由多块网格拼成，指针在网格之间移动会连续触发 out/over，
     所以“移出”延迟 90ms 再收气泡，避免闪烁。
     音效同理：只在真正进入物体那一刻（isHoveredRef false→true）播一次，
     网格间移动的连续 over 不会重播；换到另一个物体时每个实例各自播一次 */
  function handlePointerOver(e) {
    e.stopPropagation()
    clearTimeout(leaveTimer.current)
    const firstEnter = !isHoveredRef.current
    isHoveredRef.current = true
    setHovered(true)
    document.body.style.cursor = 'pointer'
    if (firstEnter) playSfx(selectSfxRef, '/sound/select.wav')
  }
  function handlePointerOut(e) {
    e.stopPropagation()
    clearTimeout(leaveTimer.current)
    leaveTimer.current = setTimeout(() => {
      isHoveredRef.current = false
      setHovered(false)
      document.body.style.cursor = 'auto'
    }, 90)
  }
  // 双击：播放点击音效 + 打开对应面板
  function handleDoubleClick(e) {
    e.stopPropagation()
    playSfx(clickSfxRef, '/sound/click.wav')
    onOpen?.(id)
  }

  return (
    // 浮起组在最外层：position.y 动画是世界单位，不受里面 scale 缩放影响
    <group
      ref={floatRef}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
      onDoubleClick={handleDoubleClick}
    >
      {/* 物体的位置 / 旋转 / 缩放（不传时由 children 自带） */}
      <group ref={contentRef} position={position} rotation={rotation} scale={scale}>
        {children}
      </group>

      {/* 气泡 + 发光圈：锚定在物体包围盒中心，跟着物体一起浮起 */}
      <group ref={anchorRef}>
        {/* 悬停气泡：白底黑字圆角 + 小箭头（样式在 InteractiveWrapper.css）。
            distanceFactor 控制气泡随镜头距离的缩放，觉得大/小就调这个数 */}
        {hovered && tooltipText && (
          <Html
            position={[0, tooltipY, 0]}
            center
            distanceFactor={8}
            zIndexRange={[30, 0]}
            style={{ pointerEvents: 'none' }}
          >
                <div className="interactive-tooltip">
                   <div className="interactive-tooltip-main">{tooltipText}</div>
                   {tooltipHint && <div className="interactive-tooltip-hint">{tooltipHint}</div>}
    </div>
          </Html>
        )}

        {/* 待机发光：Billboard 让光圈永远面向镜头（桌上平躺 / 墙上挂的物体都适用）；
            raycast 置空，光圈不参与鼠标命中，不会干扰悬停判定 */}
        <group position={[0, glowY, 0]}>
          <Billboard>
            <mesh ref={ringRef} raycast={() => null} frustumCulled={false}>
              <torusGeometry args={[glowSize, glowSize * 0.05, 16, 64]} />
              <meshBasicMaterial
                color="#ffffff"
                transparent
                opacity={0}
                depthWrite={false}
                blending={THREE.AdditiveBlending}
              />
            </mesh>
          </Billboard>
          <mesh ref={haloRef} raycast={() => null} frustumCulled={false}>
            <sphereGeometry args={[glowSize * 1.1, 24, 24]} />
            <meshBasicMaterial
              color="#ffffff"
              transparent
              opacity={0}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        </group>
      </group>
    </group>
  )
}
