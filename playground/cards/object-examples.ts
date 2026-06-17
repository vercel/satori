export type ObjectExamples = {
  [x: string]: any
}

const objectExamples: ObjectExamples = {
  helloworld: {
    type: 'div',
    props: {
      style: {
        height: '100%',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff',
        fontSize: 32,
        fontWeight: 600,
      },
      children: [
        {
          type: 'svg',
          props: {
            width: '75',
            viewBox: '0 0 75 65',
            fill: '#000',
            style: { margin: '0 75px' },
            children: [
              {
                type: 'path',
                props: {
                  d: 'M37.59.25l36.95 64H.64l36.95-64z',
                },
              },
            ],
          },
        },
        {
          type: 'div',
          props: {
            style: { marginTop: 40 },
            children: ['Hello, World'],
          },
        },
      ],
    },
  },
  Vercel: {
    type: 'div',
    props: {
      style: {
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
      },
      children: [
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            },
            children: [
              {
                type: 'svg',
                props: {
                  height: 80,
                  viewBox: '0 0 75 65',
                  fill: 'black',
                  style: { margin: '0 75px' },
                  children: [
                    {
                      type: 'path',
                      props: {
                        d: 'M37.59.25l36.95 64H.64l36.95-64z',
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              fontSize: 40,
              fontStyle: 'normal',
              color: 'black',
              marginTop: 30,
              lineHeight: 1.8,
              whiteSpace: 'pre-wrap',
            },
            children: [
              {
                type: 'b',
                props: {
                  children: ['Vercel Edge Network'],
                },
              },
            ],
          },
        },
      ],
    },
  },
  rauchg: {
    type: 'div',
    props: {
      style: {
        display: 'flex',
        height: '100%',
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        letterSpacing: '-.02em',
        fontWeight: 700,
        background: 'white',
      },
      children: [
        {
          type: 'div',
          props: {
            style: {
              left: 42,
              top: 42,
              position: 'absolute',
              display: 'flex',
              alignItems: 'center',
            },
            children: [
              {
                type: 'span',
                props: {
                  style: {
                    width: 24,
                    height: 24,
                    background: 'black',
                  },
                },
              },
              {
                type: 'span',
                props: {
                  style: {
                    marginLeft: 8,
                    fontSize: 20,
                  },
                  children: ['rauchg.com'],
                },
              },
            ],
          },
        },
        {
          type: 'div',
          props: {
            style: {
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
            },
            children: ['Making the Web. Faster.'],
          },
        },
      ],
    },
  },
  Gradients: {
    type: 'div',
    props: {
      style: {
        display: 'flex',
        height: '100%',
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        backgroundImage: 'linear-gradient(to bottom, #dbf4ff, #fff1f1)',
        fontSize: 60,
        letterSpacing: -2,
        fontWeight: 700,
        textAlign: 'center',
      },
      children: [
        {
          type: 'div',
          props: {
            style: {
              backgroundImage: 'linear-gradient(90deg, rgb(0, 124, 240), rgb(0, 223, 216))',
              backgroundClip: 'text',
              '-webkit-background-clip': 'text',
              color: 'transparent',
            },
            children: ['Develop'],
          },
        },
        {
          type: 'div',
          props: {
            style: {
              backgroundImage: 'linear-gradient(90deg, rgb(121, 40, 202), rgb(255, 0, 128))',
              backgroundClip: 'text',
              '-webkit-background-clip': 'text',
              color: 'transparent',
            },
            children: ['Preview'],
          },
        },
        {
          type: 'div',
          props: {
            style: {
              backgroundImage: 'linear-gradient(90deg, rgb(255, 77, 77), rgb(249, 203, 40))',
              backgroundClip: 'text',
              '-webkit-background-clip': 'text',
              color: 'transparent',
            },
            children: ['Ship'],
          },
        },
      ],
    },
  },
  Simple: {
    type: 'div',
    props: {
      style: {
        display: 'flex',
        height: '100%',
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff',
        fontSize: 40,
        fontWeight: 'bold',
        color: '#000',
      },
      children: ['Simple Object Syntax'],
    },
  },
}

export default objectExamples