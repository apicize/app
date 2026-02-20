"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var config_1 = require("vitest/config");
var path_1 = require("path");
exports.default = (0, config_1.defineConfig)({
    test: {
        globals: true,
        environment: 'node',
        typecheck: {
            tsconfig: path_1.default.resolve(__dirname, '__tests__/tsconfig.json'),
        },
    },
    resolve: {
        alias: {
            '@apicize/lib-typescript': path_1.default.resolve(__dirname, '../lib-typescript/src'),
        },
    },
});
