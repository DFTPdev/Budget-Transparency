# 🗺️ Virginia Legislature Map - Migration Package

**Welcome!** This folder contains everything you need to migrate the Virginia Legislature Map feature from the Vite project to your Next.js DFTP site.

## 📦 What's Inside

This is a **complete, self-contained migration package** with:

✅ **4 React components** - Clean, Next.js-ready UI components  
✅ **3 utility libraries** - Geocoding, GeoJSON processing, map styling  
✅ **TypeScript types** - Full type definitions  
✅ **2 GeoJSON data files** - Virginia House & Senate district boundaries (61 MB)  
✅ **6 documentation files** - Guides, checklists, and technical docs  

**Total: 16 files, ~62 MB, ready to drop into Next.js**

## 🚀 Quick Start (10 minutes)

**New to this?** Start here:

1. **Read**: `QUICK_START.md` - Get up and running in 10 minutes
2. **Follow**: `MIGRATION_CHECKLIST.md` - Step-by-step migration guide
3. **Reference**: `DEPENDENCIES.md` - npm packages to install

**Already familiar?** Jump straight to `QUICK_START.md`

## 📚 Documentation Guide

| File | When to Read | Purpose |
|------|--------------|---------|
| **QUICK_START.md** | 🟢 Start here | 10-minute setup guide |
| **MIGRATION_CHECKLIST.md** | 🟢 During migration | Step-by-step checklist |
| **DEPENDENCIES.md** | 🟡 Before installing | Complete package list |
| **README.md** | 🟡 For detailed setup | Full migration instructions |
| **OVERVIEW.md** | 🔵 For understanding | Technical architecture |
| **FILE_MANIFEST.md** | 🔵 For reference | Complete file listing |

## 🎯 What This Feature Does

The Virginia Legislature Map allows users to:

1. **Find legislators by address** - Enter a Virginia address, get House & Senate reps
2. **Browse districts visually** - Interactive map with party-based coloring
3. **View legislator details** - Photos, contact info, party affiliation, profile links
4. **Switch chambers** - Toggle between House of Delegates and Senate

**Live Demo**: See the original at `http://localhost:5173` in the Vite project

## 🛠️ Technology Stack

- **React 18+** with TypeScript
- **Mapbox GL JS** for interactive maps
- **Material-UI (MUI)** for UI components
- **Turf.js** for geospatial calculations
- **OpenStreetMap Nominatim** for geocoding

## ✨ What's Been Done For You

✅ **All budget/amendment logic removed** - Clean, map-only feature  
✅ **All LIS API calls removed** - No external dependencies  
✅ **Environment variables converted** - Ready for Next.js pattern  
✅ **Imports made relative** - Self-contained, no external paths  
✅ **TypeScript types complete** - Full type safety  
✅ **Documentation comprehensive** - Guides, checklists, troubleshooting  

## ⚠️ What You Need to Do

1. **Install npm packages** (5 packages, ~300 KB gzipped)
2. **Copy files to Next.js** (16 files)
3. **Set environment variable** (`NEXT_PUBLIC_MAPBOX_TOKEN`)
4. **Add 'use client' directives** (4 components)
5. **Import Mapbox CSS** (1 line in layout.tsx)
6. **Create page route** (1 file)

**Total time: ~10 minutes**

## 📋 Pre-Flight Checklist

Before you start, make sure you have:

- [ ] Next.js project set up and running
- [ ] Node.js 18+ installed
- [ ] Mapbox account (free tier is fine)
- [ ] Mapbox API token ([Get one here](https://account.mapbox.com/))
- [ ] 10 minutes of uninterrupted time

## 🎓 Migration Difficulty

**Difficulty**: 🟢 Easy  
**Time Required**: 10-15 minutes  
**Prerequisites**: Basic Next.js knowledge  
**Risk Level**: Low (no database, no backend, no auth)

## 📁 File Structure

```
legislature-map-migration/
├── components/          # 4 React components
│   ├── AddressForm.tsx
│   ├── LegislatorDetails.tsx
│   ├── LegislatorMap.tsx
│   └── LegislatureMapPage.tsx
├── lib/                 # 3 utility libraries
│   ├── geocode.ts
│   ├── geojson.ts
│   └── mapStyle.ts
├── types/               # TypeScript definitions
│   └── index.ts
├── data/                # GeoJSON files (61 MB)
│   ├── va_house_districts.geojson
│   └── va_senate_districts.geojson
└── [6 documentation files]
```

## 🔗 Next Steps

1. **Read** `QUICK_START.md` to get started
2. **Install** dependencies from `DEPENDENCIES.md`
3. **Follow** `MIGRATION_CHECKLIST.md` step-by-step
4. **Test** the feature in your Next.js project
5. **Deploy** to Vercel

## 🆘 Need Help?

### Common Issues

**Map doesn't load?**  
→ Check Mapbox token in `.env.local`

**SSR errors?**  
→ Use dynamic import (see `QUICK_START.md`)

**GeoJSON 404?**  
→ Verify files in `public/data/`

**Type errors?**  
→ Install `@types/react-map-gl`

### Support Resources

- **Troubleshooting**: See `QUICK_START.md` → Troubleshooting section
- **Technical details**: See `OVERVIEW.md`
- **Full guide**: See `README.md`

## ✅ Success Criteria

You'll know it's working when:

- ✅ Map loads and shows Virginia districts
- ✅ Districts are colored (Blue=Democrat, Red=Republican)
- ✅ You can enter an address and find legislators
- ✅ You can click districts on the map
- ✅ You can toggle between House and Senate
- ✅ No console errors

## 🎉 Ready to Start?

**Open `QUICK_START.md` and let's get this map into your Next.js project!**

---

**Package Version**: 1.0.0  
**Created**: 2025-11-18  
**Source**: budget-decoder-dpb Vite project  
**Target**: Next.js DFTP site  
**Status**: ✅ Ready for migration

