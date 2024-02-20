# Руководство с примерами кода

[[toc]]

## Включение режима разработчика

Будут доступны команды:

- `Shift + D` - меню разработчика
- `Shift + O` - консоль

::: warning
Для того, чтобы игра распознала сочетания клавиш, нужно переключиться на **латинскую раскладку клавиатуры**.
:::

```renpy
init:
    $ config.developer = True
    $ config.console = True
```

## Автоматическое объявление файлов

Автоматическое объявление всех изображений и звуков мода.

<a href="/code/scripts/autoinitialization.rpy" download>Скачать скрипт</a>

<a href="/misc/archives/autoinit.zip" download>Скачать мод-пример</a>

::: warning
Поддерживается объявление как "резаных", так и "цельных" спрайтов.

"Резаным" спрайтом называется спрайт, у которого каждая часть спрайта (тело, одежда, эмоция и прочее) идёт отдельным изображением, как в БЛ.

"Цельным" спрайтом называется спрайт, у которого тело, одежда, эмоция и прочее идёт одним изображением.
:::

::: danger
Для работы автообъявления необходимо соблюдать иерархию папок с ресурсами.

Место расположения аудиофайлов может быть любым.
В корневой папки мода необходимо создать папку `images`, в которой будут храниться все изображения.
Для изображений внутри `images` создаём ещё одну папку с любым названием (к примеру, `bg`) и в неё закидываем необходимые для объявления изображения. К сожалению, объявление изображений, что находятся в ещё одной папки внутри `bg`, не поддерживается (аудиофайлы поддерживаются).

Для объявления спрайтов внутри `images` создаём папку `sprites`. Затем, для каждой дистанции, создаём ещё по папке: `normal`, `close` и `far` соответственно. Если для объявляемых спрайтов есть лишь одна из дистанций, то ненужные папки просто удаляем. Для каждого спрайта создаём папку c любым названием (к примеру, `ufo`), затем, внутри, для каждой позы по ещё одной папке (цифрой). Если спрайт "резаный", то в папку необходимо поместить изображение с телом, в имени обязательно должно быть указывано `body` (`ufo_1_body.png` или просто `body.png`).
Для аксессуаров спрайта создаём папку `acc`, для одежды `clothes`, для эмоций `emo`. Название изображений любое.

Пример правильного пути к файлам - `mymod\images\sprites\normal\ufo\1`.
:::

Параметры:

- `modID: string` - название корневой папки мода. Если мод лежит в "mods", то добавить к modID в начале "mods/": "mods/mymod";
- `mod_prefix: string, boolean` - Префикс к названиям объявлённых файлов при необходимости;

<<< @/src/.vuepress/public/code/scripts/autoinitialization.rpy

### Пример использования

#### Изображения

```renpy
show bg ext_square_sunset # Показ изображения ext_square_sunset из папки bg
```

#### Изображения (с префиксом)

```renpy
show bg ext_square_sunset_mymod # Показ изображения ext_square_sunset из папки bg с префиксом mymod
```

#### Спрайты

```renpy
show ufo dress smile jewelry far # Показ спрайта персонажа ufo в одежде dress, эмоцией smile, аксессуаром jewelry и дистанцией far
show ufo dress smile jewelry #  Показ спрайта персонажа ufo в одежде dress, эмоцией smile, аксессуаром jewelry и дистанцией normal
show ufo dress smile jewelry close # Показ спрайта персонажа ufo в одежде dress, эмоцией smile, аксессуаром jewelry и дистанцией close
show ufo dress smile # Показ спрайта персонажа ufo в одежде dress, эмоцией smile и дистанцией normal
show ufo dress # Показ спрайта персонажа ufo в одежде dress и дистанцией normal
show ufo # Показ спрайта персонажа ufo с дистанцией normal
```

#### Спрайты (с префиксом)

```renpy
show ufo_mymod dress smile jewelry far # Показ спрайта персонажа ufo в одежде dress, эмоцией smile, аксессуаром jewelry, дистанцией far и префиксом mymod
show ufo_mymod dress smile jewelry #  Показ спрайта персонажа ufo в одежде dress, эмоцией smile, аксессуаром jewelry, дистанцией normal и префиксом mymod
show ufo_mymod dress smile jewelry close # Показ спрайта персонажа ufo в одежде dress, эмоцией smile, аксессуаром jewelry, дистанцией close и префиксом mymod
show ufo_mymod dress smile # Показ спрайта персонажа ufo в одежде dress, эмоцией smile, дистанцией normal и префиксом mymod
show ufo_mymod dress # Показ спрайта персонажа ufo в одежде dress, дистанцией normal и префиксом mymod
show ufo_mymod # Показ спрайта персонажа ufo с дистанцией normal и префиксом mymod
```

#### Аудио

```renpy
play sound mymusic # Воспроизведение файла mymusic на канале sound
```

#### Аудио (с префиксом)

```renpy
play sound mymusic_mymod # Воспроизведение файла mymusic на канале sound и префиксом mymod
```

