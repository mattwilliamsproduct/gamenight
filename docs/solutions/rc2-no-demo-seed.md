# RC2: no demo seed in the app

`?demo` was a TEMP sample-data boot. It hid the first paint, wrote `gn_*` on empty devices, and unlocked Rook and dusk art.

`public/assets/demo-seed.mjs`, `demo-art.mjs`, and `demo-art.css` are gone. The page has no `BPGDemoLiveGame`, no `bootDemoSeedIfRequested`, and no demo-art link. `?demo`, `?demo&games=rook`, `?demo&art=dusk`, `?demo&logo=dusk`, and `?lp=proposed` do nothing. An older-format save in `localStorage` still opens.

Playwright injects fixtures with `tests/helpers/inject-book.mjs` and `tests/helpers/demo-seed.mjs`. The 90-second path uses that inject, not a URL. Card faces stay on `CARD_FACES` / `card-picker.css`. The gated `?gnqa` gallery stays.

Do not put a sample night back behind a query param on the launch host.
