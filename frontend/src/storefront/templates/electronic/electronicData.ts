export interface ElectronicProduct {
  id: string;
  brand: string;
  name: string;
  sub: string;
  category: string;
  rating: number;
  reviews: number;
  price: number;
  stock: 'in' | 'out';
  img: string;
  fit: 'contain' | 'cover';
  desc: string;
  specs: string[];
}

export const NAV_LINKS = [
  { label: 'Computers', cat: 'laptops' },
  { label: 'Phones', cat: 'phones' },
  { label: 'Audio', cat: 'audio' },
  { label: 'Cameras', cat: 'cameras' },
  { label: 'Accessories', cat: 'accessories' },
];

export const MONO_ELECTRONIC_PRODUCTS: ElectronicProduct[] = [
  {
    id: 'macbook-pro-14',
    brand: 'Apple',
    name: 'MacBook Pro 14',
    sub: 'M4 Pro · Space Black',
    category: 'laptops',
    rating: 5,
    reviews: 412,
    price: 1999,
    stock: 'in',
    img: '/products/macbook-pro-14.png',
    fit: 'contain',
    desc: 'The most advanced Mac laptop for pro workflows — M4 Pro silicon, a blazing Liquid Retina XDR display and all-day battery.',
    specs: ['Apple M4 Pro 12-core CPU', '24 GB unified memory', '512 GB SSD', '14.2" Liquid Retina XDR'],
  },
  {
    id: 'macbook-air-13',
    brand: 'Apple',
    name: 'MacBook Air 13',
    sub: 'M3 · Midnight',
    category: 'laptops',
    rating: 4,
    reviews: 988,
    price: 1099,
    stock: 'in',
    img: '/products/macbook-air-13.jpg',
    fit: 'contain',
    desc: 'Strikingly thin and fast, with the fanless M3 chip, a brilliant Liquid Retina display and up to 18 hours of battery.',
    specs: ['Apple M3 8-core CPU', '16 GB unified memory', '256 GB SSD', '13.6" Liquid Retina'],
  },
  {
    id: 'xps-13',
    brand: 'Dell',
    name: 'XPS 13',
    sub: 'Core Ultra 7 · Platinum',
    category: 'laptops',
    rating: 4,
    reviews: 231,
    price: 1299,
    stock: 'in',
    img: '/products/xps-13.png',
    fit: 'contain',
    desc: 'Dell\'s iconically compact ultrabook with an edge-to-edge OLED display, invisible trackpad and Intel Core Ultra efficiency.',
    specs: ['Intel Core Ultra 7', '16 GB LPDDR5X', '512 GB SSD', '13.4" OLED 3K'],
  },
  {
    id: 'zenbook-14',
    brand: 'ASUS',
    name: 'Zenbook 14 OLED',
    sub: 'Core Ultra 7 · Ponder Blue',
    category: 'laptops',
    rating: 4,
    reviews: 154,
    price: 999,
    stock: 'in',
    img: '/products/zenbook-14.jpg',
    fit: 'cover',
    desc: 'A featherweight 1.2 kg ultrabook with a gorgeous 14" ASUS Lumina OLED panel and class-leading battery life.',
    specs: ['Intel Core Ultra 7', '16 GB LPDDR5X', '1 TB SSD', '14" Lumina OLED'],
  },
  {
    id: 'iphone-15-pro',
    brand: 'Apple',
    name: 'iPhone 15 Pro',
    sub: 'Natural Titanium · 256 GB',
    category: 'phones',
    rating: 5,
    reviews: 1543,
    price: 999,
    stock: 'in',
    img: '/products/iphone-15-pro.jpg',
    fit: 'contain',
    desc: 'Titanium design, A17 Pro chip and a pro camera system with 5x Telephoto — the most advanced iPhone of its generation.',
    specs: ['A17 Pro chip', '6.1" Super Retina XDR', 'Pro camera system, 5x Tele', 'USB-C with USB 3 speeds'],
  },
  {
    id: 'ipad-air',
    brand: 'Apple',
    name: 'iPad Air',
    sub: 'M2 · Space Gray · 11"',
    category: 'tablets',
    rating: 4,
    reviews: 367,
    price: 599,
    stock: 'in',
    img: '/products/ipad-air.jpg',
    fit: 'contain',
    desc: 'Serious performance in a light, versatile design — M2 power, Apple Pencil Pro support and a beautiful Liquid Retina display.',
    specs: ['Apple M2 chip', '11" Liquid Retina', 'Apple Pencil Pro support', 'Landscape 12 MP camera'],
  },
  {
    id: 'zv-1f',
    brand: 'Sony',
    name: 'ZV-1F',
    sub: 'Vlog camera · White',
    category: 'cameras',
    rating: 4,
    reviews: 89,
    price: 499,
    stock: 'out',
    img: '/products/zv-1f.jpg',
    fit: 'contain',
    desc: 'A compact vlogging camera with a wide 20 mm lens, creamy background defocus and a directional mic with wind screen.',
    specs: ['20 mm wide-angle lens', '4K movie recording', 'Directional 3-capsule mic', 'Soft skin & eye AF'],
  },
  {
    id: 'wh-1000xm5',
    brand: 'Sony',
    name: 'WH-1000XM5',
    sub: 'Noise cancelling · Black',
    category: 'audio',
    rating: 5,
    reviews: 2210,
    price: 399,
    stock: 'in',
    img: '/products/wh-1000xm5.jpg',
    fit: 'contain',
    desc: 'Industry-leading noise cancellation with eight microphones, exceptional clarity and up to 30 hours of battery life.',
    specs: ['Industry-leading NC, 8 mics', '30-hour battery life', 'Multipoint Bluetooth 5.2', 'Speak-to-Chat auto pause'],
  },
  {
    id: 'airpods-pro-2',
    brand: 'Apple',
    name: 'AirPods Pro 2',
    sub: 'USB-C · MagSafe case',
    category: 'audio',
    rating: 5,
    reviews: 3120,
    price: 249,
    stock: 'in',
    img: '/products/airpods-pro-2.png',
    fit: 'contain',
    desc: 'Up to 2x more Active Noise Cancellation, Adaptive Transparency and Personalised Spatial Audio with the H2 chip.',
    specs: ['Apple H2 chip', '2x stronger ANC', 'Adaptive Transparency', 'USB-C MagSafe case'],
  },
  {
    id: 'watch-s12',
    brand: 'Apple',
    name: 'Apple Watch Series 12',
    sub: 'Pearl · Sport Band',
    category: 'accessories',
    rating: 4,
    reviews: 542,
    price: 399,
    stock: 'in',
    img: '/products/watch-s12.png',
    fit: 'contain',
    desc: 'The ultimate health and fitness companion with advanced sensors, a brighter display and all-day battery.',
    specs: ['Always-On Retina display', 'ECG & blood-oxygen apps', 'Crash & Fall Detection', '18-hour battery life'],
  },
];

