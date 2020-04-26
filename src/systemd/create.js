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
ExecRestart=` + dir + `/redx restart
TimeoutSec=30
Restart=on-failure
RestartSec=5
StartLimitInterval=350
StartLimitBurst=10

[Install]
WantedBy=multi-user.target`
}