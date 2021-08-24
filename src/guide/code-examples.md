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
В архиве с ресурсами задействуется версия оригинальной карты со всеми зонами.

<a href="/misc/archives/map.zip" download>Скачать архив с ресурcами карты</a>

```renpy
init python:
    import pygame
    import os
    import os.path
    import renpy.store as store
    from renpy.store import *
    from renpy.display.im import ImageBase, image, cache, Composite

    def bg_tmp_image(bgname):
        renpy.image(
            "text " + bgname,
            LiveComposite(
                (config.screen_width, config.screen_height),
                (0, 0),
                "#ffff7f",
                (50, 150),
                Text(u"А здесь будет фон про " + bgname, size=40, color="6A7183"),
            ),
        )
        return "text " + bgname

    store.map_pics_mymod = {
        "bgpic_mymod": "map/images/map_avaliable_mod.jpg",  # Путь до фона карты
        "avaliable_mymod": "map/images/map_avaliable_mod.jpg",  # Путь до версии карты с idle-версией
        "selected_mymod": "map/images/map_selected_mod.jpg",  # Путь до версии карты с hover-версией
    }

    store.map_zones_mymod = {
        "house_1": {
            "position": [766, 267, 803, 316],
            "default_bg": bg_tmp_image(u"Домик 1"),
        },
        "house_2": {
            "position": [808, 274, 844, 327],
            "default_bg": bg_tmp_image(u"Домик 2"),
        },
        "house_3": {
            "position": [842, 282, 892, 330],
            "default_bg": bg_tmp_image(u"Домик 3"),
        },
        "house_4": {
            "position": [888, 288, 928, 340],
            "default_bg": bg_tmp_image(u"Домик 4"),
        },
        "house_5": {
            "position": [964, 307, 999, 352],
            "default_bg": bg_tmp_image(u"Домик 5"),
        },
        "house_6": {
            "position": [1000, 303, 1038, 357],
            "default_bg": bg_tmp_image(u"Домик 6"),
        },
        "house_7": {
            "position": [790, 206, 829, 256],
            "default_bg": bg_tmp_image(u"Домик 7"),
        },
        "house_8": {
            "position": [835, 210, 873, 263],
            "default_bg": bg_tmp_image(u"Домик 8"),
        },
        "house_9": {
            "position": [905, 227, 939, 277],
            "default_bg": bg_tmp_image(u"Домик 9"),
        },
        "house_10": {
            "position": [945, 234, 981, 283],
            "default_bg": bg_tmp_image(u"Домик 10"),
        },
        "house_11": {
            "position": [988, 241, 1023, 290],
            "default_bg": bg_tmp_image(u"Домик 11"),
        },
        "house_12": {
            "position": [1024, 242, 1068, 303],
            "default_bg": bg_tmp_image(u"Домик 12"),
        },
        "house_13": {
            "position": [809, 143, 852, 200],
            "default_bg": bg_tmp_image(u"Домик 13"),
        },
        "house_14": {
            "position": [852, 150, 886, 205],
            "default_bg": bg_tmp_image(u"Домик 14"),
        },
        "house_15": {
            "position": [888, 158, 925, 209],
            "default_bg": bg_tmp_image(u"Домик 15"),
        },
        "house_16": {
            "position": [925, 166, 958, 228],
            "default_bg": bg_tmp_image(u"Домик 16"),
        },
        "house_17": {
            "position": [958, 168, 1020, 227],
            "default_bg": bg_tmp_image(u"Домик 17"),
        },
        "house_23": {
            "position": [715, 616, 763, 665],
            "default_bg": bg_tmp_image(u"Домик 23"),
        },
        "scene": {
            "position": [1062, 54, 1154, 139],
            "default_bg": bg_tmp_image(u"Эстрада"),
        },
        "square": {
            "position": [887, 360, 1001, 546],
            "default_bg": bg_tmp_image(u"Площадь"),
        },
        "musclub": {
            "position": [627, 255, 694, 340],
            "default_bg": bg_tmp_image(u"Музклуб"),
        },
        "dinning_hall": {
            "position": [1010, 456, 1144, 588],
            "default_bg": bg_tmp_image(u"Столовая"),
        },
        "sport_area": {
            "position": [1219, 376, 1584, 657],
            "default_bg": bg_tmp_image(u"Спорткомплекс"),
        },
        "beach": {"position": [1198, 674, 1490, 833], "default_bg": bg_tmp_image(u"Пляж")},
        "boathouse": {
            "position": [832, 801, 957, 855],
            "default_bg": bg_tmp_image(u"Лодочный причал"),
        },
        "booth": {"position": [905, 663, 949, 732], "default_bg": bg_tmp_image(u"Будка")},
        "clubs": {"position": [435, 437, 650, 605], "default_bg": bg_tmp_image(u"Клубы")},
        "library": {
            "position": [1158, 271, 1285, 360],
            "default_bg": bg_tmp_image(u"Библиотека"),
        },
        "infirmary": {
            "position": [1042, 360, 1188, 444],
            "default_bg": bg_tmp_image(u"Медпункт"),
        },
        "forest": {"position": [558, 58, 691, 194], "default_bg": bg_tmp_image(u"о. Лес")},
        "bus_stop": {
            "position": [286, 441, 414, 556],
            "default_bg": bg_tmp_image(u"Стоянка"),
        },
        "admin": {
            "position": [774, 348, 879, 449],
            "default_bg": bg_tmp_image(u"Админ. корпус"),
        },
        "shower_room": {
            "position": [695, 433, 791, 530],
            "default_bg": bg_tmp_image(u"Душевая"),
        },
        "old_building": {
            "position": [230, 1004, 337, 1073],
            "default_bg": bg_tmp_image(u"Старый корпус"),
        },
        "island_far": {
            "position": [873, 967, 1332, 1080],
            "default_bg": bg_tmp_image(u"Остров дальний"),
        },
        "island_close": {
            "position": [557, 935, 865, 1071],
            "default_bg": bg_tmp_image(u"Острова ближний"),
        },
        "storage": {
            "position": [1148, 481, 1215, 583],
            "default_bg": bg_tmp_image(u"Склад"),
        },
        "forest_r_u": {
            "position": [1757, 81, 1836, 203],
            "default_bg": bg_tmp_image(u"Лес верхний правый"),
        },
        "forest_r_d": {
            "position": [1777, 879, 1855, 998],
            "default_bg": bg_tmp_image(u"Лес нижний правый"),
        },
        "ws": {"position": [567, 355, 625, 405], "default_bg": bg_tmp_image(u"Туалет")},
    }

    global_map_result_mymod = "error"

    def init_map_zones_realization_mymod(zones_mymod, default):
        global global_zones_mymod
        global_zones_mymod = zones_mymod
        for i, data in global_zones_mymod.iteritems():
            data["label"] = default
            data["avaliable"] = True

    class Map_mymod(renpy.Displayable):
        def __init__(self, pics, default):
            renpy.Displayable.__init__(self)
            self.pics = pics
            self.default = default
            config.overlay_functions.append(self.overlay)

        def disable_all_zones(self):
            global global_zones_mymod
            for name, data in global_zones_mymod.iteritems():
                data["label"] = self.default
                data["avaliable"] = False

        def enable_all_zones(self):
            global global_zones_mymod
            for name, data in global_zones_mymod.iteritems():
                data["label"] = self.default
                data["avaliable"] = True

        def set_zone(self, name, label):
            global global_zones_mymod
            global_zones_mymod[name]["label"] = label
            global_zones_mymod[name]["avaliable"] = True

        def reset_zone(self, name):
            global global_zones_mymod
            global_zones_mymod[name]["label"] = self.default
            global_zones_mymod[name]["avaliable"] = False

        def enable_empty_zone(self, name):
            global global_zones_mymod
            self.set_zone(name, self.default)
            global_zones_mymod[name]["avaliable"] = True

        def reset_current_zone(self):
            self.enable_empty_zone(global_map_result_mymod)

        def disable_current_zone(self):
            global global_zones_mymod
            global_zones_mymod[global_map_result_mymod]["avaliable"] = False

        def event(self, ev, x, y, st):
            return

        def render(self, width, height, st, at):
            return renpy.Render(1, 1)

        def zoneclick(self, name):
            global global_zones_mymod
            global global_map_result_mymod
            store.map_enabled_mymod = False
            renpy.scene("mapoverlay")
            global_map_result_mymod = name
            renpy.hide("widget map_mymod")
            ui.jumps(global_zones_mymod[name]["label"])()

        def overlay(self):
            if store.map_enabled_mymod:
                global global_zones_mymod
                renpy.scene("mapoverlay")
                ui.layer("mapoverlay")
                for name, data in global_zones_mymod.iteritems():
                    if data["avaliable"]:
                        pos = data["position"]
                        print(name)
                        ui.imagebutton(
                            im.Crop(
                                self.pics["avaliable_mymod"],
                                pos[0],
                                pos[1],
                                pos[2] - pos[0],
                                pos[3] - pos[1],
                            ),
                            im.Crop(
                                self.pics["selected_mymod"],
                                pos[0],
                                pos[1],
                                pos[2] - pos[0],
                                pos[3] - pos[1],
                            ),
                            clicked=renpy.curry(self.zoneclick)(name),
                            xpos=pos[0],
                            ypos=pos[1],
                        )
                ui.close()

    store.map_mymod = Map_mymod(store.map_pics_mymod, default)

    store.map_enabled_mymod = False
    store.map_enabled_mymod_tmp = False

    def disable_stuff():
        store.map_enabled_mymod_tmp = store.map_enabled_mymod_tmp or store.map_enabled_mymod
        store.map_enabled_mymod = False

    def enable_stuff():
        store.map_enabled_mymod = store.map_enabled_mymod_tmp
        store.map_enabled_mymod_tmp = False

    config_session = False

    if not config_session:

        def disable_all_zones_mymod():
            store.map_mymod.disable_all_zones()

        def enable_all_zones_mymod():
            store.map_mymod.enable_all_zones()

        def set_zone_mymod(name, label):
            store.map_mymod.set_zone(name, label)

        def reset_zone_mymod(name):
            store.map_mymod.reset_zone(name)

        def enable_empty_zone_mymod(name):
            store.map_mymod.enable_empty_zone(name)

        def reset_current_zone_mymod():
            store.map_mymod.reset_current_zone()

        def disable_current_zone_mymod():
            store.map_mymod.disable_current_zone()

        def show_map_mymod():
            ui.jumps("_show_map_mymod")()

        def init_map_zones_mymod():
            init_map_zones_realization_mymod(store.map_zones_mymod, "nothing_here")

init:
    if not config_session:
        image widget map_mymod = "map/images/map_n_mod.jpg" # Путь до фона карты
        image bg map_mymod     = "map/images/map_avaliable_mod.jpg" # Путь до версии карты с idle-версией

label _show_map_mymod:
    show widget map_mymod
    $ store.map_enabled_mymod = True
    $ ui.interact()
    jump _show_map_mymod
```

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

