-- ============================================================================
-- 007_seed_official_content.sql — Seed Resmi Konten, Exercise, & Pre/Post-Test
-- Dihasilkan deterministik oleh scripts/generate-seed.mjs (JANGAN EDIT MANUAL)
-- Kontrak P3/P5: soal MC di-insert dalam satu transaksi dengan UUID opsi pre-generated.
-- ============================================================================

BEGIN;

INSERT INTO public.material (material_id, title, description, sequence)
VALUES ('c4b1d371-ea02-41e7-840a-8457528b5215', 'Struktur Dasar Kode TypeScript', 'Mengenal pernyataan, komentar, blok kode, serta aturan dasar penulisan sintaksis TypeScript yang valid.', 1)
ON CONFLICT (sequence) DO NOTHING;

INSERT INTO public.sub_material (submaterial_id, material_id, title, content, sequence)
VALUES ('32d0f153-da8e-41aa-873f-7053e41f6617', 'c4b1d371-ea02-41e7-840a-8457528b5215', 'Mengenal Pernyataan dan Blok Kode', 'Dalam TypeScript, program tersusun dari kumpulan **pernyataan (*statement*)** yang dijalankan secara berurutan dari atas ke bawah. Setiap pernyataan umumnya diakhiri dengan tanda titik koma (`;`) agar batas antarinstruksi terlihat jelas.

```ts
let salam: string = "Halo";
console.log(salam);
```

Untuk mengelompokkan beberapa pernyataan menjadi satu kesatuan, TypeScript menggunakan **blok kode** yang diapit oleh kurung kurawal `{` dan `}`.

```ts
{
  let poin: number = 10;
  console.log(poin);
}
```

Anda juga dapat menambahkan **komentar** sebagai catatan yang tidak akan dijalankan oleh program. Gunakan `//` untuk komentar satu baris, atau `/* ... */` untuk komentar beberapa baris.

```ts
// Ini komentar satu baris
/* Ini komentar
   lebih dari satu baris */
```', 1)
ON CONFLICT (material_id, sequence) DO NOTHING;

INSERT INTO public.exercise (exercise_id, submaterial_id, title, question_type)
VALUES ('ea3d4a58-c8e1-40b9-96f8-40f57329a729', '32d0f153-da8e-41aa-873f-7053e41f6617', 'Latihan 1.1: Mengenal Pernyataan dan Blok Kode', 'MC')
ON CONFLICT (submaterial_id) DO NOTHING;

INSERT INTO public.exercise_question (exercise_question_id, exercise_id, question_text, question_type, correct_option_id, correct_boolean, correct_text, explanation, hint, sequence)
VALUES ('0ba1a0a7-9bd5-4ec1-ab3c-d07bea53817b', 'ea3d4a58-c8e1-40b9-96f8-40f57329a729', 'Di antara pilihan berikut, pasangan simbol manakah yang digunakan di TypeScript untuk menulis komentar lebih dari satu baris?', 'MC', '00040df3-a953-4b29-b10c-4a10c71faa44', NULL, NULL, 'TypeScript memakai `//` untuk komentar satu baris dan `/* ... */` untuk komentar beberapa baris.', 'Komentar multi-baris diawali dengan garis miring dan tanda bintang.', 1)
ON CONFLICT (exercise_id, sequence) DO NOTHING;
INSERT INTO public.exercise_question_option (exercise_question_option_id, exercise_question_id, option_text, sequence)
VALUES ('00040df3-a953-4b29-b10c-4a10c71faa44', '0ba1a0a7-9bd5-4ec1-ab3c-d07bea53817b', '`/* ... */`', 1)
ON CONFLICT (exercise_question_id, sequence) DO NOTHING;
INSERT INTO public.exercise_question_option (exercise_question_option_id, exercise_question_id, option_text, sequence)
VALUES ('89adab1a-4b70-4e51-a312-ca8c881526ca', '0ba1a0a7-9bd5-4ec1-ab3c-d07bea53817b', '`// ... //`', 2)
ON CONFLICT (exercise_question_id, sequence) DO NOTHING;
INSERT INTO public.exercise_question_option (exercise_question_option_id, exercise_question_id, option_text, sequence)
VALUES ('c9ad1f5a-ed6f-4291-9ad4-2a6de6a0e0f4', '0ba1a0a7-9bd5-4ec1-ab3c-d07bea53817b', '`<!-- ... -->`', 3)
ON CONFLICT (exercise_question_id, sequence) DO NOTHING;
INSERT INTO public.exercise_question_option (exercise_question_option_id, exercise_question_id, option_text, sequence)
VALUES ('50e5068a-919f-461d-a46a-b6ee3f0a9bff', '0ba1a0a7-9bd5-4ec1-ab3c-d07bea53817b', '`# ... #`', 4)
ON CONFLICT (exercise_question_id, sequence) DO NOTHING;

INSERT INTO public.exercise_question (exercise_question_id, exercise_id, question_text, question_type, correct_option_id, correct_boolean, correct_text, explanation, hint, sequence)
VALUES ('877bab45-7f28-4f6b-a000-78cd51b89a0f', 'ea3d4a58-c8e1-40b9-96f8-40f57329a729', 'Fungsi utama tanda titik koma (`;`) pada akhir baris kode TypeScript seperti `let angka: number = 5;` adalah untuk...', 'MC', '3e322452-5c76-429b-9469-5b9a1ad3ebc4', NULL, NULL, 'Titik koma (`;`) menandai berakhirnya satu pernyataan agar batas antarinstruksi tetap jelas.', 'Pikirkan peran titik koma sebagai pemisah antarinstruksi.', 2)
ON CONFLICT (exercise_id, sequence) DO NOTHING;
INSERT INTO public.exercise_question_option (exercise_question_option_id, exercise_question_id, option_text, sequence)
VALUES ('3e322452-5c76-429b-9469-5b9a1ad3ebc4', '877bab45-7f28-4f6b-a000-78cd51b89a0f', 'menandai akhir sebuah pernyataan (*statement*)', 1)
ON CONFLICT (exercise_question_id, sequence) DO NOTHING;
INSERT INTO public.exercise_question_option (exercise_question_option_id, exercise_question_id, option_text, sequence)
VALUES ('f54f8c59-7131-42fb-8be1-6da696e2f99a', '877bab45-7f28-4f6b-a000-78cd51b89a0f', 'mengubah tipe data variabel menjadi angka', 2)
ON CONFLICT (exercise_question_id, sequence) DO NOTHING;
INSERT INTO public.exercise_question_option (exercise_question_option_id, exercise_question_id, option_text, sequence)
VALUES ('835e162f-784f-4922-b323-8f688c5a5b2d', '877bab45-7f28-4f6b-a000-78cd51b89a0f', 'membuat komentar agar baris tidak dijalankan', 3)
ON CONFLICT (exercise_question_id, sequence) DO NOTHING;
INSERT INTO public.exercise_question_option (exercise_question_option_id, exercise_question_id, option_text, sequence)
VALUES ('6b3c67cd-a8de-4f8c-8bfc-c8e5711cb0f6', '877bab45-7f28-4f6b-a000-78cd51b89a0f', 'menggabungkan dua blok kode menjadi satu', 4)
ON CONFLICT (exercise_question_id, sequence) DO NOTHING;

INSERT INTO public.sub_material (submaterial_id, material_id, title, content, sequence)
VALUES ('17e33302-c97b-4dbd-8f98-320f4dd18c2c', 'c4b1d371-ea02-41e7-840a-8457528b5215', 'Aturan Penulisan Struktur Kode yang Benar', 'TypeScript bersifat ***case-sensitive***, artinya huruf besar dan huruf kecil dianggap berbeda. Kata kunci seperti `let` dan `const` harus ditulis dengan huruf kecil semua.

```ts
// Benar
let nama: string = "Rani";

// Salah: "Let" bukan kata kunci valid
Let umur: number = 19;
```

Selain itu, setiap kurung kurawal buka `{` pada sebuah blok kode wajib memiliki pasangan kurung kurawal tutup `}` yang seimbang.

```ts
{
  let aktif: boolean = true;
  console.log(aktif);
}
```', 2)
ON CONFLICT (material_id, sequence) DO NOTHING;

INSERT INTO public.exercise (exercise_id, submaterial_id, title, question_type)
VALUES ('cf23146b-4b48-4255-b7cc-73130bdcffc1', '17e33302-c97b-4dbd-8f98-320f4dd18c2c', 'Latihan 1.2: Aturan Penulisan Struktur Kode yang Benar', 'TF')
ON CONFLICT (submaterial_id) DO NOTHING;

INSERT INTO public.exercise_question (exercise_question_id, exercise_id, question_text, question_type, correct_option_id, correct_boolean, correct_text, explanation, hint, sequence)
VALUES ('957bef1b-f9f1-4a28-8eba-033a9d8036a3', 'cf23146b-4b48-4255-b7cc-73130bdcffc1', 'Perhatikan potongan kode TypeScript berikut:
```ts
Let kelas: string = "TI-1A";
console.log(kelas);
```
Pernyataan: Penulisan kata kunci `Let` pada potongan kode di atas sudah valid dalam TypeScript.', 'TF', NULL, FALSE, NULL, 'TypeScript bersifat *case-sensitive*, sehingga kata kunci deklarasi variabel harus ditulis `let` dengan huruf kecil seluruhnya.', 'Ingat apakah TypeScript membedakan huruf besar dan huruf kecil pada kata kunci.', 1)
ON CONFLICT (exercise_id, sequence) DO NOTHING;

INSERT INTO public.material (material_id, title, description, sequence)
VALUES ('d89e4942-cf4d-4a1f-9c4b-53110ab7c9c3', 'Variabel dan Type Annotation', 'Memahami deklarasi variabel dengan `let` dan `const` serta penulisan *type annotation* yang tepat.', 2)
ON CONFLICT (sequence) DO NOTHING;

INSERT INTO public.sub_material (submaterial_id, material_id, title, content, sequence)
VALUES ('2a2dae01-b257-40d7-a9dc-07e2f7ba3af0', 'd89e4942-cf4d-4a1f-9c4b-53110ab7c9c3', 'Deklarasi Variabel dengan `let` dan `const`', 'Variabel digunakan untuk menyimpan data di dalam program. TypeScript menyediakan dua kata kunci utama untuk mendeklarasikan variabel:

- **`let`**: digunakan jika nilai variabel dapat berubah di kemudian hari.
- **`const`**: digunakan untuk nilai tetap (*konstan*) yang tidak boleh diubah lagi, dan nilainya wajib langsung diisi saat deklarasi.

```ts
let skor: number = 0;
skor = 15; // Diperbolehkan

const kkm: number = 75;
// kkm = 80; // Error: const tidak bisa diubah
```', 1)
ON CONFLICT (material_id, sequence) DO NOTHING;

INSERT INTO public.exercise (exercise_id, submaterial_id, title, question_type)
VALUES ('9aee5199-8588-459e-92f5-b40fa95c3cdd', '2a2dae01-b257-40d7-a9dc-07e2f7ba3af0', 'Latihan 2.1: Deklarasi Variabel dengan `let` dan `const`', 'MC')
ON CONFLICT (submaterial_id) DO NOTHING;

INSERT INTO public.exercise_question (exercise_question_id, exercise_id, question_text, question_type, correct_option_id, correct_boolean, correct_text, explanation, hint, sequence)
VALUES ('1711bb5e-ae22-46be-ae30-6e850ce1904b', '9aee5199-8588-459e-92f5-b40fa95c3cdd', 'Jika Anda ingin menyimpan nilai maksimal SKS (`24`) yang tidak boleh diubah selama program berjalan, kata kunci deklarasi manakah yang paling tepat?', 'MC', '056465d8-10a9-41c6-97e8-aac4226a00cc', NULL, NULL, '`const` digunakan untuk menyimpan nilai konstan yang tidak dapat ditetapkan ulang setelah diinisialisasi.', 'Pilih kata kunci yang nilainya tetap sejak awal deklarasi.', 1)
ON CONFLICT (exercise_id, sequence) DO NOTHING;
INSERT INTO public.exercise_question_option (exercise_question_option_id, exercise_question_id, option_text, sequence)
VALUES ('056465d8-10a9-41c6-97e8-aac4226a00cc', '1711bb5e-ae22-46be-ae30-6e850ce1904b', '`const`', 1)
ON CONFLICT (exercise_question_id, sequence) DO NOTHING;
INSERT INTO public.exercise_question_option (exercise_question_option_id, exercise_question_id, option_text, sequence)
VALUES ('743057d7-f330-4632-9cf5-f81e06f5b959', '1711bb5e-ae22-46be-ae30-6e850ce1904b', '`let`', 2)
ON CONFLICT (exercise_question_id, sequence) DO NOTHING;
INSERT INTO public.exercise_question_option (exercise_question_option_id, exercise_question_id, option_text, sequence)
VALUES ('8819e7d8-63df-4e84-b9f4-845141e1f954', '1711bb5e-ae22-46be-ae30-6e850ce1904b', '`int`', 3)
ON CONFLICT (exercise_question_id, sequence) DO NOTHING;
INSERT INTO public.exercise_question_option (exercise_question_option_id, exercise_question_id, option_text, sequence)
VALUES ('29a96b51-d9ce-4d62-a0f4-62ea09bcf235', '1711bb5e-ae22-46be-ae30-6e850ce1904b', '`final`', 4)
ON CONFLICT (exercise_question_id, sequence) DO NOTHING;

INSERT INTO public.exercise_question (exercise_question_id, exercise_id, question_text, question_type, correct_option_id, correct_boolean, correct_text, explanation, hint, sequence)
VALUES ('7c567a67-809b-4f21-b53d-a6b898e76ebc', '9aee5199-8588-459e-92f5-b40fa95c3cdd', 'Manakah pernyataan berikut yang benar mengenai variabel yang dideklarasikan dengan `let`?', 'MC', '9722023c-9f5a-43c1-a727-acd3b48fefa2', NULL, NULL, 'Variabel `let` mengizinkan perubahan nilai selama nilai barunya tetap sesuai dengan tipe data variabel tersebut.', 'Bandingkan sifat fleksibilitas nilai antara `let` dan `const`.', 2)
ON CONFLICT (exercise_id, sequence) DO NOTHING;
INSERT INTO public.exercise_question_option (exercise_question_option_id, exercise_question_id, option_text, sequence)
VALUES ('9722023c-9f5a-43c1-a727-acd3b48fefa2', '7c567a67-809b-4f21-b53d-a6b898e76ebc', 'Nilainya masih dapat diubah ulang dengan tipe data yang sama', 1)
ON CONFLICT (exercise_question_id, sequence) DO NOTHING;
INSERT INTO public.exercise_question_option (exercise_question_option_id, exercise_question_id, option_text, sequence)
VALUES ('c9ae28a5-3836-41a1-86ad-9f859bd0cbce', '7c567a67-809b-4f21-b53d-a6b898e76ebc', 'Nilainya otomatis menjadi permanen seperti `const`', 2)
ON CONFLICT (exercise_question_id, sequence) DO NOTHING;
INSERT INTO public.exercise_question_option (exercise_question_option_id, exercise_question_id, option_text, sequence)
VALUES ('aa311d39-ec09-4e04-8ffb-88c98a5a560f', '7c567a67-809b-4f21-b53d-a6b898e76ebc', 'Tidak boleh diberi *type annotation*', 3)
ON CONFLICT (exercise_question_id, sequence) DO NOTHING;
INSERT INTO public.exercise_question_option (exercise_question_option_id, exercise_question_id, option_text, sequence)
VALUES ('f9bd1d5a-1048-4e01-bb8b-b849d5e061fe', '7c567a67-809b-4f21-b53d-a6b898e76ebc', 'Hanya dapat menyimpan tipe data teks', 4)
ON CONFLICT (exercise_question_id, sequence) DO NOTHING;

INSERT INTO public.sub_material (submaterial_id, material_id, title, content, sequence)
VALUES ('b1e4ebe4-ce82-4f86-9d6e-f4abaa8cb481', 'd89e4942-cf4d-4a1f-9c4b-53110ab7c9c3', 'Penempatan Type Annotation yang Tepat', '**Type annotation** adalah penanda tipe data yang ditulis setelah nama variabel, dipisahkan oleh tanda titik dua (`:`).

Pola penulisannya adalah:
`kataKunci namaVariabel: tipeData = nilai;`

```ts
let jurusan: string = "Sistem Informasi";
const semester: number = 2;
```

Kesalahan yang sering terjadi pada pemula adalah menaruh tipe data sebelum nama variabel atau lupa menuliskan tanda titik dua (`:`).

```ts
// Salah: tipe data diletakkan sebelum nama
let string jurusan = "Sistem Informasi";

// Salah: tidak ada tanda titik dua (:)
let semester number = 2;
```', 2)
ON CONFLICT (material_id, sequence) DO NOTHING;

INSERT INTO public.exercise (exercise_id, submaterial_id, title, question_type)
VALUES ('ad32469c-140f-4b41-8752-a63851deaae7', 'b1e4ebe4-ce82-4f86-9d6e-f4abaa8cb481', 'Latihan 2.2: Penempatan Type Annotation yang Tepat', 'TF')
ON CONFLICT (submaterial_id) DO NOTHING;

INSERT INTO public.exercise_question (exercise_question_id, exercise_id, question_text, question_type, correct_option_id, correct_boolean, correct_text, explanation, hint, sequence)
VALUES ('e8952832-7ec7-4c75-b2ec-d229586de736', 'ad32469c-140f-4b41-8752-a63851deaae7', 'Perhatikan deklarasi variabel berikut:
```ts
let: string fakultas = "FTK";
```
Pernyataan: Penempatan tanda titik dua (`:`) dan tipe data `string` pada kode di atas sudah sesuai aturan TypeScript.', 'TF', NULL, FALSE, NULL, 'Pada *type annotation*, tanda titik dua dan tipe data ditulis setelah nama variabel (`let fakultas: string = "FTK";`), bukan sebelum nama variabel.', 'Periksa urutan antara kata kunci, nama variabel, titik dua, dan tipe data.', 1)
ON CONFLICT (exercise_id, sequence) DO NOTHING;

INSERT INTO public.sub_material (submaterial_id, material_id, title, content, sequence)
VALUES ('75f352a3-3988-41a9-8b09-068a488f83cb', 'd89e4942-cf4d-4a1f-9c4b-53110ab7c9c3', 'Melengkapi Deklarasi dan Type Annotation', 'Saat menulis deklarasi variabel di TypeScript, pastikan keempat bagian utama tersusun rapi:
1. Kata kunci (`let` atau `const`)
2. Nama variabel
3. Titik dua dan tipe data (`: tipe`)
4. Tanda `=` diikuti nilai awal

```ts
let modulAktif: number = 2;
const kodeProdi: string = "SI";
```', 3)
ON CONFLICT (material_id, sequence) DO NOTHING;

INSERT INTO public.exercise (exercise_id, submaterial_id, title, question_type)
VALUES ('f4612f3d-ed0e-4134-8b30-daa1226cd018', '75f352a3-3988-41a9-8b09-068a488f83cb', 'Latihan 2.3: Melengkapi Deklarasi dan Type Annotation', 'FIB')
ON CONFLICT (submaterial_id) DO NOTHING;

INSERT INTO public.exercise_question (exercise_question_id, exercise_id, question_text, question_type, correct_option_id, correct_boolean, correct_text, explanation, hint, sequence)
VALUES ('661b7697-1cb2-4b7c-8e1b-30e258df09db', 'f4612f3d-ed0e-4134-8b30-daa1226cd018', 'Lengkapi kata kunci deklarasi agar variabel `nilaiAkhir` dapat diperbarui nilainya nanti:
```ts
_____ nilaiAkhir: number = 70;
nilaiAkhir = 85;
```', 'FIB', NULL, NULL, 'let', 'Karena ada pengisian nilai ulang pada baris berikutnya, variabel perlu dideklarasikan menggunakan `let`.', 'Karena nilai variabel diubah pada baris kedua, gunakan kata kunci yang bukan konstan.', 1)
ON CONFLICT (exercise_id, sequence) DO NOTHING;

INSERT INTO public.exercise_question (exercise_question_id, exercise_id, question_text, question_type, correct_option_id, correct_boolean, correct_text, explanation, hint, sequence)
VALUES ('4e2d8178-db16-4084-b26e-2ef8cf89b527', 'f4612f3d-ed0e-4134-8b30-daa1226cd018', 'Lengkapi nama tipe data pada deklarasi variabel konstan berikut:
```ts
const namaAplikasi: _____ = "PLAS";
```', 'FIB', NULL, NULL, 'string', 'Nilai yang diapit tanda kutip termasuk tipe data teks (`string`).', 'Nilai `"PLAS"` diapit tanda kutip ganda.', 2)
ON CONFLICT (exercise_id, sequence) DO NOTHING;

INSERT INTO public.material (material_id, title, description, sequence)
VALUES ('37f25f2a-4f6f-4adc-9555-5cff0603eb4c', 'Tipe Data Dasar', 'Mengenal tiga tipe data primitif utama (`string`, `number`, `boolean`) dan kecocokan nilai literalnya.', 3)
ON CONFLICT (sequence) DO NOTHING;

INSERT INTO public.sub_material (submaterial_id, material_id, title, content, sequence)
VALUES ('f0fa4005-16d2-4a37-8865-495bd6c6a96b', '37f25f2a-4f6f-4adc-9555-5cff0603eb4c', 'Mengenal Tipe Data `string`, `number`, dan `boolean`', 'TypeScript memiliki tiga tipe data dasar yang paling sering digunakan dalam pemrograman pemula:

1. **`string`**: menyimpan data teks, ditulis di dalam tanda kutip tunggal (`''...''`) atau ganda (`"..."`).
2. **`number`**: menyimpan bilangan bulat maupun bilangan desimal, ditulis tanpa tanda kutip.
3. **`boolean`**: hanya memiliki dua nilai logika, yaitu `true` (benar) atau `false` (salah), ditulis tanpa tanda kutip.

```ts
let nama: string = "Ayu";
let ipk: number = 3.85;
let hadir: boolean = true;
```', 1)
ON CONFLICT (material_id, sequence) DO NOTHING;

INSERT INTO public.exercise (exercise_id, submaterial_id, title, question_type)
VALUES ('829350de-5c85-4814-828a-d80d79ca3623', 'f0fa4005-16d2-4a37-8865-495bd6c6a96b', 'Latihan 3.1: Mengenal Tipe Data `string`, `number`, dan `boolean`', 'MC')
ON CONFLICT (submaterial_id) DO NOTHING;

INSERT INTO public.exercise_question (exercise_question_id, exercise_id, question_text, question_type, correct_option_id, correct_boolean, correct_text, explanation, hint, sequence)
VALUES ('97cfdacb-3f15-468b-89d4-30362ac3dff6', '829350de-5c85-4814-828a-d80d79ca3623', 'Manakah nilai di bawah ini yang termasuk tipe data `number` dalam TypeScript?', 'MC', '83fc8205-12b2-4695-aede-2393a5677629', NULL, NULL, 'Baik bilangan bulat maupun desimal tanpa tanda kutip dikelompokkan ke dalam tipe `number`.', 'Angka tidak ditulis menggunakan tanda kutip.', 1)
ON CONFLICT (exercise_id, sequence) DO NOTHING;
INSERT INTO public.exercise_question_option (exercise_question_option_id, exercise_question_id, option_text, sequence)
VALUES ('83fc8205-12b2-4695-aede-2393a5677629', '97cfdacb-3f15-468b-89d4-30362ac3dff6', '`42.5`', 1)
ON CONFLICT (exercise_question_id, sequence) DO NOTHING;
INSERT INTO public.exercise_question_option (exercise_question_option_id, exercise_question_id, option_text, sequence)
VALUES ('10181da5-5caf-4e8e-89ac-ef983822896d', '97cfdacb-3f15-468b-89d4-30362ac3dff6', '`"42.5"`', 2)
ON CONFLICT (exercise_question_id, sequence) DO NOTHING;
INSERT INTO public.exercise_question_option (exercise_question_option_id, exercise_question_id, option_text, sequence)
VALUES ('4438b6e6-5372-437b-bc93-32557781cc79', '97cfdacb-3f15-468b-89d4-30362ac3dff6', '`true`', 3)
ON CONFLICT (exercise_question_id, sequence) DO NOTHING;
INSERT INTO public.exercise_question_option (exercise_question_option_id, exercise_question_id, option_text, sequence)
VALUES ('350771d1-99f5-44f9-8285-294b4be4c195', '97cfdacb-3f15-468b-89d4-30362ac3dff6', '`''100''`', 4)
ON CONFLICT (exercise_question_id, sequence) DO NOTHING;

INSERT INTO public.exercise_question (exercise_question_id, exercise_id, question_text, question_type, correct_option_id, correct_boolean, correct_text, explanation, hint, sequence)
VALUES ('b3d9a8d5-1c12-4979-af06-395368fa5f1e', '829350de-5c85-4814-828a-d80d79ca3623', 'Nilai `''Singaraja''` pada `let asal = ''Singaraja'';` memiliki tipe data dasar...', 'MC', 'aa75271f-4631-4b71-8c59-e59985d74c86', NULL, NULL, 'Teks yang diapit kutip tunggal atau kutip ganda dalam TypeScript bertipe `string`.', 'Perhatikan penggunaan tanda kutip tunggal `''...''`.', 2)
ON CONFLICT (exercise_id, sequence) DO NOTHING;
INSERT INTO public.exercise_question_option (exercise_question_option_id, exercise_question_id, option_text, sequence)
VALUES ('aa75271f-4631-4b71-8c59-e59985d74c86', 'b3d9a8d5-1c12-4979-af06-395368fa5f1e', '`string`', 1)
ON CONFLICT (exercise_question_id, sequence) DO NOTHING;
INSERT INTO public.exercise_question_option (exercise_question_option_id, exercise_question_id, option_text, sequence)
VALUES ('b3558a31-783d-4a1b-a849-50e340e31a5e', 'b3d9a8d5-1c12-4979-af06-395368fa5f1e', '`number`', 2)
ON CONFLICT (exercise_question_id, sequence) DO NOTHING;
INSERT INTO public.exercise_question_option (exercise_question_option_id, exercise_question_id, option_text, sequence)
VALUES ('594b4079-5b54-42df-9389-8e28f2653017', 'b3d9a8d5-1c12-4979-af06-395368fa5f1e', '`boolean`', 3)
ON CONFLICT (exercise_question_id, sequence) DO NOTHING;
INSERT INTO public.exercise_question_option (exercise_question_option_id, exercise_question_id, option_text, sequence)
VALUES ('76e4c22e-69ab-4560-8d4f-da85414f9590', 'b3d9a8d5-1c12-4979-af06-395368fa5f1e', '`text`', 4)
ON CONFLICT (exercise_question_id, sequence) DO NOTHING;

INSERT INTO public.sub_material (submaterial_id, material_id, title, content, sequence)
VALUES ('e56d5bb4-4d33-4e12-9f36-8a80f7534a78', '37f25f2a-4f6f-4adc-9555-5cff0603eb4c', 'Membedakan Kesesuaian Nilai dan Tipe Data', 'TypeScript memeriksa kecocokan antara tipe data yang Anda tulis dengan nilainya. Jebakan yang sering dialami pemula adalah memberi tanda kutip pada angka atau nilai logika.

- `10` bertipe `number`, tetapi `"10"` bertipe `string`.
- `false` bertipe `boolean`, tetapi `"false"` bertipe `string`.

```ts
// Salah: "20" adalah string, bukan number
let jumlah: number = "20";

// Benar
let jumlahValid: number = 20;
```', 2)
ON CONFLICT (material_id, sequence) DO NOTHING;

INSERT INTO public.exercise (exercise_id, submaterial_id, title, question_type)
VALUES ('8b8c675b-92d9-4e7a-b56b-942f892e93a4', 'e56d5bb4-4d33-4e12-9f36-8a80f7534a78', 'Latihan 3.2: Membedakan Kesesuaian Nilai dan Tipe Data', 'TF')
ON CONFLICT (submaterial_id) DO NOTHING;

INSERT INTO public.exercise_question (exercise_question_id, exercise_id, question_text, question_type, correct_option_id, correct_boolean, correct_text, explanation, hint, sequence)
VALUES ('335007ce-7b5c-4234-82e2-387535b55c23', '8b8c675b-92d9-4e7a-b56b-942f892e93a4', 'Perhatikan deklarasi berikut:
```ts
let nilaiUjian: number = "90";
```
Pernyataan: Nilai `"90"` sudah cocok dengan tipe data `number` pada deklarasi tersebut.', 'TF', NULL, FALSE, NULL, 'Tanda kutip ganda menjadikan `"90"` bernilai teks (`string`), sehingga tidak cocok untuk variabel bertipe `number`.', 'Perhatikan apakah ada tanda kutip di sekitar angka `90`.', 1)
ON CONFLICT (exercise_id, sequence) DO NOTHING;

INSERT INTO public.exercise_question (exercise_question_id, exercise_id, question_text, question_type, correct_option_id, correct_boolean, correct_text, explanation, hint, sequence)
VALUES ('319c9ac3-86e8-4fb5-98fd-3c3f84ec6e0f', '8b8c675b-92d9-4e7a-b56b-942f892e93a4', 'Perhatikan deklarasi berikut:
```ts
let selesai: boolean = false;
```
Pernyataan: Penulisan nilai `false` pada variabel bertipe `boolean` di atas sudah benar.', 'TF', NULL, TRUE, NULL, '`false` tanpa tanda kutip adalah nilai literal yang valid untuk tipe data `boolean`.', 'Cek apakah `false` ditulis tanpa tanda kutip dan sesuai untuk `boolean`.', 2)
ON CONFLICT (exercise_id, sequence) DO NOTHING;

INSERT INTO public.sub_material (submaterial_id, material_id, title, content, sequence)
VALUES ('1ce6f0de-27ca-47e7-b2bb-4b4be89ce983', '37f25f2a-4f6f-4adc-9555-5cff0603eb4c', 'Menerapkan Tipe Data pada Deklarasi Variabel', 'Saat menentukan *type annotation* untuk sebuah variabel, selalu periksa bentuk nilai yang akan disimpan:
- Jika berbentuk teks dalam tanda kutip -> gunakan `string`.
- Jika berbentuk angka bulat atau pecahan -> gunakan `number`.
- Jika berbentuk status benar/salah (`true`/`false`) -> gunakan `boolean`.

```ts
let judul: string = "Modul 3";
let bab: number = 3;
let terbuka: boolean = true;
```', 3)
ON CONFLICT (material_id, sequence) DO NOTHING;

INSERT INTO public.exercise (exercise_id, submaterial_id, title, question_type)
VALUES ('8bbb148f-94a4-4b7a-ba96-f46cdc1a6746', '1ce6f0de-27ca-47e7-b2bb-4b4be89ce983', 'Latihan 3.3: Menerapkan Tipe Data pada Deklarasi Variabel', 'FIB')
ON CONFLICT (submaterial_id) DO NOTHING;

INSERT INTO public.exercise_question (exercise_question_id, exercise_id, question_text, question_type, correct_option_id, correct_boolean, correct_text, explanation, hint, sequence)
VALUES ('ab78fd7f-ff0b-49c1-ba0d-ddaf0d3873dc', '8bbb148f-94a4-4b7a-ba96-f46cdc1a6746', 'Lengkapi tipe data yang tepat untuk variabel status kelulusan berikut:
```ts
let lulusTes: _____ = true;
```', 'FIB', NULL, NULL, 'boolean', 'Tipe data yang menyimpan nilai logika `true` atau `false` di TypeScript adalah `boolean`.', 'Nilai `true` hanya dimiliki oleh tipe data logika benar/salah.', 1)
ON CONFLICT (exercise_id, sequence) DO NOTHING;

INSERT INTO public.material (material_id, title, description, sequence)
VALUES ('ee1ee406-799b-46f7-b27e-8827e1e3771e', 'Operator dalam Ekspresi', 'Memahami penggunaan operator aritmetika dan ketepatan tipe *operand* dalam ekspresi TypeScript.', 4)
ON CONFLICT (sequence) DO NOTHING;

INSERT INTO public.sub_material (submaterial_id, material_id, title, content, sequence)
VALUES ('fcb98a85-0b94-4848-a09a-86c1fd0aa0c8', 'ee1ee406-799b-46f7-b27e-8827e1e3771e', 'Mengenal Operator Aritmetika dan Operand', '**Ekspresi** adalah kombinasi nilai (*operand*) dan simbol operasi (*operator*) yang menghasilkan suatu nilai baru. Operator aritmetika dasar di TypeScript meliputi:

| Operator | Fungsi | Contoh | Hasil |
|---|---|---|---|
| `+` | Penjumlahan | `4 + 2` | `6` |
| `-` | Pengurangan | `9 - 3` | `6` |
| `*` | Perkalian | `5 * 2` | `10` |
| `/` | Pembagian | `8 / 2` | `4` |
| `%` | Sisa bagi (modulo) | `10 % 3` | `1` |

```ts
let total: number = 12 + 8;
let sisa: number = 11 % 4; // bernilai 3
```', 1)
ON CONFLICT (material_id, sequence) DO NOTHING;

INSERT INTO public.exercise (exercise_id, submaterial_id, title, question_type)
VALUES ('37ab7129-1995-4d44-9336-861cb09f2792', 'fcb98a85-0b94-4848-a09a-86c1fd0aa0c8', 'Latihan 4.1: Mengenal Operator Aritmetika dan Operand', 'MC')
ON CONFLICT (submaterial_id) DO NOTHING;

INSERT INTO public.exercise_question (exercise_question_id, exercise_id, question_text, question_type, correct_option_id, correct_boolean, correct_text, explanation, hint, sequence)
VALUES ('90b64057-5c23-4f96-af70-76f40d36e334', '37ab7129-1995-4d44-9336-861cb09f2792', 'Pada ekspresi `let hasil: number = 8 * 3;`, angka `8` dan `3` disebut sebagai...', 'MC', 'e5c7b96e-25f4-44a9-912e-3b0bbdf45b81', NULL, NULL, 'Nilai atau variabel yang dikenai operasi oleh suatu operator disebut *operand*.', 'Bedakan antara simbol operasi (`*`) dan nilai yang dioperasikan (`8`, `3`).', 1)
ON CONFLICT (exercise_id, sequence) DO NOTHING;
INSERT INTO public.exercise_question_option (exercise_question_option_id, exercise_question_id, option_text, sequence)
VALUES ('e5c7b96e-25f4-44a9-912e-3b0bbdf45b81', '90b64057-5c23-4f96-af70-76f40d36e334', '*operand*', 1)
ON CONFLICT (exercise_question_id, sequence) DO NOTHING;
INSERT INTO public.exercise_question_option (exercise_question_option_id, exercise_question_id, option_text, sequence)
VALUES ('d8638bd7-a625-473f-ad4c-98490aab9467', '90b64057-5c23-4f96-af70-76f40d36e334', '*operator*', 2)
ON CONFLICT (exercise_question_id, sequence) DO NOTHING;
INSERT INTO public.exercise_question_option (exercise_question_option_id, exercise_question_id, option_text, sequence)
VALUES ('491c35de-8ae2-4f78-99bd-5554f057d28f', '90b64057-5c23-4f96-af70-76f40d36e334', '*annotation*', 3)
ON CONFLICT (exercise_question_id, sequence) DO NOTHING;
INSERT INTO public.exercise_question_option (exercise_question_option_id, exercise_question_id, option_text, sequence)
VALUES ('b24d3ab9-1ec6-4d02-8a9c-76ab8ffca0b6', '90b64057-5c23-4f96-af70-76f40d36e334', '*statement*', 4)
ON CONFLICT (exercise_question_id, sequence) DO NOTHING;

INSERT INTO public.exercise_question (exercise_question_id, exercise_id, question_text, question_type, correct_option_id, correct_boolean, correct_text, explanation, hint, sequence)
VALUES ('72637115-0dca-453d-b8d5-35cb720b82ee', '37ab7129-1995-4d44-9336-861cb09f2792', 'Operator manakah yang digunakan untuk menghitung sisa hasil pembagian dua bilangan di TypeScript?', 'MC', '34a701b3-0bd9-4c5c-bc2a-3f8fa1d210bd', NULL, NULL, 'Operator `%` (modulo) menghasilkan sisa dari pembagian dua bilangan.', 'Operasi ini dikenal juga sebagai modulo.', 2)
ON CONFLICT (exercise_id, sequence) DO NOTHING;
INSERT INTO public.exercise_question_option (exercise_question_option_id, exercise_question_id, option_text, sequence)
VALUES ('34a701b3-0bd9-4c5c-bc2a-3f8fa1d210bd', '72637115-0dca-453d-b8d5-35cb720b82ee', '`%`', 1)
ON CONFLICT (exercise_question_id, sequence) DO NOTHING;
INSERT INTO public.exercise_question_option (exercise_question_option_id, exercise_question_id, option_text, sequence)
VALUES ('b4de290c-f4b0-4cee-a8eb-381c6ca6473a', '72637115-0dca-453d-b8d5-35cb720b82ee', '`/`', 2)
ON CONFLICT (exercise_question_id, sequence) DO NOTHING;
INSERT INTO public.exercise_question_option (exercise_question_option_id, exercise_question_id, option_text, sequence)
VALUES ('b26321e8-f3d5-409b-b81e-abedb8f9ea51', '72637115-0dca-453d-b8d5-35cb720b82ee', '`*`', 3)
ON CONFLICT (exercise_question_id, sequence) DO NOTHING;
INSERT INTO public.exercise_question_option (exercise_question_option_id, exercise_question_id, option_text, sequence)
VALUES ('8efd6bf1-24ce-4fcc-8949-d681b5db6aa6', '72637115-0dca-453d-b8d5-35cb720b82ee', '`-`', 4)
ON CONFLICT (exercise_question_id, sequence) DO NOTHING;

INSERT INTO public.sub_material (submaterial_id, material_id, title, content, sequence)
VALUES ('cea28f91-11fd-4899-9900-7ce89ef57748', 'ee1ee406-799b-46f7-b27e-8827e1e3771e', 'Ketepatan Operator dan Operand dalam Ekspresi', 'Di TypeScript, operasi aritmetika seperti `-`, `*`, `/`, dan `%` mengharuskan kedua *operand* bertipe `number`. Jika salah satu *operand* bertipe `string`, TypeScript akan menandainya sebagai kesalahan tipe.

```ts
// Benar: kedua operand bertipe number
let luas: number = 6 * 4;

// Salah: "4" bertipe string
let luasSalah: number = 6 * "4";
```', 2)
ON CONFLICT (material_id, sequence) DO NOTHING;

INSERT INTO public.exercise (exercise_id, submaterial_id, title, question_type)
VALUES ('86f4e342-b723-419e-b0dc-8d3f23d9474d', 'cea28f91-11fd-4899-9900-7ce89ef57748', 'Latihan 4.2: Ketepatan Operator dan Operand dalam Ekspresi', 'TF')
ON CONFLICT (submaterial_id) DO NOTHING;

INSERT INTO public.exercise_question (exercise_question_id, exercise_id, question_text, question_type, correct_option_id, correct_boolean, correct_text, explanation, hint, sequence)
VALUES ('bd0a6eb6-2530-4ff0-9d31-f2d0e9845d04', '86f4e342-b723-419e-b0dc-8d3f23d9474d', 'Perhatikan ekspresi berikut:
```ts
let kurang: number = 15 - "5";
```
Pernyataan: Ekspresi pengurangan di atas valid dalam aturan tipe TypeScript.', 'TF', NULL, FALSE, NULL, 'Operator pengurangan `-` di TypeScript menuntut kedua *operand* bertipe `number`, bukan campuran `number` dan `string`.', 'Periksa tipe data kedua *operand* di kiri dan kanan tanda `-`.', 1)
ON CONFLICT (exercise_id, sequence) DO NOTHING;

INSERT INTO public.sub_material (submaterial_id, material_id, title, content, sequence)
VALUES ('879342f2-8497-4d42-bfc1-fa3b3382b786', 'ee1ee406-799b-46f7-b27e-8827e1e3771e', 'Melengkapi Ekspresi Aritmetika', 'Saat melengkapi ekspresi aritmetika, perhatikan hasil yang diinginkan lalu sesuaikan operator atau angka *operand*-nya.

```ts
let a: number = 20;
let b: number = 6;
let sisa: number = a % b; // sisa = 2
```', 3)
ON CONFLICT (material_id, sequence) DO NOTHING;

INSERT INTO public.exercise (exercise_id, submaterial_id, title, question_type)
VALUES ('c7abc125-23e2-4704-8212-400fd27350da', '879342f2-8497-4d42-bfc1-fa3b3382b786', 'Latihan 4.3: Melengkapi Ekspresi Aritmetika', 'FIB')
ON CONFLICT (submaterial_id) DO NOTHING;

INSERT INTO public.exercise_question (exercise_question_id, exercise_id, question_text, question_type, correct_option_id, correct_boolean, correct_text, explanation, hint, sequence)
VALUES ('fee5d66c-5f31-4127-9141-531a5ba6d772', 'c7abc125-23e2-4704-8212-400fd27350da', 'Lengkapi operator aritmetika berikut agar variabel `selisih` bernilai `7`:
```ts
let selisih: number = 15 _____ 8;
```', 'FIB', NULL, NULL, '-', 'Pengurangan `15` oleh `8` memakai operator `-` dan menghasilkan `7`.', 'Gunakan operator pengurangan.', 1)
ON CONFLICT (exercise_id, sequence) DO NOTHING;

INSERT INTO public.exercise_question (exercise_question_id, exercise_id, question_text, question_type, correct_option_id, correct_boolean, correct_text, explanation, hint, sequence)
VALUES ('18ee8970-c855-4ed7-b2a1-d71123325709', 'c7abc125-23e2-4704-8212-400fd27350da', 'Lengkapi nilai *operand* kedua agar hasil pembagian berikut bernilai `5`:
```ts
let bagi: number = 30 / _____;
```', 'FIB', NULL, NULL, '6', '`30 / 6` menghasilkan `5`.', 'Cari bilangan yang jika membagi `30` hasilnya `5`.', 2)
ON CONFLICT (exercise_id, sequence) DO NOTHING;

INSERT INTO public.material (material_id, title, description, sequence)
VALUES ('9c096f23-c7ca-4a9d-acb7-f2af8c2db338', 'Conditional', 'Menggunakan struktur percabangan `if`, `else if`, dan `else` untuk mengatur alur logika program.', 5)
ON CONFLICT (sequence) DO NOTHING;

INSERT INTO public.sub_material (submaterial_id, material_id, title, content, sequence)
VALUES ('b7537b9b-ad08-4bb8-b70f-d370317d270d', '9c096f23-c7ca-4a9d-acb7-f2af8c2db338', 'Mengenal Struktur `if`, `else if`, dan `else`', 'Percabangan digunakan agar program dapat mengambil keputusan berdasarkan suatu kondisi (`true` atau `false`). Kondisi sering dibentuk dengan operator perbandingan seperti `===` (sama dengan), `!==` (tidak sama), `>`, `<`, `>=`, dan `<=`.

```ts
let nilai: number = 82;

if (nilai >= 85) {
  console.log("Sangat Baik");
} else if (nilai >= 70) {
  console.log("Baik");
} else {
  console.log("Perlu Latihan");
}
```', 1)
ON CONFLICT (material_id, sequence) DO NOTHING;

INSERT INTO public.exercise (exercise_id, submaterial_id, title, question_type)
VALUES ('013c1bc1-4435-4515-ad37-0a58811bbb9a', 'b7537b9b-ad08-4bb8-b70f-d370317d270d', 'Latihan 5.1: Mengenal Struktur `if`, `else if`, dan `else`', 'MC')
ON CONFLICT (submaterial_id) DO NOTHING;

INSERT INTO public.exercise_question (exercise_question_id, exercise_id, question_text, question_type, correct_option_id, correct_boolean, correct_text, explanation, hint, sequence)
VALUES ('66b209c1-0bb0-49d0-9070-32f0abdb7e9a', '013c1bc1-4435-4515-ad37-0a58811bbb9a', 'Kata kunci apakah yang digunakan di TypeScript untuk menambahkan kondisi alternatif setelah kondisi `if` pertama bernilai `false`?', 'MC', 'd32e314c-c5d5-4f42-b790-5b319b47fc9e', NULL, NULL, 'Setelah `if`, kondisi tambahan berikutnya ditulis menggunakan `else if`.', 'TypeScript memakai dua kata terpisah untuk cabang kondisi berikutnya.', 1)
ON CONFLICT (exercise_id, sequence) DO NOTHING;
INSERT INTO public.exercise_question_option (exercise_question_option_id, exercise_question_id, option_text, sequence)
VALUES ('d32e314c-c5d5-4f42-b790-5b319b47fc9e', '66b209c1-0bb0-49d0-9070-32f0abdb7e9a', '`else if`', 1)
ON CONFLICT (exercise_question_id, sequence) DO NOTHING;
INSERT INTO public.exercise_question_option (exercise_question_option_id, exercise_question_id, option_text, sequence)
VALUES ('2ec607f4-278b-4c2b-92fe-7c448166636e', '66b209c1-0bb0-49d0-9070-32f0abdb7e9a', '`then if`', 2)
ON CONFLICT (exercise_question_id, sequence) DO NOTHING;
INSERT INTO public.exercise_question_option (exercise_question_option_id, exercise_question_id, option_text, sequence)
VALUES ('3a3e7001-7154-4678-915a-d1235c4b1e15', '66b209c1-0bb0-49d0-9070-32f0abdb7e9a', '`elif`', 3)
ON CONFLICT (exercise_question_id, sequence) DO NOTHING;
INSERT INTO public.exercise_question_option (exercise_question_option_id, exercise_question_id, option_text, sequence)
VALUES ('3254e851-394b-45f1-919e-084f5063e9ac', '66b209c1-0bb0-49d0-9070-32f0abdb7e9a', '`otherwise`', 4)
ON CONFLICT (exercise_question_id, sequence) DO NOTHING;

INSERT INTO public.exercise_question (exercise_question_id, exercise_id, question_text, question_type, correct_option_id, correct_boolean, correct_text, explanation, hint, sequence)
VALUES ('8f08eed3-68e4-4c8b-8d37-379e40095585', '013c1bc1-4435-4515-ad37-0a58811bbb9a', 'Operator manakah yang digunakan untuk memeriksa apakah nilai variabel `angka` sama persis dengan `10` di dalam kondisi `if`?', 'MC', 'a0ac05b2-e22e-4449-aef3-3a97c3e28672', NULL, NULL, 'Operator `===` membandingkan kesamaan nilai dan tipe secara ketat, sedangkan `=` adalah operator penugasan (*assignment*).', 'Tanda `=` tunggal dipakai untuk mengisi nilai variabel, bukan membandingkan.', 2)
ON CONFLICT (exercise_id, sequence) DO NOTHING;
INSERT INTO public.exercise_question_option (exercise_question_option_id, exercise_question_id, option_text, sequence)
VALUES ('a0ac05b2-e22e-4449-aef3-3a97c3e28672', '8f08eed3-68e4-4c8b-8d37-379e40095585', '`===`', 1)
ON CONFLICT (exercise_question_id, sequence) DO NOTHING;
INSERT INTO public.exercise_question_option (exercise_question_option_id, exercise_question_id, option_text, sequence)
VALUES ('bb2714dd-66fe-40ad-9950-81681802a7a1', '8f08eed3-68e4-4c8b-8d37-379e40095585', '`=`', 2)
ON CONFLICT (exercise_question_id, sequence) DO NOTHING;
INSERT INTO public.exercise_question_option (exercise_question_option_id, exercise_question_id, option_text, sequence)
VALUES ('c8a0270e-1a58-4aa7-9662-90f6930f2acd', '8f08eed3-68e4-4c8b-8d37-379e40095585', '`<>`', 3)
ON CONFLICT (exercise_question_id, sequence) DO NOTHING;
INSERT INTO public.exercise_question_option (exercise_question_option_id, exercise_question_id, option_text, sequence)
VALUES ('c5270de2-64d3-481e-940e-b7c828be1a49', '8f08eed3-68e4-4c8b-8d37-379e40095585', '`:=`', 4)
ON CONFLICT (exercise_question_id, sequence) DO NOTHING;

INSERT INTO public.sub_material (submaterial_id, material_id, title, content, sequence)
VALUES ('6682ea1f-b314-49ff-aa89-d1a0b02b3e23', '9c096f23-c7ca-4a9d-acb7-f2af8c2db338', 'Membedakan Kondisi dan Blok Kode Percabangan', 'Ada dua aturan sintaksis penting pada percabangan TypeScript:
1. Kondisi di dalam `if (...)` dan `else if (...)` harus menghasilkan nilai `boolean` (gunakan `===`, bukan `=`).
2. Blok `else` adalah cabang terakhir dan **tidak boleh** diberi tanda kurung kondisi.

```ts
// Salah: memakai = untuk membandingkan
if (kode = 1) {
  console.log("Satu");
}

// Salah: else tidak boleh punya kondisi
else (kode === 2) {
  console.log("Dua");
}
```', 2)
ON CONFLICT (material_id, sequence) DO NOTHING;

INSERT INTO public.exercise (exercise_id, submaterial_id, title, question_type)
VALUES ('12b0cb02-0aef-4424-8dfe-e09d489e2a0d', '6682ea1f-b314-49ff-aa89-d1a0b02b3e23', 'Latihan 5.2: Membedakan Kondisi dan Blok Kode Percabangan', 'TF')
ON CONFLICT (submaterial_id) DO NOTHING;

INSERT INTO public.exercise_question (exercise_question_id, exercise_id, question_text, question_type, correct_option_id, correct_boolean, correct_text, explanation, hint, sequence)
VALUES ('3192f12b-c7f4-48b1-9e2b-2ad8469028b3', '12b0cb02-0aef-4424-8dfe-e09d489e2a0d', 'Perhatikan potongan kode berikut:
```ts
let poin: number = 50;
if (poin = 50) {
  console.log("Pas");
}
```
Pernyataan: Penggunaan `poin = 50` di dalam tanda kurung `if` sudah tepat untuk membandingkan nilai.', 'TF', NULL, FALSE, NULL, 'Tanda `=` tunggal adalah operator pengisian nilai, bukan perbandingan kesamaan (`===`).', 'Bedakan operator penugasan (`=`) dengan operator perbandingan (`===`).', 1)
ON CONFLICT (exercise_id, sequence) DO NOTHING;

INSERT INTO public.exercise_question (exercise_question_id, exercise_id, question_text, question_type, correct_option_id, correct_boolean, correct_text, explanation, hint, sequence)
VALUES ('0e29a184-58ab-4d5f-8d82-30052fc53346', '12b0cb02-0aef-4424-8dfe-e09d489e2a0d', 'Perhatikan potongan kode berikut:
```ts
let stok: number = 3;
if (stok > 0) {
  console.log("Tersedia");
} else {
  console.log("Habis");
}
```
Pernyataan: Struktur percabangan `if` dan `else` pada kode di atas sudah benar.', 'TF', NULL, TRUE, NULL, '`if (stok > 0)` menguji kondisi boolean dengan benar, dan `else` ditulis tanpa kondisi dalam kurung.', 'Periksa tanda kurung kondisi pada `if` dan penulisan blok `else`.', 2)
ON CONFLICT (exercise_id, sequence) DO NOTHING;

INSERT INTO public.sub_material (submaterial_id, material_id, title, content, sequence)
VALUES ('b873d2fb-6370-418a-8575-b44ae731ee74', '9c096f23-c7ca-4a9d-acb7-f2af8c2db338', 'Melengkapi Struktur Percabangan', 'Pastikan setiap cabang diawali kata kunci yang tepat (`if`, `else if`, atau `else`) dan setiap blok diapit oleh kurung kurawal `{ ... }`.

```ts
let hadir: boolean = true;
if (hadir === true) {
  console.log("Masuk");
} else {
  console.log("Absen");
}
```', 3)
ON CONFLICT (material_id, sequence) DO NOTHING;

INSERT INTO public.exercise (exercise_id, submaterial_id, title, question_type)
VALUES ('9a29065d-78f9-4ddb-8b64-3e337fb37bff', 'b873d2fb-6370-418a-8575-b44ae731ee74', 'Latihan 5.3: Melengkapi Struktur Percabangan', 'FIB')
ON CONFLICT (submaterial_id) DO NOTHING;

INSERT INTO public.exercise_question (exercise_question_id, exercise_id, question_text, question_type, correct_option_id, correct_boolean, correct_text, explanation, hint, sequence)
VALUES ('4254c942-6256-4038-a5b1-183a43825f06', '9a29065d-78f9-4ddb-8b64-3e337fb37bff', 'Lengkapi kata kunci pembuka percabangan pada potongan kode berikut:
```ts
let umur: number = 20;
_____ (umur >= 18) {
  console.log("Dewasa");
}
```', 'FIB', NULL, NULL, 'if', 'Pengujian kondisi awal pada struktur percabangan diawali dengan kata kunci `if`.', 'Percabangan selalu dimulai dengan kata kunci ini.', 1)
ON CONFLICT (exercise_id, sequence) DO NOTHING;

INSERT INTO public.material (material_id, title, description, sequence)
VALUES ('39155e00-9f58-4a79-8f16-fa27eedc9fce', 'Loop', 'Menggunakan perulangan `for` dan `while` beserta komponen inisialisasi, kondisi, dan perubahan nilai.', 6)
ON CONFLICT (sequence) DO NOTHING;

INSERT INTO public.sub_material (submaterial_id, material_id, title, content, sequence)
VALUES ('5f958d1b-f469-4567-ae16-4fcbfd736a56', '39155e00-9f58-4a79-8f16-fa27eedc9fce', 'Mengenal Perulangan `for` dan `while`', 'Perulangan (*loop*) menjalankan blok kode secara berulang selama kondisi bernilai `true`. Dua bentuk utama di TypeScript adalah `for` dan `while`.

Perulangan **`for`** cocok ketika jumlah perulangan sudah jelas:

```ts
for (let i: number = 0; i < 3; i++) {
  console.log(i);
}
```

Perulangan **`while`** hanya menuliskan kondisi di dalam tanda kurung `(...)`:

```ts
let x: number = 0;
while (x < 3) {
  console.log(x);
  x++;
}
```', 1)
ON CONFLICT (material_id, sequence) DO NOTHING;

INSERT INTO public.exercise (exercise_id, submaterial_id, title, question_type)
VALUES ('422a3614-9496-4741-a1a4-97f290be557f', '5f958d1b-f469-4567-ae16-4fcbfd736a56', 'Latihan 6.1: Mengenal Perulangan `for` dan `while`', 'MC')
ON CONFLICT (submaterial_id) DO NOTHING;

INSERT INTO public.exercise_question (exercise_question_id, exercise_id, question_text, question_type, correct_option_id, correct_boolean, correct_text, explanation, hint, sequence)
VALUES ('e543a08d-8b18-4267-86f5-c7faf2c27634', '422a3614-9496-4741-a1a4-97f290be557f', 'Dalam perulangan `for (let i: number = 1; i <= 5; i++)`, bagian `let i: number = 1` berperan sebagai...', 'MC', '7186241f-0908-4ff2-8b23-0463a46ec94e', NULL, NULL, 'Bagian pertama dalam `for` adalah inisialisasi untuk menentukan nilai awal variabel penghitung.', 'Bagian ini hanya dijalankan satu kali di awal sebelum perulangan dimulai.', 1)
ON CONFLICT (exercise_id, sequence) DO NOTHING;
INSERT INTO public.exercise_question_option (exercise_question_option_id, exercise_question_id, option_text, sequence)
VALUES ('7186241f-0908-4ff2-8b23-0463a46ec94e', 'e543a08d-8b18-4267-86f5-c7faf2c27634', 'inisialisasi nilai awal', 1)
ON CONFLICT (exercise_question_id, sequence) DO NOTHING;
INSERT INTO public.exercise_question_option (exercise_question_option_id, exercise_question_id, option_text, sequence)
VALUES ('0db9e820-f859-4a31-889c-278a609da5c8', 'e543a08d-8b18-4267-86f5-c7faf2c27634', 'kondisi berhenti', 2)
ON CONFLICT (exercise_question_id, sequence) DO NOTHING;
INSERT INTO public.exercise_question_option (exercise_question_option_id, exercise_question_id, option_text, sequence)
VALUES ('6997ace6-04df-485a-8081-f67a84f438ef', 'e543a08d-8b18-4267-86f5-c7faf2c27634', 'perubahan nilai', 3)
ON CONFLICT (exercise_question_id, sequence) DO NOTHING;
INSERT INTO public.exercise_question_option (exercise_question_option_id, exercise_question_id, option_text, sequence)
VALUES ('5fb91642-ffff-4c06-8c55-ff3f25abbd83', 'e543a08d-8b18-4267-86f5-c7faf2c27634', 'isi blok kode', 4)
ON CONFLICT (exercise_question_id, sequence) DO NOTHING;

INSERT INTO public.exercise_question (exercise_question_id, exercise_id, question_text, question_type, correct_option_id, correct_boolean, correct_text, explanation, hint, sequence)
VALUES ('7df1ffd2-38be-4e0e-9f65-2e1bdc8138c9', '422a3614-9496-4741-a1a4-97f290be557f', 'Pada kode `while (hitung < 10) { hitung++; }`, bagian `hitung++` berfungsi untuk...', 'MC', 'c9c5040b-e6b6-4a04-af24-c42369d01ac9', NULL, NULL, '`hitung++` menaikkan nilai variabel sebesar 1 pada setiap putaran agar suatu saat kondisi `hitung < 10` menjadi `false`.', 'Operator `++` menaikkan nilai angka sebesar `1`.', 2)
ON CONFLICT (exercise_id, sequence) DO NOTHING;
INSERT INTO public.exercise_question_option (exercise_question_option_id, exercise_question_id, option_text, sequence)
VALUES ('c9c5040b-e6b6-4a04-af24-c42369d01ac9', '7df1ffd2-38be-4e0e-9f65-2e1bdc8138c9', 'mengubah nilai `hitung` di tiap iterasi', 1)
ON CONFLICT (exercise_question_id, sequence) DO NOTHING;
INSERT INTO public.exercise_question_option (exercise_question_option_id, exercise_question_id, option_text, sequence)
VALUES ('ffa62c21-41da-4dc0-825c-2771de418bba', '7df1ffd2-38be-4e0e-9f65-2e1bdc8138c9', 'menghentikan program secara paksa', 2)
ON CONFLICT (exercise_question_id, sequence) DO NOTHING;
INSERT INTO public.exercise_question_option (exercise_question_option_id, exercise_question_id, option_text, sequence)
VALUES ('50ddd66a-8f23-4138-8743-13d5aba814dd', '7df1ffd2-38be-4e0e-9f65-2e1bdc8138c9', 'mendeklarasikan variabel baru bernama `hitung`', 3)
ON CONFLICT (exercise_question_id, sequence) DO NOTHING;
INSERT INTO public.exercise_question_option (exercise_question_option_id, exercise_question_id, option_text, sequence)
VALUES ('b12b6224-2e78-4763-b1aa-973aa3b5aaf7', '7df1ffd2-38be-4e0e-9f65-2e1bdc8138c9', 'membandingkan `hitung` dengan `0`', 4)
ON CONFLICT (exercise_question_id, sequence) DO NOTHING;

INSERT INTO public.sub_material (submaterial_id, material_id, title, content, sequence)
VALUES ('e5ee4ddc-6eeb-4ecd-9323-22d347229ac6', '39155e00-9f58-4a79-8f16-fa27eedc9fce', 'Membedakan Inisialisasi, Kondisi, dan Perubahan Nilai', 'Perulangan `for` wajib memisahkan **inisialisasi**, **kondisi**, dan **perubahan nilai** menggunakan tanda **titik koma (`;`)**, bukan koma (`,`).

Selain itu, baik pada `for` maupun `while`, perubahan nilai harus mengarah ke kondisi berhenti agar tidak terjadi *infinite loop* (perulangan tanpa henti).

```ts
// Benar: dipisah dengan titik koma (;)
for (let i: number = 1; i <= 3; i++) {
  console.log(i);
}
```', 2)
ON CONFLICT (material_id, sequence) DO NOTHING;

INSERT INTO public.exercise (exercise_id, submaterial_id, title, question_type)
VALUES ('1c5f1980-3097-4187-8b3a-a0f2a653b31b', 'e5ee4ddc-6eeb-4ecd-9323-22d347229ac6', 'Latihan 6.2: Membedakan Inisialisasi, Kondisi, dan Perubahan Nilai', 'TF')
ON CONFLICT (submaterial_id) DO NOTHING;

INSERT INTO public.exercise_question (exercise_question_id, exercise_id, question_text, question_type, correct_option_id, correct_boolean, correct_text, explanation, hint, sequence)
VALUES ('36b26a1d-1df5-4671-ae8d-4af14d544fbd', '1c5f1980-3097-4187-8b3a-a0f2a653b31b', 'Perhatikan perulangan berikut:
```ts
let n: number = 1;
while (n <= 3; n++) {
  console.log(n);
}
```
Pernyataan: Penulisan kondisi dan perubahan nilai di dalam tanda kurung `while` pada kode di atas sudah benar.', 'TF', NULL, FALSE, NULL, '`while` hanya menerima satu ekspresi kondisi di dalam tanda kurung `(...)`, sedangkan perubahan nilai (`n++`) diletakkan di dalam blok `{ ... }`.', 'Ingat bahwa hanya perulangan `for` yang memakai tiga bagian dipisah titik koma di dalam tanda kurung.', 1)
ON CONFLICT (exercise_id, sequence) DO NOTHING;

INSERT INTO public.sub_material (submaterial_id, material_id, title, content, sequence)
VALUES ('60b551b6-e63d-451b-8603-c2a1536c119e', '39155e00-9f58-4a79-8f16-fa27eedc9fce', 'Melengkapi Sintaksis Perulangan', 'Pastikan ketiga elemen perulangan lengkap: nilai awal, syarat kondisi yang menghentikan loop, dan langkah perubahan nilainya (`i++` untuk naik atau `i--` untuk turun).

```ts
for (let mundur: number = 3; mundur >= 1; mundur--) {
  console.log(mundur);
}
```', 3)
ON CONFLICT (material_id, sequence) DO NOTHING;

INSERT INTO public.exercise (exercise_id, submaterial_id, title, question_type)
VALUES ('eb84a637-5f4b-419e-8c83-1b62e29ac4e1', '60b551b6-e63d-451b-8603-c2a1536c119e', 'Latihan 6.3: Melengkapi Sintaksis Perulangan', 'FIB')
ON CONFLICT (submaterial_id) DO NOTHING;

INSERT INTO public.exercise_question (exercise_question_id, exercise_id, question_text, question_type, correct_option_id, correct_boolean, correct_text, explanation, hint, sequence)
VALUES ('58c02fb4-99e6-4f5e-9702-21fd127132f3', 'eb84a637-5f4b-419e-8c83-1b62e29ac4e1', 'Lengkapi ekspresi perubahan nilai agar variabel `i` bertambah 1 pada setiap iterasi:
```ts
for (let i: number = 0; i < 4; _____) {
  console.log(i);
}
```', 'FIB', NULL, NULL, 'i++', '`i++` menambah nilai `i` sebesar `1` di akhir setiap putaran perulangan `for`.', 'Gunakan operator *increment* pada variabel `i`.', 1)
ON CONFLICT (exercise_id, sequence) DO NOTHING;

INSERT INTO public.exercise_question (exercise_question_id, exercise_id, question_text, question_type, correct_option_id, correct_boolean, correct_text, explanation, hint, sequence)
VALUES ('e8c3d123-686d-4a56-b979-0d1cb03ff25a', 'eb84a637-5f4b-419e-8c83-1b62e29ac4e1', 'Lengkapi kata kunci perulangan berikut agar blok dijalankan selama `angka < 5`:
```ts
let angka: number = 1;
_____ (angka < 5) {
  console.log(angka);
  angka++;
}
```', 'FIB', NULL, NULL, 'while', 'Struktur perulangan yang hanya menuliskan kondisi di dalam `(...)` adalah `while`.', 'Karena hanya ada satu ekspresi kondisi di dalam tanda kurung, gunakan perulangan yang sesuai.', 2)
ON CONFLICT (exercise_id, sequence) DO NOTHING;

INSERT INTO public.material (material_id, title, description, sequence)
VALUES ('6bb2a8c1-180d-4e78-a506-3ea042f41834', 'Function', 'Membuat dan memanggil fungsi dengan parameter bertipe dan tipe nilai kembalian yang jelas.', 7)
ON CONFLICT (sequence) DO NOTHING;

INSERT INTO public.sub_material (submaterial_id, material_id, title, content, sequence)
VALUES ('d15a8e50-0652-4b5f-ac1c-c170b542eae4', '6bb2a8c1-180d-4e78-a506-3ea042f41834', 'Mengenal Deklarasi Fungsi, Parameter, dan Nilai Kembalian', '**Function** adalah blok kode yang diberi nama agar dapat dipanggil berulang kali. Di TypeScript, parameter dan nilai kembaliannya diberi *type annotation*.

```ts
function hitungLuas(
  p: number,
  l: number
): number {
  return p * l;
}

let hasil: number = hitungLuas(5, 3);
```

Jika fungsi tidak mengembalikan nilai apa pun, tipe nilai kembaliannya ditulis **`void`**.

```ts
function tampilPesan(teks: string): void {
  console.log(teks);
}
```', 1)
ON CONFLICT (material_id, sequence) DO NOTHING;

INSERT INTO public.exercise (exercise_id, submaterial_id, title, question_type)
VALUES ('db54eafc-3cb9-4c7b-b407-1f549d62aa35', 'd15a8e50-0652-4b5f-ac1c-c170b542eae4', 'Latihan 7.1: Mengenal Deklarasi Fungsi, Parameter, dan Nilai Kembalian', 'MC')
ON CONFLICT (submaterial_id) DO NOTHING;

INSERT INTO public.exercise_question (exercise_question_id, exercise_id, question_text, question_type, correct_option_id, correct_boolean, correct_text, explanation, hint, sequence)
VALUES ('0bc99422-a7d5-437b-80f7-3472ebdd1b25', 'db54eafc-3cb9-4c7b-b407-1f549d62aa35', 'Pada deklarasi `function sapaSiswa(nama: string): string`, bagian `nama: string` di dalam tanda kurung disebut...', 'MC', 'c70ae02e-ef65-44bf-9c28-4060d00f5bdc', NULL, NULL, 'Variabel masukan yang ditulis di dalam tanda kurung deklarasi fungsi disebut parameter.', 'Bagian ini menerima nilai masukan saat fungsi dipanggil.', 1)
ON CONFLICT (exercise_id, sequence) DO NOTHING;
INSERT INTO public.exercise_question_option (exercise_question_option_id, exercise_question_id, option_text, sequence)
VALUES ('c70ae02e-ef65-44bf-9c28-4060d00f5bdc', '0bc99422-a7d5-437b-80f7-3472ebdd1b25', 'parameter beserta tipe datanya', 1)
ON CONFLICT (exercise_question_id, sequence) DO NOTHING;
INSERT INTO public.exercise_question_option (exercise_question_option_id, exercise_question_id, option_text, sequence)
VALUES ('0d44d9d8-0ed7-4044-9a5e-d49920b3dc65', '0bc99422-a7d5-437b-80f7-3472ebdd1b25', 'tipe nilai kembalian fungsi', 2)
ON CONFLICT (exercise_question_id, sequence) DO NOTHING;
INSERT INTO public.exercise_question_option (exercise_question_option_id, exercise_question_id, option_text, sequence)
VALUES ('b5621256-4796-42d0-8d92-f51d483c553d', '0bc99422-a7d5-437b-80f7-3472ebdd1b25', 'pemanggilan fungsi', 3)
ON CONFLICT (exercise_question_id, sequence) DO NOTHING;
INSERT INTO public.exercise_question_option (exercise_question_option_id, exercise_question_id, option_text, sequence)
VALUES ('7fa0cda6-5dbb-4db9-b12a-342a7b01bb83', '0bc99422-a7d5-437b-80f7-3472ebdd1b25', 'pernyataan `return`', 4)
ON CONFLICT (exercise_question_id, sequence) DO NOTHING;

INSERT INTO public.exercise_question (exercise_question_id, exercise_id, question_text, question_type, correct_option_id, correct_boolean, correct_text, explanation, hint, sequence)
VALUES ('74b33612-0851-4f1a-a5b4-f01524ebd262', 'db54eafc-3cb9-4c7b-b407-1f549d62aa35', 'Kata kunci apakah yang digunakan di dalam badan fungsi untuk mengirimkan hasil akhir kembali ke pemanggil fungsi?', 'MC', '79f8a00d-5ef8-49c5-a0de-ad11b8cedc4f', NULL, NULL, 'Pernyataan `return` menghentikan eksekusi fungsi sekaligus mengembalikan nilai ke pemanggilnya.', 'Kata kunci ini selalu berada sebelum ekspresi nilai yang dikembalikan.', 2)
ON CONFLICT (exercise_id, sequence) DO NOTHING;
INSERT INTO public.exercise_question_option (exercise_question_option_id, exercise_question_id, option_text, sequence)
VALUES ('79f8a00d-5ef8-49c5-a0de-ad11b8cedc4f', '74b33612-0851-4f1a-a5b4-f01524ebd262', '`return`', 1)
ON CONFLICT (exercise_question_id, sequence) DO NOTHING;
INSERT INTO public.exercise_question_option (exercise_question_option_id, exercise_question_id, option_text, sequence)
VALUES ('bf24a86b-83bb-4a98-a4c5-ef3a46a11e59', '74b33612-0851-4f1a-a5b4-f01524ebd262', '`void`', 2)
ON CONFLICT (exercise_question_id, sequence) DO NOTHING;
INSERT INTO public.exercise_question_option (exercise_question_option_id, exercise_question_id, option_text, sequence)
VALUES ('c6d7953c-4d42-44fd-85a2-7b780d0add10', '74b33612-0851-4f1a-a5b4-f01524ebd262', '`const`', 3)
ON CONFLICT (exercise_question_id, sequence) DO NOTHING;
INSERT INTO public.exercise_question_option (exercise_question_option_id, exercise_question_id, option_text, sequence)
VALUES ('6ae9c736-f040-428d-9c5c-5c9d47f3fe9a', '74b33612-0851-4f1a-a5b4-f01524ebd262', '`function`', 4)
ON CONFLICT (exercise_question_id, sequence) DO NOTHING;

INSERT INTO public.sub_material (submaterial_id, material_id, title, content, sequence)
VALUES ('d0a1bd62-dd95-401b-83b0-dfcb7cf62e84', '6bb2a8c1-180d-4e78-a506-3ea042f41834', 'Membedakan Penulisan Parameter dan Nilai Kembalian', 'TypeScript memeriksa dua hal penting pada deklarasi fungsi:
1. Setiap parameter wajib memiliki tipe data yang jelas.
2. Nilai yang dikirim lewat `return` harus cocok dengan tipe kembalian fungsi. Jika tipe kembalian `void`, fungsi tidak boleh mengembalikan nilai.

```ts
// Salah: tipe kembalian string, tapi return angka
function ambilKode(): string {
  return 404;
}
```', 2)
ON CONFLICT (material_id, sequence) DO NOTHING;

INSERT INTO public.exercise (exercise_id, submaterial_id, title, question_type)
VALUES ('052e98bb-1cbb-43bb-9909-67f6da396d22', 'd0a1bd62-dd95-401b-83b0-dfcb7cf62e84', 'Latihan 7.2: Membedakan Penulisan Parameter dan Nilai Kembalian', 'TF')
ON CONFLICT (submaterial_id) DO NOTHING;

INSERT INTO public.exercise_question (exercise_question_id, exercise_id, question_text, question_type, correct_option_id, correct_boolean, correct_text, explanation, hint, sequence)
VALUES ('7165e4cd-969d-445f-bcac-2df6b3397ef9', '052e98bb-1cbb-43bb-9909-67f6da396d22', 'Perhatikan deklarasi fungsi berikut:
```ts
function cekGenap(angka: number): boolean {
  return angka % 2 === 0;
}
```
Pernyataan: Deklarasi parameter, tipe nilai kembalian, dan hasil `return` pada fungsi di atas sudah sesuai.', 'TF', NULL, TRUE, NULL, 'Ekspresi perbandingan `===` menghasilkan nilai `boolean` (`true` atau `false`), sehingga cocok dengan tipe kembalian `: boolean`.', 'Evaluasi apakah ekspresi `angka % 2 === 0` menghasilkan `boolean`.', 1)
ON CONFLICT (exercise_id, sequence) DO NOTHING;

INSERT INTO public.sub_material (submaterial_id, material_id, title, content, sequence)
VALUES ('db052f12-b60a-4df0-9f48-3dc922fe73ac', '6bb2a8c1-180d-4e78-a506-3ea042f41834', 'Melengkapi Deklarasi Fungsi dan Pernyataan `return`', 'Saat menulis fungsi, pastikan urutan deklarasinya lengkap:
`function namaFungsi(param: tipe): tipeKembalian { return nilai; }`

```ts
function gabung(depan: string): string {
  return "Halo, " + depan;
}
```', 3)
ON CONFLICT (material_id, sequence) DO NOTHING;

INSERT INTO public.exercise (exercise_id, submaterial_id, title, question_type)
VALUES ('28a7cdb8-757f-4a55-b0b8-29ddf2296da3', 'db052f12-b60a-4df0-9f48-3dc922fe73ac', 'Latihan 7.3: Melengkapi Deklarasi Fungsi dan Pernyataan `return`', 'FIB')
ON CONFLICT (submaterial_id) DO NOTHING;

INSERT INTO public.exercise_question (exercise_question_id, exercise_id, question_text, question_type, correct_option_id, correct_boolean, correct_text, explanation, hint, sequence)
VALUES ('01635c51-495e-490e-b913-a33371bc11c9', '28a7cdb8-757f-4a55-b0b8-29ddf2296da3', 'Lengkapi kata kunci pembuka untuk mendeklarasikan fungsi berikut:
```ts
_____ kuadrat(n: number): number {
  return n * n;
}
```', 'FIB', NULL, NULL, 'function', 'Kata kunci `function` digunakan untuk mendeklarasikan fungsi di TypeScript.', 'Deklarasi fungsi reguler di TypeScript diawali dengan kata kunci ini.', 1)
ON CONFLICT (exercise_id, sequence) DO NOTHING;

INSERT INTO public.exercise_question (exercise_question_id, exercise_id, question_text, question_type, correct_option_id, correct_boolean, correct_text, explanation, hint, sequence)
VALUES ('26f58981-4ca1-4808-9018-c4949ed85207', '28a7cdb8-757f-4a55-b0b8-29ddf2296da3', 'Lengkapi tipe nilai kembalian fungsi berikut agar sesuai dengan hasil `return`-nya:
```ts
function tambahLima(x: number): _____ {
  return x + 5;
}
```', 'FIB', NULL, NULL, 'number', 'Karena `x` bertipe `number`, hasil `x + 5` bertipe `number`.', 'Penjumlahan antara `x` (`number`) dan `5` menghasilkan angka.', 2)
ON CONFLICT (exercise_id, sequence) DO NOTHING;

INSERT INTO public.test (test_id, title, test_type, description)
VALUES ('787cade1-f8f0-4fc7-95de-862eef75dd7e', 'Pre-Test PLAS-TypeScript', 'PRE', 'Evaluasi kemampuan awal mahasiswa sebelum mempelajari 7 materi TypeScript.')
ON CONFLICT (test_type) DO NOTHING;

INSERT INTO public.test_question (test_question_id, test_id, question_type, question_text, correct_option_id, correct_boolean, correct_text, sequence)
VALUES ('8fa1d62e-48c0-4133-9211-08e3e658e7ef', '787cade1-f8f0-4fc7-95de-862eef75dd7e', 'MC', 'Manakah penulisan blok kode (*code block*) yang valid dalam TypeScript untuk mengelompokkan beberapa pernyataan?', '0f3eceae-95f8-44da-8332-581a41217279', NULL, NULL, 1)
ON CONFLICT (test_id, sequence) DO NOTHING;
INSERT INTO public.test_question_option (test_question_option_id, test_question_id, option_text, sequence)
VALUES ('0f3eceae-95f8-44da-8332-581a41217279', '8fa1d62e-48c0-4133-9211-08e3e658e7ef', '`{ let x = 1; let y = 2; }`', 1)
ON CONFLICT (test_question_id, sequence) DO NOTHING;
INSERT INTO public.test_question_option (test_question_option_id, test_question_id, option_text, sequence)
VALUES ('71074a64-4ab3-4b4c-8da4-9d5193a2d7ee', '8fa1d62e-48c0-4133-9211-08e3e658e7ef', '`[ let x = 1; let y = 2; ]`', 2)
ON CONFLICT (test_question_id, sequence) DO NOTHING;
INSERT INTO public.test_question_option (test_question_option_id, test_question_id, option_text, sequence)
VALUES ('b6f8733e-47cd-4e10-a1c4-6edd68340778', '8fa1d62e-48c0-4133-9211-08e3e658e7ef', '`( let x = 1; let y = 2; )`', 3)
ON CONFLICT (test_question_id, sequence) DO NOTHING;
INSERT INTO public.test_question_option (test_question_option_id, test_question_id, option_text, sequence)
VALUES ('f7502fdc-3878-4fff-830c-7e6061220fde', '8fa1d62e-48c0-4133-9211-08e3e658e7ef', '`< let x = 1; let y = 2; >`', 4)
ON CONFLICT (test_question_id, sequence) DO NOTHING;

INSERT INTO public.test_question (test_question_id, test_id, question_type, question_text, correct_option_id, correct_boolean, correct_text, sequence)
VALUES ('d45d3878-b774-4a25-99a4-18949d53003f', '787cade1-f8f0-4fc7-95de-862eef75dd7e', 'TF', 'Perhatikan potongan kode TypeScript berikut:

```ts
{
  let skor: number = 10;
  console.log(skor);
```

Pernyataan: Struktur penulisan blok kode TypeScript di atas sudah benar dan lengkap.', NULL, FALSE, NULL, 2)
ON CONFLICT (test_id, sequence) DO NOTHING;

INSERT INTO public.test_question (test_question_id, test_id, question_type, question_text, correct_option_id, correct_boolean, correct_text, sequence)
VALUES ('30252cb0-7ae0-4810-bbfe-ceda49ab8e23', '787cade1-f8f0-4fc7-95de-862eef75dd7e', 'MC', 'Manakah deklarasi variabel konstan bertipe `number` yang penempatan *type annotation*-nya benar dalam TypeScript?', 'd682126c-f965-4fea-bad1-b4a0fb3b3b3f', NULL, NULL, 3)
ON CONFLICT (test_id, sequence) DO NOTHING;
INSERT INTO public.test_question_option (test_question_option_id, test_question_id, option_text, sequence)
VALUES ('d682126c-f965-4fea-bad1-b4a0fb3b3b3f', '30252cb0-7ae0-4810-bbfe-ceda49ab8e23', '`const batasNilai: number = 75;`', 1)
ON CONFLICT (test_question_id, sequence) DO NOTHING;
INSERT INTO public.test_question_option (test_question_option_id, test_question_id, option_text, sequence)
VALUES ('45698c5d-b1f2-4ec6-8204-7730a60cf4c9', '30252cb0-7ae0-4810-bbfe-ceda49ab8e23', '`let: number batasNilai = 75;`', 2)
ON CONFLICT (test_question_id, sequence) DO NOTHING;
INSERT INTO public.test_question_option (test_question_option_id, test_question_id, option_text, sequence)
VALUES ('ff6270ae-3c44-4590-b5a1-6b1354ccbb2d', '30252cb0-7ae0-4810-bbfe-ceda49ab8e23', '`const number: batasNilai = 75;`', 3)
ON CONFLICT (test_question_id, sequence) DO NOTHING;
INSERT INTO public.test_question_option (test_question_option_id, test_question_id, option_text, sequence)
VALUES ('73cdd0a1-f726-4fce-a228-5ef86d2a0f68', '30252cb0-7ae0-4810-bbfe-ceda49ab8e23', '`const batasNilai = number: 75;`', 4)
ON CONFLICT (test_question_id, sequence) DO NOTHING;

INSERT INTO public.test_question (test_question_id, test_id, question_type, question_text, correct_option_id, correct_boolean, correct_text, sequence)
VALUES ('38074ffb-e89d-4624-a10f-fd976cdef496', '787cade1-f8f0-4fc7-95de-862eef75dd7e', 'TF', 'Perhatikan deklarasi variabel berikut:

```ts
const nilaiMaksimal: number = 100;
```

Pernyataan: Deklarasi variabel dan penulisan *type annotation* di atas sudah sesuai aturan sintaksis TypeScript.', NULL, TRUE, NULL, 4)
ON CONFLICT (test_id, sequence) DO NOTHING;

INSERT INTO public.test_question (test_question_id, test_id, question_type, question_text, correct_option_id, correct_boolean, correct_text, sequence)
VALUES ('1f573f9d-f14c-4e88-bc93-fe5bbde04f80', '787cade1-f8f0-4fc7-95de-862eef75dd7e', 'FIB', 'Lengkapi kata kunci deklarasi variabel berikut agar nilainya bersifat tetap (tidak dapat diubah ulang):

```ts
_____ tahunMasuk: number = 2026;
```', NULL, NULL, 'const', 5)
ON CONFLICT (test_id, sequence) DO NOTHING;

INSERT INTO public.test_question (test_question_id, test_id, question_type, question_text, correct_option_id, correct_boolean, correct_text, sequence)
VALUES ('c0a2464b-b269-43cd-8206-dd6a0379ef50', '787cade1-f8f0-4fc7-95de-862eef75dd7e', 'MC', 'Tipe data dasar apakah yang paling tepat digunakan di TypeScript untuk menyimpan nilai `true` atau `false`?', '5f77b031-4cc1-4ffc-9047-3a3da0ec1268', NULL, NULL, 6)
ON CONFLICT (test_id, sequence) DO NOTHING;
INSERT INTO public.test_question_option (test_question_option_id, test_question_id, option_text, sequence)
VALUES ('e9072553-8f96-46f9-88bb-952f263cbb21', 'c0a2464b-b269-43cd-8206-dd6a0379ef50', '`string`', 1)
ON CONFLICT (test_question_id, sequence) DO NOTHING;
INSERT INTO public.test_question_option (test_question_option_id, test_question_id, option_text, sequence)
VALUES ('65f26955-ab9a-4441-804c-eda5dc3471c6', 'c0a2464b-b269-43cd-8206-dd6a0379ef50', '`number`', 2)
ON CONFLICT (test_question_id, sequence) DO NOTHING;
INSERT INTO public.test_question_option (test_question_option_id, test_question_id, option_text, sequence)
VALUES ('5f77b031-4cc1-4ffc-9047-3a3da0ec1268', 'c0a2464b-b269-43cd-8206-dd6a0379ef50', '`boolean`', 3)
ON CONFLICT (test_question_id, sequence) DO NOTHING;
INSERT INTO public.test_question_option (test_question_option_id, test_question_id, option_text, sequence)
VALUES ('59db824d-a4b3-4f36-b639-36887600088b', 'c0a2464b-b269-43cd-8206-dd6a0379ef50', '`char`', 4)
ON CONFLICT (test_question_id, sequence) DO NOTHING;

INSERT INTO public.test_question (test_question_id, test_id, question_type, question_text, correct_option_id, correct_boolean, correct_text, sequence)
VALUES ('6b1ec830-1843-4079-9996-aa8346356296', '787cade1-f8f0-4fc7-95de-862eef75dd7e', 'TF', 'Perhatikan deklarasi variabel berikut:

```ts
let kodePos: number = "81116";
```

Pernyataan: Nilai `"81116"` sudah sesuai dengan tipe data `number` pada deklarasi di atas.', NULL, FALSE, NULL, 7)
ON CONFLICT (test_id, sequence) DO NOTHING;

INSERT INTO public.test_question (test_question_id, test_id, question_type, question_text, correct_option_id, correct_boolean, correct_text, sequence)
VALUES ('19ec1fee-738c-4dc6-96c0-35af33fe3738', '787cade1-f8f0-4fc7-95de-862eef75dd7e', 'FIB', 'Lengkapi *type annotation* yang sesuai pada deklarasi variabel berikut:

```ts
let namaKampus: _____ = "Undiksha";
```', NULL, NULL, 'string', 8)
ON CONFLICT (test_id, sequence) DO NOTHING;

INSERT INTO public.test_question (test_question_id, test_id, question_type, question_text, correct_option_id, correct_boolean, correct_text, sequence)
VALUES ('4664ee4d-8c8a-49bb-91e7-3f405077fa7f', '787cade1-f8f0-4fc7-95de-862eef75dd7e', 'MC', 'Pada ekspresi `let sisa: number = 17 % 5;`, fungsi operator `%` adalah untuk menghasilkan...', '631548a3-6c74-4600-beac-1dd933d92e02', NULL, NULL, 9)
ON CONFLICT (test_id, sequence) DO NOTHING;
INSERT INTO public.test_question_option (test_question_option_id, test_question_id, option_text, sequence)
VALUES ('fa2adee1-274d-4326-8138-1a1f197459bc', '4664ee4d-8c8a-49bb-91e7-3f405077fa7f', 'hasil pembagian bilangan desimal', 1)
ON CONFLICT (test_question_id, sequence) DO NOTHING;
INSERT INTO public.test_question_option (test_question_option_id, test_question_id, option_text, sequence)
VALUES ('631548a3-6c74-4600-beac-1dd933d92e02', '4664ee4d-8c8a-49bb-91e7-3f405077fa7f', 'sisa hasil bagi', 2)
ON CONFLICT (test_question_id, sequence) DO NOTHING;
INSERT INTO public.test_question_option (test_question_option_id, test_question_id, option_text, sequence)
VALUES ('4a3daaa2-5a42-4f40-97db-c3e10395f47e', '4664ee4d-8c8a-49bb-91e7-3f405077fa7f', 'hasil perkalian dua bilangan', 3)
ON CONFLICT (test_question_id, sequence) DO NOTHING;
INSERT INTO public.test_question_option (test_question_option_id, test_question_id, option_text, sequence)
VALUES ('23395280-4a6e-4b35-a11b-b9153ee3f357', '4664ee4d-8c8a-49bb-91e7-3f405077fa7f', 'nilai persentase bilangan pertama', 4)
ON CONFLICT (test_question_id, sequence) DO NOTHING;

INSERT INTO public.test_question (test_question_id, test_id, question_type, question_text, correct_option_id, correct_boolean, correct_text, sequence)
VALUES ('9f31b3bb-0278-4e21-bc79-5142a1a6fcba', '787cade1-f8f0-4fc7-95de-862eef75dd7e', 'TF', 'Perhatikan ekspresi berikut:

```ts
let selisih: number = 25 - 9;
```

Pernyataan: Penggunaan operator `-` dan kedua *operand* pada ekspresi TypeScript tersebut sudah benar.', NULL, TRUE, NULL, 10)
ON CONFLICT (test_id, sequence) DO NOTHING;

INSERT INTO public.test_question (test_question_id, test_id, question_type, question_text, correct_option_id, correct_boolean, correct_text, sequence)
VALUES ('51133d7e-3205-40aa-806c-e180bd7fd7a8', '787cade1-f8f0-4fc7-95de-862eef75dd7e', 'FIB', 'Lengkapi operator aritmetika yang tepat agar nilai variabel `total` menjadi `24`:

```ts
let total: number = 6 _____ 4;
```', NULL, NULL, '*', 11)
ON CONFLICT (test_id, sequence) DO NOTHING;

INSERT INTO public.test_question (test_question_id, test_id, question_type, question_text, correct_option_id, correct_boolean, correct_text, sequence)
VALUES ('cbc55bdd-7268-4507-a727-1e2f50feb5a0', '787cade1-f8f0-4fc7-95de-862eef75dd7e', 'MC', 'Bagian manakah dalam struktur percabangan yang akan dijalankan apabila seluruh kondisi `if` dan `else if` di atasnya bernilai `false`?', 'c5225b81-09e6-4d1c-838a-77baca56249a', NULL, NULL, 12)
ON CONFLICT (test_id, sequence) DO NOTHING;
INSERT INTO public.test_question_option (test_question_option_id, test_question_id, option_text, sequence)
VALUES ('a94ba40a-f520-49f1-86da-32d0725fac03', 'cbc55bdd-7268-4507-a727-1e2f50feb5a0', '`if`', 1)
ON CONFLICT (test_question_id, sequence) DO NOTHING;
INSERT INTO public.test_question_option (test_question_option_id, test_question_id, option_text, sequence)
VALUES ('af6445b6-7286-4e66-8e2b-62727105a1bb', 'cbc55bdd-7268-4507-a727-1e2f50feb5a0', '`else if`', 2)
ON CONFLICT (test_question_id, sequence) DO NOTHING;
INSERT INTO public.test_question_option (test_question_option_id, test_question_id, option_text, sequence)
VALUES ('c5225b81-09e6-4d1c-838a-77baca56249a', 'cbc55bdd-7268-4507-a727-1e2f50feb5a0', '`else`', 3)
ON CONFLICT (test_question_id, sequence) DO NOTHING;
INSERT INTO public.test_question_option (test_question_option_id, test_question_id, option_text, sequence)
VALUES ('582a573c-22df-4f80-814c-6bb6e3663379', 'cbc55bdd-7268-4507-a727-1e2f50feb5a0', '`return`', 4)
ON CONFLICT (test_question_id, sequence) DO NOTHING;

INSERT INTO public.test_question (test_question_id, test_id, question_type, question_text, correct_option_id, correct_boolean, correct_text, sequence)
VALUES ('58cfd70d-35cf-4395-a193-e50a10dae081', '787cade1-f8f0-4fc7-95de-862eef75dd7e', 'TF', 'Perhatikan potongan kode percabangan berikut:

```ts
let nilai: number = 80;
if (nilai >= 75) {
  console.log("Lulus");
} else (nilai < 75) {
  console.log("Ulang");
}
```

Pernyataan: Penulisan `else (nilai < 75)` pada struktur percabangan di atas sudah benar secara sintaksis TypeScript.', NULL, FALSE, NULL, 13)
ON CONFLICT (test_id, sequence) DO NOTHING;

INSERT INTO public.test_question (test_question_id, test_id, question_type, question_text, correct_option_id, correct_boolean, correct_text, sequence)
VALUES ('b918b6b1-f53e-40f8-98c4-8a4f52128fe2', '787cade1-f8f0-4fc7-95de-862eef75dd7e', 'FIB', 'Lengkapi kata kunci percabangan kedua pada potongan kode berikut:

```ts
let nilai: number = 78;
if (nilai >= 85) {
  console.log("A");
} _____ (nilai >= 70) {
  console.log("B");
}
```', NULL, NULL, 'else if', 14)
ON CONFLICT (test_id, sequence) DO NOTHING;

INSERT INTO public.test_question (test_question_id, test_id, question_type, question_text, correct_option_id, correct_boolean, correct_text, sequence)
VALUES ('0b9b5862-706e-46cd-a929-3660c71d65ea', '787cade1-f8f0-4fc7-95de-862eef75dd7e', 'MC', 'Manakah urutan tiga komponen yang benar di dalam tanda kurung perulangan `for` pada TypeScript?', '50e93df7-697d-46e3-8567-b6d72f0c90f8', NULL, NULL, 15)
ON CONFLICT (test_id, sequence) DO NOTHING;
INSERT INTO public.test_question_option (test_question_option_id, test_question_id, option_text, sequence)
VALUES ('d9ad45ed-6f54-4efa-85b1-5331adfbca37', '0b9b5862-706e-46cd-a929-3660c71d65ea', 'kondisi; inisialisasi; perubahan nilai', 1)
ON CONFLICT (test_question_id, sequence) DO NOTHING;
INSERT INTO public.test_question_option (test_question_option_id, test_question_id, option_text, sequence)
VALUES ('50e93df7-697d-46e3-8567-b6d72f0c90f8', '0b9b5862-706e-46cd-a929-3660c71d65ea', 'inisialisasi; kondisi; perubahan nilai', 2)
ON CONFLICT (test_question_id, sequence) DO NOTHING;
INSERT INTO public.test_question_option (test_question_option_id, test_question_id, option_text, sequence)
VALUES ('ac436d16-0ee6-4bd6-b0d5-b3e1ba165e92', '0b9b5862-706e-46cd-a929-3660c71d65ea', 'perubahan nilai; kondisi; inisialisasi', 3)
ON CONFLICT (test_question_id, sequence) DO NOTHING;
INSERT INTO public.test_question_option (test_question_option_id, test_question_id, option_text, sequence)
VALUES ('b69ca231-4861-4a47-a6f0-189e12c85ae6', '0b9b5862-706e-46cd-a929-3660c71d65ea', 'inisialisasi; perubahan nilai; kondisi', 4)
ON CONFLICT (test_question_id, sequence) DO NOTHING;

INSERT INTO public.test_question (test_question_id, test_id, question_type, question_text, correct_option_id, correct_boolean, correct_text, sequence)
VALUES ('519efbd6-7917-4edd-a21b-9c31b9ebf20b', '787cade1-f8f0-4fc7-95de-862eef75dd7e', 'TF', 'Perhatikan perulangan berikut:

```ts
for (let i: number = 1; i <= 4; i++) {
  console.log(i);
}
```

Pernyataan: Penulisan inisialisasi, kondisi, dan perubahan nilai pada perulangan `for` di atas sudah benar.', NULL, TRUE, NULL, 16)
ON CONFLICT (test_id, sequence) DO NOTHING;

INSERT INTO public.test_question (test_question_id, test_id, question_type, question_text, correct_option_id, correct_boolean, correct_text, sequence)
VALUES ('a889e03f-d799-45ab-9c89-0835c5cb1881', '787cade1-f8f0-4fc7-95de-862eef75dd7e', 'FIB', 'Lengkapi kata kunci perulangan yang memeriksa kondisi sebelum menjalankan blok kode:

```ts
let hitung: number = 1;
_____ (hitung <= 3) {
  console.log(hitung);
  hitung++;
}
```', NULL, NULL, 'while', 17)
ON CONFLICT (test_id, sequence) DO NOTHING;

INSERT INTO public.test_question (test_question_id, test_id, question_type, question_text, correct_option_id, correct_boolean, correct_text, sequence)
VALUES ('577f44c2-2ad9-4e54-83d7-af00bfcd91b9', '787cade1-f8f0-4fc7-95de-862eef75dd7e', 'MC', 'Pada deklarasi `function tambah(a: number, b: number): number { return a + b; }`, bagian `: number` tepat setelah tanda kurung tutup `)` menunjukkan...', '5fd05574-4ec8-4ec2-99c4-be14f785402b', NULL, NULL, 18)
ON CONFLICT (test_id, sequence) DO NOTHING;
INSERT INTO public.test_question_option (test_question_option_id, test_question_id, option_text, sequence)
VALUES ('5fd05574-4ec8-4ec2-99c4-be14f785402b', '577f44c2-2ad9-4e54-83d7-af00bfcd91b9', 'tipe data nilai kembalian fungsi', 1)
ON CONFLICT (test_question_id, sequence) DO NOTHING;
INSERT INTO public.test_question_option (test_question_option_id, test_question_id, option_text, sequence)
VALUES ('d6e5987e-54f5-406e-b6f1-e56eca27f6b0', '577f44c2-2ad9-4e54-83d7-af00bfcd91b9', 'jumlah maksimal parameter fungsi', 2)
ON CONFLICT (test_question_id, sequence) DO NOTHING;
INSERT INTO public.test_question_option (test_question_option_id, test_question_id, option_text, sequence)
VALUES ('8a2230bd-8366-43d8-9739-e197d171d6f2', '577f44c2-2ad9-4e54-83d7-af00bfcd91b9', 'tipe data variabel di luar fungsi', 3)
ON CONFLICT (test_question_id, sequence) DO NOTHING;
INSERT INTO public.test_question_option (test_question_option_id, test_question_id, option_text, sequence)
VALUES ('b26a41d0-eb92-4b53-b63a-3bb1a01d77c8', '577f44c2-2ad9-4e54-83d7-af00bfcd91b9', 'urutan pemanggilan fungsi', 4)
ON CONFLICT (test_question_id, sequence) DO NOTHING;

INSERT INTO public.test_question (test_question_id, test_id, question_type, question_text, correct_option_id, correct_boolean, correct_text, sequence)
VALUES ('c7da96a9-9c8f-4eac-b6bd-d0a30cb8291e', '787cade1-f8f0-4fc7-95de-862eef75dd7e', 'TF', 'Perhatikan deklarasi fungsi berikut:

```ts
function sapa(nama: string): number {
  return "Halo " + nama;
}
```

Pernyataan: Deklarasi fungsi di atas sudah sesuai antara tipe nilai kembalian dan nilai yang dikembalikan oleh `return`.', NULL, FALSE, NULL, 19)
ON CONFLICT (test_id, sequence) DO NOTHING;

INSERT INTO public.test_question (test_question_id, test_id, question_type, question_text, correct_option_id, correct_boolean, correct_text, sequence)
VALUES ('8319d250-a663-418e-9e8b-db538af7a63e', '787cade1-f8f0-4fc7-95de-862eef75dd7e', 'FIB', 'Lengkapi kata kunci untuk mengembalikan hasil perhitungan dari fungsi berikut:

```ts
function kaliDua(x: number): number {
  _____ x * 2;
}
```', NULL, NULL, 'return', 20)
ON CONFLICT (test_id, sequence) DO NOTHING;

INSERT INTO public.test (test_id, title, test_type, description)
VALUES ('11437c15-b9fd-44cd-bcb9-e0ef212a505d', 'Post-Test PLAS-TypeScript', 'POST', 'Evaluasi akhir mahasiswa setelah menyelesaikan seluruh materi dan latihan wajib (DBR-15).')
ON CONFLICT (test_type) DO NOTHING;

INSERT INTO public.test_question (test_question_id, test_id, question_type, question_text, correct_option_id, correct_boolean, correct_text, sequence)
VALUES ('a38b6ae1-3d4d-449c-a4a8-19c1e9f5a6fc', '11437c15-b9fd-44cd-bcb9-e0ef212a505d', 'MC', 'Simbol manakah yang digunakan di TypeScript untuk menulis komentar satu baris agar tidak dieksekusi oleh program?', '777cabb1-4e68-4fd5-9ad9-f8e55a639fd8', NULL, NULL, 1)
ON CONFLICT (test_id, sequence) DO NOTHING;
INSERT INTO public.test_question_option (test_question_option_id, test_question_id, option_text, sequence)
VALUES ('777cabb1-4e68-4fd5-9ad9-f8e55a639fd8', 'a38b6ae1-3d4d-449c-a4a8-19c1e9f5a6fc', '`//`', 1)
ON CONFLICT (test_question_id, sequence) DO NOTHING;
INSERT INTO public.test_question_option (test_question_option_id, test_question_id, option_text, sequence)
VALUES ('ae090dfb-fffa-44d5-a0a3-f2ff99a68cf5', 'a38b6ae1-3d4d-449c-a4a8-19c1e9f5a6fc', '`##`', 2)
ON CONFLICT (test_question_id, sequence) DO NOTHING;
INSERT INTO public.test_question_option (test_question_option_id, test_question_id, option_text, sequence)
VALUES ('274af650-2b62-4447-b8c7-9190cbfdd823', 'a38b6ae1-3d4d-449c-a4a8-19c1e9f5a6fc', '`--`', 3)
ON CONFLICT (test_question_id, sequence) DO NOTHING;
INSERT INTO public.test_question_option (test_question_option_id, test_question_id, option_text, sequence)
VALUES ('c8bfcf05-e586-4c4b-947e-8bcfcbc176a8', 'a38b6ae1-3d4d-449c-a4a8-19c1e9f5a6fc', '`::`', 4)
ON CONFLICT (test_question_id, sequence) DO NOTHING;

INSERT INTO public.test_question (test_question_id, test_id, question_type, question_text, correct_option_id, correct_boolean, correct_text, sequence)
VALUES ('108c0460-725a-4532-884d-f42d118703ab', '11437c15-b9fd-44cd-bcb9-e0ef212a505d', 'TF', 'Perhatikan potongan kode TypeScript berikut:

```ts
{
  const pesan: string = "Siap";
  console.log(pesan);
}
```

Pernyataan: Struktur penulisan pernyataan dan blok kode TypeScript di atas sudah benar.', NULL, TRUE, NULL, 2)
ON CONFLICT (test_id, sequence) DO NOTHING;

INSERT INTO public.test_question (test_question_id, test_id, question_type, question_text, correct_option_id, correct_boolean, correct_text, sequence)
VALUES ('997dcbf8-6b3b-4254-8ed0-b51d16e51dbd', '11437c15-b9fd-44cd-bcb9-e0ef212a505d', 'MC', 'Manakah deklarasi variabel yang nilainya masih dapat diubah ulang dan menggunakan *type annotation* `string` dengan benar?', '1cf11030-3edf-400e-b4ef-f6d13c3f28b9', NULL, NULL, 3)
ON CONFLICT (test_id, sequence) DO NOTHING;
INSERT INTO public.test_question_option (test_question_option_id, test_question_id, option_text, sequence)
VALUES ('1cf11030-3edf-400e-b4ef-f6d13c3f28b9', '997dcbf8-6b3b-4254-8ed0-b51d16e51dbd', '`let kota: string = "Singaraja";`', 1)
ON CONFLICT (test_question_id, sequence) DO NOTHING;
INSERT INTO public.test_question_option (test_question_option_id, test_question_id, option_text, sequence)
VALUES ('ab928310-0195-4eed-8264-16537da45e36', '997dcbf8-6b3b-4254-8ed0-b51d16e51dbd', '`const kota: string = "Singaraja";`', 2)
ON CONFLICT (test_question_id, sequence) DO NOTHING;
INSERT INTO public.test_question_option (test_question_option_id, test_question_id, option_text, sequence)
VALUES ('80b91432-e37d-4a56-a5c1-8bdde25a1495', '997dcbf8-6b3b-4254-8ed0-b51d16e51dbd', '`let string: kota = "Singaraja";`', 3)
ON CONFLICT (test_question_id, sequence) DO NOTHING;
INSERT INTO public.test_question_option (test_question_option_id, test_question_id, option_text, sequence)
VALUES ('7ebb6043-b6c1-46b9-b40b-4735b04dd4ff', '997dcbf8-6b3b-4254-8ed0-b51d16e51dbd', '`let kota = string: "Singaraja";`', 4)
ON CONFLICT (test_question_id, sequence) DO NOTHING;

INSERT INTO public.test_question (test_question_id, test_id, question_type, question_text, correct_option_id, correct_boolean, correct_text, sequence)
VALUES ('103325d5-a087-4831-8c31-4fe83d48cb02', '11437c15-b9fd-44cd-bcb9-e0ef212a505d', 'TF', 'Perhatikan deklarasi variabel berikut:

```ts
let const nama: string = "Budi";
```

Pernyataan: Penggabungan kata kunci `let` dan `const` pada deklarasi variabel di atas valid dalam TypeScript.', NULL, FALSE, NULL, 4)
ON CONFLICT (test_id, sequence) DO NOTHING;

INSERT INTO public.test_question (test_question_id, test_id, question_type, question_text, correct_option_id, correct_boolean, correct_text, sequence)
VALUES ('469a1e86-56c0-4fb8-b2a1-c6f2021e7b2a', '11437c15-b9fd-44cd-bcb9-e0ef212a505d', 'FIB', 'Lengkapi kata kunci deklarasi variabel berikut agar nilainya dapat diubah di kemudian hari:

```ts
_____ statusAktif: boolean = true;
```', NULL, NULL, 'let', 5)
ON CONFLICT (test_id, sequence) DO NOTHING;

INSERT INTO public.test_question (test_question_id, test_id, question_type, question_text, correct_option_id, correct_boolean, correct_text, sequence)
VALUES ('0caee9ce-7f41-47b4-9419-09e88c957a33', '11437c15-b9fd-44cd-bcb9-e0ef212a505d', 'MC', 'Dalam TypeScript, nilai desimal seperti `3.14` termasuk ke dalam tipe data dasar...', 'ef7c0a19-2dae-4987-843f-c6882e5dcc67', NULL, NULL, 6)
ON CONFLICT (test_id, sequence) DO NOTHING;
INSERT INTO public.test_question_option (test_question_option_id, test_question_id, option_text, sequence)
VALUES ('d402a560-ed32-4e31-81da-d73178111fa8', '0caee9ce-7f41-47b4-9419-09e88c957a33', '`string`', 1)
ON CONFLICT (test_question_id, sequence) DO NOTHING;
INSERT INTO public.test_question_option (test_question_option_id, test_question_id, option_text, sequence)
VALUES ('5226eac9-bdbd-4a40-a933-57418670a742', '0caee9ce-7f41-47b4-9419-09e88c957a33', '`boolean`', 2)
ON CONFLICT (test_question_id, sequence) DO NOTHING;
INSERT INTO public.test_question_option (test_question_option_id, test_question_id, option_text, sequence)
VALUES ('ef7c0a19-2dae-4987-843f-c6882e5dcc67', '0caee9ce-7f41-47b4-9419-09e88c957a33', '`number`', 3)
ON CONFLICT (test_question_id, sequence) DO NOTHING;
INSERT INTO public.test_question_option (test_question_option_id, test_question_id, option_text, sequence)
VALUES ('e3541fa1-c795-412a-be6a-3915e155864f', '0caee9ce-7f41-47b4-9419-09e88c957a33', '`float`', 4)
ON CONFLICT (test_question_id, sequence) DO NOTHING;

INSERT INTO public.test_question (test_question_id, test_id, question_type, question_text, correct_option_id, correct_boolean, correct_text, sequence)
VALUES ('d518509a-b00f-45e3-996a-7d0bfd690f9e', '11437c15-b9fd-44cd-bcb9-e0ef212a505d', 'TF', 'Perhatikan deklarasi variabel berikut:

```ts
let sudahLulus: boolean = "true";
```

Pernyataan: Nilai `"true"` sudah sesuai dengan tipe data `boolean` pada deklarasi di atas.', NULL, FALSE, NULL, 7)
ON CONFLICT (test_id, sequence) DO NOTHING;

INSERT INTO public.test_question (test_question_id, test_id, question_type, question_text, correct_option_id, correct_boolean, correct_text, sequence)
VALUES ('9cea00f9-21e4-41f1-a7fb-84f3fecb397c', '11437c15-b9fd-44cd-bcb9-e0ef212a505d', 'FIB', 'Lengkapi *type annotation* yang sesuai pada deklarasi variabel berikut:

```ts
let hargaTiket: _____ = 25000;
```', NULL, NULL, 'number', 8)
ON CONFLICT (test_id, sequence) DO NOTHING;

INSERT INTO public.test_question (test_question_id, test_id, question_type, question_text, correct_option_id, correct_boolean, correct_text, sequence)
VALUES ('0fdbdfd9-404a-4cba-9819-51352d8a81d5', '11437c15-b9fd-44cd-bcb9-e0ef212a505d', 'MC', 'Ekspresi TypeScript manakah yang menggunakan operator aritmetika untuk menghitung hasil pembagian `15` dibagi `3`?', '21a4d79e-89dc-474f-a2c3-d444ff1d422b', NULL, NULL, 9)
ON CONFLICT (test_id, sequence) DO NOTHING;
INSERT INTO public.test_question_option (test_question_option_id, test_question_id, option_text, sequence)
VALUES ('a460b03e-4e1b-49a7-b68e-21d96fcd59de', '0fdbdfd9-404a-4cba-9819-51352d8a81d5', '`let hasil: number = 15 % 3;`', 1)
ON CONFLICT (test_question_id, sequence) DO NOTHING;
INSERT INTO public.test_question_option (test_question_option_id, test_question_id, option_text, sequence)
VALUES ('21a4d79e-89dc-474f-a2c3-d444ff1d422b', '0fdbdfd9-404a-4cba-9819-51352d8a81d5', '`let hasil: number = 15 / 3;`', 2)
ON CONFLICT (test_question_id, sequence) DO NOTHING;
INSERT INTO public.test_question_option (test_question_option_id, test_question_id, option_text, sequence)
VALUES ('6f822bfb-79ed-4f46-8686-579ec671178b', '0fdbdfd9-404a-4cba-9819-51352d8a81d5', '`let hasil: number = 15 * 3;`', 3)
ON CONFLICT (test_question_id, sequence) DO NOTHING;
INSERT INTO public.test_question_option (test_question_option_id, test_question_id, option_text, sequence)
VALUES ('adcca89b-16b5-42c7-9ad8-c15add0569d0', '0fdbdfd9-404a-4cba-9819-51352d8a81d5', '`let hasil: number = 15 - 3;`', 4)
ON CONFLICT (test_question_id, sequence) DO NOTHING;

INSERT INTO public.test_question (test_question_id, test_id, question_type, question_text, correct_option_id, correct_boolean, correct_text, sequence)
VALUES ('afaf0fe3-f77a-42c4-9255-9bed21559f2e', '11437c15-b9fd-44cd-bcb9-e0ef212a505d', 'TF', 'Perhatikan ekspresi berikut:

```ts
let hasil: number = 10 * "2";
```

Pernyataan: Penggunaan operator `*` antara angka `10` dan teks `"2"` pada ekspresi TypeScript di atas valid tanpa error tipe.', NULL, FALSE, NULL, 10)
ON CONFLICT (test_id, sequence) DO NOTHING;

INSERT INTO public.test_question (test_question_id, test_id, question_type, question_text, correct_option_id, correct_boolean, correct_text, sequence)
VALUES ('0bae2ce9-ce80-49f7-b063-705215cb83b8', '11437c15-b9fd-44cd-bcb9-e0ef212a505d', 'FIB', 'Lengkapi operator aritmetika yang tepat agar nilai variabel `sisa` menjadi `2`:

```ts
let sisa: number = 14 _____ 4;
```', NULL, NULL, '%', 11)
ON CONFLICT (test_id, sequence) DO NOTHING;

INSERT INTO public.test_question (test_question_id, test_id, question_type, question_text, correct_option_id, correct_boolean, correct_text, sequence)
VALUES ('4d556455-e1f3-4b67-9ef4-3a9f0b9ff58f', '11437c15-b9fd-44cd-bcb9-e0ef212a505d', 'MC', 'Kata kunci apakah yang digunakan untuk mengawali pengujian kondisi pertama pada struktur percabangan di TypeScript?', '6dea8908-3c12-4fbb-8017-b6b12482d6ff', NULL, NULL, 12)
ON CONFLICT (test_id, sequence) DO NOTHING;
INSERT INTO public.test_question_option (test_question_option_id, test_question_id, option_text, sequence)
VALUES ('a34ccd1a-5c58-4df2-b00d-f4a950401e6d', '4d556455-e1f3-4b67-9ef4-3a9f0b9ff58f', '`else`', 1)
ON CONFLICT (test_question_id, sequence) DO NOTHING;
INSERT INTO public.test_question_option (test_question_option_id, test_question_id, option_text, sequence)
VALUES ('df481ff1-62cc-49a1-a983-7fd81eee0aea', '4d556455-e1f3-4b67-9ef4-3a9f0b9ff58f', '`else if`', 2)
ON CONFLICT (test_question_id, sequence) DO NOTHING;
INSERT INTO public.test_question_option (test_question_option_id, test_question_id, option_text, sequence)
VALUES ('6dea8908-3c12-4fbb-8017-b6b12482d6ff', '4d556455-e1f3-4b67-9ef4-3a9f0b9ff58f', '`if`', 3)
ON CONFLICT (test_question_id, sequence) DO NOTHING;
INSERT INTO public.test_question_option (test_question_option_id, test_question_id, option_text, sequence)
VALUES ('e807373a-607b-4097-a9d5-728fe0aab6f2', '4d556455-e1f3-4b67-9ef4-3a9f0b9ff58f', '`for`', 4)
ON CONFLICT (test_question_id, sequence) DO NOTHING;

INSERT INTO public.test_question (test_question_id, test_id, question_type, question_text, correct_option_id, correct_boolean, correct_text, sequence)
VALUES ('927a339d-4a69-4a27-8b4a-5976cc8f5c3a', '11437c15-b9fd-44cd-bcb9-e0ef212a505d', 'TF', 'Perhatikan potongan kode percabangan berikut:

```ts
let umur: number = 19;
if (umur >= 17) {
  console.log("Boleh");
}
```

Pernyataan: Penulisan kondisi dan blok kode pada struktur percabangan di atas sudah benar.', NULL, TRUE, NULL, 13)
ON CONFLICT (test_id, sequence) DO NOTHING;

INSERT INTO public.test_question (test_question_id, test_id, question_type, question_text, correct_option_id, correct_boolean, correct_text, sequence)
VALUES ('0b52fcf8-6f15-4177-9a1b-b50256580420', '11437c15-b9fd-44cd-bcb9-e0ef212a505d', 'FIB', 'Lengkapi kata kunci untuk blok cadangan ketika kondisi `if` bernilai `false`:

```ts
let suhu: number = 27;
if (suhu > 30) {
  console.log("Panas");
} _____ {
  console.log("Normal");
}
```', NULL, NULL, 'else', 14)
ON CONFLICT (test_id, sequence) DO NOTHING;

INSERT INTO public.test_question (test_question_id, test_id, question_type, question_text, correct_option_id, correct_boolean, correct_text, sequence)
VALUES ('4f638942-ca25-4cab-9e69-bd12ed0923d8', '11437c15-b9fd-44cd-bcb9-e0ef212a505d', 'MC', 'Struktur perulangan manakah yang hanya menuliskan satu syarat kondisi di dalam tanda kurung `(...)`, sedangkan variabel penghitungnya diinisialisasi di luar blok perulangan?', '4853667b-5af0-4c19-85ee-70f06a7eb704', NULL, NULL, 15)
ON CONFLICT (test_id, sequence) DO NOTHING;
INSERT INTO public.test_question_option (test_question_option_id, test_question_id, option_text, sequence)
VALUES ('6ba159ce-ff6a-4023-bbed-75898b3bfcbd', '4f638942-ca25-4cab-9e69-bd12ed0923d8', '`for`', 1)
ON CONFLICT (test_question_id, sequence) DO NOTHING;
INSERT INTO public.test_question_option (test_question_option_id, test_question_id, option_text, sequence)
VALUES ('4853667b-5af0-4c19-85ee-70f06a7eb704', '4f638942-ca25-4cab-9e69-bd12ed0923d8', '`while`', 2)
ON CONFLICT (test_question_id, sequence) DO NOTHING;
INSERT INTO public.test_question_option (test_question_option_id, test_question_id, option_text, sequence)
VALUES ('f3b7270b-462d-43ca-8ab2-efda0e2d6d74', '4f638942-ca25-4cab-9e69-bd12ed0923d8', '`if`', 3)
ON CONFLICT (test_question_id, sequence) DO NOTHING;
INSERT INTO public.test_question_option (test_question_option_id, test_question_id, option_text, sequence)
VALUES ('7e7ba2bb-7705-4a0c-8ba7-b81b8dce3e62', '4f638942-ca25-4cab-9e69-bd12ed0923d8', '`else`', 4)
ON CONFLICT (test_question_id, sequence) DO NOTHING;

INSERT INTO public.test_question (test_question_id, test_id, question_type, question_text, correct_option_id, correct_boolean, correct_text, sequence)
VALUES ('7055243e-63ef-498c-9756-eda3456ecc5e', '11437c15-b9fd-44cd-bcb9-e0ef212a505d', 'TF', 'Perhatikan perulangan berikut:

```ts
for (let k: number = 0, k < 3, k++) {
  console.log(k);
}
```

Pernyataan: Penulisan pemisah antarbagian pada perulangan `for` di atas sudah sesuai aturan sintaksis TypeScript.', NULL, FALSE, NULL, 16)
ON CONFLICT (test_id, sequence) DO NOTHING;

INSERT INTO public.test_question (test_question_id, test_id, question_type, question_text, correct_option_id, correct_boolean, correct_text, sequence)
VALUES ('3c2a6299-e9f1-4581-b579-b4f7373ad2a6', '11437c15-b9fd-44cd-bcb9-e0ef212a505d', 'FIB', 'Lengkapi kata kunci perulangan pada potongan kode berikut:

```ts
_____ (let n: number = 0; n < 4; n++) {
  console.log(n);
}
```', NULL, NULL, 'for', 17)
ON CONFLICT (test_id, sequence) DO NOTHING;

INSERT INTO public.test_question (test_question_id, test_id, question_type, question_text, correct_option_id, correct_boolean, correct_text, sequence)
VALUES ('db767c9d-39bf-4cfa-9602-4aff27abb6e7', '11437c15-b9fd-44cd-bcb9-e0ef212a505d', 'MC', 'Pada deklarasi `function cetakInfo(teks: string): void { console.log(teks); }`, tipe kembalian `void` berarti fungsi tersebut...', 'fe8d4b3d-e926-4617-89bf-a2e3b9ed0c9f', NULL, NULL, 18)
ON CONFLICT (test_id, sequence) DO NOTHING;
INSERT INTO public.test_question_option (test_question_option_id, test_question_id, option_text, sequence)
VALUES ('fe8d4b3d-e926-4617-89bf-a2e3b9ed0c9f', 'db767c9d-39bf-4cfa-9602-4aff27abb6e7', 'tidak mengembalikan nilai', 1)
ON CONFLICT (test_question_id, sequence) DO NOTHING;
INSERT INTO public.test_question_option (test_question_option_id, test_question_id, option_text, sequence)
VALUES ('73d21b04-1cf2-45c6-aace-4c34f9ad2f13', 'db767c9d-39bf-4cfa-9602-4aff27abb6e7', 'wajib mengembalikan angka `0`', 2)
ON CONFLICT (test_question_id, sequence) DO NOTHING;
INSERT INTO public.test_question_option (test_question_option_id, test_question_id, option_text, sequence)
VALUES ('ba246a4e-d0cb-4008-9449-8753e9883565', 'db767c9d-39bf-4cfa-9602-4aff27abb6e7', 'tidak boleh memiliki parameter', 3)
ON CONFLICT (test_question_id, sequence) DO NOTHING;
INSERT INTO public.test_question_option (test_question_option_id, test_question_id, option_text, sequence)
VALUES ('677f038e-b68b-49d7-b1fe-15aa8d818ad0', 'db767c9d-39bf-4cfa-9602-4aff27abb6e7', 'hanya dapat dipanggil satu kali', 4)
ON CONFLICT (test_question_id, sequence) DO NOTHING;

INSERT INTO public.test_question (test_question_id, test_id, question_type, question_text, correct_option_id, correct_boolean, correct_text, sequence)
VALUES ('2c14d61b-87b1-4a84-b0cc-2114a09b583f', '11437c15-b9fd-44cd-bcb9-e0ef212a505d', 'TF', 'Perhatikan deklarasi fungsi berikut:

```ts
function luasPersegi(sisi: number): number {
  return sisi * sisi;
}
```

Pernyataan: Deklarasi parameter, tipe nilai kembalian, dan pernyataan `return` pada fungsi di atas sudah benar.', NULL, TRUE, NULL, 19)
ON CONFLICT (test_id, sequence) DO NOTHING;

INSERT INTO public.test_question (test_question_id, test_id, question_type, question_text, correct_option_id, correct_boolean, correct_text, sequence)
VALUES ('1dd761f5-64ab-4090-ad1c-d6076c70b40d', '11437c15-b9fd-44cd-bcb9-e0ef212a505d', 'FIB', 'Lengkapi tipe nilai kembalian yang sesuai pada deklarasi fungsi berikut:

```ts
function gabungKata(a: string, b: string): _____ {
  return a + b;
}
```', NULL, NULL, 'string', 20)
ON CONFLICT (test_id, sequence) DO NOTHING;

COMMIT;
