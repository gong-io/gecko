var webpack = require('webpack')

module.exports = {
  devtool: 'inline-sourcemap',
  context: __dirname,
  entry: "./app/app.js",
  output: {
    path: __dirname + "/dist/js",
    publicPath: '/js',
    filename: "bundle.js"
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
        use: ['style-loader', 'css-loader']
      },
      {
        test: /soundtouch\.js$/,
        loader: "imports-loader?this=>window"
      }
    ]
  }
}