Перед началом, нам нужно будет изображение нашей карты в трёх состояниях:

- `idle` - Состояние покоя.
- `hover` - Состояние, когда курсор наведён на локацию.
- `insensitive` - Состояние, с отмеченными пройденными объектами на карте. При этом состоянии нельзя будет кликнуть на локацию.

```renpy
init python:
    screen_map_condition = [False] * 7 # Можно сделать и словарь
    screen_map_count = 0
    screen_map_label = 'screen_map_after_walk'
    screen_map_need_count = 1
```

Сначала объявим нужные нам переменные.

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

Аргумент `condition` - словарь. Ключ этого словаря - название лейбла, к которому мы должны прыгнуть. Значение словаря - список. Первый элемент списка - кортеж `(x,y, width, height)` с координатами начала локации на изображении и её размеров по `x` и `y`. Второй элемент списка - какой-либо объект списка `screen_map_condition`.

Далее будет показано применение этой карты.

```renpy
label screen_map_start:
    window show

    'Сейчас перед нами должна появиться карта.'

    window hide
    $ screens_map_set_condition('screen_map_after_walk', 2) # Устанавливаем лейбл после прохождения карты и кол-во нужных пройденных локаций для этого.
    jump screen_map_walk

label screen_map_walk:
    # Проверяем, если кол-во пройденных локаций меньше кол-ва локаций которых нужно пройти
    if screen_map_count < screen_map_need_count:
        # Если меньше, то вызываем наш экран и в него передаем словарь с нужными аргументами.
        call screen screen_map({'screen_map_place1' : [(414,467,200,200), screen_map_condition[0]],'screen_map_place_2' : [(1000,10,200,200), screen_map_condition[1]]})
    else:
        # Иначе, сбрасываем переменные связанные с картой и прыгаем на заданный ранее лейбл.
        'Сбрасываем счетчик.'
        $ screens_map_reset_condition()
        jump screen_map_label

# Лейбл, связанный с локацией на карте.
label screen_map_place1:
    'Наш текст.'
    $ screen_map_count += 1 # Повышаем счётчик пройденных локаций.
    $ screen_map_condition[0] = True # Переключаем элемент списка в положение True.
    jump screen_map_walk # Прыгаем обратно в лейбл с нашей картой.

# Лейбл связанный с локацией на карте
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

Весь код будет выглядеть вот так:

```renpy
init python:
    screen_map_condition = [False] * 7  # Можно сделать и словарь
    screen_map_count = 0
    screen_map_label = "screen_map_after_walk"
    screen_map_need_count = 1


    def screens_map_reset_condition():
        global screen_map_condition, screen_map_count, screen_map_need_count
        screen_map_condition = [False] * 7
        screen_map_count = 0
        screen_map_need_count = 1


    def screens_map_set_condition(label, count):
        global screen_map_need_count, screen_map_label
        if label:  # Проверяем, если аргумент label.
            screen_map_label = label
        if count:  # Проверяем, если аргумент count.
            screen_map_need_count = count

