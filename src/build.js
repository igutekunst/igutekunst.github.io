const sass = require('sass');
const postcss = require('postcss');
const autoprefixer = require('autoprefixer');
const cssnano = require('cssnano');
const purgecss = require('@fullhuman/postcss-purgecss');
const fs = require('fs');
const rollup = require('rollup');
const { nodeResolve } = require('@rollup/plugin-node-resolve');
const commonjs = require('@rollup/plugin-commonjs');
const terser = require('@rollup/plugin-terser');
const path = require('path');

// Compile Sass and combine CSS files
async function buildCSS() {
  const sassResult = sass.compile('src/custom.scss', {
    outputStyle: 'compressed'
  });

  const sunburstCSS = fs.readFileSync('src/sunburst.css', 'utf8');
  const pygmentsNativeCSS = fs.readFileSync('src/pygments-native.css', 'utf8');

  const combinedCSS = sassResult.css + sunburstCSS + pygmentsNativeCSS;

  // Get all HTML files in the output directory and its subdirectories
  function getAllHtmlFiles(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    
    list.forEach(file => {
      file = path.join(dir, file);
      const stat = fs.statSync(file);
      
      if (stat && stat.isDirectory()) {
        // Recurse into subdirectory
        results = results.concat(getAllHtmlFiles(file));
      } else if (path.extname(file) === '.html') {
        results.push(file);
      }
    });
    
    return results;
  }

  const htmlFiles = getAllHtmlFiles('../../output');
  const content = htmlFiles.map(file => fs.readFileSync(file, 'utf8')).join('');

  // Process CSS with PostCSS and remove unused CSS
  const result = await postcss([
    autoprefixer,
    cssnano,
    purgecss({
      content: [{ raw: content, extension: 'html' }],
      defaultExtractor: content => content.match(/[A-Za-z0-9-_:/]+/g) || [],
      safelist: {
        standard: ['codehilite'],
        deep: [/^codehilite$/]
      }
    })
  ]).process(combinedCSS, { from: undefined });

  fs.writeFileSync('build/bundle.css', result.css);
  if (result.map) {
    fs.writeFileSync('build/bundle.css.map', result.map.toString());
  }
}

// Bundle and minify JavaScript
async function buildJS() {
  const bundle = await rollup.rollup({
    input: 'src/custom.js',
    plugins: [
      nodeResolve(),
      commonjs(),
      terser()
    ]
  });

  await bundle.write({
    file: 'build/bundle.js',
    format: 'iife',
    sourcemap: true
  });
}

// Ensure build directory exists
if (!fs.existsSync('build')) {
  fs.mkdirSync('build');
}

// Run build processes
async function build() {
  await buildCSS();
  await buildJS();
  console.log('Build complete.');
}

build();