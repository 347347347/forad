import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const token = process.env.NOTION_TOKEN_V2
  const dbId = process.env.NOTION_MANUAL_DB_ID?.replace(/-/g, '')

  if (!token || !dbId) {
    return NextResponse.json({ error: 'env vars missing', token: !!token, dbId: !!dbId })
  }

  // まずページチャンクを取得してDBの構造を確認
  const res = await fetch(`https://www.notion.so/api/v3/loadPageChunk`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': `token_v2=${token}`,
    },
    body: JSON.stringify({
      pageId: dbId,
      limit: 10,
      cursor: { stack: [] },
      chunkNumber: 0,
      verticalColumns: false,
    }),
  })

  const text = await res.text()
  let data: any = {}
  try { data = JSON.parse(text) } catch(e) {}

  const block = data?.recordMap?.block?.[dbId]?.value
  const collectionId = block?.collection_id
  const viewIds = block?.view_ids ?? []

  return NextResponse.json({
    status: res.status,
    blockType: block?.type,
    collectionId,
    viewIds,
    rawBlock: block,
  })
}
