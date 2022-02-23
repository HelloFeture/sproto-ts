const { series, task } = require('gulp');
const rollup = require('rollup');
const typescript = require('@rollup/plugin-typescript');
const commonjs = require('rollup-plugin-commonjs');
const resolve = require('rollup-plugin-node-resolve');
const {uglify} = require('rollup-plugin-uglify');


async function iife() {
    const bundle = await rollup.rollup({
        input: './src/index.ts',
        plugins: [
            typescript({
                tsconfig: "tsconfig.json",
            }),
            commonjs(),
            resolve(),
        ],
    });

    await bundle.write({
        file: "./dist/iife/sproto.js",
        format: 'iife',
        name: 'sproto',
        sourcemap: true
    });
}

async function iife_min() {
    const bundle = await rollup.rollup({
        input: './src/index.ts',
        plugins: [
            typescript({
                tsconfig: "tsconfig.json",
            }),
            commonjs(),
            resolve(),
            uglify(),
        ],
    });

    await bundle.write({
        file: "./dist/iife/sproto.min.js",
        format: 'iife',
        name: 'sproto',
        sourcemap: true
    });
}

async function cjs() {
    const bundle = await rollup.rollup({
        input: './src/index.ts',
        plugins: [
            typescript({
                tsconfig: "tsconfig.json",
            }),
            commonjs(),
            resolve(),
        ],
    });

    await bundle.write({
        file: "./dist/cjs/sproto.js",
        format: 'cjs',
        name: 'sproto',
        sourcemap: true
    });
}



exports.default = series(iife, iife_min, cjs)
