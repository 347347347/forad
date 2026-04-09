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

// 【再編集】などのプレフィックスを除去して正規化
function normalizeTitle(title: string): string {
  return title.replace(/【[^】]*】/g, '').trim()
}

// マスターシートからタイトル名でスプレッドシートIDを取得
export async function getSpreadsheetIdByTitle(title: string): Promise<string | null> {
  const auth = getAuth()
  const sheets = google.sheets({ version: 'v4', auth })

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: MASTER_SHEET_ID,
    range: 'マスター!A:B',
  })

  const rows = res.data.values ?? []
  const normalizedInput = normalizeTitle(title)

  const matched = rows.slice(1).find((row: string[]) => {
    return normalizeTitle(row[0] ?? '') === normalizedInput
  })

  return matched?.[1] ?? null
}

export function getSheetUrl(spreadsheetId: string): string {
  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`
}

// import商品情報タブから商品リストを取得
// A列:商品番号, C列:更新日, D列:メーカー, E列:商品名
// month形式: "YYYY/MM"
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
      // C列の日付で絞り込み（年月のみ照合）
      const dateStr = row[2] ?? ''
      if (!dateStr) return false // 日付なしは除外
      const d = new Date(dateStr)
      if (isNaN(d.getTime())) return false // 日付として解釈できない場合も除外
      return d.getFullYear() === filterYear && d.getMonth() + 1 === filterMonth
    })
    .map((row: string[]) => ({
      no: row[0] ?? '',
      maker: row[3] ?? '',
      name: row[4] ?? '',
    }))
}

// 【定量】検証結果入力フォームタブのJ列を取得（重複排除）
export async function getQuantInputs(spreadsheetId: string): Promise<string[]> {
  const auth = getAuth()
  const sheets = google.sheets({ version: 'v4', auth })

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: '【定量】検証結果入力フォーム!J:J',
  })

  const values = (res.data.values ?? []).flat().filter((v: string) => v?.trim()).slice(1)
  return [...new Set(values)] // 重複排除
}

// 【機能】検証結果入力フォームタブのJ列を取得（重複排除）
export async function getFuncInputs(spreadsheetId: string): Promise<string[]> {
  const auth = getAuth()
  const sheets = google.sheets({ version: 'v4', auth })

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: '【機能】検証結果入力フォーム!J:J',
  })

  const values = (res.data.values ?? []).flat().filter((v: string) => v?.trim()).slice(1)
  return [...new Set(values)] // 重複排除
}
