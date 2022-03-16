export default (
  <div
    style={{
      display: 'flex',
      height: '100%',
      width: '100%',
      alignItems: 'center',
      alignContent: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      fontFamily: 'Inter',
      backgroundColor: 'white',
      fontSize: 60,
      letterSpacing: -2,
      fontWeight: 700,
    }}
  >
    <div
      style={{
        padding: '5px 40px',
        width: 'auto',
        textAlign: 'center',
        backgroundImage: `linear-gradient(90deg, rgb(0, 124, 240), rgb(0, 223, 216))`,
        backgroundClip: 'text',
        '-webkit-background-clip': 'text',
        color: 'transparent',
      }}
    >
      Develop <strong>It</strong>
    </div>
    <div
      style={{
        padding: '5px 40px',
        width: 'auto',
        textAlign: 'center',
        backgroundImage: `linear-gradient(90deg, rgb(121, 40, 202), rgb(255, 0, 128))`,
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
        backgroundImage: `linear-gradient(90deg, rgb(255, 77, 77), rgb(249, 203, 40))`,
        backgroundClip: 'text',
        '-webkit-background-clip': 'text',
        color: 'transparent',
      }}
    >
      Ship
    </div>
  </div>
)
