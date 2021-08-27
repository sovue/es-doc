<template>
  <div class='wrapper'>
    <div class='custom-block info'>
      <div class='body'>
        <div class='img-container'>
          <img v-if='featured.img' :alt='`${featured.title}-img`' :src='featured.img' />
        </div>
        <div class='content'>
          <div>
            <p class='title'>{{ featured.title }}</p>
            <p>{{ featured.body }}</p>
          </div>
          <hr />
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

const getRandomFeatured = () => DATA[Math.floor(Math.random() * DATA.length)]

export default {
  data() {
    return {
      featured: getRandomFeatured()
    }
  },
  watch: {
    $route(from, to) {
      // Ignore hash change
      if (from.path !== to.path) {
        this.featured = getRandomFeatured()
      }
    }
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

    @media screen and (max-width: 768px) {
      flex-direction: column;

      .img-container {
        display: flex;
        justify-content: center;
      }
    }

    .img-container {
      img {
        display: block;
        max-width: 250px;
        max-height: 300px;
        width: auto;
        height: auto;
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

    .links {
      display: flex;
      flex-direction: row;
      grid-column-gap: 1rem;
      align-self: flex-end;
    }
  }
}
</style>
