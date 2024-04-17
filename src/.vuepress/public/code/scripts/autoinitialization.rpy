init python early:
    class autoInitialization:
        """
        Класс для автоматической инициализации файлов мода.
        Инициализирует аудио и изображения (включая спрайты).

        Параметры класса:

            :param modID: str
                название корневой папки Вашего мода
            :param modPostfix: str, optional, :default value: ""
                опциональный параметр для добавления постфикса к названиям объявлённых ресурсов.
            :param write_into_file: boolean, optional, :default value: False
                если равно True, вместо инициализации записывает ресурсы мода в отдельный файл. Для дальнейшей инициализации ресурсов мода из файла необходимо перезагрузить БЛ.
                если равно False, ресурсы мода инициализируются в момент загрузки БЛ.
        """
        def __init__(self, modID, modPostfix="", write_into_file=False):
            """
            Параметры класса:

                :param modID: str
                    название корневой папки Вашего мода
                :param modPostfix: str, optional, :default value: ""
                    опциональный параметр для добавления постфикса к названиям объявлённых ресурсов.
                :param write_into_file: boolean, optional, :default value: False
                    если равно True, вместо инициализации записывает ресурсы мода в отдельный файл. Для дальнейшей инициализации ресурсов мода из файла необходимо перезагрузить БЛ.
                    если равно False, ресурсы мода инициализируются в момент загрузки БЛ.
            """
            self.modID = modID
            self.modPostfix = ("_" + modPostfix if modPostfix else "")
            self.modFiles = []
            self.write_into_file = write_into_file
            self.modDist = self.process_distances()

            self.initialize()

        def count_file(self, type, file_name, file):
            """
            Добавляет название файла, сам файл и его тип в лист modFiles.

            :param type: str
                тип файла
            :param file_name: srt
                имя файла
            :param file: str
                путь до файла
            """
            self.modFiles.append([type, file_name, file])

        def process_mod_path(self):
            """
            Находит путь до папки мода.

            :return: str
            """
            for dir, fn in renpy.loader.listdirfiles(False):
                if self.modID in fn:
                    return os.path.join(dir, self.modID).replace("\\", "/")
                else:
                    for root, dirs, files in os.walk(dir):
                        if self.modID in dirs:
                            return os.path.join(root, self.modID).replace("\\", "/")

        def process_images_path(self):
            """
            Находит путь до папки изображений мода.

            :return: str
            """
            return os.path.join(self.process_mod_path(), 'images').replace("\\", "/")

        def process_distances(self):
            """
            Находит путь до папки sprites, строит названия дистанций по именам внутри (для normal дистанции имя будет "", как в самом БЛ), ищет изображение в каждой из папок с дистанциями, получает размер изображения и добавляет в словарь
            
            :return: dict

            Пример возврата функции:
            {
                "far": {"far", (675, 1080)},
                "normal": {"", (900, 1080)},
                "close": {"close", (1125, 1080)},
            }
            """
            folder_names = {}
            path = os.path.join(self.process_images_path(), "sprites")
            for name in os.listdir(path):
                full_path = os.path.join(path, name).replace("\\", "/")
                if os.path.isdir(full_path):
                    for root, dirs, files in os.walk(full_path):
                        for file in files:
                            image_path = os.path.join(root, file).replace("\\", "/")
                            image_size = renpy.image_size(image_path)
                            folder_names[name] = (name if name != "normal" else "", image_size)
                            break
                        else:
                            continue
                        break
            return folder_names

        def process_audio(self):
            """
            Обрабатывает аудио. Поддерживает расширения (".wav", ".mp2", ".mp3", ".ogg", ".opus")

            Имя аудио для вызова будет в формате:
            [имя][_постфикс]

            Пример:
            newmusic
            """
            audio_extensions = {".wav", ".mp2", ".mp3", ".ogg", ".opus"}
            for file in renpy.list_files():
                if self.modID in file:
                    file_name = os.path.splitext(os.path.basename(file))[0] + self.modPostfix
                    if file.endswith(tuple(audio_extensions)):
                        self.count_file("sound", file_name, file)
    
        def process_images(self):
            """
            Обрабатывает изображения. Поддерживает изображения в подпапках.

            Имя изображения для вызова будет в формате:
            [папка] [подпапка] [имя][_постфикс]

            Пример:
            bg background
            bg subfolder background
            bg subfolder subsubfolder background
            """
            mod_imgs_path = self.process_images_path()
            for folder in os.listdir(mod_imgs_path):
                path = os.path.join(mod_imgs_path, folder).replace("\\", "/")
                if folder != 'sprites':
                    for root, dirs, files in os.walk(path):
                        for file in files:
                            image_path = os.path.join(root, file).replace("\\", "/")
                            image_name = os.path.splitext(file)[0]
                            relative_path = os.path.relpath(root, mod_imgs_path) # Получаем полный путь к изображению и удаляем путь к корню
                            folder_structure = relative_path.split(os.sep) # Разделяем путь на компоненты и объединяем их в имя изображения
                            folder_index = folder_structure.index(folder)
                            folder_structure = folder_structure[folder_index:] + [image_name] # Оставляем только элементы после папки folder
                            image_name_with_folder = ' '.join(folder_structure).replace('/', '').replace('\\', '') + self.modPostfix
                            image_path = os.path.relpath(image_path, renpy.loader.listdirfiles(False)[0][0]).replace(os.sep, "/")
                            self.count_file("image", image_name_with_folder, image_path)
                else:
                    self.process_sprites(path)

        def process_sprite_clothes_emo_acc(self, emo_l, clothes_l, acc_l, who, file_body, dist):
            """Обрабатывает спрайт [тело] [эмоция] [одежда] [аксессуар]"""
            for emotion in emo_l:
                for clothes in clothes_l:
                    for acc in acc_l:
                        file_name = who + self.modPostfix + ' ' + emotion[0] + ' ' + clothes[0] + ' ' + acc[0] + ' ' + self.modDist[dist][0]
                        file = """
                            ConditionSwitch(
                                "persistent.sprite_time=='sunset'",
                                im.MatrixColor(im.Composite({0},
                                                            (0, 0), "{1}",
                                                            (0, 0), "{2}",
                                                            (0, 0), "{3}",
                                                            (0, 0), "{4}"),
                                                im.matrix.tint(0.94, 0.82, 1.0)
                                            ),
                                "persistent.sprite_time=='night'",
                                im.MatrixColor(im.Composite({0},
                                                            (0, 0), "{1}",
                                                            (0, 0), "{2}",
                                                            (0, 0), "{3}",
                                                            (0, 0), "{4}"),
                                                im.matrix.tint(0.63, 0.78, 0.82)
                                            ),
                                True,
                                im.Composite({0},
                                            (0, 0), "{1}",
                                            (0, 0), "{2}",
                                            (0, 0), "{3}",
                                            (0, 0), "{4}")
                            )
                        """.format(self.modDist[dist][1], file_body, clothes[1], emotion[1], acc[1])
                        self.count_file("sprite", file_name, file)

            self.process_sprite_clothes_emo(emo_l, clothes_l, who, file_body, dist)
            self.process_sprite_clothes_acc(clothes_l, acc_l, who, file_body, dist)
            self.process_sprite_emo_acc(emo_l, acc_l,  who, file_body, dist)
            self.process_sprite_emo(emo_l, who, file_body, dist)
            self.process_sprite_acc(acc_l, who, file_body, dist)
            self.process_sprite_clothes(clothes_l, who, file_body, dist)

        def process_sprite_clothes_emo(self, emo_l, clothes_l, who, file_body, dist):
            """Обрабатывает спрайт [тело] [эмоция] [одежда]"""
            for clothes in clothes_l:
                for emotion in emo_l:
                    file_name = who + self.modPostfix + ' ' + emotion[0] + ' ' + clothes[0] + ' ' + self.modDist[dist][0]
                    file = """
                        ConditionSwitch(
                            "persistent.sprite_time=='sunset'",
                            im.MatrixColor(im.Composite({0},
                                                        (0, 0), "{1}",
                                                        (0, 0), "{2}",
                                                        (0, 0), "{3}"),
                                            im.matrix.tint(0.94, 0.82, 1.0)
                                        ),
                            "persistent.sprite_time=='night'",
                            im.MatrixColor(im.Composite({0},
                                                        (0, 0), "{1}",
                                                        (0, 0), "{2}",
                                                        (0, 0), "{3}"),
                                            im.matrix.tint(0.63, 0.78, 0.82)
                                        ),
                            True,
                            im.Composite({0},
                                        (0, 0), "{1}",
                                        (0, 0), "{2}",
                                        (0, 0), "{3}")
                        )
                    """.format(self.modDist[dist][1], file_body, clothes[1], emotion[1])
                    self.count_file("sprite", file_name, file)
            self.process_sprite_clothes(clothes_l, who, file_body, dist)
            self.process_sprite_emo(emo_l, who, file_body, dist)

        def process_sprite_clothes_acc(self, clothes_l, acc_l, who, file_body, dist):
            """Обрабатывает спрайт [тело] [одежда] [аксессуар]"""
            for clothes in clothes_l:
                for acc in acc_l:
                    file_name = who + self.modPostfix + ' ' + clothes[0] + ' ' + acc[0] + ' ' + self.modDist[dist][0]
                    file = """
                        ConditionSwitch(
                            "persistent.sprite_time=='sunset'",
                            im.MatrixColor(im.Composite({0},
                                                        (0, 0), "{1}",
                                                        (0, 0), "{2}",
                                                        (0, 0), "{3}"),
                                            im.matrix.tint(0.94, 0.82, 1.0)
                                        ),
                            "persistent.sprite_time=='night'",
                            im.MatrixColor(im.Composite({0},
                                                        (0, 0), "{1}",
                                                        (0, 0), "{2}",
                                                        (0, 0), "{3}"),
                                            im.matrix.tint(0.63, 0.78, 0.82)
                                        ),
                            True,
                            im.Composite({0},
                                        (0, 0), "{1}",
                                        (0, 0), "{2}",
                                        (0, 0), "{3}")
                        )
                    """.format(self.modDist[dist][1], file_body, clothes[1], acc[1])
                    self.count_file("sprite", file_name, file)
            self.process_sprite_clothes(clothes_l, who, file_body, dist)
            self.process_sprite_acc(acc_l, who, file_body, dist)

        def process_sprite_emo_acc(self, emo_l, acc_l, who, file_body, dist):
            """Обрабатывает спрайт [тело] [эмоция] [аксессуар]"""
            for emotion in emo_l:
                for acc in acc_l:
                    file_name = who + self.modPostfix + ' ' + emotion[0] + ' ' + acc[0] + ' ' + self.modDist[dist][0]
                    file = """
                        ConditionSwitch(
                            "persistent.sprite_time=='sunset'",
                            im.MatrixColor(im.Composite({0},
                                                        (0, 0), "{1}",
                                                        (0, 0), "{2}",
                                                        (0, 0), "{3}"),
                                            im.matrix.tint(0.94, 0.82, 1.0)
                                        ),
                            "persistent.sprite_time=='night'",
                            im.MatrixColor(im.Composite({0},
                                                        (0, 0), "{1}",
                                                        (0, 0), "{2}",
                                                        (0, 0), "{3}"),
                                            im.matrix.tint(0.63, 0.78, 0.82)
                                        ),
                            True,
                            im.Composite({0},
                                        (0, 0), "{1}",
                                        (0, 0), "{2}",
                                        (0, 0), "{3}")
                        )
                    """.format(self.modDist[dist][1], file_body, emotion[1], acc[1])
                    self.count_file("sprite", file_name, file)
            self.process_sprite_emo(emo_l, who, file_body, dist)
            self.process_sprite_acc(acc_l, who, file_body, dist)

        def process_sprite_clothes(self, clothes_l, who, file_body, dist):
            """Обрабатывает спрайт [тело] [одежда]"""
            for clothes in clothes_l:
                file_name = who + self.modPostfix + ' ' + clothes[0] + ' ' + self.modDist[dist][0]
                file = """
                    ConditionSwitch(
                        "persistent.sprite_time=='sunset'",
                        im.MatrixColor(im.Composite({0},
                                                    (0, 0), "{1}",
                                                    (0, 0), "{2}"),
                                        im.matrix.tint(0.94, 0.82, 1.0)
                                    ),
                        "persistent.sprite_time=='night'",
                        im.MatrixColor(im.Composite({0},
                                                    (0, 0), "{1}",
                                                    (0, 0), "{2}"),
                                        im.matrix.tint(0.63, 0.78, 0.82)
                                    ),
                        True,
                        im.Composite({0},
                                    (0, 0), "{1}",
                                    (0, 0), "{2}")
                    )
                """.format(self.modDist[dist][1], file_body, clothes[1])
                self.count_file("sprite", file_name, file)

        def process_sprite_acc(self, acc_l, who, file_body, dist):
            """Обрабатывает спрайт [тело] [аксессуар]"""
            for acc in acc_l:
                file_name = who + self.modPostfix + ' ' + acc[0] + ' ' + self.modDist[dist][0]
                file = """
                    ConditionSwitch(
                        "persistent.sprite_time=='sunset'",
                        im.MatrixColor(im.Composite({0},
                                                    (0, 0), "{1}",
                                                    (0, 0), "{2}"),
                                        im.matrix.tint(0.94, 0.82, 1.0)
                                    ),
                        "persistent.sprite_time=='night'",
                        im.MatrixColor(im.Composite({0},
                                                    (0, 0), "{1}",
                                                    (0, 0), "{2}"),
                                        im.matrix.tint(0.63, 0.78, 0.82)
                                    ),
                        True,
                        im.Composite({0},
                                    (0, 0), "{1}",
                                    (0, 0), "{2}")
                    )
                """.format(self.modDist[dist][1], file_body, acc[1])
                self.count_file("sprite", file_name, file)

        def process_sprite_emo(self, emo_l, who, file_body, dist):
            """Обрабатывает спрайт [тело] [эмоция]"""
            for emotion in emo_l:
                file_name = who + self.modPostfix + ' ' + emotion[0] + ' ' + self.modDist[dist][0]
                file = """
                    ConditionSwitch(
                        "persistent.sprite_time=='sunset'",
                        im.MatrixColor(im.Composite({0},
                                                    (0, 0), "{1}",
                                                    (0, 0), "{2}"),
                                        im.matrix.tint(0.94, 0.82, 1.0)
                                    ),
                        "persistent.sprite_time=='night'",
                        im.MatrixColor(im.Composite({0},
                                                    (0, 0), "{1}",
                                                    (0, 0), "{2}"),
                                        im.matrix.tint(0.63, 0.78, 0.82)
                                    ),
                        True,
                        im.Composite({0},
                                    (0, 0), "{1}",
                                    (0, 0), "{2}")
                    )
                """.format(self.modDist[dist][1], file_body, emotion[1])
                self.count_file("sprite", file_name, file)

        def process_sprite(self, who, file_body, dist):
            """Обрабатывает спрайт [тело]"""
            file_name = "{}{} {}".format(who, self.modPostfix, self.modDist[dist][0])
            file = """
                ConditionSwitch(
                    "persistent.sprite_time=='sunset'",
                    im.MatrixColor(im.Composite({0},
                                                (0, 0), "{1}"),
                                    im.matrix.tint(0.94, 0.82, 1.0)
                                ),
                    "persistent.sprite_time=='night'",
                    im.MatrixColor(im.Composite({0},
                                                (0, 0), "{1}"),
                                    im.matrix.tint(0.63, 0.78, 0.82)
                                ),
                    True,
                    im.Composite({0},
                                (0, 0), "{1}")
                )
            """.format(self.modDist[dist][1], file_body)
            self.count_file("sprite", file_name, file)

        def process_sprites(self, path):
            """Обрабатывает спрайты и все их комбинации
            
            Имя спрайта для вызова будет в формате:
            [название спрайта][_постфикс]
            [название спрайта][_постфикс] [эмоция]
            [название спрайта][_постфикс] [эмоция] [одежда]
            [название спрайта][_постфикс] [эмоция] [одежда] [аксессуар]
            и любые другие комбинации.

            Пример:
            dv
            dv normal
            dv normal sport
            dv normal sport jewelry
            """
            for dist in os.listdir(path):
                who_path = os.path.join(path, dist).replace("\\", "/")
                for who in os.listdir(who_path):
                    who_path_num = os.path.join(who_path, who).replace("\\", "/")
                    for numb in os.listdir(who_path_num):
                        sprite_folders = os.listdir(os.path.join(who_path_num, numb).replace("\\", "/"))

                        for i in sprite_folders:
                            if 'body' in i:
                                file_body = os.path.relpath(os.path.join(who_path_num, numb, i).replace("\\", "/"), renpy.loader.listdirfiles(False)[0][0]).replace(os.sep, "/")
                                break
                        else:
                            file_body = im.Alpha("images/misc/soviet_games.png", 0.0) # Заглушка, если не нашли тело

                        clothes_l = []
                        emo_l = []
                        acc_l = []

                        if 'clothes' in sprite_folders:
                            clothes_l = [(os.path.splitext(clothes)[0].split('_'+numb+"_", 1)[-1], os.path.relpath(os.path.join(who_path_num, numb, 'clothes', clothes).replace("\\", "/"), renpy.loader.listdirfiles(False)[0][0]).replace(os.sep, "/")) for clothes in os.listdir(os.path.join(who_path_num, numb, 'clothes'))]

                        if 'emo' in sprite_folders:
                            emo_l = [(os.path.splitext(emo)[0].split('_'+numb+"_", 1)[-1], os.path.relpath(os.path.join(who_path_num, numb, 'emo', emo).replace("\\", "/"), renpy.loader.listdirfiles(False)[0][0]).replace(os.sep, "/")) for emo in os.listdir(os.path.join(who_path_num, numb, 'emo'))]

                        if 'acc' in sprite_folders:
                            acc_l = [(os.path.splitext(acc)[0].split('_'+numb+"_", 1)[-1], os.path.relpath(os.path.join(who_path_num, numb, 'acc', acc).replace("\\", "/"), renpy.loader.listdirfiles(False)[0][0]).replace(os.sep, "/")) for acc in os.listdir(os.path.join(who_path_num, numb, 'acc'))]

                        self.process_sprite(who, file_body, dist)
                        if clothes_l and emo_l and acc_l:
                            self.process_sprite_clothes_emo_acc(emo_l, clothes_l, acc_l, who, file_body, dist)
                        elif clothes_l and emo_l:
                            self.process_sprite_clothes_emo(emo_l, clothes_l, who, file_body, dist)
                        elif clothes_l and acc_l:
                            self.process_sprite_clothes_acc(clothes_l, acc_l, who, file_body, dist)
                        elif emo_l and acc_l:
                            self.process_sprite_emo_acc(emo_l, acc_l,  who, file_body, dist)
                        elif clothes_l:
                            self.process_sprite_clothes(clothes_l, who, file_body, dist)
                        elif acc_l:
                            self.process_sprite_acc(acc_l, who, file_body, dist)
                        elif emo_l:
                            self.process_sprite_emo(emo_l, who, file_body, dist)

        def process_files(self):
            """
            Обрабатывает файлы мода.

            Если write_into_file равно True, вместо инициализации записывает ресурсы мода в отдельный файл. Для дальнейшей инициализации ресурсов мода из файла необходимо перезагрузить БЛ.
            """
            if self.write_into_file:
                with open(self.process_mod_path() + "/autoinit_assets.rpy", "w") as log_file:
                    log_file.write("init python:\n    ")
                    for type, file_name, file in self.modFiles:
                        if type == "sound":
                            log_file.write("%s = \"%s\"\n    " % (file_name, file))
                        elif type == "image":
                            log_file.write("renpy.image(\"%s\", \"%s\")\n    " % (file_name, file))
                        if type == "sprite":
                            log_file.write("renpy.image(\"%s\", %s)\n    " % (file_name, file))
            else:
                for type, file_name, file in self.modFiles:
                    if type == "sound":
                        globals()[file_name] = file
                    elif type == "image":
                        renpy.image(file_name, file)
                    if type == "sprite":
                        renpy.image(file_name, eval(file))

        def initialize(self):
            """
            Инициализация ресурсов мода
            """
            self.process_audio()
            self.process_images()
            self.process_files()