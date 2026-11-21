<script setup lang="ts">
// The Studio voice agent's animated orb. Each state has its own motion so the
// owner can tell at a glance what the agent is doing.
export type OrbState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'paused'

// `level` is the mic's loudness (0 to 1): while listening, the orb swells with your voice.
const props = withDefaults(defineProps<{ state: OrbState; level?: number }>(), { level: 0 })
const swell = computed(() => (props.state === 'listening' ? 1 + Math.min(1, props.level) * 0.18 : 1))
</script>

<template>
  <div class="orb" :class="`orb--${state}`" aria-hidden="true">
    <span class="orb__ring orb__ring--1" />
    <span class="orb__ring orb__ring--2" />
    <span class="orb__ring orb__ring--3" />
    <span class="orb__core" :style="{ scale: swell }">
      <span class="orb__swirl" />
      <span class="orb__shine" />
      <span class="orb__bars">
        <span v-for="i in 5" :key="i" class="orb__bar" :style="{ animationDelay: `${(i - 1) * 0.12}s` }" />
      </span>
    </span>
  </div>
</template>

<style scoped>
.orb {
  --orb-a: #e36656;
  --orb-b: #f2a38f;
  --orb-c: #2f6f58;
  position: relative;
  width: 9.5rem;
  height: 9.5rem;
  display: grid;
  place-items: center;
}

@media (min-width: 1024px) {
  .orb {
    width: 12rem;
    height: 12rem;
  }
}

.orb__core {
  position: relative;
  transition: scale 0.12s ease-out, filter 0.4s ease;
  width: 62%;
  height: 62%;
  border-radius: 9999px;
  overflow: hidden;
  background: radial-gradient(circle at 35% 30%, var(--orb-b), var(--orb-a) 55%, var(--orb-c));
  box-shadow: 0 20px 45px -15px rgba(227, 102, 86, 0.55);
  animation: breathe 4s ease-in-out infinite;
}

.orb__swirl {
  position: absolute;
  inset: -25%;
  background: conic-gradient(from 0deg, transparent, rgba(255, 255, 255, 0.35), transparent 40%, rgba(47, 111, 88, 0.35), transparent 75%);
  animation: spin 9s linear infinite;
}

.orb__shine {
  position: absolute;
  top: 12%;
  left: 18%;
  width: 34%;
  height: 22%;
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.45);
  filter: blur(6px);
}

.orb__bars {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.3rem;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.orb__bar {
  width: 0.35rem;
  height: 0.6rem;
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.9);
}

.orb__ring {
  position: absolute;
  inset: 19%;
  border-radius: 9999px;
  border: 2px solid var(--orb-a);
  opacity: 0;
}

/* Ready: a slow breath. */
.orb--idle .orb__ring--1 {
  opacity: 0.18;
  inset: 12%;
  animation: breathe 4s ease-in-out infinite;
}

/* Listening: rings ripple outward. */
.orb--listening .orb__core {
  animation: breathe 1.6s ease-in-out infinite;
}
.orb--listening .orb__ring {
  animation: ripple 2.4s ease-out infinite;
}
.orb--listening .orb__ring--2 {
  animation-delay: 0.8s;
}
.orb--listening .orb__ring--3 {
  animation-delay: 1.6s;
}

/* Thinking: the swirl speeds up and the colours shift. */
.orb--thinking .orb__swirl {
  animation-duration: 1.4s;
}
.orb--thinking .orb__core {
  animation: breathe 2s ease-in-out infinite;
  filter: hue-rotate(-25deg) saturate(1.1);
}
.orb--thinking .orb__ring--1 {
  opacity: 0.35;
  inset: 10%;
  border-style: dashed;
  border-color: var(--orb-c);
  animation: spin 6s linear infinite;
}

/* Speaking: sound bars move and the orb pulses with them. */
.orb--speaking .orb__core {
  animation: talk 0.9s ease-in-out infinite;
}
.orb--speaking .orb__bars {
  opacity: 1;
}
.orb--speaking .orb__bar {
  animation: bar 0.9s ease-in-out infinite;
}
.orb--speaking .orb__ring--1 {
  opacity: 0.25;
  inset: 12%;
  border-color: var(--orb-c);
  animation: talk 0.9s ease-in-out infinite;
}

/* Paused: still and dimmed. */
.orb--paused .orb__core {
  animation: none;
  filter: grayscale(0.5) brightness(0.95);
}
.orb--paused .orb__swirl {
  animation-play-state: paused;
}
.orb--paused .orb__bars {
  opacity: 0.6;
}

@keyframes breathe {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
}
@keyframes talk {
  0%,
  100% {
    transform: scale(1);
  }
  30% {
    transform: scale(1.08);
  }
  60% {
    transform: scale(0.98);
  }
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
@keyframes ripple {
  0% {
    inset: 19%;
    opacity: 0.6;
  }
  100% {
    inset: -8%;
    opacity: 0;
  }
}
@keyframes bar {
  0%,
  100% {
    height: 0.6rem;
  }
  50% {
    height: 2.4rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .orb *,
  .orb {
    animation: none !important;
  }
}
</style>
