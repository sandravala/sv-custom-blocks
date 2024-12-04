const config = require('./webpack.config');

config.mode = 'production';
config.optimization.minimize = true;

module.exports = config;