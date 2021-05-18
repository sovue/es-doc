<template>
  <div>
    <details class="custom-block details">
      <summary>Оглавление</summary>
      <div class="table-of-contents">
        <ul>
          <li v-for="{ name } in data" :key="name">
            <a :href="'#' + name">
              {{ name }} {{ descriptions ? `- ${descriptions[name]}` : '' }}
            </a>
          </li>
        </ul>
      </div>
    </details>

    <ListDownloadLink :data="downloadData" :file="`${file}.txt`" />
    <table>
      <thead>
        <tr>
          <th>Код</th>
          <th>Предпросмотр</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="{ name, path } in data" :key="name" :id="name">
          <td>
            <a :href="'#' + name">#</a>
            <code>{{ codeTemplate.replace('%', name) }}</code>
            <p v-if="descriptions && descriptions[name]">
              {{ descriptions[name] }}
            </p>
          </td>
          <td>
            <img-lazy
              v-if="type === 'img'"
              :alt="name"
              :src="path"
              :class="{ nsfw: nsfw && nsfw.includes(name) }"
            />
            <audio
              v-else-if="type === 'audio'"
              :src="path"
              :type="`audio/${path.split('/').pop().split('.').pop()}`"
              preload="auto"
              controls
            ></audio>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script>
export default {
  props: {
    type: String,
    data: Array,
    descriptions: Object,
    codeTemplate: String,
    nsfw: Array,
    file: String,
  },
  computed: {
    downloadData() {
      return this.data.map(({ name }) => {
        const obj = {
          code: this.codeTemplate.replace('%', name),
        }
        if (this.descriptions && this.descriptions[name]) {
          obj.description = this.descriptions[name]
        }

        return obj
      })
    },
  },
  updated() {
    this.scrollToHash()
  },
  mounted() {
    this.scrollToHash()
  },
  methods: {
    scrollToHash() {
      if (window.location.hash) {
        this.$nextTick(() => {
          window.location.replace(window.location.hash)
        })
      }
    },
  },
}
</script>
