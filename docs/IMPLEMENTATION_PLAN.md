# 🛠️ diet-yuk — Implementation Plan

> Panduan eksekusi teknis untuk [PLAN.md](../PLAN.md). Dikerjakan bertahap per fase; setiap fase punya **tugas** dan **kriteria selesai (DoD)**.
>
> 👫 Pengguna: **Raka** & **Anggun** · 💍 Nikah: **26 September 2027**

---

## 0. Prasyarat

- macOS + Xcode terbaru (+ iOS platform terinstal), Command Line Tools
- Node.js LTS (≥ 20), `pnpm` atau `npm`, Watchman (`brew install watchman`), CocoaPods (`brew install cocoapods`)
- Apple ID (gratis) sudah login di Xcode → Settings → Accounts
- Project Supabase sudah ada (ambil **Project URL** + **anon key** dari Settings → API)
- Supabase CLI (`brew install supabase/tap/supabase`) untuk migrasi

---

## 1. Struktur Project

```
diet-yuk/
├─ app/                          # Expo Router
│  ├─ _layout.tsx                # providers (Query, Auth, Theme, fonts)
│  ├─ (auth)/
│  │  ├─ sign-in.tsx
│  │  └─ sign-up.tsx
│  ├─ (onboarding)/
│  │  ├─ profile.tsx             # data tubuh & aktivitas
│  │  ├─ target.tsx              # hasil target kalori
│  │  └─ pair.tsx                # buat / masukkan kode pasangan
│  ├─ (tabs)/
│  │  ├─ _layout.tsx             # tab bar custom
│  │  ├─ index.tsx               # Home / Hari Ini
│  │  ├─ progress.tsx            # grafik, berat, streak, badge
│  │  └─ settings.tsx
│  ├─ add-meal/
│  │  ├─ camera.tsx
│  │  ├─ review.tsx              # hasil AI + edit
│  │  └─ search.tsx              # cari manual TKPI
│  └─ meal/[id].tsx              # detail / edit makanan tersimpan
├─ src/
│  ├─ components/                # UI kit: Card, Button, Ring, MacroBar, Mascot, Countdown...
│  ├─ features/
│  │  ├─ ai/                     # client, prompt, schema (zod), mock
│  │  ├─ nutrition/              # tkpi search, matcher, kalkulasi
│  │  ├─ meals/                  # queries & mutations
│  │  ├─ weight/
│  │  ├─ streaks/                # logika streak & achievement
│  │  ├─ couple/
│  │  └─ reminders/              # expo-notifications
│  ├─ lib/
│  │  ├─ supabase.ts
│  │  ├─ secure-store.ts
│  │  ├─ date.ts                 # util tanggal (zona Asia/Jakarta)
│  │  └─ calories.ts             # BMR/TDEE
│  ├─ stores/                    # zustand (settings, draft meal)
│  ├─ theme/                     # tokens: warna, radius, spacing, font
│  └─ types/database.ts          # hasil `supabase gen types`
├─ assets/
│  ├─ data/tkpi.json             # dataset nutrisi
│  ├─ mascot/                    # SVG/Lottie Raka & Anggun
│  └─ fonts/
├─ supabase/
│  └─ migrations/0001_init.sql
├─ scripts/build-tkpi.ts         # konversi sumber TKPI → JSON
├─ docs/INSTALL.md
├─ .env.example
└─ app.json / app.config.ts
```

---

## 2. Dependencies

```bash
npx create-expo-app@latest diet-yuk --template default   # TS + Expo Router
npx expo install expo-dev-client expo-camera expo-image-picker expo-image-manipulator \
  expo-secure-store expo-notifications expo-font expo-haptics expo-linear-gradient \
  react-native-reanimated react-native-gesture-handler react-native-svg \
  lottie-react-native @react-native-async-storage/async-storage react-native-mmkv
npm i @supabase/supabase-js @tanstack/react-query zustand zod date-fns date-fns-tz \
  nativewind tailwindcss fuse.js react-native-gifted-charts react-native-confetti-cannon
npm i -D supabase @types/react
```

