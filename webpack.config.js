const path = require('path');

module.exports = {
    devtool:'source-map',
    mode: 'development',
    entry: {
        client: './dist/client/index.js',
        //unlogged:'./dist/unlogged/unlogged.js',
    },
    output: {
        filename: '[name]/[name]-bundle.js',
        path: path.resolve(__dirname, 'dist')
    },
    module: {
        rules: [
            {
                test: /\.(js|jsx)$/,
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: ['@babel/preset-env', '@babel/preset-react']
                    }
                }
            }
        ]
    }
};