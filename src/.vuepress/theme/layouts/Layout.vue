<template>
  <ParentLayout>
    <template #page-bottom>
      <Footer />
    </template>
  </ParentLayout>
</template>

<script>
import ParentLayout from '@parent-theme/layouts/Layout.vue'

export default {
  components: {
    ParentLayout,
  },
}
</script>
