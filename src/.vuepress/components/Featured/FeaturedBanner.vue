<template>
  <div v-if='featured' class='wrapper'>
    <div class='custom-block info'>
      <div class='body'>
        <div class='img-container'>
          <img v-if='featured.img' :alt='`${featured.title}-img`' :src='featured.img' />
        </div>
        <div class='content'>
          <div>
            <p class='title'>{{ featured.title }}</p>
            <p v-if='!isFullDescription'>{{ featured.body.length > 300 ? `${featured.body.slice(0, 297)}...` : featured.body }}</p>
            <details v-if='featured.body.length > 300' @click='isFullDescription = !isFullDescription'>
              <summary>Полное описание</summary>
              <p>
                {{featured.body}}
              </p>
            </details>
          </div>
          <div v-if='featured.links' class='links'>
            <a v-for='({text, url}) in featured.links' :key='text' :href='url' target='_blank'
               rel='noopener noreferrer'>
              {{ text }}
            </a>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { DATA } from './data'

const getRandomFeatured = () => {
  // Get last index from localStorage
  const savedLastIndex = JSON.parse(window.localStorage.getItem('lastBannerIndex'))
  // Get indexes array
  let indexes = Object.keys(DATA)
  // If there is last index in storage
  if (savedLastIndex) {
    // Exclude it from the indexes
    // so it won't appear again
    indexes.slice(savedLastIndex, 1)
  }
  // Select new random index from available
  const randomIndex = Math.floor(Math.random() * indexes.length)
  // Save new index to storage
  window.localStorage.setItem('lastBannerIndex', JSON.stringify(randomIndex))

  return DATA[indexes[randomIndex]]
}

export default {
  data() {
    return {
      featured: null,

      isFullDescription: false
    }
  },
  watch: {
    $route(from, to) {
      // Ignore hash change
      if (from.path !== to.path) {
        this.featured = getRandomFeatured()
      }
    }
  },
  beforeMount() {
    this.featured = getRandomFeatured()
  }
}
</script>

<style lang='stylus' scoped>
.wrapper {
  position: relative;
  top: 4.5rem;
  display: flex;
  justify-content: center;
}

.custom-block {
  max-width: $contentWidth;

  &.info {
    margin: 0 1rem;
    padding: 0.1rem 1.5rem;
    border-left-width: 0.5rem;
    border-left-style: solid;
    background-color: rgba(84, 199, 236, 0.3);
    border-color: #3b8ba5;
  }

  .body {
    display: flex;
    flex-direction: row;
    grid-column-gap: 1.5rem;
    grid-row-gap: 1rem;
    margin: 1rem 0;

    .img-container {
      img {
        display: block;
        max-width: 25vw;
        max-height: 25vh;
        width: auto;
        height: auto;
      }
    }

    @media screen and (max-width: 768px) {
      flex-direction: column;

      .img-container {
        display: flex;
        justify-content: center;

        img {
          max-height: 40vh;
          max-width: 40vw;
        }
      }
    }
  }

  .content {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: space-between;

    .title {
      font-weight: 600;
      margin: 0 0 -0.4rem 0;
      color: #3b8ba5;
    }

    details {
      margin-top: 1rem;
    }

    .links {
      display: flex;
      flex-direction: row;
      grid-column-gap: 1rem;
      align-self: flex-end;
    }
  }
}
</style>
