const path = require("path");

const MiniCssExtractPlugin = require("mini-css-extract-plugin");

const { devServer, Env, stats } = require("./constants");
const getPluginsByEnv = require("./plugins");

module.exports = ({ analyze, env } = {}) => ({
    devtool: env !== Env.PRODUCTION && "source-map",
    devServer: {
        contentBase: path.resolve(__dirname, "..", "dist", "renderer"),
        disableHostCheck: true,
        host: devServer.host,
        port: devServer.port,
        stats,
    },
    entry: {
        app: path.resolve("src", "renderer", "index.tsx"),
    },
    mode: env === Env.PRODUCTION ? "production" : "development",
    module: {
        rules: [
            {
                test: /\.(j|t)sx?/,
                exclude: /node_modules/,
                use: [
                    {
                        loader: "babel-loader",
                        options: {
                            extends: path.resolve(__dirname, "..", "..", "..", "babel.config.json"),
                            presets: [
                                [
                                    "@babel/preset-env",
                                    {
                                        targets: {
                                            electron: "12.0.0",
                                        },
                                    },
                                ],
                            ],
                        },
                    },
                ],
            },

            // This rule processes any CSS written for this project.
            // It applies PostCSS plugins and converts it to CSS Modules
            {
                test: /\.css/,
                exclude: /node_modules/,
                use: [
                    {
                        loader: MiniCssExtractPlugin.loader,
                    },
                    {
                        loader: "css-loader",
                        options: {
                            importLoaders: 1,
                            localsConvention: "camelCase",
                            modules: {
                                localIdentName: "[name]__[local]--[hash:base64:5]",
                            },
                            sourceMap: env !== Env.PRODUCTION,
                        },
                    },
                    {
                        loader: "postcss-loader",
                        options: {
                            ident: "postcss",
                            plugins: [
                                require("postcss-flexbugs-fixes"),
                                require("postcss-preset-env")({
                                    autoprefixer: {
                                        flexbox: "no-2009",
                                    },
                                }),
                            ],
                            sourceMap: env !== Env.PRODUCTION,
                        },
                    },
                ],
            },

            // this rule will handle any vanilla CSS imports out of node_modules; it does not apply PostCSS,
            // nor does it convert the imported css to CSS Modules
            // use case: importing antd component css
            {
                test: (filepath) => filepath.endsWith(".css"),
                include: /node_modules/,
                use: [{ loader: MiniCssExtractPlugin.loader }, { loader: "css-loader" }],
            },
        ],
    },
    output: {
        path: path.resolve(__dirname, "..", "dist", "renderer"),
        filename: "[name].[chunkhash].js",
    },
    plugins: getPluginsByEnv(env, analyze),
    resolve: {
        extensions: [".ts", ".tsx", ".js", ".jsx", ".json"],
        mainFields: ["module", "main"],
        symlinks: false,
    },
    stats: analyze ? "none" : stats,
    target: "electron-renderer",
});
