# Mapbox Setup for Legislature Map

The District Spotlight Map now uses Mapbox GL JS for interactive district visualization.

## Getting Your Mapbox Token

1. Go to [https://account.mapbox.com/](https://account.mapbox.com/)
2. Sign up for a free account (if you don't have one)
3. Navigate to your [Access Tokens page](https://account.mapbox.com/access-tokens/)
4. Copy your default public token (starts with `pk.`)

## Setting Up the Token

1. Open `frontend/.env.local`
2. Replace `your_mapbox_token_here` with your actual Mapbox token:

```env
NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJ1IjoieW91ci11c2VybmFtZSIsImEiOiJjbHh4eHh4eHgifQ.xxxxxxxxxxxxxxxxx
```

3. Restart your development server:

```bash
npm run dev
```

## Free Tier Limits

Mapbox's free tier includes:
- 50,000 map loads per month
- Unlimited map views
- No credit card required

This is more than enough for development and small-scale production use.

## Troubleshooting

**Map doesn't load?**
- Check that your token is correctly set in `.env.local`
- Make sure the token starts with `pk.`
- Restart the dev server after changing environment variables

**"Mapbox token not configured" error?**
- Verify the environment variable is named exactly `NEXT_PUBLIC_MAPBOX_TOKEN`
- Check that `.env.local` is in the `frontend/` directory
- Ensure there are no extra spaces around the token

## Features

The new Legislature Map includes:
- ✅ Interactive district visualization
- ✅ Address-based legislator lookup
- ✅ House and Senate district switching
- ✅ Legislator details with photos and contact info
- ✅ Party-based color coding (Blue=Democrat, Red=Republican)
- ✅ Full-width map with details below

