import { useState, useRef } from 'react'
import { Upload, X, AlertTriangle, CheckCircle2 } from 'lucide-react'
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
      setErrorMsg(e?.response?.data?.error ?? 'Chyba při čtení CSV.')
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
      setErrorMsg('Chyba při ukládání dat.')
    }
  }

  const reset = () => { setPhase('idle'); setOpen(false); setPreview([]); setWarnings([]) }

  return (
    <>
      <button
        onClick={() => fileRef.current?.click()}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-all duration-150 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 hover:-translate-y-px"
      >
        <Upload className="w-4 h-4" />
        Importovat CSV
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
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={reset} />
          <div className="relative bg-[#13131f] border border-white/[0.1] rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08]">
              <h3 className="text-white font-medium">Import CSV</h3>
              <button onClick={reset} className="text-white/40 hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {phase === 'loading' && (
                <div className="flex items-center justify-center h-32">
                  <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  <span className="ml-3 text-white/50 text-sm">Načítám preview...</span>
                </div>
              )}

              {phase === 'error' && (
                <div className="flex items-center gap-3 text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                  <p className="text-sm">{errorMsg}</p>
                </div>
              )}

              {phase === 'done' && (
                <div className="flex items-center gap-3 text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
                  <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                  <p className="text-sm">Import úspěšně dokončen.</p>
                </div>
              )}

              {(phase === 'preview' || phase === 'committing') && (
                <div className="space-y-4">
                  {warnings.length > 0 && (
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 space-y-1">
                      {warnings.map((w, i) => (
                        <p key={i} className="text-amber-400 text-xs flex items-start gap-2">
                          <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />{w}
                        </p>
                      ))}
                    </div>
                  )}
                  <p className="text-white/50 text-xs">{preview.length} řádků k importu</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-white/30 border-b border-white/[0.06]">
                          {['Datum', 'Produkt', 'AUM', 'Měs. vklad', ''].map(h => (
                            <th key={h} className="text-left pb-2 pr-4 font-medium">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {preview.map((row, i) => (
                          <tr key={i} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                            <td className="py-2 pr-4 text-white/60">{new Date(row.date).toLocaleDateString('cs-CZ')}</td>
                            <td className="py-2 pr-4 text-white">{row.productName}</td>
                            <td className="py-2 pr-4 text-white font-mono">{row.aum.toLocaleString('cs-CZ')}</td>
                            <td className="py-2 pr-4 text-white/60 font-mono">{row.monthlyDeposit.toLocaleString('cs-CZ')}</td>
                            <td className="py-2">{row.warning && <AlertTriangle className="w-3 h-3 text-amber-400" aria-label={row.warning} />}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            {(phase === 'preview' || phase === 'committing') && (
              <div className="px-6 py-4 border-t border-white/[0.08] flex justify-end gap-3">
                <button onClick={reset} className="px-4 py-2 text-sm text-white/50 hover:text-white transition-colors">
                  Zrušit
                </button>
                <button
                  onClick={commit}
                  disabled={phase === 'committing'}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-xl transition-all disabled:opacity-50"
                >
                  {phase === 'committing' ? 'Ukládám...' : `Potvrdit import (${preview.length})`}
                </button>
              </div>
            )}
            {phase === 'done' && (
              <div className="px-6 py-4 border-t border-white/[0.08] flex justify-end">
                <button onClick={reset} className="px-5 py-2 bg-white/[0.08] hover:bg-white/[0.12] text-white text-sm rounded-xl transition-all">
                  Zavřít
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
