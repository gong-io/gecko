var webpack = require('webpack')
const path = require('path')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const Dotenv = require('dotenv-webpack');

module.exports = {
    devtool: 'eval-source-map',
    context: __dirname,
    entry: "./app/app.js",
    output: {
        path: path.resolve(__dirname, 'build'),
        filename: "gecko.js"
    },
    resolve: {
        alias: {
            '@': path.join(__dirname, 'app'),
        },
        fallback: {
            "stream": require.resolve("stream-browserify"),
            // "fs": false,
            // "tls": false,
            // "net": false,
            // "path": false,
            // "zlib": false,
            // "http": false,
            // "https": false,
            // "stream": false,
            // "crypto": false,
        }
    },
    devServer: {
        contentBase: 'build/', // Relative directory for base of server
        inline: true,
        port: 4000, // Port Number
        host: 'localhost', // Change to '0.0.0.0' for external facing server
        historyApiFallback: true,
        disableHostCheck: true
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                use: [
                    {
                        loader: 'babel-loader',
                        options: {
                            cacheDirectory: true,
                        },
                    }
                ]
            },
            {
                test: /\.css$/,
                use: [
                    {
                        loader: MiniCssExtractPlugin.loader,
                    },
                    'css-loader',
                ],
            },
            {
                test: /soundtouch\.js$/,
                use: [
                    {
                        loader: "imports-loader?this=>window"
                    }
                ]
                //loader: "imports-loader?this=>window"
            },
            {
                test: /\.woff2?(\?v=[0-9]\.[0-9]\.[0-9])?$/,
                use: 'url-loader?limit=10000',
            },
            {
                test: /\.(ttf|eot|svg)(\?[\s\S]+)?$/,
                use: [
                    {
                        loader: 'file-loader',
                        options: {
                            esModule: false,
                        },
                    }
                ]

            },
            {
                test: /\.(jpe?g|png|gif)$/i,
                use: [
                    {
                        loader: 'file-loader?name=images/[name].[ext]',
                        options: {
                            esModule: false,
                        },
                    },
                ]
            },
            {
                test: /\.ctm$/i,
                use: 'raw-loader',
              }
        ]
    },
    plugins: [
        new MiniCssExtractPlugin({
            filename: 'gecko.css'
        }),
        new HtmlWebpackPlugin({
            filename: 'index.html',
            template: './static/index.html'
        }),
        new Dotenv()
    ]
}