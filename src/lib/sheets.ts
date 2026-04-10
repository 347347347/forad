import { google } from 'googleapis'
import { Product } from '@/types'

function getAuth() {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_JSON) throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON is not set')
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON)
  return new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  })
}

const MASTER_SHEET_ID = '1zbvlKGFDlpcRpQaPRq5s95gJce8RlzWqnvhIOyjU8EQ'

function normalizeTitle(title: string): string {
  return title.replace(/【[^】]*】/g, '').trim()
}

export async function getSpreadsheetIdByTitle(title: string): Promise<string | null> {
  const auth = getAuth()
  const sheets = google.sheets({ version: 'v4', auth })
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: MASTER_SHEET_ID,
    range: 'マスター!A:B',
  })
  const rows = res.data.values ?? []
  const normalizedInput = normalizeTitle(title)
  const matched = rows.slice(1).find((row: string[]) => normalizeTitle(row[0] ?? '') === normalizedInput)
  return matched?.[1] ?? null
}

export function getSheetUrl(spreadsheetId: string): string {
  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`
}

// import商品情報: A=商品番号, B=欠番フラグ, C=更新日, D=メーカー, E=商品名
export async function getProducts(spreadsheetId: string, month: string): Promise<Product[]> {
  const auth = getAuth()
  const sheets = google.sheets({ version: 'v4', auth })
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'import商品情報!A:E',
  })
  const rows = res.data.values ?? []
  const [filterYear, filterMonth] = month.split('/').map(Number)

  return rows
    .slice(1)
    .filter((row: string[]) => {
      if (!row[0]?.trim()) return false
      const dateStr = row[2] ?? ''
      if (!dateStr) return false
      const d = new Date(dateStr)
      if (isNaN(d.getTime())) return false
      return d.getFullYear() === filterYear && d.getMonth() + 1 === filterMonth
    })
    .map((row: string[]) => ({
      no: row[0] ?? '',
      isAbsent: row[1]?.toString().toUpperCase() === 'TRUE',
      maker: row[3] ?? '',
      name: row[4] ?? '',
    }))
}

export interface InputItem {
  label: string
  done: boolean
}

export interface ProductProgress {
  productNo: string
  items: InputItem[]
  allNA: boolean // 全項目が#N/Aの場合
}

// D列=商品番号, J列=検証項目ラベル, P列=評価完了回数
// 5行目以降、「自動」と「#N/A」除外、商品番号ごとにグループ化
async function getProgressByProduct(spreadsheetId: string, tabName: string): Promise<ProductProgress[]> {
  const auth = getAuth()
  const sheets = google.sheets({ version: 'v4', auth })

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `'${tabName}'!A:P`,
  })

  const rows = res.data.values ?? []
  // 5行目以降（index 4〜）
  const dataRows = rows.slice(4)

  // 商品番号ごとにグループ化
  const map = new Map<string, InputItem[]>()

  for (const row of dataRows) {
    const productNo = row[3]?.toString().trim() // D列
    const label = row[9]?.toString().trim()     // J列
    const pVal = row[15]?.toString().trim()     // P列

    if (!productNo || !label) continue
    if (label === '自動') continue

    if (!map.has(productNo)) map.set(productNo, [])
    const items = map.get(productNo)!

    // 同一商品内での重複ラベルはスキップ
    if (items.find(i => i.label === label)) continue

    items.push({ label, done: pVal === '1' })
  }

  const result: ProductProgress[] = []
  for (const [productNo, items] of map.entries()) {
    // 全項目が#N/Aかチェック
    const nonNA = items.filter(i => i.label !== '#N/A')
    const allNA = nonNA.length === 0
    result.push({
      productNo,
      items: nonNA, // #N/Aは表示しない
      allNA,
    })
  }

  return result
}

export async function getQuantProgress(spreadsheetId: string): Promise<ProductProgress[]> {
  return getProgressByProduct(spreadsheetId, '【定量】検証結果入力フォーム')
}

export async function getFuncProgress(spreadsheetId: string): Promise<ProductProgress[]> {
  return getProgressByProduct(spreadsheetId, '【機能】検証結果入力フォーム')
}
