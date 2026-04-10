import { NextRequest, NextResponse } from 'next/server'
import { getManualPage, getAxesFromPage, getEquipmentFromPage, getNotionUrl } from '@/lib/notion'
import { getSpreadsheetIdByTitle, getSheetUrl, getProducts, getQuantProgress, getFuncProgress } from '@/lib/sheets'
import { getKintoneStatuses } from '@/lib/kintone'

export async function GET(req: NextRequest) {
  const title = req.nextUrl.searchParams.get('title')
  const month = req.nextUrl.searchParams.get('month') ?? `${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, '0')}`

  if (!title) return NextResponse.json({ error: 'title is required' }, { status: 400 })

  const result: any = {
    title, links: { eval: null, manual: null },
    axes: [], equipment: [], products: [],
    quantProgress: [], funcProgress: [], errors: [],
  }

  // Sheets
  try {
    const spreadsheetId = await getSpreadsheetIdByTitle(title)
    if (spreadsheetId) {
      result.links.eval = getSheetUrl(spreadsheetId)
      const [products, quantProgress, funcProgress] = await Promise.all([
        getProducts(spreadsheetId, month).catch((e: any) => { result.errors.push(`商品リスト: ${e.message}`); return [] }),
        getQuantProgress(spreadsheetId).catch((e: any) => { result.errors.push(`定量進捗: ${e.message}`); return [] }),
        getFuncProgress(spreadsheetId).catch((e: any) => { result.errors.push(`機能進捗: ${e.message}`); return [] }),
      ])

      // kintoneのステータスを取得して商品に付与
      const productNos = products.filter((p: any) => !p.isAbsent).map((p: any) => String(p.no))
      let kintoneMap = new Map<string, string>()
      try {
        if (process.env.KINTONE_API_TOKEN && productNos.length > 0) {
          kintoneMap = await getKintoneStatuses(productNos)
        }
      } catch (e: any) {
        result.errors.push(`kintone取得エラー: ${e.message}`)
      }

      result.products = products.map((p: any) => ({
        ...p,
        kintoneStatus: kintoneMap.get(String(p.no)) ?? null,
      }))
      result.quantProgress = quantProgress
      result.funcProgress = funcProgress
    } else {
      result.errors.push(`マスターシートに「${title}」が見つかりません`)
    }
  } catch (e: any) {
    result.errors.push(`Sheets接続エラー: ${e.message}`)
  }

  // Notion
  try {
    const manualPage = await getManualPage(title)
    if (manualPage) {
      result.links.manual = getNotionUrl(manualPage.id)
      const [axes, equipment] = await Promise.all([
        getAxesFromPage(manualPage.id).catch((e: any) => { result.errors.push(`検証軸: ${e.message}`); return [] }),
        getEquipmentFromPage(manualPage.id).catch((e: any) => { result.errors.push(`備品: ${e.message}`); return [] }),
      ])
      result.axes = axes
      result.equipment = equipment
    } else {
      result.errors.push(`Notionに「${title}」の手順書が見つかりません`)
    }
  } catch (e: any) {
    result.errors.push(`Notion接続エラー: ${e.message}`)
  }

  if (result.products.length === 0 && result.errors.some((e: string) => e.includes('マスターシート'))) {
    return NextResponse.json({ error: `「${title}」に一致するデータが見つかりませんでした` }, { status: 404 })
  }

  return NextResponse.json(result)
}
