import { NextResponse } from 'next/server'

export async function GET() {
  const token = process.env.NOTION_TOKEN_V2
  const dbId = process.env.NOTION_MANUAL_DB_ID?.replace(/-/g, '')

  if (!token || !dbId) {
    return NextResponse.json({ error: 'env vars missing', hasToken: !!token, hasDbId: !!dbId })
  }

  try {
    const res = await fetch('https://www.notion.so/api/v3/loadPageChunk', {
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
    try { data = JSON.parse(text) } catch(_e) {}

    const block = data?.recordMap?.block?.[dbId]?.value

    return NextResponse.json({
      httpStatus: res.status,
      blockType: block?.type ?? null,
      collectionId: block?.collection_id ?? null,
      viewIds: block?.view_ids ?? [],
      hasRecordMap: !!data?.recordMap,
      blockKeys: block ? Object.keys(block) : [],
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message })
  }
}
