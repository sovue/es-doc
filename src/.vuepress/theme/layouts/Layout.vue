<template>
  <ParentLayout>
    <template #page-top>
      <FeaturedBanner />
    </template>
    <template #page-bottom>
      <Footer />
    </template>
  </ParentLayout>
</template>

<script>
import ParentLayout from '@parent-theme/layouts/Layout.vue'
import FeaturedBanner from '../../components/Featured/FeaturedBanner'

export default {
  components: {
    FeaturedBanner,
    ParentLayout
  }
}
</script>
