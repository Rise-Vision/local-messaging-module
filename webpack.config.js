const CleanWebpackPlugin = require("clean-webpack-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const MinifyPlugin = require("babel-minify-webpack-plugin");
const path = require("path");
const UnzipsfxPlugin = require("unzipsfx-webpack-plugin");
const ZipPlugin = require("zip-webpack-plugin");

module.exports = {
  entry: "./src/index.js",
  target: "node",
  node: false,
  externals: (context, request, callback)=>{
    if (request.match(/^primus$|^original-fs$|^electron$/)) {
      return callback(null, `commonjs ${request}`);
    }
    callback();
  },
  output: {
    path: path.join(__dirname, "build", "local-messaging"),
    filename: "index.js"
  },
  plugins: [
    new CleanWebpackPlugin(["build"]),
    new CopyWebpackPlugin([
      {from: "package.json"},
      {from: "node_modules/primus/dist/primus.js", to: "dist"},
      {from: "primus_node_modules", to: "node_modules"}
    ]),
    new MinifyPlugin(),
    new ZipPlugin({
      path: path.join(__dirname, "build"),
      filename: "local-messaging"
    }),
    new UnzipsfxPlugin({
      outputPath: path.join(__dirname, "build"),
      outputFilename: "local-messaging"
    })
  ],
  stats: {
    all: true,
    maxModules: 5,
    exclude: "",
    excludeModules: "",
    excludeAssets: "",
    warningsFilter: [
      /bq-controller[\s\S]*dependency is an expression/,
      /create-server/,
      /transformers\/sockjs/,
      /transformers\/faye/,
      /primus\/index.js[\s\S]*dependency is an expression/,
      /utf-8-validate/,
      /primus\/index.js[\s\S]*require.*in a way.*cannot.*statically extracted/
    ]
  }
};
