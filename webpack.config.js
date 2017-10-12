const CleanWebpackPlugin = require('clean-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const MinifyPlugin = require("babel-minify-webpack-plugin");
const nodeExternals = require('webpack-node-externals');
const path = require("path");
const pkg = require("./package.json");
const UnzipsfxPlugin = require("unzipsfx-webpack-plugin");
const ZipPlugin = require("zip-webpack-plugin");

module.exports = {
  entry: "./src/index.js",
  target: "node",
  externals: [nodeExternals()],
  output: {
    path: path.join(__dirname, "dist", "local-messaging-module", pkg.version),
    filename: "index.js"
  },
  plugins: [
    new CleanWebpackPlugin(["dist"], {verbose:  true}),
    new CopyWebpackPlugin([{from: "./temp/node_modules", to: 'node_modules'}]),
    new MinifyPlugin(),
    new ZipPlugin({
      path: path.join(__dirname, "dist"),
      filename: "local-messaging-module",
    }),
    new UnzipsfxPlugin({
      outputPath: path.join(__dirname, "dist"),
      outputFilename: "local-messaging-module",
    })
  ]
};