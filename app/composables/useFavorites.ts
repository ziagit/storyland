const favorites = ref<string[]>([])
let loaded = false

function load() {
  if (loaded || !import.meta.client) return
  loaded = true
  try {
    const stored = localStorage.getItem('kidstory-favorites')
    favorites.value = stored ? JSON.parse(stored) : []
  } catch {
    favorites.value = []
  }
}

function persist() {
  if (!import.meta.client) return
  localStorage.setItem('kidstory-favorites', JSON.stringify(favorites.value))
}

export function useFavorites() {
  load()

  function isFavorite(slug: string) {
    return favorites.value.includes(slug)
  }

  function toggleFavorite(slug: string) {
    if (isFavorite(slug)) {
      favorites.value = favorites.value.filter((s) => s !== slug)
    } else {
      favorites.value = [...favorites.value, slug]
    }
    persist()
  }

  return { favorites, isFavorite, toggleFavorite }
}
