const { Client } = require('pg')
require('dotenv').config()

const createEnumType = `
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'membership_type') THEN
          CREATE TYPE membership_type AS ENUM ('pleb', 'vip');
        END IF;
      END $$;
    `

const createTables = `
    CREATE TABLE IF NOT EXISTS users (
        id INT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
        firstName VARCHAR(255) NOT NULL,
        lastName VARCHAR(255) NOT NULL,
        username VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        membership membership_type NOT NULL DEFAULT 'pleb',
        isAdmin BOOLEAN NOT NULL DEFAULT false
    );

    CREATE TABLE IF NOT EXISTS messages(
        id INT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
        "userId" INT NOT NULL,
        message VARCHAR(3000),
        createdAt TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT message_userId FOREIGN KEY("userId") REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS "session" (
        "sid" varchar NOT NULL COLLATE "default",
        "sess" json NOT NULL,
        "expire" timestamp(6) NOT NULL
        )
        WITH (OIDS=FALSE);

        ALTER TABLE "session" ADD CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE;

        CREATE INDEX "IDX_session_expire" ON "session" ("expire");
`

// const populateTables = `
//     INSERT INTO users(firstName, lastName, username, password)
//     VALUES('seb', 'hajen', 'coolguy92', 'sucks')
// `;

async function populate(){

    const client = new Client({
        connectionString: process.env.DB_STRING,
        ssl: {
            rejectUnauthorized: false
        }
    })

    try {
        await client.connect()
        console.log('Connected to database')

        await client.query(createEnumType)
        console.log('Checked for enum type')

        await client.query(createTables)
        console.log('Created tables')

        // await client.query(populateTables);
        // console.log('Populated Tables')

    } catch(err) {
        console.log(err)
    } finally {
        await client.end()
    }
}

populate()