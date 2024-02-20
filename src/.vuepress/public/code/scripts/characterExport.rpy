init python:
    import os
    listCharacters = {}
    for entry in globals():
        if isinstance(globals()[entry], renpy.character.ADVCharacter):
            listCharacters[entry] = globals()[entry]
    with open("characters.txt", "w") as fileCharacters:
        for entry in sorted(listCharacters):
            fileCharacters.write("Переменная: " + str(entry) + "\nИмя: " + str(listCharacters[entry].name) + "\nСвойства стиля имени: " + str(listCharacters[entry].who_args) + "\n\n")
    os.startfile("characters.txt")
