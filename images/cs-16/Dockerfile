FROM kriansa/steamcmd:2020-05-23
LABEL maintainer="Daniel Pereira <daniel@garajau.com.br>"
LABEL repository="kriansa/cs-16"

# Runtime settings
ENV RCON_PASSWORD=""
ENV SV_PASSWORD=""
ENV MAXPLAYERS="12"
ENV MAPNAME="de_dust2"

# Copy needed files to their folders
RUN mkdir $HOME/hlds
COPY --chown=steam:steam files/ $HOME/hlds

# Try to install HLDS. This may take some time.
# Steam has this bug that they are not very interested in fixing. The
# workaround is to re-run this routine multiple times until it downloads 100%
# of the content. More info:
# https://developer.valvesoftware.com/wiki/SteamCMD#Linux
# Workaround: https://danielgibbs.co.uk/2013/11/hlds-steamcmd-workaround-appid-90/
RUN while test "$status" != "Success! App '90' fully installed."; do \
  status=$(/usr/games/steamcmd +login anonymous \
  +force_install_dir $HOME/hlds +app_update 90 validate +quit | \
  tail -1); \
done

# Set our workdir
WORKDIR $HOME/hlds

# Avoid some warning messages due the lack of this file in the right path
RUN mkdir -p $HOME/.steam/sdk32/ && \
  ln -s $HOME/hlds/steamclient.so $HOME/.steam/sdk32/steamclient.so

# Expose ports
EXPOSE 27015/tcp 27015/udp

# Default run command
CMD ./hlds_run -game cstrike -nomaster -port 27015 +ip 0.0.0.0 \
  +map $MAPNAME +maxplayers $MAXPLAYERS +rcon_password "$RCON_PASSWORD" \
  +sv_password "$SV_PASSWORD"
