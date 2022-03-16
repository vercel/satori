// https://og-image.vercel.app/**Hello**%20World.png?theme=light&md=1&fontSize=100px&images=https%3A%2F%2Fassets.vercel.com%2Fimage%2Fupload%2Ffront%2Fassets%2Fdesign%2Fvercel-triangle-black.svg

//const VercelLogo = 'data:image/svg+xml,<svg width="116" height="100" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M57.5 0L115 100H0L57.5 0z" /></svg>'
const VercelLogo =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTE2IiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBmaWxsLXJ1bGU9ImV2ZW5vZGQiIGNsaXAtcnVsZT0iZXZlbm9kZCIgZD0iTTU3LjUgMEwxMTUgMTAwSDBMNTcuNSAweiIgLz48L3N2Zz4='

const Strong = (props) => (
  <span style={{ fontWeight: 700 }}>{props.children}</span>
)

const Spacer = (props) => (
  <div style={{ margin: props.margin || '150px' }}>{props.children}</div>
)

export default (
  <div
    style={{
      backgroundColor: 'white',
      backgroundImage:
        'radial-gradient(circle at 25px 25px, lightgray 2%, transparent 0%), radial-gradient(circle at 75px 75px, lightgray 2%, transparent 0%)',
      backgroundSize: '100px 100px',
      height: '100%',
      width: '100%',
      display: 'flex',
      textAlign: 'center',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      flexWrap: 'nowrap',
    }}
  >
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        alignContent: 'center',
        justifyContent: 'center',
        justifyItems: 'center',
      }}
    >
      <img
        style={{ margin: '0 75px' }}
        alt='logo'
        src={VercelLogo}
        width={255 * 0.6}
        height={225 * 0.6}
      />
    </div>
    <div
      style={{
        fontFamily: 'Inter',
        fontSize: '60px',
        fontStyle: 'normal',
        color: 'black',
        lineHeight: 1.8,
        marginTop: 40,
      }}
    >
      <Strong>Hello</Strong> World
    </div>
  </div>
)
