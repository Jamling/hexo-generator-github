'use strict';

var fs = require('fs');
var pathFn = require('path');
var util = require('util');
var _ = require('lodash');
// npm install urllib-sync
var request = require('urllib-sync').request;
// see https://github.com/node-modules/urllib

//--------> Init
if (!hexo.config.github) {
  hexo.log.error('github not config in _config.yml!\nPlease visit https://github.com/Jamling/hexo-generator-github to config this plugin');
  return;
}

let _config = hexo.config.github;
let _apiHeader = {}
if (_config.token) {
  _apiHeader['Authorization'] = 'token ' + _config.token
}

function SyncGithubAPI(opts) {
  this.host = "https://api.github.com/";
  this.opts = opts || {
    dataType: 'json',
    timeout: _config.timeout || 15000,
    headers: _apiHeader,
    data: {}
  }
}

SyncGithubAPI.prototype.reqSync = function (path, options) {
  var o = options || {};
  var url = this.host + path;
  hexo.log.info("request:" + url)
  o = _.extend(this.opts, o);
  hexo.log.debug("gh args:", o);
  var res = request(url, o);
  //util.inspect(request)
  if (res.err) {
    hexo.log.w(res.err);
    return;
  }
  var limit = 0;
  if (res.headers['x-ratelimit-limit']) {
    limit = res.headers['x-ratelimit-limit'];
  }
  var remain = 0;
  if (res.headers['x-ratelimit-remaining']) {
    remain = res.headers['x-ratelimit-remaining'];
  }
  var reset = '';
  if (res.headers['x-ratelimit-reset']) {
    reset = new Date(res.headers['x-ratelimit-reset'] * 1000).toISOString();
  }

  hexo.log.info('rate limit:%d,remaining:%d,reset:%s', limit, remain, reset);
  if (!res.statusCode == 200) {
    hexo.log.w(res);
    return res.message;
  }
  return res.data;
}

var gh = new SyncGithubAPI();

