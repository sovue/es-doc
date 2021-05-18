<template>
  <p>
    <a :href="textData" :download="file"> Скачать список </a>
  </p>
</template>

<script>
export default {
  props: {
    data: Array,
    file: String,
  },
  data() {
    return {
      textData: '',
    }
  },
  mounted() {
    const maxItemLength = Math.max(
      ...this.data.map(({ code, description }) =>
        code && description ? code.length : 0
      )
    )
    const text = this.data
      .map(({ code, description }) => {
        return `${code}${
          description
            ? `${Array(maxItemLength - code.length + 1)
                .fill(' ')
                .join('')}# ${description}`
            : ''
        }`
      })
      .join('\n')

    this.textData = 'data:text/plain;charset=utf-8,' + encodeURIComponent(text)
  },
}
</script>
