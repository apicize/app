/**
 * Apicize palette color definitions.
 * Shared between the MUI theme (configurable-theme.tsx) and
 * the static doc generator (generate-docs.ts).
 */
export const PALETTE_COLORS = {
    navigation: { dark: '#202020', light: '#F0F0F0' },
    toolbar: { dark: '#404040', light: '#E0E0E0' },
    folder: { dark: '#FFD700', light: '#e6c300' },
    request: '#00ace6',
    scenario: '#0073e6',
    authorization: '#daa520',
    certificate: '#FF8C00',
    data: '#663399',
    proxy: '#cc0099',
    defaults: '#86b300',
    public: '#009933',
    private: '#cfb53b',
    vault: '#cc2900',
    unselected: { dark: '#808080', light: '#404040' },
} as const
