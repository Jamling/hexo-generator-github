'use strict';

var fs = require('fs');
var pathFn = require('path');
var _ = require('lodash');
var util = require('util');
// npm install urllib-sync
var request = require('urllib-sync').request;
// see https://github.com/node-modules/urllib

function SyncGithubAPI(opts){
  this.host = "https://api.github.com/";
  // this.token = this.config.github.token;
  // this.user = this.config.github.user;
  this.opts = opts || {
    dataType: 'json',
    timeout: 15000,
    data: {
      
    }
  }
}


SyncGithubAPI.prototype.reqSync = function(path, options){
    var o = options || {};
    var url = this.host  + path;
    console.log("gh api:" + url)
    var res = request(url, _.extend(this.opts, o));
    util.inspect(request)
    if (res.err) {
      console.error(res.err);
      return;
    }
    var limit = 0;
    if (res.headers['x-ratelimit-limit']){
      limit = res.headers['x-ratelimit-limit'];
    }
    var remain = 0;
    if (res.headers['x-ratelimit-remaining']){
      remain = res.headers['x-ratelimit-remaining'];
    }
    var reset = '';
    if (res.headers['x-ratelimit-reset']){
      reset = new Date(res.headers['x-ratelimit-reset'] * 1000);
    }
    
    console.log('rate limit:%d,remaining:%d,reset:%s', limit, remain, reset);
    if (!res.statusCode == 200){
      console.error(res);
      return res.message;
    }
    return res.data;
}


SyncGithubAPI.prototype.setToken = function(token){
  // token error will response 401
  //this.opts.data.access_token = token;
}

var gh = new SyncGithubAPI();

function getLang(hexo, page){
  var languages = hexo.config.language;
  if(!Array.isArray(languages)){
    languages = [languages];
  }
  _.pull(languages, 'default');
  if (!page.lang){
    var lang = page.path.split('/')[0];
    if (languages.indexOf(lang) != -1){// start with lang
      page.lang = lang;
    } else{
      return false;
    }
  }
  return page.lang != languages[0];
}

function gh_opts(page, options) {
  var page = page ? page : this.page;
  var gh = page.gh;
  if (!gh.user){
    gh.user = this.config.github.user;
  }
  var pIndex = 1;

  if (getLang(this, page)){
    pIndex++;
  }
  
    var o = options || {};
    var path_index = o.hasOwnProperty('index') ? o.index : pIndex;
    if (!_.isNumber(path_index)){
      path_index = pIndex;
    }
    var paths = page.path.split('/');
    var name = paths[path_index];
    var file = paths[paths.length - 1];  
    if (!gh.repo){
      gh.repo = name;
    }
  return gh;
}

function gh_repos(options){
  var o = options || {};
  var user = o.hasOwnProperty('user') ? o.user : this.config.github.user;
  var _self = this;
  var ret = [];
  
  if (!user){
    console.log('no github user assigned, please check your github configuration in root _config.yml');
    return ret;
  }
  
  function filter_repo(repo){
    var config_repos = _self.config.github.repos;
    if (!config_repos){
      return false;
    }
    if (config_repos && util.isArray(config_repos)){
      return config_repos.indexOf(repo.name) < 0; // not exist
    }
    return false;
  }
  
  var url = util.format('users/%s/repos', user);
  
  // gh.setToken(this.config.github.token);
  var repos = [];
  var cache = (_self.gh_read_cache(this.page));
  if (cache){
    repos = JSON.parse(cache);
  }
  else {
    repos = gh.reqSync(url);
    this.gh_write_cache(this.gh_cache_dir(this.page, JSON.stringify(repos)));
  }
  console.log('%s has %d repos', user, repos.length);
  repos.forEach(function(repo){
    if (!filter_repo(repo)){ 
      ret.push(repo);
    }
  });
  return ret;
}

function gh_contents(options){
  var o = options || {}
  var user = o.hasOwnProperty('user') ? o.user : this.config.github.user;
  var name = o.hasOwnProperty('repo') ? o.repo : null;
  var path = o.hasOwnProperty('path') ? o.path : 'README.md';
  var ref = o.hasOwnProperty('ref') ? o.ref : 'master';
  
  if (name === undefined) {
    return '';
  }
  
  var cache = (this.gh_read_cache(this.page));
  if (cache){
	  return this.markdown(cache.toString());
  }
  
  gh.setToken(this.config.github.token);
  var url = util.format('repos/%s/%s/contents/%s', user, name, path);
  console.log("no cache, and try load from : " + url);
  var repo = gh.reqSync(url, {data:{'ref': ref}});
  if (repo && repo.content){
    var md = new Buffer(repo.content, repo.encoding).toString();
    var content = this.markdown(md);
    this.gh_write_cache(this.gh_cache_dir(this.page, md));
    return content;
  }
  return '';
}

// get release from github
function gh_releases(options){
  var o = options || {}
  var user = o.hasOwnProperty('user') ? o.user : this.page.gh.user;
  var name = o.hasOwnProperty('repo') ? o.name : this.page.gh.repo;
  
  if (name === undefined) {
    return [];
  }
  var cache = (this.gh_read_cache(this.page));
  if (cache){
	  return JSON.parse(cache);
  }
  
  gh.setToken(this.config.github.token);
  var url = util.format('repos/%s/%s/releases', user, name);
  var repo = gh.reqSync(url);
  this.gh_write_cache(this.gh_cache_dir(this.page, JSON.stringify(repo)));
  return repo;
};

// return raw link for github pages
function gh_raw_link(options){
  var o = options || {}
  var user = o.hasOwnProperty('user') ? o.user : this.config.github.user;
  var name = o.hasOwnProperty('repo') ? o.repo : null;
  var path = o.hasOwnProperty('path') ? o.path : "README.md";
  var ref = o.hasOwnProperty('ref') ? o.ref : 'master';
  return util.format('https://github.com/%s/%s/edit/%s/%s', user, name, ref, path);
};

// read github from cache
function gh_read_cache(page){
  var path = this.gh_cache_dir(page);
  if (fs.existsSync(path)){
    return fs.readFileSync(path);
  }
  // try to load default cache.
  if (getLang){
    path = pathFn.join(this.config.github.cache_dir, page.path.substring(page.lang.length + 1));
    if (fs.existsSync(path)){
      return fs.readFileSync(path);
    }
  }
  
  return undefined;
};
// write to github cache
function gh_write_cache(path, content){
  if (content) {
    fs.writeFileSync(path, content);
  }
};

// return github cache dir
function gh_cache_dir(page){
  if (!page){
    page = this.page;
  }
  var path = pathFn.join(this.config.github.cache_dir, page.path);
  return path;
};

exports.opts = gh_opts;
exports.repos = gh_repos;
exports.releases = gh_releases;
exports.contents = gh_contents;
exports.raw = gh_raw_link;
exports.cacheDir = gh_cache_dir;
exports.read = gh_read_cache;
exports.write = gh_write_cache;
