<template>
  <Tables-Base
    type="audio"
    :data="ambiences"
    :descriptions="descriptions"
    codeTemplate="play ambience %"
    file="ambiences_list"
  />
</template>

<script>
import { ambiences } from '@dynamic/resources'
import { ambiences as ambiencesDescriptions } from '@/assets/descriptions'

export default {
  data() {
    return {
      ambiences,
      descriptions: ambiencesDescriptions,
    }
  },
}
</script>