init:
    screen screen_map(condition={'screen_map_error_place' : [(414,467,200,200), screen_map_condition[0]]}): # Ставим аргументу изначальное положение. На случай если забудем вписать аргумент при вызове экрана.
        modal True
        imagemap:
            # Пропишем пути до состояний карты.
            idle 'screens_map/map/old_map_idle.png'
            hover 'screens_map/map/old_map_hover.png'
            insensitive 'screens_map/map/old_map_insensitive.png'
            alpha True
            for label, lists in condition.items():
                # Циклом проходимся по словарю condition. и устанавливает чувствительные области в изображении.
                hotspot(lists[0][0], lists[0][1], lists[0][2], lists[0][3]) action [SensitiveIf(lists[1] == False), Jump(label)]
                # SensitiveIf позволяет делать кнопку чувствительной, пока действует какое-то условие.

label screen_map_start:
    window show dissolve
    'Сейчас перед нами должна появиться карта'
    window hide dissolve
    $ screens_map_set_condition('screen_map_after_walk', 2) # Устанавливаем лейбл после прохождения карты и кол-во нужных пройденных локаций для этого.
    jump screen_map_walk

label screen_map_walk:
    # Проверяем, если кол-во пройденных локаций меньше кол-ва локаций которых нужно пройти.
    if screen_map_count < screen_map_need_count:
        # Если меньше то вызываем наш экран и в него передаем словарь с нужными аргументами.
        call screen screen_map({'screen_map_place1' : [(414,467,200,200), screen_map_condition[0]],'screen_map_place_2' : [(1000,10,200,200), screen_map_condition[1]]})
    else:
        # Иначе мы сбрасываем переменные связанные с картой и прыгаем на заданный ранее лейбл.
        'сбрасываем счетчик.'
        $ screens_map_reset_condition()
        jump screen_map_label

