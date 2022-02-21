# Ruby on Rails

This is an image based on the Ruby one, but suited for running Rails application in it. You should
base your image on this one with the following snippet:

```Dockerfile
FROM ghcr.io/kriansa/docker-images/ruby-on-rails:latest

# Although completely optional, this is useful to tell the application which version we are
# building, for runtime checks. You can override this value on your CI pipeline at build time for a
# dynamic value such as your app version or the git repository SHA.
ARG APP_VERSION=unspecified

# Copy everything to the destination server path using the right permissions
COPY --chown=appuser:appuser ./ ./

RUN bundle install && echo "$APP_VERSION" > /srv/VERSION
```

## Rebuilding the image with a different UID/GID

In the eventual case you need to set a different **UID/GID** for the appuser, you can extend the
image with the following `Dockerfile`:

```Dockerfile
FROM ghcr.io/kriansa/docker-images/ruby-on-rails:latest

ARG UID=2222
ARG GID=3333

# Reset the uid for `appuser`
USER root
RUN set-uid $UID $GID
USER appuser
```

## Kubernetes tips

When running your app on k8s, just make sure you don't override the `command`, instead use `args`
for specifying a different entrypoint in case you need.

E.g.:

```yaml
      containers:
        - name: main
          args:
            - bin/rails
            - db:migrate
```

> Don't override `command`, only `args`.
