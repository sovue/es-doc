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