# Лейбл связанный с локацией на карте
label screen_map_place1:
    'Наш текст.'
    $ screen_map_count += 1 # Повышаем счётчик пройденных локаций.
    $ screen_map_condition[0] = True # Переключаем элемент списка в положение True.
    jump screen_map_walk # Прыгаем обратно в лейбл с нашей картой.

# Лейбл связанный с локацией на карте.
label screen_map_place_2:
    'Наш текст 2.'
    $ screen_map_count += 1 #повышаем счётчик пройденных локаций
    $ screen_map_condition[1] = True
    # Переключаем элемент списка в положение True.
    jump screen_map_walk #прыгаем обратно в лейбл с нашей картой

# После прохождения карты.
# Породолжается история.
label screen_map_after_walk:
    'Мы прошли все места.'
    return

# Лейбл в который ведет нас карта, если мы не установили аргумент condition.
label screen_map_error_place:
    'Я забрел куда-то не туда.'
```

## Замена интерфейсов

Под интерфейсом предполагаются внутриигровое экраны, с которыми взаимодействует пользователь, такие как:

- `say` - Экран, где отображается текст вашей истории.
- `main_menu` - Экран главного меню вашей модификации.
- `game_menu_selector` - Экран игрового меню.
- `quit` - Экран выхода.
- `preferences` - Экран настроек.
- `save` - Экран сохранения игры.
- `load`- Экран загрузки сохранения.
- `nvl` - NVL экран.
- `yesno_prompt` - Экран подтверждения действия.

Данные экраны присутствуют в игре и их можно заменить. В этом примере мы не будем создавать экраны, предполагается, что у вас есть уже готовые экраны, которые вы хотели бы заменить.

В данном методе мы будем запускать мод с лейбла, который заменяет часть экранов и главное меню, после чего мы можем заменить их
обратно, при выходе из меню мода.

Для начала нам нужно объявить функции замены наших экранов.

```renpy
# Уберите из списка ненужные названия экранов, если не хотите их заменять.
define SCREENS = [
    "main_menu",
    "game_menu_selector",
    "quit",
    "say",
    "preferences",
    "save",
    "load",
    "nvl",
    "yesno_prompt",
]

