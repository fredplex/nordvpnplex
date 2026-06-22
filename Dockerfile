FROM ghcr.io/linuxserver/baseimage-ubuntu:noble
LABEL maintainer="fredplexx@gmail.com"

# set tags before docker-publish only! :  git tag -a 5.2.1.1 -m "bump to Nordvpn 4.1.2"; git push --tags

ARG NORDVPN_VERSION='4.5.0'
ARG IMAGE_VERSION='5.5.0'

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
    chmod 0755 /usr/bin/version_message && \
    chmod 0755 /etc/services.d/nordvpn/data/check && \
    chmod 0755 /etc/services.d/nordvpn/run && \
    chmod 0755 /etc/services.d/nordvpn/finish && \
    chmod 0755 /etc/cont-init.d/* 

ENV S6_CMD_WAIT_FOR_SERVICES=1



RUN echo ${IMAGE_VERSION} >> /.version

CMD version_message && nord_login && nord_config && nord_connect && nord_watch