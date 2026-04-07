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

  try {
    // Notion手順書ページとSheetsのスプレッドシートIDを並列取得
    const [manualPage, spreadsheetId] = await Promise.all([
      getManualPage(title).catch(() => null),
      getSpreadsheetIdByTitle(title),
    ])

    if (!manualPage && !spreadsheetId) {
      return NextResponse.json(
        { error: `「${title}」に一致するデータが見つかりませんでした` },
        { status: 404 }
      )
    }

    // 並列でデータ取得
    const [axes, equipment, products, quantInputs, funcInputs] = await Promise.all([
      manualPage ? getAxesFromPage(manualPage.id).catch(() => []) : Promise.resolve([]),
      manualPage ? getEquipmentFromPage(manualPage.id).catch(() => []) : Promise.resolve([]),
      spreadsheetId ? getProducts(spreadsheetId).catch(() => []) : Promise.resolve([]),
      spreadsheetId ? getQuantInputs(spreadsheetId).catch(() => []) : Promise.resolve([]),
      spreadsheetId ? getFuncInputs(spreadsheetId).catch(() => []) : Promise.resolve([]),
    ])

    return NextResponse.json({
      title,
      links: {
        eval: spreadsheetId ? getSheetUrl(spreadsheetId) : null,
        manual: manualPage ? getNotionUrl(manualPage.id) : null,
      },
      axes,
      equipment,
      products,
      quantInputs,
      funcInputs,
    })
  } catch (err: any) {
    console.error('[dashboard/route]', err)
    return NextResponse.json(
      { error: 'データ取得中にエラーが発生しました', detail: err.message },
      { status: 500 }
    )
  }
}
