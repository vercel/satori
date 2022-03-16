const code = `export default function Counter() {
  const [count, setCount] = useState(0);
  return (
    <div>
      <p>You clicked {count} times</p>
      <button onClick={() => setCount(count + 1)}>Click me</button>
    </div>
  );
}`

export default (
  <div
    style={{
      display: 'flex',
      width: '100%',
      flexDirection: 'column',
      fontSize: 12,
      padding: '20px 45px',
    }}
  >
    <div
      style={{
        display: 'flex',
        width: '100%',
        border: '1px solid #ccc',
        alignItems: 'flex-start',
        justifyContent: 'center',
        flexDirection: 'column',
        flexWrap: 'nowrap',
        backgroundColor: 'white',
      }}
    >
      <div
        style={{
          display: 'flex',
          width: '100%',
          alignItems: 'flex-start',
          justifyContent: 'center',
          flexDirection: 'row',
          flexWrap: 'nowrap',
          backgroundColor: 'white',
        }}
      >
        <div
          style={{
            width: '50%',
            padding: 10,
          }}
        >
          <div style={{ paddingBottom: 20, color: 'crimson' }}>
            white-space: normal
          </div>
          {code}
        </div>
        <div
          style={{
            padding: 10,
            width: '50%',
            whiteSpace: 'pre-wrap',
          }}
        >
          <div style={{ paddingBottom: 20, color: 'crimson' }}>
            white-space: pre-wrap
          </div>
          {code}
        </div>
      </div>
      <div
        style={{
          display: 'flex',
          width: '100%',
          alignItems: 'flex-start',
          justifyContent: 'center',
          flexDirection: 'row',
          flexWrap: 'nowrap',
          backgroundColor: 'white',
        }}
      >
        <div
          style={{
            padding: 10,
            width: '50%',
            whiteSpace: 'pre',
          }}
        >
          <div style={{ paddingBottom: 20, color: 'crimson' }}>
            white-space: pre
          </div>
          {code}
        </div>
        <div
          style={{
            padding: 10,
            width: '50%',
            whiteSpace: 'nowrap',
          }}
        >
          <div style={{ paddingBottom: 20, color: 'crimson' }}>
            white-space: nowrap
          </div>
          {code}
        </div>
      </div>
    </div>
  </div>
)
