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
COPY --chown=1000:1000 ./ ./

RUN bundle install && echo "$APP_VERSION" > /srv/VERSION
```
