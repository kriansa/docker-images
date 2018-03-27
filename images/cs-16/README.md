# CS 1.6 Dedicated Server Base Image

This is a HLDS setup I made for CS with custom addons and an easy ramp-up. It
also fixes several installation issues most people have when trying to create a
dedicated CS server.

## Why use this image

When doing a [clean HLDS
installation](https://developer.valvesoftware.com/wiki/SteamCMD#Linux), as
suggested on Steam manual, a few issues may arise.

This Docker image fix all these errors below so you don't have to worry:

1. Installation just doesn't work. Sometimes you would have to run `app_update
   90` several times and it wouldn't install all needed files. This is a hard
   one to solve, and I did it with help of [this
   workaround](https://danielgibbs.co.uk/2013/11/hlds-steamcmd-workaround-appid-90/).
   What it does is basically add 3 manifest files on `hlds/steamapps` folder
   and proceeds the installation.
2. First time you run HLDS, it crashes at the first time. This is some other
   bug caused by a missing `steam_appid.txt` file on `hlds` folder.
3. Warning messages of missing `$HOME/.steam/sdk32/steamclient.so` files. The
   fix is quite easy: we just need to link these files onto the expected path.
4. Warning messages of missing `custom.hpk` file. This can get annoying and
   make us think that there's something wrong. Don't worry, this is just a file
   used to store custom sprays from people who connect to the server. The fix
   for that is creating a blank `cstrike/custom.hpk` file when we start the
   server for the first time.

## Using this image

```dockerfile
FROM kriansa/cs-16

# Runtime settings
ENV RCON_PASSWORD=""
ENV SV_PASSWORD=""
ENV MAXPLAYERS="32"
ENV MAPNAME="de_dust2"

# Send our custom server.cfg to server and set the right permissions to it
USER root
ADD my-custom-server.cfg cstrike/server.cfg
RUN chown steam:steam cstrike/server.cfg
USER steam
```
