"use client";
import { useState } from "react";

export default function Modal({ open, title, children, onClose }) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-[#3c3c3c]/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-[#3c3c3c]/10 bg-surface-800 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-4 text-base font-bold text-[#3c3c3c]">{title}</h3>
        {children}
      </div>
    </div>
  );
}