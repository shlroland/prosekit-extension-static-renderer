# Changelog

## [0.4.0](https://github.com/shlroland/prosekit-static-renderer/compare/v0.3.0...v0.4.0) (2026-06-18)


### Features

* document and demo framework renderers ([abe953f](https://github.com/shlroland/prosekit-static-renderer/commit/abe953f346c78af4b1a5f83739293dba2fdee008))


### Bug Fixes

* render svelte demo output ([03bb0df](https://github.com/shlroland/prosekit-static-renderer/commit/03bb0df7dd4a7599d3daac9d3331c01dcf6cbd73))

## [0.3.0](https://github.com/shlroland/prosekit-static-renderer/compare/v0.2.0...v0.3.0) (2026-06-17)


### Features

* accept prosemirror schema in renderers ([3a5d2e9](https://github.com/shlroland/prosekit-static-renderer/commit/3a5d2e9154a852389dd195e255971dddcf923d5c))
* add React demo previews ([2416ce4](https://github.com/shlroland/prosekit-static-renderer/commit/2416ce476417592faf6e4e032176428006819b3d))


### Bug Fixes

* align package repository metadata ([c01fb71](https://github.com/shlroland/prosekit-static-renderer/commit/c01fb718abb7be4c46f90996255811e463ce7ce8))
* harden static renderer output ([6130c27](https://github.com/shlroland/prosekit-static-renderer/commit/6130c2769a9d089a7a06374bdad33ccef1b1e62a))

## [0.2.0](https://github.com/shlroland/prosekit-static-renderer/compare/v0.1.1...v0.2.0) (2026-06-17)


### Features

* format demo html output ([9b5d5d4](https://github.com/shlroland/prosekit-static-renderer/commit/9b5d5d4ba29422beee4dc7d140bc12931e51bfd4))
* highlight demo code output ([836ed60](https://github.com/shlroland/prosekit-static-renderer/commit/836ed60772aa38bb9efbedd6c7758cfc1dd059d0))

## 0.1.0 (2026-06-16)

### Features

- Add static renderers for HTML, Markdown, React, Preact, Solid, Svelte, and Vue.
- Add reusable `create*Renderer` APIs and one-shot `renderTo*` APIs.
- Support custom `nodeMapping`, `markMapping`, `unhandledNode`, and `unhandledMark` handlers.
- Add a Vite demo that previews HTML and Markdown output from an editable ProseKit document.
