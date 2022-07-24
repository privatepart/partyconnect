const webpack = require('webpack');
const TerserPlugin = require('terser-webpack-plugin');
module.exports = {
  entry: "./index.js",
  mode: 'production',
  output: {
    filename: 'partyconnect.js',
    library: 'Privateparty',
  },
  plugins: [
    new webpack.ProvidePlugin({
      process: 'process/browser',
      Buffer: ['buffer', 'Buffer'],
    }),
  ],
//  plugins: [
//    new webpack.DefinePlugin({ 'process.env.NODE_DEBUG': false })
//  ],
  resolve: {
    extensions: [ '.ts', '.js' ],
    fallback: {
      "http": require.resolve("stream-http"),
      "https": require.resolve("https-browserify"),
      "crypto": require.resolve("crypto-browserify"),
      "os": require.resolve("os-browserify/browser"),
      "stream": require.resolve("stream-browserify"),
    }
  },
  optimization: {
    minimizer: [
      (compiler) => {
        const TerserPlugin = require('terser-webpack-plugin');
        new TerserPlugin({
          terserOptions: {
            compress: {},
          }
        }).apply(compiler);
      },
    ]
  },
};
