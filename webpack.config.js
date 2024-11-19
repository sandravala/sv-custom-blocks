const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const glob = require('glob');

// Dynamically find all block directories in the src/blocks folder
const blocks = glob.sync('./src/blocks/*/index.js').reduce((entries, blockPath) => {
    const blockName = blockPath.split('/')[3]; // Extract block name from path
    entries[`blocks/${blockName}/index`] = blockPath; // Add entry for index.js
    const viewPath = blockPath.replace('index.js', 'view.js');
    if (glob.sync(viewPath).length > 0) {
        entries[`blocks/${blockName}/view`] = viewPath; // Add entry for view.js if it exists
    }
    return entries;
}, {});

module.exports = {
    entry: blocks,
    output: {
        path: path.resolve(__dirname, 'build'),
        filename: '[name].js',
    },
    externals: {
        '@wordpress/i18n': ['wp', 'i18n'],
        '@wordpress/blocks': ['wp', 'blocks'],
        '@wordpress/block-editor': ['wp', 'blockEditor'],
        '@wordpress/components': ['wp', 'components'],
        '@wordpress/element': ['wp', 'element'],
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: ['@babel/preset-env', '@babel/preset-react'],
                    },
                },
            },
            {
                test: /\.scss$/,
                use: [MiniCssExtractPlugin.loader, 'css-loader', 'sass-loader'],
            },
        ],
    },
    plugins: [
        new MiniCssExtractPlugin({
            filename: '[name].css', // Separate CSS files for each block
        }),
        new CopyWebpackPlugin({
            patterns: [
                // Dynamically copy all files and subfolders from src/blocks
                {
                    from: path.resolve(__dirname, 'src/blocks/planner-personality-quiz'),
                    to: 'blocks/planner-personality-quiz',
                    globOptions: {
                        ignore: ['**/*.js', '**/*.scss'], // Exclude files that Webpack already processes
                    },
                },
            ],
        }),
    ],
    resolve: {
        extensions: ['.js', '.scss'],
    },
    mode: 'production',
};
