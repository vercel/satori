import React from 'react'
import styles from './introduction.module.css'

interface IProps {
  onClose: React.MouseEventHandler<HTMLButtonElement>
}

export default function Introduction({ onClose }: IProps) {
  return (
    <div className={styles.container}>
      <p>👋 Welcome to the Vercel OG Image playground!</p>
      <p style={{ flex: 1 }}>
        You can use this tool to test and preview OG image cards generated with{' '}
        <code>@vercel/og</code>. To learn more about how to add it to your
        project, please read{' '}
        <a
          href='https://vercel.com/docs/concepts/functions/edge-functions/og-image-generation'
          target='_blank'
          rel='noreferrer'
        >
          our documentation
        </a>{' '}
        or the{' '}
        <a
          href='https://vercel.com/blog/introducing-vercel-og-image-generation-fast-dynamic-social-card-images'
          target='_blank'
          rel='noreferrer'
        >
          announcement post
        </a>
        .
      </p>
      <button onClick={onClose}>Okay!</button>
    </div>
  )
}
