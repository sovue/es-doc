<template>
  <Tables-Base
    type="img"
    :data="cgs"
    codeTemplate="scene %"
    file="community_cgs_list"
  />
</template>

<script>
import { communityCgs } from '@dynamic/resources'

export default {
  data() {
    return {
      cgs: communityCgs,
    }
  },
}
</script>
