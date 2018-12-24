FROM debian:9.6
LABEL maintainer="Daniel Pereira <daniel@garajau.com.br>"
LABEL repository="kriansa/steamcmd"

# Set the timezone for this image
ARG TIMEZONE=UTC

# Install Steam
RUN ln -snf /usr/share/zoneinfo/$TIMEZONE /etc/localtime && \
  echo $TIMEZONE > /etc/timezone && \
  sed -i 's/main$/main contrib non-free/' /etc/apt/sources.list && \
  dpkg --add-architecture i386 && \
  echo "steam steam/purge note" | /usr/bin/debconf-set-selections && \
  echo "steamcmd	steam/license	note" | /usr/bin/debconf-set-selections && \
  echo "steamcmd	steam/question	select I AGREE" | /usr/bin/debconf-set-selections && \
  apt-get update && apt-get install -y steamcmd less net-tools ca-certificates wget && \
  rm -rf /var/lib/apt/lists/* && \
  useradd -ms /bin/bash steam && \
  /usr/games/steamcmd +quit

# Select the unprivilegd user (steam)
USER steam
ENV HOME=/home/steam
ENV PATH=/usr/games:$PATH

# Default executable
CMD /bin/bash
