"use strict";
/**
 * Static HTML documentation generator for Apicize.
 *
 * Reads Markdown help files from app/src-tauri/help/ and converts them
 * to standalone HTML pages in the /docs directory using the same
 * remark/rehype pipeline used by the in-app help panel.
 *
 * Usage:  npx tsx generate-docs.ts
 */
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
var fs_1 = require("fs");
var path_1 = require("path");
var unified_1 = require("unified");
var remark_parse_1 = require("remark-parse");
var remark_gfm_1 = require("remark-gfm");
var remark_directive_1 = require("remark-directive");
var remark_rehype_1 = require("remark-rehype");
var rehype_stringify_1 = require("rehype-stringify");
var unist_util_visit_1 = require("unist-util-visit");
var help_formatter_1 = require("./@apicize/toolkit/src/services/help-formatter");
var icon_color_map_1 = require("./@apicize/toolkit/src/models/icon-color-map");
// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------
var ROOT = __dirname;
var HELP_DIR = (0, path_1.join)(ROOT, 'app', 'src-tauri', 'help');
var DOCS_DIR = (0, path_1.join)(ROOT, 'docs');
var IMAGES_SRC = (0, path_1.join)(HELP_DIR, 'images');
var IMAGES_DST = (0, path_1.join)(DOCS_DIR, 'images');
// ---------------------------------------------------------------------------
// Read version from root package.json
// ---------------------------------------------------------------------------
var pkg = JSON.parse((0, fs_1.readFileSync)((0, path_1.join)(ROOT, 'package.json'), 'utf-8'));
var APP_VERSION = (_a = pkg.version) !== null && _a !== void 0 ? _a : '0.0.0';
var contents = JSON.parse((0, fs_1.readFileSync)((0, path_1.join)(HELP_DIR, 'contents.json'), 'utf-8'));
// ---------------------------------------------------------------------------
// Collect all topic paths from contents.json
// ---------------------------------------------------------------------------
function collectTopics(obj) {
    var result = [];
    for (var _i = 0, _a = Object.values(obj); _i < _a.length; _i++) {
        var value = _a[_i];
        if (typeof value === 'string') {
            result.push(value);
        }
        else {
            result.push.apply(result, collectTopics(value));
        }
    }
    return result;
}
var allTopics = collectTopics(contents);
// ---------------------------------------------------------------------------
// Icon SVG extraction from .tsx source files
// ---------------------------------------------------------------------------
var ICONS_DIR = (0, path_1.join)(ROOT, '@apicize', 'toolkit', 'src', 'icons');
/** Map of icon names used in docs to their custom .tsx source filenames */
var CUSTOM_ICON_FILES = {
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
};
/** Map of icon names used in docs to their @mui/icons-material module names */
var MUI_ICON_FILES = {
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
    'workbook-save': 'Save',
    'workbook-save-as': 'SaveAs',
    setup: 'Settings',
};
var MUI_ICONS_DIR = (0, path_1.join)(ROOT, 'node_modules', '@mui', 'icons-material');
/** JSX camelCase attribute names → HTML kebab-case equivalents */
var JSX_ATTR_MAP = {
    strokeWidth: 'stroke-width',
    strokeLinecap: 'stroke-linecap',
    strokeLinejoin: 'stroke-linejoin',
    strokeMiterlimit: 'stroke-miterlimit',
    fillRule: 'fill-rule',
    clipRule: 'clip-rule',
    clipPath: 'clip-path',
    xmlSpace: 'xml:space',
    xmlLang: 'xml:lang',
    xmlnsXlink: 'xmlns:xlink',
    xlinkHref: 'xlink:href',
};
/**
 * Extract the SVG markup from a .tsx icon component file.
 * Reads the file as text, finds the first uncommented <svg>...</svg> block,
 * and converts JSX camelCase attributes to HTML kebab-case.
 */
