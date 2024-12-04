const config = require('./webpack.config');

config.mode = 'development';
config.optimization.minimize = false;
config.devtool = 'source-map';

module.exports = config;