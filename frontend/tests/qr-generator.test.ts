import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  generateQrMatrix,
  generateQrSvgPath,
  generateQrSvgString,
  buildUpiUri,
  isValidUpiId,
} from '../src/utils/qrCodeGenerator.ts';

describe('QR Code Generator & UPI Utility', () => {
  it('generates a valid QR matrix for store URL', () => {
    const url = 'https://gupta-store.ferasetu.com';
    const matrix = generateQrMatrix(url, 'M');

    assert.ok(Array.isArray(matrix));
    assert.ok(matrix.length > 0);
    assert.strictEqual(matrix.length, matrix[0].length);

    // Verify finder pattern at top-left (7x7)
    // Center of finder pattern (row 3, col 3) is always dark
    assert.strictEqual(matrix[3][3], true);
    // Outer border of finder pattern (row 0, col 0) is always dark
    assert.strictEqual(matrix[0][0], true);
  });

  it('generates a valid QR matrix for standard NPCI UPI URI', () => {
    const upiUri = buildUpiUri({
      upiId: 'shopkeeper@okhdfcbank',
      payeeName: 'Gupta Kirana Store',
      note: 'Payment to Gupta Kirana',
    });

    assert.ok(upiUri.startsWith('upi://pay?'));
    assert.ok(upiUri.includes('pa=shopkeeper%40okhdfcbank'));
    assert.ok(upiUri.includes('pn=Gupta+Kirana+Store'));

    const matrix = generateQrMatrix(upiUri, 'M');
    assert.ok(matrix.length >= 21); // At least Version 1 or higher
  });

  it('generates SVG path and complete SVG string correctly', () => {
    const text = 'https://mydukaan.ferasetu.com';
    const matrix = generateQrMatrix(text);
    const { path, size } = generateQrSvgPath(matrix, 4);

    assert.ok(path.length > 0);
    assert.ok(path.startsWith('M'));
    assert.strictEqual(size, matrix.length + 8);

    const svg = generateQrSvgString(text, { size: 240 });
    assert.ok(svg.includes('<svg'));
    assert.ok(svg.includes('xmlns="http://www.w3.org/2000/svg"'));
    assert.ok(svg.includes('viewBox="0 0'));
    assert.ok(svg.includes('</svg>'));
  });

  it('validates UPI IDs correctly', () => {
    assert.strictEqual(isValidUpiId('gupta@okhdfcbank'), true);
    assert.strictEqual(isValidUpiId('9876543210@paytm'), true);
    assert.strictEqual(isValidUpiId('shop.merchant@ybl'), true);
    assert.strictEqual(isValidUpiId('merchant-123@icici'), true);

    assert.strictEqual(isValidUpiId('invalid-upi'), false);
    assert.strictEqual(isValidUpiId('@bank'), false);
    assert.strictEqual(isValidUpiId('user@'), false);
    assert.strictEqual(isValidUpiId(''), false);
  });
});
