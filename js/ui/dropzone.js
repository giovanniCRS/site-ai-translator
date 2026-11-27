import { collectFromDrop, collectFromFolderInput, collectFromZipInput } from '../io/file-source.js';

/**
 * Dropzone + pulsanti di selezione. Notifica il chiamante con onSelect(files, label).
 */
export function initDropzone(els, { onSelect }) {
  const { dropzone, folderInput, zipInput, pickFolderBtn, pickZipBtn } = els;

  ['dragenter', 'dragover'].forEach((ev) => {
    dropzone.addEventListener(ev, (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });
  });

  ['dragleave', 'drop'].forEach((ev) => {
    dropzone.addEventListener(ev, (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
    });
  });

  dropzone.addEventListener('drop', async (e) => {
    const { files, rootName } = await collectFromDrop(e.dataTransfer);
    onSelect(files, rootName);
  });

  pickFolderBtn.addEventListener('click', (e) => { e.stopPropagation(); folderInput.click(); });
  pickZipBtn.addEventListener('click', (e) => { e.stopPropagation(); zipInput.click(); });
  dropzone.addEventListener('click', () => folderInput.click());
  dropzone.addEventListener('keydown', (e) => {
    if (e.target !== dropzone) return; // non intercettare i tasti dei pulsanti interni
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      folderInput.click();
    }
  });

  folderInput.addEventListener('change', () => {
    const result = collectFromFolderInput(folderInput.files);
    if (result) onSelect(result.files, result.rootName);
  });

  zipInput.addEventListener('change', () => {
    const result = collectFromZipInput(zipInput.files[0]);
    if (result) onSelect(result.files, result.rootName);
  });
}
