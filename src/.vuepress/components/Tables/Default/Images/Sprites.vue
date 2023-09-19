<template>
  <Tables-Base
    type="img"
    :data="sprites"
    codeTemplate="show %"
    file="sprites_list"
  />
</template>

<script>
import { sprites } from '@dynamic/resources'

export default {
  data() {
    return {
      sprites,
    }
  },
}
</script>
