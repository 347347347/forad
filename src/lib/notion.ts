import { Client } from '@notionhq/client'
import { VerificationAxis, Equipment } from '@/types'

const notion = new Client({ auth: process.env.NOTION_API_KEY })

const MANUAL_DB_ID = process.env.NOTION_MANUAL_DB_ID!
const EVAL_DB_ID = process.env.NOTION_EVAL_DB_ID!

// タイトル名プロパティでフィルタリングして手順書ページを取得
export async function getManualPage(title: string) {
  const res = await notion.databases.query({
    database_id: MANUAL_DB_ID,
    filter: {
      property: 'タイトル名',
      rich_text: { equals: title },
    },
    page_size: 1,
  })
  return res.results[0] ?? null
}

// 評価・分析シートページを取得
export async function getEvalPage(title: string) {
  const res = await notion.databases.query({
    database_id: EVAL_DB_ID,
    filter: {
      property: 'タイトル名',
      rich_text: { equals: title },
    },
    page_size: 1,
  })
  return res.results[0] ?? null
}

// 手順書ページ内の検証方法DBを取得（子ブロック内のchild_database）
export async function getAxesFromPage(pageId: string): Promise<VerificationAxis[]> {
  const blocks = await notion.blocks.children.list({ block_id: pageId })

  // child_database ブロックを探す（検証方法DB）
  const dbBlock = blocks.results.find(
    (b: any) => b.type === 'child_database'
  ) as any

  if (!dbBlock) return []

  const dbRes = await notion.databases.query({
    database_id: dbBlock.id,
    page_size: 50,
  })

  return dbRes.results.map((page: any) => {
    const titleProp = page.properties['検証軸'] ?? page.properties['名前'] ?? page.properties['Name']
    const detailProp = page.properties['内容'] ?? page.properties['詳細'] ?? page.properties['description']
    const label = titleProp?.title?.[0]?.plain_text ?? '（未設定）'
    const detail = detailProp?.rich_text?.[0]?.plain_text ?? ''
    return {
      id: page.id,
      label,
      detail,
      done: false,
    }
  })
}

// 手順書ページ内の備品リスト（箇条書き）を取得
export async function getEquipmentFromPage(pageId: string): Promise<Equipment[]> {
  const blocks = await notion.blocks.children.list({ block_id: pageId })

  const equipItems: Equipment[] = []
  let inEquipSection = false

  for (const block of blocks.results as any[]) {
    // 「備品リスト」という見出しを探す
    if (
      (block.type === 'heading_2' || block.type === 'heading_3') &&
      block[block.type]?.rich_text?.[0]?.plain_text?.includes('備品')
    ) {
      inEquipSection = true
      continue
    }
    // 次の見出しに到達したらセクション終了
    if (inEquipSection && (block.type === 'heading_2' || block.type === 'heading_3')) {
      break
    }
    // 箇条書きを取得
    if (inEquipSection && (block.type === 'bulleted_list_item' || block.type === 'numbered_list_item')) {
      const text = block[block.type]?.rich_text?.[0]?.plain_text ?? ''
      if (text) {
        equipItems.push({
          name: text,
          isShared: text.includes('共用') || text.includes('共有'),
        })
      }
    }
  }

  return equipItems
}

// Notionページの公開URLを生成
export function getNotionUrl(pageId: string): string {
  return `https://www.notion.so/${pageId.replace(/-/g, '')}`
}
