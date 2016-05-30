# hexo-generator-github

Github generator for [Hexo].

## Installation

``` bash
$ npm install hexo-generator-github --save
```

## Options

``` yaml
github:
  debug: true
  cache_dir: gh_cache
  user: Jamling
  repos: 
    - hexo-theme-nova
    - hexo-generator-github
    - hexo-generator-i18n
```

- **debug**: Whether print debug info
- **cache_dir**: Github response cache dir
- **user**: Github user name
- **repos**: Result repositories, return all repositories of user if **undefined** in <var>_config.yml</var> 

## Front-matter
A `gh` front-maker is nessary in your page to generate github response.

- gh.user the github user, default is github.user in <var>_config.yml</var>, see [gh_opts](#gh_opts)
- gh.repo the github repo, default is fetched from url, see [gh_opts](#gh_opts)
- gh.type 
    - get_repos get repositories from github, see [gh_repos](#gh_repos)
    - get_contents get markdown file under repository, see [gh_contents](#gh_contents)
    - get_releases get releases under repository, see [gh_releases](#gh_releases)

## Helpers

### gh_opts
Return full <var>page.gh</var>.
If no user assigned in page gh front-matter, the user will set from <var>hexo.config.github.user</var>
If no repo assigned in page gh front-matter, the repo will set from <var>page.path</var>
Sample:

- page.path = p/Android-ORM/ => gh.repo = Android-ORM
- page.path = en/p/Android-ORM/ => gh.repo = Android-ORM (The <var>hexo.config.language</var> must contains **en** in <var>_config.yml</var>)

### gh_repos

Return array of github user's repos

``` htmlbars
  {% for p in gh_repos() %}
    <!--<div class="col-sx-6 col-sm-6 col-md-6 col-lg-6">-->
      <div class="panel panel-default" id="project">
        <div class="panel-heading">
        
          <h3>
          <a href="https://github.com/{{p.owner.login}}/">{{p.owner.login}}</a>
          /
          <a href="./{{ p.name }}"> {{ p.name }}</a>
          </h3>
        </div>
        <div class="panel-body">
          <p>{{ p.description }}</p>
        </div>
        <div class="panel-footer">
        </div>
      </div>
    <!--</div>-->
  {% endfor %}

```

Option | Description | Default
--- | --- | ---
`user` | Github user | <var>config.github.user</var>

### gh_contents

Return github (**markdown file**) contents of repository

``` js
{% page.content = gh_contents({path: 'README'}) %}
```
So the page content will be replaced of content of github.

Option | Description | Default
--- | --- | ---
`user` | Github user | <var>config.github.user</var>
`repo` | Github repo | <var>page.gh.repo</var>
`path` | Github content path | README
`ref` | Github reference | master

### gh_edit

Return edit link string of github contents

``` js
{{ gh_edit({path: 'README'}) }}
```

Option | Description | Default
--- | --- | ---
`user` | Github user | <var>config.github.user</var>
`repo` | Github repo | <var>page.gh.repo</var>
`path` | Github content path | README
`ref` | Github reference | master

### gh_releases

Return array of github repo releases

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

## Reference

- [Github Developer](https://developer.github.com/): see more properties of github response.
- [hexo-theme-nova](https://github.com/Jamling/hexo-theme-nova): the nova theme used this plugin to generate project pages.

## License

MIT

[Hexo]: http://hexo.io/
