export function htmlSystemPrompt(targetLang) {
  return `You are a professional website translator. Translate the text inside each <t id="...">...</t> tag into ${targetLang}.
Rules:
- Keep EVERY <t id="..."> and </t> tag and its exact id number.
- Preserve leading/trailing spaces and any quotation marks inside the text.
- Do NOT translate brand names, emails, or URLs.
- Return ONLY the translated <t id="...">...</t> tags, without markdown fences or explanations.`;
}

export function codeSystemPrompt(ext, targetLang) {
  const prompts = {
    '.js': `Translate ONLY user-facing strings (alerts, form validation messages, UI text) in this JavaScript snippet into ${targetLang}. NEVER change variable names, functions, DOM selectors, or logic. Return ONLY raw JS code without markdown fences.`,
    '.php': `Translate ONLY user-facing strings (echo messages, email subjects/bodies, validation errors) in this PHP snippet into ${targetLang}. NEVER change variable names, array keys, SQL, or logic. Return ONLY raw PHP code without markdown fences.`,
  };
  return prompts[ext];
}
