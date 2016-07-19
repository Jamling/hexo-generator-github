'use strict';

// --------------- github plugin -----------------
var fs = require('fs');
var GitHubApi = require("github");
var pathFn = require('path');
var util = require('util');

var github = new GitHubApi({
  // required
  version : "3.0.0",
  // optional
  debug : false,
  protocol : "https",
  host : "api.github.com", // should be api.github.com for GitHub
  pathPrefix : "", // for some GHEs; none for GitHub
  timeout : 15000,
  headers : {
    "user-agent" : "hexo-theme-nova" // GitHub is happy with a unique user
                                      // agent
  }
});

function mkdirsSync(dirpath, mode) {
  if (!fs.existsSync(dirpath)) {
    var pathtmp;
    dirpath.split(pathFn.sep).forEach(function(dirname) {
      if (pathtmp) {
        pathtmp = pathFn.join(pathtmp, dirname);
      }
      else {
        pathtmp = dirname;
      }
      if (!fs.existsSync(pathtmp)) {
        if (!fs.mkdirSync(pathtmp, mode)) {
          return false;
        }
      }
    });
  }
  return true;
}

module.exports = function(locals) {
  if (this.config.github && this.config.github.debug) {
    github.debug = !!this.config.github.debug;
  }

  var replace = this.config.github.replace;
  var pages = locals.pages;
  var cache_dir = this.config.github.cache_dir;

  var _self = this;
  var hs = this.extend.helper.list();
  // var keys = Object.keys(hs);
  var gh_opt = hs['gh_opts'];

  var cacheDir = pathFn.join("./", cache_dir);
  if (!fs.existsSync(cacheDir)) {
    mkdirsSync(cacheDir);
  }

  pages.forEach(function(item) {
    if (item.gh) {
      var path = pathFn.join(cacheDir, item.path);
      if (!replace && fs.existsSync(path)) {
        if (github.debug) _self.log.debug(path + " exists skip generate");
        return;
      }
      _self.log.info("generating github " + path);
      var dir = pathFn.dirname(path);
      mkdirsSync(dir);

      var gh = gh_opt.call(_self, item);
      if (gh.type === 'get_contents') {
        github.repos.getContent({
          user : gh.user,
          repo : gh.repo,
          ref : gh.ref ? gh.ref : 'master',
          path : gh.path ? gh.path : 'README.md'
        }, function(err, res) {
          // var url = util.format('repos/%s/%s/contents/%s', user, name, path);
          if (res && res.content) {
            var md = new Buffer(res.content, res.encoding).toString();
            // var md_func = hs['markdown']; // Why generator can't call helper
            // function?
            fs.writeFileSync(path, md);
          }
          else {
            _self.log.w("generate github " + path + " failed");
          }
        });
      }
      else if (gh.type === 'get_releases') {
        github.releases.listReleases({
          owner : gh.user,
          repo : gh.repo
        }, function(err, res) {
          if (res) {
            fs.writeFileSync(path, JSON.stringify(res));
          }
          else {
            _self.log.w("generate github " + path + " failed");
          }
        });
      }
      else if (gh.type === 'get_repos') {
        github.repos.getFromUser({
          user : gh.user
        }, function(err, res) {
          if (res) {
            fs.writeFileSync(path, JSON.stringify(res));
          }
          else {
            _self.log.w("generate github " + path + " failed");
          }
        });
      }
    }
    return [];
  });
};