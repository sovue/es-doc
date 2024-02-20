init python:
    class PlayerPause:
        def __init__(self, channel="music", fadein=2):
            self.channel = channel
            self.fadein = fadein
            self.time = 0
            self.file = renpy.music.get_playing(channel)
        def pause(self, fadeout=2):
            self.time = renpy.music.get_pos(self.channel)
            renpy.music.stop(self.channel, fadeout)
        def resume(self, fadein=2):
            renpy.music.play("<from {}>{}".format(self.time, self.file), fadein=fadein)
        def getFile(self):
            return self.file
        def getTime(self):
            return self.time
