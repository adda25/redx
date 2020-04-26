'use strict'

module.exports = (dir) => {
return `
[Unit]
Description=RedX Service
After=network.target
After=systemd-user-sessions.service
After=network-online.target

[Service]
Type=forking
WorkingDirectory=` + dir + `
ExecStart=` + dir + `/redx start
ExecStop=` + dir + `/redx stop
ExecReload=` + dir + `/redx reload
TimeoutSec=30
Restart=always
RestartSec=5
StartLimitInterval=350
StartLimitBurst=10

[Install]
WantedBy=multi-user.target`
}