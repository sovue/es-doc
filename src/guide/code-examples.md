# Руководства с примерами кода

[[toc]]

## Включение режима разработчика

Будут доступны команды:

- `Shift + D` - меню разработчика
- `Shift + O` - консоль

::: warning
Для того чтобы игра распознала сочетания клавиш, нужно переключиться на **латинскую раскладку клавиатуры**.
:::

```renpy
init:
    $ config.developer = True
```

## Автоматическое объявление файлов

Данный отрезок кода автообъявляет все изображения и звуки вашего мода, опираясь на его идентификатор. Поддерживается автообъявление "цельных" спрайтов.

::: tip
"Цельным" спрайтом называется спрайт, у которого тело, одежда, эмоция и прочее идёт одним изображением, а не каждая часть спрайта отдельно, как в БЛ.
:::

В данном отрезке кода необходимо присвоить:

1. Переменной `MOD_ID` идентификатор мода (см. [Объявление мода](/guide/#объявление-мода))
2. Переменной `MOD_NAME` имя мода
3. Переменной `COLOR_SPRITES` значение `True`, если хотите раскрашивать спрайты в зависимости от времени суток.

::: warning
Для того, чтобы пункт 3 сработал, нужно хранить спрайты в папке `sprites`.
:::

<a href="/src/.vuepress/public/code/scripts/defineAssets.rpy" download>Скачать скрипт</a>

<<< @/src/.vuepress/public/code/scripts/defineAssets.rpy

## Продолжение проигрывания с момента остановки

Данный отрезок позволяет приостановить приостановить проигрыш музыки или звука на определённом отрезке, чтобы позже можно было её снова воспроизвести с места остановки.

<a href="/src/.vuepress/public/code/scripts/playerPause.rpy" download>Скачать скрипт</a>

<<< @/src/.vuepress/public/code/scripts/playerPause.rpy

Пример использования:

```renpy
label test:
    "Запуск проигрывания музыки..."
    play music music_list["lets_be_friends"]
    "Создание класса..."
    $ player = PlayerPause("music") # Присваиваем переменной "player" класс "PlayerPause" для канала "music".
    "Пауза..."
    $ player.pause(3) # Приостанавливаем воспроизведение.
    "Что-то происходит в сценарии..."
    "Продолжение..."
    $ player.resume(2) # Возобновляем произведение с места остановки, с входом музыки (fadein) в 2 секунды
    # $ renpy.music.play("<from {}>{}".format(player.getTime(), player.getFile()), fadein=3)
    "Аудио будет воспроизведено с момента остановки..."
    return
```

## Эффект падающих частиц

В коде игры уже предусмотрено использование частиц - снега. Имеются два варианта:

- `snow` - `image snow = Snow("images/anim/snow.png")`.
- `heavy_snow` - `image heavy_snow = Snow("images/anim/snow.png", max_particles=500)`.

Эти два варианта уже объявлены в игре глобально и могут использоваться как [изображение](https://www.renpy.org/doc/html/displaying_images.html#image) объявленное с помощью [`Image Statement`](https://www.renpy.org/doc/html/displaying_images.html#image-statement).

Пример использования из игры:

```renpy{5-6,11-12}
label epilogue_sl:
    "..."
    window hide
    scene bg bus_stop
    show snow
    with fade2
    window show
    "..."
    window hide
    hide snow
    show heavy_snow
    with fade
    window show
```

Вы также можете создать изображение со своими частицами (например, каплями дождя):

```renpy
define image rain = Snow("<путь к изображению>", max_particles=50, speed=150, wind=100, xborder=(0,100), yborder=(50,400))
```

В примере выше указаны параметры, заданные по умолчанию. Вы можете изменить их по вашему желанию:

- `image`: `String` - путь к изображению, которое будет использоваться как частица.
- `max_particles`: `Int` - максимальное количество частиц одновременно на экране.
- `speed`: `Float` - скорость вертикального полёта частиц. Чем больше значение, тем быстрее частицы будут падать.
- `wind`: `Float` - максимальная сила ветра, которая будет взаимодействовать с частицами.
- `xborder`: `(min: Int, max: Int): Tuple` - **горизонтальные** границы, в которых будут случайно появляться частицы. По умолчанию - весь экран.
- `yborder`: `(min: Int, max: Int): Tuple` - **вертикальные** границы, в которых будут случайно появляться частицы. По умолчанию - весь экран.

::: details Реализация функции `Snow` в игре

<a href="/src/.vuepress/public/code/scripts/snow.rpy" download>Скачать скрипт</a>

<<< @/src/.vuepress/public/code/scripts/snow.rpy
:::

## Отображение музыки, играющей в данный момент

Заполняем словарь `music_data` путём до трека и его названием, что будет отображаться при использовании DynamicDisplayable-функции.
У нас примером выступит Between August and December - Pile.

Объявляем функцию как изображение, делая DynamicDisplayable.
Теперь, если на канале `music` будет проигрываться какой-либо трек и путь до него будет указан в нашем словаре `music_data`, то появится его название (что мы также указали в словаре).

1. Объявляем словарь, где ключ - путь до файла, а значение это его название, которое будет выводиться.

```renpy
init python:
    music_data = {"sound/music/pile.ogg": "Between August and December - Pile"}
    # Словарь с музыкой
    # Ключ словаря - путь до трека. Значение - название трека
    # Ключ — 'sound/music/pile.ogg', Значение — 'Between August and December - Pile'
```

2. Создаём функцию, что будет отвечать за вывод на экран текста.

```renpy
init python:
    def show_music(text, time):
        """
        Функция показа играемого трека
        Две локальных переменных обязательны, чтобы могли возвращать текст с играемым треком и время ожидания перед повторным вызовом функции.
        В time будем возвращать .1, чтобы не было времени ожидания перед ещё одним вызовом функции.
        """
        music_is_play = renpy.music.is_playing(
            channel="music"
        )  # Узнаём, играет ли сейчас музыка в канале 'music'
        if music_is_play:  # Если играет, то…
            what_music_play = renpy.music.get_playing(
                channel="music"
            )  # …узнаём что играет (возвращает нам путь до трека)
            if (
                what_music_play not in music_data
            ):  # Проверяем, есть ли такой трек в словаре.
                return (
                    Text("Играет неизвестная словарю музыка"),
                    0.1,
                )  # Если его нет, появится эта строка вместо названия трека
            else:
                what_music_play = music_data[
                    what_music_play
                ]  # Если есть такой трек в словаре, то нашим выводом на экран станет значение словаря (то бишь, название трека)
                return (
                    Text("Сейчас играет:\n%s" % (what_music_play)),
                    0.1,
                )  # Возвращаем (показываем) название (или любой другой текст) песни, что сейчас играет
        else:
            return Text(""), 0.1  # Если музыка не играет, то мы возвращаем пустой текст

```

3. Объявляем изображение как DynamicDisplayable.

```renpy
init python:
    renpy.image("playing_music", DynamicDisplayable(show_music)) # Объявляем изображение
    # Теперь это изображение является нашей функцией, что будет показывать название трека, который играет в данный момент.
    # Рекомендуется использование более уникальных имён для словаря с музыкой, названием функции для треков и т.п, ибо возможны конфликты.
```

::: tip

Данный способ объявления работает в `init python`. Для обычного init используйте:

```renpy
init:
    image playing_music = DynamicDisplayable(show_music)
```

:::

### Пример использования

```renpy
label playing_music:
    play music music_list["pile"] fadein 2 # Проигрываем музыку, что имеется в нашем словаре music_data
    show playing_music at truecenter # Показываем изображение-функцию по центру.
    "В центре экрана мы увидим что сейчас играет."
    play music music_list["what_do_you_think_of_me"] fadein 2 # Проигрываем музыку, что отсутствует в нашем словаре music_data
    "Если трека нет в словаре мы увидим заранее придуманный текст"
    stop music fadeout 2 # Останавливаем воспроизведение музыки
    "И если музыка не играет, то мы ничего не увидим"
```

::: tip
Если вы хотите добавить отображение играемой музыки в экран, то можно сделать так:

```renpy
    add 'playing_music' # Будет добавлять в экран заранее обьявленый DynamicDisplayable
```

:::

## Открытие файла

Данный код позволяет открыть необходимый файл во время игры.

```renpy
init python:
    import os
    import sys
    import subprocess
    import platform

    def openFile(path):
        print(config.basedir)
        file = os.path.abspath(os.path.join(config.basedir, path))
        if sys.platform == "win32":
            os.startfile(file)
        elif platform.mac_ver()[0]:
            subprocess.Popen(["open", file])
        else:
            subprocess.Popen(["xdg-open", file])
```

### Пример использования

```renpy
label test_label:
    "Идёт некий текст."
    $ openFile("game/mods/myMod/file.txt")
    "Открывается файл `file.txt` по пути `game/mods/myMod/file.txt`, продолжается игра."
```
