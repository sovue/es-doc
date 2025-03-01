<template>
  <Tables-Base
    type="img"
    :data="sprites_far"
    codeTemplate="show %"
    file="sprites_far_list"
  />
</template>

<script>
import { sprites_far } from '@dynamic/resources'

export default {
  data() {
    return {
      sprites_far,
    }
  },
}
</script>
