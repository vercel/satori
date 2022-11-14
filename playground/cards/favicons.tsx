import React from 'react'
import playgroundTabs from './playground-data'

type Favicons = {
  [key in keyof typeof playgroundTabs]: React.ReactNode
}

const tabFavicons: Favicons = {
  helloworld: (
    <div
      style={{
        height: '32px',
        width: '32px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'transparent',
        fontSize: 32,
        fontWeight: 600,
      }}
    >
      👋
    </div>
  ),
  Vercel: (
    <div
      style={{
        height: '32px',
        width: '32px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'transparent',
        fontSize: 30,
      }}
    >
      ▲
    </div>
  ),
  'Vercel Docs': (
    <div
      style={{
        height: '32px',
        width: '32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'transparent',
        letterSpacing: -2,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          color: 'white',
          backgroundColor: 'black',
          borderRadius: '100%',
          textAlign: 'center',
          fontSize: 18,
          lineHeight: 1,
          marginLeft: 'auto',
          marginRight: 'auto',
        }}
      >
        ▲
      </div>
    </div>
  ),
  rauchg: (
    <div
      style={{
        height: '32px',
        width: '32px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'black',
        fontSize: '20px',
        fontWeight: '800',
        color: 'white',
        lineHeight: '32px',
        verticalAlign: 'text-top',
      }}
    >
      G
    </div>
  ),
  'Font & Emoji': (
    <div
      style={{
        height: '32px',
        width: '32px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(to top, black, grey)',
        fontFamily: 'Inter, "Material Icons"',
        fontSize: '25px',
        fontWeight: '800',
        color: 'white',
        lineHeight: '32px',
        verticalAlign: 'text-top',
        borderRadius: '25%',
      }}
    >
      &#xebcb;
    </div>
  ),
  'Tailwind CSS (Experimental)': (
    <div
      style={{
        height: '32px',
        width: '32px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'transparent',
      }}
    >
      <svg
        width='32'
        xmlns='http://www.w3.org/2000/svg'
        fill='none'
        viewBox='0 0 54 33'
      >
        <g clipPath='url(#prefix__clip0)'>
          <path
            fill='#38bdf8'
            fillRule='evenodd'
            d='M27 0c-7.2 0-11.7 3.6-13.5 10.8 2.7-3.6 5.85-4.95 9.45-4.05 2.054.513 3.522 2.004 5.147 3.653C30.744 13.09 33.808 16.2 40.5 16.2c7.2 0 11.7-3.6 13.5-10.8-2.7 3.6-5.85 4.95-9.45 4.05-2.054-.513-3.522-2.004-5.147-3.653C36.756 3.11 33.692 0 27 0zM13.5 16.2C6.3 16.2 1.8 19.8 0 27c2.7-3.6 5.85-4.95 9.45-4.05 2.054.514 3.522 2.004 5.147 3.653C17.244 29.29 20.308 32.4 27 32.4c7.2 0 11.7-3.6 13.5-10.8-2.7 3.6-5.85 4.95-9.45 4.05-2.054-.513-3.522-2.004-5.147-3.653C23.256 19.31 20.192 16.2 13.5 16.2z'
            clipRule='evenodd'
          />
        </g>
        <defs>
          <clipPath id='prefix__clip0'>
            <path fill='#fff' d='M0 0h54v32.4H0z' />
          </clipPath>
        </defs>
      </svg>
    </div>
  ),
  'Color Models': (
    <div
      style={{
        height: '32px',
        width: '32px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundImage: 'linear-gradient(to right, #334d50, #cbcaa5)',
        borderRadius: '100%',
      }}
    />
  ),
}

export default tabFavicons
