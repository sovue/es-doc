<template>
  <Tables-Base
    type="img"
    :data="cgs"
    codeTemplate="scene cg %"
    :nsfw="nsfw"
    file="cgs_list"
  />
</template>

<script>
import { cgs } from '@dynamic/resources'

export default {
  data() {
    return {
      nsfw: [
        'd2_sl_swim',
        'd3_sl_bathhouse',
        'd5_dv_us_wash_3',
        'd6_dv_hentai',
        'd6_dv_hentai_2',
        'd6_sl_hentai_1',
        'd6_sl_hentai_2',
        'd6_sl_swim',
        'd7_sl_morning',
        'd7_sl_morning_2',
        'd7_un_hentai',
        'd7_un_hentai_3',
        'd7_un_suicide',
        'epilogue_mi_2',
        'epilogue_mi_3',
        'epilogue_mi_4',
        'epilogue_mi_5',
        'epilogue_mi_6',
        'epilogue_mi_7',
        'epilogue_mi_8',
        'epilogue_un_bad',
        'miku_h_1_cenz',
        'miku_h_2_cenz',
        'uvao_h_cenz',
      ],
      cgs,
    }
  },
}
</script>
