const gulp = require('gulp');
const gzip = require('gulp-gzip');
const path = require('path');
const fs = require('fs');
const clean = require('gulp-clean');
const exec = require('child_process').exec;
const runCommand = require('util').promisify(exec);
const inquirer = require('inquirer');
const resolve = (name) => path.resolve(__dirname, name);
const {Transform} = require('stream');
const {versionFontUrls} = require('./scripts/cache-assets.cjs');
const {writePrism} = require('./scripts/build-prism.cjs');

gulp.task('clean', () => {
  return gulp.src([
    './templates/',
    './theme-butterfly-dist.zip',
  ], {
    read: false,
    allowEmpty: true,
  }).pipe(
    clean({
      force: true,
    }),
  );
});

const sass = require('gulp-sass')(require('sass'));
const rename = require('gulp-rename');
const autoPrefix = require('gulp-autoprefixer');

const postcss = require('gulp-postcss');
gulp.task('css', function() {
  // common.scss 输出所有页面共用的核心样式，page/*.scss 只输出各页面的差异部分
  return gulp.src(['./src/scss/common.scss', './src/scss/page/*.scss']).
  pipe(sass({}, {})).
  pipe(postcss([
    require('postcss-import')({
      path: ['node_modules'],
    }),
    require('css-mqpacker')(),
  ])).
  pipe(require('gulp-clean-css')({
    level: 2,
  })).
  pipe(autoPrefix({
    overrideBrowserslist: [
      '> 5%',
      'last 2 versions',
      'last 3 Safari versions',
      'Firefox >= 20',
    ],
    cascade: false,
  })).
  pipe(rename({suffix: '.min'})).
  pipe(gulp.dest('./templates/assets/css'));
});

const TerserPlugin = require('terser-webpack-plugin');
const webpack = require('webpack-stream');
const zip = require('gulp-zip');
gulp.task('js', function() {
  const getEntryData = () => {
    try {
      let files = fs.readdirSync('./src/js/page', 'utf-8');

      const result = {};

      for (let i = 0; i < files.length; i++) {
        const fileName = files[i].replace(/.js$/, '');
        result[fileName] = resolve(`./src/js/page/${files[i]}`);
      }

      return result;
    } catch (error) {
      throw new Error(error);
    }
  };

  return webpack({
    mode: 'production',
    entry: getEntryData(),
    module: {
      rules: [
        {
          test: /\.js$/,
          loader: 'babel-loader',
          include: resolve('src'),
          exclude: resolve('node_modules'),
          options: {
            presets: [['@babel/preset-env', {modules: false}]],
            plugins: [
              ['@babel/plugin-proposal-decorators', {'legacy': true}],
              '@babel/plugin-transform-runtime',
            ],
          },
        },
        {
          test: /\.css$/,
          use: ['css-loader'],
        },
      ],
    },
    optimization: {
      minimize: true,
      // 提取各页面共同依赖（jQuery 等）为 common chunk，跨页面可缓存；
      // minChunks:2 保证页面专属代码仍留在各自 bundle 中
      splitChunks: {
        chunks: 'initial',
        minChunks: 2,
        name: 'common',
      },
      runtimeChunk: {
        name: 'common',
      },
      minimizer: [
        new TerserPlugin({
          terserOptions: {
            format: {
              comments: false,
            },
          },
          extractComments: false,
        }),
      ],
    },
    stats: 'errors-only',
    output: {
      filename: '[name].min.js',
      chunkFilename: '[name].[contenthash:12].chunk.min.js',
    },
  })
  // .pipe(uglify())
  .pipe(gulp.dest('./templates/assets/js')).pipe(
    gzip({
      threshold: '10kb',
    }),
  ).pipe(gulp.dest('./templates/assets/js'));
});

gulp.task('js-plugins-loading', function() {
  const entryRoot = './src/plugins/loading/';
  const outputRoot = './templates/assets/plugins/loading/';

  const getEntryData = () => {
    try {
      let files = fs.readdirSync(entryRoot, 'utf-8');

      const result = {};

      for (let i = 0; i < files.length; i++) {
        const fileName = files[i].replace(/.js$/, '');
        result[fileName] = resolve(`${entryRoot}${files[i]}`);
      }

      return result;
    } catch (error) {
      throw new Error(error);
    }
  };

  return webpack({
    mode: 'production',
    entry: getEntryData(),
    module: {
      rules: [
        {
          test: /\.js$/,
          loader: 'babel-loader',
          include: resolve('src'),
          exclude: resolve('node_modules'),
          options: {
            presets: ['@babel/preset-env'],
          },
        },
        {
          test: /\.css$/,
          use: ['css-loader'],
        },
      ],
    },
    optimization: {
      minimize: true,
      minimizer: [
        new TerserPlugin({
          terserOptions: {
            format: {
              comments: false,
            },
          },
          extractComments: false,
        }),
      ],
    },
    stats: 'errors-only',
    output: {
      filename: '[name].min.js',
    },
  })
  // .pipe(uglify())
  .pipe(gulp.dest(outputRoot)).pipe(
    gzip({
      threshold: '10kb',
    }),
  ).pipe(gulp.dest(outputRoot));
});

