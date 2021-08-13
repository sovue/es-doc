const { resolve } = require('path')
const { writeFileSync } = require('fs')
const { request } = require('@octokit/request')

const { description } = require('../../package')
const resources = require('./assets/resources')
const resourcesCache = require('../../resources-cache.json')

module.exports = {
  /**
   * Ref：https://v1.vuepress.vuejs.org/config/#title
   */
  title: 'ES Doc',
  /**
   * Ref：https://v1.vuepress.vuejs.org/config/#description
   */
  description,

  /**
   * Extra tags to be injected to the page HTML `<head>`
   *
   * ref：https://v1.vuepress.vuejs.org/config/#head
   */
  head: [
    ['link', { rel: 'icon', href: '/images/icons/favicon.webp' }],
    ['link', { rel: 'manifest', href: '/manifest.json' }],
    ['meta', { name: 'theme-color', content: '#CD0000' }],
    ['meta', { name: 'apple-mobile-web-app-capable', content: 'yes' }],
    [
      'meta',
      { name: 'apple-mobile-web-app-status-bar-style', content: 'black' },
    ],
    [
      'link',
      {
        rel: 'apple-touch-icon',
        href: '/images/icons/pwa/apple-touch-icon-152x152.png',
      },
    ],
    [
      'link',
      {
        rel: 'mask-icon',
        href: '/images/icons/pwa/safari-pinned-tab.png',
        color: '#CD0000',
      },
    ],
    [
      'meta',
      {
        name: 'msapplication-TileImage',
        content: '/images/icons/pwa/msapplication-icon-144x144.png',
      },
    ],
    ['meta', { name: 'msapplication-TileColor', content: '#000000' }],
  ],

  /**
   * Theme configuration, here is the default theme configuration for VuePress.
   *
   * ref：https://v1.vuepress.vuejs.org/theme/default-theme-config.html
   */
  themeConfig: {
    repo: 'sovue/es-doc',
    docsDir: 'src',
    docsBranch: 'master',
    lastUpdated: 'Обновлено',
    editLinks: true,
    editLinkText: 'Вы можете помочь улучшить эту страницу!',
    displayAllHeaders: true,
    smoothScroll: true,
    nav: [
      {
        text: 'Руководство',
        link: '/guide/',
      },
      {
        text: 'Таблицы ресурсов',
        items: [
          {
            text: 'Ресурсы игры',
            link: '/resources/default/',
          },
          {
            text: 'Ресурсы сообщества',
            link: '/resources/community/',
          },
        ],
      },
      {
        text: 'Разное',
        link: '/misc/',
      },
    ],
    sidebar: {
      '/guide/': [
        '',
        'videos.md',
        'advanced.md',
        'errors.md',
        'code-examples.md',
      ],
      '/resources/': [
        {
          title: 'Ресурсы игры',
          path: '/resources/default/',
          collapsable: false,
          children: [
            'default/characters.md',
            {
              title: 'Изображения',
              collapsable: false,
              children: ['default/images/bgs.md', 'default/images/cgs.md'],
            },
            {
              title: 'Звуки',
              collapsable: false,
              children: [
                'default/sounds/ambiences.md',
                'default/sounds/music.md',
                'default/sounds/sfx.md',
              ],
            },
          ],
        },
        {
          title: 'Ресурсы сообщества',
          path: '/resources/community/',
          collapsable: false,
          children: [
            {
              title: 'Изображения',
              collapsable: false,
              children: ['community/images/bgs.md', 'community/images/cgs.md'],
            },
            {
              title: 'Звуки',
              collapsable: false,
              children: ['community/sounds/music.md'],
            },
          ],
        },
      ],
      '/misc/': [
        {
          title: 'Разное',
          path: '/misc/',
          collapsable: false,
          children: ['news-sources.md', 'artists.md', 'literature.md'],
        },
      ],
    },
    sidebarDepth: 2,
    logo: '/images/icons/logo.webp',
  },

  markdown: {
    lineNumbers: true,
  },

  /**
   * Apply plugins，ref：https://v1.vuepress.vuejs.org/zh/plugin/
   */
  plugins: [
    [
      '@vuepress/plugin-medium-zoom',
      {
        options: {
          margin: 24,
          background: '#212121',
        },
      },
    ],
    [
      '@vuepress/pwa',
      {
        serviceWorker: true,
        updatePopup: {
          message: 'Доступен новый контент.',
          buttonText: 'Обновить',
        },
      },
    ],
    '@vuepress/plugin-back-to-top',
    'check-md',
    'img-lazy',
    'fulltext-search',
  ],
  configureWebpack: {
    resolve: {
      alias: {
        '@': resolve(__dirname),
      },
    },
  },
  async clientDynamicModules() {
    const { data: latestCommitData } = await request(
      `GET /repos/sovue/es-doc-assets/commits/main`
    )
    let content = ''

    if (resourcesCache.sha && resourcesCache.sha === latestCommitData.sha) {
      content = resourcesCache.data
    } else {
      for (const { name, path } of resources) {
        const { data } = await request(
          `GET /repos/sovue/es-doc-assets/contents/${path}`
        )
        content += `export const ${name}=${JSON.stringify(
          data.map(({ name, download_url }) => ({
            name: name.split('.')[0],
            path: download_url,
          }))
        )};`
      }

      writeFileSync(
        resolve(__dirname, '..', '..', 'resources-cache.json'),
        JSON.stringify({
          sha: latestCommitData.sha,
          data: content,
        })
      )
    }

    return {
      name: 'resources.js',
      content,
    }
  },
}
