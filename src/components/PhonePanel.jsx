// src/components/PhonePanel.jsx
// 联系方式浮窗：全屏半透明遮罩 + 居中白色卡片（新拟物圆角）。
// 方阵布局：左列（候选人姓名 / 状态）与右列（手机/微信号 / 邮箱）行行对齐，
// 右列两个 value 各带"复制"按钮：navigator.clipboard 复制后显示"已复制"，1.5s 恢复。
// 点击遮罩或右上角 × 关闭；卡片内部 stopPropagation 防止点卡片误关。
import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { portfolioData } from '../data'
import './PhonePanel.css'

export default function PhonePanel({ onClose }) {
  const { content = {} } = portfolioData.phone ?? {}
  const { left = [], right = [], slogan = '' } = content

  // copiedIndex：右列第几项正处于"已复制"状态（null = 无）
  const [copiedIndex, setCopiedIndex] = useState(null)
  // 1.5s 恢复定时器：卸载时清掉
  const copyTimerRef = useRef(null)

  const handleCopy = (text, i) => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopiedIndex(i)
        if (copyTimerRef.current) clearTimeout(copyTimerRef.current)
        copyTimerRef.current = setTimeout(() => setCopiedIndex(null), 1500)
      })
      .catch(() => {
        // 剪贴板 API 不可用（非 https 等）时静默失败，不显示"已复制"
      })
  }

  useEffect(
    () => () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current)
    },
    []
  )

  return (
    <motion.div
      className="phone-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      onClick={onClose} // 点遮罩关闭
    >
      {/* 卡片：stopPropagation，点卡片内部不关 */}
      <motion.div
        className="phone-card"
        initial={{ opacity: 0, scale: 0.94, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 12 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="phone-close" onClick={onClose} aria-label="关闭">×</button>

        <div className="phone-grid">
          {/* 左列：候选人姓名 / 状态 */}
          <div className="phone-col">
            {left.map((item) => (
              <div className="phone-item" key={item.label}>
                <p className="phone-label">{item.label}</p>
                <p className="phone-value">{item.value}</p>
              </div>
            ))}
          </div>
          {/* 右列：手机/微信号 / 邮箱（各带复制按钮） */}
          <div className="phone-col">
            {right.map((item, i) => (
              <div className="phone-item" key={item.label}>
                <p className="phone-label">{item.label}</p>
                <div className="phone-value-row">
                  <p className="phone-value">
                        {item.display ? item.display.split('|').map((part, idx) => (
                            <span key={idx}>{part}{idx < item.display.split('|').length - 1 && <br />}</span>
                         )) : item.value}
</p>
                  <button
                    type="button"
                    className={`phone-copy${copiedIndex === i ? ' phone-copy--done' : ''}`}
                    onClick={() => handleCopy(item.value, i)}
                  >
                    {copiedIndex === i ? '已复制' : '复制'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {slogan && <p className="phone-slogan">{slogan}</p>}
      </motion.div>
    </motion.div>
  )
}
