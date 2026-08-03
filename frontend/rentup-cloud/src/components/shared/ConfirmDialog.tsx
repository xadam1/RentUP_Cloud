import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Info, CheckCircle2, XCircle, X } from 'lucide-react';

export type ModalVariant = 'danger' | 'warning' | 'info' | 'success';

export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  variant?: ModalVariant;
  confirmText?: string;
  cancelText?: string;
  isAlertOnly?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  isOpen,
  title,
  description,
  variant = 'info',
  confirmText = 'OK',
  cancelText = 'Zrušit',
  isAlertOnly = false,
  onConfirm,
  onCancel
}: ConfirmDialogProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const getIconAndColors = () => {
    switch (variant) {
      case 'danger':
        return {
          icon: XCircle,
          badgeBg: 'bg-rose-500/15 border-rose-500/30 text-rose-500',
          confirmBtn: 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-500/25 border border-rose-500',
        };
      case 'warning':
        return {
          icon: AlertTriangle,
          badgeBg: 'bg-amber-500/15 border-amber-500/30 text-amber-500',
          confirmBtn: 'bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-500/25 border border-amber-500',
        };
      case 'success':
        return {
          icon: CheckCircle2,
          badgeBg: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-500',
          confirmBtn: 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/25 border border-emerald-500',
        };
      case 'info':
      default:
        return {
          icon: Info,
          badgeBg: 'bg-blue-500/15 border-blue-500/30 text-blue-500',
          confirmBtn: 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/25 border border-blue-500',
        };
    }
  };

  const { icon: Icon, badgeBg, confirmBtn } = getIconAndColors();

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="fixed inset-0 modal-backdrop animate-in fade-in duration-200" onClick={onCancel} />
      <div className="relative z-10 w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 text-left">
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center flex-shrink-0 ${badgeBg}`}>
              <Icon className="w-6 h-6 stroke-[2]" />
            </div>
            <div className="flex-1 min-w-0 pt-0.5">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white tracking-tight">{title}</h3>
                <button
                  type="button"
                  onClick={onCancel}
                  className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors p-1 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-sm text-zinc-600 dark:text-zinc-300 mt-2 leading-relaxed whitespace-pre-line">
                {description}
              </p>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-zinc-50/50 dark:bg-zinc-800/30 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-end gap-3">
          {!isAlertOnly && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 rounded-xl transition-all cursor-pointer"
            >
              {cancelText}
            </button>
          )}
          <button
            type="button"
            onClick={onConfirm}
            className={`px-5 py-2 text-sm font-semibold rounded-xl transition-all cursor-pointer ${confirmBtn}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
