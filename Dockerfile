FROM ghcr.io/linuxserver/baseimage-ubuntu:noble@sha256:7fca79b08f1669556e76ec40b164e74e77484fae8d67a9bcd06ebeddc35ca5af
LABEL maintainer="fredplex@gmail.com"

ARG NORDVPN_VERSION='5.1.0'
ARG IMAGE_VERSION='5.5.2'
ARG NORDVPN_RELEASE='1.0.0'

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
    apt-get install -y curl iptables iputils-ping wireguard-tools net-tools && \
    curl -fsSL --proto '=https' --tlsv1.2 \
        "https://repo.nordvpn.com/deb/nordvpn/debian/pool/main/n/nordvpn-release/nordvpn-release_${NORDVPN_RELEASE}_all.deb" \
        --output /tmp/nordrepo.deb && \
    apt-get install -y /tmp/nordrepo.deb && \
    apt-get update -y && \
    apt-get install -y nordvpn${NORDVPN_VERSION:+=$NORDVPN_VERSION} && \
    apt-get remove -y nordvpn-release && \
    apt-get autoremove -y && \
    apt-get clean -y && \
    rm -rf \
        /tmp/* \
        /var/cache/apt/archives/* \
        /var/lib/apt/lists/* \
        /var/tmp/*

COPY --chmod=0755 rootfs /

ENV S6_CMD_WAIT_FOR_SERVICES=1

HEALTHCHECK --interval=60s --timeout=10s --start-period=45s --retries=3 \
    CMD nordvpn status | grep -q "Status: Connected" || exit 1

CMD nord_login && nord_config && nord_connect && nord_watch