# RC2: no demo seed in the app

`?demo` was a TEMP sample-data boot. It hid the first paint, wrote `gn_*` on empty devices, and unlocked Rook and dusk art.

The shipped page no longer imports `demo-seed.mjs`. `?demo`, `?demo&games=rook`, `?demo&art=dusk`, and `?demo&logo=dusk` do nothing. An older-format save in `localStorage` still opens.

Playwright injects fixtures with `tests/helpers/inject-book.mjs`. The 90-second path uses that inject, not a URL.

Do not put a sample night back behind a query param on the launch host.
