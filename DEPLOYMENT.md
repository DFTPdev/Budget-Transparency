# Deployment Guide - DFTP Budget Transparency

This guide covers deploying the Budget Transparency site to Netlify with GitHub integration.

## Prerequisites

- GitHub account with your repository
- Netlify Pro account
- Node.js 20+ installed locally (for testing)

## Netlify Deployment Setup

### 1. Connect Repository to Netlify

1. Log in to your [Netlify account](https://app.netlify.com/)
2. Click **"Add new site"** → **"Import an existing project"**
3. Choose **"Deploy with GitHub"**
4. Authorize Netlify to access your GitHub account
5. Select your `Budget-Transparency` repository

### 2. Configure Build Settings

Netlify should auto-detect the Next.js configuration from `netlify.toml`, but verify these settings:

**Build settings:**
- **Base directory:** `frontend`
- **Build command:** `npm run build`
- **Publish directory:** `.next`
- **Node version:** `20` (auto-detected from `.nvmrc`)

**Advanced settings:**
- The `@netlify/plugin-nextjs` plugin will be automatically installed
- This enables Next.js SSR, API routes, and ISR on Netlify

### 3. Environment Variables (Optional)

If you need to set environment variables, go to:
**Site settings** → **Environment variables** → **Add a variable**

Common variables:
```
NEXT_PUBLIC_SERVER_URL=https://your-api-url.com
NEXT_PUBLIC_ASSETS_DIR=https://your-cdn-url.com
```

### 4. Deploy

1. Click **"Deploy site"**
2. Netlify will:
   - Install dependencies (`npm install`)
   - Run the build command (`npm run build`)
   - Deploy your site
   - Provide a URL like `https://your-site-name.netlify.app`

### 5. Custom Domain (Optional)

To use a custom domain:
1. Go to **Site settings** → **Domain management**
2. Click **"Add custom domain"**
3. Follow the DNS configuration instructions
4. Netlify will automatically provision SSL certificates

## Continuous Deployment

Once connected, Netlify will automatically:
- ✅ Deploy every push to your `main` branch
- ✅ Create deploy previews for pull requests
- ✅ Run builds for branch deploys
- ✅ Invalidate CDN cache on new deploys

## Build Configuration Details

The `netlify.toml` file in the `frontend/` directory contains:

- **Build command:** Standard Next.js build
- **Next.js plugin:** Enables SSR and API routes
- **Redirects:** Handles Next.js routing
- **Headers:** Security headers (X-Frame-Options, CSP, etc.)
- **Cache headers:** Optimizes static assets caching

## Testing Before Deployment

Before pushing to GitHub, test locally:

```bash
cd frontend
npm install
npm run build
npm start
```

Visit `http://localhost:8082` to verify everything works.

## Troubleshooting

### Build Fails

**Check Node version:**
- Ensure `.nvmrc` contains `20`
- Verify in Netlify build logs that Node 20 is being used

**Dependency issues:**
- Clear Netlify cache: **Site settings** → **Build & deploy** → **Clear cache and retry deploy**
- Check for missing dependencies in `package.json`

**TypeScript/ESLint errors:**
- The build is configured to ignore these (`ignoreBuildErrors: true` in `next.config.ts`)
- But you should fix them for production

### Site Loads but Features Don't Work

**Check environment variables:**
- Ensure all required `NEXT_PUBLIC_*` variables are set in Netlify

**API routes not working:**
- Verify `@netlify/plugin-nextjs` is installed (check build logs)
- Check that `netlify.toml` includes the plugin configuration

### Slow Build Times

With Netlify Pro, you get:
- Faster build minutes
- Build plugins
- Deploy previews

To optimize further:
- Enable **Build cache** in Site settings
- Use **Incremental Static Regeneration (ISR)** for data-heavy pages

## Deployment Checklist

Before going live:

- [ ] Test build locally (`npm run build && npm start`)
- [ ] Push code to GitHub
- [ ] Connect repository to Netlify
- [ ] Verify build settings in Netlify dashboard
- [ ] Set environment variables (if needed)
- [ ] Deploy and test on Netlify preview URL
- [ ] Check all pages load correctly
- [ ] Test Budget Overview, Budget Decoder, Spotlight Map
- [ ] Verify data files are accessible
- [ ] Configure custom domain (optional)
- [ ] Enable HTTPS (automatic with Netlify)
- [ ] Set up deploy notifications (optional)

## Post-Deployment

### Monitor Builds
- View build logs in Netlify dashboard
- Set up email notifications for failed builds

### Analytics
- Enable Netlify Analytics (included with Pro plan)
- Track page views, bandwidth, and performance

### Performance
- Use Netlify's built-in CDN (automatic)
- Enable asset optimization in Site settings
- Monitor Core Web Vitals

## Support

- **Netlify Docs:** https://docs.netlify.com/integrations/frameworks/next-js/
- **Next.js Deployment:** https://nextjs.org/docs/deployment
- **Netlify Support:** Available with Pro plan

---

**Ready to deploy?** Push your code to GitHub and follow the steps above! 🚀

