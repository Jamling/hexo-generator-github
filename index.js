'use strict';

var gh = require('./lib/helper');
var debug = hexo.config.github.debug;
var helper = hexo.extend.helper;
helper.register('gh_opts', gh.opts);
helper.register('gh_repos', gh.repos);
helper.register('gh_releases', gh.releases);
helper.register('gh_contents', gh.contents);
helper.register('gh_edit', gh.raw);
helper.register('gh_cache_dir', gh.cacheDir);// internal helper
helper.register('gh_read_cache', gh.read);
helper.register('gh_write_cache', gh.write);

hexo.extend.generator.register('github', require('./lib/generator'));

// console
var c = require('./lib/console.js');
hexo.extend.console.register('github', c.desc, c.opts, c.github);