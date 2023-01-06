import React from 'react'
import { PanelResizeHandle as PanelResizeHandleImpl } from 'react-resizable-panels'

import styles from './panel-resize-handle.module.css'

export default function PanelResizeHandle() {
  return (
    <PanelResizeHandleImpl className={styles.handle}>
      <div>
        <svg
          xmlns='http://www.w3.org/2000/svg'
          fill='none'
          viewBox='0 0 24 24'
          strokeWidth={1.5}
          stroke='#adadad'
        >
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            d='M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5'
          />
        </svg>
      </div>
    </PanelResizeHandleImpl>
  )
}
