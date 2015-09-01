# zhaw eventoweb grades parser

following variables need to be defined for login purpose:

* process.env.ENV_USR;
* process.env.ENV_PW;
* process.env.ENV_PHONE; no leading zeros eq +41791234567 && 0041791234567 => 41791234567
* process.env.HASH -> Access Key

the file 'sent.json' is used for file persistence..