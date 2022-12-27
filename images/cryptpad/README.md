# Cryptpad

This is a unofficial docker image that makes it easy to run a **HTTP** instance of Cryptpad using a
single domain, instead of their recommended but complicated setup using two (or more) domains.

This way you can setup your TLS connection the way you want, such as through a K8S Ingress for
instance.

## Config

When configuring your Cryptpad instance, you should refer to the [config example][example-config].
This container image will automatically configure the `httpUnsafeOrigin`, `httpSafeOrigin`,
`httpAddress`, `httpPort`, and `httpSafePort` automatically for you, as long as you pass in the
`CRYPTPAD_URL` environment variable to the container. That means that any value you input in your
config will be ultimately discarded, so you can simply keep them all at their defaults, but don't
remove them, leave they commented.

## Volumes

The application root folder is located at the container's `/cryptpad`. You should at least bind the
data-related paths so that user's data is stored securely.

Config directory only contains `config.js` file and its binding is not mandatory as not having one
will still boot up the application, but it's still recommended because it's where you configure
admins. You can copy from this [example here][example-config].

* /cryptpad/blob - **Required**
* /cryptpad/block - **Required**
* /cryptpad/data - **Required**
* /cryptpad/datastore - **Required**
* /cryptpad/config - *Recommended*
* /cryptpad/customize - *Optional*

## Environment variables

To make configuration as easy as possible, you can start the container using the env vars below:

* **CRYPTPAD_URL** - The full external URL that your instance will be accessed (e.g.
  _https://myinstance.com:8844_)
* **REAL_IP_HEADER** - When behind a reverse proxy, use this to determine the header your proxy will
  send that will contain the original user IP. (e.g. _X-Forwarded-For_)
* **REAL_IP_TRUSTED_IPS** - Set the original client connecting IP CIDR that is trusted to send the
  header defined above. (e.g. _0.0.0.0/0_)

On a particular slow computer, you will also need to increase the max time S6 will wait for the
services to get up. This can be adjusted by setting the env var `S6_CMD_WAIT_FOR_SERVICES_MAXTIME`
to a value higher than the default of `5000`.

## Example

When using CloudFlare as reverse proxy:

```bash
podman run -it --rm --name cryptpad -p 8080:80 \
  -e "CRYPTPAD_URL=https://cryptpad.mydomain.com:8080" \
  -e "REAL_IP_HEADER=CF-Connecting-IP" \
  -e "REAL_IP_TRUSTED_IPS=0.0.0.0/0" \
  -v ./data/blob:/cryptpad/blob \
  -v ./data/block:/cryptpad/block \
  -v ./data/data:/cryptpad/data \
  -v ./data/datastore:/cryptpad/datastore \
  -v ./data/config:/cryptpad/config \
  docker.io/kriansa/cryptpad:5.2.1-1
```

[example-config]: https://github.com/xwiki-labs/cryptpad/blob/main/config/config.example.js 
