import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import autoExternal from 'rollup-plugin-auto-external';
import pkg from './package.json';

export default [
  {
    input: pkg.module,
    output: {
      name: 'flowzilla',
      file: pkg.browser,
      format: 'umd'
    },
    plugins: [
      resolve({ browser: true }), // so Rollup can find `ms`
      commonjs() // so Rollup can convert `ms` to an ES module
    ]
  },
  {
    input: pkg.module,
    output: [{ file: pkg.main, format: 'cjs' }],
    plugins: [autoExternal()]
  }
];
