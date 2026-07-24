import toast from 'react-hot-toast';

/**
 * Shows a confirmation toast with Cancel/Confirm buttons.
 * Returns a Promise that resolves to true if confirmed, false if cancelled.
 */
export function confirmToast(message: string): Promise<boolean> {
  return new Promise((resolve) => {
    toast(
      (t) => (
        <div className="flex flex-col gap-2">
          <p className="text-sm">{message}</p>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => { toast.dismiss(t.id); resolve(false); }}
              className="px-3 py-1 text-xs rounded-lg bg-gray-600 hover:bg-gray-500 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={() => { toast.dismiss(t.id); resolve(true); }}
              className="px-3 py-1 text-xs rounded-lg bg-red-600 hover:bg-red-500 transition-colors"
            >
              Eliminar
            </button>
          </div>
        </div>
      ),
      { duration: 8000 }
    );
  });
}
