// src/components/ScrollStoryPanel.jsx
// 软木板 → 滚动叙事面板（全屏）：每一屏 100vh，向下滚动逐屏讲述
// 滚动容器是面板内部的 .scrollstory-scroll（面板本体 fixed 盖全屏，返回按钮不随滚动走）。
// 已实现的屏：
//   education       静态屏（当前）：学历文字 + 照片 + 底部"向下滚动"提示（一直显示）
//   cover-flow      GSAP pin + scrub：钉住本屏旋转卡片圈 0→-90°，进度 0.8→1 时整体缩小 + 淡出退场
//   ellipse-gallery 3D 椭圆画廊（@react-three/fiber + drei）：GSAP ScrollTrigger pin + scrub
//                   钉住本屏，滚动进度 self.progress 0→1 同时驱动照片沿椭圆绕行 360°
//                   （椭圆形状固定）和中心视频 currentTime 0→duration —— 滚动停，两者都停
//   film-strip      胶片横向滚动：钉住本屏，上下带孔胶片（rotateX 弧形 + 边缘渐变消失）
//                   随进度横移，8 张照片逐张经过正中央；文字先淡入，0.8→1 整屏上移 + 淡出退场
//   hanging-photos  挂衣杆照片：钉住本屏，4 张照片先依次从横杆后落下，随后随进度钟摆式
//                   摆动（相位错开），0.8→1 整屏上移 + 淡出退场
//   end             结尾屏：钉住 + "to be continued" 淡入上浮 + 横线展开
import { Suspense, useEffect, useRef, useState } from 'react'
import { motion, useTransform } from 'framer-motion'
import { Canvas } from '@react-three/fiber'
import { Billboard, Html, useTexture } from '@react-three/drei'
import * as THREE from 'three'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { portfolioData } from '../data'
import './ScrollStoryPanel.css'

gsap.registerPlugin(ScrollTrigger)

// education 屏：大字标题的一行。每行用自己的 useTransform 把 scrollYProgress
// 映射到 y（60 → 0）和 opacity（0 → 1），行间错开 0.1
function TextLine({ children, i, progress }) {
  const start = 0.05 + i * 0.1
  const end = start + 0.2
  const y = useTransform(progress, [start, end], [60, 0])
  const opacity = useTransform(progress, [start, end], [0, 1])
  return (
    <motion.h1 className="ss-edu-main" style={{ y, opacity }}>
      {children}
    </motion.h1>
  )
}

