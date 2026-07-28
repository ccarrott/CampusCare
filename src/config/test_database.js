import { query } from './database.js';

async function getDatabaseSchema() {
  try {
    // 1. Get raw table results from MySQL
    const rawTables = await query('SHOW TABLES;');

    // Extract table names into a simple array: ['Student', 'Nurse', 'Appointment', ...]
    const tableNames = rawTables.map((row) => Object.values(row)[0]);

    // 2. Fetch column names and data types for each table
    const tablesWithColumns = await Promise.all(
      tableNames.map(async (tableName) => {
        // Query column details for current table
        const cols = await query(`DESCRIBE \`${tableName}\`;`);

        // Format into a list of [ColumnName, Type] pairs
        const columnsAndTypes = cols.map((col) => ({
          column: col.Field,
          type: col.Type
        }));

        return {
          table: tableName,
          columns: columnsAndTypes
        };
      })
    );

    // ============================================================================
    // OUTPUT RESULTS
    // ============================================================================
    console.log('=== LIST OF TABLES ===');
    console.log(tableNames);

    console.log('\n=== TABLES, COLUMNS & TYPES ===');
    console.dir(tablesWithColumns, { depth: null });

    process.exit(0);
  } catch (error) {
    console.error('Failed to retrieve schema:', error.message);
    process.exit(1);
  }
}

getDatabaseSchema();