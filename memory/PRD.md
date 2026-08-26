# ASM Nöbet Çizelgesi — Product Requirements

## Overview
A production-ready Turkish-language mobile app (Expo React Native, iOS + Android) for managing
the monthly physician on-duty schedule of a Turkish Family Health Center (Aile Sağlığı Merkezi).
Backed by FastAPI + MongoDB for cross-device sync.

## Users
- ASM Sorumlu Hekim / Sekreter — sets the weekly template, applies to month, adjusts individual
  days, marks administrative closures, reviews the monthly distribution.

## Features (MVP shipped)
- PIN gate (first-run setup, subsequent verify) via FastAPI + bcrypt hash in Mongo.
- 4-tab navigation: Takvim, Hekimler, Şablon, Özet.
- Monthly Calendar (2026 & 2027) with:
  - Turkish week (Pzt–Paz).
  - Automatic Turkish National + Religious holidays highlighted in red.
  - Tap a day to open a bottom-sheet: toggle İdari İzin, multi-select physicians.
  - Sticky "Şablonu Ay Geneline Uygula" CTA above the tab bar.
  - Coverage warning if fewer than 2 physicians assigned on a non-holiday.
- Physician CRUD with color tags (10-color palette, no purple/blue heavy).
- Weekly Template editor (Pzt–Paz) with chip toggles per day.
- Monthly Summary with per-physician working-day count + distribution bars.
- Developer credit "Yazılım ve Geliştirme: Dr. Furkan Aksoy" on Login/Setup, Calendar, and Özet.

## Non-goals for MVP
- PDF/A4 print output (deferred per user choice).
- Multi-user roles / server-side auth beyond PIN.
- Push notifications.

## Stack
- Frontend: Expo Router (54), React Native 0.81, expo-linear-gradient, @expo/vector-icons.
- Backend: FastAPI + Motor (async MongoDB) + bcrypt.
- Storage: MongoDB collections `physicians`, `assignments`, `holidays`, `settings`.

## Data Model
- `physicians` { id, name, code, color, created_at }
- `settings`   { key: "pin", value: bcryptHash } and { key: "template", value: { "1":[ids] ... "7":[ids] } }
- `assignments` { date: "YYYY-MM-DD", physician_ids: [id] }
- `holidays`    { date: "YYYY-MM-DD", is_holiday: bool, label: string }

## Business Rules
- Marking a day as İdari İzin clears any assignment for that date.
- Applying template skips both official holidays (built-in list) and İdari İzin overrides.
- Deleting a physician cascades: removes from template and from all assignments.

## Attribution
Yazılım ve Geliştirme: Dr. Furkan Aksoy
