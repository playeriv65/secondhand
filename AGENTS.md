# Project instructions

- Keep the experience a personal catalog, with WeChat as the contact channel.
- Use Astro static output and shared page/card components. Render the active item cards into HTML at build time. Client code switches lists, refreshes date visibility and opens the photo gallery.
- Keep only a seller introduction, pickup information and item cards. Do not add search, categories, price sorting or status filters.
- Start directly with the introduction. Do not add a top navigation bar, contact buttons, contact links or a contact dialog.
- Do not display a page headline. Show only a photo, name, price, description and, for future listings, an estimated date. Let the buyer open a card to read larger text and browse its photos.
- Put future listings on the graduation page with its explanation above the cards. Switch lists in place while preserving direct links and history.
- Use Chinese UI copy and English source comments and documentation.
- Store seller content in `site.local.json`; never commit addresses, WeChat details, QR codes, photos, credentials, or server configuration containing secrets.
- Keep `content/site.example.json` anonymous and empty.
- Preserve stable item IDs when changing prices, availability or descriptions.
- Keep editing inline on both catalog pages. The owner signs in with one password at `/admin`; keep sign-in off the public catalog. Use the same API for browser and CLI edits. Omit unpublished items from both public lists.
- Run formatting, syntax and catalog checks, then build and run `npm run check:build` before committing.
- Inspect mobile and desktop layouts for UI changes.
- Review staged content for private data and tool signatures before publishing to the public repository.
- Keep the preview bound to loopback. Nginx serves the active static release and proxies only the editor API.
- Sanitize image metadata before publishing real photos.
