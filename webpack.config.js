var path = require("path");
var cp = require("child_process");
var HtmlWebpackPlugin = require("html-webpack-plugin");

// copy-webpack-plugin for some reason copies the path structure too
// like, copying `public/fx` will output `dist/public/fx` which is nonsensical
cp.execSync("mkdir dist");
cp.execSync("cp -r public/fx/ dist");

module.exports = {
    entry: "./src/index.ts",
    output: {
        path: path.resolve(__dirname, "dist"),
        filename: "index.js",
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: "./public/index.html",
        }),
    ],
    resolve: {
        extensions: [".ts", ".js"],
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                exclude: /node_modules/,
                loaders: ["ts-loader"],
            },
        ],
    },
};
