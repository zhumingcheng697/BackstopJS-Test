FROM mcr.microsoft.com/playwright:focal

RUN mkdir -p /etc/gnutls && \
    echo "[overrides]" >> /etc/gnutls/config && \
    echo "default-priority-string = NORMAL:-VERS-ALL:+VERS-TLS1.3:+VERS-TLS1.2:+VERS-DTLS1.2:%PROFILE_LOW" >> /etc/gnutls/config
