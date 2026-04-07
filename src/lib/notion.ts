import { VerificationAxis, Equipment } from '@/types'

const NOTION_TOKEN = () => {
  if (!process.env.NOTION_TOKEN_V2) throw new Error('NOTION_TOKEN_V2 is not set')
  return process.env.NOTION_TOKEN_V2
}

const MANUAL_DB_ID = () => {
  if (!process.env.NOTION_MANUAL_DB_ID) throw new Error('NOTION_MANUAL_DB_ID is not set')
  return process.env.NOTION_MANUAL_DB_ID
}

// token_v2を使ってNotionのAPIを直接叩く
async function notionFetch(endpoint: string, body: object) {
  const res = await fetch(`https://www.notion.so/api/v3/${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': `token_v2=${NOTION_TOKEN()}`,
      'x-notion-active-user-header': '',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`Notion API error: ${res.status} ${await res.text()}`)
  return res.json()
}

// DBをタイトル名でフィルタリングしてページを取得
export async function getManualPage(title: string): Promise<{ id: string } | null> {
  const dbId = MANUAL_DB_ID().replace(/-/g, '')

  const data = await notionFetch('queryCollection', {
    collectionId: dbId,
    collectionViewId: '',
    query: {
      filter: {
        operator: 'and',
        filters: [{
          property: 'タイトル名',
          filter: { operator: 'string_is', value: { type: 'exact', value: title } },
        }],
      },
    },
    loader: { type: 'reducer', reducers: { collection_group_results: { type: 'results', limit: 1 } } },
  })

  const blocks = data?.recordMap?.block ?? {}
  const pageIds = Object.keys(blocks).filter(id => blocks[id]?.value?.parent_id === dbId)
  if (pageIds.length === 0) return null
  return { id: pageIds[0] }
}

// ページ内のブロックを取得
async function getPageBlocks(pageId: string) {
  const data = await notionFetch('loadPageChunk', {
    pageId: pageId.replace(/-/g, ''),
    limit: 100,
    cursor: { stack: [] },
    chunkNumber: 0,
    verticalColumns: false,
  })
  return data?.recordMap?.block ?? {}
}

// 検証軸DB（子データベース）から検証軸一覧を取得
export async function getAxesFromPage(pageId: string): Promise<VerificationAxis[]> {
  const blocks = await getPageBlocks(pageId)
  const axes: VerificationAxis[] = []

  for (const [id, block] of Object.entries(blocks) as any[]) {
    const value = block?.value
    if (!value) continue
    // child_databaseブロックを探す
    if (value.type === 'collection_view' && value.parent_id === pageId.replace(/-/g, '')) {
      const collectionId = value.collection_id
      if (!collectionId) continue

      const dbData = await notionFetch('queryCollection', {
        collectionId,
        collectionViewId: value.view_ids?.[0] ?? '',
        query: {},
        loader: { type: 'reducer', reducers: { collection_group_results: { type: 'results', limit: 50 } } },
      })

      const dbBlocks = dbData?.recordMap?.block ?? {}
      const collection = dbData?.recordMap?.collection?.[collectionId]?.value

      for (const [bid, bblock] of Object.entries(dbBlocks) as any[]) {
        const bval = bblock?.value
        if (!bval || bval.parent_id !== collectionId) continue
        if (bval.type !== 'page') continue

        const titleArr = bval.properties?.title ?? []
        const label = titleArr.map((t: any) => t[0]).join('') || '（未設定）'

        // 内容プロパティを取得（スキーマから内容のキーを探す）
        let detail = ''
        const schema = collection?.schema ?? {}
        for (const [key, sch] of Object.entries(schema) as any[]) {
          if (sch.name === '内容' || sch.name === '詳細' || sch.name === 'description') {
            const prop = bval.properties?.[key] ?? []
            detail = prop.map((t: any) => t[0]).join('')
            break
          }
        }

        axes.push({ id: bid, label, detail, done: false })
      }
      break
    }
  }

  return axes
}

// 備品リスト（箇条書き）を取得
export async function getEquipmentFromPage(pageId: string): Promise<Equipment[]> {
  const blocks = await getPageBlocks(pageId)
  const items: Equipment[] = []
  let inEquipSection = false

  // ページのcontentの順序でブロックを処理
  const pageBlock = blocks[pageId.replace(/-/g, '')]
  const contentIds: string[] = pageBlock?.value?.content ?? []

  for (const bid of contentIds) {
    const block = blocks[bid]?.value
    if (!block) continue

    const text = (block.properties?.title ?? []).map((t: any) => t[0]).join('')

    if ((block.type === 'header' || block.type === 'sub_header' || block.type === 'sub_sub_header') && text.includes('備品')) {
      inEquipSection = true
      continue
    }
    if (inEquipSection && (block.type === 'header' || block.type === 'sub_header' || block.type === 'sub_sub_header')) {
      break
    }
    if (inEquipSection && (block.type === 'bulleted_list' || block.type === 'numbered_list') && text) {
      items.push({ name: text, isShared: text.includes('共用') || text.includes('共有') })
    }
  }

  return items
}

export function getNotionUrl(pageId: string): string {
  return `https://www.notion.so/${pageId.replace(/-/g, '')}`
}