Font: `@expo-google-fonts/nunito` (atau Quicksand).

---

## 3. Environment

`.env.example`
```
EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
EXPO_PUBLIC_DEFAULT_WEDDING_DATE=2027-09-26
EXPO_PUBLIC_AI_MOCK=true
```
- `.env` masuk `.gitignore`.
- **AI Base URL & token TIDAK di `.env`** → diinput di Settings, disimpan di `expo-secure-store`.

`src/lib/supabase.ts`
```ts
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

export const supabase = createClient<Database>(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { storage: AsyncStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false } }
);
```
+ listener `AppState` → `supabase.auth.startAutoRefresh()/stopAutoRefresh()`.

Menghubungkan CLI:
```bash
supabase login
supabase link --project-ref <ref>
supabase db push
supabase gen types typescript --linked > src/types/database.ts
```
Di dashboard Supabase → Auth → Providers → Email: **matikan "Confirm email"** (cuma 2 user, biar simpel).

---

## 4. Skema Database — `supabase/migrations/0001_init.sql`

```sql
-- ========== TABLES ==========
create table public.couples (
  id uuid primary key default gen_random_uuid(),
  wedding_date date not null default '2027-09-26',
  invite_code text unique not null default upper(substr(md5(random()::text), 1, 6)),
  created_at timestamptz default now()
);

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  name text not null,
  sex text check (sex in ('male','female')),
  birth_date date,
  height_cm numeric,
  start_weight_kg numeric,
  target_weight_kg numeric,
  activity_level text check (activity_level in ('sedentary','light','moderate','active','very_active')),
  goal_rate_kg_per_week numeric default 0.5,
  daily_kcal_target int,
  protein_target_g int, carbs_target_g int, fat_target_g int,
  mascot text check (mascot in ('raka','anggun')),
  couple_id uuid references public.couples on delete set null,
  timezone text default 'Asia/Jakarta',
  created_at timestamptz default now()
);

create type meal_type as enum ('breakfast','lunch','dinner','snack');

create table public.meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles on delete cascade,
  eaten_on date not null,
  eaten_at timestamptz not null default now(),
  meal_type meal_type not null,
  photo_path text,                 -- path di storage bucket meal-photos
  ai_raw jsonb,                    -- respons mentah AI (debug)
  note text,
  created_at timestamptz default now()
);
create index on public.meals (user_id, eaten_on);

create table public.meal_items (
  id uuid primary key default gen_random_uuid(),
  meal_id uuid not null references public.meals on delete cascade,
  name text not null,
  tkpi_code text,
  grams numeric not null,
  kcal numeric not null,
  protein_g numeric default 0,
  carbs_g numeric default 0,
  fat_g numeric default 0,
  source text check (source in ('ai','tkpi','manual')) not null
);

create table public.weight_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles on delete cascade,
  logged_on date not null,
  weight_kg numeric not null,
  unique (user_id, logged_on)
);

create table public.achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles on delete cascade,
  code text not null,
  earned_at timestamptz default now(),
  unique (user_id, code)
);

create table public.cheers (               -- saling kasih semangat
  id uuid primary key default gen_random_uuid(),
  from_user uuid not null references public.profiles on delete cascade,
  to_user uuid not null references public.profiles on delete cascade,
  emoji text not null,
  created_at timestamptz default now()
);

-- ========== VIEW: ringkasan harian ==========
create view public.daily_totals with (security_invoker = true) as
select m.user_id, m.eaten_on,
       sum(i.kcal) kcal, sum(i.protein_g) protein_g,
       sum(i.carbs_g) carbs_g, sum(i.fat_g) fat_g
from public.meals m join public.meal_items i on i.meal_id = m.id
group by m.user_id, m.eaten_on;

-- ========== HELPERS ==========
create or replace function public.my_couple_id() returns uuid
language sql stable security definer set search_path = public as
$$ select couple_id from profiles where id = auth.uid() $$;

create or replace function public.is_me_or_partner(uid uuid) returns boolean
language sql stable security definer set search_path = public as
$$ select uid = auth.uid()
      or exists (select 1 from profiles p
                 where p.id = uid and p.couple_id is not null
                   and p.couple_id = (select couple_id from profiles where id = auth.uid())) $$;

create or replace function public.create_couple() returns couples
language plpgsql security definer set search_path = public as $$
declare c couples;
begin
  insert into couples default values returning * into c;
  update profiles set couple_id = c.id where id = auth.uid();
  return c;
end $$;

create or replace function public.join_couple(code text) returns couples
language plpgsql security definer set search_path = public as $$
declare c couples;
begin
  select * into c from couples where invite_code = upper(code);
  if c.id is null then raise exception 'Kode tidak ditemukan'; end if;
  if (select count(*) from profiles where couple_id = c.id) >= 2 then
    raise exception 'Pasangan sudah lengkap'; end if;
  update profiles set couple_id = c.id where id = auth.uid();
  return c;
end $$;

-- ========== RLS ==========
alter table public.couples      enable row level security;
alter table public.profiles     enable row level security;
alter table public.meals        enable row level security;
alter table public.meal_items   enable row level security;
alter table public.weight_logs  enable row level security;
alter table public.achievements enable row level security;
alter table public.cheers       enable row level security;

create policy couples_read   on couples  for select using (id = my_couple_id());
create policy couples_update on couples  for update using (id = my_couple_id());

create policy profiles_read   on profiles for select using (is_me_or_partner(id));
create policy profiles_insert on profiles for insert with check (id = auth.uid());
create policy profiles_update on profiles for update using (id = auth.uid());

create policy meals_read  on meals for select using (is_me_or_partner(user_id));
create policy meals_write on meals for all    using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy items_read  on meal_items for select
  using (exists (select 1 from meals m where m.id = meal_id and is_me_or_partner(m.user_id)));
create policy items_write on meal_items for all
  using (exists (select 1 from meals m where m.id = meal_id and m.user_id = auth.uid()))
  with check (exists (select 1 from meals m where m.id = meal_id and m.user_id = auth.uid()));

create policy weight_read  on weight_logs for select using (is_me_or_partner(user_id));
create policy weight_write on weight_logs for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy ach_read  on achievements for select using (is_me_or_partner(user_id));
create policy ach_write on achievements for insert with check (user_id = auth.uid());

create policy cheers_read  on cheers for select using (from_user = auth.uid() or to_user = auth.uid());
create policy cheers_write on cheers for insert with check (from_user = auth.uid() and is_me_or_partner(to_user));

-- ========== STORAGE ==========
insert into storage.buckets (id, name, public) values ('meal-photos','meal-photos', false)
  on conflict do nothing;
-- path: {user_id}/{meal_id}.jpg
create policy photos_read on storage.objects for select
  using (bucket_id = 'meal-photos' and is_me_or_partner(((storage.foldername(name))[1])::uuid));
create policy photos_write on storage.objects for insert
  with check (bucket_id = 'meal-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy photos_delete on storage.objects for delete
  using (bucket_id = 'meal-photos' and (storage.foldername(name))[1] = auth.uid()::text);

-- ========== REALTIME (progres pasangan live) ==========
alter publication supabase_realtime add table public.meals, public.meal_items, public.cheers;
```

