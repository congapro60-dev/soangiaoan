export const ALLOWED_DOMAINS = [
  'cdnjs.cloudflare.com',
  'cdn.jsdelivr.net',
  'unpkg.com',
  'fonts.googleapis.com',
  'fonts.gstatic.com',
];

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export const validateSimulationHtml = (html: string): ValidationResult => {
  if (!html || typeof html !== 'string') {
    return { isValid: false, error: 'HTML is empty or invalid.' };
  }

  // Prevent simple storage access patterns
  if (html.includes('localStorage') || html.includes('sessionStorage')) {
    return { isValid: false, error: 'Simulation uses forbidden APIs: localStorage/sessionStorage is not allowed.' };
  }
  
  // Prevent simple network requests (note: CSP will also block this, but catching it early is better UX)
  if (html.includes('fetch(') || html.includes('XMLHttpRequest')) {
    return { isValid: false, error: 'Simulation uses forbidden APIs: Network requests (fetch/XHR) are not allowed.' };
  }
  
  if (html.includes('document.cookie')) {
    return { isValid: false, error: 'Simulation uses forbidden APIs: Cookie access is not allowed.' };
  }

  // Validate script tags src
  const scriptSrcRegex = /<script[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi;
  let match;
  while ((match = scriptSrcRegex.exec(html)) !== null) {
    const src = match[1];
    if (!src) continue;

      // Try to parse as absolute URL first
      try {
        const url = new URL(src);
        if (url.protocol === 'http:' || url.protocol === 'https:') {
          const isAllowed = ALLOWED_DOMAINS.some(domain => url.hostname === domain || url.hostname.endsWith(`.${domain}`));
          if (!isAllowed) {
            return { isValid: false, error: `Simulation uses forbidden external script: ${url.hostname} is not whitelisted.` };
          }
        } else if (url.protocol !== 'data:' && url.protocol !== 'blob:') {
           return { isValid: false, error: `Simulation uses forbidden script protocol: ${url.protocol}` };
        }
      } catch {
        // If new URL(src) throws, it's likely a relative URL like "/api/steal" or "script.js"
        // We do not allow relative or local scripts in sandboxed simulations.
        return { isValid: false, error: `Simulation uses relative or invalid script source: ${src}` };
      }
  }

  return { isValid: true };
};

export const injectStrictCSP = (html: string): string => {
  const allowedScriptDomains = ALLOWED_DOMAINS.map(d => `https://${d}`).join(' ');
  const cspContent = `default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval' ${allowedScriptDomains}; style-src 'unsafe-inline' https://fonts.googleapis.com ${allowedScriptDomains}; font-src https://fonts.gstatic.com data: ${allowedScriptDomains}; connect-src 'none'; img-src data: https: blob:; worker-src blob:;`;
  
  const metaTag = `<meta http-equiv="Content-Security-Policy" content="${cspContent}">`;
  
  // If <head> exists, inject right after <head>
  if (html.match(/<head[^>]*>/i)) {
    return html.replace(/(<head[^>]*>)/i, `$1\n  ${metaTag}`);
  }
  
  // If <html> exists but no <head>, inject <head> after <html>
  if (html.match(/<html[^>]*>/i)) {
    return html.replace(/(<html[^>]*>)/i, `$1\n<head>\n  ${metaTag}\n</head>`);
  }
  
  // Otherwise prepend
  return `<head>\n  ${metaTag}\n</head>\n${html}`;
};
