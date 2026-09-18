# Mass Marker Export for Premiere Pro

[![Latest release](https://img.shields.io/github/v/release/loki554/PremiereMassRenderExport-Plug-In)](https://github.com/loki554/PremiereMassRenderExport-Plug-In/releases/latest)
[![Downloads](https://img.shields.io/github/downloads/loki554/PremiereMassRenderExport-Plug-In/total)](https://github.com/loki554/PremiereMassRenderExport-Plug-In/releases)
![Premiere Pro 2022+](https://img.shields.io/badge/Premiere%20Pro-2022%2B-9999FF)
![Platform](https://img.shields.io/badge/platform-Windows-lightgrey)

A Premiere Pro panel for batch-exporting parts of a sequence through Adobe Media Encoder.
Mark each part on the timeline with a **duration marker**, name the marker, pick a preset
and an output folder, and every range is queued in Media Encoder as its own file.

**[Download the latest release](https://github.com/loki554/PremiereMassRenderExport-Plug-In/releases/latest)** · [Русская версия](#русский)

## Features

- Every marker with a duration becomes one export job, and the marker name becomes the file name
- Any Media Encoder preset: your own presets, all system presets grouped by format, or any `.epr` file
- One output folder for the whole batch, created if it doesn't exist
- A preview table: tick ranges on or off, filter by marker color, see timecodes and durations
- Safe file names: illegal characters are removed, duplicate names get numbered, and existing files are never overwritten (optional)
- Can start the Media Encoder queue right away and remove jobs from it when they finish
- Puts the sequence's In/Out points back the way they were once the jobs are queued
- Remembers the preset, folder and options between sessions

> [!NOTE]
> The panel's interface is currently in Russian.

## Requirements

- Adobe Premiere Pro 2022 or newer (tested on 2024 / 24.6)
- Adobe Media Encoder of the same version
- Windows 10/11. macOS paths are supported in the code but haven't been tested yet.

## Installation

Download the files from the **[Releases page](https://github.com/loki554/PremiereMassRenderExport-Plug-In/releases/latest)**.
Both packages are signed, so you don't need to change any registry settings or turn on debug mode.

### Option A: ZXP installer (recommended)

1. Download `MassMarkerExport-<version>.zxp`.
2. Install it with a free ZXP installer such as [ZXP Installer by aescripts](https://aescripts.com/learn/zxp-installer/)
   or [Anastasiy's Extension Manager](https://install.anastasiy.com/).
3. Restart Premiere Pro.

<details>
<summary>Without third-party tools: Adobe's built-in installer</summary>

If the Creative Cloud desktop app is installed, run this in `cmd`:

```bat
"C:\Program Files\Common Files\Adobe\Adobe Desktop Common\RemoteComponents\UPI\UnifiedPluginInstallerAgent\UnifiedPluginInstallerAgent.exe" /install "C:\path\to\MassMarkerExport-1.0.0.zxp"
```
</details>

### Option B: Manual (ZIP)

1. Download `MassMarkerExport-<version>.zip`.
2. Extract the `com.alexc.massmarkerexport` folder into:
   - Windows: `%APPDATA%\Adobe\CEP\extensions\`
   - macOS: `~/Library/Application Support/Adobe/CEP/extensions/`
3. Restart Premiere Pro.

Don't edit the extracted files. The package is signed, and a changed file breaks the signature.

### Open the panel

**Window → Extensions → Mass Marker Export**

### Uninstall

Remove the extension in your ZXP installer, or delete the `com.alexc.massmarkerexport` folder from the extensions directory above.

## Usage

1. **Mark the ranges.** Add a marker on the timeline (`M`) and give it a duration. You can Alt-drag its right edge,
   or double-click the marker and set **Duration**. Type the output file name in **Name**.
   Markers without a duration are ignored.
2. **Load the markers.** Click **Обновить** (Refresh). The list also refreshes by itself whenever the panel gets focus.
   Untick any ranges you don't need, or filter them by marker color.
3. **Choose a preset.** Your own presets are listed first. System presets come after them, grouped by format.
   Use the search box, or click **Файл .epr…** to pick any preset file.
   Tip: in Media Encoder you can create a preset in *Preset Browser → + → Create Encoding Preset*.
4. **Set the output folder** with **Обзор…** (Browse).
5. Click **Отправить в Media Encoder** (Send to Media Encoder).

### File naming rules

| Situation | Result |
|---|---|
| Characters that Windows doesn't allow (`\ / : * ? " < > \|`) | removed |
| Marker without a name | `<SequenceName>_<NN>` |
| Two markers with the same name | `Name`, `Name_2`, `Name_3`… |
| File already exists (with *don't overwrite* on) | next free suffix |
| Reserved names (`CON`, `NUL`, …) | `_` added at the end |

The file extension comes from the preset. If a name was changed, its row is highlighted and the tooltip says why.

## How it works

For each range, the panel sets the sequence In/Out points to the marker bounds and calls
`app.encoder.encodeSequence(..., ENCODE_IN_TO_OUT)`. Once everything is queued, it puts the original
In/Out points back. Queueing can take a few seconds per range, and a progress bar shows how far along it is.

> [!NOTE]
> If the sequence had no In/Out points before the export, it will have them afterwards, set to its start and end.

## Troubleshooting

- **The panel is missing from Window → Extensions.** Make sure the folder is named exactly `com.alexc.massmarkerexport`
  and restart Premiere Pro. If you installed it manually and it still doesn't show up, turn on unsigned extensions:
  set the `PlayerDebugMode` string value to `1` under `HKEY_CURRENT_USER\Software\Adobe\CSXS.11`.
- **The preset list is empty.** Check that Media Encoder is installed, then click **↻** to reload the list.
- **A job fails.** The panel log shows the error Premiere returned for each file.

## Development

```
CSXS/manifest.xml         CEP extension manifest (the version lives here)
index.html, css/          panel UI
js/main.js                panel logic: markers, presets, file names, queueing
jsx/host.jsx              ExtendScript: reads markers, talks to Media Encoder
.debug                    remote debugging port (Chrome DevTools → http://localhost:8088)
install.bat               dev install: copies the working tree and turns on PlayerDebugMode
uninstall.bat             removes the dev install
tools/build-release.ps1   builds the signed .zxp and .zip into dist/
```

**Dev install:** run `install.bat` and restart Premiere Pro. After you change the code, run it again and reopen the panel.
This installs an unsigned copy, so it turns on `PlayerDebugMode` for CSXS 9–12.

**Building a release:**

1. Bump `ExtensionBundleVersion` and the extension `Version` in `CSXS/manifest.xml`.
2. Run:
   ```powershell
   powershell -ExecutionPolicy Bypass -File tools\build-release.ps1
   ```
   The script downloads Adobe's `ZXPSignCmd` into `tools/bin/`. On the first run it also creates a self-signed certificate
   in `%USERPROFILE%\.mass-marker-export\`, which stays out of the repository.
   Set `MME_CERT_PASSWORD` if you want to choose the certificate password yourself.
3. Upload `dist/MassMarkerExport-<version>.zxp` and `.zip` to a new GitHub release.

---

## Русский

Панель для Premiere Pro, которая отправляет куски секвенции в Adobe Media Encoder пачкой.
Каждый маркер **с длительностью** становится отдельным файлом, а имя маркера — именем файла.

### Установка

Скачайте файлы со **[страницы релизов](https://github.com/loki554/PremiereMassRenderExport-Plug-In/releases/latest)**.
Пакеты подписаны, поэтому менять реестр или включать режим отладки не нужно.

- **ZXP (рекомендуется):** установите `MassMarkerExport-<версия>.zxp` через
  [ZXP Installer](https://aescripts.com/learn/zxp-installer/) или
  [Anastasiy's Extension Manager](https://install.anastasiy.com/).
- **Вручную (ZIP):** распакуйте папку `com.alexc.massmarkerexport` из `MassMarkerExport-<версия>.zip` в
  `%APPDATA%\Adobe\CEP\extensions\` (на macOS — в `~/Library/Application Support/Adobe/CEP/extensions/`).

Затем перезапустите Premiere Pro и откройте панель: **Window → Extensions → Mass Marker Export**.

### Как пользоваться

1. Поставьте маркер (`M`) и растяните его: Alt+перетаскивание правого края или поле **Duration** в окне маркера.
   В поле **Name** впишите имя файла. Маркеры без длительности пропускаются.
2. Нажмите «Обновить». Лишние отрезки снимите галочкой или отфильтруйте по цвету.
3. Выберите пресет: сначала идут ваши, затем системные по форматам. Есть поиск и кнопка «Файл .epr…».
4. Укажите папку вывода и нажмите «Отправить в Media Encoder».

Запрещённые символы удаляются. Маркер без имени получает имя `<Секвенция>_<NN>`, а повторяющиеся
имена нумеруются (`_2`, `_3`…). С опцией «Не перезаписывать» существующие файлы не затираются.
Когда все задания поставлены в очередь, панель возвращает In/Out секвенции как было.

### Для разработки

`install.bat` копирует рабочую копию в папку расширений и включает `PlayerDebugMode`.
Он нужен только для разработки. Релиз собирается скриптом `tools\build-release.ps1`, подробности — в разделе
[Development](#development).
