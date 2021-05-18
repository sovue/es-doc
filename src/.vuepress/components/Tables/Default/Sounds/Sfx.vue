<template>
  <Tables-Base
    type="audio"
    :data="sfx"
    :descriptions="descriptions"
    codeTemplate="play sound sfx_%"
    file="sfx_list"
  />
</template>

<script>
import { sfx } from '@dynamic/resources'
import { sfx as sfxDescriptions } from '@/assets/descriptions'

export default {
  data() {
    return {
      descriptions: sfxDescriptions,
      sfx,
    }
  },
}
</script>
