# Secondhand

A small Astro site for a mobile-friendly personal secondhand catalog for sharing in WeChat groups. Buyers browse the catalog and contact the seller on WeChat. The owner signs in with a password and edits cards directly on the catalog pages.

## Run locally

Requires Node.js 22.23.4 or newer. Astro builds static HTML. Nginx serves it, and a Node.js service handles owner edits and publication.

```sh
npm ci
npm run dev
```

Open the printed loopback URL. Astro watches source changes. After changing local content or media, restart `npm run dev` so referenced media is prepared again. Use `npm run build` followed by `npm run preview` to inspect the production output.

## Catalog data

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

## Publishing items

Open either catalog page in your phone browser and use the administrator sign-in at the bottom. Add a new card or edit an existing one. Enter the name, USD price, and description, then choose immediate sale or a future date. The camera and album controls can be used together. Selecting new photos when editing replaces the existing set. The server accepts up to eight photos with a combined size of 32 MiB, converts them to WebP, and drops image metadata. The first live publication removes the demo cards.

The CLI uses the same password, fields, and publication API. Run it from a checkout on any computer that can reach the site. It prompts for the password.

```sh
node scripts/admin/cli.mjs list --origin https://your-site
node scripts/admin/cli.mjs add --origin https://your-site --name "Desk" --price 25 --description "Solid wood" --photo desk.jpg
node scripts/admin/cli.mjs edit ITEM_ID --origin https://your-site --price 20 --date 2027-05-20
```

Repeat `--photo` to send multiple images. Omit `--date` when adding an item for immediate sale. Use `--date now` when moving a future item to the current page. Omit unchanged fields when editing. Use `SECONDHAND_ORIGIN` to supply the site URL or `--password-stdin` to read the password from standard input in automation.

## Deployment

1. Create the `secondhand` service account and install Node.js 22.23.4 or newer. The example systemd unit expects a Node binary at `/srv/secondhand/editor/runtime/node_modules/node/bin/node`. Put the checkout in `/srv/secondhand/editor/app` and install its dependencies with `npm ci` using that Node version.
2. On first setup, copy the existing seller catalog and assets to the service checkout as `site.local.json` and `assets.local/`. Keep these ignored files out of the public repository. Give the service user write access to the checkout and the published directory. These directories must be on the same filesystem so the service can move the build output into a release before switching the active symlink.
3. Generate the authentication file with `node scripts/admin/configure-password.mjs`, supplying the password over standard input and redirecting the output to `/etc/secondhand/auth.json`. Keep this file outside the checkout and web root, readable only by root and the service account.
4. Put the following settings in `/etc/secondhand/editor.env`, using the site's actual HTTPS origin. Install `deploy/secondhand.service` under `/etc/systemd/system/` and enable and start the service. It builds the initial release from the seed catalog if no active release exists.

   ```ini
   SECONDHAND_ORIGIN=https://your-site
   SECONDHAND_PUBLISHED=/srv/secondhand/editor/published
   SECONDHAND_AUTH_FILE=/etc/secondhand/auth.json
   ```

5. Use `deploy/nginx.conf` as the base for a new virtual host. In the HTTPS virtual host, set `root` to `/srv/secondhand/editor/published/current` and include `deploy/editor-nginx.conf` from the installed snippet path. Load `deploy/editor-limit.conf` in Nginx's HTTP context. Its rate limit applies to password attempts. Point the subdomain's DNS at Nginx and use Certbot to install and renew its certificate.
6. Run `sudo nginx -t` before reloading. Verify HTTPS, both public pages, and that the editor API rejects unauthenticated access.

Back up the release pointed to by the published directory's `current` symlink, including the private `catalog.json` and `www/media/`. After first setup, the live release supplies the catalog and photos for future edits. The checkout's local catalog and assets are build inputs rewritten by the service. To roll back, stop the service and atomically repoint `current` to the prior release's `www/` before restarting.

## Source layout

`src/components/CatalogPage.astro` and `ItemCard.astro` render the public pages. `CatalogEditor.astro` and `src/scripts/editor.mjs` add inline editing after sign-in. The shared catalog service in `scripts/admin/catalog.mjs` handles listing and saving items. Both clients call the HTTP adapter in `scripts/admin/server.mjs`. The filesystem adapter in `scripts/admin/files.mjs` processes uploads, checks the Astro build, and switches the active release.
