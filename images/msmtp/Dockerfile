FROM docker.io/library/alpine:3.23.2
LABEL maintainer="Daniel Pereira <daniel@garajau.com.br>"
LABEL repository="kriansa/msmtp"
LABEL org.opencontainers.image.source="https://github.com/kriansa/docker-images"

ARG MSMTP_VERSION=1.8.32-r1
RUN addgroup -Sg 900 msmtp && adduser -SDHu 900 -G msmtp msmtp && \
  apk add --no-cache "msmtp=$MSMTP_VERSION"

USER msmtp
VOLUME /etc/msmtprc

# This image must be executed with --init and --cap-add=CAP_NET_BIND_SERVICE
CMD ["msmtpd", "--interface=0.0.0.0", "--port=25"]
