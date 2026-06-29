// Self-contained i18n for the Karaoke tool.
// Keeps ru/en/es strings co-located so the cabinet locale files stay clean.
// Active locale is derived from the cabinet's vue-i18n locale (see useKaraokeT).

export type KaraokeLang = 'ru' | 'en' | 'es'

export interface KaraokeTranslations {
  onboarding: {
    title: string
    subtitle: string
    features: string[]
    start: string
  }
  upload: {
    title: string
    subtitle: string
    dropzone: string
    selected: string
    next: string
    invalid: string
  }
  info: {
    title: string
    artist: string
    artistPlaceholder: string
    track: string
    trackPlaceholder: string
    lyrics: string
    lyricsPlaceholder: string
    linesCount: string
    hintTitle: string
    hintRules: string[]
    hintExample: string
    next: string
    back: string
  }
  sync: {
    tutorial: {
      title: string
      step1: string
      step2: string
      step3: string
      step4: string
      step5: string
      got_it: string
    }
    hint: string
    undo: string
    complete: string
    back: string
    tap: string
    hold: string
  }
  export: {
    done: string
    synced: string
    of: string
    lines: string
    preview: string
    stop: string
    timings: string
    download: string
    newProject: string
  }
  settings: {
    title: string
    language: string
    theme: string
    light: string
    dark: string
  }
}

