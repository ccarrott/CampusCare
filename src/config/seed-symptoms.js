import { query } from './database.js';

/**
 * CampusCare — Symptom & Medication Seed (Med-Student Verified)
 * Updated based on clinical feedback. All mappings validated.
 * Run: npm run seed:symptoms
 */

const SYMPTOMS = [
  // Head
  { id: 'SYM01', name: 'Headache', category: 'Head', tier: 1, desc: 'Tension-type pain in forehead, temples, or back of head' },
  { id: 'SYM02', name: 'Migraine', category: 'Head', tier: 2, desc: 'Intense throbbing pain, usually one-sided, with light/sound sensitivity. Requires nurse consultation.' },
  { id: 'SYM03', name: 'Dizziness', category: 'Head', tier: 1, desc: 'Feeling lightheaded, unsteady, or room spinning' },
  { id: 'SYM04', name: 'Brain fog', category: 'Head', tier: 1, desc: 'Difficulty concentrating, mental cloudiness. No OTC treatment — address underlying cause.' },
  // Breathing
  { id: 'SYM05', name: 'Runny nose', category: 'Breathing', tier: 1, desc: 'Clear or coloured nasal discharge' },
  { id: 'SYM06', name: 'Blocked nose', category: 'Breathing', tier: 1, desc: 'Nasal congestion, difficulty breathing through nose' },
  { id: 'SYM07', name: 'Sneezing', category: 'Breathing', tier: 1, desc: 'Repeated involuntary sneezing' },
  { id: 'SYM08', name: 'Dry cough', category: 'Breathing', tier: 1, desc: 'Non-productive cough, tickly throat' },
  { id: 'SYM09', name: 'Wet cough', category: 'Breathing', tier: 1, desc: 'Productive cough bringing up mucus' },
  { id: 'SYM10', name: 'Shortness of breath', category: 'Breathing', tier: 3, desc: 'Difficulty breathing, cannot take a full breath. Go to hospital.' },
  { id: 'SYM11', name: 'Wheezing', category: 'Breathing', tier: 2, desc: 'Whistling sound when breathing. If asthmatic, try salbutamol inhaler. Otherwise nurse.' },
  // Throat
  { id: 'SYM12', name: 'Sore throat', category: 'Throat', tier: 1, desc: 'Pain or scratchiness when swallowing' },
  { id: 'SYM13', name: 'Difficulty swallowing', category: 'Throat', tier: 2, desc: 'Pain or obstruction when trying to swallow. Requires nurse assessment.' },
  { id: 'SYM14', name: 'Mouth ulcers', category: 'Throat', tier: 1, desc: 'Painful sores inside mouth or on tongue' },
  { id: 'SYM15', name: 'Cold sores', category: 'Throat', tier: 1, desc: 'Fever blisters around the mouth (herpes simplex)' },
  // Stomach
  { id: 'SYM16', name: 'Nausea', category: 'Stomach', tier: 1, desc: 'Feeling like you might vomit' },
  { id: 'SYM17', name: 'Vomiting', category: 'Stomach', tier: 2, desc: 'Actively throwing up. See nurse if severe or persistent.' },
  { id: 'SYM18', name: 'Diarrhoea', category: 'Stomach', tier: 1, desc: 'Loose or watery stools, frequent trips to toilet' },
  { id: 'SYM19', name: 'Constipation', category: 'Stomach', tier: 1, desc: 'Difficulty passing stools, infrequent bowel movements' },
  { id: 'SYM20', name: 'Stomach cramps', category: 'Stomach', tier: 1, desc: 'Sharp or dull pain in abdomen' },
  { id: 'SYM21', name: 'Bloating', category: 'Stomach', tier: 1, desc: 'Swollen, tight feeling in abdomen' },
  { id: 'SYM22', name: 'Heartburn', category: 'Stomach', tier: 1, desc: 'Burning sensation in chest/upper stomach after eating' },
  { id: 'SYM23', name: 'Loss of appetite', category: 'Stomach', tier: 1, desc: 'No desire to eat. No OTC treatment — address underlying cause.' },
  // Skin
  { id: 'SYM24', name: 'Itchy skin', category: 'Skin', tier: 1, desc: 'Persistent itch without obvious cause' },
  { id: 'SYM25', name: 'Rash', category: 'Skin', tier: 1, desc: 'Red, raised bumps or patches on skin' },
  { id: 'SYM26', name: 'Dry skin', category: 'Skin', tier: 1, desc: 'Flaking, cracking, or tight-feeling skin' },
  { id: 'SYM27', name: 'Acne', category: 'Skin', tier: 1, desc: 'Pimples, blackheads, or cystic bumps on face/back' },
  { id: 'SYM28', name: 'Hives', category: 'Skin', tier: 2, desc: 'Raised, itchy welts that appear suddenly. Requires nurse assessment.' },
  // Body
  { id: 'SYM29', name: 'Body aches', category: 'Body', tier: 1, desc: 'General soreness in muscles and limbs' },
  { id: 'SYM30', name: 'Back pain', category: 'Body', tier: 1, desc: 'Pain in lower or upper back' },
  { id: 'SYM31', name: 'Neck stiffness', category: 'Body', tier: 1, desc: 'Tight, painful neck. If combined with vomiting, headache, or fever — go to clinic immediately.' },
  { id: 'SYM32', name: 'Joint pain', category: 'Body', tier: 2, desc: 'Pain or swelling in a specific joint. Can be complicated — see nurse.' },
  // General
  { id: 'SYM33', name: 'Fever', category: 'General', tier: 1, desc: 'Body temperature above 38°C' },
  { id: 'SYM34', name: 'Chills', category: 'General', tier: 1, desc: 'Shivering, feeling cold despite warm environment' },
  { id: 'SYM35', name: 'Fatigue', category: 'General', tier: 1, desc: 'Persistent tiredness not relieved by sleep. No specific OTC treatment.' },
  { id: 'SYM36', name: 'Night sweats', category: 'General', tier: 2, desc: 'Waking up drenched in sweat. Nurse referral (possible TB screening).' },
  { id: 'SYM37', name: 'Swollen glands', category: 'General', tier: 2, desc: 'Lumps in neck, armpits, or groin. Requires nurse assessment.' },
  // Mental
  { id: 'SYM38', name: 'Anxiety', category: 'Mental', tier: 1, desc: 'Racing thoughts, constant worry, restlessness' },
  { id: 'SYM39', name: 'Panic attacks', category: 'Mental', tier: 2, desc: 'Sudden overwhelming fear with physical symptoms' },
  { id: 'SYM40', name: 'Insomnia', category: 'Mental', tier: 1, desc: 'Cannot fall asleep or stay asleep' },
  { id: 'SYM41', name: 'Low mood', category: 'Mental', tier: 2, desc: 'Persistent sadness or hopelessness lasting 2+ weeks. Nurse referral.' },
  { id: 'SYM42', name: 'Burnout', category: 'Mental', tier: 1, desc: 'Emotional exhaustion, detachment, reduced motivation. No OTC treatment.' },
  // Eyes & Ears
  { id: 'SYM43', name: 'Itchy eyes', category: 'Eyes & Ears', tier: 1, desc: 'Irritated, itchy eyes (allergic)' },
  { id: 'SYM44', name: 'Watery eyes', category: 'Eyes & Ears', tier: 1, desc: 'Excessive tearing, runny eyes' },
  { id: 'SYM45', name: 'Ear pain', category: 'Eyes & Ears', tier: 2, desc: 'Sharp or dull pain inside ear' },
  { id: 'SYM46', name: 'Blocked ears', category: 'Eyes & Ears', tier: 1, desc: 'Muffled hearing, pressure feeling (wax buildup)' },
  // Period
  { id: 'SYM47', name: 'Period pain', category: 'Period', tier: 1, desc: 'Cramping pain in lower abdomen during menstruation' },
  { id: 'SYM48', name: 'Irregular bleeding', category: 'Period', tier: 2, desc: 'Unexpected or unusually heavy bleeding. Nurse referral.' },
];

