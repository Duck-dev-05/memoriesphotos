"use client";

import { useEffect } from "react";

export default function GlobalDropPreventer() {
  useEffect(() => {
    // Prevent the browser's default behavior of opening files when dropped
    // anywhere on the window.
    const preventDefault = (e: DragEvent) => {
      e.preventDefault();
      // We don't stop propagation here so that specific dropzones (like DragDropUploader)
      // can still handle the drop event.
    };

    window.addEventListener("dragover", preventDefault);
    window.addEventListener("drop", preventDefault);

    return () => {
      window.removeEventListener("dragover", preventDefault);
      window.removeEventListener("drop", preventDefault);
    };
  }, []);

  return null;
}
