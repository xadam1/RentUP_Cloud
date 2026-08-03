import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import ConfirmDialog, { type ModalVariant } from '@/components/shared/ConfirmDialog';

interface ConfirmOptions {
  title?: string;
  description: string;
  variant?: ModalVariant;
  confirmText?: string;
  cancelText?: string;
}

interface AlertOptions {
  title?: string;
  description: string;
  variant?: ModalVariant;
  confirmText?: string;
}

interface ModalContextType {
  confirm: (options: ConfirmOptions | string) => Promise<boolean>;
  alert: (options: AlertOptions | string) => Promise<void>;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export function ModalProvider({ children }: { children: ReactNode }) {
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    variant: ModalVariant;
    confirmText: string;
    cancelText?: string;
    isAlertOnly: boolean;
    resolve: ((val: any) => void) | null;
  }>({
    isOpen: false,
    title: '',
    description: '',
    variant: 'info',
    confirmText: 'OK',
    cancelText: 'Zrušit',
    isAlertOnly: false,
    resolve: null,
  });

  const confirm = useCallback((options: ConfirmOptions | string) => {
    return new Promise<boolean>((resolve) => {
      if (typeof options === 'string') {
        setModalState({
          isOpen: true,
          title: 'Potvrdit akci',
          description: options,
          variant: 'info',
          confirmText: 'Potvrdit',
          cancelText: 'Zrušit',
          isAlertOnly: false,
          resolve,
        });
      } else {
        setModalState({
          isOpen: true,
          title: options.title || 'Potvrdit akci',
          description: options.description,
          variant: options.variant || 'info',
          confirmText: options.confirmText || 'Potvrdit',
          cancelText: options.cancelText || 'Zrušit',
          isAlertOnly: false,
          resolve,
        });
      }
    });
  }, []);

  const alert = useCallback((options: AlertOptions | string) => {
    return new Promise<void>((resolve) => {
      if (typeof options === 'string') {
        setModalState({
          isOpen: true,
          title: 'Upozornění',
          description: options,
          variant: 'info',
          confirmText: 'Rozumím',
          isAlertOnly: true,
          resolve: () => resolve(),
        });
      } else {
        setModalState({
          isOpen: true,
          title: options.title || 'Upozornění',
          description: options.description,
          variant: options.variant || 'info',
          confirmText: options.confirmText || 'Rozumím',
          isAlertOnly: true,
          resolve: () => resolve(),
        });
      }
    });
  }, []);

  const handleConfirm = () => {
    if (modalState.resolve) modalState.resolve(true);
    setModalState((prev) => ({ ...prev, isOpen: false }));
  };

  const handleCancel = () => {
    if (modalState.resolve) {
      if (modalState.isAlertOnly) {
        modalState.resolve(undefined);
      } else {
        modalState.resolve(false);
      }
    }
    setModalState((prev) => ({ ...prev, isOpen: false }));
  };

  return (
    <ModalContext.Provider value={{ confirm, alert }}>
      {children}
      <ConfirmDialog
        isOpen={modalState.isOpen}
        title={modalState.title}
        description={modalState.description}
        variant={modalState.variant}
        confirmText={modalState.confirmText}
        cancelText={modalState.cancelText}
        isAlertOnly={modalState.isAlertOnly}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </ModalContext.Provider>
  );
}

export function useModal() {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
}
