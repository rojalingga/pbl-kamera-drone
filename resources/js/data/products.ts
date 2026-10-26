import { Equipment } from '@/components/landing/ProductCard';

/**
 * All equipment items available in the catalog.
 * priceValue is the numeric daily rental price (IDR) used for filtering.
 */
export const featuredEquipments: Equipment[] = [
  {
    name: 'Sony FX3 Cinema Line',
    category: 'Kamera',
    price: 'Rp450.000 / hari',
    priceValue: 450000,
    description: 'Kamera sinema full-frame kompak dengan sistem pendingin aktif, cocok untuk produksi video profesional dan dokumentasi sinematik.',
    features: ['Full-Frame 4K 120fps', 'S-Cinetone Profile', 'Active Cooling Fan'],
  },
  {
    name: 'Canon EOS R5 C',
    category: 'Kamera',
    price: 'Rp500.000 / hari',
    priceValue: 500000,
    description: 'Kamera hybrid cinema dan foto 8K dengan desain tanpa batas perekaman, ideal untuk produksi komersial dan film pendek.',
    features: ['8K 60p RAW Light', '45MP Still Sensor', 'Dual Base ISO'],
  },
  {
    name: 'Sony Alpha 7S III',
    category: 'Kamera',
    price: 'Rp350.000 / hari',
    priceValue: 350000,
    description: 'Kamera mirrorless low-light terbaik dengan kemampuan 4K 120fps dan dynamic range luar biasa untuk situasi pencahayaan apapun.',
    features: ['4K 120p 10-bit 4:2:2', '15+ Stops Dynamic Range', 'Dual CFexpress Slots'],
  },
  {
    name: 'RED Komodo 6K Cinema',
    category: 'Kamera',
    price: 'Rp850.000 / hari',
    priceValue: 850000,
    description: 'Kamera sinema kompak bertenaga dengan sensor Super35 6K dan REDCODE RAW, standar industri untuk produksi film profesional.',
    features: ['6K Super35 Sensor', 'REDCODE RAW Cinema', 'Canon RF Mount'],
  },
  {
    name: 'DJI Inspire 3 Pro Kit',
    category: 'Drone',
    price: 'Rp1.500.000 / hari',
    priceValue: 1500000,
    description: 'Drone profesional kelas atas dengan sensor full-frame dan kemampuan rekam 8K ProRes RAW untuk aerial cinematography premium.',
    features: ['Full-Frame 8K ProRes RAW', 'Centimeter RTK', 'Dual Pilot Support'],
  },
  {
    name: 'DJI Mavic 3 Pro Cine',
    category: 'Drone',
    price: 'Rp650.000 / hari',
    priceValue: 650000,
    description: 'Drone kompak dengan tiga lensa dan kemampuan Apple ProRes untuk hasil aerial footage sinematis berkualitas tinggi.',
    features: ['Triple Lens System', 'Apple ProRes 422 HQ', '43 Min Flight Time'],
  },
  {
    name: 'DJI Air 3 Fly More Combo',
    category: 'Drone',
    price: 'Rp300.000 / hari',
    priceValue: 300000,
    description: 'Drone kompak yang mudah dibawa dengan dual kamera, ideal untuk konten kreator dan produksi ringan.',
    features: ['Medium Tele & Wide Lens', '46 Min Flight Duration', '4K 60fps HDR Video'],
  },
  {
    name: 'Sony FE 24-70mm f/2.8 GM II',
    category: 'Lensa',
    price: 'Rp150.000 / hari',
    priceValue: 150000,
    description: 'Lensa zoom standar profesional dengan bukaan f/2.8 konstan dan kejernihan optik tertinggi untuk berbagai situasi pemotretan.',
    features: ['Fast f/2.8 Aperture', 'Extreme Optical Clarity', 'Dust & Moisture Sealed'],
  },
  {
    name: 'Canon RF 85mm f/1.2L USM',
    category: 'Lensa',
    price: 'Rp200.000 / hari',
    priceValue: 200000,
    description: 'Lensa portrait prime legendaris dengan bokeh menakjubkan dan resolusi tinggi, pilihan terbaik untuk fotografi potret profesional.',
    features: ['Ultra-Fast f/1.2 Aperture', 'Stunning Bokeh Rendering', 'Weather Sealed'],
  },
  {
    name: 'Sony FE 16-35mm f/2.8 GM',
    category: 'Lensa',
    price: 'Rp180.000 / hari',
    priceValue: 180000,
    description: 'Lensa wide-angle zoom profesional dengan rentang 16-35mm, sempurna untuk lansekap, arsitektur, dan sinematografi.',
    features: ['16-35mm Wide Zoom', 'f/2.8 Throughout Range', 'Nano AR Coating'],
  },
  {
    name: 'Aputure LS 600D Pro',
    category: 'Peralatan Shooting',
    price: 'Rp250.000 / hari',
    priceValue: 250000,
    description: 'Lampu LED daylight 600W profesional dengan kontrol nirkabel, ideal untuk produksi film, iklan, dan pemotretan indoor maupun outdoor.',
    features: ['600W Daylight LED', 'Wireless DMX Control', 'IP54 Weather Resistant'],
  },
  {
    name: 'Manfrotto Carbon Fiber Tripod',
    category: 'Peralatan Shooting',
    price: 'Rp80.000 / hari',
    priceValue: 80000,
    description: 'Tripod carbon fiber ringan namun kokoh dengan kepala fluid, cocok untuk videografi profesional dan pemotretan jangka panjang.',
    features: ['Carbon Fiber Legs', 'Fluid Head Included', 'Max Load 8kg'],
  },
];

/** All unique categories derived from the product catalog. */
export const allCategories: string[] = [
  ...new Set(featuredEquipments.map((p) => p.category)),
];

/** Min and max price values across all products. */
export const priceRange = {
  min: Math.min(...featuredEquipments.map((p) => p.priceValue)),
  max: Math.max(...featuredEquipments.map((p) => p.priceValue)),
};





