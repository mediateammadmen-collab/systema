import { getCreatives, toErrorPayload } from '@/lib/dashboard'

// Same query params (range, start, end) and the same JSON shape the page uses.
export async function GET(request) {
  const params = Object.fromEntries(request.nextUrl.searchParams)
  try {
    return Response.json(await getCreatives(params))
  } catch (err) {
    const { status, kind, ...body } = toErrorPayload(err)
    return Response.json(kind === 'env' ? { error: body.error, missing: body.missing } : body, { status })
  }
}
