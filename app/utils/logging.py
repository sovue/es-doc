import logging, re
from logging.handlers import RotatingFileHandler
from .file import ROOT
from colorama import Fore, Style
from datetime import datetime

LOG_DIR = ROOT / 'logs'
LOG_DIR.mkdir(exist_ok=True)

class Formatter(logging.Formatter):
    COLORS = {
        logging.DEBUG:      Fore.CYAN,
        logging.INFO:       Fore.GREEN,
        logging.WARNING:    Fore.YELLOW,
        logging.ERROR:      Fore.LIGHTRED_EX,
        logging.CRITICAL:   Fore.RED,
    }

    def __init__(self, colored=True):
        super().__init__()
        self.colored = colored

    def colorize(self, message):

        if self.colored:

            errors = {
                range(200,300): '\033[32m',
                range(300,400): '\033[33m',
                range(400,500): '\033[31m',
                range(500,600): '\033[37;101m',
            }

            message = re.sub(r'(?:http(s)?:\/\/)?(?:\d{1,3}\.){3}\d{1,3}(?::\d{1,5})?', '\033[1;37m\\g<0>\033[0m', message)
            message = re.sub(r'\[(\d+)\]', '[\033[36m\\g<1>\033[0m]', message)
            message = re.sub(r'(GET|POST|PUT|PATCH|DELETE)', '\033[1;37m\\g<1>\033[0m', message)
            message = re.sub(r'#A\"(.+)\"#', '\033[1;37m"\\g<1>"\033[0m', message)
            errcolor = ''
            if re.search(r'#Ccode (\d+)#', message):
                for codes, clr in errors.items():
                    if int(re.search(r'#Ccode (\d+)#', message).group(1)) in codes:
                        errcolor = clr
            message = re.sub(r'#Ccode (\d+)#', f'{errcolor}code \\g<1>\033[0m', message)

            return message

        message = re.sub(r'#A\"(.+)\"#', '"\\g<1>"', message)
        message = re.sub(r'#Ccode (\d+)#', 'code \\g<1>', message)

        return message

    def format(self, record: logging.LogRecord):
        color = self.COLORS.get(record.levelno, '') if self.colored else ''
        timestamp = datetime.fromtimestamp(record.created).strftime('%d.%m.%y %H:%M:%S.%f')
        message = self.colorize(record.getMessage())
        if record.exc_info:
            message += "\n" + self.formatException(record.exc_info)
        return f'{timestamp} - [{record.name}] - [{color}{record.levelname}{"\033[0m" if self.colored else ""}]:\t{message}'

root_logger = logging.getLogger('app')
root_logger.setLevel(logging.INFO)

console_handler = logging.StreamHandler()
console_handler.setFormatter(Formatter())
root_logger.addHandler(console_handler)

file_handler = RotatingFileHandler(
    LOG_DIR / 'app.log',
    maxBytes=10_000_000,
    backupCount=5,
    encoding='utf-8',
)
file_handler.setFormatter(Formatter(False))
root_logger.addHandler(file_handler)


l = logging.getLogger('uvicorn')
l.propagate = False
l.setLevel(logging.INFO)
l.addHandler(console_handler)
l.addHandler(file_handler)

l = logging.getLogger('uvicorn.error')
l.setLevel(logging.INFO)

logging.getLogger('uvicorn.access').propagate = False