gulp.task('js-plugins-artalk', function() {
  const entryRoot = './src/plugins/artalk/';
  const outputRoot = './templates/assets/plugins/artalk/';

  return webpack({
    mode: 'production',
    entry: {
      Artalk: resolve(`${entryRoot}Artalk.js`),
    },
    module: {
      rules: [],
    },
    optimization: {
      minimize: true,
      minimizer: [
        new TerserPlugin({
          terserOptions: {
            format: { comments: false },
            compress: { passes: 2, ecma: 2017 },
            mangle: { reserved: ['Artalk'] },
          },
          extractComments: false,
        }),
      ],
    },
    stats: 'errors-only',
    output: {
      filename: '[name].min.js',
      library: {name: 'Artalk', type: 'umd'},
      globalObject: 'globalThis',
    },
  })
    .pipe(gulp.dest(outputRoot))
    .pipe(
      gzip({
        threshold: '10kb',
      }),
    )
    .pipe(gulp.dest(outputRoot));
});

gulp.task('css-plugins-artalk', function() {
  return gulp.src('./src/plugins/artalk/Artalk.css')
    .pipe(require('gulp-clean-css')({ level: 2 }))
    .pipe(rename({ suffix: '.min' }))
    .pipe(gulp.dest('./templates/assets/plugins/artalk/'))
    .pipe(
      gzip({
        threshold: '10kb',
      }),
    )
    .pipe(gulp.dest('./templates/assets/plugins/artalk/'));
});

const htmlMin = require('gulp-htmlmin');
gulp.task('html', function() {
  return gulp.src('./src/html/**/*.html').pipe(htmlMin({
    removeComments: true,//清除HTML注释
    collapseWhitespace: true,//压缩HTML
    collapseBooleanAttributes: true,//省略布尔属性的值 <input checked="true"/> ==> <input />
    removeEmptyAttributes: true,//删除所有空格作属性值 <input id="" /> ==> <input />
    removeScriptTypeAttributes: true,//删除<script>的type="text/javascript"
    removeStyleLinkTypeAttributes: true,//删除<style>和<link>的type="text/css"
    minifyJS: {
      ignoreCustomComments: [
        /^\s*\/\*!\[\[.*?]]\*\/\s*$/, // 匹配 /*[[ ... ]]*/ 形式的注释
      ],
    },//压缩页面JS
    minifyCSS: false,
    ignoreCustomFragments: [/<th:block[^>]*\/>/],
  })).pipe(gulp.dest('./templates'));
});

gulp.task('zip', () => {
  return gulp.src([
    './templates/**/*.*',
    './settings.yaml',
    './annotation-setting.yaml',
    './theme.yaml',
    './LICENSE',
  ], {base: '.'}).pipe(zip('theme-butterfly-dist.zip')).pipe(gulp.dest('./'));
});

gulp.task('release', async () => {
  const {value} = await inquirer.prompt([
    {
      type: 'list', // 交互类型 -- 单选（无序）
      message: '请选择发布版:', // 引导词
      name: 'value', // 自定义的字段名
      choices: [
        {name: '小版本', value: 'patch'},
        {name: '中版本', value: 'minor'},
        {name: '大版本', value: 'major'},
      ], // 选项列表
    },
  ]);

  if(!['patch', 'minor', 'major'].includes(value)) throw new Error('Invalid release type');
  const {stdout} = await runCommand(`npm version ${value} --no-git-tag-version`);
  const version = stdout.trim().replace(/^v/, '');
  const themeYaml = fs.readFileSync('./theme.yaml', 'utf8');
  fs.writeFileSync('./theme.yaml', themeYaml.replace(/^  version: .*$/m, `  version: ${version}`), 'utf8');
});

// Prism：核心与插件打包，语言文件拆分后由 autoloader 按需加载
gulp.task('prism', async () => {
  writePrism(resolve('templates/assets/plugins/prism'));
});

// 复制文件夹 font plugins
gulp.task('copy-folder', function() {
  return gulp.src([
    './src/font/**/*',
    './src/plugins/**/*',
    './src/img/**/*',
    '!./src/font/CircularBody/CircularBody.ttf',
    '!./src/plugins/artalk/Artalk.js',
    '!./src/plugins/artalk/Artalk.css',
    // Font Awesome 子集化:全量字体与原始 CSS 只作生成输入,不进入构建产物
    '!./src/plugins/fontawesome/fonts-source/**',
    '!./src/plugins/fontawesome/fontawesome.full.min.css',
  ], {base: 'src'}) // 设置基本路径为 'src'
  .pipe(new Transform({
    objectMode: true,
    transform(file, encoding, callback) {
      if(file.isBuffer() && path.extname(file.path) === '.css') {
        file.contents = Buffer.from(versionFontUrls(file.contents.toString(), require('./package.json').version));
      }
      callback(null, file);
    },
  }))
  .pipe(gulp.dest('./templates/assets/'));
});

gulp.task(
  'watch',
  function() {
    gulp.watch(['./src/scss/**/*.scss'], gulp.series('css'));
    gulp.watch(['./src/js/**/**/*.js'], gulp.series('js'));
    gulp.watch(['./src/html/**/**/*.html'], gulp.series('html'));
    gulp.watch(['./src/plugins/artalk/Artalk.js'], gulp.series('js-plugins-artalk'));
    gulp.watch(['./src/plugins/artalk/Artalk.css'], gulp.series('css-plugins-artalk'));
  },
);

gulp.task(
  'default',
  gulp.series(
    gulp.parallel(
      'copy-folder',
      'prism',
      'css',
      'js',
      'html',
      'js-plugins-loading',
      'js-plugins-artalk',
      'css-plugins-artalk',
    ),
  ),
);
