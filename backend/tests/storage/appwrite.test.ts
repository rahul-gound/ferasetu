import { isValidImageUrl, uploadProductImage, deleteProductImage } from '../../src/services/storageService';

describe('Appwrite Storage Service Tests', () => {
  describe('isValidImageUrl', () => {
    it('accepts valid https URLs', () => {
      expect(isValidImageUrl('https://cloud.appwrite.io/v1/storage/buckets/69f60d1f00330c793cab/files/123/view')).toBe(true);
      expect(isValidImageUrl('https://images.unsplash.com/photo-1546069901-ba9599a7e63c')).toBe(true);
      expect(isValidImageUrl('http://example.com/item.png')).toBe(true);
    });

    it('rejects invalid, dangerous, or malformed URLs', () => {
      expect(isValidImageUrl('javascript:alert(1)')).toBe(false);
      expect(isValidImageUrl('data:image/png;base64,iVBORw0KGgo=')).toBe(false);
      expect(isValidImageUrl('file:///etc/passwd')).toBe(false);
      expect(isValidImageUrl('not-a-url')).toBe(false);
      expect(isValidImageUrl('')).toBe(false);
      expect(isValidImageUrl(null as any)).toBe(false);
    });
  });

  describe('uploadProductImage', () => {
    it('rejects unsupported mime types', async () => {
      await expect(uploadProductImage({
        buffer: Buffer.from('fake pdf'),
        originalname: 'doc.pdf',
        mimetype: 'application/pdf',
        size: 1024
      })).rejects.toThrow('Unsupported image format');
    });

    it('rejects oversized files exceeding maximum file limit', async () => {
      await expect(uploadProductImage({
        buffer: Buffer.alloc(10 * 1024 * 1024), // 10MB
        originalname: 'large.jpg',
        mimetype: 'image/jpeg',
        size: 10 * 1024 * 1024
      })).rejects.toThrow('File size exceeds maximum limit');
    });

    it('returns canonical Appwrite Storage URL with bucket 69f60d1f00330c793cab', async () => {
      const dummyFile = {
        buffer: Buffer.from('fake image data'),
        originalname: 'test-product.png',
        mimetype: 'image/png',
        size: 500
      };

      const result = await uploadProductImage(dummyFile);
      expect(result.fileId).toBeDefined();
      expect(result.url).toContain('/storage/buckets/69f60d1f00330c793cab/files/');
      expect(result.url).toContain('/view?project=');

      // Test cleanup
      const cleaned = await deleteProductImage(result.fileId);
      expect(typeof cleaned).toBe('boolean');
    });
  });
});