Foto ditampilkan via `createSignedUrl` (expire 1 jam), di-cache dengan `expo-image`.

---

## 5. Kalkulasi Target Kalori — `src/lib/calories.ts`

- **BMR (Mifflin-St Jeor)**
  - Pria: `10·kg + 6.25·cm − 5·umur + 5`
  - Wanita: `10·kg + 6.25·cm − 5·umur − 161`
- **TDEE** = BMR × faktor: sedentary 1.2 · light 1.375 · moderate 1.55 · active 1.725 · very_active 1.9
- **Defisit** = `goal_rate_kg_per_week × 7700 / 7` (0.25 / 0.5 / 0.75 kg/minggu)
- **Target** = `max(TDEE − defisit, batas_min)` → batas_min: pria 1500, wanita 1200
- **Makro default**: protein 1.6 g/kg berat target · lemak 25% kalori · sisanya karbo
- Unit test untuk fungsi ini (jest) — contoh: wanita 25th, 160cm, 60kg, light, 0.5kg → ±1.392 kkal.

---

## 6. Dataset Nutrisi TKPI

1. Sumber: **TKPI 2017/2019 Kemenkes** (tersedia di panganku.org / PDF Kemenkes; ada juga versi CSV di repo GitHub/Kaggle komunitas — cek lisensi).
2. `scripts/build-tkpi.ts` mengubah sumber → `assets/data/tkpi.json`:
   ```ts
   type TkpiItem = { code: string; name: string; aliases: string[];
     kcal: number; protein: number; fat: number; carbs: number;   // per 100 g BDD
     defaultPortionG?: number; category: string };
   ```
