const path = require("path");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const ComponentsListPlugin = require("./webpack-components-plugin");
const glob = require("glob");

// // Dynamically find all block directories in the src/blocks folder
// const blocks = glob
// 	.sync("./src/blocks/*/index.js")
// 	.reduce((entries, blockPath) => {
// 		const blockName = blockPath.split("/")[3]; // Extract block name from path
// 		entries[`blocks/${blockName}/index`] = blockPath; // Add entry for index.js
// 		const viewPath = blockPath.replace("index.js", "view.js");
// 		if (glob.sync(viewPath).length > 0) {
// 			entries[`blocks/${blockName}/view`] = viewPath; // Add entry for view.js if it exists
// 		}
// 		return entries;
// 	}, {});

// Only process actual blocks, exclude components
const blocks = glob
	.sync("./src/blocks/*/index.js")
	.reduce((entries, blockPath) => {
		const blockName = blockPath.split("/")[3];
		entries[`blocks/${blockName}/index`] = blockPath;
		const viewPath = blockPath.replace("index.js", "view.js");
		if (glob.sync(viewPath).length > 0) {
			entries[`blocks/${blockName}/view`] = viewPath;
		}
		return entries;
	}, {});

module.exports = {
	entry: blocks,
	output: {
		path: path.resolve(__dirname, "build"),
		filename: "[name].js",
	},
	externals: {
		"@wordpress/i18n": ["wp", "i18n"],
		"@wordpress/blocks": ["wp", "blocks"],
		"@wordpress/block-editor": ["wp", "blockEditor"],
		"@wordpress/components": ["wp", "components"],
		"@wordpress/element": ["wp", "element"],
	},
	watchOptions: {
		ignored: [
			path.resolve(__dirname, "node_modules"),
			path.resolve(
				__dirname,
				"src/blocks/smart-goal-generator/components-index.js",
			),
		],
	},
	module: {
		rules: [
			{
				test: /\.js$/,
				exclude: /node_modules/,
				use: {
					loader: "babel-loader",
					options: {
						presets: ["@babel/preset-env", "@babel/preset-react"],
					},
				},
			},
			{
				test: /\.scss$/,
				use: [MiniCssExtractPlugin.loader, "css-loader", "sass-loader"],
			},
			{
				test: /\.(png|jpe?g|gif|webp|svg)$/i,
				use: [
					{
						loader: "file-loader",
						options: {
							name: "blocks/[path][name].[ext]",
							context: "src/blocks", // Removes 'src/blocks' from the path
							publicPath: "/wp-content/plugins/sv-custom-blocks/build/",
						},
					},
				],
			},
		],
	},
	plugins: [
		new MiniCssExtractPlugin({
			filename: "[name].css", // Separate CSS files for each block
		}),
		new CopyWebpackPlugin({
			patterns: [
				// Dynamically copy all files and subfolders from src/blocks
				{
					from: path.resolve(__dirname, "src/blocks"),
					to: "blocks",
					globOptions: {
						ignore: ["**/*.js", "**/*.scss"], // Exclude files that Webpack already processes
					},
				},
			],
		}),
		new ComponentsListPlugin(),
	],
	resolve: {
		extensions: [".js", ".scss"],
		alias: {
			"@components": path.resolve(__dirname, "src/components"),
			"@common": path.resolve(__dirname, "src/components/common"),
		},
	},
	watchOptions: {
		ignored: /node_modules/,
		aggregateTimeout: 300,
		poll: 1000,
	},
	mode: "development",
	devtool: "source-map", // Include source maps for easier debugging
	optimization: {
		minimize: false, // Disable minification for testing
	},
};
