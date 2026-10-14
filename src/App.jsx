// 3D 个人作品集 —— 真实模型版本（GLB 模型 + 占位工牌）
import { Suspense, useEffect, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, useAnimations, useGLTF, useTexture } from '@react-three/drei'
import InteractiveWrapper from './components/InteractiveWrapper'
import BadgePanel from './components/BadgePanel'
import ComputerPanel from './components/ComputerPanel'
import ScrollStoryPanel from './components/ScrollStoryPanel'
import { AnimatePresence } from 'framer-motion'
import { portfolioData } from './data'
import PhonePanel from './components/PhonePanel'

/* ====== 通用模型加载组件：加载 GLB + 自动开阴影 + 自动播动画 ====== */
function Model({ url, position = [0, 0, 0], rotation = [0, 0, 0], scale = 1 }) {
  const group = useRef()
  // useGLTF 自带缓存：同一个模型全场景只下载一次
  const { scene, animations } = useGLTF(url)
  const { actions } = useAnimations(animations, group)

  // 模型里的所有网格默认不开阴影，这里统一打开
  useEffect(() => {
    scene.traverse((obj) => {
      if (obj.isMesh) {
        obj.castShadow = true
        obj.receiveShadow = true
      }
      // 模型里自带的灯光（比如书里的 KHR_lights_punctual）会打乱场景，先关掉
      if (obj.isLight) obj.visible = false
    })
  }, [scene])

  // 如果模型自带动画就播放第一个；静态模型没有动画，这段什么都不做
  useEffect(() => {
    const names = Object.keys(actions)
    if (names.length > 0) actions[names[0]].play()
  }, [actions])

  return (
    <group ref={group} position={position} rotation={rotation} scale={scale}>
      <primitive object={scene} />
    </group>
  )
}

/* ====== 桌子：原模型高 84.3 个单位，×0.0089 后变成 0.75 高（真实桌子高度） ====== */
function Table({ onOpen }) {
  return (
    // 桌子的原点在“后沿、贴地、左右居中”处，所以位置就是桌子的后沿坐标
    <group position={[0, 0, -2.4]}>
      <Model url="/models/desk.glb" scale={0.0089} />

      {/* 桌面物品：坐标相对桌子的原点（后沿），桌子移动它们自动跟着走 */}
      {/* 电脑（显示器）：桌面正前方、屏幕朝向镜头。
          模型里屏幕的宽（61.1）在 z 方向，绕 Y 转 90° 后横过来；×0.009 ≈ 0.55 宽 × 0.5 高
          如果屏幕朝了墙，把 rotation 改成 [0, -Math.PI / 2, 0] */}
      <InteractiveWrapper id="computer" onOpen={onOpen} tooltipY={0.55} glowSize={0.5}>
        <Model url="/models/computer.glb" position={[0, 0.67, 0.25]} rotation={[0, -Math.PI / 2, 0]} scale={0.009} />
      </InteractiveWrapper>
           {/* 工牌：代码生成（BoxGeometry 卡片 + 照片贴图 + 挂绳，见下方 Badge 组件） */}
      <Badge onOpen={onOpen} />
      <InteractiveWrapper id="phone" onOpen={onOpen} tooltipY={0.4} glowSize={0.2}>
        <Model url="/models/phone.glb" scale={0.0089} />
      </InteractiveWrapper>
    </group>
  )
}

/* ====== 椅子：原模型就是真实比例（高 1.06），不用缩放 ======
   纯静态展示：无单击、无动画、无音效 */
function Chair() {
  return (
    // 位置在桌子前面（镜头这一侧）；绕 Y 转 180° 让椅背朝向镜头、坐垫朝向桌子
    // 如果椅子的朝向反了，把 rotation 改成 [0, 0, 0] 即可
    <Model url="/models/chair.glb" position={[0, 0, -1.3]} rotation={[0, Math.PI, 0]} />
  )
}

/* ====== 绿植：模型本身就是真实比例（高 1.81 米、宽约 1 米），不用缩放 ======
   纯静态展示：无单击、无动画、无音效 */
