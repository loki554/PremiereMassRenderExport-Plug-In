/*
 * Mass Marker Export — panel side (CEP).
 * Lists duration markers of the active sequence, lets the user pick an AME preset
 * and output folder, then queues every marker range into Adobe Media Encoder.
 */
(function () {
    'use strict';

    var nodeRequire = (window.cep_node && window.cep_node.require) || window.require;
    var fs = nodeRequire('fs');
    var path = nodeRequire('path');
    var os = nodeRequire('os');

    var STORAGE_PREFIX = 'mme.';

    var MARKER_COLORS = [
        { name: 'Зелёный', hex: '#3fbf4f' },
        { name: 'Красный', hex: '#e04848' },
        { name: 'Фиолетовый', hex: '#c35ad6' },
        { name: 'Оранжевый', hex: '#f08c1c' },
        { name: 'Жёлтый', hex: '#e6cf2a' },
        { name: 'Белый', hex: '#f0f0f0' },
        { name: 'Синий', hex: '#3c78ff' },
        { name: 'Голубой', hex: '#2ec8d8' }
    ];

    var FORMAT_NAMES = {
        'H264': 'H.264', 'H26B': 'H.264 Blu-ray', 'HEVC': 'HEVC (H.265)', 'MooV': 'QuickTime',
        'AVIV': 'AVI', 'MP4': 'MP4', 'MP3': 'MP3', 'AAC': 'AAC Audio', 'WAVE': 'Waveform Audio',
        'AIFF': 'AIFF', 'PCM': 'PCM', 'WMV': 'Windows Media', 'GIFf': 'Animated GIF',
        'PNG': 'PNG', 'JPEG': 'JPEG', 'TIFF': 'TIFF', 'TPIC': 'Targa', 'DIBB': 'BMP',
        'DPX': 'DPX', 'oEXR': 'OpenEXR', 'mpg2': 'MPEG2', 'dvd': 'MPEG2-DVD',
        'mbd': 'MPEG2 Blu-ray', 'DMXF': 'MXF OP1a', 'MXFX': 'MXF OP1a (XDCAM)',
        'JMXF': 'JPEG 2000 MXF', 'PMXF': 'P2 Movie', 'MXF': 'MXF', 'MX10': 'AS-10', 'MX11': 'AS-11',
        'DCP_': 'DCP', 'flv': 'FLV'
    };

    var state = {
        sequence: null,        // { sequenceName, sequenceId, fps, markers, skippedPointMarkers }
        unchecked: {},         // marker key -> true when the user unchecked it
        presets: [],           // { name, path, group }
        customPreset: null,    // preset picked via file dialog
        extension: '',         // extension for the selected preset
        busy: false
    };

    var el = {};
    ['seqName', 'btnRefresh', 'colorFilter', 'chkAll', 'markerTable', 'emptyMsg', 'markerSummary',
        'btnReloadPresets', 'presetSearch', 'presetSelect', 'presetPath', 'btnBrowsePreset',
        'outputFolder', 'btnBrowseFolder', 'chkStart', 'chkRemove', 'chkNoOverwrite',
        'btnExport', 'progress', 'progressBar', 'log'].forEach(function (id) {
        el[id] = document.getElementById(id);
    });
    el.tbody = el.markerTable.querySelector('tbody');

    // ---------------------------------------------------------------- storage

    function load(key, fallback) {
        try {
            var v = window.localStorage.getItem(STORAGE_PREFIX + key);
            return v === null ? fallback : JSON.parse(v);
        } catch (e) {
            return fallback;
        }
    }

    function save(key, value) {
        try { window.localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value)); } catch (e) { }
    }

    // ---------------------------------------------------------------- host bridge

    function callHost(fn) {
        var args = Array.prototype.slice.call(arguments, 1).map(function (a) {
            return JSON.stringify(a);
        });
        var script = '$._MME.' + fn + '(' + args.join(',') + ')';
        return new Promise(function (resolve) {
            window.__adobe_cep__.evalScript(script, function (res) {
                var parsed;
                try {
                    parsed = JSON.parse(res);
                } catch (e) {
                    parsed = { ok: false, error: 'Ошибка ExtendScript: ' + res };
                }
                resolve(parsed);
            });
        });
    }

    function getSystemPath(type) {
        try {
            var p = decodeURI(window.__adobe_cep__.getSystemPath(type));
            return process.platform === 'win32' ? p.replace('file:///', '') : p.replace('file://', '');
        } catch (e) {
            return '';
        }
    }

    // ---------------------------------------------------------------- log / ui helpers

    function log(msg, cls) {
        var div = document.createElement('div');
        if (cls) div.className = cls;
        var time = new Date().toTimeString().slice(0, 8);
        div.textContent = time + '  ' + msg;
        el.log.insertBefore(div, el.log.firstChild);
    }

    function setBusy(busy) {
        state.busy = busy;
        ['btnRefresh', 'btnExport', 'btnBrowsePreset', 'btnBrowseFolder', 'btnReloadPresets'].forEach(function (id) {
            el[id].disabled = busy;
        });
        el.progress.classList.toggle('hidden', !busy);
        if (!busy) el.progressBar.style.width = '0';
    }

    function setProgress(done, total) {
        el.progressBar.style.width = (total ? Math.round(done / total * 100) : 0) + '%';
    }

    function timecode(seconds, fps) {
        var base = Math.round(fps) || 25;
        var frames = Math.round(seconds * (fps || base));
        var ff = frames % base;
        var totalSec = Math.floor(frames / base);
        var pad = function (n) { return (n < 10 ? '0' : '') + n; };
        return pad(Math.floor(totalSec / 3600)) + ':' + pad(Math.floor(totalSec / 60) % 60) + ':' +
            pad(totalSec % 60) + ':' + pad(ff);
    }

    // ---------------------------------------------------------------- file names

    var RESERVED = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;

    function sanitizeName(name) {
        var s = String(name || '').split('').filter(function (c) {
            return c.charCodeAt(0) >= 32 && '<>:"/\\|?*'.indexOf(c) < 0;
        }).join('');
        s = s.replace(/\s+/g, ' ').trim().replace(/[. ]+$/, '');
        if (s.length > 180) s = s.slice(0, 180).trim();
        if (RESERVED.test(s)) s += '_';
        return s;
    }

    function markerKey(m) {
        return m.guid || (m.startTicks + '-' + m.endTicks);
    }

    // Builds the export list: resolves empty names, invalid characters and duplicates.
    function buildRows() {
        if (!state.sequence) return [];
        var seqBase = sanitizeName(state.sequence.sequenceName) || 'Sequence';
        var used = {};
        var filter = el.colorFilter.value;

        return state.sequence.markers.map(function (m, i) {
            var row = { marker: m, warnings: [] };
            row.visible = filter === 'all' || String(m.color) === filter;
            row.checked = row.visible && !state.unchecked[markerKey(m)];

            var base = sanitizeName(m.name);
            if (!m.name.trim()) {
                base = seqBase + '_' + (i + 1 < 10 ? '0' : '') + (i + 1);
                row.warnings.push('у маркера нет имени');
            } else if (base !== m.name.trim()) {
                row.warnings.push('недопустимые символы удалены');
                if (!base) base = seqBase + '_' + (i + 1);
            }

            row.baseName = base;
            if (row.checked) {
                var name = base;
                var n = 2;
                while (used[name.toLowerCase()]) name = base + '_' + (n++);
                if (name !== base) row.warnings.push('повтор имени → ' + name);
                used[name.toLowerCase()] = true;
                row.fileName = name;
            } else {
                row.fileName = base;
            }
            return row;
        });
    }

    // ---------------------------------------------------------------- markers

    function renderMarkers() {
        var rows = buildRows();
        var fps = state.sequence ? state.sequence.fps : 25;
        var ext = state.extension ? '.' + state.extension : '';
        el.tbody.innerHTML = '';

        var visible = rows.filter(function (r) { return r.visible; });
        visible.forEach(function (r) {
            var m = r.marker;
            var tr = document.createElement('tr');
            if (!r.checked) tr.className = 'off';
            else if (r.warnings.length) tr.className = 'warn';

            var tdSel = document.createElement('td');
            tdSel.className = 'sel';
            var cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.checked = r.checked;
            cb.addEventListener('change', function () {
                if (cb.checked) delete state.unchecked[markerKey(m)];
                else state.unchecked[markerKey(m)] = true;
                renderMarkers();
            });
            tdSel.appendChild(cb);
            var color = MARKER_COLORS[m.color];
            if (color) {
                var dot = document.createElement('span');
                dot.className = 'dot';
                dot.style.background = color.hex;
                dot.title = color.name;
                tdSel.appendChild(dot);
            }

            var tdName = document.createElement('td');
            tdName.className = 'name';
            tdName.textContent = r.fileName + ext;
            var tip = 'Маркер: ' + (m.name || '(без имени)');
            if (r.warnings.length) tip += '\n⚠ ' + r.warnings.join('\n⚠ ');
            if (m.comments) tip += '\nКомментарий: ' + m.comments;
            tdName.title = tip;

            var tdIn = document.createElement('td');
            tdIn.className = 'tc';
            tdIn.textContent = timecode(m.start, fps);
            tdIn.title = 'Out: ' + timecode(m.end, fps);

            var tdDur = document.createElement('td');
            tdDur.className = 'tc';
            tdDur.textContent = timecode(m.end - m.start, fps);

            tr.appendChild(tdSel);
            tr.appendChild(tdName);
            tr.appendChild(tdIn);
            tr.appendChild(tdDur);
            el.tbody.appendChild(tr);
        });

        el.emptyMsg.classList.toggle('hidden', visible.length > 0);
        if (!visible.length && state.sequence) {
            el.emptyMsg.textContent = state.sequence.markers.length
                ? 'Нет маркеров выбранного цвета.'
                : 'В секвенции нет маркеров с длительностью.';
        }

        var selected = rows.filter(function (r) { return r.checked; }).length;
        el.chkAll.checked = visible.length > 0 && visible.every(function (r) { return r.checked; });

        var summary = '';
        if (state.sequence) {
            summary = 'К экспорту: ' + selected + ' из ' + state.sequence.markers.length;
            if (state.sequence.skippedPointMarkers) {
                summary += ' · пропущено точечных маркеров: ' + state.sequence.skippedPointMarkers;
            }
        }
        el.markerSummary.textContent = summary;
        el.btnExport.textContent = 'Отправить в Media Encoder' + (selected ? ' (' + selected + ')' : '');
    }

    function renderColorFilter() {
        var current = el.colorFilter.value || load('colorFilter', 'all');
        var counts = {};
        (state.sequence ? state.sequence.markers : []).forEach(function (m) {
            counts[m.color] = (counts[m.color] || 0) + 1;
        });
        el.colorFilter.innerHTML = '';
        var optAll = document.createElement('option');
        optAll.value = 'all';
        optAll.textContent = 'Все цвета';
        el.colorFilter.appendChild(optAll);
        MARKER_COLORS.forEach(function (c, i) {
            if (!counts[i] && String(i) !== current) return;
            var o = document.createElement('option');
            o.value = String(i);
            o.textContent = c.name + ' (' + (counts[i] || 0) + ')';
            el.colorFilter.appendChild(o);
        });
        el.colorFilter.value = current;
        if (el.colorFilter.value !== current) el.colorFilter.value = 'all';
    }

    function refreshMarkers(silent) {
        if (state.busy) return Promise.resolve();
        return callHost('getMarkers').then(function (res) {
            if (!res.ok) {
                state.sequence = null;
                el.seqName.textContent = '';
                el.emptyMsg.textContent = res.error;
                renderColorFilter();
                renderMarkers();
                if (!silent) log(res.error, 'error');
                return;
            }
            var prevId = state.sequence && state.sequence.sequenceId;
            state.sequence = res.data;
            if (prevId !== res.data.sequenceId) state.unchecked = {};
            el.seqName.textContent = res.data.sequenceName;
            el.seqName.title = res.data.sequenceName;
            renderColorFilter();
            renderMarkers();
            if (!silent) log('Найдено отрезков: ' + res.data.markers.length + ' в «' + res.data.sequenceName + '»');
            if (!state.extension && getSelectedPresetPath()) updateExtension();
        });
    }

    // ---------------------------------------------------------------- presets

    function listFiles(dir, ext, out) {
        out = out || [];
        var entries;
        try { entries = fs.readdirSync(dir); } catch (e) { return out; }
        entries.forEach(function (name) {
            var full = path.join(dir, name);
            var st;
            try { st = fs.statSync(full); } catch (e) { return; }
            if (st.isDirectory()) listFiles(full, ext, out);
            else if (name.toLowerCase().slice(-ext.length) === ext) out.push(full);
        });
        return out;
    }

    function decodeXml(s) {
        return s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
            .replace(/&apos;/g, "'").replace(/&amp;/g, '&');
    }

    function readPresetName(file) {
        var name = '';
        try {
            var fd = fs.openSync(file, 'r');
            var buf = Buffer.alloc(8192);
            var n = fs.readSync(fd, buf, 0, buf.length, 0);
            fs.closeSync(fd);
            var m = /<PresetName>([\s\S]*?)<\/PresetName>/.exec(buf.toString('utf8', 0, n));
            if (m) {
                name = decodeXml(m[1].trim());
                if (name.charAt(0) === '(' && name.charAt(name.length - 1) === ')') name = name.slice(1, -1);
                // Localised system presets look like "$$$/AME/.../PresetName=Match Source - High bitrate"
                if (name.indexOf('$$$') === 0 && name.indexOf('=') > 0) name = name.slice(name.indexOf('=') + 1);
            }
        } catch (e) { }
        return name || path.basename(file, path.extname(file));
    }

    function versionSort(a, b) {
        var pa = a.match(/\d+/g) || [], pb = b.match(/\d+/g) || [];
        for (var i = 0; i < Math.max(pa.length, pb.length); i++) {
            var d = (Number(pb[i]) || 0) - (Number(pa[i]) || 0);
            if (d) return d;
        }
        return 0;
    }

    function findUserPresetDirs() {
        var docs = getSystemPath('myDocuments') || path.join(os.homedir(), 'Documents');
        var root = path.join(docs, 'Adobe', 'Adobe Media Encoder');
        var versions;
        try { versions = fs.readdirSync(root); } catch (e) { return []; }
        return versions.sort(versionSort).map(function (v) {
            return path.join(root, v, 'Presets');
        }).filter(function (p) { return fs.existsSync(p); });
    }

    function findSystemPresetDir() {
        var candidates = [];
        if (process.platform === 'win32') {
            var pf = process.env.ProgramFiles || 'C:\\Program Files';
            var adobe = path.join(pf, 'Adobe');
            try {
                fs.readdirSync(adobe).filter(function (d) { return /^Adobe Media Encoder/i.test(d); })
                    .sort(versionSort).forEach(function (d) {
                        candidates.push(path.join(adobe, d, 'MediaIO', 'systempresets'));
                    });
            } catch (e) { }
        } else {
            try {
                fs.readdirSync('/Applications').filter(function (d) { return /^Adobe Media Encoder/i.test(d); })
                    .sort(versionSort).forEach(function (d) {
                        candidates.push(path.join('/Applications', d, d + '.app', 'Contents', 'MediaIO', 'systempresets'));
                    });
            } catch (e) { }
        }
        for (var i = 0; i < candidates.length; i++) {
            if (fs.existsSync(candidates[i])) return candidates[i];
        }
        return '';
    }

    function formatGroup(sysDir, file) {
        var top = path.relative(sysDir, file).split(path.sep)[0] || '';
        var hex = top.split('_')[1] || '';
        var code = '';
        for (var i = 0; i + 1 < hex.length; i += 2) code += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
        code = code.trim();
        return FORMAT_NAMES[code] || code || 'Другое';
    }

    function loadPresets() {
        var presets = [];
        var seenUser = {};
        findUserPresetDirs().forEach(function (dir) {
            listFiles(dir, '.epr').forEach(function (file) {
                var name = readPresetName(file);
                if (seenUser[name.toLowerCase()]) return; // newer AME version wins
                seenUser[name.toLowerCase()] = true;
                presets.push({ name: name, path: file, group: 'Мои пресеты' });
            });
        });

        var sysDir = findSystemPresetDir();
        var system = [];
        if (sysDir) {
            listFiles(sysDir, '.epr').forEach(function (file) {
                system.push({ name: readPresetName(file), path: file, group: 'Системные · ' + formatGroup(sysDir, file) });
            });
        }
        system.sort(function (a, b) {
            return a.group.localeCompare(b.group) || a.name.localeCompare(b.name);
        });
        presets.sort(function (a, b) { return a.name.localeCompare(b.name); });
        state.presets = presets.concat(system);

        var userCount = presets.length;
        log('Пресеты: своих ' + userCount + ', системных ' + system.length +
            (sysDir ? '' : ' (папка системных пресетов AME не найдена)'), sysDir ? '' : 'warn');
    }

    function renderPresets() {
        var query = el.presetSearch.value.trim().toLowerCase();
        var selected = getSelectedPresetPath() || load('presetPath', '');
        var list = state.presets.slice();
        if (state.customPreset) list.unshift(state.customPreset);

        el.presetSelect.innerHTML = '';
        var groups = {};
        var found = false;
        list.forEach(function (p) {
            var hay = (p.name + ' ' + p.group).toLowerCase();
            if (query && hay.indexOf(query) < 0 && p.path !== selected) return;
            var g = groups[p.group];
            if (!g) {
                g = groups[p.group] = document.createElement('optgroup');
                g.label = p.group;
                el.presetSelect.appendChild(g);
            }
            var o = document.createElement('option');
            o.value = p.path;
            o.textContent = p.name;
            o.title = p.path;
            g.appendChild(o);
            if (p.path === selected) found = true;
        });

        if (!el.presetSelect.options.length) {
            var none = document.createElement('option');
            none.value = '';
            none.textContent = 'Пресеты не найдены';
            el.presetSelect.appendChild(none);
        }
        if (found) el.presetSelect.value = selected;
        onPresetChanged();
    }

    function getSelectedPresetPath() {
        return el.presetSelect.value || '';
    }

    function onPresetChanged() {
        var p = getSelectedPresetPath();
        el.presetPath.textContent = p;
        el.presetPath.title = p;
        if (p) save('presetPath', p);
        updateExtension();
    }

    function updateExtension() {
        var p = getSelectedPresetPath();
        if (!p) {
            state.extension = '';
            renderMarkers();
            return Promise.resolve('');
        }
        return callHost('getExtension', p).then(function (res) {
            state.extension = res.ok ? res.data : '';
            renderMarkers();
            return state.extension;
        });
    }

    function browsePreset() {
        var initial = path.dirname(getSelectedPresetPath() || findUserPresetDirs()[0] || os.homedir());
        var file = '';
        if (window.cep && window.cep.fs && window.cep.fs.showOpenDialogEx) {
            var r = window.cep.fs.showOpenDialogEx(false, false, 'Выберите пресет Media Encoder', initial, ['epr']);
            file = r && r.data && r.data[0];
            applyCustomPreset(file);
        } else {
            callHost('selectPreset').then(function (res) { if (res.ok) applyCustomPreset(res.data); });
        }
    }

    function applyCustomPreset(file) {
        if (!file) return;
        var existing = state.presets.filter(function (p) { return p.path.toLowerCase() === file.toLowerCase(); })[0];
        if (!existing) {
            state.customPreset = { name: readPresetName(file), path: file, group: 'Выбранный файл' };
            save('customPreset', state.customPreset);
        }
        el.presetSearch.value = '';
        save('presetPath', existing ? existing.path : file);
        el.presetSelect.value = '';
        renderPresets();
        el.presetSelect.value = existing ? existing.path : file;
        onPresetChanged();
    }

    // ---------------------------------------------------------------- output folder

    function browseFolder() {
        var initial = el.outputFolder.value || getSystemPath('myDocuments');
        if (window.cep && window.cep.fs && window.cep.fs.showOpenDialogEx) {
            var r = window.cep.fs.showOpenDialogEx(false, true, 'Папка для сохранения файлов', initial);
            var dir = r && r.data && r.data[0];
            if (dir) setOutputFolder(dir);
        } else {
            callHost('selectFolder', 'Папка для сохранения файлов').then(function (res) {
                if (res.ok && res.data) setOutputFolder(res.data);
            });
        }
    }

    function setOutputFolder(dir) {
        el.outputFolder.value = path.normalize(dir);
        save('outputFolder', el.outputFolder.value);
    }

    // ---------------------------------------------------------------- export

    function uniqueOnDisk(dir, name, ext, taken) {
        var candidate = name;
        var n = 2;
        var exists = function (c) {
            var file = path.join(dir, c + (ext ? '.' + ext : ''));
            return taken[file.toLowerCase()] || fs.existsSync(file);
        };
        while (exists(candidate)) candidate = name + '_' + (n++);
        return candidate;
    }

    function exportAll() {
        if (state.busy) return;
        var presetPath = getSelectedPresetPath();
        var outDir = el.outputFolder.value.trim();

        if (!state.sequence) { log('Сначала обновите список маркеров.', 'error'); return; }
        var rows = buildRows().filter(function (r) { return r.checked; });
        if (!rows.length) { log('Нет отмеченных отрезков для экспорта.', 'error'); return; }
        if (!presetPath || !fs.existsSync(presetPath)) { log('Выберите существующий пресет (.epr).', 'error'); return; }
        if (!outDir) { log('Укажите папку для сохранения.', 'error'); return; }
        if (!path.isAbsolute(outDir)) { log('Путь к папке должен быть абсолютным.', 'error'); return; }

        try {
            fs.mkdirSync(outDir, { recursive: true });
        } catch (e) {
            log('Не удалось создать папку: ' + e.message, 'error');
            return;
        }
        save('outputFolder', outDir);

        var sequenceId = state.sequence.sequenceId;
        var noOverwrite = el.chkNoOverwrite.checked;
        var removeOnCompletion = el.chkRemove.checked;
        var startRender = el.chkStart.checked;
        var queued = 0, failed = 0;

        setBusy(true);
        log('Отправка ' + rows.length + ' отрезков в Media Encoder…');

        updateExtension().then(function (ext) {
            if (!ext) log('Не удалось определить расширение файла для пресета — AME подставит его сам.', 'warn');
            return callHost('beginBatch', outDir).then(function (res) {
                if (!res.ok) throw new Error(res.error);
                return ext;
            });
        }).then(function (ext) {
            var taken = {};
            var chain = Promise.resolve();
            rows.forEach(function (r, i) {
                chain = chain.then(function () {
                    // uniqueOnDisk also covers duplicates within the batch via `taken`.
                    var name = noOverwrite ? uniqueOnDisk(outDir, r.baseName, ext, taken) : r.fileName;
                    var outputPath = path.join(outDir, name + (ext ? '.' + ext : ''));
                    taken[outputPath.toLowerCase()] = true;
                    return callHost('queueOne', JSON.stringify({
                        sequenceId: sequenceId,
                        startTicks: r.marker.startTicks,
                        endTicks: r.marker.endTicks,
                        outputPath: outputPath,
                        presetPath: presetPath,
                        removeOnCompletion: removeOnCompletion
                    })).then(function (res) {
                        if (res.ok) {
                            queued++;
                            log('✓ ' + path.basename(outputPath), 'ok');
                        } else {
                            failed++;
                            log('✗ ' + path.basename(outputPath) + ': ' + res.error, 'error');
                        }
                        setProgress(i + 1, rows.length);
                    });
                });
            });
            return chain;
        }).catch(function (e) {
            log('Ошибка: ' + (e && e.message ? e.message : e), 'error');
        }).then(function () {
            return callHost('endBatch', startRender && queued > 0);
        }).then(function (res) {
            if (res && !res.ok) log(res.error, 'warn');
            var msg = 'Готово: в очереди ' + queued + (failed ? ', с ошибкой ' + failed : '') + '.';
            if (queued && startRender) msg += ' Рендер запущен в Media Encoder.';
            else if (queued) msg += ' Запустите очередь в Media Encoder.';
            log(msg, failed ? 'warn' : 'ok');
            setBusy(false);
        });
    }

    // ---------------------------------------------------------------- init

    function bind() {
        el.btnRefresh.addEventListener('click', function () { refreshMarkers(false); });
        el.colorFilter.addEventListener('change', function () {
            save('colorFilter', el.colorFilter.value);
            renderMarkers();
        });
        el.chkAll.addEventListener('change', function () {
            var filter = el.colorFilter.value;
            (state.sequence ? state.sequence.markers : []).forEach(function (m) {
                if (filter !== 'all' && String(m.color) !== filter) return;
                if (el.chkAll.checked) delete state.unchecked[markerKey(m)];
                else state.unchecked[markerKey(m)] = true;
            });
            renderMarkers();
        });

        el.presetSearch.addEventListener('input', renderPresets);
        el.presetSelect.addEventListener('change', onPresetChanged);
        el.btnBrowsePreset.addEventListener('click', browsePreset);
        el.btnReloadPresets.addEventListener('click', function () {
            loadPresets();
            renderPresets();
        });

        el.btnBrowseFolder.addEventListener('click', browseFolder);
        el.outputFolder.addEventListener('change', function () { save('outputFolder', el.outputFolder.value.trim()); });

        ['chkStart', 'chkRemove', 'chkNoOverwrite'].forEach(function (id) {
            el[id].checked = load(id, el[id].checked);
            el[id].addEventListener('change', function () { save(id, el[id].checked); });
        });

        el.btnExport.addEventListener('click', exportAll);

        // Pick up marker edits made on the timeline when the user returns to the panel.
        window.addEventListener('focus', function () { refreshMarkers(true); });
    }

    function init() {
        bind();
        el.outputFolder.value = load('outputFolder', '');
        state.customPreset = load('customPreset', null);
        if (state.customPreset && !fs.existsSync(state.customPreset.path)) state.customPreset = null;
        loadPresets();
        renderPresets();
        renderColorFilter();
        refreshMarkers(false);
    }

    init();
})();
