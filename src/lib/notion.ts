import { VerificationAxis, Equipment } from '@/types'

function getToken() {
  if (!process.env.NOTION_TOKEN_V2) throw new Error('NOTION_TOKEN_V2 is not set')
  return process.env.NOTION_TOKEN_V2
}

function getManualDbId() {
  if (!process.env.NOTION_MANUAL_DB_ID) throw new Error('NOTION_MANUAL_DB_ID is not set')
  // ハイフンなしの32文字に正規化
  return process.env.NOTION_MANUAL_DB_ID.replace(/-/g, '')
}

// token_v2でNotionの非公式APIを叩く
async function notionPost(endpoint: string, body: object) {
  const res = await fetch(`https://www.notion.so/api/v3/${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': `token_v2=${getToken()}`,
      'notion-audit-log-heartbeat': 'false',
    },
    body: JSON.stringify(body),
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`Notion API error: ${res.status} ${text}`)
  return JSON.parse(text)
}

// ページのブロックを取得
async function loadPageChunk(pageId: string) {
  const data = await notionPost('loadPageChunk', {
    pageId,
    limit: 100,
    cursor: { stack: [] },
    chunkNumber: 0,
    verticalColumns: false,
  })
  return data?.recordMap ?? {}
}

// DBをタイトル名で検索してページIDを返す
export async function getManualPage(title: string): Promise<{ id: string } | null> {
  const dbId = getManualDbId()

  // まずDBページ自体を読み込んでcollection_idを取得
  const rm = await loadPageChunk(dbId)
  const blocks = rm.block ?? {}
  const dbBlock = blocks[dbId]?.value

  if (!dbBlock) return null

  const collectionId = dbBlock.collection_id
  const viewIds = dbBlock.view_ids ?? []
  if (!collectionId || viewIds.length === 0) return null

  // コレクションをクエリ
  const data = await notionPost('queryCollection', {
    collectionId,
    collectionViewId: viewIds[0],
    query2: {
      filter: {
        operator: 'and',
        filters: [{
          property: 'タイトル名',
          filter: {
            operator: 'string_is',
            value: { type: 'exact', value: title },
          },
        }],
      },
    },
    loader: {
      type: 'table',
      limit: 10,
      searchQuery: '',
      userTimeZone: 'Asia/Tokyo',
    },
  })

  const resultBlockIds: string[] = data?.result?.blockIds ?? []
  if (resultBlockIds.length === 0) return null

  return { id: resultBlockIds[0] }
}

// 手順書ページ内の検証軸DB（child_database）から検証軸を取得
export async function getAxesFromPage(pageId: string): Promise<VerificationAxis[]> {
  const rm = await loadPageChunk(pageId)
  const blocks = rm.block ?? {}
  const pageBlock = blocks[pageId]?.value
  if (!pageBlock) return []

  const contentIds: string[] = pageBlock.content ?? []
  const axes: VerificationAxis[] = []

  for (const bid of contentIds) {
    const block = blocks[bid]?.value
    if (!block) continue
    if (block.type !== 'collection_view' && block.type !== 'collection_view_page') continue

    const collectionId = block.collection_id
    if (!collectionId) continue
    const viewIds = block.view_ids ?? []

    const data = await notionPost('queryCollection', {
      collectionId,
      collectionViewId: viewIds[0] ?? '',
      query2: {},
      loader: { type: 'table', limit: 100, userTimeZone: 'Asia/Tokyo' },
    })

    const resultBlockIds: string[] = data?.result?.blockIds ?? []
    const rmBlocks = data?.recordMap?.block ?? {}
    const collection = data?.recordMap?.collection?.[collectionId]?.value
    const schema = collection?.schema ?? {}

    // 内容プロパティのキーを探す
    let detailKey = ''
    for (const [key, sch] of Object.entries(schema) as any[]) {
      if (['内容', '詳細', 'description', 'detail'].includes(sch.name)) {
        detailKey = key
        break
      }
    }

    for (const bid of resultBlockIds) {
      const b = rmBlocks[bid]?.value
      if (!b) continue
      const label = (b.properties?.title ?? []).map((t: any) => t[0]).join('') || '（未設定）'
      const detail = detailKey
        ? (b.properties?.[detailKey] ?? []).map((t: any) => t[0]).join('')
        : ''
      axes.push({ id: bid, label, detail, done: false })
    }
    break // 最初のDBだけ使う
  }

  return axes
}

// 手順書ページ内の備品リスト（箇条書き）を取得
export async function getEquipmentFromPage(pageId: string): Promise<Equipment[]> {
  const rm = await loadPageChunk(pageId)
  const blocks = rm.block ?? {}
  const pageBlock = blocks[pageId]?.value
  if (!pageBlock) return []

  const contentIds: string[] = pageBlock.content ?? []
  const items: Equipment[] = []
  let inEquipSection = false

  for (const bid of contentIds) {
    const block = blocks[bid]?.value
    if (!block) continue
    const text = (block.properties?.title ?? []).map((t: any) => t[0]).join('')

    if (['header', 'sub_header', 'sub_sub_header'].includes(block.type)) {
      if (text.includes('備品')) {
        inEquipSection = true
      } else if (inEquipSection) {
        break
      }
      continue
    }

    if (inEquipSection && ['bulleted_list', 'numbered_list'].includes(block.type) && text) {
      items.push({ name: text, isShared: text.includes('共用') || text.includes('共有') })
    }
  }

  return items
}

export function getNotionUrl(pageId: string): string {
  return `https://www.notion.so/${pageId.replace(/-/g, '')}`
}
