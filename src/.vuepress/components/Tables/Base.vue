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
          <th v-if="genres">Жанр</th>
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
            <p v-if="descriptions && descriptions[name]">
              {{ descriptions[name] }}
            </p>
          </td>
          <td v-if="genres && genres[name]">
            <p>
              {{ genres[name] }}
            </p>
          </td>
          <td>
            <img
              v-if="type === 'img'"
              :alt="name"
              :src="path"
              :class="{ nsfw: nsfw && nsfw.includes(name) }"
            />
            <div v-else-if="type === 'audio'" class="audio-container">
              <audio
                :src="path"
                preload="auto"
                controls
                @play="stopOtherAudio($event)"
                @volumechange="changeVolume($event.target.volume)"
              />
            </div>
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
    genres: Object,
    codeTemplate: String,
    nsfw: Array,
    file: String,
    volume: {
      type: Number,
      default: 0.5,
    },
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
    stopOtherAudio(event) {
      const currentAudio = event.target
      const audioElements = document.getElementsByTagName('audio')
      for (const audioElement of audioElements) {
        if (audioElement !== currentAudio) {
          audioElement.pause()
        }
      }
    },
  },
}
</script>

<style scoped>
.scroll-margin {
  scroll-margin-top: 5rem;
}

.audio-container {
  border: 1px solid #ddd;
  border-radius: 5px;
  padding: 10px;
  background-color: #f5f5f5;
}

.audio-container audio {
  height: 30px;
}
</style>
