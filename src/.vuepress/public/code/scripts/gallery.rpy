init python:
    modGallery = Gallery()
    page = 0
    gallery_mode = "cg"

    modGallery.locked_button = get_image("gui/gallery/not_opened_idle.png")
    modGallery.navigation = False

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

    for cg in gallery_cg:
        modGallery.button(cg)
        modGallery.image(im.Crop("images/cg/"+cg+".jpg" , (0, 0, 1920, 1080)))
        modGallery.unlock(cg)

    for bg in gallery_bg:
        modGallery.button(bg)
        modGallery.image(im.Crop("images/bg/"+bg+".jpg" , (0, 0, 1920, 1080)))
        modGallery.unlock(bg)
    modGallery.transition = fade

    def collect_all_ModGallery():
        if persistent.collector:
            s = [i for k in persistent._seen_images for i in k]

            for i in gallery_cg:
                if i not in s: return

            for i in gallery_bg:
                if i not in s: return

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
                            th = im.Scale(_t, 320, 180)
                            img = im.Composite((336, 196), (8, 8), im.Alpha(th, 0.9), (0, 0), im.Image(get_image("gui/gallery/thumbnail_idle.png")))
                            imgh = im.Composite((336, 196), (8, 8), th, (0, 0), im.Image(get_image("gui/gallery/thumbnail_hover.png")))
                        add g.make_button(gallery_table[n], get_image("gui/gallery/blank.png"), None, imgh, img, style="blank_button", bottom_margin=50, right_margin=50)
                        $ cg_displayed += 1

                        if n+1 == len_table:
                            $ next_page = 0

                for j in range(0, cells-cg_displayed):
                    null

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
