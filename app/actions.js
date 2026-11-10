'use server'

import { revalidatePath, updateTag } from 'next/cache'

/** Refresh button: expire every cached Meta response and re-render "/". */
export async function refreshMetaData() {
  updateTag('meta')
  revalidatePath('/')
}
