<template>
  <div>
    <details class="custom-block details">
      <summary>Оглавление</summary>
      <div class="table-of-contents">
        <ul>
          <li v-for="{ name } in data" :key="name">
            <a :href="'#' + name">
              {{ name }} {{ descriptions ? `- ${descriptions[name]}` : '' }}
              {{ genres ? `(${genres[name]})` : '' }}
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
        <tr
          v-for="{ name, path } in data"
          class="scroll-margin"
          :key="name"
          :id="name"
        >
          <td>
            <a :href="'#' + name">#</a>
            <code>{{ codeTemplate.replace('%', name) }}</code>
          </td>
          <td>
            <img
              v-if="type === 'img'"
              :alt="name"
              :src="path"
              :class="{ nsfw: nsfw && nsfw.includes(name) }"
            />
            <aplayer
              v-else-if="type === 'audio'"
              :music="{
                title: descriptions[name],
                artist: genres ? `${genres[name]}` : ' ',
                src: path,
              }"
              preload="auto"
              @volumechange="changeVolume($event.target.volume)"
            />
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script>
import Aplayer from 'vue-aplayer'

export default {
  props: {
    type: String,
    data: Array,
    descriptions: Object,
    genres: Object,
    codeTemplate: String,
    nsfw: Array,
    file: String,
    volume: {
      type: Number,
      default: 0.5,
    },
  },
  components: {
    Aplayer,
  },
  computed: {
    downloadData() {
      return this?.data?.map(({ name }) => {
        const obj = {
          code: this.codeTemplate.replace('%', name),
        }
        if (this.descriptions && this.descriptions[name]) {
          obj.description = this.descriptions[name]
        }
        if (this.genres && this.genres[name]) {
          obj.genre = this.genres[name]
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
    changeVolume(newVolume) {
      this.volume = newVolume
      const audioElements = document.getElementsByTagName('audio')
      for (const audioElement of audioElements) {
        audioElement.volume = newVolume
      }
    },
  },
}
</script>

<style scoped>
.scroll-margin {
  scroll-margin-top: 5rem;
}
table {
  table-layout: fixed;
  width: 100%;
}

th,
td {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: normal; /* changed from nowrap to normal */
  word-break: break-all; /* added to allow word breaks */
}

td:first-child {
  width: 40%; /* adjust the width to fit your needs */
}

td:last-child {
  width: 60%; /* adjust the width to fit your needs */
}

aplayer {
  width: 100%;
  height: 30px; /* adjust the height to fit your needs */
  overflow: hidden; /* added to prevent overflow */
}
</style>
