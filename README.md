# Secondhand

A small Astro site for a mobile-friendly personal secondhand catalog for sharing in WeChat groups. Buyers browse the catalog and contact the seller on WeChat. Buyers can open a card to enlarge the photos and description. The owner signs in at `/admin` and edits cards directly on the catalog pages.

## Run locally

Requires Node.js 22.23.4 or newer. Astro builds static HTML. Nginx serves it, and a Node.js service handles owner edits and publication.

```sh
npm ci
npm run dev
```

Open the printed loopback URL. Astro watches source changes. After changing local content or media, restart `npm run dev` so referenced media is prepared again. Use `npm run build` followed by `npm run preview` to inspect the production output.

## Catalog data

Copy `content/site.example.json` to `site.local.json` and edit the copy. The local file and `assets.local/` are ignored by Git. If no local file exists, the build uses the empty example catalog.

- `pickup`: short public introduction with pickup and campus meeting arrangements.
- `items`: unique slug, name, nonnegative USD price, description, status, date, and images.
- `laterDescription`: introduction to the graduation items page. The home page shows items available now, while `/later.html` shows items with a future availability date. Items move to the current page when the date arrives.
- `status`: `available`, `reserved`, or `sold`. Set `availableFrom` to `null` for immediate availability, or an ISO date such as `2027-05-20` for later pickup. Only future dates appear on cards. Items with status `sold` are omitted. Astro renders the initial list into HTML. The browser switches between the two URLs in place and moves items when the date arrives in `timeZone`. With JavaScript disabled, the links load separate pages and the lists reflect the build date.
- `images`: paths such as `/media/chair/front.webp`. Put the corresponding files in `assets.local/chair/front.webp`. Each listing requires at least one real photo.
- `labels`, browser title, introduction, locale, currency, and timezone are configuration data. Keep seller-specific information out of application source.

Process uploaded photos to remove EXIF and other metadata before adding them to `assets.local/`. Optimize photos as JPEG/WebP and use reasonably sized images.

Local files are excluded from the public repository, but **the built catalog, address and referenced images become public when deployed**. The prepare step validates and copies only referenced images into ignored `public/media/`; never commit that directory. Do not put private photos, drafts, credentials or backups there.

## Checks

```sh
npm run format
npm run format:check
npm run check
npm run build
npm run check:build
```

Validation rejects duplicate IDs, negative prices, invalid calendar dates, unsafe image paths, and listings without photos. Before publishing, inspect desktop and mobile layouts, list switching and browser history, the card gallery, prices and descriptions.

## Publishing items

Open `/admin` in your phone browser and sign in. Add a new card or edit an existing one. Enter the name, USD price, and description, then choose immediate sale or a future date. The camera and album controls can be used together. Selecting new photos when editing replaces the existing set. The server accepts up to eight photos with a combined size of 32 MiB, converts them to WebP, and drops image metadata. Use **下架** to remove an item from both public lists.

The CLI uses the same password, fields, and publication API. Run it from a checkout on any computer that can reach the site. It prompts for the password.

```sh
node scripts/admin/cli.mjs list --origin https://your-site
node scripts/admin/cli.mjs add --origin https://your-site --name "Desk" --price 25 --description "Solid wood" --photo desk.jpg
node scripts/admin/cli.mjs edit ITEM_ID --origin https://your-site --price 20 --date 2027-05-20
node scripts/admin/cli.mjs unpublish ITEM_ID --origin https://your-site
```

Repeat `--photo` to send multiple images. Omit `--date` when adding an item for immediate sale. Use `--date now` when moving a future item to the current page. Omit unchanged fields when editing. Use `SECONDHAND_ORIGIN` to supply the site URL or `--password-stdin` to read the password from standard input in automation.

## Deployment

1. Create the `secondhand` service account and install Node.js 22.23.4 or newer. The example systemd unit expects a Node binary at `/srv/secondhand/editor/runtime/node_modules/node/bin/node`. Put the checkout in `/srv/secondhand/editor/app` and install its dependencies with `npm ci` using that Node version. For HEIC uploads on Ubuntu, install `libheif-examples` and `libheif-plugin-libde265` so the service can use `heif-convert` when Sharp lacks an HEVC decoder.
2. On first setup, copy the existing seller catalog and assets to the service checkout as `site.local.json` and `assets.local/`. Keep these ignored files out of the public repository. Give the service user write access to the checkout and the published directory. These directories must be on the same filesystem so the service can move the build output into a release before switching the active symlink.
3. Generate the authentication file with `node scripts/admin/configure-password.mjs`, supplying the password over standard input and redirecting the output to `/etc/secondhand/auth.json`. Keep this file outside the checkout and web root, readable only by root and the service account.
4. Put the following settings in `/etc/secondhand/editor.env`, using the site's actual HTTPS origin. Install `deploy/secondhand.service` under `/etc/systemd/system/` and enable and start the service. It builds the initial release from the seed catalog if no active release exists.

   ```ini
   SECONDHAND_ORIGIN=https://your-site
   SECONDHAND_PUBLISHED=/srv/secondhand/editor/published
   SECONDHAND_AUTH_FILE=/etc/secondhand/auth.json
   ```

5. Use `deploy/nginx.conf` as the base for a new virtual host. In the HTTPS virtual host, set `root` to `/srv/secondhand/editor/published/current` and include `deploy/editor-nginx.conf` from the installed snippet path. This makes the static login page available at `/admin` and proxies the editing API. Load `deploy/editor-limit.conf` in Nginx's HTTP context. Its rate limit applies to password attempts. Point the subdomain's DNS at Nginx and use Certbot to install and renew its certificate.
6. Run `sudo nginx -t` before reloading. Verify HTTPS, both public pages, `/admin` and that the editor API rejects unauthenticated access.

Back up the release pointed to by the published directory's `current` symlink, including the private `catalog.json` and `www/media/`. After first setup, the live release supplies the catalog and photos for future edits. The checkout's local catalog and assets are build inputs rewritten by the service. To roll back, stop the service and atomically repoint `current` to the prior release's `www/` before restarting.

## Source layout

`src/components/CatalogPage.astro`, `ItemCard.astro` and `ItemDetails.astro` render the public catalog and gallery. `CatalogEditor.astro` and `src/scripts/editor.mjs` add inline editing after sign-in. The shared catalog service in `scripts/admin/catalog.mjs` handles listing, saving and unpublishing items. Both clients call the HTTP adapter in `scripts/admin/server.mjs`. The filesystem adapter in `scripts/admin/files.mjs` processes uploads, checks the Astro build, and switches the active release.
