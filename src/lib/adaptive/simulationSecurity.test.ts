import { describe, it, expect } from 'vitest';
import { validateSimulationHtml, injectStrictCSP } from './simulationSecurity';

describe('simulationSecurity', () => {
  describe('validateSimulationHtml', () => {
    it('should pass valid basic html', () => {
      const html = `<html><body><h1>Hello</h1></body></html>`;
      expect(validateSimulationHtml(html).isValid).toBe(true);
    });

    it('should pass html with whitelisted script', () => {
      const html = `<html><head><script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.4.0/p5.js"></script></head><body></body></html>`;
      expect(validateSimulationHtml(html).isValid).toBe(true);
    });

    it('should block non-whitelisted script domains', () => {
      const html = `<html><head><script src="https://evil.com/malware.js"></script></head><body></body></html>`;
      const result = validateSimulationHtml(html);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('evil.com is not whitelisted');
    });

    it('should block localStorage', () => {
      const html = `<script>localStorage.setItem('x', '1')</script>`;
      const result = validateSimulationHtml(html);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('localStorage/sessionStorage');
    });

    it('should block fetch API', () => {
      const html = `<script>fetch('https://google.com')</script>`;
      const result = validateSimulationHtml(html);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('fetch/XHR');
    });

    it('should block relative script paths', () => {
      const html = `<script src="/api/steal"></script>`;
      const result = validateSimulationHtml(html);
      expect(result.isValid).toBe(false);
    });
  });

  describe('injectStrictCSP', () => {
    it('should inject meta tag into head', () => {
      const html = `<!DOCTYPE html><html><head><title>Test</title></head><body></body></html>`;
      const result = injectStrictCSP(html);
      expect(result).toContain('<meta http-equiv="Content-Security-Policy"');
      expect(result).toMatch(/<head[^>]*>\s*<meta http-equiv="Content-Security-Policy"/i);
    });

    it('should create head if missing but html exists', () => {
      const html = `<html><body><p>Hello</p></body></html>`;
      const result = injectStrictCSP(html);
      expect(result).toContain('<head>');
      expect(result).toContain('</head>');
      expect(result).toContain('<meta http-equiv="Content-Security-Policy"');
    });

    it('should prepend head if both html and head are missing', () => {
      const html = `<div>Hello</div>`;
      const result = injectStrictCSP(html);
      expect(result.startsWith('<head>')).toBe(true);
      expect(result).toContain('<meta http-equiv="Content-Security-Policy"');
      expect(result).toContain('<div>Hello</div>');
    });
  });
});
