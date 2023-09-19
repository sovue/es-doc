init python:
    if not hasattr(store, "persistent.translate_text_lang"):
        persistent.translate_text_lang = "ru"

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

    def translate_toggle_lang():
        persistent.translate_text_lang = "ru" if persistent.translate_text_lang != "ru" else "en"

    config.custom_text_tags["en"] = translate_en_tag
    config.custom_text_tags["ru"] = translate_ru_tag

    translation_new["translator"] = {}
    translation_new["translator"]["name"] = {}
    translation_new["translator"]["characters"] = {}
    translation_new["translator"]["characters"]["samantha"] = {}

    translation_new["translator"]["name"]["english"] = "Translator"
    translation_new["translator"]["name"][None] = u"Переводчик"

    translation_new["translator"]["characters"]["samantha"]["english"] = "Samantha"
    translation_new["translator"]["characters"]["samantha"][None] = "Саманта"

    translator_sam = Character(translation_new["translator"]["characters"]["samantha"][_preferences.language])

    mods["translator_test"] = translation_new["translator"]["name"][_preferences.language]
