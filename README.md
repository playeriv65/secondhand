# Secondhand

A small Astro site for a mobile-friendly personal secondhand catalog for sharing in WeChat groups. Buyers browse the catalog and contact the seller on WeChat. There are no accounts, messages, checkout, or admin dashboard.

## Run locally

Requires Node.js 22.23.4 or newer. Astro builds static HTML; production serves the generated files and does not require Node.js.

```sh
npm ci
npm run dev
```

Open the printed loopback URL. Astro watches source changes. After changing local content or media, restart `npm run dev` so referenced media is prepared again. Use `npm run build` followed by `npm run preview` to inspect the production output.

## Content

Copy `content/site.example.json` to `site.local.json` and edit the copy. The local file and `assets.local/` are ignored by Git. If no local file exists, the build uses the clearly labeled example catalog.

- `pickup`: short public introduction with pickup and campus meeting arrangements.
- `qrImage`: optional public QR image path. Show only the cropped QR code with its quiet zone, without the surrounding profile screenshot. The page starts with the introduction and QR image; it has no top bar or repeated contact links.
- `demo`: keep `true` until all example listings are replaced. Set to `false` for the real catalog.
- `items`: unique slug, name, nonnegative USD price, condition, description, status, date, and images.
- `laterDescription`: introduction to the graduation items page. The home page shows items available now, while `/later.html` shows items with a future availability date, including any already reserved. Items move to the current page when the date arrives.
- `status`: `available`, `reserved`, or `sold`. Set `availableFrom` to `null` for immediate availability, or an ISO date such as `2027-05-20` for later pickup. A future date displays as upcoming; once the date arrives in `timeZone`, the item displays as available. Reserved and sold statuses take priority. Dates are estimates, not automatic reservations. Astro renders the initial partition into HTML. A small bundled script corrects the partition on load and when the local date changes, without fetching a catalog or requiring a rebuild. With JavaScript disabled, the partition reflects the build date.
- `images`: paths such as `/media/chair/front.webp`. Put the corresponding files in `assets.local/chair/front.webp`. Use real photos for live listings; live mode rejects items without photos.
- `labels`, browser title, introduction, locale, currency, and timezone are configuration data. Keep seller-specific information out of application source.

Process uploaded photos to remove EXIF and other metadata before adding them to `assets.local/`. Optimize photos as JPEG/WebP and use reasonably sized images. QR codes must remain readable.

Local files are excluded from the public repository, but **the built catalog, address, QR code and referenced images become public when deployed**. The prepare step validates and copies only referenced images into ignored `public/media/`; never commit that directory. Do not put private photos, drafts, credentials or backups there.

## Checks

```sh
npm run format
npm run format:check
npm run check
npm run build
npm run check:build
```

Validation rejects duplicate IDs, negative prices, invalid calendar dates, unsafe image paths, and live listings without photos. Before publishing, inspect desktop and mobile layouts, the two separate availability pages, prices, complete descriptions, all item photos and QR readability.

## Deployment

Use an existing Nginx host. Copy only `dist/` into a new release directory, such as `/srv/secondhand/releases/<release>/`, then point `/srv/secondhand/current` to that directory. Keep previous releases for rollback. Never upload the repository root or local content source as a web root.

`deploy/nginx.conf` is an HTTP virtual-host template. Replace its server name and root for the target installation, enable the virtual host, run `sudo nginx -t`, and reload only after it passes. Point the subdomain's DNS A record at the server. Request HTTPS with Certbot using its Nginx integration and enable HTTP redirection. Verify the renewal timer and run `certbot renew --dry-run` for the new certificate after issuance.

Before deploying, check existing virtual hosts and do not replace unrelated configurations. Serve `site.json`, HTML, JavaScript and CSS with revalidation to avoid stale prices or status. Item cards are static articles. All descriptions and photos appear directly on each card, with no detail pages, modal dialogs, copy-link buttons or click actions. WeChat preview cards use the catalog's generic title and description; individual rich previews are outside the scope of this static site.

The template listens on IPv4. Check existing IPv6 listeners before enabling IPv6: an existing service on a specific IPv6 address can prevent Nginx from binding a wildcard IPv6 HTTPS listener. A passing `nginx -t` checks configuration syntax but does not prove that a reload bound every new socket. Verify the certificate actually served for the hostname after reload. For an immediate renewal test, use `certbot renew --cert-name <domain> --dry-run --no-random-sleep-on-renew`.

## Source layout

`src/components/CatalogPage.astro` provides the shared page layout, `ItemCard.astro` renders complete static item cards, and `src/pages/` contains the two routes. Data loading and date helpers live in `src/lib/`. The minimal browser script in `src/scripts/` only updates date-sensitive visibility and labels. There is no client-rendered catalog or runtime backend.

## Updating

Edit `site.local.json`, add sanitized photos, build, inspect the result, then publish a new static release. Source changes are committed to GitHub; the seller's runtime data is maintained separately and should be backed up separately.
