const SCRIPT_STYLE_PATTERN = /<(script|style)[^>]*>[\s\S]*?<\/\1>/gi
const EVENT_HANDLER_PATTERN = /\s+on\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi
const JAVASCRIPT_URL_PATTERN = /\s+(href|src)\s*=\s*("|')\s*javascript:[^"']*\2/gi

export function sanitizeHtmlForPreview(html: string): string {
  if (!html) {
    return ''
  }

  return html
    .replace(SCRIPT_STYLE_PATTERN, '')
    .replace(EVENT_HANDLER_PATTERN, '')
    .replace(JAVASCRIPT_URL_PATTERN, '')
}
