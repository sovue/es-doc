/**
 * Client app enhancement file.
 *
 * https://v1.vuepress.vuejs.org/guide/basic-config.html#app-level-enhancements
 */

import ImgLazy from 'vuepress-plugin-img-lazy/ImgLazy'

export default ({
  Vue, // the version of Vue being used in the VuePress app
  options, // the options for the root Vue instance
  router, // the router instance for the app
  siteData, // site metadata
  isServer,
}) => {
  Vue.component(ImgLazy.name, ImgLazy)

  if (!isServer) {
    let dark = JSON.parse(window.localStorage.getItem('dark'))
    if (typeof dark === 'null') {
      dark =
        window.matchMedia &&
        window.matchMedia('(prefers-color-scheme: dark)').matches
    }

    if (dark) {
      document.documentElement.classList[dark ? 'add' : 'remove']('dark')
    }
  }
}
