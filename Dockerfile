ARG BASE_DIGEST='sha256:876dee739176903a54f8a639ea4f4a1b63d36b1ec8dc7295ed57419c0252bd6d'
FROM ghcr.io/linuxserver/baseimage-ubuntu:noble@${BASE_DIGEST}
LABEL maintainer="fredplex@gmail.com"

ARG BASE_DIGEST
ARG NORDVPN_VERSION='5.2.0'
ARG IMAGE_VERSION='5.5.6'
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

# Generate build version metadata for LSIO init branding
RUN echo "nordvpnplex version: ${IMAGE_VERSION}" > /build_version && \
    echo "base image digest: ${BASE_DIGEST}" >> /build_version

COPY --chmod=0755 rootfs /

ENV S6_CMD_WAIT_FOR_SERVICES=1

HEALTHCHECK --interval=60s --timeout=10s --start-period=45s --retries=3 \
    CMD nordvpn status | grep -q "Status: Connected" || exit 1

CMD nord_login && nord_config && nord_connect && nord_watch