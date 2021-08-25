<template>
  <Tables-Base
    type='audio'
    :data='music'
    :descriptions='descriptions'
    codeTemplate='play music %'
    file='community_music_list'
  />
</template>

<script>
import { communityMusic } from '@dynamic/resources'
import { communityMusic as communityMusicDescriptions } from '../../data/descriptions'

export default {
  data() {
    return {
      music: communityMusic,
      descriptions: communityMusicDescriptions
    }
  }
}
</script>