function Plant() {
  return (
    // 放在桌子右边（x 正方向）：桌子右沿在 x=0.835，植物向左伸出 0.524，留一点空隙
    // z=-2 与桌子深度中心对齐；模型原点在花盆底部，所以 y=0 直接贴地
    <Model url="/models/plant.glb" position={[1.2, 0, -2.2]} rotation={[0, 4, 0]} scale={1.2} />
  )
}

/* ====== 工牌：badge.glb 模型，平躺在桌面右侧，照片贴到卡套上 ====== */
function Badge({ onOpen }) {
  const avatar = useTexture('/avatar.jpg')
  const { scene } = useGLTF('/models/badge.glb')


  // 模型里的网格默认不开阴影，统一打开
  useEffect(() => {
    scene.traverse((obj) => {
      if (obj.isMesh) {
        obj.castShadow = true
        obj.receiveShadow = true
      }
    })
  }, [scene])

  return (
    // 外层 group：摆到桌面右侧 + 稍微转个角度（想微调位置改这里）
    // 内层 group：模型默认是“竖着”的，绕 X 转 -90° 放倒（平躺），×0.6 缩小
    //（模型原始总长 1.89 是真实挂绳的 3 倍大）
    // 最外层 InteractiveWrapper：悬停浮起 + 气泡 + 双击开面板 + 待机发光
    //（气泡和发光圈以物体包围盒中心自动定位，这里不用重复填坐标）
    <InteractiveWrapper id="badge" onOpen={onOpen} tooltipY={0.3} glowSize={0.4}>
      <group position={[0.6, 0.68, 0.3]} rotation={[0, -0.3, 0]}>
        <group rotation={[-Math.PI / 2, 0, 0]} scale={0.3}>
        <primitive object={scene} />

        {/* 照片：模型没有 UV 贴图坐标，直接贴图无效，所以用一块薄片
            叠放在卡套的卡片位置上（模型坐标系，跟着模型一起旋转缩放）。
            卡片在模型里的位置：y 中心 = -0.408，宽 0.4 高 0.19；
            z = 0.019 是卡套正面的外侧一点点（避免和卡面重叠闪烁）。
            如果照片出现在背面（朝下），把上面的 rotation 改成 [Math.PI / 2, 0, 0]，
            并把这里的 z 改成 -0.019 */}
        <mesh position={[0, -0.608, 0.019]}>
          <boxGeometry args={[0.38, 0.69, 0.004]} />
          <meshStandardMaterial map={avatar} />
        </mesh>
      </group>
    </group>
    </InteractiveWrapper>
  )
}

/* ====== 软木板：新模型本身就是真实比例（1.78 宽 × 1.02 高 × 0.13 厚），不用缩放 ====== */
function Board({ onOpen }) {
  return (
    // 宽边在模型的 z 方向，绕 Y 转 90° 后横过来挂墙上
    // y = 2.1：这个模型的原点不在底边（底部在原点下方 0.596），补上偏移后板底正好在 1.5 高
    // z = -3.41：墙在 -3.5，板厚 0.133 的一半（0.066）+ 0.02 空隙
    // 如果挂上去背面朝外，把 Math.PI / 2 改成 -Math.PI / 2
    <InteractiveWrapper id="board" onOpen={onOpen} tooltipY={0.6} glowSize={0.85}>
      <group>
        <Model
          url="/models/board.glb"
          position={[0, 1.7, -3.41]}
          rotation={[0, -Math.PI / 2, 0]}
	scale={0.75}
        />
      </group>
    </InteractiveWrapper>
  )
}

