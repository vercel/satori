export default (
  <div
    style={{
      display: 'flex',
      height: '100%',
      width: '100%',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      fontFamily: 'Inter',
      backgroundImage: 'linear-gradient(to bottom, white, #ddd)',
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
          letterSpacing: -0.2,
          fontSize: 20,
          fontWeight: 700,
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
        padding: '20px 40px',
        letterSpacing: -2,
        fontSize: 40,
        fontWeight: 700,
        width: 'auto',
        maxWidth: 550,
        textAlign: 'center',
        backgroundColor: 'blue',
        backgroundImage: `linear-gradient(to bottom, red, rgba(255,0,0,0))`,
        color: 'white',
        borderTopLeftRadius: 100,
        borderTopRightRadius: 20,
        borderBottomRightRadius: 100,
        borderBottomLeftRadius: 20,
        border: '8px solid gold',
        transform:
          'rotate(-10deg) translate(0, -10px) skewX(-10deg) scale(1.2, 1.2)',
      }}
    >
      7 Principles of
      <span
        style={{
          margin: '0 10px',
          color: 'gold',
          display: 'block',
          transform: 'rotate(10deg) scale(1, 2)',
        }}
      >
        Rich
      </span>
      Web Applications
    </div>
  </div>
)
