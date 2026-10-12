# Pinjari Insights

**Revenue intelligence dashboard** designed and built by **Aasif Pinjari**.

Pinjari Insights is a responsive analytics interface for exploring revenue, orders, customers, product categories, acquisition sources, and regional performance. The experience is backed by deterministic fictional data generated in the browser. It does not connect to a live business, analytics provider, or backend.

## Product features

- Six period-over-period KPIs: net revenue, orders, active customers, estimated conversion, average order value, and returning-order share.
- Revenue time series with daily, weekly, and monthly aggregation.
- Category revenue, customer activity, traffic source, sales comparison, and regional performance charts.
- Shared date, category, and region filters that update metrics, charts, and transaction records.
- Search by transaction ID or customer, payment-status filtering, sortable columns, and paginated results.
- CSV export of the currently filtered records.
- Overview, Revenue Analytics, Customer Insights, Product Performance, Reports, and Settings views.
- Light and dark themes, responsive navigation, notification and profile menus, reset controls, and rule-based sample insights.

## Technology

- React 19 and TypeScript 6
- Vite 8
- Recharts 3 for responsive data visualization
- Lucide React for interface icons
- Oxlint for linting
- CSS custom properties and responsive CSS for the visual system

No routing, state-management, date, or backend package is required. Dashboard views are client-side state, and all generated records live in `src/data.ts`.

## Project structure

- `src/App.tsx`: application shell, navigation, shared filters, charts, KPI cards, and transaction interactions.
- `src/data.ts`: typed sample transactions and domain data.
- `src/App.css`: dashboard components, themes, and responsive layout.
- `src/index.css`: global reset and typography.
- `index.html`: application metadata and browser title.

## Requirements

- Node.js 20.19+ or 22.12+
- npm

## Local development

```bash
npm ci
npm run dev
```

Open the local URL printed by Vite, usually `http://localhost:5173/`.

## Quality checks

```bash
npm run lint
npm run build
npm run preview
```

`npm run build` runs the TypeScript project build before generating production files in `dist/`. `npm run preview` serves that production build locally.

## Data notes

The sample dataset is fictional, deterministic, and generated locally. It is useful for exploring interactions and visualizations but must not be treated as real business reporting. Net revenue excludes refunded transactions. Conversion uses a transparent demo-session estimate based on order source; customer retention is represented by generated returning-order flags. Authentication, persistence, live data, and saved user preferences require a backend and are not implemented here.

Google Fonts are requested from Google Fonts when online; local fallback stacks are provided. No API keys or environment variables are needed.

## Deploy

### Vercel

1. Push the repository to GitHub and import it from the Vercel dashboard.
2. Select the Vite framework preset.
3. Set the build command to `npm run build` and the output directory to `dist` if Vercel does not detect them automatically.
4. No environment variables are required. Deploy the project.

### Netlify

1. Import the GitHub repository in Netlify.
2. Set the build command to `npm run build`.
3. Set the publish directory to `dist`.
4. No environment variables are required. Deploy the site.

The application does not use URL-based client routes, so a single-page-app fallback rule is not needed.

## Attribution

Pinjari Insights and this dashboard implementation are credited to Aasif Pinjari. Third-party dependencies remain subject to their respective licenses. This attribution identifies the author; it is not a technical mechanism that prevents copying or a substitute for legal advice.
