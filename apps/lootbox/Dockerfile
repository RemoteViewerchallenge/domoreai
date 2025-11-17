# Use the official Deno alpine image
FROM denoland/deno:alpine

WORKDIR /app

# Copy all the lootbox source code
COPY . .
RUN apk add --no-cache nodejs npm && \
    export PATH="/usr/local/bin:$PATH" && \
    npm install -g pnpm
RUN pnpm install

# Run the 'compile' task from the README.
# This builds the standalone 'lootbox' binary inside the container.
RUN set -x && cd ui && deno run -A npm:vite build > /tmp/vite_build.log 2>&1 || (cat /tmp/vite_build.log && exit 1)
RUN deno compile --allow-all --include ui/dist -o lootbox src/lootbox-cli.ts

# The README states the default port is 3000
EXPOSE 3000

# The README command to start the server is 'lootbox server'
# We run the binary we just built.

CMD ["./lootbox", "server"]