const MEDICATIONS = [
  { code: 'MED01', name: 'Panado 500mg (Paracetamol)', desc: 'Analgesic and antipyretic. Max dose: 4g (8 tablets) in 24 hours.' },
  { code: 'MED02', name: 'Nurofen 400mg (Ibuprofen)', desc: 'NSAID anti-inflammatory. Take with food. Avoid if stomach issues.' },
  { code: 'MED03', name: 'Adco-Dol', desc: 'Combination paracetamol + codeine analgesic. For moderate pain.' },
  { code: 'MED04', name: 'Disprin (Aspirin)', desc: 'Analgesic and anti-inflammatory. Not for under 16s or stomach ulcers.' },
  { code: 'MED05', name: 'Allergex (Chlorpheniramine)', desc: 'Sedating antihistamine. May cause drowsiness.' },
  { code: 'MED06', name: 'Zyrtec (Cetirizine 10mg)', desc: 'Non-drowsy antihistamine for allergies.' },
  { code: 'MED07', name: 'Strepsils Honey & Lemon', desc: 'Throat lozenges. Soothing only, not curative.' },
  { code: 'MED08', name: 'Betadine Gargle', desc: 'Antiseptic gargle for throat and mouth infections.' },
  { code: 'MED09', name: 'Iliadin Nasal Spray', desc: 'Decongestant spray. Max 5 days use — can cause rebound congestion.' },
  { code: 'MED10', name: 'Sinuend / Sinupret', desc: 'Herbal sinus and congestion relief.' },
  { code: 'MED11', name: 'Benylin Dry Cough Syrup', desc: 'Cough suppressant for dry, tickly cough.' },
  { code: 'MED12', name: 'Benylin Wet Cough Syrup', desc: 'Expectorant to loosen and clear mucus.' },
  { code: 'MED13', name: 'Rehidrat Sachets', desc: 'Oral rehydration salts. Alternative: 1L boiled water + ½ tsp salt + 8 tsp sugar. 200-400ml after every loose stool.' },
  { code: 'MED14', name: 'Imodium (Loperamide)', desc: 'Anti-diarrhoeal. Alternative: rehydrate and let it pass naturally.' },
  { code: 'MED15', name: 'Gaviscon Liquid', desc: 'Antacid for heartburn and acid reflux.' },
  { code: 'MED16', name: 'Buscopan (Hyoscine)', desc: 'Antispasmodic for stomach and menstrual cramps.' },
  { code: 'MED17', name: 'Valoid (Cyclizine)', desc: 'Anti-nausea and anti-emetic. Also helps dizziness.' },
  { code: 'MED18', name: 'Voltaren Emulgel (Diclofenac)', desc: 'Topical NSAID gel for localised muscle and back pain.' },
  { code: 'MED19', name: 'Deep Heat (Methyl Salicylate)', desc: 'Topical analgesic rub for joint and muscle pain.' },
  { code: 'MED20', name: 'Calamine Lotion', desc: 'Skin-soothing lotion for itching, rashes, and mild dryness.' },
  { code: 'MED21', name: 'Hydrocortisone 1% Cream', desc: 'Mild steroid cream for rashes and itching. Short-term use only.' },
  { code: 'MED22', name: 'Naproxen (Aleve)', desc: 'NSAID for joint pain and inflammation. Take with food.' },
  { code: 'MED23', name: 'Melatonin 3mg', desc: 'Natural sleep aid. Take 30 min before bed.' },
  { code: 'MED24', name: 'Dulcolax (Bisacodyl)', desc: 'Stimulant laxative for constipation.' },
  { code: 'MED25', name: 'Clearasil / Benzac (Benzoyl Peroxide)', desc: 'Topical acne treatment. Apply to affected area.' },
  { code: 'MED26', name: 'Cerumol Ear Drops', desc: 'Ear wax softener. For blocked ears due to wax only — not for ear pain.' },
  { code: 'MED27', name: 'Acyclovir (Zovirax)', desc: 'Antiviral cream for cold sores/fever blisters. Apply at first tingle.' },
];