## Автоматическое объявление файлов (для начинающих)

Данный отрезок кода автоматически объявляет все изображения и звуки Вашего мода.

<a href="/code/scripts/autoinitialization_noob.rpy" download>Скачать скрипт</a>

::: warning
Поддерживается объявление только "цельных" спрайтов.

"Цельным" спрайтом называется спрайт, у которого тело, одежда, эмоция и прочее идёт одним изображением, а не каждая
часть спрайта отдельно, как в БЛ.
:::

Параметры:

- `mod_folder: string` - название папки, в которой находится мод;
- `sprites_folder: string` - название папки, в которой хранятся спрайты, все спрайты в папке будут автоматически
  окрашены в зависимости от установленного времени суток (`persistent.sprite_time`).

<<< @/src/.vuepress/public/code/scripts/autoinitialization_noob.rpy

### Пример использования

#### Объявление ресурсов

```renpy
init:
    # Первый параметр - папка, в которой хранится мод
    # Например, если название папки - `my_mod`, то:
    $ define_assets('my_mod')
```

#### Объявление ресурсов с покраской спрайтов

```renpy
init:
    # Если мод находится в папке `my_mod`,
    # а спрайты - в `my_mod/images/sprites`, то:
    $ define_assets('my_mod', sprites_folder='images/sprites')
```

## Автоматическое объявление персонажей и интересные плюшки

Позволяет автоматически объявить персонажей с БЛ-like стилем текста, исключая возможность создания конфликтов с другими модами. Не забудьте заменить `mymod` на свой вариант.

<a href="/code/scripts/characters.rpy" download>Скачать скрипт</a>

Создаём словарь с персонажами, добавляем в него персонажей из оригинала, а затем добавляем своих.

Пример добавления: `"переменная_персонажа":[u"Имя персонажа", "HEX цвет имени персонажа"]`

```renpy
init -1 python:
    characters_mymod = { # Словарь с персонажами
        # основные
        "narrator":[None, None],
        "th":[None, None],
        "me":[u"Семён", "#E1DD7D"],
        # персонажи оригинала
        "mi":[u"Мику", "#00DEFF"],
        "us":[u"Ульяна", "#FF3200"],
        "dv":[u"Алиса", "#FFAA00"],
        "mt":[u"Ольга Дмитриевна", "#00EA32"],
        "mz":[u"Женя", "#4A86FF"],
        "sh":[u"Шурик", "#FFF226"],
        "sl":[u"Славя", "#FFD200"],
        "el":[u"Электроник", "#FFFF00"],
        "un":[u"Лена", "#B956FF"],
        "cs":[u"Виола", "#A5A5FF"],
        "pi":[u"Пионер", "#E60000"],
        "uv":[u"Юля", "#4EFF00"],
        "voice":[u"Голос", "#e1dd7d"],
        # новые персонажи
        "new":[u"Новый персонаж", "#FF3200"],
        "new2":[u"Новый персонаж2", "#B956FF"]
        }
```

Создаём функцию, объявляющую весь словарь с нашими персонажами

```renpy
init python:
    def chars_define_mymod(kind=adv):
        gl = globals()
        if kind == nvl:
            who_suffix = ":"
            ctc = "ctc_animation_nvl"
        else:
            who_suffix = ""
            ctc = "ctc_animation"
        what_color = "#FFDD7D" # Цвет текста персонажа
        drop_shadow = (2, 2) # Наложение тени на текст
        for i, j in characters_mymod.items():
            if i == "narrator":
                gl[i] = Character(None, kind=kind, what_color=what_color, what_drop_shadow=drop_shadow, ctc=ctc, ctc_position="fixed")
            elif i == "th":
                gl[i] = Character(None, kind=kind, what_color=what_color, what_drop_shadow=drop_shadow, what_prefix="~ ", what_suffix=" ~", ctc=ctc, ctc_position="fixed")
            else:
                gl[i] = Character(j[0], kind=kind, who_color=j[1], who_drop_shadow=drop_shadow, who_suffix=who_suffix, what_color=what_color, what_drop_shadow=drop_shadow, ctc=ctc, ctc_position="fixed")
                # Добавлено дополнительное объявление персонажей, которые будут сохранять оригинальный цвет имени персонажа, но изменять его имя.
                # Полезно, когда ГГ в моде ещё не знаком с новыми пионерами, но забивать словарь мусором не хочется.
                # Пример использования - "new_v" - имя "Новый персонаж" меняется на "Голос", "new_pm" - "Пионер", "new_pg" - "Пионерка"
                gl[i+"_v"] = Character(u"Голос", kind=kind, who_color=j[1], who_drop_shadow=drop_shadow, who_suffix=who_suffix, what_color=what_color, what_drop_shadow=drop_shadow, ctc=ctc, ctc_position="fixed")
                gl[i+"_pm"] = Character(u"Пионер", kind=kind, who_color=j[1], who_drop_shadow=drop_shadow, who_suffix=who_suffix, what_color=what_color, what_drop_shadow=drop_shadow, ctc=ctc, ctc_position="fixed")
                gl[i+"_pg"] = Character(u"Пионерка", kind=kind, who_color=j[1], who_drop_shadow=drop_shadow, who_suffix=who_suffix, what_color=what_color, what_drop_shadow=drop_shadow, ctc=ctc, ctc_position="fixed")
            if renpy.mobile:
                colors[i] = {'night': j[1], 'sunset': j[1], 'day': j[1], 'prolog': j[1]}
                names[i] = j[0]
                store.names_list.append(i)
```

