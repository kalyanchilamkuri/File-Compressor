import { useEffect, useState } from 'react';
import type { PdfPreview } from '../engine/pdf/preview';

/**
 * First-page thumbnail and page count for a PDF; pdf.js loads only once a PDF is passed in.
 * Returns nulls for a locked or damaged file, which callers show as a plain "PDF" badge.
 */
export function usePdfThumb(file: File | null): { thumb: Blob | null; pageCount: number | null } {
  const [state, setState] = useState<{ file: File; preview: PdfPreview } | null>(null);
  useEffect(() => {
    if (!file) return;
    let cancelled = false;
    void import('../engine/pdf/preview')
      .then(({ pdfPreview }) => pdfPreview(file, 18))
      .then((preview) => !cancelled && setState({ file, preview }))
      .catch(() => {
        // Locked or damaged PDFs just keep the "PDF" badge.
      });
    return () => {
      cancelled = true;
    };
  }, [file]);
  const preview = state?.file === file ? state.preview : null;
  return { thumb: preview?.png ?? null, pageCount: preview?.pageCount ?? null };
}
