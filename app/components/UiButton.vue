<script setup lang="ts">
withDefaults(
  defineProps<{
    to?: string
    variant?: 'primary' | 'secondary'
    type?: 'button' | 'submit'
  }>(),
  { to: undefined, variant: 'primary', type: 'button' }
)
</script>

<template>
  <NuxtLink
    v-if="to"
    :to="to"
    class="group inline-flex items-center gap-2 rounded-full px-6 py-3 font-body font-bold transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-warm active:translate-y-0 active:scale-95"
    :class="
      variant === 'primary'
        ? 'bg-green text-white hover:bg-navy'
        : 'border-2 border-navy/15 bg-white text-navy hover:border-coral hover:text-coral'
    "
  >
    <slot />
  </NuxtLink>
  <button
    v-else
    :type="type"
    class="group inline-flex items-center gap-2 rounded-full px-6 py-3 font-body font-bold transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-warm active:translate-y-0 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-none"
    :class="
      variant === 'primary'
        ? 'bg-green text-white hover:bg-navy'
        : 'border-2 border-navy/15 bg-white text-navy hover:border-coral hover:text-coral'
    "
  >
    <slot />
  </button>
</template>
