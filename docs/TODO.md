# TODO

Задачи, выявленные в ходе работы, но отложенные.

## Инфраструктура

### CI publish fix (E403)
`publish.yml` workflow имеет `permissions: packages: write`, но GitHub org/repo-level settings блокируют `GITHUB_TOKEN` write_package. Текущий workaround — локальный `npm publish` с токеном из `~/.npmrc`.

**Действие:** В GitHub Settings → Actions → General → Workflow permissions включить "Read and write permissions". Или настроить fine-grained PAT в secrets.

### Тесты
38 из 104 test files падают из-за кастомизаций форка. Тесты не включены в CI.

**Действие:** Приоритизировать фиксы тестов для критических модулей (straighten, Minimap, drop handler). Добавить минимальный test suite в CI.

## Фичи для доработки

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

## Техдолг (из предыдущих сессий)

- Голый `FIXME` без описания (`App.tsx:8859`)
- Дублированные HACK guards для transform handles (`App.tsx:7205`, `App.tsx:8373`)
- Undo через KeyboardEvent в других частях кода (проверить, есть ли ещё)
- `any`-типизация интеграции (excalidraw adapter `as any` casts)
