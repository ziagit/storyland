<script setup lang="ts">
import { ArrowLeft, Save, Eye, Loader2, CircleCheck, CircleAlert } from '@lucide/vue'
import { categories } from '~/data/categories'
import type { Story } from '../../../../shared/utils/kidstory-api'

definePageMeta({ layout: 'admin' })

const route = useRoute()
const slug = String(route.params.slug)
const adminFetch = useAdminApi()

const ageOptions = [
  { value: '3-5', label: 'Ages 3–5' },
  { value: '6-8', label: 'Ages 6–8' },
  { value: '9-12', label: 'Ages 9–12' },
  { value: 'all-ages', label: 'All Ages' }
]

// The editor works on plain text: paragraphs are separated by a blank line, tags by commas.
const form = reactive({
  title: '',
  emoji: '',
  excerpt: '',
  category: 'adventure',
  ageRange: 'all-ages',
  readTimeMinutes: 2,
  tags: '',
  body: '',
  coverImageUrl: ''
})

const loading = ref(true)
const saving = ref(false)
const error = ref('')
const saved = ref(false)
const publishedAt = ref('')

useSeoMeta({ title: () => (form.title ? `Edit · ${form.title}` : 'Edit story'), robots: 'noindex, nofollow' })

function fill(story: Story) {
  form.title = story.title
  form.emoji = story.emoji
  form.excerpt = story.excerpt
  form.category = story.category
  form.ageRange = story.ageRange
  form.readTimeMinutes = story.readTimeMinutes
  form.tags = story.tags.join(', ')
  form.body = story.body.join('\n\n')
  form.coverImageUrl = story.coverImageUrl ?? ''
  publishedAt.value = story.publishedAt
}

onMounted(async () => {
  try {
    fill(await adminFetch<Story>(`/api/admin/stories/${slug}`))
  } catch (err: any) {
    error.value = err?.data?.statusMessage || 'Could not load this story.'
  } finally {
    loading.value = false
  }
})

const paragraphs = computed(() => form.body.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean))
const wordCount = computed(() => paragraphs.value.join(' ').split(/\s+/).filter(Boolean).length)

async function save() {
  saving.value = true
  error.value = ''
  saved.value = false
  try {
    const story = await adminFetch<Story>(`/api/admin/stories/${slug}`, {
      method: 'PATCH',
      body: {
        ...form,
        tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
        body: paragraphs.value
      }
    })
    fill(story)
    saved.value = true
    setTimeout(() => (saved.value = false), 3000)
  } catch (err: any) {
    error.value = err?.data?.statusMessage || 'Could not save the story.'
  } finally {
    saving.value = false
  }
}

const inputClass = 'w-full rounded-2xl border-2 border-tan bg-white px-4 py-2.5 text-navy outline-none transition-colors focus:border-green'
const labelClass = 'mb-1.5 block text-sm font-bold text-navy'
</script>

<template>
  <div class="mx-auto max-w-6xl px-4 py-8 sm:px-8 sm:py-10">
    <NuxtLink to="/admin/stories" class="inline-flex items-center gap-1.5 text-sm font-bold text-ink-muted hover:text-green">
      <ArrowLeft class="h-4 w-4" /> All stories
    </NuxtLink>

    <div v-if="loading" class="mt-6 space-y-4">
      <div class="h-10 w-2/3 animate-pulse rounded-2xl bg-tan/50" />
      <div class="h-96 animate-pulse rounded-3xl bg-white/70" />
    </div>

    <form v-else class="mt-4" @submit.prevent="save">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <h1 class="flex min-w-0 items-center gap-3 font-heading text-2xl font-extrabold text-navy sm:text-3xl">
          <span>{{ form.emoji }}</span>
          <span class="truncate">{{ form.title || 'Untitled' }}</span>
        </h1>
        <div class="flex items-center gap-2">
          <UiButton :to="`/stories/${slug}`" variant="secondary" target="_blank">
            <Eye class="h-4 w-4" /> View
          </UiButton>
          <UiButton type="submit" variant="primary" :disabled="saving">
            <Loader2 v-if="saving" class="h-4 w-4 animate-spin" />
            <CircleCheck v-else-if="saved" class="h-4 w-4" />
            <Save v-else class="h-4 w-4" />
            {{ saving ? 'Saving…' : saved ? 'Saved' : 'Save changes' }}
          </UiButton>
        </div>
      </div>

      <p v-if="error" class="mt-4 flex items-center gap-2 rounded-2xl bg-coral/10 px-4 py-3 text-sm font-semibold text-coral">
        <CircleAlert class="h-4 w-4 shrink-0" /> {{ error }}
      </p>

      <div class="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section class="space-y-5 rounded-3xl bg-white p-6 shadow-warm">
          <div class="grid gap-4 sm:grid-cols-[1fr_96px]">
            <label>
              <span :class="labelClass">Title</span>
              <input v-model="form.title" required maxlength="200" :class="inputClass" />
            </label>
            <label>
              <span :class="labelClass">Emoji</span>
              <input v-model="form.emoji" maxlength="16" :class="[inputClass, 'text-center text-xl']" />
            </label>
          </div>
          <label class="block">
            <span :class="labelClass">Excerpt</span>
            <textarea v-model="form.excerpt" required rows="2" maxlength="1000" :class="inputClass" />
          </label>
          <label class="block">
            <span class="mb-1.5 flex items-baseline justify-between">
              <span class="text-sm font-bold text-navy">Story</span>
              <span class="text-xs text-ink-muted">{{ paragraphs.length }} paragraphs · {{ wordCount }} words · blank line between paragraphs</span>
            </span>
            <textarea v-model="form.body" required rows="16" :class="[inputClass, 'leading-relaxed']" />
          </label>
        </section>

        <aside class="space-y-5">
          <section class="space-y-4 rounded-3xl bg-white p-6 shadow-warm">
            <label class="block">
              <span :class="labelClass">Category</span>
              <select v-model="form.category" :class="inputClass">
                <option v-for="cat in categories" :key="cat.slug" :value="cat.slug">{{ cat.label }}</option>
              </select>
            </label>
            <label class="block">
              <span :class="labelClass">Age range</span>
              <select v-model="form.ageRange" :class="inputClass">
                <option v-for="a in ageOptions" :key="a.value" :value="a.value">{{ a.label }}</option>
              </select>
            </label>
            <label class="block">
              <span :class="labelClass">Read time (minutes)</span>
              <input v-model.number="form.readTimeMinutes" type="number" min="1" max="5" :class="inputClass" />
            </label>
            <label class="block">
              <span :class="labelClass">Tags</span>
              <input v-model="form.tags" placeholder="kindness, courage" :class="inputClass" />
              <span class="mt-1 block text-xs text-ink-muted">Comma-separated, up to 4.</span>
            </label>
          </section>

          <section class="space-y-3 rounded-3xl bg-white p-6 shadow-warm">
            <span :class="labelClass">Cover</span>
            <div class="aspect-[4/3] overflow-hidden rounded-2xl bg-cream">
              <img v-if="form.coverImageUrl" :src="form.coverImageUrl" alt="" class="h-full w-full object-cover" />
              <span v-else class="flex h-full items-center justify-center text-5xl">{{ form.emoji }}</span>
            </div>
            <input v-model="form.coverImageUrl" placeholder="https://…" :class="[inputClass, 'text-xs']" />
            <p v-if="publishedAt" class="text-xs text-ink-muted">Published {{ new Date(publishedAt).toLocaleString() }}</p>
          </section>
        </aside>
      </div>
    </form>
  </div>
</template>
