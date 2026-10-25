# Project instructions

- Keep the experience a personal catalog, with WeChat as the contact channel.
- Keep only a seller introduction, pickup information, contact QR code and item cards. Do not add search, categories, price sorting or status filters.
- Start directly with the introduction and a cropped QR image. Do not add a top navigation bar, contact buttons, contact links or a contact dialog.
- Do not display a page headline. Item cards are static articles showing complete descriptions and all photos directly; do not add click actions, detail views, modal dialogs or copy-link controls.
- Put future listings on the separate graduation page, with its explanation above the cards.
- Use Chinese UI copy and English source comments and documentation.
- Store seller content in `site.local.json`; never commit addresses, WeChat details, QR codes, photos, credentials, or server configuration containing secrets.
- Keep `content/site.example.json` anonymous and explicitly mark demo listings.
- Preserve stable item IDs when changing prices, availability or descriptions.
- Do not add a backend, dependencies at runtime, accounts, payments or a dashboard without a new requirement.
- Run formatting, syntax and catalog checks, then build before committing.
- Inspect mobile and desktop layouts for UI changes.
- Review staged content for private data and tool signatures before publishing to the public repository.
- Keep the preview bound to loopback. Production serves only `dist/` through Nginx.
- Sanitize image metadata before publishing real photos.
