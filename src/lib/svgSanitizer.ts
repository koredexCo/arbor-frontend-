/**
 * Arbor Execution Boundary Security - SVG Sanitizer.
 * Enforces strict DOM AST sanitization and neutralization of active document vectors
 * (scripts, event handlers, external references, foreignObjects) before rendering.
 * Governance: ISSUE-018 / DEF-OBS-01 Hardening.
 */

export interface SvgSanitizationResult {
  isValid: boolean;
  sanitizedSvg: string | null;
  safeDataUrl: string | null;
  error?: string;
  removedElementsCount: number;
  removedAttributesCount: number;
}

export const PROHIBITED_TAGS = new Set([
  'script',
  'foreignobject',
  'use',
  'object',
  'embed',
  'applet',
  'iframe',
  'frame',
  'frameset',
  'meta',
  'link',
  'base',
  'form',
  'input',
  'button',
  'textarea',
  'select',
  'audio',
  'video',
  'style', // disable embedded stylesheets to prevent CSS expression / injection attacks
  'animate',
  'set',
  'animatemotion',
  'animatetransform',
  'handler',
  'discard',
  'feimage'
]);

export interface DomParserAndSerializer {
  parser: { parseFromString(str: string, mimeType: string): any };
  serializer: { serializeToString(node: any): string };
}

let configuredParserProvider: DomParserAndSerializer | null = null;

/**
 * Allows test harnesses or non-browser environments to explicitly supply
 * a compliant DOM AST parser and serializer.
 */
export function setDomParserAndSerializer(provider: DomParserAndSerializer | null): void {
  configuredParserProvider = provider;
}

/**
 * Resolves an approved DOMParser and XMLSerializer implementation.
 * Returns browser native implementations when available, configured test implementations,
 * or null if no valid DOM AST parser exists.
 */
export function getDomParserAndSerializer(): DomParserAndSerializer | null {
  if (configuredParserProvider) {
    return configuredParserProvider;
  }

  // 1. Browser / standard globalThis environment
  const g = typeof globalThis !== 'undefined' ? (globalThis as any) : null;
  if (g && typeof g.DOMParser !== 'undefined' && typeof g.XMLSerializer !== 'undefined') {
    return {
      parser: new g.DOMParser(),
      serializer: new g.XMLSerializer()
    };
  }

  // 2. Window / self environment
  const w = typeof window !== 'undefined' ? (window as any) : null;
  if (w && typeof w.DOMParser !== 'undefined' && typeof w.XMLSerializer !== 'undefined') {
    return {
      parser: new w.DOMParser(),
      serializer: new w.XMLSerializer()
    };
  }

  return null;
}

export function isSvgContent(content: string): boolean {
  if (!content || typeof content !== 'string') return false;
  const trimmed = content.trim();
  return (
    trimmed.startsWith('<svg') ||
    (trimmed.startsWith('<?xml') && trimmed.includes('<svg')) ||
    trimmed.startsWith('data:image/svg+xml')
  );
}

