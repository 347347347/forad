import { NextRequest, NextResponse } from 'next/server'
import {
  getManualPage,
  getEvalPage,
  getAxesFromPage,
  getEquipmentFromPage,
  getNotionUrl,
} from '@/lib/notion'
import { getProducts, getQuantInputs, getFuncInputs } from '@/lib/sheets'

export async function GET(req: NextRequest) {
  const title = req.nextUrl.searchParams.get('title')
  if (!title) {
    return NextResponse.json({ error: 'title is required' }, { status: 400 })
  }

  try {
    // Notion・Sheets を並列取得
    const [manualPage, evalPage, quantInputs, funcInputs] = await Promise.all([
      getManualPage(title),
      getEvalPage(title),
      getQuantInputs(),
      getFuncInputs(),
    ])

    if (!manualPage) {
      return NextResponse.json(
        { error: `「${title}」の手順書が見つかりませんでした` },
        { status: 404 }
      )
    }

    // 手順書ページ内の検証軸DBと備品リストを並列取得
    const [axes, equipment, products] = await Promise.all([
      getAxesFromPage(manualPage.id),
      getEquipmentFromPage(manualPage.id),
      getProducts(title),
    ])

    return NextResponse.json({
      title,
      links: {
        eval: evalPage ? getNotionUrl(evalPage.id) : null,
        manual: getNotionUrl(manualPage.id),
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