3. Tambah manual ±50–100 **makanan jadi populer** yang kurang di TKPI (nasi padang rendang, ayam geprek, seblak, martabak, boba, kopi susu gula aren, mie ayam, dll) di `assets/data/extra-foods.json` dengan `defaultPortionG` (porsi umum).
4. Pencarian: `fuse.js` dengan keys `name` + `aliases`, threshold ~0.35.
5. **Matcher AI → TKPI** (`features/nutrition/matcher.ts`):
   - Cari pakai `tkpi_match` dari AI lalu `name`; jika skor Fuse < 0.3 → pakai nilai TKPI × gram/100, `source='tkpi'`.
   - Jika tidak ada match → pakai angka AI, `source='ai'`.

---

## 7. Integrasi AI — `src/features/ai/`

### Konfigurasi (Settings → "Server AI")
- `aiBaseUrl`, `aiToken`, `aiModel` (default `gpt-4o`), tombol **"Tes koneksi"**.
- Toggle **Mode Mock** (default ON sampai server siap).

### Request (OpenAI-compatible)
```ts
POST {aiBaseUrl}/v1/chat/completions
Authorization: Bearer {aiToken}
{
  "model": aiModel,
  "response_format": { "type": "json_object" },
  "temperature": 0.2,
  "messages": [
    { "role": "system", "content": SYSTEM_PROMPT },
    { "role": "user", "content": [
        { "type": "text", "text": "Analisis makanan di foto ini." },
        { "type": "image_url", "image_url": { "url": "data:image/jpeg;base64,..." } }
    ]}
  ]
}
```
Gambar dikompres dulu: resize lebar 1024px, JPEG quality 0.7 (`expo-image-manipulator`).

### System prompt (`prompt.ts`)
```
Kamu ahli gizi Indonesia. Identifikasi setiap makanan/minuman di foto.
Untuk tiap item, perkirakan berat porsi dalam gram berdasarkan ukuran piring/alat makan,
lalu hitung kalori & makro. Utamakan nama makanan Indonesia yang umum
dan sertakan padanan nama di Tabel Komposisi Pangan Indonesia (TKPI) bila ada.
Jika bukan makanan, kembalikan items kosong.
Balas HANYA JSON:
{"items":[{"name":string,"tkpi_match":string|null,"portion_g":number,
"calories":number,"protein_g":number,"carbs_g":number,"fat_g":number,
"confidence":number}],"notes":string}
```

