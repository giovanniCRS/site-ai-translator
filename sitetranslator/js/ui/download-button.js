export function createDownloadButton(downloadBtn) {
  let lastBlobUrl = null;

  return {
    hide: () => { downloadBtn.style.display = 'none'; },
    show(blob, targetLang) {
      if (lastBlobUrl) URL.revokeObjectURL(lastBlobUrl);
      lastBlobUrl = URL.createObjectURL(blob);

      const safeLang = targetLang.toLowerCase().replace(/[^a-z0-9]/g, '-');
      downloadBtn.href = lastBlobUrl;
      downloadBtn.download = `site-translated-${safeLang}.zip`;
      downloadBtn.style.display = 'inline-flex';
    },
  };
}
