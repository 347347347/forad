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
      isAbsent: !!(row[1]?.trim()), // B列にチェックがあれば欠番
      maker: row[3] ?? '',
      name: row[4] ?? '',
    }))
}

export interface InputItem {
  label: string
  done: boolean // P列: 1=入力済み, 0=未入力
}

// J列(ラベル)とP列(進捗)を取得、4行目の「自動」除外、重複排除
async function getInputItemsFromTab(spreadsheetId: string, tabName: string): Promise<InputItem[]> {
  const auth = getAuth()
  const sheets = google.sheets({ version: 'v4', auth })
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `'${tabName}'!J:P`,
  })

  const rows = res.data.values ?? []
  const seen = new Set<string>()
  const items: InputItem[] = []

  rows.slice(1).forEach((row: string[], i: number) => {
    const label = row[0]?.trim() // J列
    const pVal = row[6]?.trim()  // P列（J〜P = 7列、index 6）

    if (!label) return
    if (label === '自動') return
    if (seen.has(label)) return
    seen.add(label)

    items.push({ label, done: pVal === '1' })
  })

  return items
}

export async function getQuantInputs(spreadsheetId: string): Promise<InputItem[]> {
  return getInputItemsFromTab(spreadsheetId, '【定量】検証結果入力フォーム')
}

export async function getFuncInputs(spreadsheetId: string): Promise<InputItem[]> {
  return getInputItemsFromTab(spreadsheetId, '【機能】検証結果入力フォーム')
}
