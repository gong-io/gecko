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
    filename: "bundle.js"
  },
  devServer: {
    contentBase: 'build/', // Relative directory for base of server
    publicPath: '/', // Live-reload
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
        loader: 'babel-loader',
        query: {
          presets: ['es2015']
        }
      },
      {
        test: /\.css$/,
        use: [
          {
            loader: MiniCssExtractPlugin.loader,
            options: {
              // you can specify a publicPath here
              // by default it uses publicPath in webpackOptions.output
              hmr: process.env.NODE_ENV === 'development',
            },
          },
          'css-loader',
        ],
      },
      {
        test: /soundtouch\.js$/,
        loader: "imports-loader?this=>window"
      },
      {
        test: /\.woff2?(\?v=[0-9]\.[0-9]\.[0-9])?$/,
        use: 'url-loader?limit=10000',
      },
      {
        test: /\.(ttf|eot|svg)(\?[\s\S]+)?$/,
        use: 'file-loader',
      },
      {
        test: /\.(jpe?g|png|gif)$/i,
        use: [
          'file-loader?name=images/[name].[ext]'
        ]
      }
    ]
  },
  plugins: [
    new MiniCssExtractPlugin({
      filename: 'bundle.css'
    }),
    new HtmlWebpackPlugin({
      filename: 'index.html',
      template: './static/index.html'
    }),
    new Dotenv()
  ]
}