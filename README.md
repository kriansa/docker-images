# Docker images

This is a repo with my own docker images.

## Releasing scheme

Images are released using the `YYYY-MM-DD` as the versioning scheme. This helps
avoiding using `latest` as the version name and potentially breaking images
that depends on these ones.

### Packaging

1. Do the changes and commit on `master`.
2. If there are images that depend on each other, change the `FROM` directive 
   to the newer version (it will be the current date in YYYY-MM-DD format).
3. Build the image(s):
   ```sh
   $ bin/build <image>
   ```
4. Once everything is fine, create a new release so Docker Hub will trigger the
   build job:
   ```
   $ bin/release
   ```

## License

BSD 3-Clause.
