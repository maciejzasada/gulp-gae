'use strict';

var through = require('through2'),
  path = require('path'),
  gutil = require('gulp-util'),
  spawn = require('child_process').spawn,

  PluginError = gutil.PluginError,
  File = gutil.File;


module.exports = function (action, args, params) {
  action = action || 'dev_appserver.py';
  args = args || [];
  params = params || {};

  var proc;

  if (['dev_appserver.py', 'appcfg.py'].indexOf(action) == -1) {
    throw new PluginError('gulp-gae', 'Invalid action ' + action + '. Supported actions are dev_appserver.py and appcfg.py');
  }

  function parseParams(params) {
    var p = [];
    for (var key in params) {
      var value = params[key];
      if (value === undefined) {
        // Value-less parameters.
        p.push('--' + key);
      } else {
        p.push('--' + key + '=' + value);
      }
    }
    return p;
  }

  function runScript(file, args, params, cb) {
    var scriptArgs = args.concat(parseParams(params));
    gutil.log('[gulp-gae]', scriptArgs);
    proc = spawn(file, scriptArgs);
    proc.stdout.pipe(process.stdout);
    proc.stderr.pipe(process.stderr);
    cb && cb();
  }

  function stopScript() {
    gutil.log('[gulp-gae]', 'stopping script');
    proc && proc.kill('SIGHUP');
    proc = null;
  }

  function bufferContents(file, enc, cb) {
    var appYamlPath = path.dirname(file.path),
      shouldWait = false;

    if (action == 'dev_appserver.py') {
      args = [appYamlPath].concat(args);
    } else if (action == 'appcfg.py') {
      args = args.concat([appYamlPath]);
      shouldWait = true;
    }

    runScript(action, args, params, cb);

    process.on('SIGINT', stopScript);
    process.on('exit', stopScript);
  }

  function endStream(cb) {
    cb();
    return;
  }

  return through.obj(bufferContents, endStream);
};
