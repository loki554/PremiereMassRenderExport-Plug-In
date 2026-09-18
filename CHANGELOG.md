# Changelog

## [1.0.0] - 2026-09-18

First public release.

### Added
- A Premiere Pro panel (CEP) that queues every duration marker of the active sequence as its own job in Adobe Media Encoder.
- The marker name becomes the output file name. Illegal characters are removed, duplicates get numbered, and there's an optional no-overwrite mode.
- A preset picker listing your own presets, all system presets grouped by format, and any `.epr` file.
- An output folder picker. The folder is created if it doesn't exist.
- A marker table with checkboxes, a color filter, and timecodes.
- Options to start the Media Encoder queue right away and to remove jobs once they finish.
- The sequence's In/Out points are put back the way they were after queueing.
- Signed `.zxp` and `.zip` release packages.

[1.0.0]: https://github.com/loki554/PremiereMassRenderExport-Plug-In/releases/tag/v1.0.0
