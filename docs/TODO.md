# TODO

Задачи, выявленные в ходе работы, но отложенные.

## Инфраструктура

### CI publish fix (E403)

`publish.yml` workflow имеет `permissions: packages: write`, но GitHub org/repo-level settings блокируют `GITHUB_TOKEN` write_package. Текущий workaround — локальный `npm publish` с токеном из `~/.npmrc`.

**Действие:** В GitHub Settings → Actions → General → Workflow permissions включить "Read and write permissions". Или настроить fine-grained PAT в secrets.

**Статус (2026-03-20):** CI publish работает — проблема решена.

### Тесты

38 из 104 test files падают из-за кастомизаций форка. Тесты не включены в CI.

**Действие:** Приоритизировать фиксы тестов для критических модулей (straighten, Minimap, drop handler). Добавить минимальный test suite в CI.

### Runtime-загрузка excalidraw

Сейчас каждое изменение в excalidraw требует publish → npm install → redeploy billion-dollars. Хочется чтобы обновления доски применялись без редеплоя основного приложения.

**Варианты:**

- Dynamic import с CDN (micro-frontend подход)
- Отдельный CDN-хостинг для excalidraw бандла
- Версионирование через URL

## Фичи для доработки

### Автозамыкание: gap при крупных полигонах

При рисовании крупных полигонов (>400px) gap между start и end может превышать 30px порог (`STRAIGHTEN_CLOSE_THRESHOLD`), и замыкание не срабатывает. Увеличение порога до 50px и overlap-хак (перекрытие точек) давали визуально худший результат — откачено.

**Нужно:** Найти правильный подход к замыканию, который не добавляет лишних визуальных артефактов. Возможные направления:

- Рендерер-уровень: убрать start/end caps для замкнутых freedraw
- Адаптивный порог на основе размера фигуры (но с верхней границей)
- Контрактить только хвостовые 10% точек, а не все

### Hold-to-straighten: остаточное сжатие кривых

Moving average с radius=3 минимально режет углы на крутых изгибах. Практически незаметно, но теоретически можно улучшить:

- Вариант A: adaptive radius (меньше на крутых поворотах)
- Вариант B: Chaikin smoothing (subdivision вместо averaging)
- Вариант C: оставить как есть (текущее качество приемлемо)

### Hold-to-straighten: визуальная обратная связь

Сейчас спрямление начинается без предупреждения. Можно добавить:

- Subtle UI indicator когда таймер 500ms тикает (например, pulse на курсоре)
- Вибрация на мобилке при срабатывании

### Minimap: performance на больших сценах

Текущая реализация перерисовывает все элементы на каждое изменение scroll/zoom. На сценах с 1000+ элементов может тормозить.

- Кэшировать отрисованные элементы в offscreen canvas
- Обновлять только viewport rectangle при scroll/zoom
- Перерисовывать элементы только при изменении scene nonce

### Drag & drop: мобильный fallback

HTML5 Drag & Drop не работает на touch устройствах. Для мобилок:

- Вариант A: long-press → copy to clipboard → paste на доске
- Вариант B: кнопка "Добавить на доску" на каждой картинке
- Вариант C: оставить только для десктопа (текущее решение)

### Drag & drop: CORS fallback

Если Supabase storage URLs изменят CORS policy, `ImageURLToFile` fetch упадёт.

- Добавить fallback через API proxy в billion-dollars
- Мониторить ошибки fetch в handleAppOnDrop

## Техдолг

- Голый `FIXME` без описания (`App.tsx:8859`)
- Дублированные HACK guards для transform handles (`App.tsx:7205`, `App.tsx:8373`)
- Undo через KeyboardEvent в других частях кода (проверить, есть ли ещё)
- `any`-типизация интеграции (excalidraw adapter `as any` casts)
- `wasStraightened` — мёртвый код после внедрения transform mode (никогда не устанавливается в `true`). Удалить вместе с проверкой в pointerUp.
- `STRAIGHTEN_MOVE_THRESHOLD` и `STRAIGHTEN_MOVE_THRESHOLD_TOUCH` — мёртвые константы, объявлены но нигде не используются. Удалить.

## Выполнено (2026-03-20)

- [x] **Иконка миникарты** — заменена с пейзажа на сложенную карту, активное состояние светлее (`icons.tsx`, `Minimap.scss`)
- [x] **Snap-to-first магнетизм** — линии замыкаются в полигон без grid snap, 20px порог + визуальный индикатор (`linearElementEditor.ts`, `interactiveScene.ts`)
- [x] **Умное сглаживание** — corner detection (окно 6, порог 35°), per-segment решение (deviation check), density filter (`straighten.ts`)
- [x] **Автозамыкание freedraw** — gap < 30px → ease-out стягивание (`contractToClose` в `straighten.ts`)
- [x] **Transform после спрямления** — Procreate-style rotate/scale, centroid для замкнутых, нормализация точек (`App.tsx`)
- [x] **Per-segment straighten/smooth** — прямые рёбра спрямляются, кривые сглаживаются (не глобально)
- [x] **TS narrowing fix** — `editingLinearElement` в `interactiveScene.ts` (forEach callback)
