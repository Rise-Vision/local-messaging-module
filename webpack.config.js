const CopyWebpackPlugin = require('copy-webpack-plugin');
const MinifyPlugin = require("babel-minify-webpack-plugin");
const nodeExternals = require('webpack-node-externals');
const path = require("path");
const UnzipsfxPlugin = require("unzipsfx-webpack-plugin");
const ZipPlugin = require("zip-webpack-plugin");

function getVersion(date) {
  let day = ("0" + date.getDate()).slice(-2),
    month = ("0" + (date.getMonth() + 1)).slice(-2),
    year = date.getFullYear(),
    hour = date.getHours(),
    minute = date.getMinutes();

  return `${year}.${month}.${day}.${hour}.${minute}`;
}

module.exports = {
  entry: "./src/index.js",
  target: "node",
  externals: [nodeExternals()],
  output: {
    path: path.join(__dirname, "build", "local-messaging", getVersion(new Date())),
    filename: "index.js"
  },
  plugins: [
    new CopyWebpackPlugin([{from: "./build-temp/node_modules", to: 'node_modules'}]),
    new MinifyPlugin(),
    new ZipPlugin({
      path: path.join(__dirname, "build"),
      filename: "local-messaging",
    }),
    new UnzipsfxPlugin({
      outputPath: path.join(__dirname, "build"),
      outputFilename: "local-messaging",
    })
  ]
};