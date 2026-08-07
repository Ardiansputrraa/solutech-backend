import type { ProductSeedData } from "../types";

/**
 * Data produk yang akan di-seed ke database.
 *
 * Kategori produk mencakup:
 * - Laptop & komputer
 * - Periferal (mouse, keyboard, headset)
 * - Monitor
 * - Aksesori (webcam, hub USB)
 *
 * Harga dalam satuan Rupiah (IDR).
 * Stock mencerminkan kondisi awal toko.
 *
 * Data ini menggunakan upsert (berdasarkan nama) — aman dijalankan berkali-kali.
 * CATATAN: Jika nama produk berubah di file ini, record lama tidak diupdate otomatis.
 */
export const productData: ProductSeedData[] = [
  // ── Laptop & Komputer ──────────────────────────────────────────────
  {
    name: "Laptop Pro X — Intel i9 32GB RAM",
    price: 28_500_000,
    stock: 10,
    description:
      "Laptop profesional bertenaga Intel Core i9, RAM 32GB DDR5, SSD NVMe 1TB. " +
      "Ideal untuk developer, desainer, dan content creator.",
  },
  {
    name: "Laptop UltraSlim Z — Intel i5 16GB RAM",
    price: 14_750_000,
    stock: 15,
    description:
      "Laptop tipis dan ringan 1.2kg dengan baterai tahan hingga 12 jam. " +
      "Cocok untuk produktivitas harian dan mobilitas tinggi.",
  },
  {
    name: "Mini PC Desktop — AMD Ryzen 5 16GB RAM",
    price: 8_900_000,
    stock: 8,
    description:
      "Komputer desktop kompak dengan performa tinggi. " +
      "Hemat tempat dan energi, cocok untuk kantor dan rumah.",
  },

  // ── Monitor ───────────────────────────────────────────────────────
  {
    name: "Monitor IPS 27 inch 4K — 144Hz",
    price: 6_200_000,
    stock: 20,
    description:
      "Monitor IPS resolusi 4K UHD dengan refresh rate 144Hz. " +
      "Warna akurat 99% sRGB, ideal untuk editing foto/video dan gaming.",
  },
  {
    name: "Monitor Curved 32 inch FHD — 165Hz",
    price: 4_450_000,
    stock: 12,
    description:
      "Monitor curved immersive 32 inch dengan panel VA. " +
      "Refresh rate 165Hz dan response time 1ms untuk gaming kompetitif.",
  },

  // ── Periferal Input ───────────────────────────────────────────────
  {
    name: "Mechanical Keyboard — Red Switch Wireless",
    price: 1_250_000,
    stock: 30,
    description:
      "Keyboard mekanikal nirkabel dengan switch Red (linear) untuk ketikan cepat dan senyap. " +
      "Backlit RGB, koneksi Bluetooth 5.0 + USB dongle.",
  },
  {
    name: "Mechanical Keyboard — Blue Switch Tenkeyless",
    price: 875_000,
    stock: 25,
    description:
      "Keyboard mekanikal tenkeyless (TKL) dengan switch Blue (clicky). " +
      "Cocok untuk programmer yang menyukai feedback taktil.",
  },
  {
    name: "Wireless Mouse Ergonomic — 4000 DPI",
    price: 450_000,
    stock: 50,
    description:
      "Mouse ergonomis nirkabel untuk penggunaan seharian. " +
      "DPI adjustable hingga 4000, baterai tahan 3 bulan.",
  },
  {
    name: "Gaming Mouse Wired — 16000 DPI RGB",
    price: 325_000,
    stock: 40,
    description:
      "Mouse gaming berkabel dengan sensor optik presisi 16000 DPI. " +
      "Bobot 68 gram, cocok untuk gaming FPS kompetitif.",
  },

  // ── Audio ─────────────────────────────────────────────────────────
  {
    name: "Headset Gaming 7.1 Surround — USB",
    price: 580_000,
    stock: 35,
    description:
      "Headset gaming dengan virtual surround 7.1. " +
      "Mikrofon noise-cancelling, cocok untuk gaming dan meeting online.",
  },
  {
    name: "Earphone TWS Wireless — ANC 30dB",
    price: 750_000,
    stock: 45,
    description:
      "True Wireless Stereo earphone dengan Active Noise Cancellation 30dB. " +
      "Baterai 8 jam + case 32 jam, koneksi Bluetooth 5.3.",
  },

  // ── Aksesori & Lainnya ────────────────────────────────────────────
  {
    name: "Webcam Full HD 1080p — Auto Focus",
    price: 380_000,
    stock: 60,
    description:
      "Webcam 1080p 30fps dengan auto focus dan built-in microphone. " +
      "Plug-and-play, kompatibel dengan semua platform video call.",
  },
  {
    name: "USB Hub 7-in-1 — USB-C Docking Station",
    price: 285_000,
    stock: 70,
    description:
      "Docking station USB-C dengan 7 port: HDMI 4K, USB 3.0 x3, SD card, " +
      "microSD, dan USB-C PD 100W. Kompatibel dengan laptop modern.",
  },
  {
    name: "SSD External 1TB — USB 3.2 Gen 2",
    price: 975_000,
    stock: 28,
    description:
      "SSD portabel 1TB dengan kecepatan baca/tulis hingga 1000MB/s. " +
      "Ukuran saku, tahan benturan, kompatibel PC & Mac.",
  },
  {
    name: "Laptop Stand Aluminium — Adjustable 6 Level",
    price: 195_000,
    stock: 55,
    description:
      "Stand laptop aluminium dengan 6 level ketinggian yang dapat disesuaikan. " +
      "Ringan, lipat mudah, mendukung laptop 10-17 inch.",
  },
];
