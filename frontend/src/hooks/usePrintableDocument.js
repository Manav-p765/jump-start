import { useEffect, useRef, useState } from "react";

const PRINT_MODE_CLASS = "jumpstart-report-print-mode";

// Print fallback for engines without block-fragment `box-decoration-break:
// clone` (Safari; Chrome before 130). There the report root's padding only
// lands on the first and last printed page, so every other page started
// flush against the sheet edge and printers cut its top off. Real @page
// margins work everywhere; position:fixed boxes cannot paint into a page
// margin, so the running logo bands give way to the cover's own letterhead.
// Injected from JS because the CSS build rewrites an equivalent @supports
// query into one these engines pass (see index.css). Both padding selectors
// are needed: the Download flow's body-class rule is the more specific one.
const NO_CLONE_PRINT_CSS = `@media print {
  @page { margin: 16mm 0 14mm; }
  .report-print-root,
  .jumpstart-report-print-mode .report-print-root {
    padding-top: 0 !important;
    padding-bottom: 0 !important;
  }
  .report-print-running { display: none !important; }
  .report-print-cover-head { display: flex !important; }
}`;

const supportsBlockClone = () =>
  typeof window !== "undefined" &&
  Boolean(window.CSS?.supports?.("box-decoration-break", "clone"));

const waitForNextPaint = () =>
  new Promise((resolve) => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(resolve);
    });
  });

export default function usePrintableDocument() {
  const [isPreparingPrint, setIsPreparingPrint] = useState(false);
  const printPendingRef = useRef(false);

  // Mounted with the page (not just on Download) so the browser's own
  // Ctrl+P path gets the fallback too.
  useEffect(() => {
    if (typeof document === "undefined" || supportsBlockClone()) return undefined;
    const style = document.createElement("style");
    style.setAttribute("data-report-print-fallback", "");
    style.textContent = NO_CLONE_PRINT_CSS;
    document.head.appendChild(style);
    return () => style.remove();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    // The browser prints the document <title> ("Jumpstart") into the page
    // margin header. Blank it for the duration of the print so the PDF
    // doesn't show a stray "Jumpstart" caption above our own letterhead.
    // A single space (not "") is used because some browsers fall back to the
    // URL when the title is empty. beforeprint covers BOTH our Download
    // button (programmatic window.print) and the native Ctrl+P path. The
    // saved title lives in this effect-scoped closure (not a hook/ref) so the
    // hook's signature stays minimal.
    let previousTitle = null;

    const restoreTitle = () => {
      if (previousTitle != null) {
        document.title = previousTitle;
        previousTitle = null;
      }
    };

    const handleBeforePrint = () => {
      if (previousTitle == null) {
        previousTitle = document.title;
        document.title = " ";
      }
    };

    const cleanupPrintMode = () => {
      printPendingRef.current = false;
      setIsPreparingPrint(false);
      document.body.classList.remove(PRINT_MODE_CLASS);
      restoreTitle();
    };

    window.addEventListener("beforeprint", handleBeforePrint);
    window.addEventListener("afterprint", cleanupPrintMode);

    return () => {
      window.removeEventListener("beforeprint", handleBeforePrint);
      window.removeEventListener("afterprint", cleanupPrintMode);
      cleanupPrintMode();
    };
  }, []);

  const printDocument = async () => {
    if (typeof window === "undefined" || printPendingRef.current) return;

    printPendingRef.current = true;
    setIsPreparingPrint(true);
    document.body.classList.add(PRINT_MODE_CLASS);

    await waitForNextPaint();
    window.print();
  };

  return {
    isPreparingPrint,
    printDocument,
  };
}
