export interface KintoneStatus {
  productNo: string
  status: string
}

const KINTONE_DOMAIN = '5dal2t2w9qb3.cybozu.com'
const KINTONE_APP_ID = '208'

function getToken() {
  if (!process.env.KINTONE_API_TOKEN) throw new Error('KINTONE_API_TOKEN is not set')
  return process.env.KINTONE_API_TOKEN
}

// 商品番号リストからkintoneのステータスを一括取得
export async function getKintoneStatuses(productNos: string[]): Promise<Map<string, string>> {
  if (productNos.length === 0) return new Map()

  const token = getToken()

  // 商品番号をIN条件でクエリ
  const conditions = productNos.map(no => `商品番号 = "${no}"`).join(' or ')
  const query = encodeURIComponent(`${conditions} limit 500`)

  const res = await fetch(
    `https://${KINTONE_DOMAIN}/k/v1/records.json?app=${KINTONE_APP_ID}&query=${query}&fields[0]=商品番号&fields[1]=ステータス`,
    {
      headers: {
        'X-Cybozu-API-Token': token,
        'Content-Type': 'application/json',
      },
    }
  )

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`kintone API error: ${res.status} ${text}`)
  }

  const data = await res.json()
  const map = new Map<string, string>()

  for (const record of data.records ?? []) {
    const no = record['商品番号']?.value ?? ''
    const status = record['ステータス']?.value ?? ''
    if (no) map.set(String(no), String(status))
  }

  return map
}