init python:
    def my_mod_screen_save():  # Функция сохранения экранов из оригинала.
        for name in SCREENS:
            renpy.display.screen.screens[
                ("my_mod_old_" + name, None)
            ] = renpy.display.screen.screens[(name, None)]


    def my_mod_screen_act():  # Функция замены экранов из оригинала на собственные.
        config.window_title = u"Мой мод"  # Здесь вводите название вашего мода.
        config.version = "1.0.0"  # Здесь можете изменить версию мода.
        for (
            name
        ) in (
            SCREENS
        ):
            renpy.display.screen.screens[(name, None)] = renpy.display.screen.screens[
                (my_mod_ + name, None)
            ]
        config.mouse = {
            "default": [("images/misc/mouse/1.png", 0, 0)]
        }  # Вставте ваш путь до курсора в вашего мода, если его нет - закомментируйте строку.
        config.main_menu_music = (
            "mods/my_mod/music/main_menu.mp3"  # Вставте ваш путь до музыки в главном меню.
        )


    def my_mod_screens_diact():  # Функция обратной замены.
        # Пытаемся заменить экраны.
        try:
            config.window_title = u"Бесконечное лето"
            config.name = "Everlasting_Summer"
            config.version = "1.2"
            for name in SCREENS:
                renpy.display.screen.screens[(name, None)] = renpy.display.screen.screens[
                    ("my_mod_old_" + name, None)
                ]
            layout.LOADING = "Загрузка приведёт к потере несохранённых данных.\nВы уверены, что хотите сделать это?"
            _main_menu_screen = "main_menu"
            _game_menu_screen = "game_menu_selector"
            config.mouse = {"default": [("images/misc/mouse/1.png", 0, 0)]}
            config.main_menu_music = "sound/music/blow_with_the_fires.ogg"
            persistent._file_page = 1
            renpy.music.stop("ambience")
            renpy.music.stop("music")
            renpy.music.stop("sound")
            renpy.play(music_list["blow_with_the_fires"], channel="music")
        except:  # Если возникают ошибки то мы выходим из игры, чтобы избежать Traceback
            renpy.quit()


    # Объеденяем функцию сохранения экранов и замены в одну.
    def my_mod_screens_save_act():
        my_mod_screen_save()
        my_mod_screen_act()

```

`my_mod` - префикс. Замените его на префикс своего мода, чтобы избежать конфликтов.

::: warning
В данном случае название ваших экранов должно соответствовать виду: `префикс мода + название экрана в оригинале`.

Например, с main_menu:

- префикс мода - `my_mod`
- экран должен называться - `my_mod_main_menu`
  :::

Пример активации и обратной замены интерфейсов с помощью лейблов:

```renpy
# Лейбл с которого будет запускаться мод.
label my_mod_index:
    window hide # Скрываем текстбокс.
    stop music fadeout 3 # Останавливаем музыку.
    scene bg black with fade2 # Переходим на сцену с чёрным экраном.
    $ my_mod_screens_save_act() # Сохраняем экраны из оригинала и заменяем на собственные.
    return # С помощью return - попадаем в главное меню.


# Лейбл выхода из мода.
label my_mod_true_exit:
    window hide dissolve # Скрываем текстбокс.
    stop music fadeout 3 # Останавливаем музыку.
    scene black with fade # Переходим на сцену с чёрным экраном.
    $ my_mod_screens_diact() # Делаем обратную замену экранов мода на оригинальные.
    $ MainMenu(confirm=False)() # Выходим в Главное меню.
```

В нашем случае с лейбла `my_mod_index` должен запускаться мод. А лейбл `my_mod_true_exit` нужен для обратной замены экранов, поэтому, чтобы выйти из мода, и выполнить обратную замену вы можете просто прыгнуть на этот лейбл.

::: tip
Можно обойтись и без лейбла `my_mod_true_exit`, вы можете попробовать добавить к вашей кнопке выхода в главном меню следующее действие:

```renpy
action [(Function(my_mod_screens_diact)), ShowMenu("main_menu")]
```

:::
