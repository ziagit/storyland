<script setup lang="ts">
import type { LucideIcon } from '@lucide/vue'

withDefaults(defineProps<{ label: string; icon?: LucideIcon; active?: boolean }>(), { icon: undefined, active: false })
</script>

<template>
  <span
    class="inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold capitalize transition-all duration-200 hover:-translate-y-0.5"
    :class="
      active
        ? 'bg-coral text-white shadow-warm'
        : 'bg-tan text-navy hover:bg-coral/20'
    "
  >
    <component :is="icon" v-if="icon" class="h-3.5 w-3.5" :stroke-width="2.5" aria-hidden="true" />
    {{ label }}
  </span>
</template>
