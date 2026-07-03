import { X, AlertTriangle, Loader2 } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";

interface ModernConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  isDestructive?: boolean;
}

export default function ModernConfirmModal({
  isOpen,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
  isDestructive = false,
}: ModernConfirmModalProps) {
  const [isPending, setIsPending] = useState(false);
  const cancelBtnRef = useRef<HTMLButtonElement>(null);
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  // Close modal on Escape key press
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isPending) {
        onCancel();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onCancel, isPending]);

  // Focus trap / initial focus on open
  useEffect(() => {
    if (isOpen) {
      // Focus the cancel button first for safety, especially if it is destructive
      if (isDestructive && cancelBtnRef.current) {
        cancelBtnRef.current.focus();
      } else if (confirmBtnRef.current) {
        confirmBtnRef.current.focus();
      }
    }
  }, [isOpen, isDestructive]);

  if (!isOpen) return null;

  const handleConfirmClick = async () => {
    setIsPending(true);
    try {
      await onConfirm();
    } catch (err) {
      console.error("Action confirmation execution failed:", err);
    } finally {
      setIsPending(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[250] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in font-sans"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isPending) onCancel();
      }}
    >
      <div 
        className="w-full max-w-sm rounded-xl border border-neutral-800 bg-[#181818] p-5 shadow-2xl text-neutral-200 flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-900 pb-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5 font-sans">
            <AlertTriangle className={`h-4 w-4 ${isDestructive ? "text-rose-500" : "text-amber-500"}`} />
            {title}
          </h3>
          <button
            onClick={onCancel}
            disabled={isPending}
            className="rounded-lg p-1 hover:bg-neutral-900 text-neutral-400 hover:text-white transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <p className="text-xs text-neutral-400 leading-relaxed font-sans">
          {message}
        </p>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-neutral-900 pt-3">
          <button
            ref={cancelBtnRef}
            onClick={onCancel}
            disabled={isPending}
            className="px-3.5 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-850 text-xs font-semibold cursor-pointer transition-colors text-neutral-300 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {cancelText}
          </button>
          <button
            ref={confirmBtnRef}
            onClick={handleConfirmClick}
            disabled={isPending}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors text-white flex items-center gap-1.5 ${
              isDestructive 
                ? "bg-rose-600 hover:bg-rose-500 disabled:bg-rose-800" 
                : "bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800"
            } disabled:cursor-not-allowed`}
          >
            {isPending && <Loader2 className="h-3 w-3 animate-spin text-white" />}
            <span>{confirmText}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
