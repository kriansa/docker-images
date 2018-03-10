# Insurgency Server Base Image

Use this image to create your own Insurgency server.

## Using this image

```dockerfile
FROM kriansa/insurgency-server

# Runtime settings
ENV RCON_PASSWORD=""
ENV SV_PASSWORD=""
ENV MAPNAME="market_coop checkpoint"

# Send our custom server.cfg to server and set the right permissions to it
USER root
ADD my-custom-server.cfg $SERVER_PATH/insurgency/cfg/server.cfg
RUN chown steam:steam $SERVER_PATH/insurgency/cfg/server.cfg
USER steam
```
