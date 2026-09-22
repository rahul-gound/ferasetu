#!/usr/bin/env bash
set -e

echo "=== Initializing FeraSetu Postfix Service (Direct In-Container MTA) ==="

# 1. Install custom configuration files if mounted
CFG_SOURCE="/opt/postfix_config"
if [ -d "$CFG_SOURCE" ]; then
    if [ -f "$CFG_SOURCE/main.cf" ]; then
        cp -f "$CFG_SOURCE/main.cf" /etc/postfix/main.cf
        echo "Installed /etc/postfix/main.cf from $CFG_SOURCE"
    fi
    if [ -f "$CFG_SOURCE/master.cf" ]; then
        cp -f "$CFG_SOURCE/master.cf" /etc/postfix/master.cf
        echo "Installed /etc/postfix/master.cf from $CFG_SOURCE"
    fi
fi

# 2. Enforce strict direct MTA settings via postconf
postconf -e "maillog_file = /dev/stdout"
postconf -e "inet_interfaces = 127.0.0.1"
postconf -e "inet_protocols = ipv4"
postconf -e "myhostname = mail.ferasetu.com"
postconf -e "mydomain = ferasetu.com"
postconf -e "relayhost = "
postconf -e "relay_domains = "
postconf -e "mynetworks = 127.0.0.0/8 [::1]/128"
postconf -e "smtpd_client_restrictions = permit_mynetworks, reject"
postconf -e "smtpd_relay_restrictions = permit_mynetworks, reject"
postconf -e "smtpd_recipient_restrictions = permit_mynetworks, reject"
postconf -e "smtpd_sender_restrictions = permit_mynetworks, reject_non_fqdn_sender, reject_unknown_sender_domain"
postconf -e "smtpd_data_restrictions = reject_unauth_pipelining"

# 3. Check and set permissions
postfix set-permissions 2>/dev/null || true
postfix check

# 4. Start Postfix
MODE="${1:-daemon}"
if [ "$MODE" = "foreground" ] || [ "$MODE" = "fg" ]; then
    echo "Starting Postfix in foreground..."
    exec postfix start-fg
else
    echo "Checking / starting Postfix daemon..."
    if ! postfix status >/dev/null 2>&1; then
        postfix start
        echo "Postfix daemon started successfully."
    else
        postfix reload
        echo "Postfix daemon reloaded."
    fi
fi
