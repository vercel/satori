export default (
  <div
    style={{
      display: 'flex',
      height: '100%',
      width: '100%',
      padding: 20,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      flexWrap: 'nowrap',
    }}
  >
    <div
      style={{
        transform: 'rotate(45deg)',
        transformOrigin: 'right bottom',
        width: '100px',
        height: '100px',
        background: 'red',
      }}
    />
    <div
      style={{
        transform: 'rotate(45deg)',
        transformOrigin: '100px 200px',
        width: '100px',
        height: '100px',
        background: 'blue',
      }}
    />
    <div
      style={{
        transform: 'rotate(45deg)',
        width: '100px',
        height: '100px',
        background: 'green',
      }}
    />
  </div>
)
