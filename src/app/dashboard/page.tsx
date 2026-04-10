'use client'

import { useState } from 'react'
import { DashboardData, VerificationAxis, ProductProgress } from '@/types'

function getCurrentYearMonth() {
  const now = new Date()
  return `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}`
}

function generateMonthOptions() {
  const options = []
  const now = new Date()
  for (let i = 0; i < 24; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    options.push(`${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  return options
}

function ProductProgressSection({ title, progressList, products }: {
  title: string
  progressList: ProductProgress[]
  products: any[]
}) {
  // 商品リストにある・欠番でない商品のみに絞り込み
  const validNos = new Set(products.filter(p => !p.isAbsent).map(p => String(p.no)))
  const filtered = progressList.filter(p => validNos.has(String(p.productNo)) && !p.allNA)

  const [openSet, setOpenSet] = useState<Set<string>>(() => new Set(filtered.map(p => p.productNo)))

  const toggle = (no: string) => {
    setOpenSet(prev => {
      const next = new Set(prev)
      next.has(no) ? next.delete(no) : next.add(no)
      return next
    })
  }

  if (filtered.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h2 className="text-base font-medium text-gray-900 mb-3">{title}</h2>
        <div className="text-sm text-gray-400 text-center py-6">なし</div>
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <h2 className="text-base font-medium text-gray-900 mb-3">{title}</h2>
      <div className="flex flex-col gap-1.5">
        {filtered.map(p => {
          const product = products.find(pr => String(pr.no) === String(p.productNo))
          const done = p.items.filter(i => i.done).length
          const total = p.items.length
          const pct = total > 0 ? Math.round(done / total * 100) : 0
          const isOpen = openSet.has(p.productNo)

          return (
            <div key={p.productNo} className="border border-gray-200 rounded-lg overflow-hidden">
              <button
                onClick={() => toggle(p.productNo)}
                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 transition-colors text-left"
              >
                <span className="text-xs text-gray-400 min-w-[28px]">#{p.productNo}</span>
                <span className="text-sm text-gray-700 flex-1 truncate">
                  {product ? `${product.maker} ${product.name}` : '—'}
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-1.5 bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs text-gray-500 min-w-[32px] text-right">{pct}%</span>
                  <span className="text-xs text-gray-400">{isOpen ? '▲' : '▼'}</span>
                </div>
              </button>
              {isOpen && (
                <div className="border-t border-gray-100 px-3 py-2 bg-gray-50">
                  {p.items.map((item, i) => (
                    <div key={i} className="flex items-center justify-between py-1 border-b border-gray-100 last:border-0">
                      <span className={`text-xs ${item.done ? 'text-gray-400 line-through' : 'text-gray-600'}`}>{item.label}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ml-2 shrink-0 ${item.done ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                        {item.done ? '入力済' : '未入力'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const [query, setQuery] = useState('')
  const [month, setMonth] = useState(getCurrentYearMonth())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<DashboardData | null>(null)
  const [axes, setAxes] = useState<VerificationAxis[]>([])

  async function search() {
    if (!query.trim()) return
    setLoading(true)
    setError(null)
    setData(null)
    try {
      const params = new URLSearchParams({ title: query.trim(), month })
      const res = await fetch(`/api/dashboard?${params}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'エラーが発生しました')
      setData(json)
      setAxes(json.axes ?? [])
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  function toggleAxis(id: string) {
    setAxes(prev => prev.map(a => a.id === id ? { ...a, done: !a.done } : a))
  }

  const doneCount = axes.filter(a => a.done).length
  const pct = axes.length > 0 ? Math.round(doneCount / axes.length * 100) : 0
  const monthOptions = generateMonthOptions()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" viewBox="0 0 16 16" fill="none">
                <rect x="1" y="1" width="6" height="6" rx="1.5" fill="white" opacity="0.9"/>
                <rect x="9" y="1" width="6" height="6" rx="1.5" fill="white" opacity="0.55"/>
                <rect x="1" y="9" width="6" height="6" rx="1.5" fill="white" opacity="0.55"/>
                <rect x="9" y="9" width="6" height="6" rx="1.5" fill="white" opacity="0.25"/>
              </svg>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-900">検証ダッシュボード</div>
              <div className="text-xs text-gray-500">AD業務支援ツール</div>
            </div>
          </div>
          <div className="flex gap-2 flex-1 max-w-2xl ml-auto">
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && search()}
              placeholder="検証タイトルを入力（例：掃除機、冷蔵庫）"
              className="flex-1 h-9 px-3 text-sm border border-gray-300 rounded-lg outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-white"
            />
            <select
              value={month}
              onChange={e => setMonth(e.target.value)}
              className="h-9 px-2 text-sm border border-gray-300 rounded-lg outline-none focus:border-blue-500 bg-white text-gray-700"
            >
              {monthOptions.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <button
              onClick={search}
              disabled={loading}
              className="h-9 px-4 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {loading ? '検索中...' : '検索'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-6">
        {!loading && !error && !data && (
          <div className="border border-dashed border-gray-300 rounded-xl p-16 text-center text-gray-400 text-sm">
            検証タイトルと更新月を入力して検索してください
          </div>
        )}
        {loading && (
          <div className="border border-dashed border-gray-300 rounded-xl p-16 text-center text-gray-400 text-sm animate-pulse">
            データを取得中...
          </div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-700 text-sm mb-4">
            <div className="font-medium">{error}</div>
          </div>
        )}
        {(data?.errors?.length ?? 0) > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-800 text-xs mb-4">
            <div className="font-medium mb-1">一部データの取得に失敗しました</div>
            {data?.errors?.map((e: string, i: number) => <div key={i}>・{e}</div>)}
          </div>
        )}

        {data && !loading && (
          <>
            {/* タイトルとリンク */}
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <h1 className="text-lg font-medium text-gray-900">{data?.title}</h1>
              <div className="flex gap-2">
                {data?.links?.eval && (
                  <a href={data.links.eval} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-medium border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">
                    評価・分析シート
                  </a>
                )}
                {data?.links?.manual && (
                  <a href={data.links.manual} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-medium border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">
                    手順書
                  </a>
                )}
              </div>
            </div>

            {/* 検証軸：全幅（Notionがある場合のみ） */}
            {axes.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4">
                <div className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">検証軸 — Notion</div>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {[
                    { val: axes.length, label: '合計' },
                    { val: doneCount, label: '完了' },
                    { val: `${pct}%`, label: '進捗' },
                  ].map(s => (
                    <div key={s.label} className="bg-gray-50 rounded-lg p-3">
                      <div className="text-xl font-medium text-gray-900">{s.val}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
                    </div>
                  ))}
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-4">
                  <div className="h-1.5 bg-blue-600 rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
                </div>
                <div className="flex flex-col gap-1.5">
                  {axes.map(a => (
                    <div key={a.id} onClick={() => toggleAxis(a.id)}
                      className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-colors ${a.done ? 'bg-gray-50 border-gray-200' : 'border-gray-200 hover:bg-gray-50'}`}>
                      <div className={`w-4 h-4 min-w-[16px] rounded border-[1.5px] flex items-center justify-center mt-0.5 transition-all ${a.done ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                        {a.done && (
                          <svg className="w-2.5 h-2.5" viewBox="0 0 10 10" fill="none">
                            <path d="M1.5 5L4 7.5L8.5 2.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </div>
                      <div>
                        <div className={`text-sm ${a.done ? 'text-gray-400 line-through' : 'text-gray-900'}`}>{a.label}</div>
                        {a.detail && <div className="text-xs text-gray-400 mt-0.5">{a.detail}</div>}
                      </div>
                    </div>
                  ))}
                </div>
                {(data?.equipment?.length ?? 0) > 0 && (
                  <>
                    <div className="text-xs font-medium text-gray-500 mt-4 mb-2">備品リスト</div>
                    <div className="flex flex-wrap gap-1.5">
                      {data?.equipment?.map((e: any, i: number) => (
                        <span key={i} className={`text-xs px-2.5 py-1 rounded-full font-medium ${e.isShared ? 'bg-amber-50 text-amber-800' : 'bg-green-50 text-green-800'}`}>
                          {e.name}
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* 商品リスト：全幅・高さ35vh・スクロール */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4">
              <div className="flex items-baseline justify-between mb-3">
                <h2 className="text-base font-medium text-gray-900">商品リスト</h2>
                <span className="text-xs text-blue-500">{month}</span>
              </div>
              {(data?.products?.length ?? 0) > 0 ? (
                <div className="overflow-y-auto" style={{ maxHeight: '35vh' }}>
                  <table className="w-full text-sm" style={{ tableLayout: 'fixed' }}>
                    <colgroup>
                      <col style={{ width: '52px' }}/>
                      <col style={{ width: '28%' }}/>
                      <col/>
                      <col style={{ width: '90px' }}/>
                    </colgroup>
                    <thead className="sticky top-0 bg-white">
                      <tr>
                        {['No.', 'メーカー', '商品名', 'ステータス'].map(h => (
                          <th key={h} className="text-left text-xs font-medium text-gray-400 pb-2 border-b border-gray-100">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data?.products?.map((p: any, i: number) => (
                        <tr key={i} className={`border-b border-gray-50 last:border-0 ${p.isAbsent ? 'opacity-40' : ''}`}>
                          <td className="py-2 text-xs">
                            <div className={p.isAbsent ? 'text-gray-400' : 'text-gray-500'}>{p.no}</div>
                            {p.isAbsent && <div className="text-[10px] text-gray-400 bg-gray-100 rounded px-1 inline-block mt-0.5">欠番</div>}
                          </td>
                          <td className={`py-2 truncate pr-2 ${p.isAbsent ? 'text-gray-400' : 'text-gray-700'}`}>{p.maker}</td>
                          <td className={`py-2 truncate ${p.isAbsent ? 'text-gray-400' : 'text-gray-900'}`}>{p.name}</td>
                          <td className="py-2">
                            {p.kintoneStatus ? (
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium whitespace-nowrap ${
                                p.kintoneStatus.includes('完了') ? 'bg-green-50 text-green-700' :
                                p.kintoneStatus.includes('進行') || p.kintoneStatus.includes('検証') ? 'bg-blue-50 text-blue-700' :
                                p.kintoneStatus.includes('停止') || p.kintoneStatus.includes('中断') ? 'bg-red-50 text-red-700' :
                                'bg-gray-100 text-gray-500'
                              }`}>{p.kintoneStatus}</span>
                            ) : (
                              <span className="text-[10px] text-gray-300">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-sm text-gray-400 text-center py-8">{month} の商品データなし</div>
              )}
            </div>

            {/* 定量・機能：2カラム */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <ProductProgressSection
                title="【定量】"
                progressList={data?.quantProgress ?? []}
                products={data?.products ?? []}
              />
              <ProductProgressSection
                title="【機能】"
                progressList={data?.funcProgress ?? []}
                products={data?.products ?? []}
              />
            </div>
          </>
        )}
      </main>
    </div>
  )
}
