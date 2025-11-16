# Use the official Deno alpine image
FROM denoland/deno:alpine

WORKDIR /app

# Copy all the lootbox source code
COPY . .

# Run the 'compile' task from the README.
# This builds the standalone 'lootbox' binary inside the container.
RUN deno task compile

# The README states the default port is 3000
EXPOSE 3000

# The README command to start the server is 'lootbox server'
# We run the binary we just built.
CMD ["./lootbox", "server"]