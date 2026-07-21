import { query } from './database.js';

async function runTest() {
    // We test by asking for all the tables in the database
    try {
        console.log('Connecting to server...');

        const tables = await query('SHOW TABLES;');

        console.log('Connected to database!');
        console.log('Tables in database:');
        console.table(tables);

        process.exit(0);
    } catch (error) {
        console.error('Connection failed:', error.message);
        console.error(error)
        process.exit(1);
    }
}

runTest();