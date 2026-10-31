<script setup lang="ts">
import type { StorySummary, BookDigestList } from '../../../shared/utils/kidstory-api'

definePageMeta({ layout: 'admin' })
useSeoMeta({ title: 'Dashboard', robots: 'noindex, nofollow' })

const adminFetch = useAdminApi()

// Only what the agent machine shows on its cards: story count and last story,
// digest count and last digest.
const stories = ref<StorySummary[]>([])
const digests = ref<BookDigestList | null>(null)
const error = ref('')

onMounted(async () => {
  try {
    const [list, digestList] = await Promise.all([
      adminFetch<StorySummary[]>('/api/admin/stories'),
      $fetch<BookDigestList>('/api/books').catch(() => null)
    ])
    stories.value = list
    digests.value = digestList
  } catch (err: any) {
    error.value = err?.data?.statusMessage || err?.message || 'Could not load the latest numbers.'
  }
})
</script>

<template>
  <div class="mx-auto max-w-6xl px-4 py-8 sm:px-8 sm:py-10">
    <p v-if="error" class="mb-4 rounded-2xl bg-coral/10 px-4 py-3 text-sm font-semibold text-coral">{{ error }}</p>
    <AgentMachine
      :story-count="stories.length"
      :digest-count="digests?.total ?? 0"
      :last-story-at="stories[0]?.publishedAt ?? null"
      :last-digest-at="digests?.items[0]?.publishedAt ?? null"
    />
  </div>
</template>
