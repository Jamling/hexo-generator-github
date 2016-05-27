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

## Helpers

### gh_opts
Return full <var>page.gh</var>.
If no user assigned in page gh front-matter, the user will set from <var>hexo.config.github.user</var>
If no repo assigned in page gh front-matter, the repo will set from <var>page.path</var>
Sample:

- page.path = p/Android-ORM/ => gh.repo = Android-ORM
- page.path = en/p/Android-ORM/ => gh.repo = Android-ORM (The <var>hexo.config.language</var> must contains **en** in <var>_config.yml</var>)

### gh_repos

Return github user's repos

``` js
{{ gh_repos({user: 'Jamling'}) }}
```

Option | Description | Default
--- | --- | ---
`user` | Github user | <var>config.github.user</var>

### gh_contents

Display github (**markdown file**) contents of repository

``` js
{{ gh_contents({path: 'README'}) }}
```

Option | Description | Default
--- | --- | ---
`user` | Github user | <var>config.github.user</var>
`repo` | Github repo | <var>page.gh.repo</var>
`path` | Github content path | README
`ref` | Github reference | master

### gh_edit

Return edit link of github contents

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

Display github repo releases

``` js
{{ gh_releases() }}
```

Option | Description | Default
--- | --- | ---
`user` | Github user | <var>config.github.user</var>
`repo` | Github repo | <var>page.gh.repo</var>


## License

MIT

[Hexo]: http://hexo.io/
