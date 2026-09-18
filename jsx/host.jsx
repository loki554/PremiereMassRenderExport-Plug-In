/*
 * Mass Marker Export — ExtendScript host side (Premiere Pro).
 * Reads duration markers of the active sequence and queues each range
 * into Adobe Media Encoder with a chosen preset.
 */

var TICKS_PER_SECOND = 254016000000;

// --- Minimal JSON.stringify (ExtendScript may lack a native JSON object) ---
function mmeQuote(str) {
    return '"' + String(str).replace(/[\\"\x00-\x1f\u2028\u2029]/g, function (c) {
        switch (c) {
            case '"': return '\\"';
            case '\\': return '\\\\';
            case '\n': return '\\n';
            case '\r': return '\\r';
            case '\t': return '\\t';
            default:
                var h = c.charCodeAt(0).toString(16);
                return '\\u' + ('0000' + h).slice(-4);
        }
    }) + '"';
}

function mmeStringify(v) {
    if (v === null || v === undefined) return 'null';
    var t = typeof v;
    if (t === 'number') return isFinite(v) ? String(v) : 'null';
    if (t === 'boolean') return v ? 'true' : 'false';
    if (t === 'string') return mmeQuote(v);
    var parts = [], i, k;
    if (v instanceof Array) {
        for (i = 0; i < v.length; i++) parts.push(mmeStringify(v[i]));
        return '[' + parts.join(',') + ']';
    }
    for (k in v) {
        if (v.hasOwnProperty(k)) parts.push(mmeQuote(k) + ':' + mmeStringify(v[k]));
    }
    return '{' + parts.join(',') + '}';
}

function mmeParse(str) {
    // Input always comes from our own panel (JSON.stringify output).
    return eval('(' + str + ')');
}

function mmeOk(data) { return mmeStringify({ ok: true, data: data }); }
function mmeErr(msg) { return mmeStringify({ ok: false, error: String(msg) }); }

function mmeMakeTime(ticks) {
    var t = new Time();
    t.ticks = String(ticks);
    return t;
}

// Sets in/out on a sequence using Time objects, falling back to seconds if the
// Time overload is not honoured by this Premiere version.
function mmeSetPoint(seq, which, ticks) {
    var setter = which === 'in' ? 'setInPoint' : 'setOutPoint';
    var getter = which === 'in' ? 'getInPointAsTime' : 'getOutPointAsTime';
    try {
        seq[setter](mmeMakeTime(ticks));
        if (String(seq[getter]().ticks) === String(ticks)) return;
    } catch (e) { /* fall through */ }
    seq[setter](Number(ticks) / TICKS_PER_SECOND);
}

function mmeSetRange(seq, inTicks, outTicks) {
    // Move out to sequence end first so the new in point never exceeds the current out point.
    mmeSetPoint(seq, 'out', seq.end);
    mmeSetPoint(seq, 'in', inTicks);
    mmeSetPoint(seq, 'out', outTicks);
}

function mmeMarkerColor(marker) {
    try {
        if (typeof marker.getColorByIndex === 'function') return marker.getColorByIndex();
    } catch (e) { }
    return -1;
}

$._MME = {
    batchState: null,

    getMarkers: function () {
        try {
            if (!app.project) return mmeErr('Нет открытого проекта.');
            var seq = app.project.activeSequence;
            if (!seq) return mmeErr('Нет активной секвенции. Откройте секвенцию на таймлайне.');

            var fps = 0;
            try { fps = TICKS_PER_SECOND / Number(seq.timebase); } catch (e) { }

            var list = [];
            var skipped = 0;
            var markers = seq.markers;
            var m = markers.getFirstMarker();
            var guard = 0;
            while (m && guard < 10000) {
                var startTicks = String(m.start.ticks);
                var endTicks = String(m.end.ticks);
                if (Number(endTicks) > Number(startTicks)) {
                    list.push({
                        name: m.name || '',
                        comments: m.comments || '',
                        guid: m.guid || '',
                        type: m.type || '',
                        color: mmeMarkerColor(m),
                        startTicks: startTicks,
                        endTicks: endTicks,
                        start: m.start.seconds,
                        end: m.end.seconds
                    });
                } else {
                    skipped++;
                }
                m = markers.getNextMarker(m);
                guard++;
            }

            list.sort(function (a, b) { return a.start - b.start; });

            return mmeOk({
                sequenceName: seq.name,
                sequenceId: seq.sequenceID,
                fps: fps,
                markers: list,
                skippedPointMarkers: skipped
            });
        } catch (e) {
            return mmeErr(e.toString() + (e.line ? ' (строка ' + e.line + ')' : ''));
        }
    },

    getExtension: function (presetPath) {
        try {
            var seq = app.project.activeSequence;
            if (!seq) return mmeErr('Нет активной секвенции.');
            var ext = seq.getExportFileExtension(presetPath);
            return mmeOk(ext ? String(ext).replace(/^\./, '') : '');
        } catch (e) {
            return mmeErr(e.toString());
        }
    },

    selectFolder: function (title) {
        var f = Folder.selectDialog(title || 'Папка для сохранения');
        return mmeOk(f ? f.fsName : '');
    },

    selectPreset: function () {
        var f = File.openDialog('Выберите пресет Media Encoder', 'Пресеты AME:*.epr');
        return mmeOk(f ? f.fsName : '');
    },

    beginBatch: function (outputFolder) {
        try {
            var seq = app.project.activeSequence;
            if (!seq) return mmeErr('Нет активной секвенции.');

            var folder = new Folder(outputFolder);
            if (!folder.exists && !folder.create()) {
                return mmeErr('Не удалось создать папку: ' + outputFolder);
            }

            app.encoder.launchEncoder();

            $._MME.batchState = {
                sequenceId: seq.sequenceID,
                inTicks: String(seq.getInPointAsTime().ticks),
                outTicks: String(seq.getOutPointAsTime().ticks)
            };
            return mmeOk(true);
        } catch (e) {
            return mmeErr(e.toString());
        }
    },

    queueOne: function (argsJson) {
        try {
            var a = mmeParse(argsJson);
            var seq = app.project.activeSequence;
            if (!seq) return mmeErr('Нет активной секвенции.');
            if ($._MME.batchState && seq.sequenceID !== $._MME.batchState.sequenceId) {
                return mmeErr('Активная секвенция сменилась во время экспорта.');
            }

            mmeSetRange(seq, a.startTicks, a.endTicks);

            var jobId = app.encoder.encodeSequence(
                seq,
                a.outputPath,
                a.presetPath,
                app.encoder.ENCODE_IN_TO_OUT,
                a.removeOnCompletion ? 1 : 0
            );
            if (!jobId || jobId === '0') return mmeErr('Media Encoder отклонил задание.');
            return mmeOk(String(jobId));
        } catch (e) {
            return mmeErr(e.toString());
        }
    },

    endBatch: function (startRender) {
        var restoreError = null;
        try {
            var st = $._MME.batchState;
            var seq = app.project.activeSequence;
            if (st && seq && seq.sequenceID === st.sequenceId &&
                Number(st.inTicks) >= 0 && Number(st.outTicks) > Number(st.inTicks)) {
                mmeSetRange(seq, st.inTicks, st.outTicks);
            }
        } catch (e) {
            restoreError = e.toString();
        }
        $._MME.batchState = null;

        try {
            if (startRender) app.encoder.startBatch();
        } catch (e2) {
            return mmeErr('Задания в очереди, но рендер не запустился: ' + e2.toString());
        }
        if (restoreError) return mmeErr('Не удалось восстановить In/Out секвенции: ' + restoreError);
        return mmeOk(true);
    }
};
