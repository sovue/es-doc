<template>
  <Tables-Base
    type="img"
    :data="bgs"
    codeTemplate="scene bg %"
    file="bgs_list"
  />
</template>

<script>
import { bgs } from '@dynamic/resources'

export default {
  data() {
    return {
      bgs,
    }
  },
}
</script>