/* ====== 第 1 屏：education（滚动驱动：空白 → 文字上浮 + 照片滑入，不钉住） ====== */
function EducationScreen({ section }) {
  const lines = String(section.main ?? '').split('\n')

  return (
    <section className="scrollstory-screen scrollstory-education">
      <div className="ss-edu-text">
        {section.title && <p className="ss-edu-label">{section.title}</p>}
        <div>
          {lines.map((line, i) => (
            <h1 key={i} className="ss-edu-main">{line}</h1>
          ))}
          {section.note && <p className="ss-edu-note">{section.note}</p>}
        </div>
      </div>

      {section.image && (
        <div className="ss-edu-photo">
          <img src={section.image} alt={section.title ?? ''} />
        </div>
      )}

      {/* 滚动提示：一直显示，不淡出 */}
      <div className="ss-edu-hint">
        <span className="ss-edu-hint-arrow" />
        <p className="ss-edu-hint-text">向下滚动鼠标</p>
      </div>
    </section>
  )
}
/* ====== 第 2 屏：cover-flow（GSAP pin + scrub：钉住旋转 + 退场缩小淡出） ====== */
function CoverFlowScreen({ section, containerRef }) {
  const sectionRef = useRef(null)
  const ringRef = useRef(null)   // 卡片圈：rotateY + 退场 scale（都写进 transform）
  const stageRef = useRef(null)  // 舞台：退场淡出（opacity 不能加在 preserve-3d 的圈上，会把 3D 压平）

  const cards = section.cards ?? []
  const n = cards.length
  // 4 张卡：间距 30°（= 90 / (n-1)），整圈 0 → -90°：
  // 进度 0 时第 1 张正对镜头，进度 1 时第 4 张正对镜头，中间每张依次经过正面
  const spacing = n > 1 ? 90 / (n - 1) : 0

  // 用 useEffect：与第三屏（ellipse-gallery）一致，钉住期间零 React 渲染
  useEffect(() => {
    const st = ScrollTrigger.create({
      trigger: sectionRef.current,
      start: 'top top',       // 本屏顶边贴住滚动容器顶边 → 开始钉住
      end: '+=2000',          // 钉住 2000px：页面停住，滚动只播动画
      pin: true,
      pinType: 'transform',   // 滚动容器不是 window
      scrub: true,            // 进度直接跟随滚动：停则停，回滚则倒放
      scroller: containerRef.current,
      anticipatePin: 1,
      onUpdate: (self) => {
        const p = self.progress
        // 1) 整圈旋转 0 → -90°；2) 退场段（0.8 → 1）整体缩小到 0.8
        const exitT = Math.min(Math.max((p - 0.8) / 0.2, 0), 1)
        if (ringRef.current) {
          ringRef.current.style.transform = `rotateY(${-90 * p}deg) scale(${1 - 0.2 * exitT})`
        }
        // 3) 退场淡出：写在 stage 上。ring 是 preserve-3d，
        //    opacity < 1 会强制 transform-style 变成 flat，卡片 3D 会塌掉
        if (stageRef.current) {
          stageRef.current.style.opacity = 1 - exitT
        }
      },
    })
    return () => st.kill()
  }, [containerRef])

  return (
    <section className="scrollstory-screen scrollstory-coverflow" ref={sectionRef}>
      <h2 className="ss-section-title">{section.title}</h2>
      <div className="ss-cover-stage" ref={stageRef}>
        {/* 整圈随滚动转动；卡片静态摆好各自的角度，跟随整圈一起转 */}
        <div className="ss-cover-ring" ref={ringRef}>
          {cards.map((c, i) => (
            <div
              className="ss-cover-card"
              key={c.id ?? i}
              style={{ transform: `rotateY(${i * spacing}deg) translateZ(600px)` }}
            >
              <h3 className="ss-cover-card-title">{c.title}</h3>
              <p className="ss-cover-card-content">{c.content}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ====== 第 3 屏：ellipse-gallery（3D 椭圆画廊 + 中心视频，滚动驱动） ====== */

// 径向渐变投影纹理（模块级单例）：中心黑色不透明 → 边缘黑色透明，
// 所有照片和中心视频的投影共用这一张 CanvasTexture。
let shadowTexture = null
function getShadowTexture() {
  if (!shadowTexture) {
    const size = 128
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
    g.addColorStop(0, 'rgba(0, 0, 0, 1)')
    g.addColorStop(1, 'rgba(0, 0, 0, 0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, size, size)
    shadowTexture = new THREE.CanvasTexture(canvas)
    shadowTexture.colorSpace = THREE.SRGBColorSpace
  }
  return shadowTexture
}

// 照片 i 在进度 p 时的椭圆位置（纯函数）：椭圆形状固定，照片沿椭圆跑。
// baseAngle 把一圈均分给 count 张照片 → angle 加上进度角 →
// 椭圆方程算 x / z，y 走 sin(angle*2) 双峰正弦让照片上下起伏。
function photoPosition(params, count, i, p) {
  const { ellipseRx, ellipseRz, ellipseRy, rotationSpeed } = params
  const baseAngle = (i / count) * Math.PI * 2
  const angle = baseAngle + p * Math.PI * 2 * rotationSpeed
  return [
    Math.cos(angle) * ellipseRx,
    Math.sin(angle) * ellipseRy * 0.8,
    -Math.sin(angle) * ellipseRz,
  ]
}

// 画布里的 3D 内容：照片沿椭圆绕圈（Billboard 始终正对镜头）+ 中心视频平面。
// 滚动进度不经过 React state：照片位置全部走 useRef 数组直写，滚动时零 re-render。
function EllipseGallery({ section, api, params }) {
  const photoRefs = useRef([])    // 每张照片 Billboard 的 group 引用，onProgress 里直接改 position
  const videoElRef = useRef(null) // 隐藏的 <video> 元素（不挂到 DOM 也能加载 / seek）
  // 视频平滑擦洗：onProgress 只更新 targetTime，独立的 rAF 循环每帧 lerp 逼近
  const scrubRef = useRef({ targetTime: 0, rafId: 0 })
  const [videoTex, setVideoTex] = useState(null)
  const [videoAspect, setVideoAspect] = useState(16 / 9)
  const photos = section.photos ?? []
  const textures = useTexture(photos) // 照片纹理，Suspense 等全部加载完再渲染

  // 创建隐藏 video + VideoTexture（中心 5s 视频的 3D 贴图）
  useEffect(() => {
    const video = document.createElement('video')
    video.src = section.video
    video.muted = true
    video.playsInline = true
    video.preload = 'auto'
    video.crossOrigin = 'anonymous'
    video.addEventListener('loadedmetadata', () => {
      if (video.videoWidth > 0 && video.videoHeight > 0) {
        setVideoAspect(video.videoWidth / video.videoHeight)
      }
    })
    video.load()
    const tex = new THREE.VideoTexture(video)
    tex.colorSpace = THREE.SRGBColorSpace
    tex.minFilter = THREE.LinearFilter
    tex.magFilter = THREE.LinearFilter
    videoElRef.current = video
    setVideoTex(tex)
    return () => {
      tex.dispose()
      video.removeAttribute('src')
      video.load()
    }
  }, [section.video])

  // 注册滚动回调：ScrollTrigger 每次 onUpdate 都会走到这里
  useEffect(() => {
    api.current.onProgress = (p) => {
      // 1) 每张照片重算椭圆位置，直接改写 group.position（不走 React 渲染）
      const count = photoRefs.current.length
      photoRefs.current.forEach((el, i) => {
        if (el) el.position.set(...photoPosition(params.current, count, i, p))
      })
      // 2) 视频擦洗：只更新 targetTime，真正的 seek 交给下面的 rAF 循环
      //    （直接在这里 set currentTime 会因 onProgress 跳变太大而一卡一卡）
      const v = videoElRef.current
      const duration = v && Number.isFinite(v.duration) ? v.duration : 0
      scrubRef.current.targetTime = Math.min(p * params.current.videoSpeed, 1) * duration
    }
    // Canvas 挂载晚于 ScrollTrigger 创建时，把已经产生的进度补一帧
    // （这次调用同时完成照片的初始摆位：按当前进度放上椭圆）
    api.current.onProgress(api.current.progress)
    return () => {
      api.current.onProgress = null
    }
  }, [api, params])

  // 独立的 rAF 循环：每帧把 currentTime 向 targetTime 平滑逼近。
  // 差距 > 0.01s 才 seek（死区防止停在目标附近时反复小幅度 seek），
  // 每次只走差值的 10%（lerp 0.1），解码器有整帧的缓冲时间，播放就顺了。
  useEffect(() => {
  const scrub = scrubRef.current
  const loop = () => {
    const v = videoElRef.current
    if (v && v.readyState >= 1 && Number.isFinite(v.duration) && v.duration > 0) {
      const diff = scrub.targetTime - v.currentTime
      // 只有差距大于 0.05 秒才 seek，而且一次 seek 到位
      if (Math.abs(diff) > 0.3) {
        v.currentTime = scrub.targetTime   // ← 一次到位，不要 +=
      }
    }
    scrub.rafId = requestAnimationFrame(loop)
  }
  scrub.rafId = requestAnimationFrame(loop)
  return () => cancelAnimationFrame(scrub.rafId)
}, [])

  const { photoScale, videoScale } = params.current
  const photoW = photoScale           // 照片基准宽度
  const photoH = photoScale * (4 / 3) // 3:4 竖版照片
  const videoW = videoScale * videoAspect // 视频宽度按自身比例
  const videoH = videoScale

  return (
    <>
      {/* 照片圈：group 本身不转，每张照片的 position 由 onProgress 直接改写 */}
      <group>
        {photos.map((_, i) => (
          <group
            key={i}
            ref={(el) => {
              photoRefs.current[i] = el
            }}
          >
            {/* 照片本体：Billboard 始终正对镜头 */}
            <Billboard>
              <mesh>
                <planeGeometry args={[photoW, photoH]} />
                <meshBasicMaterial map={textures[i]} toneMapped={false} />
              </mesh>
            </Billboard>
            {/* 悬浮投影：径向渐变纹理，平躺在照片下方，是 Billboard 的兄弟节点，不随它转向 */}
            <mesh
              position={[0, -photoH / 2, 0]}
              rotation={[-Math.PI / 2, 0, 0]}
              scale={[photoW * 0.7, photoH * 0.15, 1]}
            >
              <circleGeometry args={[1, 32]} />
              <meshBasicMaterial map={getShadowTexture()} transparent opacity={0.3} depthWrite={false} />
            </mesh>
          </group>
        ))}
      </group>

      {/* 中心视频：3D 平面。depthTest 默认开启 → 被前方照片遮挡、也遮挡后方照片 */}
      <group position={[0, 0, 0]}>
        {videoTex && (
          <mesh>
  <planeGeometry args={[videoW, videoH]} />
  <meshBasicMaterial map={videoTex} toneMapped={false} />
</mesh>
        )}
        {/* 悬浮投影：同款径向渐变纹理，略大于视频本身 */}
        <mesh
          position={[0, -videoH / 2 + 0.02, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          scale={[videoW * 0.6, videoH * 1.1, 1]}
        >
          <circleGeometry args={[1, 32]} />
          <meshBasicMaterial map={getShadowTexture()} transparent opacity={0.3} depthWrite={false} />
        </mesh>
      </group>

    </>
  )
}

function EllipseGalleryScreen({ section, containerRef }) {
  const sectionRef = useRef(null)
  // ★ 可调参数（useRef，改这里即可调整画廊；rotationSpeed / videoSpeed 滚动时实时读取）
  const params = useRef({
    ellipseRx: 4,      // 椭圆长轴半径（x 方向）
    ellipseRz: 2.5,    // 椭圆短轴半径（z 方向，纵深）
    ellipseRy: 1.5,    // 椭圆高度（y 方向）
    count: 20,         // 位置数（实际取 data.photos.length，写在这里仅供对照）
    photoScale: 0.6,   // 照片基准宽度（高度按 3:4 换算）
    rotationSpeed: 1,  // 照片沿椭圆前进角度：滚动全程 angle 增加 360° * rotationSpeed
    videoScale: 1.2,   // 中心视频基准高度（宽度按视频自身比例换算）
    videoSpeed: 1,     // 视频擦洗速度：1 = 与滚动进度同步；2 = 滚到一半就播完
  })
  // ScrollTrigger ↔ Canvas 的桥梁：progress 存当前进度，onProgress 由 Canvas 内部注册
  const gallery = useRef({ progress: 0, onProgress: null })

  // GSAP ScrollTrigger：钉住本屏，滚动 3000px 期间把 self.progress 0→1 交给画廊
  useEffect(() => {
    const st = ScrollTrigger.create({
      trigger: sectionRef.current,
      start: 'top top',       // section 顶边碰到滚动容器顶边 → 开始钉住
      end: '+=8000',          // 钉住期间额外滚动 3000px
      pin: true,
      pinType: 'transform',   // 滚动容器不是 window，用 transform 方式钉住
      scrub: true,            // 进度直接跟着滚动位置走：滚动停，动画停
      scroller: containerRef.current,
      anticipatePin: 1,
      onUpdate: (self) => {
        gallery.current.progress = self.progress
        gallery.current.onProgress?.(self.progress)
      },
    })
    return () => st.kill()
  }, [containerRef])

  return (
    <section className="scrollstory-screen scrollstory-gallery" ref={sectionRef}>
      {/* 左 1/4：文字区 */}
      <div className="ss-gallery-text">
        <h2 className="ss-gallery-title">{section.title}</h2>
        {section.slogan && <p className="ss-gallery-slogan">{section.slogan}</p>}
        {section.desc && <p className="ss-gallery-desc">{section.desc}</p>}
      </div>
      {/* 右 3/4：3D 椭圆画廊 */}
      <div className="ss-gallery-stage">
        <Canvas camera={{ position: [0, 0, 8.5], fov: 50 }} dpr={[1, 2]}>
          <Suspense fallback={null}>
            <EllipseGallery section={section} api={gallery} params={params} />
          </Suspense>
        </Canvas>
      </div>
    </section>
  )
}

/* ====== 第 4 屏：film-strip（胶片横向滚动，GSAP pin + scrub） ====== */
function FilmStripScreen({ section, containerRef }) {
  const sectionRef = useRef(null)
  const exitRef = useRef(null)   // 整屏内容包装：退场 y 0→-100vh + 淡出
  const headRef = useRef(null)   // 顶部 title + desc：一开始淡入
  const stripRef = useRef(null)  // 胶片长条：rotateX 弧形固定，translateX 横向滚动
  const frameRefs = useRef([])   // 每张照片框：量 offsetLeft 求滚动总行程

  const photos = section.photos ?? []
  const n = photos.length
  // 胶片总宽 = n 张照片 + n-1 个间隔（--film-photo-w / --film-gap 在 CSS 里定义）
  const stripWidth = `calc(${n} * (var(--film-photo-w) + var(--film-gap)) - var(--film-gap) + 2 * var(--film-photo-w))`

  useEffect(() => {
    // 滚动总行程 = 最后一张与第一张的 offsetLeft 之差（任何屏宽都量得准）
    let travel = 0
    const updateTravel = () => {
      const els = frameRefs.current
      travel = els.length > 1 ? els[els.length - 1].offsetLeft - els[0].offsetLeft : 0
    }
    // 进度 → 全部直接写 DOM style，滚动时零 React 渲染
    const apply = (p) => {
      const exitT = Math.min(Math.max((p - 0.8) / 0.2, 0), 1)
      if (headRef.current) headRef.current.style.opacity = Math.min(p / 0.1, 1) // 文字先淡入
      if (stripRef.current) {
        // rotateX 18° 固定出胶片弧形；translateX 让 8 张照片逐张经过正中央
        stripRef.current.style.transform = `rotateX(18deg) translateX(${-p * travel}px)`
      }
      if (exitRef.current) {
        exitRef.current.style.transform = `translateY(${-100 * exitT}vh)` // 退场：整屏上移
        exitRef.current.style.opacity = 1 - exitT                         // 退场：淡出
      }
    }
    const st = ScrollTrigger.create({
      trigger: sectionRef.current,
      start: 'top top',     // 本屏顶边贴住滚动容器顶边 → 开始钉住
      end: '+=3000',        // 钉住 3000px：页面停住，滚动只播动画
      pin: true,
      pinType: 'transform', // 滚动容器不是 window
      scrub: true,          // 进度直接跟随滚动：停则停，回滚则倒放
      scroller: containerRef.current,
      anticipatePin: 1,
      onUpdate: (self) => apply(self.progress),
    })
    updateTravel()
    apply(st.progress) // 首帧：文字透明、胶片归位
    window.addEventListener('resize', updateTravel)
    return () => {
      st.kill()
      window.removeEventListener('resize', updateTravel)
    }
  }, [containerRef])

  return (
    <section className="scrollstory-screen scrollstory-filmstrip" ref={sectionRef}>
      <div className="ss-film-exit" ref={exitRef}>
        <div className="ss-film-head" ref={headRef}>
          <h2 className="ss-film-title">{section.title}</h2>
          {section.desc && <p className="ss-film-desc">{section.desc}</p>}
        </div>
        {/* 胶片视口：裁切 + 上下边缘渐变消失 + 3D 透视 */}
        <div className="ss-film-viewport">
          {/* 胶片长条居中横穿屏幕；居中用 margin-left 完成，JS 只写 transform */}
          <div
            className="ss-film-strip"
            ref={stripRef}
            style={{
              '--film-strip-w': stripWidth,
              width: 'var(--film-strip-w)',
              marginLeft: 'calc(var(--film-strip-w) / -2)',
            }}
          >
            {/* 上排胶片孔 */}
            <div className="ss-film-bar" />
            <div className="ss-film-track">
              {/* 第 i 张从胶片中心向右排开：进度 0 时第 0 张在正中央 */}
              {photos.map((src, i) => (
                <div
                  key={i}
                  className="ss-film-frame"
                  ref={(el) => {
                    frameRefs.current[i] = el
                  }}
                  style={{
                    left: `calc(var(--film-strip-w) / 2 + ${i} * (var(--film-photo-w) + var(--film-gap)) - var(--film-photo-w) / 2)`,
                  }}
                >
                  <img src={src} alt={section.title ?? ''} loading="lazy" />
                </div>
              ))}
            </div>
            {/* 下排胶片孔 */}
            <div className="ss-film-bar" />
          </div>
        </div>
      </div>
    </section>
  )
}

/* ====== 第 5 屏：hanging-photos（照片挂在横杆上摆动，GSAP pin + scrub） ====== */
function HangingPhotosScreen({ section, containerRef }) {
  const sectionRef = useRef(null)
  const exitRef = useRef(null)   // 整屏内容包装：退场 y 0→-100vh + 淡出
  const headRef = useRef(null)   // 顶部 title + desc：一开始淡入
  const swingRefs = useRef([])   // 每个挂件（绳 + 照片）：落下 + 摆动

  const photos = section.photos ?? []
  const n = photos.length

  useEffect(() => {
    const apply = (p) => {
      const exitT = Math.min(Math.max((p - 0.8) / 0.2, 0), 1)
      if (headRef.current) headRef.current.style.opacity = Math.min(p / 0.1, 1)
      swingRefs.current.forEach((el, i) => {
        if (!el) return
        // 1) 入场：0.05 起每张错开 0.05，从横杆后面依次落下
        const entryT = Math.min(Math.max((p - 0.05 - i * 0.05) / 0.15, 0), 1)
        // 2) 摆动：入场完成后随进度钟摆（幅度渐入，每张相位错开，像有风吹过）
        const swayT = Math.min(Math.max((p - 0.3) / 0.5, 0), 1)
        const amp = Math.min(swayT / 0.2, 1) * 12 // 0 → 12° 渐入
        const angle = Math.sin(swayT * Math.PI * 2 * 1.5 + i * 0.9) * amp
        el.style.transform = `translateY(${-100 * (1 - entryT)}%) rotateZ(${angle}deg)`
      })
      if (exitRef.current) {
        exitRef.current.style.transform = `translateY(${-100 * exitT}vh)`
        exitRef.current.style.opacity = 1 - exitT
      }
    }
    const st = ScrollTrigger.create({
      trigger: sectionRef.current,
      start: 'top top',
      end: '+=5000',
      pin: true,
      pinType: 'transform',
      scrub: true,
      scroller: containerRef.current,
      anticipatePin: 1,
      onUpdate: (self) => apply(self.progress),
    })
    apply(st.progress)
    return () => st.kill()
  }, [containerRef])

  return (
    <section className="scrollstory-screen scrollstory-hanging" ref={sectionRef}>
      <div className="ss-hang-exit" ref={exitRef}>
        <div className="ss-hang-head" ref={headRef}>
          <h2 className="ss-hang-title">{section.title}</h2>
          {section.desc && <p className="ss-hang-desc">{section.desc}</p>}
        </div>
        <div className="ss-hang-rack">
          <div className="ss-hang-rail" />
          {photos.map((src, i) => (
            <div
              key={i}
              className="ss-hang-item"
              style={{ left: `${((i + 0.5) / n) * 100}%` }}
            >
              {/* 绳 + 照片一起动：以顶部挂点为轴，更像真实钟摆 */}
              <div
                className="ss-hang-assembly"
                ref={(el) => {
                  swingRefs.current[i] = el
                }}
              >
                <div className="ss-hang-string" />
                <div className="ss-hang-photo">
                  <img src={src} alt={section.title ?? ''} loading="lazy" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ====== 第 6 屏：end（结尾屏，GSAP pin + scrub：文字淡入 + 横线展开） ====== */
function EndScreen({ section, containerRef }) {
  const sectionRef = useRef(null)
  const textRef = useRef(null)
  const lineRef = useRef(null)

  useEffect(() => {
    const apply = (p) => {
      const t = Math.min(Math.max((p - 0.05) / 0.25, 0), 1) // 文字淡入 + 上浮
      const l = Math.min(Math.max((p - 0.2) / 0.2, 0), 1)   // 横线随后展开
      if (textRef.current) {
        textRef.current.style.opacity = t
        textRef.current.style.transform = `translateY(${40 * (1 - t)}px)`
      }
      if (lineRef.current) lineRef.current.style.transform = `scaleX(${l})`
    }
    const st = ScrollTrigger.create({
      trigger: sectionRef.current,
      start: 'top top',
      end: '+=800', // 结尾屏动画短，钉住距离也短
      pin: true,
      pinType: 'transform',
      scrub: true,
      scroller: containerRef.current,
      anticipatePin: 1,
      onUpdate: (self) => apply(self.progress),
    })
    apply(st.progress)
    return () => st.kill()
  }, [containerRef])

  return (
    <section className="scrollstory-screen scrollstory-end" ref={sectionRef}>
      <div className="ss-end-text" ref={textRef}>
        <p className="ss-end-title">{section.text}</p>
        <div className="ss-end-line" ref={lineRef} />
      </div>
    </section>
  )
}

/* ====== 兜底占位屏（未知 type 时使用，正常数据不会走到） ====== */
function PlaceholderScreen({ section }) {
  return (
    <section className="scrollstory-screen scrollstory-placeholder">
      <p className="ss-placeholder-type">{section.type}</p>
      {section.title && <h2 className="ss-placeholder-title">{section.title}</h2>}
      {section.text && <p className="ss-placeholder-text">{section.text}</p>}
      <p className="ss-placeholder-note">待制作（下一步实现）</p>
    </section>
  )
}

/* ====== 按 type 分发到对应屏 ====== */
function SectionView({ section, containerRef }) {
  switch (section.type) {
    case 'education':
      return <EducationScreen section={section} containerRef={containerRef} />
    case 'cover-flow':
      return <CoverFlowScreen section={section} containerRef={containerRef} />
    case 'ellipse-gallery':
      return <EllipseGalleryScreen section={section} containerRef={containerRef} />
    case 'film-strip':
      return <FilmStripScreen section={section} containerRef={containerRef} />
    case 'hanging-photos':
      return <HangingPhotosScreen section={section} containerRef={containerRef} />
    case 'end':
      return <EndScreen section={section} containerRef={containerRef} />
    default:
      return <PlaceholderScreen section={section} />
  }
}

/* ====== 面板入口 ====== */
export default function ScrollStoryPanel({ onClose }) {
  const scrollStory = portfolioData.scrollStory ?? {}
  const { sections = [] } = scrollStory
  // 滚动容器：面板本体 fixed 盖全屏，内部这个 div 才是滚动的元素；
  // 返回按钮放在滚动容器外面，滚动时固定不动
  const scrollRef = useRef(null)

  return (
    <motion.div
      className="scrollstory-panel"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <button className="scrollstory-back" onClick={onClose}>← 返回</button>

      <div className="scrollstory-scroll" ref={scrollRef}>
        {sections.map((s) => (
          <SectionView key={s.id} section={s} containerRef={scrollRef} />
        ))}
      </div>
    </motion.div>
  )
}