//--------> Internal 
function mkdirsSync(dirpath, mode) {
  if (!fs.existsSync(dirpath)) {
    var pathtmp;
    dirpath.split(pathFn.sep).forEach(function (dirname) {
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

function rmdirsSync(path) {
  var files = [];
  if (fs.existsSync(path)) {
    files = fs.readdirSync(path);
    files.forEach(function (file, index) {
      var curPath = pathFn.join(path, file);
      if (fs.statSync(curPath).isDirectory()) { // recurse
        rmdirsSync(curPath);
      } else {
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(path);
  }
}

function getLang(page) {
  var languages = hexo.config.language;
  if (!Array.isArray(languages)) {
    languages = [languages];
  }
  _.pull(languages, 'default');
  if (!page.lang) {
    var lang = page.path.split('/')[0];
    if (languages.indexOf(lang) != -1) {// start with lang
      page.lang = lang;
    }
    else {
      return false;
    }
  }
  return page.lang != languages[0];
}

//-------> Helpers
// read github from cache
function gh_read_cache(page) {
  var path = gh_cache_dir(page);
  if (fs.existsSync(path)) {
    return fs.readFileSync(path);
  }
  // try to load default cache.
  if (getLang(page)) {
    path = pathFn.join(_config.cache_dir, page.path.substring(page.lang.length + 1));
    if (fs.existsSync(path)) {
      return fs.readFileSync(path);
    }
  }

  return undefined;
};
// write to github cache
function gh_write_cache(page, content) {
  var path = gh_cache_dir(page);
  if (content) {
    fs.writeFileSync(path, content);
  }
};

// return github cache dir
function gh_cache_dir(page, config) {
  var path = pathFn.join(_config.cache_dir, page.path);
  return path;
};

// return gh config of page
function gh_opts(page, options) {
  var page = page || this.page;
  var gh = page.gh;
  if (!gh.user) {
    gh.user = _config.user;
  }
  var pIndex = 1;

  if (getLang(page)) {
    pIndex++;
  }

  var o = options || {};
  var path_index = o.hasOwnProperty('index') ? o.index : pIndex;
  if (!_.isNumber(path_index)) {
    path_index = pIndex;
  }
  var paths = page.path.split('/');
  var name = paths[path_index];
  var file = paths[paths.length - 1];

  if (!gh.repo) {
    gh.repo = name;
  }
  return gh;
}

// get repos from github
function gh_repos(page) {
  let p = page || this.page;
  let _self = this;
  let ret = [];
  let o = gh_opts(p);
  let user = o.user;
  let name = o.repo;

  if (!user) {
    hexo.log.w('no github user assigned, please check your github configuration in root _config.yml');
    return ret;
  }

  function replaceRepo(repos, repo) {
    var find = false;
    for (var i = 0; i < repos.length; i++) {
      if (repos[i].id === repo.id) {
        repos[i] = repo;
        find = true;
        break;
      }
    }
    if (!find) {
      repos.push(repo);
    }
  }

  function fetchRepo(name) {
    var repo = gh.reqSync(util.format('repos/%s/%s', user, name));
    return repo;
  }

  var repos = [];
  var cache = gh_read_cache(p);
  if (cache) {
    repos = JSON.parse(cache);
    return repos;
  }

  hexo.log.info('load repos, please wait...')
  var config_repos = _config.repos;
  if (config_repos && Array.isArray(config_repos) && config_repos.length > 0) {
    // get repos of config
    config_repos.forEach(function (name) {
      var repo = fetchRepo(name);
      if (repo) {
        replaceRepo(repos, repo);
      } else {
        hexo.log.w('Warning! ' + user + '/' + name + ' not fetched')
      }
    });
  } else {
    var url = util.format('users/%s/repos?per_page=100', user);
    repos = gh.reqSync(url);
  }
  var str = JSON.stringify(repos);
  gh_write_cache(p, str);
  hexo.log.info('load %d repos', repos.length);
  return repos;
}

// get contents from github
function gh_contents(page) {
  let p = page || this.page;
  let o = gh_opts(p);
  var user = o.user;
  var name = o.repo;
  var path = o.path || 'README.md';
  var ref = o.ref || 'master';

  if (name === undefined) {
    return '';
  }

  var prefix = ['https://github.com', user];
  if (name) {
    prefix.push(name);
  }

  var tpaths = path.split('/');
  for (var i = 0; i < tpaths.length - 1; i++) {
    prefix.push(tpaths[i]);
  }
  prefix.push('raw');
  prefix.push(ref);
  prefix.push('');
  p.gh.prefix = prefix.join('/');

  var cache = gh_read_cache(p);
  if (cache) {
    return cache.toString();
  }

  var url = util.format('repos/%s/%s/contents/%s', user, name, path);
  hexo.log.info("no cache, and try load from : " + url);
  var repo = gh.reqSync(url, {
    data: {
      'ref': ref
    }
  });
  if (repo && repo.content) {
    var md = new Buffer(repo.content, repo.encoding).toString();
    md = hexo.render.renderSync({text: md, engine: 'markdown'});
    gh_write_cache(p, md);
    return md;
  }
  return '';
}

// get release from github
function gh_releases(page) {
  let p = page || this.page;
  let o = gh_opts(p);
  var user = o.user;
  var name = o.repo;

  if (name === undefined) {
    return [];
  }
  var cache = gh_read_cache(p);
  if (cache) {
    return JSON.parse(cache);
  }

  var url = util.format('repos/%s/%s/releases', user, name);
  var repo = gh.reqSync(url);
  gh_write_cache(p, JSON.stringify(repo));
  return repo;
};

// return edit link for github pages
function gh_edit_link(page) {
  let p = page || this.page;
  let o = gh_opts(p);
  var user = o.user;
  var name = o.repo;
  var path = o.path || 'README.md';
  var ref = o.ref || 'master';
  return util.format('https://github.com/%s/%s/edit/%s/%s', user, name, ref, path);
};


// copy from hexo-theme-nova project.js
// project layout left nav tree
function gh_aside_nav(options) {
  var projects = this.site.data.projects;
  if (!projects) {
    hexo.log.error('Warning! No projects.yml in _data directory of site');
    return;
  }
  var o = options || {};
  var parent_color = o.hasOwnProperty('parent_color') ? o.parent_color : null;
  var child_color = o.hasOwnProperty('child_color') ? o.child_color : null;

  var _self = this;

  var paths = this.page.path.split('/');
  var name = this.page.gh ? this.page.gh.repo : paths[paths.length - 2];
  var file = paths[paths.length - 1];
  var p = projects[name];
  if (!p) {
    hexo.log.error('Warning! No ' + name + " project configurated in projects.yml");
    return;
  }

  function Node() { // bootstrap-treeview refer to: http://www.htmleaf.com/jQuery/Menu-Navigation/201502141379.html
    var node = {
      text: "",
      //icon: "glyphicon glyphicon-stop",
      //selectedIcon: "glyphicon glyphicon-stop",
      color: child_color,
      //backColor: "#FFFFFF",
      href: "#",
      selectable: false,
      state: {
        // checked: true,
        disabled: false,
        expanded: false,
        selected: false
      },
      //tags: ['available'],
      //nodes: []
    }
    return node;
  }

  function JqNode() {
    var node = {

    }
    return node;
  }

  function i18n(key) {
    var last = key.split('.').pop();
    var i18n = _self.__('project.' + last);
    if (('project.' + last) !== i18n) {
      return i18n;
    }
    return _self.__(key);
  }

  var data = [];
  var mis = [];

  function iterate(item, pnode, pk) {
    _.each(item, function (value, key) {
      var n = new Node();
      n.text = i18n(pk + "." + key);
      if (_.isString(value)) {
        n.selectable = false;
        n.href = value;
        if (file === value) {
          n.state.selected = true;
          //n.state.expanded = true;
          //n.state.disabled = true;
          n.selectable = false;
          if (pnode && pnode.state) {
            pnode.state.expanded = true;
          }
        }
        mis.push(value);
      } else {
        n.color = parent_color;
        n.text = '<b>' + n.text + '</b>';
        iterate(value, n, pk + '.' + key);
      }
      if (_.isArray(pnode)) {
        pnode.push(n);
      } else {
        if (typeof pnode.nodes === 'undefined') {
          pnode.nodes = [];
        }
        pnode.nodes.push(n);
      }
    });
  }

  iterate(p, data, name);
  var dir = pathFn.dirname(this.page.path) + '/';
  var i = mis.indexOf(file);
  if (i > 0) {
    this.page.prev = dir + mis[i - 1];
    this.page.prev_link = dir + mis[i - 1];
  }
  if (i < mis.length - 1) {
    this.page.next = dir + mis[i + 1];
    this.page.next_link = dir + mis[i + 1];
  }
  return JSON.stringify(data);
}

// return github api time
function gh_time(str, format) {
  if (!str) {
    return 'invalid date';
  }
  return str.replace(/T.+/, '');
  //var d = new Date(str.replace(/T/, ' ').replace(/Z/, ''));
  //return this.date(d, format);
}

// return github api size in well format
function gh_file_size(bytes) {
  if (bytes >= (1 << 20)) {
    var f = (bytes / (1 << 20)).toFixed(2);
    return f + " M"; ß
  }
  if (bytes >= (1 << 10)) {
    var f = (bytes / (1 << 10)).toFixed(2);
    return f + " K";
  }
  return bytes + " B";
}

function gh_release_toc(releases, options) {
  options = options || {};
  var className = options.hasOwnProperty('class') ? options.class : 'nav';
  var ret = '<ul class="' + className + '">';
  releases.forEach(function (p) {
    ret += '<li><a href="#' + p.tag_name + '">' + p.tag_name + '</a></li>';
  });
  ret += '</ul>';
  return ret;
}

var helper = hexo.extend.helper;
helper.register('gh_opts', gh_opts);
helper.register('gh_repos', gh_repos);
helper.register('gh_contents', gh_contents);
helper.register('gh_releases', gh_releases);
helper.register('gh_edit_link', gh_edit_link);
helper.register('gh_aside_nav', gh_aside_nav);
helper.register('gh_time', gh_time);
helper.register('gh_file_size', gh_file_size);
helper.register('gh_release_toc', gh_release_toc);

//-------> Generator
hexo.extend.generator.register('github', function (locals) {
  var replace = _config.replace;
  var pages = locals.pages;
  var cache_dir = _config.cache_dir;

  var _self = this;
  var hs = this.extend.helper.list();

  var cacheDir = pathFn.join("./", cache_dir);
  if (replace) {
    rmdirsSync(cacheDir);
    return;
  }
  if (!fs.existsSync(cacheDir)) {
    mkdirsSync(cacheDir);
  }

  pages.forEach(function (page) {
    if (page.gh) {
      var path = pathFn.join(cacheDir, page.path);
      if (!replace && fs.existsSync(path)) {
        if (_config.debug) _self.log.debug(path + " exists skip generate");
        return;
      }

      _self.log.info("generating github " + path);
      var dir = pathFn.dirname(path);
      mkdirsSync(dir);

      _self.page = page;

      if (page.gh.type === 'get_contents') {
        hs['gh_contents'].call(_self, page);
      }
      else if (page.gh.type === 'get_releases') {
        hs['gh_releases'].call(_self, page);
      }
      else if (page.gh.type === 'get_repos') {
        hs['gh_repos'].call(_self, page)
      }
    }
    return [];
  });
});

//------------> filter
// hexo.extend.filter.register('before_post_render', function (data) {
//   if (data.gh) {
//     if (data.gh.type === 'get_contents') {
//       data.content = hexo.markdown(data.content);
//     }
//   }
// }, 9);

//------------> console
var c = require('./lib/console.js');
hexo.extend.console.register('github', 'Generate github pages', {
  options: [{
    name: '-r, --replace',
    desc: 'Replace existing files'
  }]
}, function (args) {
  var opt = {};
  if (args.r || args.replace) {
    opt.replace = true;
  }

  var _self = this;
  _config.replace = opt.replace;
  return this.load().then(function () {
    var generator = _self.extend.generator.list()['github'];

    var locals = _self.locals.toObject();
    generator.call(_self, locals, opt);

  });
});