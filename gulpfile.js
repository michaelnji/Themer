// initialize modules
const autoprefixer = require("autoprefixer");
const cssnano = require("cssnano");
const { src, dest, watch, series, parallel, task } = require("gulp");
const filenamelist = require("gulp-filenamelist");
const rucksack = require("rucksack-css");
const concat = require("gulp-concat");
const postcss = require("gulp-postcss");
const replace = require("gulp-replace");
const pxToRem = require("gulp-px2rem-converter");
const sass = require("gulp-sass");
sass.compiler = require("sass");
const sourcemaps = require("gulp-sourcemaps");
const uglify = require("gulp-uglify");
const browsersync = require("browser-sync").create();
const cleanFolder = require("gulp-clean");
const imagemin = require("gulp-imagemin");
const babel = require("gulp-babel");
const fileinclude = require("gulp-file-include");
const size = require("gulp-size");
const markdown = require("gulp-markdown");
const purgecss = require("gulp-purgecss");
const gulpGrab = require("gulp-grab");
const rename = require("gulp-rename");
const copyAssets = require("postcss-copy-assets");
// Global variables
const files = require("./config.js");

// Browser-Sync
function browsersyncServe(cb) {
  browsersync.init({
    server: {
      baseDir: `./${files.buildPath}/`,
    },
  });
  cb();
}
// reload Browser-Sync
function browsersyncReload(cb) {
  browsersync.reload();
  cb();
}

// clean useless js and css folder in ./${files.buildPath}/assets/vendor
function cleanUpCss() {
  return src(`./${files.buildPath}/assets/vendor/css`, { read: false }).pipe(
    cleanFolder()
  );
}
function cleanUpJs() {
  return src(`./${files.buildPath}/assets/vendor/js`, { read: false }).pipe(
    cleanFolder()
  );
}
// ? copying vendor files
function grabVendorCssFiles() {
  return src("./src/vendor.htm")
    .pipe(gulpGrab({ tags: ["vendor"], extensions: ["css"] }))

    .pipe(dest(`${files.buildPath}/assets/vendor/css`));
}
function grabVendorJsFiles() {
  return src("./src/vendor.htm")
    .pipe(gulpGrab({ tags: ["vendor"], extensions: ["js"] }))

    .pipe(dest(`${files.buildPath}/assets/vendor/js`));
}

//? copies .ttf .eot and .svg file resources for icons based on how they are linked in the node_modules folder
function grabicons() {
  return src(files.iconCssNodeModuleLocation).pipe(
    postcss([copyAssets({ base: files.iconDistLocation })], {
      to: files.iconCssFileDistLocation,
    })
  );
}

// move vendor files to folders with same name
function resolveCssDependencies() {
  return src(`./${files.buildPath}/assets/vendor/css/*.css`)
    .pipe(postcss([cssnano()]))
    .pipe(
      rename(function (file) {
        file.dirname = file.basename + "/css";
        file.basename = file.basename;
        file.extname = file.extname;
      })
    )
    .pipe(size())
    .pipe(dest(`./${files.buildPath}/assets/vendor`));
}
function resolveJsDependencies() {
  return src(`./${files.buildPath}/assets/vendor/js/*.js`)
    .pipe(
      rename(function (file) {
        file.dirname = file.basename + "/js";
        file.basename = file.basename;
        file.extname = file.extname;
      })
    )
    .pipe(size())
    .pipe(dest(`./${files.buildPath}/assets/vendor`));
}
// compile markdown to html and sends to partials folder
function runMarkdown() {
  return src(files.markdownPath)
    .pipe(markdown())
    .pipe(size())
    .pipe(dest("src/partials"));
}

