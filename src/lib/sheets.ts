import { google } from 'googleapis'
import { Product } from '@/types'

function getAuth() {
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON!)
  return new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  })
}

const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID!

// import商品情報タブから商品リストを取得
// A列: 商品番号, D列: メーカー, E列: 商品名
export async function getProducts(title: string): Promise<Product[]> {
  const auth = getAuth()
  const sheets = google.sheets({ version: 'v4', auth })

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'import商品情報!A:E',
  })

  const rows = res.data.values ?? []

  // 1行目はヘッダーとしてスキップ
  return rows
    .slice(1)
    .filter((row: string[]) => row[0]) // 商品番号が空の行をスキップ
    .map((row: string[]) => ({
      no: row[0] ?? '',
      maker: row[3] ?? '',   // D列
      name: row[4] ?? '',    // E列
    }))
}

// 【定量】検証結果入力フォームタブのJ列を取得
export async function getQuantInputs(): Promise<string[]> {
  const auth = getAuth()
  const sheets = google.sheets({ version: 'v4', auth })

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: '【定量】検証結果入力フォーム!J:J',
  })

  const rows = res.data.values ?? []
  return rows
    .flat()
    .filter((v: string) => v && v.trim() !== '')
    .slice(1) // ヘッダー行をスキップ
}

// 【機能】検証結果入力フォームタブのJ列を取得
export async function getFuncInputs(): Promise<string[]> {
  const auth = getAuth()
  const sheets = google.sheets({ version: 'v4', auth })

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: '【機能】検証結果入力フォーム!J:J',
  })

  const rows = res.data.values ?? []
  return rows
    .flat()
    .filter((v: string) => v && v.trim() !== '')
    .slice(1)
}