export const karaokeTranslations: Record<KaraokeLang, KaraokeTranslations> = {
  ru: {
    onboarding: {
      title: 'Караоке Тайминг',
      subtitle: 'Создавайте профессиональные тайминги для караоке за минуты',
      features: [
        'Загрузите аудио трек',
        'Введите текст песни',
        'Синхронизируйте зажатием кнопки',
        'Экспортируйте в TTML или LRC',
      ],
      start: 'Начать',
    },
    upload: {
      title: 'Загрузите трек',
      subtitle: 'WAV, MP3 или любой аудио файл',
      dropzone: 'Нажмите или перетащите',
      selected: 'Выбран файл',
      next: 'Далее',
      invalid: 'Загрузите аудиофайл (MP3, WAV, M4A и т.д.)',
    },
    info: {
      title: 'Информация о треке',
      artist: 'Исполнитель',
      artistPlaceholder: 'Название артиста или группы',
      track: 'Название трека',
      trackPlaceholder: 'Название песни',
      lyrics: 'Текст песни',
      lyricsPlaceholder: 'Вставьте текст песни (каждая строка отдельно)',
      linesCount: 'строк',
      hintTitle: 'Правила оформления текста',
      hintRules: [
        'Каждая строка = одна фраза для синхронизации',
        'Знаки препинания в конце удаляются, кроме скобок, ! и ?',
        'Первая буква каждой строки станет заглавной',
        'Пустые строки игнорируются',
      ],
      hintExample: 'Пример:\nhello world,\nэто тест!\n\nСтанет:\nHello world\nЭто тест!',
      next: 'Далее',
      back: 'Назад',
    },
    sync: {
      tutorial: {
        title: '📖 Как синхронизировать',
        step1: 'Нажмите <accent>▶ Play</accent> чтобы включить песню',
        step2: 'Когда начинается строка — <accent>зажмите</accent> кнопку и держите',
        step3: 'Когда строка закончилась — <accent>отпустите</accent> кнопку',
        step4: 'Повторяйте для каждой строки до конца песни',
        step5: 'В конце можно <accent>подправить</accent> тайминги вручную',
        got_it: 'Понятно, начнём!',
      },
      hint: 'Нажмите Play, затем зажмите кнопку на время строки',
      undo: 'Отмена',
      complete: 'Готово! Экспортировать',
      back: 'Назад',
      tap: 'ЖАТЬ',
      hold: 'зажми',
    },
    export: {
      done: 'Готово!',
      synced: 'Синхронизировано',
      of: 'из',
      lines: 'строк',
      preview: 'Превью',
      stop: 'Остановить',
      timings: 'Тайминги (начало → конец)',
      download: 'Скачать',
      newProject: 'Новый проект',
    },
    settings: {
      title: 'Настройки',
      language: 'Язык',
      theme: 'Тема',
      light: 'Светлая',
      dark: 'Тёмная',
    },
  },

  en: {
    onboarding: {
      title: 'Karaoke Timing',
      subtitle: 'Create professional karaoke timings in minutes',
      features: [
        'Upload audio track',
        'Enter song lyrics',
        'Sync by holding the button',
        'Export to TTML or LRC',
      ],
      start: 'Start',
    },
    upload: {
      title: 'Upload Track',
      subtitle: 'WAV, MP3 or any audio file',
      dropzone: 'Click or drag & drop',
      selected: 'Selected file',
      next: 'Next',
      invalid: 'Please upload an audio file (MP3, WAV, M4A, etc.)',
    },
    info: {
      title: 'Track Information',
      artist: 'Artist',
      artistPlaceholder: 'Artist or band name',
      track: 'Track Name',
      trackPlaceholder: 'Song title',
      lyrics: 'Lyrics',
      lyricsPlaceholder: 'Paste song lyrics (each line separately)',
      linesCount: 'lines',
      hintTitle: 'Text formatting rules',
      hintRules: [
        'Each line = one phrase to sync',
        'Trailing punctuation is removed — except parentheses, ! and ?',
        'First letter of each line is capitalized',
        'Empty lines are ignored',
      ],
      hintExample: 'Example:\nhello world,\nthis is a test!\n\nBecomes:\nHello world\nThis is a test!',
      next: 'Next',
      back: 'Back',
    },
    sync: {
      tutorial: {
        title: '📖 How to Sync',
        step1: 'Press <accent>▶ Play</accent> to start the song',
        step2: 'When a line starts — <accent>hold</accent> the button',
        step3: 'When the line ends — <accent>release</accent> the button',
        step4: 'Repeat for each line until the end',
        step5: 'You can <accent>fine-tune</accent> timings at the end',
        got_it: "Got it, let's go!",
      },
      hint: 'Press Play, then hold the button for each line',
      undo: 'Undo',
      complete: 'Done! Export',
      back: 'Back',
      tap: 'TAP',
      hold: 'hold',
    },
    export: {
      done: 'Done!',
      synced: 'Synced',
      of: 'of',
      lines: 'lines',
      preview: 'Preview',
      stop: 'Stop',
      timings: 'Timings (start → end)',
      download: 'Download',
      newProject: 'New Project',
    },
    settings: {
      title: 'Settings',
      language: 'Language',
      theme: 'Theme',
      light: 'Light',
      dark: 'Dark',
    },
  },

  es: {
    onboarding: {
      title: 'Karaoke Timing',
      subtitle: 'Crea tiempos profesionales de karaoke en minutos',
      features: [
        'Sube la pista de audio',
        'Ingresa la letra de la canción',
        'Sincroniza manteniendo el botón',
        'Exporta a TTML o LRC',
      ],
      start: 'Comenzar',
    },
    upload: {
      title: 'Subir Pista',
      subtitle: 'WAV, MP3 o cualquier archivo de audio',
      dropzone: 'Haz clic o arrastra',
      selected: 'Archivo seleccionado',
      next: 'Siguiente',
      invalid: 'Sube un archivo de audio (MP3, WAV, M4A, etc.)',
    },
    info: {
      title: 'Información de la Pista',
      artist: 'Artista',
      artistPlaceholder: 'Nombre del artista o grupo',
      track: 'Nombre de la Pista',
      trackPlaceholder: 'Título de la canción',
      lyrics: 'Letra',
      lyricsPlaceholder: 'Pega la letra (cada línea por separado)',
      linesCount: 'líneas',
      hintTitle: 'Reglas de formato del texto',
      hintRules: [
        'Cada línea = una frase para sincronizar',
        'La puntuación final se elimina, salvo paréntesis, ! y ?',
        'La primera letra de cada línea se pone en mayúscula',
        'Las líneas vacías se ignoran',
      ],
      hintExample: 'Ejemplo:\nhello world,\nesto es una prueba!\n\nQueda:\nHello world\nEsto es una prueba!',
      next: 'Siguiente',
      back: 'Atrás',
    },
    sync: {
      tutorial: {
        title: '📖 Cómo Sincronizar',
        step1: 'Presiona <accent>▶ Play</accent> para iniciar la canción',
        step2: 'Cuando empiece una línea — <accent>mantén</accent> el botón',
        step3: 'Cuando termine la línea — <accent>suelta</accent> el botón',
        step4: 'Repite para cada línea hasta el final',
        step5: 'Puedes <accent>ajustar</accent> los tiempos al final',
        got_it: '¡Entendido, vamos!',
      },
      hint: 'Presiona Play, luego mantén el botón para cada línea',
      undo: 'Deshacer',
      complete: '¡Listo! Exportar',
      back: 'Atrás',
      tap: 'PULSA',
      hold: 'mantén',
    },
    export: {
      done: '¡Listo!',
      synced: 'Sincronizadas',
      of: 'de',
      lines: 'líneas',
      preview: 'Vista previa',
      stop: 'Detener',
      timings: 'Tiempos (inicio → fin)',
      download: 'Descargar',
      newProject: 'Nuevo Proyecto',
    },
    settings: {
      title: 'Ajustes',
      language: 'Idioma',
      theme: 'Tema',
      light: 'Claro',
      dark: 'Oscuro',
    },
  },
}
