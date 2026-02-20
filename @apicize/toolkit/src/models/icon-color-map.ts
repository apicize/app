import { PALETTE_COLORS } from './palette-colors'

/**
 * Maps icon names used in help documentation to their display colors.
 * Shared between help.tsx (React) and generate-docs.ts (static HTML).
 */
export const ICON_COLOR_MAP: Record<string, string> = {
    request: PALETTE_COLORS.request,
    group: PALETTE_COLORS.request,
    info: PALETTE_COLORS.request,
    query: PALETTE_COLORS.request,
    headers: PALETTE_COLORS.request,
    body: PALETTE_COLORS.request,
    parameters: PALETTE_COLORS.request,
    test: PALETTE_COLORS.request,
    dataset: PALETTE_COLORS.data,
    data: PALETTE_COLORS.data,
    authorization: PALETTE_COLORS.authorization,
    scenario: PALETTE_COLORS.scenario,
    certificate: PALETTE_COLORS.certificate,
    proxy: PALETTE_COLORS.proxy,
    defaults: PALETTE_COLORS.defaults,
    public: PALETTE_COLORS.public,
    private: PALETTE_COLORS.private,
    vault: PALETTE_COLORS.vault,
    runonce: '#2e7d32',  // MUI success.main
    run: '#2e7d32',      // MUI success.main
    seed: '#1976d2',     // MUI primary.main
}
