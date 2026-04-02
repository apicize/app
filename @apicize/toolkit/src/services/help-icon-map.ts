/**
 * Icon file mappings for static documentation generator.
 *
 * This module is used by generate-docs.ts to extract SVG markup from source files.
 * For React component rendering, see help-icon-renderer.tsx instead.
 *
 * IMPORTANT: When adding new icons to help-icon-renderer.tsx,
 * add them here as well to keep the static docs generator in sync.
 */

/** Map of icon names to their custom .tsx source filenames in @apicize/toolkit/src/icons */
export const CUSTOM_ICON_FILES: Record<string, string> = {
  request: 'request-icon.tsx',
  group: 'folder-icon.tsx',
  scenario: 'scenario-icon.tsx',
  authorization: 'auth-icon.tsx',
  certificate: 'certificate-icon.tsx',
  proxy: 'proxy-icon.tsx',
  defaults: 'defaults-icon.tsx',
  logs: 'log-icon.tsx',
  public: 'public-icon.tsx',
  private: 'private-icon.tsx',
  vault: 'vault-icon.tsx',
  seed: 'seed-icon.tsx',
  apicize: 'apicize-icon.tsx',
  'response-details': 'request-icon.tsx',
  'response-view': 'view-icon.tsx',
}

/** Map of icon names to their @mui/icons-material module names */
export const MUI_ICON_FILES: Record<string, string> = {
  info: 'DisplaySettings',
  query: 'ViewList',
  headers: 'ViewListOutlined',
  body: 'ArticleOutlined',
  parameters: 'AltRoute',
  test: 'Science',
  dataset: 'Dataset',
  settings: 'Settings',
  display: 'DisplaySettings',
  runonce: 'PlayCircleOutline',
  run: 'PlayCircleFilled',
  data: 'Dataset',
  'workbook-new': 'PostAdd',
  'workbook-open': 'FileOpen',
  'file-open': 'FileOpen',
  'workbook-save': 'Save',
  'workbook-save-as': 'SaveAs',
  setup: 'Settings',
  appsettings: 'Tune',
  lock: 'Key',
  clear: 'ClearAll',
  copy: 'ContentCopy',
  paste: 'ContentPasteGo',
  'add-header': 'FormatListBulletedAdd',
  beautify: 'AutoAwesome',
  'response-info': 'ScienceOutlined',
  'response-headers': 'ViewListOutlined',
  'response-body-raw': 'Preview',
  'response-body-preview': 'ArticleOutlined',
  'response-curl': 'Launch',
  'response-copy': 'ContentCopy',
}

/**
 * Get all known icon names (both custom and MUI).
 * Useful for validation in help.tsx to ensure all icons are mapped.
 */
export function getAllIconNames(): string[] {
  return [...Object.keys(CUSTOM_ICON_FILES), ...Object.keys(MUI_ICON_FILES)]
}
