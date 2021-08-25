<template>
  <Tables-Base
    type='audio'
    :data='ambiences'
    :descriptions='descriptions'
    codeTemplate='play ambience ambience_%'
    file='ambiences_list'
  />
</template>

<script>
import { ambiences } from '@dynamic/resources'
import { ambiences as ambiencesDescriptions } from '../../data/descriptions'

export default {
  data() {
    return {
      ambiences,
      descriptions: ambiencesDescriptions
    }
  }
}
</script>
