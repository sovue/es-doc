<template>
  <Tables-Base
    type="audio"
    :data="music"
    codeTemplate='play music music_list["%"]'
    file="music_list"
  />
</template>

<script>
import { music } from '@dynamic/resources'

export default {
  data() {
    return {
      music,
    }
  },
}
</script>
