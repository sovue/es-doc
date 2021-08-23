/**
 * Client app enhancement file.
 *
 * https://v1.vuepress.vuejs.org/guide/basic-config.html#app-level-enhancements
 */

export default ({ isServer }) => {
  if (!isServer) {
    let dark = JSON.parse(window.localStorage.getItem('dark'))
    if (dark == null) {
      dark =
        window.matchMedia &&
        window.matchMedia('(prefers-color-scheme: dark)').matches
    }

    if (dark) {
      document.documentElement.classList[dark ? 'add' : 'remove']('dark')
    }
  }
}
