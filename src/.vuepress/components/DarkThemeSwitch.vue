<template>
  <h3>
    <input
      @change="toggleTheme"
      v-model="dark"
      id="dark-switch"
      type="checkbox"
    />
    <label for="dark-switch">Тёмная тема</label>
  </h3>
</template>

<script>
export default {
  data() {
    return {
      dark: null,
    }
  },
  mounted() {
    this.dark = document.documentElement.classList.contains('dark')
  },
  methods: {
    toggleTheme() {
      document.documentElement.classList[this.dark ? 'add' : 'remove']('dark')
      window.localStorage.setItem('dark', this.dark)
    },
  },
}
</script>
