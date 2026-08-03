import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Trash2, History, AlertCircle, Calendar } from 'lucide-react'
import { aumApi, type AumSnapshot } from '@/lib/api'
import { useModal } from '@/contexts/ModalContext'

interface Props {
  open: boolean
  onClose: () => void
  onUpdated: () => void
}

export default function HistoryManageModal({ open, onClose, onUpdated }: Props) {
  const { confirm, alert } = useModal()
  const [snapshots, setSnapshots] = useState<AumSnapshot[]>([])
  const [loading, setLoading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    loadSnapshots()
  }, [open])

  const loadSnapshots = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await aumApi.getSnapshots()
      // Sort by date descending (newest first)
      const sorted = (res.data || []).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      setSnapshots(sorted)
    } catch {
      setError('Nepodařilo se načíst historii AUM ze severu.')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string, dateStr: string) => {
    const confirmed = await confirm({
      title: 'Smazat historický záznam?',
      description: `Opravdu si přejete trvale smazat záznam z data ${new Date(dateStr).toLocaleDateString('cs-CZ')}?`,
      variant: 'danger',
      confirmText: 'Smazat záznam',
      cancelText: 'Zrušit'
    })
    if (!confirmed) {
      return
    }
    setDeletingId(id)
    try {
      await aumApi.deleteSnapshot(id)
      setSnapshots(prev => prev.filter(s => s.id !== id))
      onUpdated()
    } catch {
      await alert({
        title: 'Chyba',
        description: 'Chyba při mazání záznamu.',
        variant: 'danger'
      })
    } finally {
      setDeletingId(null)
    }
  }

  const handleClearAll = async () => {
    const confirmed = await confirm({
      title: 'Vymazat celou historii?',
      description: 'VAROVÁNÍ: Opravdu chcete vymazat CELOU historii denních AUM záznamů z databáze? Tato akce je nevratná!',
      variant: 'danger',
      confirmText: 'Vymazat historii',
      cancelText: 'Zrušit'
    })
    if (!confirmed) {
      return
    }
    setLoading(true)
    try {
      await aumApi.clearSnapshots()
      setSnapshots([])
      onUpdated()
    } catch {
      await alert({
        title: 'Chyba',
        description: 'Chyba při promazávání historie.',
        variant: 'danger'
      })
      setLoading(false)
    }
  }

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 modal-backdrop animate-in fade-in duration-200" onClick={onClose} />
      
      <div className="relative z-10 w-full max-w-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-500">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-800 dark:text-zinc-100">Správa historických záznamů AUM</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Přehled uložených denních snímků spravovaného majetku s možností smazat chybné záznamy.</p>
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-44 gap-3">
              <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-zinc-500 dark:text-zinc-400 text-sm">Načítám uložené záznamy...</span>
            </div>
          ) : error ? (
            <div className="flex items-center gap-3 text-red-600 dark:text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl p-4">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          ) : snapshots.length === 0 ? (
            <div className="text-center py-14 text-zinc-400 dark:text-zinc-500">
              <Calendar className="w-10 h-10 mx-auto mb-3 stroke-[1.5] opacity-40" />
              <p className="text-sm font-medium">V databázi zatím nemáte žádné historické snímky AUM.</p>
              <p className="text-xs mt-1 text-zinc-400/80">Nový záznam se vytvoří při každé úpravě či importu hodnot portfolia.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                <span>Uloženo celkem <strong>{snapshots.length}</strong> unikátních denních záznamů</span>
                {snapshots.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearAll}
                    className="text-red-600 dark:text-red-400 hover:underline font-semibold cursor-pointer"
                  >
                    Smazat celou historii
                  </button>
                )}
              </div>

              <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-zinc-50 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-300 sticky top-0 border-b border-zinc-200 dark:border-zinc-800">
                    <tr>
                      <th className="py-2.5 px-4 font-semibold">Datum snímku</th>
                      <th className="py-2.5 px-4 font-semibold text-right">Celkové AUM k datu</th>
                      <th className="py-2.5 px-4 font-semibold text-right">Celkové vklady</th>
                      <th className="py-2.5 px-4 font-semibold text-center">Akce</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200/60 dark:divide-zinc-800/60">
                    {snapshots.map(s => (
                      <tr key={s.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                        <td className="py-2.5 px-4 font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                          {new Date(s.date).toLocaleDateString('cs-CZ')}
                        </td>
                        <td className="py-2.5 px-4 font-mono font-bold text-right text-blue-600 dark:text-blue-400">
                          {Number(s.totalAum).toLocaleString('cs-CZ')} Kč
                        </td>
                        <td className="py-2.5 px-4 font-mono font-medium text-right text-zinc-600 dark:text-zinc-400">
                          {Number(s.totalMonthlyDeposit).toLocaleString('cs-CZ')} Kč
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <button
                            type="button"
                            disabled={deletingId === s.id}
                            onClick={() => handleDelete(s.id, s.date)}
                            className="p-1 text-zinc-400 hover:text-red-600 dark:hover:text-red-400 rounded-md transition-colors disabled:opacity-50 cursor-pointer"
                            title="Smazat tento historický záznam"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-3.5 bg-zinc-50/50 dark:bg-zinc-800/20 border-t border-zinc-200 dark:border-zinc-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-white bg-zinc-800 hover:bg-zinc-700 dark:bg-zinc-700 dark:hover:bg-zinc-600 rounded-xl transition-all shadow-sm cursor-pointer"
          >
            Zavřít
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
