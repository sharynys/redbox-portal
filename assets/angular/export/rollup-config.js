import nodeResolve from 'rollup-plugin-node-resolve'
import commonjs    from 'rollup-plugin-commonjs';

export default {
  entry: './main.js',
  dest: './dist-bundle.js', // output a single application bundle
  sourceMap: false,
  format: 'iife',
  onwarn: function(warning) {
    // Skip certain warnings

    // should intercept ... but doesn't in some rollup versions
    if ( warning.code === 'THIS_IS_UNDEFINED' ) { return; }

    // console.warn everything else
    console.warn( warning.message );
  },
  plugins: [
      nodeResolve({jsnext: true, module: true}),
      commonjs({
        include: ['../../../node_modules/**']
      })
  ]
}
