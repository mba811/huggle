var BatchStream = require('batch-stream2')
var gulp = require('gulp')
var plugins = require('gulp-load-plugins')()

var sourcedir = 'src'
var src = {
  bower: ['bower.json', '.bowerrc'],
  styles: [sourcedir + '/styles/**/*.+(css|scss)'],
  scripts: [sourcedir + '/scripts/**/*.+(js|coffee)'],
  // The entry point of a browserify bundle
  // add as many bundles as you wish
  main: sourcedir + '/scripts/app.coffee',
}
var dist = {
  all: ['dist/**/*'],
  assets: 'static/assets'
}
var debug = true

//
// concat *.js to `vendor.js`
// and *.css to `vendor.css`
// rename fonts to `fonts/*.*`
//
gulp.task('bower', function() {
  var jsFilter = plugins.filter('**/*.js')
  var cssFilter = plugins.filter('**/*.css')
  return plugins.bowerFiles()
    .pipe(jsFilter)
    .pipe(plugins.concat('vendor.js')) // bower components js goes to vendor.js
    .pipe(gulp.dest(dist.assets))
    .pipe(jsFilter.restore())
    .pipe(cssFilter)
    .pipe(plugins.concat('vendor.css')) // css goes to vendor.css
    .pipe(gulp.dest(dist.assets))
    .pipe(cssFilter.restore())
    .pipe(plugins.rename(function(path) {
      if (~path.dirname.indexOf('fonts')) {
        path.dirname = '/fonts'
      }
    }))
    .pipe(gulp.dest(dist.assets))
})

function buildCSS() {
  // all css goes to one file
  return gulp.src(src.styles)
    .pipe(plugins.plumber())
    .pipe(plugins.sass({
      sourceComments: debug ? 'map' : false
    }))
    .pipe(plugins.concat('app.css'))
    .pipe(gulp.dest(dist.assets))
}

function buildJS() {
  return gulp.src(src.main, { read: false })
    .pipe(plugins.plumber())
    .pipe(plugins.browserify({
      transform: ['coffeeify'],
      extensions: ['.coffee'],
      debug: debug
    }))
    .pipe(plugins.rename(function(file) {
      file.extname = '.js'
    }))
    .pipe(gulp.dest(dist.assets))
}

gulp.task('css', buildCSS)
gulp.task('js', buildJS)


gulp.task('watch', ['bower', 'css', 'js'], function() {
  gulp.watch(src.bower, ['bower'])
  plugins.watch({ glob: src.styles, name: 'styles' }, delayed(buildCSS))
  plugins.watch({ glob: src.scripts, name: 'scripts' }, delayed(buildJS))
})
//
// live reload can emit changes only when at lease one build is done
//
gulp.task('live', ['watch'], function() {
	var server = plugins.livereload()
	// in case a lot of files changed during a short time
	var batch = new BatchStream({ timeout: 50 })
	gulp.watch(dist.all).on('change', function change(file) {
		// clear directories
		var urlpath = file.path.replace(__dirname + '/static', '')
		// also clear the tailing index.html
		// so we can notify livereload.js the right path of files changed
		urlpath = urlpath.replace('/index.html', '/')
		batch.write(urlpath)
	})
	batch.on('data', function(files) {
		server.changed(files.join(','))
	})
})

gulp.task('compress-css', ['css'], function() {
  return gulp.src(dist.assets)
    .pipe(plugins.minifyCss())
    .pipe(gulp.dest(dist.assets))
})

gulp.task('compress-js', ['js'], function() {
  return gulp.src(dist.assets)
    .pipe(plugins.uglify())
    .pipe(gulp.dest(dist.assets))
})

gulp.task('nodebug', function() {
  // set debug to false,
  // then browserify will not output sourcemap
  debug = false
})

// build for production
gulp.task('compress', ['compress-css', 'compress-js'])
gulp.task('build', ['nodebug', 'bower', 'compress'])

// default task is build
gulp.task('default', ['build'])

function delayed(fn, time) {
  var t
  return function() {
    var _this = this
    var args = arguments
    try {
      clearTimeout(t)
    } catch (e) {}
    t = setTimeout(function() {
      fn.apply(_this, args)
    }, time || 50)
  }
}