// windicss task
function windiCompile() {
  return src("./src/assets/scss/windi.css")
    .pipe(postcss([require("postcss-windicss")]))
    .pipe(
      rename(function (file) {
        file.dirname = file.basename;
        file.basename = file.basename;
        file.extname = ".scss";
      })
    )
    .pipe(size())
    .pipe(dest("./src/assets/scss/"));
}
// sass tasks
function runScss() {
  return src(files.scssPath)
    .pipe(sourcemaps.init())
    .pipe(sass())
    .pipe(pxToRem())
    .pipe(
      postcss([
        rucksack({
          fallbacks: true,
        }),
      ])
    )
    .pipe(
      postcss([
        autoprefixer(),
        // postcssPresetEnv(/* pluginOptions */ { stage: 0 }),
      ])
    )
    .pipe(sourcemaps.write("."))

    .pipe(size())

    .pipe(dest(files.cssDistPath));
}
// same as for runScss but just has additional css purging
function runScss_prod() {
  return src(files.scssPath)
    .pipe(sourcemaps.init())
    .pipe(sass())
    .pipe(
      purgecss({
        content: ["src/**/*.{html,js}"],
        defaultExtractor: (content) => {
          const broadMatches = content.match(/[^<>"'`\s]*[^<>"'`\s:]/g) || [];
          const innerMatches =
            content.match(/[^<>"'`\s.()]*[^<>"'`\s.():]/g) || [];
          return broadMatches.concat(innerMatches);
        },
      })
    )
    .pipe(pxToRem())
    .pipe(
      postcss([
        autoprefixer(),

        cssnano(),

        rucksack({
          fallbacks: true,
        }),
        // postcssPresetEnv(/* pluginOptions */),
      ])
    )
    .pipe(sourcemaps.write("."))
    .pipe(size())

    .pipe(dest(files.cssDistPath + "windi.scss"));
}

// Minify images
function minifyImages() {
  return src(files.imgPath).pipe(dest(`${files.buildPath}/assets/images`));
}
// javascript tasks
function runJs() {
  return src(files.jsPath)
    .pipe(concat("all.js"))
    .pipe(babel())
    .pipe(uglify())
    .pipe(size())
    .pipe(dest(files.jsDistPath));
}

// returns a file structure
function fstre() {
  return src(`./${files.buildPath}/**/*`)
    .pipe(
      filenamelist({
        outputFileName: "file-structure.md",
        prepend: "\n\t",
        separator: "\n\t|__\t",
      })
    )
    .pipe(dest(`./${files.buildPath}`));
}
// cache busting and html partial parsing
const cbString = new Date().getTime();
function runHtml() {
  return src(files.htmlPath)
    .pipe(
      fileinclude({
        prefix: "@@",
        basepath: "@file",
      })
    )
    .pipe(replace(/cb=\d+/g, "cb=" + cbString))
    .pipe(size())

    .pipe(dest(files.buildPath));
}
// watch task
function watchTask() {
  watch(
    [files.jsPath, files.scssPath],
    series(parallel(runScss, runJs), browsersyncReload)
  );
}
function watchTaskWindi() {
  watch(
    ["src/**/*.html"],
    series(parallel(windiCompile, runHtml), runScss, browsersyncReload)
  );
}
// default task
task(
  "default",
  series(
    grabVendorCssFiles,
    grabVendorJsFiles,
    parallel(resolveCssDependencies, resolveJsDependencies),
    grabicons,
    minifyImages,
    runMarkdown,
    windiCompile,
    parallel(runScss, runJs),
    runHtml,
    browsersyncServe,
    parallel(watchTask, watchTaskWindi)
  )
);

task(
  "build",
  // grabVendorFiles,
  series(
    grabVendorCssFiles,
    grabVendorJsFiles,
    resolveCssDependencies,
    resolveJsDependencies,
    grabicons,
    minifyImages,
    runMarkdown,
    runHtml,
    windiCompile,
    parallel(runScss_prod, runJs),
    cleanUpCss,
    cleanUpJs,
    fstre
  )
);

task(
  "fetchDepedencies",

  series(
    grabVendorCssFiles,
    grabVendorJsFiles,
    resolveCssDependencies,
    resolveJsDependencies,
    grabicons,
    minifyImages,
    cleanUpCss,
    cleanUpJs
  )
);