// Mapping verified by med student
const MAPPING = [
  // Panado — pain + fever
  { sym: 'SYM01', med: 'MED01' }, // Headache
  { sym: 'SYM12', med: 'MED01' }, // Sore throat (pain)
  { sym: 'SYM29', med: 'MED01' }, // Body aches
  { sym: 'SYM30', med: 'MED01' }, // Back pain
  { sym: 'SYM31', med: 'MED01' }, // Neck stiffness
  { sym: 'SYM33', med: 'MED01' }, // Fever
  { sym: 'SYM34', med: 'MED01' }, // Chills
  { sym: 'SYM47', med: 'MED01' }, // Period pain
  // Nurofen — NSAID
  { sym: 'SYM01', med: 'MED02' }, // Headache
  { sym: 'SYM12', med: 'MED02' }, // Sore throat (pain)
  { sym: 'SYM29', med: 'MED02' }, // Body aches
  { sym: 'SYM30', med: 'MED02' }, // Back pain
  { sym: 'SYM31', med: 'MED02' }, // Neck stiffness
  { sym: 'SYM32', med: 'MED02' }, // Joint pain
  { sym: 'SYM33', med: 'MED02' }, // Fever
  { sym: 'SYM34', med: 'MED02' }, // Chills
  { sym: 'SYM45', med: 'MED02' }, // Ear pain
  { sym: 'SYM47', med: 'MED02' }, // Period pain
  // Adco-Dol
  { sym: 'SYM01', med: 'MED03' }, // Headache
  // Disprin
  { sym: 'SYM01', med: 'MED04' }, // Headache
  // Allergex (sedating)
  { sym: 'SYM05', med: 'MED05' }, // Runny nose
  { sym: 'SYM07', med: 'MED05' }, // Sneezing
  { sym: 'SYM24', med: 'MED05' }, // Itchy skin
  { sym: 'SYM25', med: 'MED05' }, // Rash
  { sym: 'SYM43', med: 'MED05' }, // Itchy eyes
  { sym: 'SYM44', med: 'MED05' }, // Watery eyes
  // Zyrtec (non-drowsy)
  { sym: 'SYM05', med: 'MED06' }, // Runny nose
  { sym: 'SYM07', med: 'MED06' }, // Sneezing
  { sym: 'SYM24', med: 'MED06' }, // Itchy skin
  { sym: 'SYM25', med: 'MED06' }, // Rash
  { sym: 'SYM43', med: 'MED06' }, // Itchy eyes
  { sym: 'SYM44', med: 'MED06' }, // Watery eyes
  // Strepsils
  { sym: 'SYM08', med: 'MED07' }, // Dry cough (soothing)
  { sym: 'SYM12', med: 'MED07' }, // Sore throat
  // Betadine Gargle
  { sym: 'SYM12', med: 'MED08' }, // Sore throat
  { sym: 'SYM14', med: 'MED08' }, // Mouth ulcers
  // Iliadin
  { sym: 'SYM06', med: 'MED09' }, // Blocked nose
  // Sinuend/Sinupret
  { sym: 'SYM05', med: 'MED10' }, // Runny nose
  { sym: 'SYM06', med: 'MED10' }, // Blocked nose
  // Benylin Dry
  { sym: 'SYM08', med: 'MED11' }, // Dry cough
  // Benylin Wet
  { sym: 'SYM09', med: 'MED12' }, // Wet cough
  // Rehidrat
  { sym: 'SYM17', med: 'MED13' }, // Vomiting (supportive)
  { sym: 'SYM18', med: 'MED13' }, // Diarrhoea
  // Imodium
  { sym: 'SYM18', med: 'MED14' }, // Diarrhoea
  // Gaviscon
  { sym: 'SYM21', med: 'MED15' }, // Bloating
  { sym: 'SYM22', med: 'MED15' }, // Heartburn
  // Buscopan
  { sym: 'SYM20', med: 'MED16' }, // Stomach cramps
  { sym: 'SYM21', med: 'MED16' }, // Bloating
  { sym: 'SYM47', med: 'MED16' }, // Period pain
  // Valoid
  { sym: 'SYM03', med: 'MED17' }, // Dizziness
  { sym: 'SYM16', med: 'MED17' }, // Nausea
  { sym: 'SYM17', med: 'MED17' }, // Vomiting
  // Voltaren Gel
  { sym: 'SYM29', med: 'MED18' }, // Body aches
  { sym: 'SYM30', med: 'MED18' }, // Back pain (localised)
  // Deep Heat
  { sym: 'SYM32', med: 'MED19' }, // Joint pain
  // Calamine
  { sym: 'SYM24', med: 'MED20' }, // Itchy skin
  { sym: 'SYM25', med: 'MED20' }, // Rash
  { sym: 'SYM26', med: 'MED20' }, // Dry skin (mild)
  // Hydrocortisone
  { sym: 'SYM24', med: 'MED21' }, // Itchy skin
  { sym: 'SYM25', med: 'MED21' }, // Rash
  // Naproxen
  { sym: 'SYM32', med: 'MED22' }, // Joint pain
  // Melatonin
  { sym: 'SYM40', med: 'MED23' }, // Insomnia
  // Dulcolax
  { sym: 'SYM19', med: 'MED24' }, // Constipation
  // Benzac
  { sym: 'SYM27', med: 'MED25' }, // Acne
  // Cerumol
  { sym: 'SYM46', med: 'MED26' }, // Blocked ears (wax only)
  // Acyclovir
  { sym: 'SYM15', med: 'MED27' }, // Cold sores
];

