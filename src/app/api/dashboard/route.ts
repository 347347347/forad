import { NextRequest, NextResponse } from 'next/server'
import {
  getManualPage,
  getAxesFromPage,
  getEquipmentFromPage,
  getNotionUrl,
} from '@/lib/notion'
import {
  getSpreadsheetIdByTitle,
  getSheetUrl,
  getProducts,
  getQuantInputs,
  getFuncInputs,
} from '@/lib/sheets'

export async function GET(req: NextRequest) {
  const title = req.nextUrl.searchParams.get('title')
  if (!title) {
    return NextResponse.json({ error: 'title is required' }, { status: 400 })
  }

  const result: any = {
    title,
    links: { eval: null, manual: null },
    axes: [],
    equipment: [],
    products: [],
    quantInputs: [],
    funcInputs: [],
    errors: [],
  }

  // Sheets: マスターシートからスプレッドシートIDを取得
  try {
    const spreadsheetId = await getSpreadsheetIdByTitle(title)
    if (spreadsheetId) {
      result.links.eval = getSheetUrl(spreadsheetId)

      const [products, quantInputs, funcInputs] = await Promise.all([
        getProducts(spreadsheetId).catch((e) => { result.errors.push(`商品リスト取得エラー: ${e.message}`); return [] }),
        getQuantInputs(spreadsheetId).catch((e) => { result.errors.push(`定量項目取得エラー: ${e.message}`); return [] }),
        getFuncInputs(spreadsheetId).catch((e) => { result.errors.push(`機能項目取得エラー: ${e.message}`); return [] }),
      ])

      result.products = products
      result.quantInputs = quantInputs
      result.funcInputs = funcInputs
    } else {
      result.errors.push(`マスターシートに「${title}」が見つかりません`)
    }
  } catch (e: any) {
    result.errors.push(`Sheets接続エラー: ${e.message}`)
  }

  // Notion: エラーでも他のデータは返す
  try {
    const manualPage = await getManualPage(title)
    if (manualPage) {
      result.links.manual = getNotionUrl(manualPage.id)

      const [axes, equipment] = await Promise.all([
        getAxesFromPage(manualPage.id).catch((e) => { result.errors.push(`検証軸取得エラー: ${e.message}`); return [] }),
        getEquipmentFromPage(manualPage.id).catch((e) => { result.errors.push(`備品取得エラー: ${e.message}`); return [] }),
      ])

      result.axes = axes
      result.equipment = equipment
    } else {
      result.errors.push(`Notionに「${title}」の手順書が見つかりません`)
    }
  } catch (e: any) {
    result.errors.push(`Notion接続エラー: ${e.message}`)
  }

  // Sheetsデータが1件も取れなかった場合のみ404
  if (result.products.length === 0 && result.errors.some((e: string) => e.includes('マスターシート'))) {
    return NextResponse.json({ error: `「${title}」に一致するデータが見つかりませんでした` }, { status: 404 })
  }

  return NextResponse.json(result)
}
