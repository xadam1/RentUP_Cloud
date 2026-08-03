import { useState, useRef } from 'react'
import { Upload, X, AlertTriangle, CheckCircle2, FileText } from 'lucide-react'
import { aumApi, type CsvPreviewRow } from '@/lib/api'

interface Props {
  onImported: () => void
}

type Phase = 'idle' | 'loading' | 'preview' | 'committing' | 'done' | 'error'

export default function CsvImportButton({ onImported }: Props) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [preview, setPreview] = useState<CsvPreviewRow[]>([])
  const [warnings, setWarnings] = useState<string[]>([])
  const [open, setOpen] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFile = async (file: File) => {
    setPhase('loading')
    setOpen(true)
    try {
      const res = await aumApi.previewCsv(file)
      setPreview(res.data.rows)
      setWarnings(res.data.warnings)
      setPhase('preview')
    } catch (e: any) {
      setErrorMsg(e?.response?.data?.error ?? 'Chyba při parsování CSV souboru.')
      setPhase('error')
    }
  }

  const commit = async () => {
    setPhase('committing')
    try {
      await aumApi.commitImport(preview.filter(r => !r.warning || true))
      setPhase('done')
      onImported()
    } catch {
      setPhase('error')
      setErrorMsg('Chyba při ukládání dat a produktových snapshotů do databáze.')
    }
  }

  const reset = () => { setPhase('idle'); setOpen(false); setPreview([]); setWarnings([]) }

  return (
    <>
      <button
        onClick={() => fileRef.current?.click()}
        className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-all shadow-sm border border-zinc-200 dark:border-zinc-700 cursor-pointer"
      >
        <Upload className="w-3.5 h-3.5" />
        <span>Importovat</span>
      </button>
      <input
        ref={fileRef}
        type="file"
        accept=".csv,.txt"
        className="hidden"
        onChange={e => { if (e.target.files?.[0]) { handleFile(e.target.files[0]); e.target.value = '' } }}
      />

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 modal-backdrop animate-in fade-in duration-200" onClick={reset} />
          
          <div className="relative z-10 w-full max-w-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-500">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-800 dark:text-zinc-100">Import ze souboru CSV</h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">Podpora pro maticový formát s historií stavů dle spravovaných aktiv.</p>
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
                  <span className="text-zinc-500 dark:text-zinc-400 text-sm">Načítám a analyzuji strukturu aktiv z CSV...</span>
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
                  <p className="text-sm font-medium">Import byl úspěšně zpracován! Aktuální AUM produktů bylo zaktualizováno podle nejnovějšího vyčteného data.</p>
                </div>
              )}

              {(phase === 'preview' || phase === 'committing') && (
                <div className="space-y-4">
                  {warnings.length > 0 && (
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3.5 space-y-1.5">
                      <p className="text-amber-700 dark:text-amber-400 text-xs font-semibold">Upozornění při parsování souboru:</p>
                      {warnings.map((w, i) => (
                        <p key={i} className="text-amber-600 dark:text-amber-300 text-xs flex items-start gap-2">
                          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-amber-500" />
                          <span>{w}</span>
                        </p>
                      ))}
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                    <span>Nalezeno <strong>{preview.length}</strong> záznamů pro import</span>
                    <span>Náhled extrahovaných časových dat</span>
                  </div>

                  <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
                    <div className="overflow-x-auto max-h-72">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-zinc-50 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-300 sticky top-0 border-b border-zinc-200 dark:border-zinc-800">
                          <tr>
                            <th className="py-2.5 px-4 font-semibold">Datum stavu</th>
                            <th className="py-2.5 px-4 font-semibold">Produkt (Sloupec)</th>
                            <th className="py-2.5 px-4 font-semibold text-right">Hodnota AUM</th>
                            <th className="py-2.5 px-4 font-semibold">Poznámka</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-200/60 dark:divide-zinc-800/60">
                          {preview.slice(0, 50).map((row, i) => (
                            <tr key={i} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                              <td className="py-2 px-4 font-medium text-zinc-700 dark:text-zinc-300">{new Date(row.date).toLocaleDateString('cs-CZ')}</td>
                              <td className="py-2 px-4 text-zinc-900 dark:text-white font-medium">{row.productName}</td>
                              <td className="py-2 px-4 font-mono text-right font-semibold text-blue-600 dark:text-blue-400">{row.aum.toLocaleString('cs-CZ')} Kč</td>
                              <td className="py-2 px-4 text-[11px] text-amber-600 dark:text-amber-400">{row.warning || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {preview.length > 50 && (
                      <div className="py-2 px-4 bg-zinc-50 dark:bg-zinc-800/30 text-center text-xs text-zinc-400 border-t border-zinc-200 dark:border-zinc-800">
                        Zobrazeno prvních 50 z celkových {preview.length} záznamů...
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            {(phase === 'preview' || phase === 'committing') && (
              <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 flex justify-end gap-3 bg-zinc-50/30 dark:bg-zinc-800/20">
                <button onClick={reset} className="px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors">
                  Zrušit
                </button>
                <button
                  onClick={commit}
                  disabled={phase === 'committing'}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-xl shadow-lg shadow-blue-500/25 transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {phase === 'committing' ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Zpracovávám import...</span>
                    </>
                  ) : (
                    <span>Potvrdit import ({preview.length} řádků)</span>
                  )}
                </button>
              </div>
            )}
            {phase === 'done' && (
              <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 flex justify-end bg-zinc-50/30 dark:bg-zinc-800/20">
                <button onClick={reset} className="px-5 py-2 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-800 dark:text-white text-sm font-medium rounded-xl transition-all">
                  Hotovo
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
