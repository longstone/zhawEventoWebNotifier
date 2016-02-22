# zhaw eventoweb grades parser

following variables need to be defined for login purpose:

obsolet notification.me params
* process.env.ENV_PHONE; no leading zeros eq +41791234567 && 0041791234567 => 41791234567
* process.env.HASH -> Access Key

the file 'sent.json' is used for file persistence..

place an .env file in the folder

here is mine:
longstone:zhawEventoWebNotifier longstone$ tail .env 
ENV_PW=mypw
ENV_USR=mymail@students.zhaw.ch

## disclaimer - notificatio.me is no longer supported. i need to implement a new notification channel...