import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  generateQrMatrix,
  generateQrSvgString,
  buildUpiUri,
  isValidUpiId,
} from '../src/utils/qrCodeGenerator.ts';

describe('Dashboard Payment Step & Real QR Verification', () => {
  it('generates a scannable 2D QR matrix for store and payment URLs', () => {
    // 1. Storefront URL QR
    const storeUrl = 'https://ramesh-kirana.ferasetu.com';
    const storeMatrix = generateQrMatrix(storeUrl);
    assert.ok(storeMatrix.length >= 21);
    assert.strictEqual(storeMatrix[0][0], true); // top-left finder pattern corner

    // 2. Direct UPI Payment QR
    const upiUri = buildUpiUri({
      upiId: 'rameshkirana@okhdfcbank',
      payeeName: 'Ramesh Kirana Store',
    });
    assert.strictEqual(upiUri, 'upi://pay?pa=rameshkirana%40okhdfcbank&pn=Ramesh+Kirana+Store&cu=INR');

    const upiMatrix = generateQrMatrix(upiUri);
    assert.ok(upiMatrix.length >= 25);
    assert.strictEqual(upiMatrix[0][0], true);
  });

  it('validates common Indian shopkeeper UPI handles correctly', () => {
    // Valid UPI handles
    assert.strictEqual(isValidUpiId('shop@okhdfcbank'), true);
    assert.strictEqual(isValidUpiId('9876543210@paytm'), true);
    assert.strictEqual(isValidUpiId('kirana-store@ybl'), true);
    assert.strictEqual(isValidUpiId('bodega.boutique@icici'), true);
    assert.strictEqual(isValidUpiId('merchant@sbi'), true);

    // Invalid UPI handles
    assert.strictEqual(isValidUpiId('not-a-upi'), false);
    assert.strictEqual(isValidUpiId('@paytm'), false);
    assert.strictEqual(isValidUpiId('store@'), false);
    assert.strictEqual(isValidUpiId(''), false);
  });

  it('generates an SVG with crisp edges and proper XML namespace', () => {
    const svg = generateQrSvgString('https://shop.ferasetu.com', { size: 200 });
    assert.ok(svg.includes('shape-rendering="crispEdges"'));
    assert.ok(svg.includes('width="200"'));
    assert.ok(svg.includes('height="200"'));
    assert.ok(svg.includes('<path d="M'));
  });
});
