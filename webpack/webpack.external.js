const merge = require('webpack-merge');
const path = require('path')
const common = require('./webpack.common.js');

module.exports = merge(common, {
    output: {
        path: path.resolve(__dirname, '../build_external'),
        filename: "gecko.js",
        publicPath: '/static/'
    },
    devServer: {
      contentBase: 'build_external/', // Relative directory for base of server
      inline: true,
      port: 4000, // Port Number
      host: 'localhost', // Change to '0.0.0.0' for external facing server
      historyApiFallback: true,
      disableHostCheck: true
    },
  });