### Пример использования

```renpy
label mymod:
    $ chars_define_mymod() # В самом начале первого лейбла мода объявляем персонажей во избежание конфликтов с персонажами из других модов
    new "Я — новый персонаж!"
```

### Добавление поддержки NVL-режима

```renpy
    def set_mode_mymod(mode=adv): # Переключение между ADV и NVL режимами
        nvl_clear()
        chars_define_mymod(kind=mode)
        if renpy.mobile:
            if mode == adv:
                set_mode_adv()
            else:
                set_mode_nvl()
```

#### Использование

```renpy
label mymod:
    new "Говорю в ADV-режиме."

    window hide
    $ set_mode_mymod(nvl)
    pause(1) # Пауза для плавного перехода
    window show

    new "Говорю в NVL-режиме."
```

### Изменение имени и цвета персонажа во время игры

```renpy
    def set_name_mymod(name, value, mode=adv): # Изменение имени персонажа
        characters_mymod[name][0] = value
        chars_define_mymod(mode)
        if renpy.mobile:
            if mode == nvl:
                set_mode_nvl()
            else:
                set_mode_adv()

    def set_char_color_mymod(name, value, mode=adv): # Изменение цвета имени персонажа
        characters_mymod[name][1] = value
        chars_define_mymod(mode)
        if renpy.mobile:
            if mode == nvl:
                set_mode_nvl()
            else:
                set_mode_adv()
```

#### Использование

```renpy
label mymod:
    new "Моё имя - 'Новый Персонаж'"

    $ set_name_mymod("new", "Новое имя")

    new "Моё имя 'Новое имя'"

    $ set_char_color_mymod("new", "#4A86FF")

    new "Цвет моего имени изменился!"
```

### Полный вид кода

<<< @/src/.vuepress/public/code/scripts/characters.rpy

## Продолжение проигрывания с момента остановки

Данный скрипт позволяет приостановить проигрывание музыки или звука на определённом отрезке, чтобы позже можно было её снова воспроизвести с места остановки.

<a href="/code/scripts/playerPause.rpy" download>Скачать скрипт</a>

<<< @/src/.vuepress/public/code/scripts/playerPause.rpy

### Пример использования

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

