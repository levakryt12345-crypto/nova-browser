# Nova Browser

Минималистичный десктопный браузер на базе Chromium (Electron) для Windows.
Реальный движок рендеринга: каждая вкладка — отдельный `WebContentsView` Chromium, поэтому
сайты, JavaScript, формы, загрузки и вкладки работают «по-настоящему».

## Документация и установка

Сайт документации опубликован на GitHub Pages: <https://levakryt12345-crypto.github.io/nova-browser/>
(папка `docs/`, ветка `main`, включается в Settings → Pages → Deploy from a branch).

- `docs/downloads/NovaBrowser-1.0.0-portable.exe` — версия для Windows
- `docs/downloads/NovaMobile-1.0.0.zip` — отдельная мобильная версия (PWA, Android/iOS)
- `docs/mobile/` — Nova Mobile онлайн: адресная строка, быстрые переходы, офлайн-режим

## Мобильная версия (Android)

- `docs/mobile/` — Nova Mobile (PWA): устанавливается на главный экран как приложение
- `android/` — нативный WebView-браузер на Java (Gradle). APK собирается на GitHub Actions
  (`.github/workflows/android.yml`), при теге `v*` публикуется в Releases

## Возможности

- Несколько вкладок (Ctrl+T — новая, Ctrl+W — закрыть, Ctrl+1…9 — переключение, средняя кнопка мыши — закрыть)
- Адресная строка: ввод URL или поисковой запрос (поисковик настраивается)
- Навигация: назад/вперёд/перезагрузить/домой (Alt+Left / Alt+Right / Ctrl+R)
- Закладки (Ctrl+D — добавить, Ctrl+B — панель) и история посещений (Ctrl+H), с поиском и удалением
- Загрузка файлов: автосохранение в папку «Загрузки», прогресс, пауза/возобновление/отмена, «показать в папке» (Ctrl+J)
- Настройки: стартовая страница, поисковик по умолчанию (Google/Bing/DuckDuckGo/Яндекс), тема (светлая/тёмная/системная)
- Собственный заголовок окна: сворачивание, разворот, закрытие; перетаскивание окна за верхнюю панель
- Новые окна (`target="_blank"`, `window.open`) открываются во вкладках
- Контекстное меню в страницах, F12 — инструменты разработчика, F11 — полный экран, масштабирование Ctrl+/−

## Структура проекта

```
NovaBrowser/
├── package.json            # зависимости и скрипты
├── .github/workflows/      # CI: сборка APK (android.yml), деплой сайта (pages.yml)
├── android/                # нативная мобильная версия (WebView-браузер, Java/Gradle)
├── docs/                   # сайт документации (+ downloads/, mobile/ — Nova Mobile PWA)
├── scripts/
│   └── generate-icon.js    # генерация иконки (PNG + ICO) без внешних зависимостей
├── assets/                 # сгенерированная иконка (icon.png, icon.ico)
├── src/
│   ├── main/
│   │   ├── main.js         # главный процесс: окно, вкладки, загрузки, меню, IPC
│   │   └── store.js        # хранение закладок/истории/настроек (JSON в userData)
│   ├── preload/
│   │   └── preload.js      # безопасный мост IPC (contextBridge)
│   └── renderer/
│       ├── index.html      # разметка интерфейса (главное окно и попапы)
│       ├── style.css       # темы (тёмная/светлая) и стили
│       └── app.js          # логика UI: вкладки, адресная строка, попапы
└── build/                  # результат сборки (electron-builder)
```

## Запуск из исходников

```bash
npm install
npm start
```

## Проверка без сборки

```bash
npm run verify        # открывает example.com, делает скриншот verify.png и выходит
```

## Сборка .exe

```bash
npm run dist
```

Готовый портативный исполняемый файл появится в `build/NovaBrowser-1.0.0-portable.exe`.
Портативный формат не требует установки: файл можно скопировать куда угодно.

Установка на рабочий стол (копирование .exe + ярлык с иконкой) выполняется скриптом
`scripts/install.ps1` или вручную командами PowerShell:

```powershell
Copy-Item build\NovaBrowser-1.0.0-portable.exe "$env:USERPROFILE\Desktop\Nova Browser.exe"
$ws = New-Object -ComObject WScript.Shell
$lnk = $ws.CreateShortcut("$env:USERPROFILE\Desktop\Nova Browser.lnk")
$lnk.TargetPath = "$env:USERPROFILE\Desktop\Nova Browser.exe"
$lnk.IconLocation = "$env:USERPROFILE\Desktop\Nova Browser.exe,0"
$lnk.Save()
```

## Где хранятся данные

- `%APPDATA%\Nova Browser\settings.json` — настройки
- `%APPDATA%\Nova Browser\bookmarks.json` — закладки
- `%APPDATA%\Nova Browser\history.json` — история

В режиме разработки (`npm start`) используется `%APPDATA%\nova-browser`.

## Требования для сборки

- Node.js 18+ и npm
- Windows 10/11 x64
- Интернет (npm registry, GitHub Releases для бинарников Electron)

## Технологии

- Electron 43 (Chromium 13x) — движок
- `WebContentsView` — вкладки
- electron-builder — сборка портативного .exe
- Чистый HTML/CSS/JS без фреймворков — интерфейс