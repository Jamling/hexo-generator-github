'use strict';

function desc() {
  return 'Generate github pages';
}

function opts() {
  return {
    options : [ {
      name : '-r, --replace',
      desc : 'Replace existing files'
    } ]
  }
}

function github(args) {
  var opt = {};
  if (args.r || args.replace) {
    opt.replace = true;
  }

  var _self = this;
  _self.config.github.replace = opt.replace;
  return this.load().then(function() {
    var generator = _self.extend.generator.list()['github'];

    var locals = _self.locals.toObject();
    generator.call(_self, locals, opt);
  });
}

exports.opts = opts;
exports.desc = desc;
exports.github = github;