init python:
    class moduleInstaller_mymod:
        """
        :doc: ModuleInstaller object

        Установщик Python модулей для модов Бесконечного Лета

        `mod_name` : str
            Название корневой директории мода
        """

        def __init__(self, mod_name):
            self.mod_name = mod_name
            self.mod_folder = self.find_mod_folder()
            self.renpy_python_packages_folder_path = self.create_renpy_package_folder()

        def create_renpy_package_folder(self):
            renpy_python_packages = config.gamedir + "/python-packages"
            if not os.path.exists(renpy_python_packages):
                os.mkdir(renpy_python_packages)
            return renpy_python_packages

        def find_mod_folder(self):
            import fnmatch
            import os
            try:
                if os.path.exists(config.gamedir + "/" + self.mod_name): # Если находит папку с именем мода в папке game
                    mod_folder = config.gamedir + "/" + self.mod_name # Путь до самого мода идёт через game
                else:
                    for root, dirnames, filenames in os.walk('../../workshop/content/331470'):
                        for x in dirnames:
                            if x.endswith(self.mod_name): # Если находит папки с именем мода в папке workshop
                                mod_folder = os.path.join(root, x) # Путь до самого мода идёт через workshop
                                break
                return mod_folder.replace("\\", "/")
            except Exception as e:
                renpy.error("Error while finding mod folder: {}".format(e))

        def find_mod_python_packages_folder_path(self):
            try:
                module_source_folder = self.mod_folder + "/python-packages/"
                return module_source_folder.replace("\\", "/")
            except Exception as e:
                renpy.error("Error while finding mod python-packages folder path: {}".format(e))

        def download_module(self, module_name):
            try:
                module_destination_folder = self.renpy_python_packages_folder_path + "/" + module_name + "/"
                if not os.path.exists(module_destination_folder):
                    os.system("pip install --target game/python-packages {}".format(module_name))
            except Exception as e:
                renpy.error("Error while downloading module: {}".format(e))

        def copy_folder(self, src, dst):
            if not os.path.exists(dst):
                os.makedirs(dst)

            for item in os.listdir(src):
                s = os.path.join(src, item)
                d = os.path.join(dst, item)

                if os.path.isdir(s):
                    self.copy_folder(s, d)
                else:
                    with open(s, 'rb') as f_in:
                        with open(d, 'wb') as f_out:
                            f_out.write(f_in.read())

        def copy_module(self, module_name):
            try:
                module_source_folder = self.find_mod_python_packages_folder_path() + module_name
                module_destination_folder = self.renpy_python_packages_folder_path + "/" + module_name + "/"

                if not os.path.exists(module_destination_folder):
                    os.makedirs(module_destination_folder)

                for item in os.listdir(module_source_folder):
                    s = os.path.join(module_source_folder, item)
                    d = os.path.join(module_destination_folder, item)

                    if os.path.isdir(s):
                        self.copy_folder(s, d)
                    else:
                        with open(s, 'rb') as f_in:
                            with open(d, 'wb') as f_out:
                                f_out.write(f_in.read())
            except Exception as e:
                renpy.error("Error while copying module: {}".format(e))