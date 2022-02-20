FROM docker.io/ruby:3.1.1-slim-bullseye
LABEL maintainer="Daniel Pereira <daniel@garajau.com.br>"
LABEL org.opencontainers.image.source https://github.com/kriansa/docker-images

# Set the UID/GID that will be the owner of `/srv`
# This increases the security by running the service as a unprivileged user
# instead of root. Not all container platforms offers user namespacing for
# increased user isolation, thus this is currently a recommendation among
# specialists. The small inconvenience to this method is that you must ensure
# that you always add the source app files to /srv using --chown
ARG UID=1000
ARG GID=1000

# This is the list of packages required to build most Ruby gems used for Rails
# apps. An extended list of debug packages is useful for development
# environments where you want debugging utilities. They are not installed by
# default and you must set `ADD_DEBUG_PKGS=yes`
ARG APT_PKGS="make gcc g++ libmysqld-dev libpq-dev git xz-utils"
ARG APT_DEBUG_PKGS="less vim nano curl iputils-ping iproute2 bash procps"
ARG ADD_DEBUG_PKGS="yes"

# Reset variables defined by ruby base image
ENV GEM_HOME= BUNDLE_SILENCE_ROOT_WARNING=
ENV BUNDLE_APP_CONFIG=.bundle BUNDLE_JOBS=8
# Ensure the bundle install always installs to vendor/bundle
ENV BUNDLE_PATH=vendor/bundle BUNDLE_DISABLE_SHARED_GEMS=true

# Install packages needed to build native ruby gems
RUN apt-get update && apt-get install --yes $APT_PKGS && \
  ( test "$ADD_DEBUG_PKGS" = "yes" && apt-get install --yes $APT_DEBUG_PKGS; true ) && \
  apt-get autoremove --yes && rm -rf /var/lib/{apt,dpkg}

# Create user/group and make it own /srv
RUN groupadd --gid $GID appuser && \
  useradd --create-home --shell /bin/sh --uid $UID --gid $GID appuser && \
  chown $GID:$UID /srv

# Copy our init file
COPY files/setenv-init /bin/setenv-init

# Set server entrypoint
WORKDIR /srv
ENTRYPOINT [ "/bin/setenv-init" ]
USER "appuser"

# Execute the server by default
CMD [ "bin/rails", "server" ]