### Validasi & error
- Parse dengan **zod**; kalau gagal parse → retry 1x, lalu tampilkan error + opsi "Isi manual".
- Timeout 60 detik, tampilkan loading lucu (maskot sedang "mencicipi" 🍽️).
- `mock.ts`: kembalikan contoh "Nasi + Ayam goreng + Sambal" setelah delay 1.5 detik.

### Server AI (sudah di-setup ✅ — 6 Okt 2026)

| Item | Nilai |
|---|---|
| Server | `ssh opencraft` (`opencraft-vps`) |
| Hermes | v0.19.0, profile **`diet-yuk`** (`~/.hermes/profiles/diet-yuk`) |
| Model | `gpt-5.6-sol` via provider `openai-codex` (langganan ChatGPT) |
| Service | `systemctl --user {status,restart} hermes-gateway-diet-yuk` (auto-start saat boot) |
| Endpoint | `http://127.0.0.1:8642/v1` (**masih localhost saja**) |
| Model name di request | `diet-yuk` |
| Token | `API_SERVER_KEY` di `~/.hermes/profiles/diet-yuk/.env` (**jangan commit**) |
| Tools | Semua toolset dimatikan via `agent.disabled_toolsets`; tersisa `vision` saja |
| Persona | `SOUL.md` = ahli gizi Indonesia, output JSON saja |
| Log | `journalctl --user -u hermes-gateway-diet-yuk -f` |

Hasil uji (foto nasi goreng + telur + ayam + kerupuk + sambal): JSON valid sesuai skema, 6 item terdeteksi, **±15 detik**, ±4.6k token.

Ambil token:
```bash
ssh opencraft 'grep ^API_SERVER_KEY ~/.hermes/profiles/diet-yuk/.env'
```

Tes lokal dari Mac (tanpa buka port, via SSH tunnel):
```bash
ssh -N -L 8642:127.0.0.1:8642 opencraft   # terminal 1
curl -H "Authorization: Bearer $KEY" http://localhost:8642/v1/models   # terminal 2
```

Catatan implementasi di app:
- Respons kadang lebih panjang (`notes`) → timeout app set **60 detik**.
- Tetap parse dengan zod + strip ```` ```json ```` fence kalau ada.
- `direct_model_requests` tidak aktif → field `model` di request diabaikan, selalu pakai model profile.

> [!IMPORTANT]
> **Belum bisa diakses dari iPhone.** Endpoint masih `127.0.0.1`. Perlu salah satu: Cloudflare Tunnel (rekomendasi), Caddy + domain + port 443, atau Tailscale.

---

## 8. Design System — `src/theme/`

| Token | Nilai |
|---|---|
| `bg` | `#FFF8F3` (krem) |
| `surface` | `#FFFFFF` |
| `primary` | `#FF8FA3` (blush pink) |
| `secondary` | `#9ED9C5` (mint) |
| `accent` | `#FFC48C` (peach) |
| `text` | `#3D3A4B` · muted `#8E8AA0` |
| macro | protein `#7FB3FF` · karbo `#FFC48C` · lemak `#C9A7FF` |
| radius | 12 / 20 / 28 / full |
| font | Nunito 400/600/800 |

Komponen UI kit: `Card`, `Button` (primary/ghost, haptics), `CalorieRing` (SVG + Reanimated), `MacroBar`, `CountdownCard`, `MealSection`, `FoodItemRow`, `Stepper/PortionSlider`, `Mascot`, `Badge`, `EmptyState`, `Toast`.

### Maskot couple (Raka & Anggun)
- 2 karakter chibi (Raka: jas kecil; Anggun: kerudung/veil kecil — sesuaikan selera).
- State ekspresi: `happy` (< 90% target), `perfect` (90–105%), `full` (> 105%), `sleepy` (belum makan apa-apa), `celebrate` (achievement).
- Format: SVG per state (gampang) → upgrade ke Lottie nanti.
- Di Home: kedua maskot berdiri berdampingan di atas kartu countdown; jarak antar maskot makin dekat seiring hari nikah mendekat 💕.

