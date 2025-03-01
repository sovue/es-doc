<template>
  <Tables-Base
    type="img"
    :data="sprites_close"
    codeTemplate="show %"
    file="sprites_close_list"
  />
</template>

<script>
import { sprites_close } from '@dynamic/resources'

export default {
  data() {
    return {
      sprites_close,
    }
  },
}
</script>
