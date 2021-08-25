<template>
  <Tables-Base
    type='audio'
    :data='music'
    :descriptions='descriptions'
    codeTemplate='play music music_list["%"]'
    file='music_list'
  />
</template>

<script>
import { music } from '@dynamic/resources'
import { music as musicDescriptions } from '../../data/descriptions'

export default {
  data() {
    return {
      music,
      descriptions: musicDescriptions
    }
  }
}
</script>
