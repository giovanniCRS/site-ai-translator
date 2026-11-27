// Serializza il documento rispettando doctype originale e documenti-frammento (senza <html>).
export function serializeHtmlDoc(doc, originalHtml) {
  if (/<html[\s>]/i.test(originalHtml)) {
    const m = originalHtml.match(/^\s*((?:<!--[\s\S]*?-->\s*)*<!doctype[^>]*>)/i);
    return (m ? m[1].trimStart() : '<!DOCTYPE html>') + '\n' + doc.documentElement.outerHTML;
  }
  return doc.head.innerHTML + doc.body.innerHTML;
}
