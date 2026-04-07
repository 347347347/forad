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

// マスターシートからタイトル名でスプレッドシートIDを取得
export async function getSpreadsheetIdByTitle(title: string): Promise<string | null> {
  const auth = getAuth()
  const sheets = google.sheets({ version: 'v4', auth })

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: MASTER_SHEET_ID,
    range: 'マスター!A:B',
  })

  const rows = res.data.values ?? []
  const matched = rows.slice(1).find((row: string[]) => row[0] === title)
  return matched?.[1] ?? null
}

// タイトル別シートのURLを生成（評価・分析シートへのリンク）
export function getSheetUrl(spreadsheetId: string): string {
  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`
}

// import商品情報タブから商品リストを取得（A列:商品番号, D列:メーカー, E列:商品名）
export async function getProducts(spreadsheetId: string): Promise<Product[]> {
  const auth = getAuth()
  const sheets = google.sheets({ version: 'v4', auth })

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'import商品情報!A:E',
  })

  const rows = res.data.values ?? []
  return rows
    .slice(1)
    .filter((row: string[]) => row[0]?.trim())
    .map((row: string[]) => ({
      no: row[0] ?? '',
      maker: row[3] ?? '',
      name: row[4] ?? '',
    }))
}

// 【定量】検証結果入力フォームタブのJ列を取得
export async function getQuantInputs(spreadsheetId: string): Promise<string[]> {
  const auth = getAuth()
  const sheets = google.sheets({ version: 'v4', auth })

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: '【定量】検証結果入力フォーム!J:J',
  })

  return (res.data.values ?? []).flat().filter((v: string) => v?.trim()).slice(1)
}

// 【機能】検証結果入力フォームタブのJ列を取得
export async function getFuncInputs(spreadsheetId: string): Promise<string[]> {
  const auth = getAuth()
  const sheets = google.sheets({ version: 'v4', auth })

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: '【機能】検証結果入力フォーム!J:J',
  })

  return (res.data.values ?? []).flat().filter((v: string) => v?.trim()).slice(1)
}
