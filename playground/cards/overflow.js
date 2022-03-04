import { VercelLogo } from './github'

export default (
  <div
    style={{
      display: 'flex',
      width: '100%',
      flexDirection: 'column',
    }}
  >
    <div
      style={{
        display: 'flex',
        width: '100%',
        padding: 10,
      }}
    >
      <div
        style={{
          padding: 5,
          marginRight: 10,
          maxWidth: 60,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          border: '1px solid',
        }}
      >
        Hello, world!!!!
      </div>
      <div
        style={{
          padding: 5,
          marginRight: 10,
          maxWidth: 80,
          maxHeight: 20,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          border: '1px solid',
        }}
      >
        Hello, world!!!!
      </div>
      <div
        style={{
          padding: 5,
          marginRight: 10,
          maxWidth: 80,
          maxHeight: 20,
          overflow: 'hidden',
          border: '1px solid',
        }}
      >
        Hello, world!!!!
      </div>
    </div>
    <div
      style={{
        display: 'flex',
        width: '100%',
        padding: 10,
      }}
    >
      <div
        style={{
          padding: 5,
          marginRight: 10,
          maxWidth: 100,
          maxHeight: 20,
          overflow: 'hidden',
          border: '1px solid',
        }}
      >
        <div style={{ background: 'red', width: 50, height: 100 }} />
      </div>
      <div
        style={{
          padding: 5,
          marginRight: 10,
          maxWidth: 20,
          maxHeight: 100,
          overflow: 'hidden',
          border: '1px solid',
        }}
      >
        <div style={{ background: 'red', width: 50, height: 50 }} />
      </div>
      <div
        style={{
          padding: 5,
          marginRight: 10,
          maxWidth: 20,
          maxHeight: 20,
          overflow: 'hidden',
          border: '1px solid',
        }}
      >
        <div style={{ background: 'red', width: 100, height: 20 }} />
      </div>
      <div
        style={{
          padding: 5,
          marginRight: 10,
          maxWidth: 20,
          maxHeight: 20,
          overflow: 'hidden',
          border: '1px solid',
        }}
      >
        <div
          style={{ background: 'red', width: 100, height: 20, marginLeft: -50 }}
        />
      </div>
      <div
        style={{
          padding: 5,
          marginRight: 10,
          maxWidth: 20,
          maxHeight: 20,
          overflow: 'hidden',
          border: '1px solid',
        }}
      >
        <div
          style={{
            background: 'red',
            width: 100,
            height: 20,
            marginLeft: -95,
          }}
        />
      </div>
    </div>
    <div
      style={{
        display: 'flex',
        width: '100%',
        padding: 10,
      }}
    >
      <div
        style={{
          marginRight: 10,
          maxWidth: 60,
          overflow: 'hidden',
          border: '1px solid',
        }}
      >
        Nested
        <div
          style={{
            padding: 10,
            margin: '10px 0',
            width: 100,
            maxHeight: 20,
            overflow: 'hidden',
            background: 'blue',
          }}
        >
          <div style={{ background: 'yellow', width: 10, height: 100 }} />
        </div>
      </div>
      <div
        style={{
          marginRight: 10,
          maxWidth: 60,
          overflow: 'hidden',
          border: '1px solid',
          borderRadius: 25,
        }}
      >
        Border
        <div
          style={{
            padding: 10,
            margin: '10px 0',
            width: 100,
            maxHeight: 20,
            overflow: 'hidden',
            background: 'blue',
          }}
        >
          <div style={{ background: 'yellow', width: 20, height: 100 }} />
        </div>
      </div>
      <div
        style={{
          marginRight: 10,
          maxWidth: 60,
          overflow: 'hidden',
          border: '1px solid',
          borderTopLeftRadius: 25,
          borderBottomRightRadius: 50,
        }}
      >
        Border
        <div
          style={{
            padding: 10,
            margin: '10px 0',
            width: 100,
            maxHeight: 20,
            overflow: 'hidden',
            background: 'blue',
          }}
        >
          <div style={{ background: 'yellow', width: 35, height: 100 }} />
        </div>
      </div>
      <div
        style={{
          marginRight: 10,
          width: 60,
          height: 60,
          overflow: 'hidden',
          borderTopLeftRadius: 60,
          borderBottomRightRadius: 60,
          border: '1px solid red',
        }}
      >
        <div
          style={{
            width: 60,
            height: 60,
            overflow: 'hidden',
            background: 'blue',
            borderTopRightRadius: 60,
            borderBottomLeftRadius: 60,
            border: '1px solid red',
          }}
        ></div>
      </div>
    </div>
    <div
      style={{
        display: 'flex',
        width: '100%',
        padding: 10,
      }}
    >
      <div
        style={{
          marginRight: 10,
          width: 120,
          height: 74,
          overflow: 'hidden',
        }}
      >
        <img
          width={148}
          height={148}
          src={VercelLogo}
          style={{
            borderRadius: 20,
          }}
        ></img>
      </div>
      <div
        style={{
          marginRight: 10,
          width: 120,
          height: 74,
          overflow: 'hidden',
        }}
      >
        <img
          width={148}
          height={148}
          src={VercelLogo}
          style={{
            marginLeft: -12,
            marginTop: -30,
          }}
        ></img>
      </div>
    </div>
  </div>
)
