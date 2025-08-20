// src/components/common/ConfirmDialog.jsx
import React from "react";

export default function ConfirmDialog({
  open,
  title = "Are you sure?",
  description = "",
  confirmText = "Confirm",
  cancelText = "Cancel",
  destructive = false,
  onConfirm,
  onClose,
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-4">
        <div className="flex items-start gap-3">
          <div
            className={
              "mt-1 w-8 h-8 rounded-full flex items-center justify-center text-white " +
              (destructive ? "bg-rose-600" : "bg-indigo-600")
            }
          >
            !
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold">{title}</h3>
            {description && (
              <p className="mt-1 text-sm text-gray-600">{description}</p>
            )}
          </div>
          <button
            className="text-gray-500 hover:text-gray-700"
            aria-label="Close"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button className="px-3 py-2 rounded border" onClick={onClose}>
            {cancelText}
          </button>
          <button
            className={
              "px-4 py-2 rounded text-white " +
              (destructive
                ? "bg-rose-600 hover:bg-rose-700"
                : "bg-indigo-600 hover:bg-indigo-700")
            }
            onClick={() => {
              onConfirm?.();
              onClose?.();
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
