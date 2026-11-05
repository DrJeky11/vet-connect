"use client";

export function PrintButton({ label }: { label: string }) {
  return (
    <p className="no-print">
      <button type="button" className="btn btn-primary text-xl" onClick={() => window.print()}>
        🖨️ {label}
      </button>
    </p>
  );
}