export const COMPARE_COLUMNS = ['MacBook Pro 14', 'MacBook Air 13', 'Dell XPS 13', 'Zenbook 14 OLED'];

export const COMPARE_ROWS = [
  { label: 'Processor', values: ['M4 Pro 12-core', 'M3 8-core', 'Core Ultra 7', 'Core Ultra 7'] },
  { label: 'Memory', values: ['24 GB', '16 GB', '16 GB', '16 GB'] },
  { label: 'Storage', values: ['512 GB SSD', '256 GB SSD', '512 GB SSD', '1 TB SSD'] },
  { label: 'Display', values: ['14.2" XDR', '13.6" Retina', '13.4" OLED', '14" Lumina OLED'] },
  { label: 'Battery', values: ['22 hours', '18 hours', '13 hours', '15 hours'] },
  { label: 'Connectivity', values: ['Wi-Fi 6E', 'Wi-Fi 6E', 'Wi-Fi 7', 'Wi-Fi 6E'] },
  { label: 'Price', values: ['$1,999', '$1,099', '$1,299', '$999'], isPrice: true },
];

export const CATEGORIES = [
  { key: 'laptops', label: 'Laptops', img: '/products/macbook-pro-14.png' },
  { key: 'phones', label: 'Phones', img: '/products/iphone-15-pro.jpg' },
  { key: 'tablets', label: 'Tablets', img: '/products/ipad-air.jpg' },
  { key: 'audio', label: 'Audio', img: '/products/wh-1000xm5.jpg' },
  { key: 'accessories', label: 'Accessories', img: '/products/watch-s12.png' },
];

export const TRUST_ITEMS = [
  { label: 'Secure payments', icon: 'shield' as const },
  { label: 'Warranty', icon: 'award' as const },
  { label: 'Easy returns', icon: 'returns' as const },
  { label: 'Delivery', icon: 'truck' as const },
  { label: 'Customer support', icon: 'support' as const },
];

export const formatPrice = (n: number, symbol: string = '$'): string => {
  return `${symbol}${n.toLocaleString('en-US')}`;
};

export const getElectronicProduct = (id: string): ElectronicProduct | undefined =>
  MONO_ELECTRONIC_PRODUCTS.find((p) => p.id === id);