export function sanitizeSvg(rawSvg: string): SvgSanitizationResult {
  if (!rawSvg || typeof rawSvg !== 'string') {
    return {
      isValid: false,
      sanitizedSvg: null,
      safeDataUrl: null,
      error: 'Empty or non-string SVG input',
      removedElementsCount: 0,
      removedAttributesCount: 0
    };
  }

  let svgText = rawSvg.trim();

  // If input is data URI, extract base64 or urlencoded SVG
  if (svgText.startsWith('data:image/svg+xml')) {
    const commaIndex = svgText.indexOf(',');
    if (commaIndex !== -1) {
      const header = svgText.slice(0, commaIndex);
      const data = svgText.slice(commaIndex + 1);
      if (header.includes('base64')) {
        try {
          const g = typeof globalThis !== 'undefined' ? (globalThis as any) : null;
          if (typeof atob === 'function') {
            svgText = atob(data);
          } else if (g && g.Buffer) {
            svgText = g.Buffer.from(data, 'base64').toString('utf-8');
          } else {
            return {
              isValid: false,
              sanitizedSvg: null,
              safeDataUrl: null,
              error: 'Base64 decoding unavailable in environment',
              removedElementsCount: 0,
              removedAttributesCount: 0
            };
          }
        } catch {
          return {
            isValid: false,
            sanitizedSvg: null,
            safeDataUrl: null,
            error: 'Failed to decode base64 SVG data URI',
            removedElementsCount: 0,
            removedAttributesCount: 0
          };
        }
      } else {
        svgText = decodeURIComponent(data);
      }
    }
  }

  // Obtain an approved DOM parser & serializer
  const domTools = getDomParserAndSerializer();
  if (!domTools) {
    // DEF-OBS-01: Fail closed if no compliant DOM AST parser is available.
    // Incomplete regex-based parsing is strictly prohibited.
    return {
      isValid: false,
      sanitizedSvg: null,
      safeDataUrl: null,
      error: 'DOMParser is not available in the current runtime environment. Untrusted SVG cannot be safely sanitized without a compliant DOM AST parser. Refusing execution fail-closed.',
      removedElementsCount: 0,
      removedAttributesCount: 0
    };
  }

  try {
    const doc = domTools.parser.parseFromString(svgText, 'image/svg+xml');

    // Check for parsererror element in standard DOM or xmldom
    const parserError = doc.querySelector
      ? doc.querySelector('parsererror')
      : (doc.getElementsByTagName ? doc.getElementsByTagName('parsererror')?.[0] : null);

    if (parserError) {
      return {
        isValid: false,
        sanitizedSvg: null,
        safeDataUrl: null,
        error: `Malformed SVG XML structure: ${parserError.textContent?.slice(0, 100) || 'Syntax error'}`,
        removedElementsCount: 0,
        removedAttributesCount: 0
      };
    }

    const svgElement = doc.documentElement;
    if (!svgElement || (svgElement.nodeName || svgElement.tagName || '').toLowerCase() !== 'svg') {
      return {
        isValid: false,
        sanitizedSvg: null,
        safeDataUrl: null,
        error: 'Root element is not <svg>',
        removedElementsCount: 0,
        removedAttributesCount: 0
      };
    }

    let removedElementsCount = 0;
    let removedAttributesCount = 0;

    // Traverse and sanitize elements
    const elements = Array.from(doc.getElementsByTagName('*') as any[]);
    for (const el of elements) {
      const tagName = (el.tagName || el.nodeName || '').toLowerCase();

      // 1. Remove prohibited tags
      if (PROHIBITED_TAGS.has(tagName)) {
        el.parentNode?.removeChild(el);
        removedElementsCount++;
        continue;
      }

      // 2. Remove dangerous attributes
      const attrs = Array.from((el.attributes || []) as any[]);
      for (const attr of attrs) {
        const name = (attr.name || '').toLowerCase();
        const val = (attr.value || '').trim().toLowerCase();

        // Strip event handlers (onload, onerror, onclick, onbegin, onend, etc.)
        if (name.startsWith('on')) {
          el.removeAttribute(attr.name);
          removedAttributesCount++;
          continue;
        }

        // Strip dangerous URI schemes in any attribute
        if (
          val.startsWith('javascript:') ||
          val.startsWith('vbscript:') ||
          val.startsWith('data:text/html') ||
          val.includes('javascript:') ||
          val.includes('vbscript:')
        ) {
          el.removeAttribute(attr.name);
          removedAttributesCount++;
          continue;
        }

        // Strip nested SVG data URIs in linking attributes to prevent polyglot vectors
        if (val.includes('data:image/svg+xml') && (name === 'href' || name === 'xlink:href' || name === 'src')) {
          el.removeAttribute(attr.name);
          removedAttributesCount++;
          continue;
        }
      }
    }

    const cleanSvg = domTools.serializer.serializeToString(svgElement);
    const safeDataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(cleanSvg)}`;

    return {
      isValid: true,
      sanitizedSvg: cleanSvg,
      safeDataUrl,
      removedElementsCount,
      removedAttributesCount
    };
  } catch (err: any) {
    return {
      isValid: false,
      sanitizedSvg: null,
      safeDataUrl: null,
      error: `SVG sanitization parser exception: ${err?.message || String(err)}`,
      removedElementsCount: 0,
      removedAttributesCount: 0
    };
  }
}
