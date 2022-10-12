export default {
  helloworld: `<div
  style={{
    height: '100%',
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    fontSize: 32,
    fontWeight: 600,
  }}
>
  <svg
    width="75"
    viewBox="0 0 75 65"
    fill="#000"
    style={{ margin: '0 75px' }}
  >
    <path d="M37.59.25l36.95 64H.64l36.95-64z"></path>
  </svg>
  <div style={{ marginTop: 40 }}>Hello, World</div>
</div>
`,
  Vercel: `<div
  style={{
    display: 'flex',
    height: '100%',
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
    backgroundColor: 'white',
    fontSize: 60,
    letterSpacing: -2,
    fontWeight: 700,
  }}
>
  <div
    style={{
      display: 'flex',
      padding: '5px 40px',
      width: 'auto',
      textAlign: 'center',
      backgroundImage: 'linear-gradient(90deg, rgb(0, 124, 240), rgb(0, 223, 216))',
      backgroundClip: 'text',
      '-webkit-background-clip': 'text',
      color: 'transparent',
    }}
  >
    Develop
  </div>
  <div
    style={{
      padding: '5px 40px',
      width: 'auto',
      textAlign: 'center',
      backgroundImage: 'linear-gradient(90deg, rgb(121, 40, 202), rgb(255, 0, 128))',
      backgroundClip: 'text',
      '-webkit-background-clip': 'text',
      color: 'transparent',
    }}
  >
    Preview
  </div>
  <div
    style={{
      padding: '5px 40px',
      width: 'auto',
      textAlign: 'center',
      backgroundImage: 'linear-gradient(90deg, rgb(255, 77, 77), rgb(249, 203, 40))',
      backgroundClip: 'text',
      '-webkit-background-clip': 'text',
      color: 'transparent',
    }}
  >
    Ship
  </div>
</div>
`,
  'Vercel Docs': `<div
  style={{
    height: '100%',
    width: '100%',
    display: 'flex',
    textAlign: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
    flexWrap: 'nowrap',
    backgroundColor: 'white',
    backgroundImage: 'radial-gradient(circle at 25px 25px, lightgray 2%, transparent 0%), radial-gradient(circle at 75px 75px, lightgray 2%, transparent 0%)',
    backgroundSize: '100px 100px',
  }}
>
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}
  >
    <svg
      height={80}
      viewBox="0 0 75 65"
      fill="black"
      style={{ margin: '0 75px' }}
    >
      <path d="M37.59.25l36.95 64H.64l36.95-64z"></path>
    </svg>
  </div>
  <div
    style={{
      display: 'flex',
      fontSize: 40,
      fontStyle: 'normal',
      color: 'black',
      marginTop: 30,
      lineHeight: 1.8,
      whiteSpace: 'pre-wrap',
    }}
  >
    <b>Vercel Edge Network</b>
  </div>
</div>
`,
  rauchg: `<div
  style={{
    display: 'flex',
    height: '100%',
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    letterSpacing: '-.02em',
    fontWeight: 700,
    background: 'white',
  }}
>
  <div
    style={{
      left: 42,
      top: 42,
      position: 'absolute',
      display: 'flex',
      alignItems: 'center',
    }}
  >
    <span
      style={{
        width: 24,
        height: 24,
        background: 'black',
      }}
    />
    <span
      style={{
        marginLeft: 8,
        fontSize: 20,
      }}
    >
      rauchg.com
    </span>
  </div>
  <div
    style={{
      display: 'flex',
      flexWrap: 'wrap',
      justifyContent: 'center',
      padding: '20px 50px',
      margin: '0 42px',
      fontSize: 40,
      width: 'auto',
      maxWidth: 550,
      textAlign: 'center',
      backgroundColor: 'black',
      color: 'white',
      lineHeight: 1.4,
    }}
  >
    Making the Web. Faster.
  </div>
</div>
`,
  'Font & Emoji': `// Fallback fonts and Emoji are dynamically loaded from Google Fonts and CDNs in this demo.

<div
  style={{
    display: 'flex',
    height: '100%',
    width: '100%',
    padding: '10px 20px',
    alignItems: 'center',
    alignContent: 'center',
    justifyContent: 'center',
    fontFamily: 'Inter, "Material Icons"',
    fontSize: 40,
    textAlign: 'center',
    backgroundColor: 'white',
  }}
  >
  👋😄 Hello! 你好! 안녕! こんにちは! Χαίρετε! Hallå! &#xe766;
</div>
`,
  'Tailwind CSS (Experimental)': `// Modified based on https://tailwindui.com/components/marketing/sections/cta-sections

<div
  style={{
    height: '100%',
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
  }}
>
  <div tw="bg-gray-50 flex">
    <div tw="flex flex-col md:flex-row w-full py-12 px-4 md:items-center justify-between p-8">
      <h2 tw="flex flex-col text-3xl sm:text-4xl font-bold tracking-tight text-gray-900 text-left">
        <span>Ready to dive in?</span>
        <span tw="text-indigo-600">Start your free trial today.</span>
      </h2>
      <div tw="mt-8 flex md:mt-0">
        <div tw="flex rounded-md shadow">
          <a href="#" tw="flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-5 py-3 text-base font-medium text-white">Get started</a>
        </div>
        <div tw="ml-3 flex rounded-md shadow">
          <a href="#" tw="flex items-center justify-center rounded-md border border-transparent bg-white px-5 py-3 text-base font-medium text-indigo-600">Learn more</a>
        </div>
      </div>
    </div>
  </div>
</div>
`,
}
