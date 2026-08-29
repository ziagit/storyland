/** Whether this user has purchased full access (a row exists in `entitlements`). */
export async function hasFullAccess(userId: string): Promise<boolean> {
  const supabase = useSupabaseAdmin()
  const { data, error } = await supabase
    .from('entitlements')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }
  return !!data
}
