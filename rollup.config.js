import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import autoExternal from 'rollup-plugin-auto-external';
import typescript from 'rollup-plugin-typescript';
import pkg from './package.json';

export default [
  {
    input: 'src/index.ts',
    output: {
      name: 'serviceDog',
      file: pkg.browser,
      format: 'umd'
    },
    plugins: [
      typescript({}),
      resolve(), // so Rollup can find `ms`
      commonjs() // so Rollup can convert `ms` to an ES module
    ]
  },
  {
    input: 'src/index.ts',
    output: [{ file: pkg.main, format: 'cjs' }],
    plugins: [typescript({}), autoExternal()]
  }
];
