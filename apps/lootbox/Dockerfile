FROM denoland/deno:1.40.0

WORKDIR /app

COPY . .

RUN deno install -n lootbox -A src/lootbox-cli.ts
RUN lootbox init

EXPOSE 3000

CMD ["lootbox", "server"]