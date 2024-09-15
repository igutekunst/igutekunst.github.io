const sass = require('sass');
const postcss = require('postcss');
const autoprefixer = require('autoprefixer');
const cssnano = require('cssnano');
const fs = require('fs');
const rollup = require('rollup');
const { nodeResolve } = require('@rollup/plugin-node-resolve');
const commonjs = require('@rollup/plugin-commonjs');
const terser = require('@rollup/plugin-terser');
// Add these new imports
const { PurgeCSS } = require('purgecss');
const glob = require('glob');

// Compile Sass and combine CSS files
async function buildCSS() {
  const sassResult = sass.compile('src/custom.scss', {
    outputStyle: 'compressed'
  });

  const sunburstCSS = fs.readFileSync('src/sunburst.css', 'utf8');
  const pygmentsNativeCSS = fs.readFileSync('src/pygments-native.css', 'utf8');

  const combinedCSS = sassResult.css + sunburstCSS + pygmentsNativeCSS;

  // Process CSS with PostCSS
  const result = await postcss([autoprefixer, cssnano])
    .process(combinedCSS, { from: undefined });

  fs.writeFileSync('build/bundle.full.css', result.css);
  if (result.map) {
    fs.writeFileSync('build/bundle.full.css.map', result.map.toString());
  }
}

// Modify buildJS function to include tree shaking
async function buildJS() {
  const bundle = await rollup.rollup({
    input: 'src/custom.js',
    plugins: [
      nodeResolve(),
      commonjs(),
      terser({
        compress: {
          dead_code: true,
          drop_debugger: true,
          conditionals: true,
          evaluate: true,
          booleans: true,
          loops: true,
          unused: true,
          hoist_funs: true,
          keep_fargs: false,
          hoist_vars: true,
          if_return: true,
          join_vars: true,
          side_effects: true,
          warnings: false
        },
        mangle: true,
        output: {
          comments: false
        }
      })
    ]
  });

  await bundle.write({
    file: 'build/bundle.js',
    format: 'iife',
    sourcemap: true
  });
}

// Add new function to purge CSS
async function purgeCSS() {
  const purgeCSSResult = await new PurgeCSS().purge({
    content: ['../../output/**/*.html'],
    css: ['build/bundle.full.css'],
    safelist: ['bg-dark', 'bg-light', 'bg-primary', 'bg-secondary', 'bg-success', 'bg-danger', 'bg-warning', 'bg-info', 'bg-light', 'bg-dark']
  });

  fs.writeFileSync('build/bundle.css', purgeCSSResult[0].css);
}

// Ensure build directory exists
if (!fs.existsSync('build')) {
  fs.mkdirSync('build');
}

// Modify build function to include purgeCSS
async function build() {
  await buildCSS();
  await buildJS();
  await purgeCSS();
  console.log('Build complete.');
}

build();