# RUTT

A route optimization tool for delivery planning. Calculates the most efficient order for up to 100 stops using Google Maps APIs.

Built for logistics companies, couriers, and anyone who needs to plan multi-stop routes efficiently.

## Features

- **Route Optimization** - Automatically reorders stops for shortest total distance
- **Traffic Awareness** - Adjusts estimates based on real-time or scheduled departure times
- **Bulk Import** - Paste addresses directly or upload from clipboard
- **Export Options** - Download routes as PDF or Excel spreadsheets
- **Manual Reordering** - Drag and drop stops if you need custom order
- **Saved Routes** - Access previous routes from local storage
- **Dark Mode** - Full theme support

## Requirements

### Google Cloud Platform

You need a Google Cloud project with the following APIs enabled:

1. **Maps JavaScript API** - For rendering maps
2. **Directions API** - For route calculations
3. **Places API** - For address autocomplete
4. **Geocoding API** - For converting addresses to coordinates

To get your API key:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Navigate to APIs & Services > Library
4. Enable each API listed above
5. Go to APIs & Services > Credentials
6. Create an API key
7. Restrict the key to the APIs above (recommended)

Note: Google offers $200 free credit monthly which covers most small to medium usage.

### Supabase (Optional)

The app uses Supabase for optional features like email export and traffic incident data. You can run the app without Supabase, these features will simply be unavailable.

If you want to enable them:

1. Create a project at [supabase.com](https://supabase.com)
2. Copy your project URL and anon key
3. Add to `.env` file:

```
VITE_SUPABASE_URL=your_project_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key
```

## Installation

```bash
npm install
npm run dev
```

Open http://localhost:8080 and add your Google Maps API key in Settings.

## Building for Production

```bash
npm run build
```

Output goes to `/dist`. Upload this folder to any static hosting service.

### Deployment Path

If deploying to a subfolder (e.g. `example.com/routes/`), update these files:

**vite.config.ts**
```typescript
base: "/routes/"
```

**src/App.tsx**
```typescript
<BrowserRouter basename="/routes">
```

For Apache servers, add `.htaccess` to your dist folder:

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /routes/
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /routes/index.html [L]
</IfModule>
```

## Project Structure

```
src/
├── components/     # UI components
├── hooks/          # Custom React hooks
├── pages/          # Main views (Index, MapView, Settings)
├── utils/          # Route optimization logic, export functions
├── types/          # TypeScript definitions
└── integrations/   # Supabase client setup
```

## Customization

### Changing Default Settings

Edit `src/types/settings.ts` to modify default values for start/end addresses.

### Styling

The app uses Tailwind CSS with custom design tokens defined in:

- `src/index.css` - CSS variables for colors, shadows, animations
- `tailwind.config.ts` - Extended theme configuration

### Adding Features

Route optimization logic is in `src/utils/routeOptimizer.ts`. The main algorithm uses Google's Directions API with waypoint optimization.

## Tech Stack

- React 18
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui
- Google Maps JavaScript API
- Supabase (optional)

