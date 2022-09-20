import Head from 'next/head'

import '../styles.css'

export default function App({ Component, pageProps }) {
  return (
    <>
      <Head>
        <title>Satori Playground</title>
        <meta
          name='viewport'
          content='width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no'
        />
        <meta name='theme-color' content='#fff' />
        <meta name='title' content='Satori Playground' />
        <meta
          name='description'
          content='Satori is a JavaScript library that converts HTML and CSS into SVG.'
        />
        <meta property='og:type' content='website' />
        <meta
          property='og:url'
          content='https://satori-playground.vercel.app/'
        />
        <meta property='og:title' content='Satori Playground' />
        <meta
          property='og:description'
          content='Satori is a JavaScript library that converts HTML and CSS into SVG.'
        />
        <meta
          property='og:image'
          content='https://satori-playground.vercel.app/satori-card.jpeg'
        />
        <meta property='twitter:card' content='summary_large_image' />
        <meta
          property='twitter:url'
          content='https://satori-playground.vercel.app/'
        />
        <meta property='twitter:title' content='Satori Playground' />
        <meta
          property='twitter:description'
          content='Satori is a JavaScript library that converts HTML and CSS into SVG.'
        />
        <meta
          property='twitter:image'
          content='https://satori-playground.vercel.app/satori-card.jpeg'
        />
        <link
          rel='preload'
          href='/inter-latin-ext-400-normal.woff'
          as='fetch'
          crossOrigin='anonymous'
        />
        <link
          rel='preload'
          href='/inter-latin-ext-700-normal.woff'
          as='fetch'
          crossOrigin='anonymous'
        />
        <link
          rel='preload'
          href='/material-icons-base-400-normal.woff'
          as='fetch'
          crossOrigin='anonymous'
        />
        <link
          rel='preload'
          href='/iaw-mono-var.woff2'
          as='fetch'
          crossOrigin='anonymous'
        />
        <link
          rel='icon'
          href='data:image/svg+xml;utf8,&lt;svg xmlns=&#x27;http://www.w3.org/2000/svg&#x27; viewBox=&#x27;0 0 100 100&#x27;&gt;&lt;text x=&#x27;50&#x27; y=&#x27;.9em&#x27; font-size=&#x27;90&#x27; text-anchor=&#x27;middle&#x27;&gt;🄪&lt;/text&gt;&lt;style&gt;text{font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,"Noto Sans",sans-serif,"Apple Color Emoji","Segoe UI Emoji","Segoe UI Symbol","Noto Color Emoji";fill:black}@media(prefers-color-scheme:dark){text{fill:white}}&lt;/style&gt;&lt;/svg&gt;'
        />
      </Head>
      <Component {...pageProps} />
    </>
  )
}