async function seedSymptoms() {
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║  CampusCare — Symptom & Med Seed (Verified)     ║');
  console.log('╚══════════════════════════════════════════════════╝');

  console.log('  [1/4] Clearing old data...');
  await query('DELETE FROM SymptomMedicationMap');
  await query('DELETE FROM SymptomLogEntry');
  await query('DELETE FROM Symptom');
  await query('DELETE FROM Medication');

  console.log('  [2/4] Seeding ' + SYMPTOMS.length + ' symptoms...');
  const symPlaceholders = SYMPTOMS.map(() => '(?, ?, ?, ?, ?)').join(',');
  const symValues = SYMPTOMS.flatMap(s => [s.id, s.name, s.category, s.tier, s.desc]);
  await query('INSERT INTO Symptom (SymptomID, Name, Category, Tier, Description) VALUES ' + symPlaceholders, symValues);

  console.log('  [3/4] Seeding ' + MEDICATIONS.length + ' medications...');
  const medPlaceholders = MEDICATIONS.map(() => '(?, ?, ?)').join(',');
  const medValues = MEDICATIONS.flatMap(m => [m.code, m.name, m.desc]);
  await query('INSERT INTO Medication (MedicationCode, Name, Description) VALUES ' + medPlaceholders, medValues);

  console.log('  [4/4] Seeding ' + MAPPING.length + ' mappings...');
  const mapPlaceholders = MAPPING.map(() => '(?, ?)').join(',');
  const mapValues = MAPPING.flatMap(m => [m.sym, m.med]);
  await query('INSERT INTO SymptomMedicationMap (SymptomID, MedicationCode) VALUES ' + mapPlaceholders, mapValues);

  console.log('');
  console.log('  ✓ Done. ' + SYMPTOMS.length + ' symptoms, ' + MEDICATIONS.length + ' meds, ' + MAPPING.length + ' mappings.');
  process.exit(0);
}

seedSymptoms().catch(e => { console.error(e); process.exit(1); });
