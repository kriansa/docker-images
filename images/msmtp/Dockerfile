FROM docker.io/library/alpine:3.23.2

ARG MSMTP_VERSION=1.8.32-r1
RUN addgroup -Sg 900 msmtp && adduser -SDHu 900 -G msmtp msmtp && \
  apk add --no-cache libcap "msmtp=$MSMTP_VERSION" && \
  setcap cap_net_bind_service=+ep /usr/bin/msmtp && apk del libcap

USER msmtp
VOLUME /etc/msmtprc

# This image must be executed with --init
CMD ["msmtpd", "--interface=0.0.0.0", "--port=25"]
