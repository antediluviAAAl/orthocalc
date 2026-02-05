'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Info, X } from 'lucide-react'
import { BlockMath } from 'react-katex'
import styles from './FormulaPopover.module.css'

interface FormulaPopoverProps {
  title: string
  formula?: string      
  description?: string 
}

export default function FormulaPopover({ title, formula, description }: FormulaPopoverProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [coords, setCoords] = useState({ top: 0, left: 0 })
  
  // Refs for both the button and the floating content
  const triggerRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)

  // Calculate position when opening
  const updatePosition = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      // Adjust for scroll position since we are rendering into body
      const scrollY = window.scrollY || window.pageYOffset
      const scrollX = window.scrollX || window.pageXOffset
      
      setCoords({
        top: rect.bottom + scrollY, 
        left: rect.left + (rect.width / 2) + scrollX
      })
    }
  }

  const toggleOpen = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!isOpen) {
      updatePosition()
      setIsOpen(true)
    } else {
      setIsOpen(false)
    }
  }

  // Handle Scroll/Resize updates
  useEffect(() => {
    if (!isOpen) return
    
    const handleScroll = () => setIsOpen(false)
    window.addEventListener('scroll', handleScroll, true)
    window.addEventListener('resize', handleScroll)
    
    return () => {
      window.removeEventListener('scroll', handleScroll, true)
      window.removeEventListener('resize', handleScroll)
    }
  }, [isOpen])

  // Click Outside Handler
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node
      
      // Check if click is inside the Trigger Button OR the Popover Content
      const clickedTrigger = triggerRef.current && triggerRef.current.contains(target)
      const clickedPopover = popoverRef.current && popoverRef.current.contains(target)

      // Only close if we clicked OUTSIDE both
      if (!clickedTrigger && !clickedPopover) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  return (
    <div className={styles.container}>
      <button 
        ref={triggerRef}
        type="button" 
        className={`${styles.triggerBtn} ${isOpen ? styles.active : ''}`}
        onClick={toggleOpen}
        title="View Details"
      >
        <Info size={14} />
      </button>

      {/* PORTAL */}
      {isOpen && typeof document !== 'undefined' && createPortal(
        <div 
          ref={popoverRef} // Attach Ref here to track clicks inside
          className={styles.popover} 
          style={{ top: coords.top, left: coords.left }}
          onClick={(e) => e.stopPropagation()} 
        >
          <div className={styles.popoverHeader}>
            <h4 className={styles.popoverTitle}>{title}</h4>
            <button className={styles.closeBtn} onClick={() => setIsOpen(false)}>
              <X size={16} />
            </button>
          </div>
          
          <div className={styles.popoverContent}>
            
            {/* Mode A: Theoretical Formula */}
            {formula && (
              <div className={styles.mathBlock}>
                <BlockMath math={formula} />
              </div>
            )}

            {/* Mode B: Text Description */}
            {description && (
              <p className={styles.description}>
                {description}
              </p>
            )}

          </div>
        </div>,
        document.body
      )}
    </div>
  )
}