## hexo-generator-github

[![Build Status](https://travis-ci.org/Jamling/hexo-generator-github.svg?branch=master)](https://travis-ci.org/Jamling/hexo-generator-github)
[![node](https://img.shields.io/node/v/hexo-generator-github.svg)](https://www.npmjs.com/package/hexo-generator-github)
[![npm downloads](https://img.shields.io/npm/dt/hexo-generator-github.svg)](https://www.npmjs.com/package/hexo-generator-github)
[![npm version](https://img.shields.io/npm/v/hexo-generator-github.svg)](https://www.npmjs.com/package/hexo-generator-github)
[![GitHub release](https://img.shields.io/github/release/jamling/hexo-generator-github.svg)](https://github.com/Jamling/hexo-generator-github/releases/latest)

一款将Github上的项目文档复制到[Hexo]博客的插件，特别适用于项目博客站点.

## 安装

``` bash
$ npm install hexo-generator-github --save
```

## 使用

hexo-generator-github 可以作为辅助函数/生成器/命令行插件使用。`hexo server`及`hexo generate`将会调用本插件的生成器生成github相关页面的缓存。

``` bash
$ hexo github [-r --replace]
```

如果命令中带`-r`或`--replace`选项，那么此生成器将会忽略已经存在的github缓存，并重新生成。

## 配置

``` yaml
github:
  debug: true # enable debug to log github api request/response
  user: Jamling # your github user name
  timeout: 60000 # set the github api request timeout
  token: your_token # 添加token，github api的60次的访问限制将上升到5000，
  cache_dir: gh_cache # the response of github api will store under the directory.
  repos: # request following repositories, otherwise, all repositories (limit 100) of user will be requested.
    - SmartIM4Eclipse
    - SmartIM4IntelliJ
    - hexo-theme-nova
    - hexo-generator-i18n
    - hexo-generator-github
    - hexo-generator-index2
    - hexo-filter-highlight
    - Android-ORM
    - eclipse-explorer
    - QuickAF
  navs: # project page left default nav menu, you can config for each project in ${blog}/_data/projects.yml
    overview: index.html
    index: index.html
    start: start.html
    release: release.html
    download: download.html
    userguide: userguide.html
    change: change.html
```

- **debug**: 是否在控制台输出debug信息
- **cache_dir**: Github缓存目录
- **user**: Github用户名
- **repos**: Github项目列表，如果未配置此项，那么`gh_repos()`将返回用户所有的项目
- **token**: 参考 ![New token](https://raw.githubusercontent.com/Jamling/hexo-generator-github/master/add_token.png) 来生成token以突破github api访问次数限制

## Front-matter
本插件引入了一个名为`gh`的front-matter来指引如何生成github相关的页面。

- gh.user 指定github用户名，默认为<var>_config.yml</var>配置的github.user，参考[gh_opts](#gh_opts)
- gh.repo 指定github项目，默认从url中获取，请参考[gh_opts](#gh_opts)
- gh.type 
    - get_repos 获取github项目，参考[gh_repos](#gh_repos)
    - get_contents 获取github项目中的Markdown文件内容，参考[gh_contents](#gh_contents)
    - get_releases 获取github项目的发布，参考[gh_releases](#gh_releases)

## 辅助函数

### gh_opts
返回完整的<var>page.gh</var>对象
如果gh front-matter中未指定用户名，那么默认用户名为使用配置中的<var>hexo.config.github.user</var>值
如果gh front-matter中未指定项目，那么项目名称将从<var>page.path</var>中获取
示例：

- page.path = p/Android-ORM/ 那么 gh.repo = Android-ORM
- page.path = en/p/Android-ORM/ 那么 gh.repo = Android-ORM (本插件支持国际化，<var>_config.yml</var>中的<var>hexo.config.language</var>必须包含**en**配置项)

### gh_repos

返回github上用户拥有的项目（Array）

``` htmlbars
  {%- for p in gh_repos() %}
    <!--<div class="col-sx-6 col-sm-6 col-md-6 col-lg-6">-->
      <div class="panel panel-default project">
        <div class="panel-heading">
          <h3>
            <span class="icon nova-repo black-text"></span>
            <a href="./{{ p.name }}" target="_blank" title="{{p.name}}"> {{ p.name }}</a>
            <a href="https://github.com/{{p.owner.login}}/{{p.name}}" target="_blank" title="view on github"><span aria-hidden="true" class="icon nova-github right black-text"></span></a>
          </h3>
        </div>
        <div class="panel-body">
          <p>{{ p.description }}</p>
        </div>
        <div class="panel-footer">
          <iframe src="https://ghbtns.com/github-btn.html?user={{p.owner.login}}&repo={{p.name}}&&type=star&count=true" class="github-iframe" height="20" width="110"></iframe>
          <iframe src="https://ghbtns.com/github-btn.html?user={{p.owner.login}}&repo={{p.name}}&&type=fork&count=true" class="github-iframe" height="20" width="110"></iframe>
        </div>
      </div>
    <!--</div>-->
  {% endfor %}

```

选项 | 描述 | 默认值
--- | --- | ---
`user` | Github user | <var>config.github.user</var>

### gh_contents

返回github项目中的(**markdown文件**)内容（String）

示例（设置hexo页面的内容与github项目中某个文件的内容）：

``` js
{% set page.content = gh_contents() %}
```

Option | Description | Default
--- | --- | ---
`user` | Github user | <var>config.github.user</var>
`repo` | Github repo | <var>page.gh.repo</var>
`path` | Github content path | README
`ref` | Github reference | master

### gh_releases

返回github项目发布（Array）

``` htmlbars
{% for p in gh_releases() %}
<div class="release">
  <div class="header">
    <a href="{{p.html_url}}">{{p.name}}</a>
    <a href="{{p.author.html_url}}">{{p.author.login}}</a> released this on {{gh_time(p.published_at)}}
  </div>
  <div class="markdown-body">
    {{markdown(p.body)}}
  </div>
  <h2 class="release-downloads-header">Downloads</h2>
  <ul class="release-downloads">
    {% for d in p.assets %}
    <li><a href="{{d.browser_download_url}}">
      <strong>{{d.name}}</strong> ({{d.download_count}} downloads)</a>
    </li>
    {%- endfor %}
  </ul>
</div>
{% endfor %}
```

Option | Description | Default
--- | --- | ---
`user` | Github user | <var>config.github.user</var>
`repo` | Github repo | <var>page.gh.repo</var>

### gh_edit_link

返回github项目中的(**markdown文件**)内容的编辑地址（String）

``` js
{{ gh_edit_link() }}
```

Option | Description | Default
--- | --- | ---
`user` | Github user | <var>config.github.user</var>
`repo` | Github repo | <var>page.gh.repo</var>
`path` | Github content path | README
`ref` | Github reference | master


## Reference

- [Github Developer](https://developer.github.com/): github开发者文档
- [hexo-theme-nova](https://github.com/Jamling/hexo-theme-nova): Hexo Nova主题

## License

MIT

[Hexo]: http://hexo.io/
