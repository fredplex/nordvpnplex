FROM ghcr.io/linuxserver/baseimage-ubuntu:noble
LABEL maintainer="fredplexx@gmail.com"

ARG NORDVPN_VERSION='5.1.0'
ARG IMAGE_VERSION='5.5.1'

# OCI standard image labels — externally queryable without running the container:
#   docker inspect <image> --format '{{json .Config.Labels}}'
LABEL org.opencontainers.image.title="nordvpn-unraid" \
      org.opencontainers.image.description="NordVPN Linux client Docker image for Unraid" \
      org.opencontainers.image.version="${IMAGE_VERSION}" \
      org.opencontainers.image.vendor="fredplex" \
      org.opencontainers.image.source="https://github.com/fredplex/nordvpnplex"

# Expose version at runtime so cont-init.d/00-version and verify.sh can read it
ENV IMAGE_VERSION=${IMAGE_VERSION}

ARG DEBIAN_FRONTEND=noninteractive

RUN apt-get update -y && \
    apt-get upgrade -y && \
    apt-get install -y curl iputils-ping libc6 wireguard net-tools && \
    curl https://repo.nordvpn.com/deb/nordvpn/debian/pool/main/n/nordvpn-release/nordvpn-release_1.0.0_all.deb --output /tmp/nordrepo.deb && \
    apt-get install -y /tmp/nordrepo.deb && \
    apt-get update -y && \
    apt-get install -y nordvpn${NORDVPN_VERSION:+=$NORDVPN_VERSION} && \
    apt-get remove -y nordvpn-release && \
    apt-get autoremove -y && \
    apt-get autoclean -y && \
    rm -rf \
		/tmp/* \
		/var/cache/apt/archives/* \
		/var/lib/apt/lists/* \
		/var/tmp/*

COPY /rootfs /

# Change permissions for the copied files
RUN chmod 0755 /usr/bin/dockerNetworks && \
    chmod 0755 /usr/bin/dockerNetworks6 && \
    chmod 0755 /usr/bin/nord_config && \
    chmod 0755 /usr/bin/nord_connect && \
    chmod 0755 /usr/bin/nord_login && \
    chmod 0755 /usr/bin/nord_watch && \
    chmod 0755 /etc/services.d/nordvpn/data/check && \
    chmod 0755 /etc/services.d/nordvpn/run && \
    chmod 0755 /etc/services.d/nordvpn/finish && \
    chmod 0755 /etc/cont-init.d/* 

ENV S6_CMD_WAIT_FOR_SERVICES=1

CMD nord_login && nord_config && nord_connect && nord_watch