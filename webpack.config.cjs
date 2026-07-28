const path = require('node:path');

module.exports = {
    mode: 'production',
    entry: path.resolve(__dirname, 'src/client/ws-principal.tsx'),
    output: {
        path: path.resolve(__dirname, 'dist/client/client'),
        filename: 'ws-principal.js',
        clean: false,
    },
    devtool: 'source-map',
    externals: {
        react: 'React',
        'react-dom': 'ReactDOM',
        'react-dom/client': 'ReactDOM',
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                exclude: /node_modules/,
                use: {
                    loader: 'ts-loader',
                    options: {
                        configFile: path.resolve(__dirname, 'tsconfig-client.json'),
                        transpileOnly: true,
                        compilerOptions: {
                            module: 'esnext',
                        },
                    },
                },
            },
        ],
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.js'],
    },
    performance: {
        hints: false,
    },
};
