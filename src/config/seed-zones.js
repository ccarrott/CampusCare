import { query } from './database.js';

/**
 * Creates CampusZone + StudentZone tables and seeds zone data + student mappings.
 * Zones are based on real NMU Gqeberha locations.
 */

const ZONES = [
  { ZoneID: 'ZONE01', Name: 'NMU South Campus (Residences)', Latitude: -33.9875, Longitude: 25.6612, Radius: 400 },
  { ZoneID: 'ZONE02', Name: 'NMU North Campus', Latitude: -33.9810, Longitude: 25.6585, Radius: 300 },
  { ZoneID: 'ZONE03', Name: 'Summerstrand Flats', Latitude: -33.9830, Longitude: 25.6670, Radius: 500 },
  { ZoneID: 'ZONE04', Name: 'Marine Drive Area', Latitude: -33.9870, Longitude: 25.6720, Radius: 300 },
  { ZoneID: 'ZONE05', Name: 'Newton Park', Latitude: -33.9510, Longitude: 25.6150, Radius: 600 },
  { ZoneID: 'ZONE06', Name: 'Central (Gqeberha CBD)', Latitude: -33.9600, Longitude: 25.6020, Radius: 500 },
  { ZoneID: 'ZONE07', Name: 'Walmer', Latitude: -33.9730, Longitude: 25.6280, Radius: 400 },
  { ZoneID: 'ZONE08', Name: 'Lorraine', Latitude: -33.9400, Longitude: 25.5950, Radius: 400 }
];

// Map student addresses to zones based on keywords
const ADDRESS_ZONE_MAP = {
  'NMU South Campus': 'ZONE01',
  'Lena Allen Res': 'ZONE01',
  'Xanadu Res': 'ZONE01',
  'Founders Res': 'ZONE01',
  'North Campus': 'ZONE02',
  '2nd Avenue': 'ZONE02',
  'Hoff Street': 'ZONE03',
  '3rd Avenue': 'ZONE03',
  '6th Avenue': 'ZONE03',
  'Beach Road': 'ZONE03',
  'Marine Drive': 'ZONE04',
  'Newton Park': 'ZONE05',
  'Ring Road': 'ZONE05',
  'Buffelsfontein': 'ZONE05',
  'Central': 'ZONE06',
  'Mount Road': 'ZONE06',
  'Albany Road': 'ZONE06',
  'Walmer': 'ZONE07',
  'Heugh Road': 'ZONE07',
  'Main Road, Walmer': 'ZONE07',
  'Lorraine': 'ZONE08',
  'Circular Drive': 'ZONE08'
};

function detectZone(address) {
  for (const [keyword, zoneId] of Object.entries(ADDRESS_ZONE_MAP)) {
    if (address.includes(keyword)) return zoneId;
  }
  return 'ZONE03'; // default: Summerstrand Flats
}

async function seedZones() {
  console.log('[Zones] Creating tables...');

  await query(`
    CREATE TABLE IF NOT EXISTS CampusZone (
      ZoneID varchar(50) PRIMARY KEY,
      Name varchar(100) NOT NULL,
      Latitude decimal(10, 7) NOT NULL,
      Longitude decimal(10, 7) NOT NULL,
      Radius int DEFAULT 200
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS StudentZone (
      StudentNumber varchar(20) NOT NULL,
      ZoneID varchar(50) NOT NULL,
      PRIMARY KEY (StudentNumber, ZoneID)
    )
  `);

  // Clear and re-seed zones
  await query('DELETE FROM StudentZone');
  await query('DELETE FROM CampusZone');

  console.log('[Zones] Seeding 8 campus zones...');
  for (const zone of ZONES) {
    await query(
      'INSERT INTO CampusZone (ZoneID, Name, Latitude, Longitude, Radius) VALUES (?, ?, ?, ?, ?)',
      [zone.ZoneID, zone.Name, zone.Latitude, zone.Longitude, zone.Radius]
    );
  }

  // Map students to zones based on their addresses
  console.log('[Zones] Mapping students to zones...');
  const students = await query('SELECT StudentNumber, Address FROM Student');

  for (const student of students) {
    const zoneId = detectZone(student.Address);
    await query(
      'INSERT INTO StudentZone (StudentNumber, ZoneID) VALUES (?, ?)',
      [student.StudentNumber, zoneId]
    );
  }

  console.log(`[Zones] Mapped ${students.length} students to zones.`);
  process.exit(0);
}

seedZones().catch(e => { console.error(e.message); process.exit(1); });
