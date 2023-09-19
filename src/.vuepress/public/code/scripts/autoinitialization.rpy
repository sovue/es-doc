init -1200 python:
    import os
    from os import path
    modID = 'mymod'
    mod_prefix = False
    if mod_prefix:
        mod_prefix = '_' + mod_prefix
    else:
        mod_prefix = ''
    mod_dist = {'normal': '', 'far': 'far', 'close': 'close'}
    mod_size = {'normal': ((600, 720) if renpy.mobile else (900, 1080)),
                'far': ((420, 720) if renpy.mobile else (675, 1080)),
                'close': ((700, 720) if renpy.mobile else (1125, 1080))}
    for file in renpy.list_files(): # Автообъявление музыки/звуков/etc
        if modID in file:
            file_name = path.splitext(path.basename(file))[0] + mod_prefix
            if file.endswith((".wav", ".mp2", ".mp3", ".ogg", ".opus")):
                globals()[file_name] = file
    for dir, fn in renpy.loader.listdirfiles(False): # Строим пути до папки с изображениями мода
        if modID in fn:
            mod_imgs_path = dir + '/' + modID + r'/images/'
    for folder in os.listdir(mod_imgs_path): # Автообъявление изображений
            path = mod_imgs_path + folder + '/'
            for file in os.listdir(path):
                mod_autoinitializating_images = folder + ' ' + file[:file.find('.')] + mod_prefix
                if folder != 'sprites':
                    renpy.image(mod_autoinitializating_images, path[path.find(modID):] + file)
                else:
                    for dist in os.listdir(path):
                        who_path = path + dist + '/'
                        for who in os.listdir(who_path):
                            who_path_num = who_path + who + '/'
                            for numb in os.listdir(who_path_num):
                                sprite_folders = os.listdir(
                                    who_path_num + numb + '/')

                                for i in sprite_folders:
                                    if 'body.png' in i:
                                        file_body = who_path_num[who_path_num.find(
                                            modID):] + numb + '/' + i
                                        break
                                    else:
                                        file_body = im.Alpha("images/misc/soviet_games.png", 0.0) # Заглушка чтобы не крашило игру, если не находит тело
                                        #break
                                body = sprite_folders
                                clothes_l = list()
                                emo_l = list()
                                acc_l = list()

                                if 'clothes' in sprite_folders:
                                    for clothes in os.listdir(who_path_num + numb + r'/clothes/'):
                                        clothes_l.append([(clothes.split('_'+numb+"_", 1)[-1][:-4] if "_"+numb+"_" in clothes else clothes[:-4]), who_path_num[who_path_num.find(modID):] + numb + r'/clothes/'+clothes])

                                if 'emo' in sprite_folders:
                                    for emo in os.listdir(who_path_num + numb + r'/emo/'):
                                        emo_l.append([(emo.split('_'+numb+"_", 1)[-1][:-4] if "_"+numb+"_" in emo else emo[:-4]), who_path_num[who_path_num.find(modID):] + numb + r'/emo/'+emo])

                                if 'acc' in sprite_folders:
                                    for acc in os.listdir(who_path_num + numb + r'/acc/'):
                                        acc_l.append([(acc.split('_'+numb+"_", 1)[-1][:-4] if "_"+numb+"_" in acc else acc[:-4]), who_path_num[who_path_num.find(modID):] + numb + r'/acc/'+acc])

                                renpy.image(who + mod_prefix + ' ' + mod_dist[dist],
                                            ConditionSwitch(
                                                "persistent.sprite_time=='sunset'",
                                    im.MatrixColor(im.Composite(mod_size[dist],
                                                                (0, 0), file_body),
                                                    im.matrix.tint(
                                        0.94, 0.82, 1.0)
                                    ),

                                                "persistent.sprite_time=='night'",
                                    im.MatrixColor(im.Composite(mod_size[dist],
                                                                (0, 0), file_body),
                                                    im.matrix.tint(
                                        0.63, 0.78, 0.82)
                                    ),

                                                True,
                                    im.Composite(mod_size[dist],
                                                    (0, 0), file_body)
                                )
                                )
                                if 'clothes' and 'emo' and 'acc' in sprite_folders:
                                    for emotion in emo_l:
                                        for clothes in clothes_l:
                                            for acc in acc_l:
                                                renpy.image(who + mod_prefix + ' ' + emotion[0] + ' ' + clothes[0] + ' ' + acc[0] + ' ' + mod_dist[dist],
                                                            ConditionSwitch(
                                                                "persistent.sprite_time=='sunset'",
                                                    im.MatrixColor(im.Composite(mod_size[dist],
                                                                                (0, 0), file_body,
                                                                                (0, 0), clothes[1],
                                                                                (0, 0), emotion[1],
                                                                                (0, 0), acc[1]),
                                                                    im.matrix.tint(
                                                        0.94, 0.82, 1.0)
                                                    ),

                                                                "persistent.sprite_time=='night'",
                                                    im.MatrixColor(im.Composite(mod_size[dist],
                                                                                (0, 0), file_body,
                                                                                (0, 0), clothes[1],
                                                                                (0, 0), emotion[1],
                                                                                (0, 0), acc[1]),
                                                                    im.matrix.tint(
                                                        0.63, 0.78, 0.82)
                                                    ),

                                                                True,
                                                    im.Composite(mod_size[dist],
                                                                    (0, 0), file_body,
                                                                    (0, 0), clothes[1],
                                                                    (0, 0), emotion[1],
                                                                    (0, 0), acc[1])
                                                )
                                                )
                                                renpy.image(who + mod_prefix + ' ' + emotion[0] + ' ' + clothes[0] + ' ' + mod_dist[dist],
                                                            ConditionSwitch(
                                                                "persistent.sprite_time=='sunset'",
                                                    im.MatrixColor(im.Composite(mod_size[dist],
                                                                                (0, 0), file_body,
                                                                                (0, 0), clothes[1],
                                                                                (0, 0), emotion[1]),
                                                                    im.matrix.tint(
                                                        0.94, 0.82, 1.0)
                                                    ),

                                                                "persistent.sprite_time=='night'",
                                                    im.MatrixColor(im.Composite(mod_size[dist],
                                                                                (0, 0), file_body,
                                                                                (0, 0), clothes[1],
                                                                                (0, 0), emotion[1]),
                                                                    im.matrix.tint(
                                                        0.63, 0.78, 0.82)
                                                    ),

                                                                True,
                                                    im.Composite(mod_size[dist],
                                                                    (0, 0), file_body,
                                                                    (0, 0), clothes[1],
                                                                    (0, 0), emotion[1])
                                                )
                                                )
                                                renpy.image(who + mod_prefix + ' ' + emotion[0] + ' ' + acc[0] + ' ' + mod_dist[dist],
                                                            ConditionSwitch(
                                                                "persistent.sprite_time=='sunset'",
                                                    im.MatrixColor(im.Composite(mod_size[dist],
                                                                                (0, 0), file_body,
                                                                                (0, 0), emotion[1],
                                                                                (0, 0), acc[1]),
                                                                    im.matrix.tint(
                                                        0.94, 0.82, 1.0)
                                                    ),

                                                                "persistent.sprite_time=='night'",
                                                    im.MatrixColor(im.Composite(mod_size[dist],
                                                                                (0, 0), file_body,
                                                                                (0, 0), emotion[1],
                                                                                (0, 0), acc[1]),
                                                                    im.matrix.tint(
                                                        0.63, 0.78, 0.82)
                                                    ),

                                                                True,
                                                    im.Composite(mod_size[dist],
                                                                    (0, 0), file_body,
                                                                    (0, 0), emotion[1],
                                                                    (0, 0), acc[1])
                                                )
                                                )
                                                renpy.image(who + mod_prefix + ' ' + clothes[0] + ' ' + acc[0] + ' ' + mod_dist[dist],
                                                            ConditionSwitch(
                                                                "persistent.sprite_time=='sunset'",
                                                    im.MatrixColor(im.Composite(mod_size[dist],
                                                                                (0, 0), file_body,
                                                                                (0, 0), clothes[1],
                                                                                (0, 0), acc[1]),
                                                                    im.matrix.tint(
                                                        0.94, 0.82, 1.0)
                                                    ),

                                                                "persistent.sprite_time=='night'",
                                                    im.MatrixColor(im.Composite(mod_size[dist],
                                                                                (0, 0), file_body,
                                                                                (0, 0), clothes[1],
                                                                                (0, 0), acc[1]),
                                                                    im.matrix.tint(
                                                        0.63, 0.78, 0.82)
                                                    ),

                                                                True,
                                                    im.Composite(mod_size[dist],
                                                                    (0, 0), file_body,
                                                                    (0, 0), clothes[1],
                                                                    (0, 0), acc[1])
                                                )
                                                )
                                                renpy.image(who + mod_prefix + ' ' + emotion[0] + ' ' + mod_dist[dist],
                                                            ConditionSwitch(
                                                                "persistent.sprite_time=='sunset'",
                                                    im.MatrixColor(im.Composite(mod_size[dist],
                                                                                (0, 0), file_body,
                                                                                (0, 0), emotion[1]),
                                                                    im.matrix.tint(
                                                        0.94, 0.82, 1.0)
                                                    ),

                                                                "persistent.sprite_time=='night'",
                                                    im.MatrixColor(im.Composite(mod_size[dist],
                                                                                (0, 0), file_body,
                                                                                (0, 0), emotion[1]),
                                                                    im.matrix.tint(
                                                        0.63, 0.78, 0.82)
                                                    ),

                                                                True,
                                                    im.Composite(mod_size[dist],
                                                                    (0, 0), file_body,
                                                                    (0, 0), emotion[1])
                                                )
                                                )
                                                renpy.image(who + mod_prefix + ' ' + acc[0] + ' ' + mod_dist[dist],
                                                            ConditionSwitch(
                                                                "persistent.sprite_time=='sunset'",
                                                    im.MatrixColor(im.Composite(mod_size[dist],
                                                                                (0, 0), file_body,
                                                                                (0, 0), acc[1]),
                                                                    im.matrix.tint(
                                                        0.94, 0.82, 1.0)
                                                    ),

                                                                "persistent.sprite_time=='night'",
                                                    im.MatrixColor(im.Composite(mod_size[dist],
                                                                                (0, 0), file_body,
                                                                                (0, 0), acc[1]),
                                                                    im.matrix.tint(
                                                        0.63, 0.78, 0.82)
                                                    ),

                                                                True,
                                                    im.Composite(mod_size[dist],
                                                                    (0, 0), file_body,
                                                                    (0, 0), acc[1])
                                                )
                                                )
                                                renpy.image(who + mod_prefix + ' ' + clothes[0] + ' ' + mod_dist[dist],
                                                            ConditionSwitch(
                                                                "persistent.sprite_time=='sunset'",
                                                    im.MatrixColor(im.Composite(mod_size[dist],
                                                                                (0, 0), file_body,
                                                                                (0, 0), clothes[1]),
                                                                    im.matrix.tint(
                                                        0.94, 0.82, 1.0)
                                                    ),

                                                                "persistent.sprite_time=='night'",
                                                    im.MatrixColor(im.Composite(mod_size[dist],
                                                                                (0, 0), file_body,
                                                                                (0, 0), clothes[1]),
                                                                    im.matrix.tint(
                                                        0.63, 0.78, 0.82)
                                                    ),

                                                                True,
                                                    im.Composite(mod_size[dist],
                                                                    (0, 0), file_body,
                                                                    (0, 0), clothes[1])
                                                )
                                                )
                                if 'clothes' and 'emo' in sprite_folders:
                                    for clothes in clothes_l:
                                        for emotion in emo_l:
                                            renpy.image(who + mod_prefix + ' ' + clothes[0] + ' ' + mod_dist[dist],
                                                        ConditionSwitch(
                                                            "persistent.sprite_time=='sunset'",
                                                im.MatrixColor(im.Composite(mod_size[dist],
                                                                            (0, 0), file_body,
                                                                            (0, 0), clothes[1]),
                                                                im.matrix.tint(
                                                    0.94, 0.82, 1.0)
                                                ),

                                                            "persistent.sprite_time=='night'",
                                                im.MatrixColor(im.Composite(mod_size[dist],
                                                                            (0, 0), file_body,
                                                                            (0, 0), clothes[1]),
                                                                im.matrix.tint(
                                                    0.63, 0.78, 0.82)
                                                ),

                                                            True,
                                                im.Composite(mod_size[dist],
                                                                (0, 0), file_body,
                                                                (0, 0), clothes[1])
                                            )
                                            )
                                            renpy.image(who + mod_prefix + ' ' + emotion[0] + ' ' + clothes[0] + ' ' + mod_dist[dist],
                                                        ConditionSwitch(
                                                            "persistent.sprite_time=='sunset'",
                                                im.MatrixColor(im.Composite(mod_size[dist],
                                                                            (0, 0), file_body,
                                                                            (0, 0), clothes[1],
                                                                            (0, 0), emotion[1]),
                                                                im.matrix.tint(
                                                    0.94, 0.82, 1.0)
                                                ),

                                                            "persistent.sprite_time=='night'",
                                                im.MatrixColor(im.Composite(mod_size[dist],
                                                                            (0, 0), file_body,
                                                                            (0, 0), clothes[1],
                                                                            (0, 0), emotion[1]),
                                                                im.matrix.tint(
                                                    0.63, 0.78, 0.82)
                                                ),

                                                            True,
                                                im.Composite(mod_size[dist],
                                                                (0, 0), file_body,
                                                                (0, 0), clothes[1],
                                                                (0, 0), emotion[1])
                                            )
                                            )
                                            renpy.image(who + mod_prefix + ' ' + emotion[0] + ' ' + mod_dist[dist],
                                                        ConditionSwitch(
                                                            "persistent.sprite_time=='sunset'",
                                                im.MatrixColor(im.Composite(mod_size[dist],
                                                                            (0, 0), file_body,
                                                                            (0, 0), emotion[1]),
                                                                im.matrix.tint(
                                                    0.94, 0.82, 1.0)
                                                ),

                                                            "persistent.sprite_time=='night'",
                                                im.MatrixColor(im.Composite(mod_size[dist],
                                                                            (0, 0), file_body,
                                                                            (0, 0), emotion[1]),
                                                                im.matrix.tint(
                                                    0.63, 0.78, 0.82)
                                                ),

                                                            True,
                                                im.Composite(mod_size[dist],
                                                                (0, 0), file_body,
                                                                (0, 0), emotion[1])
                                            )
                                            )
                                if 'clothes' and 'acc' in sprite_folders:
                                    for clothes in clothes_l:
                                        for acc in acc_l:
                                            renpy.image(who + mod_prefix + ' ' + clothes[0] + ' ' + mod_dist[dist],
                                                        ConditionSwitch(
                                                            "persistent.sprite_time=='sunset'",
                                                im.MatrixColor(im.Composite(mod_size[dist],
                                                                            (0, 0), file_body,
                                                                            (0, 0), clothes[1]),
                                                                im.matrix.tint(
                                                    0.94, 0.82, 1.0)
                                                ),

                                                            "persistent.sprite_time=='night'",
                                                im.MatrixColor(im.Composite(mod_size[dist],
                                                                            (0, 0), file_body,
                                                                            (0, 0), clothes[1]),
                                                                im.matrix.tint(
                                                    0.63, 0.78, 0.82)
                                                ),

                                                            True,
                                                im.Composite(mod_size[dist],
                                                                (0, 0), file_body,
                                                                (0, 0), clothes[1])
                                            )
                                            )
                                            renpy.image(who + mod_prefix + ' ' + clothes[0] + ' ' + acc[0] + ' ' + mod_dist[dist],
                                                        ConditionSwitch(
                                                            "persistent.sprite_time=='sunset'",
                                                im.MatrixColor(im.Composite(mod_size[dist],
                                                                            (0, 0), file_body,
                                                                            (0, 0), clothes[1],
                                                                            (0, 0), acc[1]),
                                                                im.matrix.tint(
                                                    0.94, 0.82, 1.0)
                                                ),

                                                            "persistent.sprite_time=='night'",
                                                im.MatrixColor(im.Composite(mod_size[dist],
                                                                            (0, 0), file_body,
                                                                            (0, 0), clothes[1],
                                                                            (0, 0), acc[1]),
                                                                im.matrix.tint(
                                                    0.63, 0.78, 0.82)
                                                ),

                                                            True,
                                                im.Composite(mod_size[dist],
                                                                (0, 0), file_body,
                                                                (0, 0), clothes[1],
                                                                (0, 0), acc[1])
                                            )
                                            )
                                            renpy.image(who + mod_prefix + ' ' + acc[0] + ' ' + mod_dist[dist],
                                                        ConditionSwitch(
                                                            "persistent.sprite_time=='sunset'",
                                                im.MatrixColor(im.Composite(mod_size[dist],
                                                                            (0, 0), file_body,
                                                                            (0, 0), acc[1]),
                                                                im.matrix.tint(
                                                    0.94, 0.82, 1.0)
                                                ),

                                                            "persistent.sprite_time=='night'",
                                                im.MatrixColor(im.Composite(mod_size[dist],
                                                                            (0, 0), file_body,
                                                                            (0, 0), acc[1]),
                                                                im.matrix.tint(
                                                    0.63, 0.78, 0.82)
                                                ),

                                                            True,
                                                im.Composite(mod_size[dist],
                                                                (0, 0), file_body,
                                                                (0, 0), acc[1])
                                            )
                                            )
                                if 'emo' and 'acc' in sprite_folders:
                                    for emotion in emo_l:
                                        for acc in acc_l:
                                            renpy.image(who + mod_prefix + ' ' + emotion[0] + ' ' + mod_dist[dist],
                                                        ConditionSwitch(
                                                            "persistent.sprite_time=='sunset'",
                                                im.MatrixColor(im.Composite(mod_size[dist],
                                                                            (0, 0), file_body,
                                                                            (0, 0), emotion[1]),
                                                                im.matrix.tint(
                                                    0.94, 0.82, 1.0)
                                                ),

                                                            "persistent.sprite_time=='night'",
                                                im.MatrixColor(im.Composite(mod_size[dist],
                                                                            (0, 0), file_body,
                                                                            (0, 0), emotion[1]),
                                                                im.matrix.tint(
                                                    0.63, 0.78, 0.82)
                                                ),

                                                            True,
                                                im.Composite(mod_size[dist],
                                                                (0, 0), file_body,
                                                                (0, 0), emotion[1])
                                            )
                                            )
                                            renpy.image(who + mod_prefix + ' ' + emotion[0] + ' ' + acc[0] + ' ' + mod_dist[dist],
                                                        ConditionSwitch(
                                                            "persistent.sprite_time=='sunset'",
                                                im.MatrixColor(im.Composite(mod_size[dist],
                                                                            (0, 0), file_body,
                                                                            (0, 0), emotion[1],
                                                                            (0, 0), acc[1]),
                                                                im.matrix.tint(
                                                    0.94, 0.82, 1.0)
                                                ),

                                                            "persistent.sprite_time=='night'",
                                                im.MatrixColor(im.Composite(mod_size[dist],
                                                                            (0, 0), file_body,
                                                                            (0, 0), emotion[1],
                                                                            (0, 0), acc[1]),
                                                                im.matrix.tint(
                                                    0.63, 0.78, 0.82)
                                                ),

                                                            True,
                                                im.Composite(mod_size[dist],
                                                                (0, 0), file_body,
                                                                (0, 0), emotion[1],
                                                                (0, 0), acc[1])
                                            )
                                            )
                                            renpy.image(who + mod_prefix + ' ' + acc[0] + ' ' + mod_dist[dist],
                                                        ConditionSwitch(
                                                            "persistent.sprite_time=='sunset'",
                                                im.MatrixColor(im.Composite(mod_size[dist],
                                                                            (0, 0), file_body,
                                                                            (0, 0), acc[1]),
                                                                im.matrix.tint(
                                                    0.94, 0.82, 1.0)
                                                ),

                                                            "persistent.sprite_time=='night'",
                                                im.MatrixColor(im.Composite(mod_size[dist],
                                                                            (0, 0), file_body,
                                                                            (0, 0), acc[1]),
                                                                im.matrix.tint(
                                                    0.63, 0.78, 0.82)
                                                ),

                                                            True,
                                                im.Composite(mod_size[dist],
                                                                (0, 0), file_body,
                                                                (0, 0), acc[1])
                                            )
                                            )
                                if 'clothes' in sprite_folders:
                                    for clothes in clothes_l:
                                        renpy.image(who + mod_prefix + ' ' + clothes[0] + ' ' + mod_dist[dist],
                                                    ConditionSwitch(
                                                        "persistent.sprite_time=='sunset'",
                                            im.MatrixColor(im.Composite(mod_size[dist],
                                                                        (0, 0), file_body,
                                                                        (0, 0), clothes[1]),
                                                            im.matrix.tint(
                                                0.94, 0.82, 1.0)
                                            ),

                                                        "persistent.sprite_time=='night'",
                                            im.MatrixColor(im.Composite(mod_size[dist],
                                                                        (0, 0), file_body,
                                                                        (0, 0), clothes[1]),
                                                            im.matrix.tint(
                                                0.63, 0.78, 0.82)
                                            ),

                                                        True,
                                            im.Composite(mod_size[dist],
                                                            (0, 0), file_body,
                                                            (0, 0), clothes[1])
                                        )
                                        )
                                if 'acc' in sprite_folders:
                                    for acc in acc_l:
                                        renpy.image(who + mod_prefix + ' ' + acc[0] + ' ' + mod_dist[dist],
                                                    ConditionSwitch(
                                                        "persistent.sprite_time=='sunset'",
                                            im.MatrixColor(im.Composite(mod_size[dist],
                                                                        (0, 0), file_body,
                                                                        (0, 0), acc[1]),
                                                            im.matrix.tint(
                                                0.94, 0.82, 1.0)
                                            ),

                                                        "persistent.sprite_time=='night'",
                                            im.MatrixColor(im.Composite(mod_size[dist],
                                                                        (0, 0), file_body,
                                                                        (0, 0), acc[1]),
                                                            im.matrix.tint(
                                                0.63, 0.78, 0.82)
                                            ),
                                                        True,
                                            im.Composite(mod_size[dist],
                                                            (0, 0), file_body,
                                                            (0, 0), acc[1])
                                        )
                                        )
                                if 'emo' in sprite_folders:
                                    for emotion in emo_l:
                                        renpy.image(who + mod_prefix + ' ' + emotion[0] + ' ' + mod_dist[dist],
                                                    ConditionSwitch(
                                                        "persistent.sprite_time=='sunset'",
                                            im.MatrixColor(im.Composite(mod_size[dist],
                                                                        (0, 0), file_body,
                                                                        (0, 0), emotion[1]),
                                                            im.matrix.tint(
                                                0.94, 0.82, 1.0)
                                            ),

                                                        "persistent.sprite_time=='night'",
                                            im.MatrixColor(im.Composite(mod_size[dist],
                                                                        (0, 0), file_body,
                                                                        (0, 0), emotion[1]),
                                                            im.matrix.tint(
                                                0.63, 0.78, 0.82)
                                            ),

                                                        True,
                                            im.Composite(mod_size[dist],
                                                            (0, 0), file_body,
                                                            (0, 0), emotion[1])
                                        )
                                        )
