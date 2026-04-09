import { NextResponse } from 'next/server'

export async function GET() {
  const token = process.env.NOTION_TOKEN_V2
  const dbId = process.env.NOTION_MANUAL_DB_ID?.replace(/-/g, '')

  if (!token || !dbId) {
    return NextResponse.json({ error: 'env vars missing', hasToken: !!token, hasDbId: !!dbId })
  }

  const results: any = { dbId }

  // 試行1: syncRecordValues
  try {
    const res = await fetch('https://www.notion.so/api/v3/syncRecordValues', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `token_v2=${token}`,
      },
      body: JSON.stringify({
        requests: [{ pointer: { table: 'block', id: dbId }, version: -1 }]
      }),
    })
    const text = await res.text()
    let data: any = {}
    try { data = JSON.parse(text) } catch(_e) {}
    const block = data?.recordMap?.block?.[dbId]?.value
    results.syncRecordValues = {
      status: res.status,
      blockType: block?.type ?? null,
      collectionId: block?.collection_id ?? null,
      viewIds: block?.view_ids ?? [],
    }
  } catch (e: any) {
    results.syncRecordValues = { error: e.message }
  }

  // 試行2: getPublicPageData（認証不要で構造確認）
  try {
    const res = await fetch('https://www.notion.so/api/v3/getPublicPageData', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blockId: dbId, name: 'page', saveParent: false, showMoveTo: false }),
    })
    const text = await res.text()
    let data: any = {}
    try { data = JSON.parse(text) } catch(_e) {}
    results.publicPageData = { status: res.status, keys: Object.keys(data) }
  } catch (e: any) {
    results.publicPageData = { error: e.message }
  }

  return NextResponse.json(results)
}