function extractSvgFromTsx(filePath) {
    var source = (0, fs_1.readFileSync)(filePath, 'utf-8');
    // Strip single-line comments (// ...) to avoid matching commented-out SVGs
    var uncommented = source.replace(/^\s*\/\/.*$/gm, '');
    // Match the first <svg ...>...</svg> block (single-line or multi-line)
    var svgMatch = uncommented.match(/<svg[\s\S]*?<\/svg>/i);
    if (!svgMatch)
        return null;
    var svg = svgMatch[0];
    // Convert JSX camelCase attributes to HTML kebab-case
    for (var _i = 0, _a = Object.entries(JSX_ATTR_MAP); _i < _a.length; _i++) {
        var _b = _a[_i], jsx = _b[0], html = _b[1];
        svg = svg.replace(new RegExp(jsx, 'g'), html);
    }
    // Remove xmlns attributes (not needed for inline SVG)
    svg = svg.replace(/\s+xmlns="[^"]*"/g, '');
    // Normalize width/height to 24x24 if not already set
    if (!svg.includes('width=')) {
        svg = svg.replace('<svg', '<svg width="24" height="24"');
    }
    return svg;
}
/**
 * Extract SVG path data from a @mui/icons-material .js file.
 * MUI icons use createSvgIcon() with JSX path elements containing a `d` property.
 * Returns a complete <svg> element with the extracted path(s).
 */
function extractSvgFromMui(filePath) {
    var source = (0, fs_1.readFileSync)(filePath, 'utf-8');
    // MUI icon files contain: (0, _jsxRuntime.jsx)("path", { d: "..." })
    // or for multi-path icons: (0, _jsxRuntime.jsxs)(_jsxRuntime.Fragment, { children: [...] })
    var pathMatches = Array.from(source.matchAll(/d:\s*"([^"]+)"/g));
    if (pathMatches.length === 0)
        return null;
    var paths = pathMatches.map(function (m) { return "<path d=\"".concat(m[1], "\"/>"); }).join('');
    return "<svg viewBox=\"0 0 24 24\" fill=\"currentColor\" width=\"24\" height=\"24\">".concat(paths, "</svg>");
}
/**
 * Load all icon SVGs by extracting from source files:
 * - Custom app icons from @apicize/toolkit/src/icons/*.tsx
 * - MUI Material Design icons from node_modules/@mui/icons-material/*.js
 */
