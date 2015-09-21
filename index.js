'use strict';

var through        = require('through2');
var stylus         = require('stylus');
var gutil          = require('gulp-util');
var rext           = require('replace-ext');
var path           = require('path');
var assign         = require('lodash.assign');
var applySourceMap = require('vinyl-sourcemaps-apply');
var watch          = require('node-watch');

var PLUGIN_NAME = 'gulp-stylus';

module.exports = function (options) {
  var onupdate;
  if (options) {
    onupdate = options.onupdate;
    delete options.onupdate;
  }

  var opts = assign({}, options);

  return through.obj(function (file, enc, cb) {

    if (file.isStream()) {
      return cb(new gutil.PluginError(PLUGIN_NAME, 'Streaming not supported'));
    }
    if (file.isNull()) {
      return cb(null, file);
    }
    if (path.extname(file.path) === '.css') {
      return cb(null, file);
    }
    if (file.sourceMap) {
      opts.sourcemap = true;
    }
    opts.filename = file.path;

    var style = stylus(file.contents.toString('utf8'), opts);

    style.render(function (err, css) {
      if (err) {
        delete err.input;
        cb(new gutil.PluginError(PLUGIN_NAME, err));
      } else {
        file.path = rext(file.path, '.css');
        file.contents = new Buffer(css);
        if (style.sourcemap) {
          makePathsRelative(file, style.sourcemap);
          style.sourcemap.file = file.relative;
          applySourceMap(file, style.sourcemap);
        }
        cb(null, file);
        if (onupdate) {
          var deps = style.deps();
          watch(deps, onupdate);
        }
      }
    });
  });
};

function makePathsRelative(file, sourcemap) {
  for (var i = 0; i < sourcemap.sources.length; i++) {
    sourcemap.sources[i] = path.relative(file.base, sourcemap.sources[i]);
  }
}
