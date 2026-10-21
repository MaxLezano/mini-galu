# Postgres 17 + WAL-G + supercronic. La misma imagen corre la base (archiva cada cambio en el bucket de backups) y el
# servicio `backup` (copias, prueba de restauración y avisos). Ver deploy/README y docs/DEPLOY.md.

FROM postgres:17-bookworm

ARG WALG_VERSION=v3.0.8
ARG WALG_SHA256=f30544c5ce93cf83b87578e3c4a2e9c0e0ffc3d160ef89ecddaf75f397d98deb
ARG SUPERCRONIC_VERSION=v0.2.48
ARG SUPERCRONIC_SHA1=016b7c9aebfc8d9fd9526e8ba33b191fc524485f

RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates curl \
 && rm -rf /var/lib/apt/lists/* \
 && curl -fsSLo /usr/local/bin/wal-g \
      "https://github.com/wal-g/wal-g/releases/download/${WALG_VERSION}/wal-g-pg-22.04-amd64" \
 && echo "${WALG_SHA256}  /usr/local/bin/wal-g" | sha256sum -c - \
 && curl -fsSLo /usr/local/bin/supercronic \
      "https://github.com/aptible/supercronic/releases/download/${SUPERCRONIC_VERSION}/supercronic-linux-amd64" \
 && echo "${SUPERCRONIC_SHA1}  /usr/local/bin/supercronic" | sha1sum -c - \
 && chmod +x /usr/local/bin/wal-g /usr/local/bin/supercronic

COPY bin/ /usr/local/bin/
COPY crontab /etc/mini-galu/crontab
RUN chmod +x /usr/local/bin/mg-*
