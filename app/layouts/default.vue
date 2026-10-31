<template>
  <div class="flex min-h-screen flex-col bg-cream">
    <AppHeader />
    <main class="flex-1">
      <slot />
    </main>
    <AppFooter />
    <ClientOnly>
      <SupportChat />
    </ClientOnly>
  </div>
</template>
