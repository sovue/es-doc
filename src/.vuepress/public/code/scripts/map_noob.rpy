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