---

## 9. Layar & Perilaku

### Home (`(tabs)/index.tsx`)
- Header: "Halo, Raka 👋" + tanggal
- **CountdownCard**: `differenceInCalendarDays(wedding_date, today)` → "355 hari lagi 💍" (per 6 Okt 2026), + jam:menit:detik opsional; hari H → animasi spesial "Selamat menikah!".
- `CalorieRing`: dimakan / target, sisa kalori.
- `MacroBar` × 3.
- 4 `MealSection` (Sarapan/Siang/Malam/Camilan) dengan total kkal + tombol "+".
- **Kartu pasangan**: maskot Anggun + "1.120 / 1.400 kkal" + tombol kirim cheer (❤️ 💪 🥗 🔥). Realtime subscribe ke `meals` pasangan.
- FAB 📸 "Foto Makanan".

### Add Meal
- `camera.tsx`: kamera full-screen + tombol galeri; meal_type auto dari jam (05–10 sarapan, 10–15 siang, 15–18 camilan, 18–23 malam) — bisa diganti.
- `review.tsx`: foto di atas, list item hasil AI (nama, gram dengan stepper ±10g, kkal live), badge sumber (TKPI/AI), tombol "Ganti" (buka search), "Tambah item", total, **Simpan**.
- Simpan = insert `meals` → upload foto → insert `meal_items` (satu fungsi, rollback hapus meal jika gagal).
- Offline: jika gagal jaringan, simpan draft di MMKV + antrean sync sederhana (nice-to-have).

### Progress
- Toggle Minggu/Bulan: bar chart kalori vs garis target.
- Grafik berat (line) + garis target + input berat cepat.
- Streak 🔥 besar + grid badge (terkunci abu-abu).

### Settings
- Profil (edit data & target), pasangan (kode undangan / status), tanggal nikah, pengingat, Server AI, logout.

---

## 10. Streak & Pencapaian — `features/streaks/`

- **Hari "tercatat"**: ada ≥ 2 meal hari itu.
- **Hari "on target"**: total kkal antara 80%–105% target.
- **Streak** = jumlah hari berturut-turut "tercatat" sampai kemarin (+ hari ini jika sudah tercatat). Dihitung client-side dari `daily_totals` 60 hari terakhir.
- Achievement dievaluasi setelah simpan meal / log berat; insert `achievements` jika belum ada → confetti + toast.

| Code | Syarat |
|---|---|
| `first_meal` | Mencatat makanan pertama |
| `streak_3` / `streak_7` / `streak_30` | Streak 3 / 7 / 30 hari |
| `on_target_7` | 7 hari on target (tidak harus berturut) |
| `weight_minus_1` / `_3` / `_5` | Turun 1 / 3 / 5 kg dari berat awal |
| `goal_reached` | Mencapai berat target |
| `couple_day` | Raka & Anggun sama-sama on target di hari yang sama |
| `countdown_300` / `_200` / `_100` / `_30` | Masih aktif saat countdown nikah mencapai angka tsb |

---

## 11. Pengingat — `features/reminders/`

- `expo-notifications` **local scheduled** (repeat harian, trigger `{ hour, minute, repeats: true }`).
- Default: Sarapan 07:30, Siang 12:30, Malam 19:00, Timbang Senin 06:30 (weekly trigger).
- Isi pesan lucu bergantian, mis. "Raka, Anggun udah makan siang loh 👀", "H-200 nikah, semangat! 💍".
- Simpan setting di MMKV; reschedule semua saat diubah (`cancelAllScheduledNotificationsAsync` → schedule ulang).
- Minta izin notifikasi di akhir onboarding.

---

## 12. Fase Pengerjaan & DoD

