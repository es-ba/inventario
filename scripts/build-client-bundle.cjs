const webpack = require('webpack');
const config = require('../webpack.config.cjs');

webpack(config, (error, stats) => {
    if (error) {
        console.error(error);
        process.exitCode = 1;
        return;
    }
    const output = stats.toString({
        all: false,
        assets: true,
        colors: true,
        errors: true,
        timings: true,
        warnings: true,
    });
    if (output) {
        console.log(output);
    }
    if (stats.hasErrors()) {
        process.exitCode = 1;
    }
});