function loadIconSvgs() {
    var icons = {};
    // Extract MUI icons from node_modules
    for (var _i = 0, _a = Object.entries(MUI_ICON_FILES); _i < _a.length; _i++) {
        var _b = _a[_i], name_1 = _b[0], moduleName = _b[1];
        var filePath = (0, path_1.join)(MUI_ICONS_DIR, "".concat(moduleName, ".js"));
        if (!(0, fs_1.existsSync)(filePath)) {
            console.warn("  WARNING: MUI icon ".concat(moduleName, ".js not found, skipping ").concat(name_1));
            continue;
        }
        var svg = extractSvgFromMui(filePath);
        if (svg) {
            icons[name_1] = svg;
        }
        else {
            console.warn("  WARNING: Could not extract SVG from ".concat(moduleName, ".js for ").concat(name_1));
        }
    }
    // Extract custom icons from .tsx source files (overrides MUI if same name)
    for (var _c = 0, _d = Object.entries(CUSTOM_ICON_FILES); _c < _d.length; _c++) {
        var _e = _d[_c], name_2 = _e[0], filename = _e[1];
        var filePath = (0, path_1.join)(ICONS_DIR, filename);
        if (!(0, fs_1.existsSync)(filePath)) {
            console.warn("  WARNING: Icon source ".concat(filename, " not found, skipping ").concat(name_2));
            continue;
        }
        var svg = extractSvgFromTsx(filePath);
        if (svg) {
            icons[name_2] = svg;
        }
        else {
            console.warn("  WARNING: Could not extract SVG from ".concat(filename, " for ").concat(name_2));
        }
    }
    return icons;
}
// ---------------------------------------------------------------------------
// Rehype plugin to transform custom elements for static HTML
// ---------------------------------------------------------------------------
function rehypeStaticTransforms(prefix, iconSvgs) {
    return function () { return function (tree) {
        (0, unist_util_visit_1.visit)(tree, 'element', function (node, index, parent) {
            var _a, _b, _c, _d;
            // Transform <icon name="..."> to inline SVG with theme color
            if (node.tagName === 'icon') {
                var name_3 = (_b = (_a = node.properties) === null || _a === void 0 ? void 0 : _a.name) !== null && _b !== void 0 ? _b : '';
                var color = icon_color_map_1.ICON_COLOR_MAP[name_3];
                var style = color ? "color: ".concat(color, ";") : '';
                // The Apicize icon is a complex multi-gear logo; use the logo image
                if (name_3 === 'apicize') {
                    node.tagName = 'span';
                    node.properties = { className: ['help-icon', 'help-icon-apicize'] };
                    node.children = [{
                            type: 'raw',
                            value: "<img src=\"".concat(prefix, "images/logo.svg\" alt=\"Apicize\" class=\"icon-apicize\" />"),
                        }];
                }
                else {
                    var svg = iconSvgs[name_3];
                    if (svg) {
                        node.tagName = 'span';
                        node.properties = __assign({ className: ['help-icon'] }, (style ? { style: style } : {}));
                        node.children = [{
                                type: 'raw',
                                value: svg,
                            }];
                    }
                    else {
                        node.tagName = 'span';
                        node.properties = __assign({ className: ['help-icon'] }, (style ? { style: style } : {}));
                        node.children = [{ type: 'text', value: "[".concat(name_3, "]") }];
                    }
                }
            }
            // Transform <logo> to a simple heading with the app logo
            if (node.tagName === 'logo') {
                node.tagName = 'div';
                node.properties = { className: ['logo'] };
                node.children = [
                    {
                        type: 'element',
                        tagName: 'div',
                        properties: { className: ['logo-icon'] },
                        children: [{
                                type: 'raw',
                                value: "<img src=\"".concat(prefix, "images/logo.svg\" alt=\"Apicize\" width=\"200\" height=\"200\" />"),
                            }],
                    },
                    {
                        type: 'element',
                        tagName: 'div',
                        properties: { className: ['logo-header'] },
                        children: [
                            {
                                type: 'element',
                                tagName: 'h1',
                                properties: { className: ['logo-title'] },
                                children: [{ type: 'text', value: 'Apicize' }],
                            },
                            {
                                type: 'element',
                                tagName: 'h2',
                                properties: { className: ['logo-version'] },
                                children: [{ type: 'text', value: APP_VERSION }],
                            },
                        ],
                    },
                ];
            }
            // Remove <toolbar> and <toolbarTop> elements (app-only UI)
            if (node.tagName === 'toolbar' || node.tagName === 'toolbarTop') {
                if (parent && typeof index === 'number') {
                    parent.children.splice(index, 1);
                    return index; // revisit this index
                }
            }
            // Transform help: links to relative HTML links
            if (node.tagName === 'a' && ((_c = node.properties) === null || _c === void 0 ? void 0 : _c.href)) {
                var href = node.properties.href;
                if (href.startsWith('help:')) {
                    var topic = href.substring(5);
                    node.properties.href = "".concat(prefix).concat(topic, ".html");
                }
            }
            // Fix image paths to be relative to the doc root
            if (node.tagName === 'img' && ((_d = node.properties) === null || _d === void 0 ? void 0 : _d.src)) {
                var src = node.properties.src;
                if (src.startsWith('images/')) {
                    node.properties.src = "".concat(prefix).concat(src);
                }
            }
        });
    }; };
}
// ---------------------------------------------------------------------------
// Build the unified pipeline
// ---------------------------------------------------------------------------
var config = {
    appName: 'Apicize',
    appVersion: APP_VERSION,
    ctrlKey: 'Ctrl',
};
function convertMarkdown(markdown, prefix, iconSvgs) {
    return __awaiter(this, void 0, void 0, function () {
        var result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, (0, unified_1.unified)()
                        .use(remark_parse_1.default)
                        .use(remark_gfm_1.default)
                        .use(remark_directive_1.default)
                        .use((0, help_formatter_1.createRemarkApicizeDirectives)(config))
                        .use(remark_rehype_1.default, { allowDangerousHtml: true })
                        .use(rehypeStaticTransforms(prefix, iconSvgs))
                        .use(rehype_stringify_1.default, { allowDangerousHtml: true })
                        .process(markdown)];
                case 1:
                    result = _a.sent();
                    return [2 /*return*/, String(result)];
            }
        });
    });
}
// ---------------------------------------------------------------------------
// HTML template
// ---------------------------------------------------------------------------
function htmlTemplate(title, body, depth) {
    var prefix = depth > 0 ? '../'.repeat(depth) : './';
    return "<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n  <meta charset=\"UTF-8\" />\n  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\" />\n  <title>".concat(escapeHtml(title), " - Apicize Documentation</title>\n  <link rel=\"stylesheet\" href=\"").concat(prefix, "styles.css\" />\n</head>\n<body>\n  <div class=\"doc-layout\">\n    <nav class=\"doc-nav\">\n      <div class=\"nav-header\">\n        <a href=\"").concat(prefix, "home.html\"><img src=\"").concat(prefix, "images/logo.svg\" alt=\"Apicize\" /><span>Apicize Docs</span></a>\n      </div>\n      ").concat(buildNavHtml(contents, prefix), "\n    </nav>\n    <main class=\"doc-main help\">\n      ").concat(body, "\n    </main>\n  </div>\n</body>\n</html>");
}
function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
// ---------------------------------------------------------------------------
// Navigation HTML builder
// ---------------------------------------------------------------------------
function buildNavHtml(obj, prefix) {
    var html = '<ul>';
    for (var _i = 0, _a = Object.entries(obj); _i < _a.length; _i++) {
        var _b = _a[_i], name_4 = _b[0], value = _b[1];
        if (typeof value === 'string') {
            html += "<li><a href=\"".concat(prefix).concat(value, ".html\">").concat(escapeHtml(name_4), "</a></li>");
        }
        else {
            html += "<li><span class=\"nav-section\">".concat(escapeHtml(name_4), "</span>");
            html += buildNavHtml(value, prefix);
            html += '</li>';
        }
    }
    html += '</ul>';
    return html;
}
// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var artworkLogo, iconSvgs, _i, allTopics_1, topic, mdPath, markdown, titleMatch, title, depth, prefix, htmlBody, outPath;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log('Generating documentation...');
                    // Create output directories
                    (0, fs_1.mkdirSync)(DOCS_DIR, { recursive: true });
                    // Copy images
                    if ((0, fs_1.existsSync)(IMAGES_SRC)) {
                        (0, fs_1.cpSync)(IMAGES_SRC, IMAGES_DST, { recursive: true });
                        console.log('  Copied images/');
                    }
                    artworkLogo = (0, path_1.join)(ROOT, 'app', 'artwork', 'apicize-logo.svg');
                    if ((0, fs_1.existsSync)(artworkLogo)) {
                        (0, fs_1.cpSync)(artworkLogo, (0, path_1.join)(IMAGES_DST, 'logo.svg'));
                        console.log('  Replaced logo.svg with artwork version');
                    }
                    // Write CSS
                    (0, fs_1.writeFileSync)((0, path_1.join)(DOCS_DIR, 'styles.css'), generateCss());
                    console.log('  Generated styles.css');
                    iconSvgs = loadIconSvgs();
                    console.log("  Loaded ".concat(Object.keys(iconSvgs).length, " icon SVGs (").concat(Object.keys(CUSTOM_ICON_FILES).length, " custom, ").concat(Object.keys(MUI_ICON_FILES).length, " MUI)"));
                    _i = 0, allTopics_1 = allTopics;
                    _a.label = 1;
                case 1:
                    if (!(_i < allTopics_1.length)) return [3 /*break*/, 4];
                    topic = allTopics_1[_i];
                    mdPath = (0, path_1.join)(HELP_DIR, "".concat(topic, ".md"));
                    if (!(0, fs_1.existsSync)(mdPath)) {
                        console.warn("  WARNING: ".concat(topic, ".md not found, skipping"));
                        return [3 /*break*/, 3];
                    }
                    markdown = (0, fs_1.readFileSync)(mdPath, 'utf-8');
                    titleMatch = markdown.match(/^#\s+(.+?)(?:\s+:toolbar(?:-top)?)?$/m);
                    title = titleMatch
                        ? titleMatch[1].replace(/:icon\[\w[\w-]*\]/g, '').replace(/:logo/g, 'Apicize').trim()
                        : topic;
                    depth = topic.includes('/') ? topic.split('/').length - 1 : 0;
                    prefix = depth > 0 ? '../'.repeat(depth) : './';
                    return [4 /*yield*/, convertMarkdown(markdown, prefix, iconSvgs)];
                case 2:
                    htmlBody = _a.sent();
                    outPath = (0, path_1.join)(DOCS_DIR, "".concat(topic, ".html"));
                    (0, fs_1.mkdirSync)((0, path_1.dirname)(outPath), { recursive: true });
                    (0, fs_1.writeFileSync)(outPath, htmlTemplate(title, htmlBody, depth));
                    console.log("  Generated ".concat(topic, ".html"));
                    _a.label = 3;
                case 3:
                    _i++;
                    return [3 /*break*/, 1];
                case 4:
                    console.log('Documentation generation complete!');
                    console.log("Output: ".concat((0, path_1.relative)(ROOT, DOCS_DIR), "/"));
                    return [2 /*return*/];
            }
        });
    });
}
// ---------------------------------------------------------------------------
// CSS for static docs
// ---------------------------------------------------------------------------
function generateCss() {
    return "\n/* Apicize Documentation Styles */\n* { box-sizing: border-box; margin: 0; padding: 0; }\n\nbody {\n  font-family: \"Roboto Flex\", \"Roboto\", -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif;\n  background-color: #1a1a2e;\n  color: #e0e0e0;\n  line-height: 1.6;\n}\n\n.doc-layout {\n  display: flex;\n  min-height: 100vh;\n}\n\n/* Navigation sidebar */\n.doc-nav {\n  width: 280px;\n  min-width: 280px;\n  background-color: #16162a;\n  border-right: 1px solid #2a2a4a;\n  padding: 1em;\n  overflow-y: auto;\n  position: sticky;\n  top: 0;\n  height: 100vh;\n}\n\n.nav-header {\n  margin-bottom: 1.5em;\n  padding-bottom: 1em;\n  border-bottom: 1px solid #2a2a4a;\n}\n\n.nav-header a {\n  color: #fff;\n  text-decoration: none;\n  font-size: 1.1em;\n  font-weight: 600;\n  display: flex;\n  flex-direction: row;\n  flex-wrap: nowrap;\n  align-items: center;\n  gap: 0.5em;\n}\n\n.nav-header a img {\n  display: block;\n  flex-shrink: 0;\n  width: 32px;\n  height: 32px;\n  max-width: 32px;\n  max-height: 32px;\n}\n\n.nav-header a span {\n  flex: 1;\n  white-space: nowrap;\n}\n\n.doc-nav ul {\n  list-style: none;\n  padding-left: 0;\n}\n\n.doc-nav ul ul {\n  padding-left: 1.2em;\n}\n\n.doc-nav li {\n  margin: 0.2em 0;\n}\n\n.doc-nav ul a {\n  color: #a0a0d0;\n  text-decoration: none;\n  display: block;\n  padding: 0.25em 0.5em;\n  border-radius: 4px;\n  font-size: 0.9em;\n}\n\n.doc-nav ul a:hover {\n  color: #fff;\n  background-color: rgba(255,255,255,0.08);\n}\n\n.nav-section {\n  display: block;\n  color: #c0c0e0;\n  font-weight: 600;\n  font-size: 0.9em;\n  padding: 0.5em 0.5em 0.2em;\n  margin-top: 0.5em;\n}\n\n/* Main content */\n.doc-main {\n  flex: 1;\n  padding: 2em 3em;\n  max-width: 900px;\n  overflow-y: auto;\n}\n\n.help {\n  color: #e0e0e0;\n}\n\n.help h1 {\n  font-size: 1.8em;\n  margin: 1.5rem 0 1rem 0;\n  color: #fff;\n  display: flex;\n  align-items: center;\n  gap: 0.3em;\n}\n\n.help h1:first-child {\n  margin-top: 0;\n}\n\n.help h2 {\n  font-size: 1.4em;\n  margin: 1.5rem 0 0.75rem 0;\n  color: #e8e8ff;\n  display: flex;\n  align-items: center;\n  gap: 0.3em;\n}\n\n.help h3 {\n  font-size: 1.15em;\n  margin: 1.2rem 0 0.5rem 0;\n  color: #d0d0f0;\n  display: flex;\n  align-items: center;\n  gap: 0.3em;\n}\n\n.help h4, .help h5, .help h6 {\n  margin: 1rem 0 0.5rem 0;\n}\n\n.help p {\n  margin: 0 0 0.75rem 0;\n}\n\n.help a {\n  color: #7b9ff0;\n  text-decoration: none;\n}\n\n.help a:hover {\n  text-decoration: underline;\n  color: #9bb8ff;\n}\n\n.help ul, .help ol {\n  margin: 0 0 0.75rem 1.5em;\n}\n\n.help li {\n  margin: 0.25em 0;\n}\n\n.help blockquote {\n  margin: 1em 0;\n  padding: 1em;\n  background-color: #3a3886;\n  border-radius: 4px;\n}\n\n.help blockquote p {\n  margin: 0;\n}\n\n.help pre {\n  background-color: #0d0d1a;\n  padding: 1em;\n  border-radius: 4px;\n  overflow-x: auto;\n  margin: 0 0 0.75rem 0;\n  font-family: \"Roboto Mono\", monospace;\n  font-size: 0.9em;\n}\n\n.help code {\n  font-family: \"Roboto Mono\", monospace;\n  font-size: 0.9em;\n  background-color: rgba(255,255,255,0.08);\n  padding: 0.1em 0.3em;\n  border-radius: 3px;\n}\n\n.help pre code {\n  background: none;\n  padding: 0;\n}\n\n.help table {\n  border-collapse: collapse;\n  margin: 0 0 0.75rem 0;\n  width: 100%;\n}\n\n.help thead {\n  border-bottom: 2px solid #4a4a7a;\n}\n\n.help td, .help th {\n  padding: 0.5em 0.75em;\n  text-align: left;\n}\n\n.help th {\n  font-weight: 600;\n  color: #c0c0e0;\n}\n\n.help img, .help .help-image {\n  max-width: 80%;\n  margin: 1em 0;\n  border-radius: 4px;\n}\n\n/* Icon styles */\n.help-icon {\n  display: inline-flex;\n  align-items: center;\n  vertical-align: middle;\n  margin-right: 0.3em;\n}\n\n.help-icon svg {\n  width: 1.2em;\n  height: 1.2em;\n  vertical-align: middle;\n}\n\n.help-icon .icon-apicize {\n  width: 1.4em;\n  height: 1.4em;\n  vertical-align: middle;\n}\n\n/* Logo styles - reset parent h1 margin when it wraps .logo */\nh1:has(.logo) {\n  margin: 0;\n}\n\n.logo {\n  display: flex;\n  align-items: center;\n  margin: 0 0 1em 0;\n  gap: 1.5em;\n}\n\n.logo-icon img {\n  display: block;\n}\n\n.logo-header .logo-title {\n  font-size: 3em;\n  margin: 0;\n  line-height: 1.2;\n}\n\n.logo-header .logo-version {\n  font-size: 1.2em;\n  margin: 0;\n  color: #a0a0d0;\n  font-weight: normal;\n}\n\n/* Responsive */\n@media (max-width: 768px) {\n  .doc-layout { flex-direction: column; }\n  .doc-nav {\n    width: 100%;\n    min-width: 100%;\n    height: auto;\n    position: static;\n    border-right: none;\n    border-bottom: 1px solid #2a2a4a;\n  }\n  .doc-main { padding: 1.5em; }\n}\n";
}
main().catch(function (err) {
    console.error('Error generating documentation:', err);
    process.exit(1);
});