| # | Fase | Tugas utama | DoD |
|---|---|---|---|
| 1 | **Setup** | create-expo-app, TS strict, path alias `@/`, NativeWind, fonts, theme tokens, ESLint/Prettier, dev client | App jalan di simulator iOS dengan font Nunito & warna tema |
| 2 | **Supabase** | `.env`, `lib/supabase.ts`, migrasi `0001_init.sql`, gen types, AuthProvider + route guard | Bisa sign-up/sign-in, session tersimpan setelah restart |
| 3 | **Onboarding & pairing** | form profil, `calories.ts` + test, layar target, create/join couple | Raka buat kode → Anggun join → keduanya ter-pair |
| 4 | **UI kit & Home** | komponen inti, CountdownCard, CalorieRing, MealSection (data dummy → Supabase) | Home menampilkan countdown benar & total kalori dari DB |
| 5 | **TKPI** | `build-tkpi.ts`, `tkpi.json`, `extra-foods.json`, layar search, tambah manual | Bisa cari "nasi goreng" & simpan meal manual |
| 6 | **Foto + AI** | kamera, kompres, AI client + mock, zod, matcher, review screen, upload foto | Mode mock: foto → review → simpan → muncul di Home dengan foto |
| 7 | **Pasangan live** | kartu pasangan, realtime, cheers | Anggun simpan makanan → kartu di HP Raka update tanpa refresh |
| 8 | **Progress** | grafik kalori, log berat + grafik, streak, achievements | Data 7 hari tampil benar; badge `first_meal` muncul |
| 9 | **Pengingat** | izin, schedule, layar setting | Notifikasi muncul di jam yang diset (tes di device) |
| 10 | **Polish** | maskot SVG + state, animasi, haptics, empty states, app icon & splash | Review visual oke di iPhone asli |
| 11 | **Build device** | `docs/INSTALL.md`, signing gratis, install ke 2 iPhone | App terpasang & jalan di iPhone Raka dan Anggun |
| 12 | **AI real** | isi URL+token server, matikan mock, tuning prompt | 10 foto makanan uji → hasil masuk akal (selisih ±20%) |

---

## 13. Build & Install (Apple ID Gratis) — isi `docs/INSTALL.md`

1. `app.json`: `ios.bundleIdentifier = "com.raka.dietyuk"` (harus unik), izin:
   - `NSCameraUsageDescription`: "Buat foto makanan kamu 📸"
   - `NSPhotoLibraryUsageDescription`: "Buat pilih foto makanan dari galeri"
2. `npx expo prebuild -p ios` → buka `ios/dietyuk.xcworkspace` di Xcode.
3. Target → Signing & Capabilities → Team = Apple ID (Personal Team); **hapus capability Push Notifications** jika muncul (tidak didukung Personal Team).
4. Build Configuration **Release** (Product → Scheme → Edit Scheme → Run → Release) supaya JS dibundel & tidak butuh Metro.
5. Colok iPhone → aktifkan **Developer Mode** (Settings → Privacy & Security) → pilih device → ▶️ Run.
6. Di iPhone: Settings → General → VPN & Device Management → Trust developer.
7. Ulangi langkah 5–6 untuk iPhone Anggun.
8. ⏰ **Setiap 7 hari**: colok & Run lagi (data aman di Supabase). Pasang pengingat kalender "Refresh diet-yuk".
   - Alternatif CLI: `npx expo run:ios --device --configuration Release`.

---

## 14. Testing

- **Unit (jest)**: `calories.ts`, matcher TKPI, logika streak/achievement, parser respons AI (zod) dengan contoh JSON valid/invalid.
- **Manual checklist** per fase (DoD di atas).
- **RLS check**: login sebagai user ketiga (dummy) → pastikan tidak bisa membaca data Raka/Anggun.

---

## 15. Backlog (setelah MVP)

- Scan barcode (Open Food Facts)
- Target air minum
- Widget iOS (countdown + sisa kalori)
- Export data CSV
- Resep/menu favorit berdua
- Mode "cheat day" 🍰
