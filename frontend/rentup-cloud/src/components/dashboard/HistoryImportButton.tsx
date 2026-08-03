import { useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Download, X, AlertTriangle, CheckCircle2, Calendar } from 'lucide-react'
import { aumApi, type HistoryCsvPreviewRow } from '@/lib/api'

interface Props {
  onImported: () => void
}

type Phase = 'idle' | 'loading' | 'preview' | 'committing' | 'done' | 'error'

export default function HistoryImportButton({ onImported }: Props) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [preview, setPreview] = useState<HistoryCsvPreviewRow[]>([])
  const [warnings, setWarnings] = useState<string[]>([])
  const [overwriteCount, setOverwriteCount] = useState(0)
  const [open, setOpen] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFile = async (file: File) => {
    setPhase('loading')
    setOpen(true)
    try {
      const res = await aumApi.previewHistoryCsv(file)
      setPreview(res.data.rows)
      setWarnings(res.data.warnings)
      setOverwriteCount(res.data.overwriteCount)
      setPhase('preview')
    } catch (e: any) {
      setErrorMsg(e?.response?.data?.error ?? 'Chyba při parsování historického souboru CSV.')
      setPhase('error')
    }
  }

  const commit = async () => {
    setPhase('committing')
    try {
      const rowsToCommit = preview.map(r => ({ date: r.date, aum: r.aum }))
      await aumApi.commitHistoryImport(rowsToCommit)
      setPhase('done')
      onImported()
    } catch {
      setPhase('error')
      setErrorMsg('Chyba při ukládání historických záznamů do databáze.')
    }
  }

  const reset = () => {
    setPhase('idle')
    setOpen(false)
    setPreview([])
    setWarnings([])
    setOverwriteCount(0)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 transition-all shadow-sm cursor-pointer"
        title="Importovat časové řady z CSV (např. Vývoj AUM)"
      >
        <Download className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
        <span>Import</span>
      </button>
      <input
        ref={fileRef}
        type="file"
        accept=".csv,.txt"
        className="hidden"
        onChange={e => {
          if (e.target.files?.[0]) {
            handleFile(e.target.files[0])
            e.target.value = ''
          }
        }}
      />

      {/* Modal */}
      {open && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 modal-backdrop animate-in fade-in duration-200" onClick={reset} />
          
          <div className="relative z-10 w-full max-w-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-500">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-800 dark:text-zinc-100">Import historie z CSV (Vývoj AUM)</h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">Nahrávání celkového historického vývoje AUM (jeden souhrnný záznam na den).</p>
                </div>
              </div>
              <button onClick={reset} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors p-1 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {phase === 'loading' && (
                <div className="flex flex-col items-center justify-center h-44 gap-3">
                  <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-zinc-500 dark:text-zinc-400 text-sm">Analyzuji historická časová data z CSV...</span>
                </div>
              )}

              {phase === 'error' && (
                <div className="flex items-center gap-3 text-red-600 dark:text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl p-4 my-2">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                  <p className="text-sm font-medium">{errorMsg}</p>
                </div>
              )}

              {phase === 'done' && (
                <div className="flex items-center gap-3 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 my-2">
                  <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                  <p className="text-sm font-medium">Historická data byla úspěšně naimportována do databáze AUM!</p>
                </div>
              )}

              {(phase === 'preview' || phase === 'committing') && (
                <div className="space-y-4">
                  {overwriteCount > 0 && (
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 space-y-1.5 flex gap-3 items-start">
                      <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0 text-amber-500" />
                      <div>
                        <h4 className="text-amber-700 dark:text-amber-400 text-xs font-bold uppercase tracking-wide">Upozornění na přepis historických dat</h4>
                        <p className="text-amber-600 dark:text-amber-300 text-xs mt-1 leading-relaxed">
                          Nalezeno celkem <strong>{preview.length}</strong> záznamů. Pro <strong>{overwriteCount}</strong> z těchto dat již záznam v databázi existuje. Potvrzením importu dojde k jejich aktualizaci na naimportovanou hodnotu (jeden den smí obsahovat nejvýše 1 záznam).
                        </p>
                      </div>
                    </div>
                  )}

                  {warnings.length > 0 && overwriteCount === 0 && (
                    <div className="bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl p-3 space-y-1">
                      {warnings.map((w, i) => (
                        <p key={i} className="text-zinc-600 dark:text-zinc-400 text-xs flex items-start gap-2">
                          <span>• {w}</span>
                        </p>
                      ))}
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                    <span>Nalezeno <strong>{preview.length}</strong> časových záznamů</span>
                    <span>Náhled importované řady</span>
                  </div>

                  <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
                    <div className="overflow-x-auto max-h-72">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-zinc-50 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-300 sticky top-0 border-b border-zinc-200 dark:border-zinc-800">
                          <tr>
                            <th className="py-2.5 px-4 font-semibold">Datum záznamu</th>
                            <th className="py-2.5 px-4 font-semibold text-right">Celkové AUM k datu</th>
                            <th className="py-2.5 px-4 font-semibold text-center">Stav importu</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-200/60 dark:divide-zinc-800/60">
                          {preview.slice(0, 50).map((row, i) => (
                            <tr key={i} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                              <td className="py-2 px-4 font-medium text-zinc-800 dark:text-zinc-200">
                                {new Date(row.date).toLocaleDateString('cs-CZ')}
                              </td>
                              <td className="py-2 px-4 font-mono font-bold text-right text-blue-600 dark:text-blue-400">
                                {row.aum.toLocaleString('cs-CZ')} Kč
                              </td>
                              <td className="py-2 px-4 text-center">
                                {row.overwritesExisting ? (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                    Přepíše stávající
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                    Nový záznam
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-3.5 bg-zinc-50/50 dark:bg-zinc-800/20 border-t border-zinc-200 dark:border-zinc-800">
              {phase === 'done' ? (
                <button
                  type="button"
                  onClick={reset}
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition-all cursor-pointer"
                >
                  Hotovo
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={reset}
                    disabled={phase === 'committing' || phase === 'loading'}
                    className="px-4 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
                  >
                    Zrušit
                  </button>
                  {phase === 'preview' && (
                    <button
                      type="button"
                      onClick={commit}
                      className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition-all shadow-sm cursor-pointer"
                    >
                      {overwriteCount > 0 ? 'Naimportovat a přepsat historii' : 'Potvrdit import do historie'}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
