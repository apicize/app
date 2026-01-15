import * as path from "path"
import { CleanWebpackPlugin } from "clean-webpack-plugin"
import HtmlWebpackPlugin from "html-webpack-plugin"
import TerserPlugin from "terser-webpack-plugin"
import { outputConfig, entryConfig, terserPluginConfig } from "./env.config.js"
import { fileURLToPath } from 'url';
import MonacoWebpackPlugin from 'monaco-editor-webpack-plugin'

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default (env, options) => {
    {
        return {
            mode: options.mode,
            entry: entryConfig,
            module: {
                rules: [
                    {
                        resourceQuery: /raw/,
                        type: 'asset/source',
                    },
                    {
                        test: /\.tsx?$/,
                        use: "ts-loader",
                        exclude: /node_modules|.d\.ts$|__tests__/,
                    },
                    {
                        test: /\.css$/i,
                        use: ["style-loader", "css-loader"],
                    },
                ],
            },
            resolve: {
                extensions: [".tsx", ".ts", ".js"],
                fallback: {
                    "stream": false,
                    "timers": false,
                    "url": false
                }
            },
            output: {
                filename: "js/[name].bundle.js",
                path: path.resolve(__dirname, outputConfig.destPath),
                publicPath: "",
            },
            optimization: {
                minimizer: [
                    new TerserPlugin(terserPluginConfig)
                ],
                splitChunks: {
                    chunks: "all",
                },
            },
            plugins: [
                new MonacoWebpackPlugin({
                    // available options are documented at https://github.com/microsoft/monaco-editor/blob/main/webpack-plugin/README.md#options
                    languages: ['json', 'javascript', 'typescript', 'css', 'xml', 'html']
                }),
                new CleanWebpackPlugin(),
                new HtmlWebpackPlugin({
                    template: "./src/index.html",
                    inject: true,
                    minify: false
                }),
            ]
        };
    }
}