<template>
  <Tables-Base
    type="audio"
    :data="music"
    :descriptions="descriptions"
    :genres="genres"
    codeTemplate="play music %"
    file="community_music_list"
  />
</template>

<script>
import { communityMusic } from '@dynamic/resources'
import { communityMusic as communityMusicDescriptions } from '../../data/descriptions'
import { communityMusic as communityMusicGenres } from '../../data/genres'

export default {
  data() {
    return {
      music: communityMusic,
      descriptions: communityMusicDescriptions,
      genres: communityMusicGenres,
    }
  },
}
</script>
