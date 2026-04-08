'use client'

import { useState } from 'react'
import { DashboardData, VerificationAxis } from '@/types'

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
      const params = new URLSearchParams({
        title: query.trim(),
        month,
      })
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
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-700 text-sm">
            <div className="font-medium mb-1">{error}</div>
          </div>
        )}

        {data?.errors?.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-800 text-xs mb-4">
            <div className="font-medium mb-1">一部データの取得に失敗しました</div>
            {data.errors.map((e: string, i: number) => <div key={i}>・{e}</div>)}
          </div>
        )}

        {data && !loading && (
          <>
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <h1 className="text-lg font-medium text-gray-900">{data.title}</h1>
              <div className="flex gap-2">
                {data.links.eval && (
                  <a href={data.links.eval} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-medium border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">
                    評価・分析シート
                  </a>
                )}
                {data.links.manual && (
                  <a href={data.links.manual} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-medium border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">
                    手順書
                  </a>
                )}
              </div>
            </div>

            {/* 検証軸：全幅 */}
            {axes.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4">
                <div className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">検証軸 — Notion</div>
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {[
                    { val: axes.length, label: '検証軸 合計' },
                    { val: doneCount, label: '完了' },
                    { val: `${pct}%`, label: '進捗' },
                  ].map(s => (
                    <div key={s.label} className="bg-gray-50 rounded-lg p-3">
                      <div className="text-xl font-medium text-gray-900">{s.val}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                  <span>進捗</span><span>{doneCount} / {axes.length}</span>
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
                {data.equipment?.length > 0 && (
                  <>
                    <div className="text-xs font-medium text-gray-500 mt-4 mb-2">備品リスト</div>
                    <div className="flex flex-wrap gap-1.5">
                      {data.equipment.map((e: any, i: number) => (
                        <span key={i} className={`text-xs px-2.5 py-1 rounded-full font-medium ${e.isShared ? 'bg-amber-50 text-amber-800' : 'bg-green-50 text-green-800'}`}>
                          {e.name}
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* 下段：2カラム */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* 商品リスト */}
              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <div className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">
                  商品リスト — import商品情報
                  <span className="ml-2 normal-case text-blue-500">{month}</span>
                </div>
                {data.products?.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm" style={{ tableLayout: 'fixed' }}>
                      <colgroup>
                        <col style={{ width: '56px' }}/>
                        <col style={{ width: '35%' }}/>
                        <col/>
                      </colgroup>
                      <thead>
                        <tr>
                          {['No.', 'メーカー', '商品名'].map(h => (
                            <th key={h} className="text-left text-xs font-medium text-gray-400 pb-2 border-b border-gray-100">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {data.products.map((p: any, i: number) => (
                          <tr key={i} className="border-b border-gray-50 last:border-0">
                            <td className="py-2 text-gray-500 text-xs">{p.no}</td>
                            <td className="py-2 text-gray-700 truncate pr-2">{p.maker}</td>
                            <td className="py-2 text-gray-900 truncate">{p.name}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-sm text-gray-400 text-center py-8">{month} の商品データなし</div>
                )}
              </div>

              {/* 検証項目 */}
              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <div className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">検証項目 — Spreadsheet</div>
                {data.quantInputs?.length > 0 && (
                  <>
                    <div className="text-xs font-medium text-gray-500 mb-2">【定量】検証結果入力フォーム</div>
                    <div className="flex flex-col divide-y divide-gray-50 mb-4">
                      {data.quantInputs.map((item: string, i: number) => (
                        <div key={i} className="py-1.5 text-sm text-gray-700">{item}</div>
                      ))}
                    </div>
                  </>
                )}
                {data.funcInputs?.length > 0 && (
                  <>
                    <div className="text-xs font-medium text-gray-500 mb-2">【機能】検証結果入力フォーム</div>
                    <div className="flex flex-col divide-y divide-gray-50">
                      {data.funcInputs.map((item: string, i: number) => (
                        <div key={i} className="py-1.5 text-sm text-gray-700">{item}</div>
                      ))}
                    </div>
                  </>
                )}
                {!data.quantInputs?.length && !data.funcInputs?.length && (
                  <div className="text-sm text-gray-400 text-center py-8">検証項目データなし</div>
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