/* ====== 场景：灯光 + 地面 + 墙面 + 所有物品 ====== */
function Scene({ onOpen }) {
  return (
    <>
      {/* 环境光：让阴影区域不至于全黑 */}
      <ambientLight intensity={0.75} />
      {/* 平行光：模拟窗外阳光，产生柔和的投影 */}
      <directionalLight
        position={[7, 6, 4]}
        intensity={2.5}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-3}
        shadow-camera-right={3}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
        shadow-camera-near={1}
        shadow-camera-far={30}
        shadow-bias={-0.0008}
      />

      {/* 地面（接收阴影） */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[70, 30]} />
        <meshStandardMaterial color="#e8e8e8" transparent opacity={0.9} />
      </mesh>

      {/* ===== L 型角落：背景墙 + 左墙 ===== 左墙已删，右墙改颜色*/}
      {/* 后墙：z = -3.5 在房间最深处；y = 2.75 是墙高 5.5 的一半，底边正好贴地 */}
      <mesh position={[0, 2.75, -3.5]} receiveShadow>
        <planeGeometry args={[400, 30]} />
   <meshStandardMaterial color="#e8e8e8" transparent opacity={0.45} />
      </mesh>
   
     
      {/* 桌子（含桌面物品）+ 椅子 + 绿植 + 书架 + 墙上软木板 */}
      <Table onOpen={onOpen} />
      <Chair />
      <Plant />
      <Board onOpen={onOpen} />
    </>
  )
}

/* ====== InfoPanel 占位浮层 ======
   双击物体后弹出，用于验证“双击 → setActivePanel(id)”的绑定。
   等你的 InfoPanel 组件就位后，把 <PlaceholderInfoPanel> 整个换成：
   <InfoPanel id={activePanel} onClose={() => setActivePanel(null)} />
   （setActivePanel 的绑定方式不变） */
function PlaceholderInfoPanel({ id, onClose }) {
  const panel = portfolioData[id]
  return (
    <div className="info-panel-mask" onClick={onClose}>
      <div className="info-panel-card" onClick={(e) => e.stopPropagation()}>
        <button className="info-panel-close" onClick={onClose}>×</button>
        <h2>{panel?.panelTitle ?? id}</h2>
        <p style={{ color: '#888' }}>这里放你的 InfoPanel 内容（当前面板：{id}）</p>
      </div>
    </div>
  )
}

/* ====== 应用入口 ====== */
export default function App() {
  // 双击物体 → InteractiveWrapper 调 setActivePanel(id) → 弹出浮层
  const [activePanel, setActivePanel] = useState(null)
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <Canvas
        shadows
        camera={{ position: [3, 2.9, 0.5], fov: 45 }}
      >
        {/* 背景色：浅灰色 */}
        <color attach="background" args={['#f0f0f0']} />
        {/* 雾：和背景同色，让场景边缘柔和淡出 */}
        <fog attach="fog" args={['#e8e8e8', 5, 11]} />

        {/* Suspense：模型加载完成前先不渲染场景内容 */}
        <Suspense fallback={null}>
          <Scene onOpen={setActivePanel} />
        </Suspense>

        {/* 轨道控制器：按住鼠标左键旋转视角，滚轮缩放 */}
        <OrbitControls
          target={[0.4, 1.3, -1.4]}   // 旋转中心对准桌子
          enableDamping
          enablePan={false}
          minDistance={2.5}
          maxDistance={6}
	minAzimuthAngle={-Math.PI / 6}  // 左斜后方
  	maxAzimuthAngle={Math.PI / 6}   // 右斜后方
  	minPolarAngle={Math.PI / 4}     // 限制上下角度
          maxPolarAngle={1.52}   // 限制角度，防止镜头钻到地板下面
        />
      </Canvas>

      {/* 双击物体 → setActivePanel(id) → 弹出面板：
          badge 是全屏详情页（BadgePanel），computer 是时间轴面板（ComputerPanel），
          board 是滚动叙事面板（ScrollStoryPanel），bookshelf 暂时用占位浮层 */}
      <AnimatePresence>
        {activePanel === 'badge' && (
          <BadgePanel key="badge" onClose={() => setActivePanel(null)} />
        )}
        {activePanel === 'computer' && (
          <ComputerPanel key="computer" onClose={() => setActivePanel(null)} />
        )}
        {activePanel === 'board' && (
          <ScrollStoryPanel key="board" onClose={() => setActivePanel(null)} />
        )}

        {/* ← 加这一段：电话面板 */}
        {activePanel === 'phone' && (
          <PhonePanel key="phone" onClose={() => setActivePanel(null)} />
        )}

        {activePanel && activePanel !== 'badge' && activePanel !== 'computer' && activePanel !== 'board' && activePanel !== 'phone' && (
          <PlaceholderInfoPanel
            key={activePanel}
            id={activePanel}
            onClose={() => setActivePanel(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
