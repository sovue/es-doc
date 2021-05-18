<template>
  <Tables-Base
    type="img"
    :data="bgs"
    codeTemplate="scene %"
    file="community_bgs_list"
  />
</template>

<script>
import { communityBgs } from '@dynamic/resources'

export default {
  data() {
    return {
      bgs: communityBgs,
    }
  },
}
</script>