Эти два варианта уже объявлены в игре глобально и могут использоваться как [изображение](https://www.renpy.org/doc/html/displaying_images.html#image), объявленное с помощью [`Image Statement`](https://www.renpy.org/doc/html/displaying_images.html#image-statement).

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

<a href="/code/scripts/snow.rpy" download>Скачать скрипт</a>

<<< @/src/.vuepress/public/code/scripts/snow.rpy
:::

## Отображение музыки, играющей в данный момент

Заполняем словарь `music_data` путём до трека и его названием, что будет отображаться при использовании DynamicDisplayable-функции.
У нас примером выступит Between August and December - Pile.

Объявляем функцию как изображение, делая DynamicDisplayable.
Теперь, если на канале `music` будет проигрываться какой-либо трек и путь до него будет указан в нашем словаре `music_data`, то появится его название (которое мы указали в словаре).

1. Объявляем словарь, где ключ — путь до файла, а значение — его название, которое будет выводиться.

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
    # Рекомендуется использование более уникальных имён для словаря с музыкой, названий функции для треков и т.п, ибо возможны конфликты.
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
    add 'playing_music' # Будет добавлять в экран заранее объявленый DynamicDisplayable
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

## Создание собственной карты

Если вам недостаточно мест в оригинальной карте или вам необходима своя карта для мода, то с помощью этого кода можно её создать.
В архиве с ресурсами используется версия оригинальной карты со всеми зонами.

<a href="/code/scripts/map.rpy" download>Скачать скрипт</a>

<a href="/misc/archives/map.zip" download>Скачать архив с ресурсами карты</a>

`store.map_pics_mymod` содержит в себе пути до `default`, `idle` и `hover` версий вашей карты.

- `bgpic_mymod` - default-версия
- `avaliable_mymod` - idle-версия
- `selected_mymod` - hover-версия

`store.map_zones_mymod` содержит в себе список зон, при наведении на координаты которых будет сменяться `idle` версия на `hover`.

Пример заполнения списка:

- `"house_1"` : `String` - название зоны
- `[766, 267, 803, 316]` : `Int (X верхнего левого угла), Int (Y верхнего левого угла), Int (X нижнего правого угла), Int (Y нижнего правого угла)` - координаты зоны, при наведении на которые будет сменяться версия карты
- `u"Домик 1"` : `String` - placeholder, занимающий место, если отсутствует "картинка" для зоны в её координатах. Выводится текстом.

Основные функции карты:

- `disable_all_zones_mymod()` - отключает все зоны на карте.
- `enable_all_zones_mymod()` - включает все зоны на карте.
- `set_zone_mymod(name, label)` - включает одну зону на карте, указываем название зоны, а затем название лейбла, на который должен быть совершён прыжок при нажатии на зону.
- `reset_zone_mymod(name)` - отключает одну зону на карте.
- `enable_empty_zone_mymod(name)` - включает одну зону на карте, но при нажатии ничего не происходит.
- `reset_current_zone_mymod()` - если мы выбрали зону и находимся на её лейбле, то при использовании включает эту зону, но при нажатии ничего не произойдёт.
- `disable_current_zone_mymod()` - отключает зону, на лейбле которой мы находимся.
- `show_map_mymod()` - перебрасывает на лейбл, показывающей карту. Считай, показывает карту.
- `init_map_zones_realization_mymod()` - инициализирует карту.

::: danger
Инициализация карты должна происходить один раз за весь мод.
:::

<<< @/src/.vuepress/public/code/scripts/map.rpy

### Пример использования

```renpy
label test_map_mod:

    window hide

    $ init_map_zones_mymod() # Объявляем нашу карту.
    $ disable_all_zones_mymod() # Отключаем все зоны, если были ранее включены
    $ set_zone_mymod("house_1", "label_of_house")   # Выделяем на карте домик №1, при нажатии — прыжок на лейбл домика
                                                    # Название остальных мест можно взять из списка store.map_zones_mymod, что в map_mymod
    $ show_map_mymod() # Показываем нашу карту

label label_of_house:
    window show

    "А вот и лейбл нашего домика."
```

## Создание собственной карты (для начинающих)

В исходном коде игры и во многих модах можно увидеть похожий код для использования карты внутри игры. Но этот метод достаточно сложен в понимании для новичка. Поэтому, далее будет показан пример кода для использования карты в вашей модификации.

<a href="/code/scripts/map_noob.rpy" download>Скачать скрипт</a>

Перед началом, нам нужно будет изображение нашей карты в трёх состояниях:

- `idle` - Состояние покоя.
- `hover` - Состояние, когда курсор наведён на локацию.
- `insensitive` - Состояние с отмеченными пройденными объектами на карте. При этом состоянии нельзя будет кликнуть на локацию.

```renpy
init python:
    screen_map_condition = [False] * 7 # Можно сделать и словарь
    screen_map_count = 0
    screen_map_label = 'screen_map_after_walk'
    screen_map_need_count = 1
```

Сначала объявим нужные нам переменные:

- `screen_map_condition`<`List`> - Список, состоящий из False. Кол-во False в списке определяет кол-во объектов, которые могут быть на карте.
- `screen_map_count`<`Int`> - Число пройденных локаций. Изначально равно нулю.
- `screen_map_label`<`String`> - Название лейбла, в который мы будем прыгать после прохождения карты.
- `screen_map_need_count`<`Int`> - Число, определяющее сколько локаций нужно пройти. Изначально равно единице.

::: tip
Стоит напомнить, что название переменных лучше придумывать более уникальными, чтобы избежать конфликтов с другими модификациями.
:::

Теперь объявим нужные нам функции.

```renpy
def screens_map_reset_condition():
    global screen_map_condition, screen_map_count, screen_map_need_count
    screen_map_condition = [False] * 7
    screen_map_count = 0
    screen_map_need_count = 1

def screens_map_set_condition(label,count):
    global screen_map_need_count, screen_map_label
    if label: # Проверяем, если аргумент label
        screen_map_label = label
    if count: # Проверяем, если аргумент count
        screen_map_need_count = count
```

Функция `screens_map_reset_condition` сбрасывает переменные, связанные с работой карты. А `screens_map_set_condition` принимает два аргумента `label`<`String`> и `count`<`Int`>. Устанавливает лейбл, к которому должны перейти после карты, и кол-во локаций.

Перейдем к написанию самой карты. Она будет представлять собой `screen`, принимающий в качестве аргумента словарь.

```renpy
init:
    screen screen_map(condition={'screen_map_error_place' : [(414,467,200,200), screen_map_condition[0]]}): # Cтавим аргументу изначальное положение. На случай, если забудем вписать аргумент при вызове экрана.
        modal True
        imagemap:
            # Пропишем пути до состояний карты
            idle 'screens_map/map/old_map_idle.png'
            hover 'screens_map/map/old_map_hover.png'
            insensitive 'screens_map/map/old_map_insensitive.png'
            alpha True
            for label, lists in condition.items():
                # Циклом проходимся по словарю condition. И устанавливает чувствительные области в изображении.
                hotspot(lists[0][0], lists[0][1], lists[0][2], lists[0][3]) action [SensitiveIf(lists[1] == False), Jump(label)]
                # SensitiveIf позволяет делать кнопку чувствительной, пока действует какое-то условие.
```

Аргумент `condition` - словарь. Ключ этого словаря - название лейбла, к которому мы должны прыгнуть. Значение словаря - список. Первый элемент списка - кортеж `(x, y, width, height)` с координатами начала локации на изображении и её размеров по `x` и `y`. Второй элемент списка - какой-либо объект списка `screen_map_condition`.

<<< @/src/.vuepress/public/code/scripts/map_noob.rpy

### Пример использования

```renpy
label screen_map_start:
    window show

    'Сейчас перед нами должна появиться карта.'

    window hide
    $ screens_map_set_condition('screen_map_after_walk', 2) # Устанавливаем лейбл после прохождения карты и кол-во нужных пройденных локаций для этого.
    jump screen_map_walk

label screen_map_walk:
    # Проверяем, если кол-во пройденных локаций меньше кол-ва локаций, которых нужно пройти
    if screen_map_count < screen_map_need_count:
        # Если меньше, то вызываем наш экран и в него передаем словарь с нужными аргументами.
        call screen screen_map({'screen_map_place1' : [(414,467,200,200), screen_map_condition[0]],'screen_map_place_2' : [(1000,10,200,200), screen_map_condition[1]]})
    else:
        # Иначе сбрасываем переменные связанные с картой и прыгаем на заданный ранее лейбл.
        'Сбрасываем счетчик.'
        $ screens_map_reset_condition()
        jump screen_map_label

# Лейбл, связанный с локацией на карте.
label screen_map_place1:
    'Наш текст.'
    $ screen_map_count += 1 # Повышаем счётчик пройденных локаций.
    $ screen_map_condition[0] = True # Переключаем элемент списка в положение True.
    jump screen_map_walk # Прыгаем обратно в лейбл с нашей картой.

# Лейбл, связанный с локацией на карте
label screen_map_place_2:
    'Наш текст 2.'
    $ screen_map_count += 1 # Повышаем счётчик пройденных локаций.
    $ screen_map_condition[1] = True
    #переключаем элемент списка в положение True
    jump screen_map_walk # Прыгаем обратно в лейбл с нашей картой.

# После прохождения карты.
# История продолжается.
label screen_map_after_walk:
    'Мы прошли все места.'
    return

# Лейбл, в который ведет нас карта, если мы не установили аргумент condition
label screen_map_error_place:
    'Я забрел куда-то не туда.'
```

## Замена интерфейса

Под интерфейсом предполагаются внутриигровые экраны, с которыми взаимодействует пользователь, такие как:

- `say` - Экран, где отображается текст вашей истории.
- `main_menu` - Экран главного меню вашей модификации.
- `game_menu_selector` - Экран игрового меню (меню быстрого доступа).
- `quit` - Экран выхода.
- `preferences` - Экран настроек.
- `save` - Экран сохранения игры.
- `load`- Экран загрузки сохранения.
- `nvl` - NVL экран.
- `choice` - Экран выбора.
- `text_history` - Экран просмотра истории.
- `yesno_prompt` - Экран подтверждения действия.
- `skip_indicator` - Экран пропуска текста.
- `history` - Экран прочитанного текста.

Данные экраны присутствуют в игре и их можно заменить. В этом примере мы не будем создавать экраны: предполагается, что у вас есть уже готовые экраны, которые вы хотели бы заменить.

В этом методе мы будем запускать мод с лейбла, который заменяет часть экранов и главное меню, после чего мы можем заменить их
обратно при выходе из меню мода.

<a href="/code/scripts/interface.rpy" download>Скачать скрипт</a>

Параметры:

- `my_mod` - префикс. Замените его на префикс своего мода, чтобы избежать конфликтов.

::: warning
В данном случае название ваших экранов должно соответствовать виду: `префикс мода + название экрана в оригинале`.

Например, с main_menu:

- префикс мода - `my_mod`
- экран должен называться - `my_mod_main_menu`
  :::

<<< @/src/.vuepress/public/code/scripts/interface.rpy

### Пример использования

```renpy
# Лейбл с которого будет запускаться мод.
label my_mod_index:
    window hide # Скрываем текстбокс.
    stop music fadeout 3 # Останавливаем музыку.
    scene bg black with fade2 # Переходим на сцену с чёрным экраном.
    $ my_mod_screens_save_act() # Сохраняем экраны из оригинала и заменяем на собственные.
    return # С помощью return попадаем в главное меню игры.


# Лейбл выхода из мода.
label my_mod_true_exit:
    window hide # Скрываем текстбокс.
    stop music fadeout 3 # Останавливаем музыку.
    scene black with fade # Переходим на сцену с чёрным экраном.
    $ my_mod_screens_diact() # Делаем обратную замену экранов мода на оригинальные.
    $ MainMenu(confirm=False)() # Выходим в главное меню.
```

В нашем случае с лейбла `my_mod_index` должен запускаться мод. А лейбл `my_mod_true_exit` нужен для обратной замены экранов поэтому, чтобы выйти из мода, и выполнить обратную замену вы можете просто прыгнуть на этот лейбл.

::: tip
Можно обойтись и без лейбла `my_mod_true_exit`: вы можете попробовать добавить к вашей кнопке выхода в главном меню следующее действие:

```renpy
action [(Function(my_mod_screens_diact)), MainMenu(False)]
```

:::

## Создание галереи

Код представляет собой полноценную галерею, поделённую на 2 раздела — иллюстрации (CG) и фоны (BG).

<a href="/code/scripts/gallery.rpy" download>Скачать скрипт</a>

Создаём `init python` блок, а внутри него — экземпляр класса `Gallery()`. Создаём переменные `page` и `gallery_mode`. Первая отвечает за страницы нашей галереи, вторая — за тип нашей галереи, который будет меняться при нажатии на кнопку для смены раздела.

Настраиваем наш экземпляр `modGallery` — изображение заблокированного (ещё не открытого) варианта картинки и отключаем навигацию.

```renpy
init python:
    modGallery = Gallery()
    page = 0
    gallery_mode = "cg"

    modGallery.locked_button = get_image("gui/gallery/not_opened_idle.png")
    modGallery.navigation = False
```

Затем создаём словари, что будут содержать в себе иллюстрации и фоны, потом заполняем с помощью цикла нашу галерею.

```renpy
    gallery_cg = [ # Заполняем ЦГ словарь
        "d1_food_normal",
        "d1_food_skolop",
        "d1_grasshopper",
        "d1_rena_sunset",
    ]

    gallery_bg = [ # Заполняем БГ словарь
        "bus_stop",
        "ext_aidpost_day",
        "ext_aidpost_night",
        "ext_bathhouse_night",
    ]

    # Создаём кнопки и их изображения, внезависимости от размера исходной картинки, будет масштабирование до 1920x1080
    for cg in gallery_cg:
        modGallery.button(cg)
        modGallery.image(im.Crop("images/cg/"+cg+".jpg" , (0, 0, 1920, 1080)))
        modGallery.unlock(cg)

    for bg in gallery_bg:
        modGallery.button(bg)
        modGallery.image(im.Crop("images/bg/"+bg+".jpg" , (0, 0, 1920, 1080)))
        modGallery.unlock(bg)
    # При нажатии на кнопку с изображением, будет происходить fade переход.
    modGallery.transition = fade
```

::: tip Разблокировка всех изображений
Если необходимо, можно создать специальную функцию, что позволяет нам открыть все изображения из нашей галереи.

```renpy
def collect_all_ModGallery():
    s = [i for k in persistent._seen_images for i in k]

    for i in gallery_cg:
        if i not in s: return

    for i in gallery_bg:
        if i not in s: return
```

:::

Теперь создаём сам экран с нашей галереей. Указываем количество ячеек для изображений, создаём список `gallery_table`, который будет заполняться иллюстрациями или фонами в зависимости от значения `gallery_mode`.
Создаём переменную `len_table`, которая будет ссылаться на длину нашего списка. Создаём функцию, что позволит нам высчитать точное количество страниц галереи. В переменной `pages`, что отвечает за количество страниц галереи, высчитываем.

```renpy
init:
    screen ModGallery_screen:
        modal True
        tag menu
        $ rows = 4
        $ cols = 3
        $ cells = rows * cols
        $ gallery_table = []
        if gallery_mode == "cg":
            $ gallery_table = gallery_cg
        else:
            $ gallery_table = gallery_bg
        $ len_table = len(gallery_table)
        python:
            def abc(n, k):
                l = float(n)/float(k)
                if l-int(l) > 0:
                    return int(l)+1
                else:
                    return l
        $ pages = str(page+1)+"/"+str(int(abc(len_table, cells)))
```

Создаём `frame` с фоном нашей галереи и кнопки для навигации по типам галереи.

```renpy
frame background get_image("gui/settings/history_bg.jpg"):
    if gallery_mode == "cg":
        textbutton "Фоны":
            style "log_button"
            text_style "settings_link"
            xalign 0.98
            yalign 0.08
            action (SetVariable('gallery_mode', "bg"), SetVariable('page', 0), ShowMenu("ModGallery_screen"))
        hbox xalign 0.5 yalign 0.08:
            text "Иллюстрации" style "settings_link" yalign 0.5 color "#ffffff"
    elif gallery_mode == "bg":
        textbutton "Иллюстрации":
            style "log_button"
            text_style "settings_link"
            xalign 0.02
            yalign 0.08
            action (SetVariable('gallery_mode', "cg"), SetVariable('page', 0), ShowMenu("ModGallery_screen"))
        hbox xalign 0.5 yalign 0.08:
            text "Фоны":
                style "settings_link"
                yalign 0.5
                color "#ffffff"

    textbutton "Назад":
        style "log_button"
        text_style "settings_link"
        xalign 0.015
        yalign 0.92
        action Return()
```

Создаём grid для отображения изображений в сетке. Производим вычисления, создаём превью-версии картинок для БГ и ЦГ, создаём сами кнопки.

```renpy
grid rows cols xpos 0.09 ypos 0.18:
    $ cg_displayed = 0
    $ next_page = page + 1
    if next_page > int(len_table/cells):
        $ next_page = 0
    for n in range(0, len_table):
        if n < (page+1)*cells and n>=page*cells:
            python:
                if gallery_mode == "cg": # Превью для ЦГ
                    _t = im.Crop("images/cg/"+gallery_table[n]+".jpg" , (0, 0, 1920, 1080))
                elif gallery_mode == "bg": # Превью для БГ
                    _t = im.Crop("images/bg/"+gallery_table[n]+".jpg" , (0, 0, 1920, 1080))
                th = im.Scale(_t, 320, 180) # Само превью
                img = im.Composite((336, 196), (8, 8), im.Alpha(th, 0.9), (0, 0), im.Image(get_image("gui/gallery/thumbnail_idle.png"))) # idle-версия превью
                imgh = im.Composite((336, 196), (8, 8), th, (0, 0), im.Image(get_image("gui/gallery/thumbnail_hover.png"))) # hover-версия превью
            add g.make_button(gallery_table[n], get_image("gui/gallery/blank.png"), None, imgh, img, style="blank_button", bottom_margin=50, right_margin=50) # создаём кнопки
            $ cg_displayed += 1

            if n+1 == len_table:
                $ next_page = 0

    for j in range(0, cells-cg_displayed):
        null
```

Финальные штрихи — создаём кнопки для навигации между страницами галереи, также ставим текст, что показывает текущую страницу и общее количество.

```renpy
if page != 0:
    imagebutton:
        auto get_image("gui/dialogue_box/day/backward_%s.png")
        yalign 0.5
        xalign 0.01
        action (SetVariable('page', page-1), ShowMenu("ModGallery_screen"))
imagebutton:
    auto get_image("gui/dialogue_box/day/forward_%s.png")
    yalign 0.5
    xalign 0.99
    action (SetVariable('page', next_page), ShowMenu("ModGallery_screen"))

text pages:
    style "settings_link"
    xalign 0.985
    yalign 0.92
```

### Заключение

Полный вариант кода выглядит так:

<<< @/src/.vuepress/public/code/scripts/gallery.rpy

## Перевод мода

Нижеприведённый код позволит перевести ваш мод на другие языки. В примере показан перевод на английский.

<a href="/code/scripts/translate.rpy" download>Скачать скрипт</a>

::: tip
Существует возможность добавить перевод названия мода и персонажей на:

- **Английский** | `english`
- **Русский** | `None`
- **Испанский** | `spanish`
- **Итальянский** | `italian`
- **Китайский** | `chinese`
- **Французский** | `french`
- **Португальский** | `portuguese`
  :::

### Перевод названия

Для начала переведём название нашего мода. Создаём словарь `translator`, где будет храниться перевод для названия мода (а впоследствии и перевод имён персонажей, о котором расскажем в следующем подразделе)

```renpy
init python:
    translation_new["translator"] = {}
    translation_new["translator"]["name"] = {}
```

Затем создаём внутри значения с нашем именем создаём ещё два: одно для русского перевода, второе — для английского.

```renpy
    translation_new["translator"]["name"][None] = u"Переводчик"
    translation_new["translator"]["name"]["english"] = "Translator"
```

Теперь объявляем сам мод, но с именем, что будет брать значение из нашего словаря с переводом в зависимости от установленного языка игры.

```renpy
    mods["translator_mod"] = translation_new["translator"]["name"][_preferences.language]
```

### Перевод персонажа

Теперь переведём персонажа. Для этого создаём в нашем словаре значение для персонажей, а внутри него — ещё одно значение с нашим персонажем.

```renpy
    translation_new["translator"]["characters"] = {}
    translation_new["translator"]["characters"]["samantha"] = {}
```

Создаём значения с переводом на русский и английский язык.

```renpy
    translation_new["translator"]["characters"]["samantha"]["english"] = "Samantha"
    translation_new["translator"]["characters"]["samantha"][None] = "Саманта"
```

И объявляем нашего персонажа со значением для имени, что будет браться из установленного языка игры.

```renpy
translator_sam = Character(translation_new["translator"]["characters"]["samantha"][_preferences.language])
```

### Перевод текста

Прежде всего делаем проверку на то, имеется ли в списке `store` наша будущая переменная для перевода текста. Если нет, то добавляем и ставим по умолчанию русский язык.

```renpy
    if not hasattr(store, "persistent.translate_text_lang"):
        persistent.translate_text_lang = "ru"
```

Затем создаём сами тэги для перевода с помощью функций, что будут возвращать тот вариант текста, в зависимости от значения переменной `persistent.translate_text_lang`. Если значение `ru`, то показывает русский вариант текста, если `en`, то английский. Внутрь тэгов будем записывать русский и английский вариант текста.

```renpy
    def translate_en_tag(tag, argument, contents):
        if persistent.translate_text_lang == "en":
            return contents
        else:
            return [ ]

    def translate_ru_tag(tag, argument, contents):
        if persistent.translate_text_lang == "ru":
            return contents
        else:
            return [ ]
```

Добавим функцию для переключения языка отображаемого текста

```renpy
    def translate_toggle_lang():
        persistent.translate_text_lang = "ru" if persistent.translate_text_lang != "ru" else "en"
```

::: tip
Как вариант, можно создать кнопку в меню мода, что будет переключать язык повествования.

```renpy
if persistent.translate_text_lang == "ru":
    textbutton "Язык повествования (Русский)":
        action Function(translate_toggle_lang())
else:
    textbutton "Язык повествования (Английский)":
        action Function(translate_toggle_lang())
```

:::

Объявляем нашли тэги.

```renpy
    config.custom_text_tags["en"] = translate_en_tag
    config.custom_text_tags["ru"] = translate_ru_tag
```

Пример написания перевода текста представлен ниже.

```renpy
label translator_mod:
    translator_sam "{en}Hello!{/en}{ru}Привет!{/ru}" # Саманта (или Samantha, если установлен английский язык игры) произносит "Привет!", если переменная равна "ru", если же равно "en", то "Hello!"
```

### Заключение

Полный вариант кода выглядит так:

<<< @/src/.vuepress/public/code/scripts/translate.rpy

## Интеграция Live2D

Позволяет интегрировать Live2D в БЛ без необходимости что-либо докачивать. DLL с Live2D автоматически устанавливается в папку `Everlasting Summer/lib/Ваша_ОС`. Поддерживается Windows, Linux, Mac, и, возможно, Android и WEB.

<a href="/code/scripts/live2d.rpy" download>Скачать скрипт</a>

<a href="/misc/archives/live2d.zip" download>Скачать мод-пример</a>

### Объявление Live2D персонажа

```renpy
image hiyori = Live2D("Resources/Hiyori", base=.6, loop=True)
```

- `base : float` отвечает за нижнюю часть изображения, для определения размера. Это часть изображения, где 0.0 - верхняя часть, а 1.0 - нижняя. Это также становится значением yanchor по умолчанию.

- `loop : boolean` отвечает за зацикливание анимаций персонажа

Полный список параметров при объявлении персонажа [здесь](https://www.renpy.org/doc/html/live2d.html#Live2D).

### Добавление поддержки устройств без Live2D

Имейте в виду, что устройство пользователя может быть неспособно инициализировать Live2D, в этом случае, необходимо создать функцию, которая будет показывать статичный вариант спрайта или текст-плейсхолдер при невозможности воспроизвести Live2D:

```renpy
init python:
    def MyLive2D(*args, fallback=Placeholder(text="no live2d"), **kwargs):
        if renpy.has_live2d():
             return Live2D(*args, **kwargs)
        else:
             return fallback
```

#### Пример использования

```renpy
image eileen moving = MyLive2D("Путь до корневой папки Live2D спрайта", fallback="eileen happy") # При возможности воспроизвести будет использоваться Live2D версия спрайта, если же невозможно, то будет использован статичный спрайт `eileen happy`. Если `fallback` не заполнять, то вместо Live2D спрайта будет выводиться текст о том, что невозможно воспроизвести Live2D.
```

### Использование анимаций

Движения хранятся в папке motions, эмоции в папке expressions.
Названия движений и эмоций берутся из файлов Live2D, затем вводятся в нижний регистр, и если они начинаются с имени спрайта, за которым следует подчеркивание, то этот префикс удаляется.

Название файла движения - `Epsilon_idle_01.motion3.json`, следовательно, название движения - `idle_01`
Название файла эмоции - `Angry.exp3.json`, название эмоции - `angry`

#### Движение

```renpy
show Epsilon idle_01
```

#### Эмоция

```renpy
show Epsilon angry
```

#### Движение и эмоция одновременно

```renpy
show Epsilon idle_01 angry
```

### Изменение названия анимации

Для удобства при объявлении Live2D персонажа Вы можете с помощью параметра `aliases` изменить название анимации/анимаций на более удобное.

```renpy
init:
    image hiyori = Live2D("Resources/Hiyori", base=.6, aliases={"idle" : "m01"})

label mymod:
    show hiyori idle # эквивалент show hiyori m01
```

### Плавная смена анимаций

RenPy поддерживает плавную смену анимации при работе с Live2D. Обычно, когда Ren'Py переходит от одной анимации к другой, переход происходит резко - одна анимация останавливается, а другая запускается.

Live2D поддерживает другую модель, в которой старая анимация может плавно переходить в новую, с интерполяцией параметров. Считайте, что персонаж перемещает свои руки в нужное положение перед началом следующей анимации, а не резко переходит из одной анимации в другую.

Затухание движения контролируется с помощью:

- параметра `fade` при объявлении персонажа. Если `True`, используется затухание анимации, а если `False`, то происходит резкая смена анимации.

```renpy
image hiyori = Live2D("Resources/Hiyori", base=.6, fade=True)
```

- переменной `_live2d_fade`

```renpy
init:
    $ _live2d_fade = True
```
