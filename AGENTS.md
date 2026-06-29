<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:chad-wallet-component-rules -->
# ChadWallet component rules

- Keep UI code modular and DRY. When search bars, menus, rows, cards, controls, or other similar UI repeat across pages, extract or reuse a shared component instead of duplicating markup, state, or effects.
- Reuse existing components when they already fit the behavior or visual pattern.
- Use `react-icons` for icons. Do not add inline SVG icons in React components when a matching `react-icons` icon exists.
- Use colors from `app/globals.css` theme tokens and Tailwind utility colors only. Do not add ad hoc hex, RGB, or custom color values in component classes or inline styles.
- **Blur Balances**: Add `data-balance` attribute to any element displaying the **current user's own** balance, portfolio value, PnL, or token holdings. Token prices, other users' data, and non-financial values must NOT get `data-balance`. The blur is toggled from ProfileDropdown and persisted in localStorage.
<!-- END:chad-wallet-component-rules -->
