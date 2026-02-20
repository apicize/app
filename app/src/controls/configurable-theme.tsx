import { useApicizeSettings, PALETTE_COLORS } from "@apicize/toolkit"
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
          main: isDark ? PALETTE_COLORS.navigation.dark : PALETTE_COLORS.navigation.light,
        },
        name: 'navigation'
      }),
      toolbar: palette.palette.augmentColor({
        color: {
          main: isDark ? PALETTE_COLORS.toolbar.dark : PALETTE_COLORS.toolbar.light,
        },
        name: 'toolbar'
      }),
      folder: palette.palette.augmentColor({
        color: {
          main: isDark ? PALETTE_COLORS.folder.dark : PALETTE_COLORS.folder.light,
        },
        name: 'folder'
      }),
      request: palette.palette.augmentColor({
        color: {
          main: PALETTE_COLORS.request,
        },
        name: 'request'
      }),
      scenario: palette.palette.augmentColor({
        color: {
          main: PALETTE_COLORS.scenario,
        },
        name: 'scenario'
      }),
      authorization: palette.palette.augmentColor({
        color: {
          main: PALETTE_COLORS.authorization,
        },
        name: 'authorization'
      }),
      certificate: palette.palette.augmentColor({
        color: {
          main: PALETTE_COLORS.certificate,
        },
        name: 'certificate'
      }),
      data: palette.palette.augmentColor({
        color: {
          main: PALETTE_COLORS.data,
        },
        name: 'proxy'
      }),
      proxy: palette.palette.augmentColor({
        color: {
          main: PALETTE_COLORS.proxy,
        },
        name: 'proxy'
      }),
      defaults: palette.palette.augmentColor({
        color: {
          main: PALETTE_COLORS.defaults,
        },
        name: 'defaults'
      }),
      public: palette.palette.augmentColor({
        color: {
          main: PALETTE_COLORS.public,
        },
        name: 'public'
      }),
      private: palette.palette.augmentColor({
        color: {
          main: PALETTE_COLORS.private,
        },
        name: 'private'
      }),
      vault: palette.palette.augmentColor({
        color: {
          main: PALETTE_COLORS.vault,
        },
        name: 'vault'
      }),
      unselected: palette.palette.augmentColor({
        color: {
          main: isDark ? PALETTE_COLORS.unselected.dark : PALETTE_COLORS.unselected.light,
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