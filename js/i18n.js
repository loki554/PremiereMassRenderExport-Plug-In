/*
 * Mass Marker Export — UI localisation.
 * The panel follows the Premiere Pro interface language (appUILocale from the CEP host
 * environment). Languages without a dictionary fall back to English.
 *
 * To add a language: copy the `en` block, translate the values and register it under
 * its two-letter code (the part of the Premiere locale before "_", e.g. "de" for de_DE).
 */
(function () {
    'use strict';

    var DICTIONARIES = {
        en: {
            'markers.title': 'Markers',
            'markers.refresh': 'Refresh',
            'markers.refreshTip': 'Re-read the markers of the active sequence',
            'markers.color': 'Color:',
            'markers.all': 'all',
            'markers.noData': 'No data. Click "Refresh".',
            'markers.noneOfColor': 'No markers of the selected color.',
            'markers.noneWithDuration': 'The sequence has no markers with a duration.',
            'markers.allColors': 'All colors',
            'col.file': 'File name',
            'col.in': 'In',
            'col.duration': 'Dur.',
            'summary.selected': 'To export: {n} of {total}',
            'summary.skipped': ' · point markers skipped: {n}',

            'color.0': 'Green',
            'color.1': 'Red',
            'color.2': 'Purple',
            'color.3': 'Orange',
            'color.4': 'Yellow',
            'color.5': 'White',
            'color.6': 'Blue',
            'color.7': 'Cyan',

            'warn.noName': 'the marker has no name',
            'warn.invalidChars': 'invalid characters removed',
            'warn.duplicate': 'duplicate name → {name}',
            'tip.marker': 'Marker: {name}',
            'tip.unnamed': '(unnamed)',
            'tip.comment': 'Comment: {text}',
            'tip.out': 'Out: {tc}',

            'preset.title': 'Media Encoder preset',
            'preset.reloadTip': 'Reload the preset list',
            'preset.search': 'Search presets…',
            'preset.browse': '.epr file…',
            'preset.none': 'No presets found',
            'preset.groupUser': 'My presets',
            'preset.groupSystem': 'System · {format}',
            'preset.groupCustom': 'Selected file',
            'preset.formatOther': 'Other',
            'dialog.presetTitle': 'Choose a Media Encoder preset',
            'dialog.presetFilter': 'Media Encoder presets',

            'output.title': 'Output folder',
            'output.browse': 'Browse…',
            'dialog.folderTitle': 'Folder for the rendered files',

            'opt.start': 'Start rendering in Media Encoder right away',
            'opt.remove': 'Remove jobs from the queue when they finish',
            'opt.noOverwrite': "Don't overwrite: add a suffix if the file already exists",

            'export.button': 'Send to Media Encoder',
            'export.buttonCount': 'Send to Media Encoder ({n})',

            'log.found': 'Found {n} ranges in "{sequence}"',
            'log.presets': 'Presets: {user} custom, {system} system',
            'log.presetsNoSystem': ' (Media Encoder system presets folder not found)',
            'log.sending': 'Sending {n} ranges to Media Encoder…',
            'log.noExtension': "Couldn't determine the file extension for this preset; Media Encoder will add it.",
            'log.done': 'Done: {queued} queued.',
            'log.doneWithFailures': 'Done: {queued} queued, {failed} failed.',
            'log.renderStarted': ' Rendering started in Media Encoder.',
            'log.startQueue': ' Start the queue in Media Encoder.',
            'log.error': 'Error: {detail}',

            'err.refreshFirst': 'Refresh the marker list first.',
            'err.nothingChecked': 'No ranges are selected for export.',
            'err.noPreset': 'Choose an existing preset (.epr).',
            'err.noFolder': 'Choose an output folder.',
            'err.relativeFolder': 'The folder path must be absolute.',
            'err.mkdir': "Couldn't create the folder: {detail}",
            'err.extendscript': 'ExtendScript error: {detail}',

            'host.NO_PROJECT': 'No project is open.',
            'host.NO_SEQUENCE': 'No active sequence. Open a sequence in the timeline.',
            'host.EXCEPTION': '{detail}',
            'host.EXCEPTION_LINE': '{detail} (line {line})',
            'host.MKDIR_FAILED': "Couldn't create the folder: {detail}",
            'host.SEQUENCE_CHANGED': 'The active sequence changed during the export.',
            'host.JOB_REJECTED': 'Media Encoder rejected the job.',
            'host.START_FAILED': "The jobs are queued, but rendering didn't start: {detail}",
            'host.RESTORE_FAILED': "Couldn't restore the sequence In/Out points: {detail}"
        },

        ru: {
            'markers.title': 'Маркеры',
            'markers.refresh': 'Обновить',
            'markers.refreshTip': 'Перечитать маркеры активной секвенции',
            'markers.color': 'Цвет:',
            'markers.all': 'все',
            'markers.noData': 'Нет данных. Нажмите «Обновить».',
            'markers.noneOfColor': 'Нет маркеров выбранного цвета.',
            'markers.noneWithDuration': 'В секвенции нет маркеров с длительностью.',
            'markers.allColors': 'Все цвета',
            'col.file': 'Имя файла',
            'col.in': 'In',
            'col.duration': 'Длит.',
            'summary.selected': 'К экспорту: {n} из {total}',
            'summary.skipped': ' · пропущено точечных маркеров: {n}',

            'color.0': 'Зелёный',
            'color.1': 'Красный',
            'color.2': 'Фиолетовый',
            'color.3': 'Оранжевый',
            'color.4': 'Жёлтый',
            'color.5': 'Белый',
            'color.6': 'Синий',
            'color.7': 'Голубой',

            'warn.noName': 'у маркера нет имени',
            'warn.invalidChars': 'недопустимые символы удалены',
            'warn.duplicate': 'повтор имени → {name}',
            'tip.marker': 'Маркер: {name}',
            'tip.unnamed': '(без имени)',
            'tip.comment': 'Комментарий: {text}',
            'tip.out': 'Out: {tc}',

            'preset.title': 'Пресет Media Encoder',
            'preset.reloadTip': 'Перечитать список пресетов',
            'preset.search': 'Поиск пресета…',
            'preset.browse': 'Файл .epr…',
            'preset.none': 'Пресеты не найдены',
            'preset.groupUser': 'Мои пресеты',
            'preset.groupSystem': 'Системные · {format}',
            'preset.groupCustom': 'Выбранный файл',
            'preset.formatOther': 'Другое',
            'dialog.presetTitle': 'Выберите пресет Media Encoder',
            'dialog.presetFilter': 'Пресеты Media Encoder',

            'output.title': 'Папка вывода',
            'output.browse': 'Обзор…',
            'dialog.folderTitle': 'Папка для сохранения файлов',

            'opt.start': 'Сразу запустить рендер в Media Encoder',
            'opt.remove': 'Удалять задания из очереди после завершения',
            'opt.noOverwrite': 'Не перезаписывать: добавлять суффикс, если файл уже есть',

            'export.button': 'Отправить в Media Encoder',
            'export.buttonCount': 'Отправить в Media Encoder ({n})',

            'log.found': 'Найдено отрезков: {n} в «{sequence}»',
            'log.presets': 'Пресеты: своих {user}, системных {system}',
            'log.presetsNoSystem': ' (папка системных пресетов Media Encoder не найдена)',
            'log.sending': 'Отправка отрезков в Media Encoder: {n}…',
            'log.noExtension': 'Не удалось определить расширение файла для пресета — Media Encoder подставит его сам.',
            'log.done': 'Готово: в очереди {queued}.',
            'log.doneWithFailures': 'Готово: в очереди {queued}, с ошибкой {failed}.',
            'log.renderStarted': ' Рендер запущен в Media Encoder.',
            'log.startQueue': ' Запустите очередь в Media Encoder.',
            'log.error': 'Ошибка: {detail}',

            'err.refreshFirst': 'Сначала обновите список маркеров.',
            'err.nothingChecked': 'Нет отмеченных отрезков для экспорта.',
            'err.noPreset': 'Выберите существующий пресет (.epr).',
            'err.noFolder': 'Укажите папку для сохранения.',
            'err.relativeFolder': 'Путь к папке должен быть абсолютным.',
            'err.mkdir': 'Не удалось создать папку: {detail}',
            'err.extendscript': 'Ошибка ExtendScript: {detail}',

            'host.NO_PROJECT': 'Нет открытого проекта.',
            'host.NO_SEQUENCE': 'Нет активной секвенции. Откройте секвенцию на таймлайне.',
            'host.EXCEPTION': '{detail}',
            'host.EXCEPTION_LINE': '{detail} (строка {line})',
            'host.MKDIR_FAILED': 'Не удалось создать папку: {detail}',
            'host.SEQUENCE_CHANGED': 'Активная секвенция сменилась во время экспорта.',
            'host.JOB_REJECTED': 'Media Encoder отклонил задание.',
            'host.START_FAILED': 'Задания в очереди, но рендер не запустился: {detail}',
            'host.RESTORE_FAILED': 'Не удалось восстановить In/Out секвенции: {detail}'
        }
    };

    // Premiere reports its interface language as e.g. "ru_RU" or "en_US".
    function detectLocale() {
        try {
            var env = JSON.parse(window.__adobe_cep__.getHostEnvironment());
            if (env.appUILocale) return env.appUILocale;
            if (env.appLocale) return env.appLocale;
        } catch (e) { }
        return (window.navigator && window.navigator.language) || 'en_US';
    }

    var locale = detectLocale();
    var lang = String(locale).split(/[_-]/)[0].toLowerCase();
    if (!DICTIONARIES[lang]) lang = 'en';
    var dict = DICTIONARIES[lang];

    function t(key, params) {
        var s = dict.hasOwnProperty(key) ? dict[key] : DICTIONARIES.en[key];
        if (s === undefined) return key;
        return s.replace(/\{(\w+)\}/g, function (m, name) {
            return params && params[name] !== undefined ? String(params[name]) : m;
        });
    }

    // Translates static markup: data-i18n (text), data-i18n-title, data-i18n-placeholder.
    function apply(root) {
        root = root || document;
        document.documentElement.lang = lang;
        Array.prototype.forEach.call(root.querySelectorAll('[data-i18n]'), function (node) {
            node.textContent = t(node.getAttribute('data-i18n'));
        });
        Array.prototype.forEach.call(root.querySelectorAll('[data-i18n-title]'), function (node) {
            node.title = t(node.getAttribute('data-i18n-title'));
        });
        Array.prototype.forEach.call(root.querySelectorAll('[data-i18n-placeholder]'), function (node) {
            node.placeholder = t(node.getAttribute('data-i18n-placeholder'));
        });
    }

    window.MME_I18N = { t: t, apply: apply, lang: lang, locale: locale };
})();
