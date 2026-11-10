# PostgreSQL Database

`initdb -D .postgres` To create the postgres database:

`db` To run the database server: (script from ../flake.nix)

`createdb sportsmeet -h localhost` to initialize sportsmeet db (postgres must be running):

# Prisma ORM

`npx prisma contract emit` to generate contract files from ./prisma/contract.prisma

`npx prisma db init` to write the tables declared by the contract to the db (postgres must be running)
