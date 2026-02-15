import { useApicizeSettings } from "@apicize/toolkit"
import { createTheme, ThemeProvider, TypographyVariantsOptions } from "@mui/material/styles"
import { observer } from "mobx-react-lite"
import { ReactNode, useMemo } from "react"
import "@mui/x-tree-view/themeAugmentation"

interface ExtendedTypographyOptions extends TypographyVariantsOptions {
  code: React.CSSProperties;
  navigation: React.CSSProperties;
}

export const ConfigurableTheme = observer(({ children }: {
  children?: ReactNode,
}) => {
  const settings = useApicizeSettings()

  const isDark = settings.colorScheme === 'dark'
  const fontSize = settings.fontSize
  const navigationFontSize = settings.navigationFontSize

  const theme = useMemo(() => {
    const palette = createTheme()
    palette.palette.text.primary = isDark ? '#FFFFFF' : '#000000'

    return createTheme({
    palette: {
      mode: isDark ? 'dark' : 'light',
      navigation: palette.palette.augmentColor({
        color: {
          main: isDark ? '#202020' : '#F0F0F0',
        },
        name: 'navigation'
      }),
      toolbar: palette.palette.augmentColor({
        color: {
          main: isDark ? '#404040' : '#E0E0E0',
        },
        name: 'toolbar'
      }),
      folder: palette.palette.augmentColor({
        color: {
          main: isDark ? '#FFD700' : '#e6c300'
        },
        name: 'folder'
      }),
      request: palette.palette.augmentColor({
        color: {
          main: '#00ace6'
        },
        name: 'request'
      }),
      scenario: palette.palette.augmentColor({
        color: {
          main: '#0073e6'
        },
        name: 'scenario'
      }),
      authorization: palette.palette.augmentColor({
        color: {
          main: '#daa520'
        },
        name: 'authorization'
      }),
      certificate: palette.palette.augmentColor({
        color: {
          main: '#FF8C00'
        },
        name: 'certificate'
      }),
      data: palette.palette.augmentColor({
        color: {
          main: '#663399'
        },
        name: 'proxy'
      }),
      proxy: palette.palette.augmentColor({
        color: {
          main: '#cc0099'
        },
        name: 'proxy'
      }),
      defaults: palette.palette.augmentColor({
        color: {
          main: '#86b300'
        },
        name: 'defaults'
      }),
      public: palette.palette.augmentColor({
        color: {
          main: '#009933'
        },
        name: 'public'
      }),
      private: palette.palette.augmentColor({
        color: {
          main: '#cfb53b'
        },
        name: 'private'
      }),
      vault: palette.palette.augmentColor({
        color: {
          main: '#cc2900'
        },
        name: 'vault'
      }),
      unselected: palette.palette.augmentColor({
        color: {
          main: isDark ? '#808080' : '#404040',
        },
        name: 'toolbar'
      }),
    },
    typography: {
      body: {
        fontFamily: "'Roboto Flex','sans'",
        fontSize: fontSize
      },
      body1: {
        fontFamily: "'Roboto Flex','sans'",
        fontSize: fontSize
      },
      body2: {
        fontFamily: "'Roboto Flex','sans'",
        fontSize: fontSize
      },
      fontSize: fontSize,
      fontFamily: "'Roboto Flex','sans'",
      code: {
        fontFamily: "'Roboto Mono','monospace'"
      },
      navigation: {
        fontFamily: "'Roboto Flex','sans'",
        fontSize: navigationFontSize
      },
    } as TypographyVariantsOptions,
    components: {
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            minWidth: '4em'
          }
        }
      },
      MuiTreeItem: {
        styleOverrides: {
          content: {
            padding: '0.1rem',
          }
        }
      },

      //   MuiIconButton: {
      //     defaultProps: {
      //       sx: { padding: '0.05em' }
      //     }
      //   },
      //   MuiListItemIcon: {
      //     defaultProps: {
      //       sx: {
      //         minWidth: '36px'
      //       }
      //     }
      //   },
      //   MuiInputBase: {
      //     styleOverrides: {
      //       input: {
      //         "&.code": {
      //           fontFamily: 'monospace',
      //         }
      //       }
      //     }
      //   },
      MuiTypography: {
        styleOverrides: {
          h1: {
            fontSize: '1.5em',
            fontWeight: 'normal',
            // marginTop: '0.1em',
            marginBottom: '1.5em'
          },
          h2: {
            fontSize: '1.3em',
            fontWeight: 'normal',
            marginTop: '1.5em',
            marginBottom: '1.0em',
          },
          h3: {
            fontSize: '1.2em',
            fontWeight: 'normal',
            marginTop: '1.5em',
            marginBottom: '1.0em',
          },
        }
      }
    },
  })
  }, [isDark, fontSize, navigationFontSize])

  return (
    <ThemeProvider theme={theme}>
      <div className={isDark ? 'dark' : 'light'}>
        {children}
      </div>
    </ThemeProvider>
  )
})