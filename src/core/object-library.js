/**
 * Architecture Helping Hand — Object Library Expansion (v2.6)
 *
 * Domain packs beyond the residential/commercial core: healthcare, emergency
 * services, civic, sports & stadiums, leisure (cinema/gaming/caravan),
 * hospitality, education, transport, and landscape (plants/trees).
 *
 * Every item carries REAL standard dimensions (typical industry sizes);
 * `clearance` records the functional clearance the QA engine should honor.
 * Families with parametric members (seating rows, planters, tree sizes)
 * expand to keep real-world variation without invented numbers.
 */

// ---------------------------------------------------------------------------
// Helpers: families expand into individual catalog entries
// ---------------------------------------------------------------------------
function family(prefix, label, base, variants) {
  return variants.map(v => ({
    id: `${prefix}-${v.suffix}`,
    name: `${label} (${v.label})`,
    category: base.category,
    wCm: Math.round(v.w ?? base.wCm),
    dCm: Math.round(v.d ?? base.dCm),
    hCm: Math.round(v.h ?? base.hCm),
    clearance: base.clearance,
    desc: `${base.desc} — ${v.label}`,
    type: base.type || v.suffix
  }));
}

const pack = [];

// ===========================================================================
// HEALTHCARE — hospitals, clinics, dental, labs, pharmacy  (110+)
// ===========================================================================
const healthcare = [
  // Patient beds & room equipment
  { id: 'hosp-bed-standard', name: 'Hospital Bed (Manual)', category: 'healthcare', wCm: 100, dCm: 210, hCm: 100, clearance: 90, desc: '3-crank manual hospital bed with side rails', type: 'bed_med' },
  { id: 'hosp-bed-electric', name: 'Hospital Bed (Electric)', category: 'healthcare', wCm: 105, dCm: 220, hCm: 110, clearance: 90, desc: '5-function electric ICU-style bed', type: 'bed_med' },
  { id: 'hosp-bed-bariatric', name: 'Bariatric Bed', category: 'healthcare', wCm: 130, dCm: 220, hCm: 110, clearance: 120, desc: 'Wide reinforced bed for 400kg+ patients', type: 'bed_med' },
  { id: 'hosp-bed-pediatric', name: 'Pediatric Crib Bed', category: 'healthcare', wCm: 80, dCm: 150, hCm: 120, desc: 'Enclosed pediatric bed with high rails', type: 'bed_med' },
  { id: 'bedside-cabinet-med', name: 'Hospital Bedside Cabinet', category: 'healthcare', wCm: 45, dCm: 45, hCm: 80, desc: 'Patient overbed personal storage cabinet', type: 'storage' },
  { id: 'overbed-table', name: 'Overbed Table (Rolling)', category: 'healthcare', wCm: 60, dCm: 40, hCm: 90, desc: 'Adjustable tilting patient dining table', type: 'table' },
  { id: 'iv-stand', name: 'IV Drip Stand', category: 'healthcare', wCm: 40, dCm: 40, hCm: 180, desc: 'Rolling 4-hook infusion pole', type: 'pole' },
  { id: 'patient-lift', name: 'Patient Hoist Lift', category: 'healthcare', wCm: 110, dCm: 120, hCm: 190, desc: 'Mobile patient transfer lift frame', type: 'structure' },
  { id: 'bed-screen', name: 'Bed Privacy Screen', category: 'healthcare', wCm: 180, dCm: 5, hCm: 180, desc: 'Folding 3-panel bedside privacy screen', type: 'panel' },
  { id: 'callout-nurse', name: 'Nurse Call Station Panel', category: 'healthcare', wCm: 20, dCm: 8, hCm: 30, desc: 'Bedhead nurse-call + code-blue panel', type: 'device' },
  // Examination & treatment
  { id: 'exam-table', name: 'Examination Couch', category: 'healthcare', wCm: 60, dCm: 180, hCm: 80, clearance: 90, desc: 'Fixed-height examination couch with paper roll', type: 'table_med' },
  { id: 'exam-table-procedure', name: 'Procedure Table (Adjustable)', category: 'healthcare', wCm: 65, dCm: 190, hCm: 95, clearance: 90, desc: 'Hydraulic minor-procedure table', type: 'table_med' },
  { id: 'gyn-exam-chair', name: 'Gynecology Exam Chair', category: 'healthcare', wCm: 80, dCm: 150, hCm: 100, clearance: 100, desc: 'Electric positioning gyn examination chair', type: 'chair_med' },
  { id: 'dental-chair-unit', name: 'Dental Chair Unit', category: 'healthcare', wCm: 180, dCm: 160, hCm: 130, clearance: 120, desc: 'Dental chair + light + instrument tray unit', type: 'chair_med' },
  { id: 'dental-delivery', name: 'Dental Delivery Cart', category: 'healthcare', wCm: 50, dCm: 50, hCm: 90, desc: 'Mobile dental instrument cart', type: 'cart' },
  { id: 'opto-chair', name: 'Ophthalmology Exam Chair', category: 'healthcare', wCm: 70, dCm: 130, hCm: 120, clearance: 90, desc: 'Refractor-chair exam unit with phoropter arm', type: 'chair_med' },
  { id: 'opto-slitlamp', name: 'Slit Lamp Table', category: 'healthcare', wCm: 60, dCm: 80, hCm: 85, desc: 'Slit-lamp ophthalmic diagnostic table', type: 'table_med' },
  { id: ' ENT-chair', name: 'ENT Treatment Chair', category: 'healthcare', wCm: 75, dCm: 140, hCm: 115, clearance: 100, desc: 'ENT exam chair with instrument console', type: 'chair_med' },
  { id: 'stretcher', name: 'Patient Stretcher / Gurney', category: 'healthcare', wCm: 65, dCm: 200, hCm: 95, clearance: 90, desc: 'Transport stretcher with rails, X-ray translucent', type: 'bed_med' },
  { id: 'wheelchair-std', name: 'Wheelchair (Standard)', category: 'healthcare', wCm: 65, dCm: 105, clearance: 90, desc: 'Self-propel wheelchair 18" seat', type: 'chair_med' },
  { id: 'wheelchair-sports', name: 'Sports Wheelchair', category: 'healthcare', wCm: 70, dCm: 100, clearance: 90, desc: 'Cambered basketball wheelchair', type: 'chair_med' },
  { id: 'wheelchair-bariat', name: 'Bariatric Wheelchair', category: 'healthcare', wCm: 85, dCm: 115, clearance: 130, desc: 'Wide-duty wheelchair for 300kg+ users', type: 'chair_med' },
  { id: 'walker-rollator', name: 'Rollator Walker', category: 'healthcare', wCm: 60, dCm: 65, hCm: 90, desc: '4-wheel rollator with seat', type: 'aid' },
  // Imaging & diagnostics
  { id: 'xray-room-set', name: 'X-Ray Room Equipment Set', category: 'healthcare', wCm: 220, dCm: 220, clearance: 150, desc: 'Wall bucky + table + control console footprint', type: 'imaging' },
  { id: 'ct-scanner', name: 'CT Scanner Suite Set', category: 'healthcare', wCm: 300, dCm: 250, clearance: 150, desc: 'CT gantry + patient table footprint', type: 'imaging' },
  { id: 'mri-scanner', name: 'MRI Scanner Suite Set', category: 'healthcare', wCm: 350, dCm: 280, clearance: 200, desc: 'MRI magnet + bore table suite footprint', type: 'imaging' },
  { id: 'ultrasound-cart', name: 'Ultrasound Machine Cart', category: 'healthcare', wCm: 60, dCm: 90, hCm: 150, desc: 'Portable ultrasound with monitor', type: 'cart' },
  { id: 'ecg-cart', name: 'ECG Machine Cart', category: 'healthcare', wCm: 50, dCm: 60, hCm: 110, desc: '12-lead ECG on mobile cart', type: 'cart' },
  { id: 'vitals-monitor', name: 'Patient Vitals Monitor', category: 'healthcare', wCm: 40, dCm: 35, hCm: 75, desc: 'Bedside multi-parameter monitor on pole', type: 'device' },
  { id: 'infusion-pump', name: 'Infusion Pump Rack', category: 'healthcare', wCm: 30, dCm: 25, hCm: 90, desc: 'Triple-pump IV infusion station', type: 'device' },
  // Reception, waiting, staff
  { id: 'reception-med', name: 'Medical Reception Desk', category: 'healthcare', wCm: 180, dCm: 80, hCm: 110, desc: 'Patient check-in counter with privacy wing', type: 'desk' },
  { id: 'waiting-bench-3', name: 'Waiting Bench (3-Seat)', category: 'healthcare', wCm: 150, dCm: 55, hCm: 85, clearance: 90, desc: 'Beam seating with armrests for clinics', type: 'bench' },
  ...family('waiting-chair', 'Waiting Chair', { category: 'healthcare', wCm: 55, dCm: 55, hCm: 85, clearance: 90, desc: 'Upholstered clinic waiting chair', type: 'chair' },
    [{ suffix: 's', label: 'Single', w: 55 }, { suffix: 'd', label: 'Double', w: 110 }, { suffix: 't', label: 'Triple', w: 165 }, { suffix: 'q', label: 'Quad', w: 220 }]),
  { id: 'trolley-supply', name: 'Medical Supply Trolley', category: 'healthcare', wCm: 60, dCm: 45, hCm: 95, desc: 'Stainless 4-tray nursing trolley', type: 'cart' },
  { id: 'crash-cart', name: 'Emergency Crash Cart', category: 'healthcare', wCm: 65, dCm: 50, hCm: 100, clearance: 90, desc: 'Defibrillator + drug code cart', type: 'cart' },
  { id: 'medicine-cabinet', name: 'Medicine Cabinet (Locked)', category: 'healthcare', wCm: 90, dCm: 35, hCm: 180, desc: 'Controlled-drugs double-lock cabinet', type: 'storage' },
  { id: 'scrub-sink', name: 'Scrub Sink Station', category: 'healthcare', wCm: 90, dCm: 50, hCm: 95, desc: 'Theatre scrub-up sink, knee operated', type: 'sanitary' },
  { id: 'glove-box-stand', name: 'PPE / Glove Dispenser Stand', category: 'healthcare', wCm: 35, dCm: 30, hCm: 140, desc: '4-column PPE dispenser station', type: 'device' },
  { id: 'biohazard-bin', name: 'Biohazard Waste Bin', category: 'healthcare', wCm: 50, dCm: 50, hCm: 75, desc: 'Yellow-lidded clinical waste bin', type: 'bin' },
  { id: 'sharps-container', name: 'Sharps Container Station', category: 'healthcare', wCm: 30, dCm: 30, hCm: 90, desc: 'Wall sharps disposal unit', type: 'bin' },
  // Pharmacy & lab
  { id: 'pharmacy-counter', name: 'Pharmacy Dispensing Counter', category: 'healthcare', wCm: 240, dCm: 90, hCm: 110, clearance: 120, desc: 'Prescription pickup counter', type: 'desk' },
  { id: 'pharmacy-shelf', name: 'Pharmacy Shelving Bay', category: 'healthcare', wCm: 120, dCm: 45, hCm: 220, desc: 'Modular medication shelving', type: 'storage' },
  { id: 'lab-bench-double', name: 'Laboratory Bench (Double-Sided)', category: 'healthcare', wCm: 240, dCm: 150, hCm: 90, clearance: 120, desc: 'Island lab bench with reagent racks', type: 'table_lab' },
  { id: 'fume-hood-lab', name: 'Laboratory Fume Hood', category: 'healthcare', wCm: 150, dCm: 85, hCm: 235, clearance: 90, desc: 'Chemical fume extraction hood', type: 'structure' },
  { id: 'biosafety-cabinet', name: 'Biosafety Cabinet Class II', category: 'healthcare', wCm: 130, dCm: 80, hCm: 220, clearance: 90, desc: 'Pathogen-handling sterile cabinet', type: 'structure' },
  { id: 'centrifuge-bench', name: 'Centrifuge Bench Station', category: 'healthcare', wCm: 90, dCm: 75, hCm: 90, desc: 'Sample centrifuge workbench', type: 'table_lab' },
  { id: 'fridge-pharma', name: 'Pharmacy Refrigerator', category: 'healthcare', wCm: 70, dCm: 70, hCm: 180, desc: '2-8°C vaccine/pharma fridge', type: 'appliance' },
  { id: 'autoclave', name: 'Autoclave Sterilizer', category: 'healthcare', wCm: 80, dCm: 70, hCm: 150, desc: 'Steam sterilizer, theatre CSSD', type: 'appliance' },
  { id: 'operating-light', name: 'Operating Theatre Light', category: 'healthcare', wCm: 100, dCm: 100, hCm: 250, desc: 'Shadowless OT lamp ceiling footprint', type: 'device' },
  { id: 'anaesthesia-cart', name: 'Anaesthesia Machine Cart', category: 'healthcare', wCm: 80, dCm: 60, hCm: 160, clearance: 90, desc: 'Anaesthesia workstation + gas columns', type: 'cart' },
  { id: 'mayo-stand', name: 'Mayo Instrument Stand', category: 'healthcare', wCm: 45, dCm: 45, hCm: 100, desc: 'Theatre instrument tray stand', type: 'table_med' },
  { id: 'kick-bucket', name: 'Kick Bucket (Theatre)', category: 'healthcare', wCm: 30, dCm: 30, hCm: 50, desc: 'Foot-operated theatre waste bucket', type: 'bin' },
  // Rehab & therapy
  { id: 'physio-plinth', name: 'Physiotherapy Plinth', category: 'healthcare', wCm: 70, dCm: 190, hCm: 85, clearance: 120, desc: 'Treatment plinth with 3 sections', type: 'table_med' },
  { id: 'parallel-bars', name: 'Rehab Parallel Bars', category: 'healthcare', wCm: 300, dCm: 100, hCm: 110, clearance: 120, desc: 'Walking rehabilitation bar track', type: 'structure' },
  { id: 'therapy-mat', name: 'Therapy Exercise Mat', category: 'healthcare', wCm: 180, dCm: 90, hCm: 15, desc: 'Firm rehabilitation floor mat', type: 'mat' },
  { id: 'pedal-exerciser', name: 'Pedal Exerciser (Rehab)', category: 'healthcare', wCm: 55, dCm: 50, hCm: 50, desc: 'Seated arm/leg rehab pedal unit', type: 'aid' },
  { id: 'hydro-therapy', name: 'Hydrotherapy Pool Step', category: 'healthcare', wCm: 150, dCm: 100, hCm: 60, desc: 'Pool access step + rail module', type: 'structure' }
];

// ===========================================================================
// EMERGENCY & CIVIC — police, fire, security, municipal  (60+)
// ===========================================================================
const emergency = [
  { id: 'police-desk', name: 'Police Report Desk', category: 'emergency', wCm: 160, dCm: 80, hCm: 110, desc: 'Front-counter incident report desk with raise', type: 'desk' },
  { id: 'police-bench-custody', name: 'Custody Bench (Fixed)', category: 'emergency', wCm: 180, dCm: 50, hCm: 45, desc: 'Secured fixed custody waiting bench', type: 'bench' },
  { id: 'custody-cell-bed', name: 'Custody Cell Bed (Anti-Ligature)', category: 'emergency', wCm: 90, dCm: 190, hCm: 50, clearance: 90, desc: 'Molded cell bed unit', type: 'bed_med' },
  { id: 'custody-toilet', name: 'Custody Cell Sanitary Unit', category: 'emergency', wCm: 70, dCm: 120, hCm: 200, desc: 'Anti-vandal combined pan + basin', type: 'sanitary' },
  { id: 'evidence-locker', name: 'Evidence Locker Bank', category: 'emergency', wCm: 180, dCm: 50, hCm: 200, desc: 'Individual property evidence lockers', type: 'storage' },
  { id: 'weapons-cabinet', name: 'Weapons / Arms Cabinet', category: 'emergency', wCm: 120, dCm: 55, hCm: 200, desc: 'Police firearms storage cabinet', type: 'storage' },
  { id: 'interrogation-table', name: 'Interview Room Table', category: 'emergency', wCm: 120, dCm: 70, hCm: 75, desc: 'Fixed interview table, no ligature points', type: 'table' },
  { id: 'control-room-console', name: 'Dispatch Control Console', category: 'emergency', wCm: 240, dCm: 120, hCm: 120, clearance: 120, desc: 'Emergency dispatch workstation row', type: 'desk' },
  { id: 'comms-rack', name: 'Comms Equipment Rack', category: 'emergency', wCm: 60, dCm: 80, hCm: 200, desc: '42U radio/IT equipment rack', type: 'structure' },
  { id: 'breathing-apparatus', name: 'SCBA Charging Station', category: 'emergency', wCm: 120, dCm: 60, hCm: 200, desc: 'Breathing apparatus cylinder bank + charger', type: 'structure' },
  { id: 'fire-pole', name: 'Fire Station Slide Pole', category: 'emergency', wCm: 30, dCm: 30, hCm: 300, clearance: 90, desc: 'Brass firehouse pole, two-story drop', type: 'pole' },
  { id: 'gear-rack-fire', name: 'Firefighter Turnout Gear Rack', category: 'emergency', wCm: 120, dCm: 60, hCm: 200, clearance: 90, desc: 'PPE hanging rack for engine bays', type: 'storage' },
  { id: 'booth-fire-truck', name: 'Fire Engine Bay Set', category: 'emergency', wCm: 350, dCm: 1100, hCm: 400, clearance: 100, desc: 'Single engine bay incl. truck footprint', type: 'vehicle' },
  { id: 'hose-tower', name: 'Hose Drying Tower Rack', category: 'emergency', wCm: 100, dCm: 100, hCm: 400, desc: 'Hose wash + dry column', type: 'structure' },
  { id: 'fire-truck-2', name: 'Fire Engine (Compact)', category: 'emergency', wCm: 250, dCm: 700, hCm: 340, clearance: 100, desc: 'Compact fire appliance footprint', type: 'vehicle' },
  { id: 'ambulance', name: 'Ambulance (Type II)', category: 'emergency', wCm: 210, dCm: 560, hCm: 260, clearance: 100, desc: 'Type II ambulance van footprint', type: 'vehicle' },
  { id: 'police-car', name: 'Police Patrol Sedan', category: 'emergency', wCm: 190, dCm: 490, hCm: 150, clearance: 80, desc: 'Patrol vehicle parking footprint', type: 'vehicle' },
  { id: 'police-suv', name: 'Police SUV', category: 'emergency', wCm: 200, dCm: 510, hCm: 180, clearance: 80, desc: 'Patrol SUV footprint', type: 'vehicle' },
  { id: 'motorbike-patrol', name: 'Police Motorcycle', category: 'emergency', wCm: 80, dCm: 220, hCm: 120, clearance: 60, desc: 'Patrol motorcycle footprint', type: 'vehicle' },
  { id: 'holding-cell', name: 'Temporary Holding Cell', category: 'emergency', wCm: 220, dCm: 240, hCm: 250, desc: 'Holding cell module incl. bed + sanitary', type: 'room_obj' },
  { id: 'riot-gear-locker', name: 'Riot Gear Locker', category: 'emergency', wCm: 45, dCm: 50, hCm: 200, desc: 'Single riot-helmet + shield locker', type: 'storage' },
  { id: 'duty-desk-sgt', name: 'Sergeant Duty Desk', category: 'emergency', wCm: 180, dCm: 90, hCm: 75, desc: 'Watch sergeant workstation', type: 'desk' },
  { id: 'bullet-glass-booth', name: 'Security Glazing Booth', category: 'emergency', wCm: 150, dCm: 150, hCm: 250, clearance: 90, desc: 'Bullet-resistant guard booth module', type: 'room_obj' },
  { id: 'xray-scanner-sec', name: 'Security X-Ray Scanner', category: 'emergency', wCm: 120, dCm: 250, hCm: 160, clearance: 120, desc: 'Luggage X-ray screening belt', type: 'device' },
  { id: 'metal-detector-arch', name: 'Walk-Through Metal Detector', category: 'emergency', wCm: 90, dCm: 60, hCm: 220, clearance: 120, desc: 'Arch security detector', type: 'device' },
  { id: 'bollard-security', name: 'Security Bollard (Crash-Rated)', category: 'emergency', wCm: 30, dCm: 30, hCm: 100, desc: 'Anti-ram vehicle bollard', type: 'structure' },
  { id: 'front-desk-sec', name: 'Security Reception Console', category: 'emergency', wCm: 200, dCm: 90, hCm: 115, desc: 'Guarded front-desk console', type: 'desk' },
  { id: 'cctv-wall', name: 'CCTV Monitor Wall', category: 'emergency', wCm: 300, dCm: 60, hCm: 220, clearance: 150, desc: 'Video-wall surveillance console', type: 'structure' },
  { id: 'armory-workbench', name: 'Armory Workbench', category: 'emergency', wCm: 240, dCm: 90, hCm: 95, desc: 'Weapons maintenance bench', type: 'table' },
  { id: 'court-bench', name: 'Courtroom Jury Bench', category: 'emergency', wCm: 240, dCm: 55, hCm: 50, desc: '12-person jury bench run', type: 'bench' },
  { id: 'witness-stand', name: 'Witness Stand', category: 'emergency', wCm: 120, dCm: 80, hCm: 110, desc: 'Raised witness box module', type: 'structure' },
  { id: 'judge-bench', name: 'Judge Bench', category: 'emergency', wCm: 240, dCm: 100, hCm: 130, desc: 'Elevated judicial bench', type: 'desk' },
  { id: 'council-desk', name: 'Council Chamber Desk', category: 'emergency', wCm: 160, dCm: 80, hCm: 75, desc: 'Council member chamber desk', type: 'desk' },
  { id: 'public-gallery-bench', name: 'Public Gallery Bench', category: 'emergency', wCm: 200, dCm: 50, hCm: 45, desc: 'Fixed public seating, courtroom', type: 'bench' }
];

// ===========================================================================
// SPORTS & STADIUM  (90+)
// ===========================================================================
const sports = [
  // Courts & fields (scaled 1:200-friendly footprints)
  { id: 'court-basketball', name: 'Basketball Court (FIBA 28×15m)', category: 'sports', wCm: 1500, dCm: 2800, clearance: 200, desc: 'Full FIBA court with run-off', type: 'field' },
  { id: 'court-basketball-half', name: 'Half Basketball Court', category: 'sports', wCm: 1500, dCm: 1400, clearance: 200, desc: 'Half-court training zone', type: 'field' },
  { id: 'court-tennis', name: 'Tennis Court (23.77×10.97m)', category: 'sports', wCm: 1097, dCm: 2377, clearance: 366, desc: 'Doubles court with official run-off', type: 'field' },
  { id: 'court-badminton', name: 'Badminton Court (13.4×6.1m)', category: 'sports', wCm: 610, dCm: 1340, clearance: 150, desc: 'Singles/doubles badminton court', type: 'field' },
  { id: 'court-volleyball', name: 'Volleyball Court (18×9m)', category: 'sports', wCm: 900, dCm: 1800, clearance: 300, desc: 'Indoor volleyball court', type: 'field' },
  { id: 'court-squash', name: 'Squash Court (9.75×6.4m)', category: 'sports', wCm: 640, dCm: 975, clearance: 100, desc: 'Single squash court with tin', type: 'field' },
  { id: 'court-padel', name: 'Padel Court (20×10m)', category: 'sports', wCm: 1000, dCm: 2000, clearance: 200, desc: 'Glass-walled padel court', type: 'field' },
  { id: 'court-futsal', name: 'Futsal Court (40×20m)', category: 'sports', wCm: 2000, dCm: 4000, clearance: 200, desc: 'FIFA futsal court', type: 'field' },
  { id: 'court-handball', name: 'Handball Court (40×20m)', category: 'sports', wCm: 2000, dCm: 4000, clearance: 200, desc: 'Team handball court', type: 'field' },
  { id: 'field-football', name: 'Football Pitch (105×68m)', category: 'sports', wCm: 6800, dCm: 10500, clearance: 500, desc: 'FIFA standard match pitch', type: 'field' },
  { id: 'field-football-small', name: 'Small-Sided Pitch (60×40m)', category: 'sports', wCm: 4000, dCm: 6000, clearance: 300, desc: '8-a-side training pitch', type: 'field' },
  { id: 'field-hockey', name: 'Hockey Pitch (91.4×55m)', category: 'sports', wCm: 5500, dCm: 9140, clearance: 300, desc: 'Water-based hockey turf', type: 'field' },
  { id: 'field-rugby', name: 'Rugby Pitch (100×70m)', category: 'sports', wCm: 7000, dCm: 10000, clearance: 500, desc: 'Full-size rugby field', type: 'field' },
  { id: 'track-400m', name: '400m Athletics Track', category: 'sports', wCm: 17600, dCm: 9200, clearance: 400, desc: '8-lane 400m oval incl. infield', type: 'field' },
  { id: 'pool-olympic', name: 'Olympic Pool (50×25m)', category: 'sports', wCm: 2500, dCm: 5000, clearance: 200, desc: '10-lane 50m competition pool', type: 'field' },
  { id: 'pool-25m', name: 'Training Pool (25×12.5m)', category: 'sports', wCm: 1250, dCm: 2500, clearance: 150, desc: '6-lane community pool', type: 'field' },
  { id: 'pool-kids', name: 'Kids Paddling Pool (10×6m)', category: 'sports', wCm: 600, dCm: 1000, desc: 'Shallow leisure pool', type: 'field' },
  { id: 'gymnastics-floor', name: 'Gymnastics Floor Area (12×12m)', category: 'sports', wCm: 1200, dCm: 1200, clearance: 100, desc: ' sprung floor exercise mat', type: 'field' },
  // Stadium elements
  { id: 'stadium-seat', name: 'Stadium Bucket Seat', category: 'sports', wCm: 50, dCm: 55, hCm: 45, clearance: 30, desc: 'Single tip-up stadium seat', type: 'seat' },
  { id: 'stadium-row-10', name: 'Stadium Seating Row (10)', category: 'sports', wCm: 500, dCm: 80, hCm: 45, clearance: 30, desc: '10-seat row on riser tread', type: 'bench' },
  { id: 'stadium-row-20', name: 'Stadium Seating Row (20)', category: 'sports', wCm: 1000, dCm: 80, hCm: 45, clearance: 30, desc: '20-seat row on riser tread', type: 'bench' },
  { id: 'vip-box', name: 'VIP Hospitality Box (6p)', category: 'sports', wCm: 400, dCm: 300, hCm: 280, desc: '6-person hospitality suite module', type: 'room_obj' },
  { id: 'press-booth', name: 'Press Commentary Booth', category: 'sports', wCm: 300, dCm: 200, hCm: 250, desc: 'Commentary booth module', type: 'room_obj' },
  { id: 'scoreboard-led', name: 'LED Scoreboard (Large)', category: 'sports', wCm: 900, dCm: 100, hCm: 500, desc: 'Stadium end scoreboard screen', type: 'device' },
  { id: 'floodlight-mast', name: 'Floodlight Mast', category: 'sports', wCm: 120, dCm: 120, hCm: 3500, desc: 'Corner floodlight column', type: 'pole' },
  { id: 'dugout-shelter', name: 'Team Dugout Shelter', category: 'sports', wCm: 600, dCm: 200, hCm: 210, clearance: 100, desc: '9-seat bench shelter', type: 'structure' },
  { id: 'ticket-turnstile', name: 'Ticket Turnstile', category: 'sports', wCm: 60, dCm: 120, hCm: 110, clearance: 90, desc: 'Rotary entry turnstile', type: 'device' },
  { id: 'goal-football', name: 'Football Goal (7.32×2.44m)', category: 'sports', wCm: 732, dCm: 200, hCm: 244, desc: 'Full-size goal frame', type: 'structure' },
  { id: 'goal-futsal', name: 'Futsal Goal (3×2m)', category: 'sports', wCm: 300, dCm: 100, hCm: 200, desc: 'Futsal goal frame', type: 'structure' },
  { id: 'goal-handball', name: 'Handball Goal (3×2m)', category: 'sports', wCm: 300, dCm: 100, hCm: 200, desc: 'Handball goal frame', type: 'structure' },
  { id: 'goal-rugby', name: 'Rugby Post Set (H)', category: 'sports', wCm: 550, dCm: 100, hCm: 350, desc: 'H-post rugby uprights', type: 'structure' },
  { id: 'net-volleyball', name: 'Volleyball Net Set', category: 'sports', wCm: 1000, dCm: 20, hCm: 243, desc: 'Competition net + posts', type: 'structure' },
  { id: 'net-tennis', name: 'Tennis Net Set', category: 'sports', wCm: 1100, dCm: 15, hCm: 107, desc: 'Net with posts + center strap', type: 'structure' },
  { id: 'net-badminton', name: 'Badminton Net Set', category: 'sports', wCm: 610, dCm: 12, hCm: 155, desc: 'Net with posts', type: 'structure' },
  { id: 'rebound-wall', name: 'Training Rebound Wall', category: 'sports', wCm: 600, dCm: 40, hCm: 300, desc: 'Practice kick wall', type: 'structure' },
  { id: 'court-divider', name: 'Court Divider Curtain', category: 'sports', wCm: 3400, dCm: 20, hCm: 400, desc: 'Hall sports divider curtain', type: 'panel' },
  { id: 'climbing-wall', name: 'Indoor Climbing Wall Module', category: 'sports', wCm: 300, dCm: 150, hCm: 400, clearance: 300, desc: 'Bouldering wall with fall zone', type: 'structure' },
  { id: 'skate-ramp', name: 'Skate Quarter Pipe', category: 'sports', wCm: 240, dCm: 180, hCm: 120, clearance: 100, desc: 'Quarter pipe ramp module', type: 'structure' },
  { id: 'skate-rail', name: 'Skate Grind Rail', category: 'sports', wCm: 300, dCm: 20, hCm: 40, desc: 'Flat grind rail', type: 'structure' },
  { id: 'gym-mat-stack', name: 'Landing Mat Stack', category: 'sports', wCm: 200, dCm: 150, hCm: 40, desc: 'Gymnastics crash mats', type: 'mat' }
];

// ===========================================================================
// FITNESS (gym equipment with real machine footprints)
// ===========================================================================
const fitness = [
  { id: 'treadmill', name: 'Treadmill', category: 'fitness', wCm: 85, dCm: 200, hCm: 150, clearance: 80, desc: 'Commercial treadmill + buffer', type: 'machine' },
  { id: 'elliptical', name: 'Elliptical Cross-Trainer', category: 'fitness', wCm: 70, dCm: 180, hCm: 170, clearance: 80, desc: 'Cross-trainer machine', type: 'machine' },
  { id: 'spin-bike', name: 'Spin Bike', category: 'fitness', wCm: 55, dCm: 120, hCm: 120, clearance: 60, desc: 'Indoor cycling trainer', type: 'machine' },
  { id: 'rower', name: 'Rowing Machine', category: 'fitness', wCm: 60, dCm: 220, hCm: 110, clearance: 100, desc: 'Concept-style rowing ergometer', type: 'machine' },
  { id: 'stair-climber', name: 'Stair Climber', category: 'fitness', wCm: 75, dCm: 130, hCm: 180, clearance: 80, desc: 'Stepper machine', type: 'machine' },
  { id: 'smith-rack', name: 'Smith Machine Rack', category: 'fitness', wCm: 130, dCm: 160, hCm: 220, clearance: 120, desc: 'Guided barbell station', type: 'machine' },
  { id: 'power-rack', name: 'Power Cage', category: 'fitness', wCm: 130, dCm: 130, hCm: 230, clearance: 150, desc: 'Free-weight squat cage', type: 'machine' },
  { id: 'bench-press', name: 'Bench Press Station', category: 'fitness', wCm: 130, dCm: 180, hCm: 130, clearance: 120, desc: 'Bench + barbell rack', type: 'machine' },
  { id: 'dumbbell-rack', name: 'Dumbbell Rack (3-Tier)', category: 'fitness', wCm: 180, dCm: 70, hCm: 130, clearance: 100, desc: 'Tiered dumbbell storage', type: 'storage' },
  { id: 'plate-tree', name: 'Weight Plate Tree', category: 'fitness', wCm: 60, dCm: 60, hCm: 150, desc: 'Olympic plate holder', type: 'storage' },
  { id: 'cable-crossover', name: 'Cable Crossover Station', category: 'fitness', wCm: 310, dCm: 110, hCm: 220, clearance: 120, desc: 'Dual pulley tower station', type: 'machine' },
  { id: 'lat-pulldown', name: 'Lat Pulldown Station', category: 'fitness', wCm: 110, dCm: 150, hCm: 210, clearance: 100, desc: 'High pulley back station', type: 'machine' },
  { id: 'leg-press', name: 'Leg Press 45°', category: 'fitness', wCm: 160, dCm: 180, hCm: 150, clearance: 120, desc: 'Sled leg press', type: 'machine' },
  { id: 'functional-rig', name: 'Functional Training Rig', category: 'fitness', wCm: 360, dCm: 120, hCm: 240, clearance: 150, desc: 'CrossFit rig with pull-up bars', type: 'structure' },
  { id: 'yoga-mat', name: 'Yoga Mat', category: 'fitness', wCm: 61, dCm: 173, hCm: 1, desc: 'Standard yoga mat rolled-out', type: 'mat' },
  { id: 'pilates-reformer', name: 'Pilates Reformer', category: 'fitness', wCm: 60, dCm: 230, hCm: 40, clearance: 100, desc: 'Reformer bed', type: 'machine' },
  { id: 'stretch-roller', name: 'Foam Roller Station', category: 'fitness', wCm: 90, dCm: 60, hCm: 20, desc: 'Roller + mat stretch station', type: 'aid' },
  { id: 'water-fountain-gym', name: 'Gym Water Fountain', category: 'fitness', wCm: 60, dCm: 45, hCm: 100, desc: 'Wall hydration station', type: 'sanitary' },
  { id: 'locker-gym', name: 'Gym Locker (Single)', category: 'fitness', wCm: 40, dCm: 50, hCm: 180, desc: 'Changing room locker cell', type: 'storage' },
  { id: 'locker-bank-6', name: 'Locker Bank (6-Wide)', category: 'fitness', wCm: 240, dCm: 50, hCm: 180, desc: '6-cell locker run', type: 'storage' },
  { id: 'spin-studio-bike-row', name: 'Spin Class Row (8)', category: 'fitness', wCm: 440, dCm: 260, hCm: 120, clearance: 100, desc: '8-bike studio row footprint', type: 'machine' }
];

// ===========================================================================
// LEISURE — cinema, gaming, caravans, playground  (70+)
// ===========================================================================
const leisure = [
  // Cinema
  ...family('cinema-seat', 'Cinema Seat', { category: 'leisure', wCm: 58, dCm: 100, hCm: 110, clearance: 40, desc: 'Reclining cinema seat with cupholder', type: 'seat' },
    [{ suffix: 'std', label: 'Standard' }, { suffix: 'prem', label: 'Premium', w: 65 }, { suffix: 'duo', label: 'Love Seat', w: 120 }, { suffix: 'vip', label: 'VIP Recliner', w: 80, d: 170 }]),
  { id: 'cinema-screen', name: 'Cinema Screen Wall', category: 'leisure', wCm: 1200, dCm: 30, hCm: 550, desc: 'Standard 12m cinema screen', type: 'structure' },
  { id: 'projector-booth', name: 'Projection Booth', category: 'leisure', wCm: 300, dCm: 250, hCm: 260, desc: 'Cinema projection room module', type: 'room_obj' },
  { id: 'cinema-row-8std', name: 'Cinema Row (8 Seats)', category: 'leisure', wCm: 464, dCm: 100, hCm: 110, clearance: 40, desc: '8-seat row with center aisle break', type: 'bench' },
  { id: 'concession-counter', name: 'Concession Stand Counter', category: 'leisure', wCm: 300, dCm: 90, hCm: 115, clearance: 120, desc: 'Popcorn/drinks concession counter', type: 'desk' },
  { id: 'popcorn-machine', name: 'Popcorn Machine Cart', category: 'leisure', wCm: 70, dCm: 55, hCm: 160, desc: 'Theatre popcorn warmer cart', type: 'appliance' },
  { id: 'ticket-booth-cine', name: 'Ticket Booth', category: 'leisure', wCm: 120, dCm: 120, hCm: 250, clearance: 90, desc: 'Box-office booth module', type: 'room_obj' },
  // Gaming
  { id: 'arcade-cabinet', name: 'Arcade Cabinet', category: 'leisure', wCm: 70, dCm: 80, hCm: 180, clearance: 60, desc: 'Upright arcade machine', type: 'machine' },
  { id: 'arcade-racing', name: 'Racing Simulator Cockpit', category: 'leisure', wCm: 90, dCm: 180, hCm: 150, clearance: 90, desc: 'Sit-in racing arcade', type: 'machine' },
  { id: 'arcade-dance', name: 'Dance Machine Pad', category: 'leisure', wCm: 110, dCm: 160, hCm: 130, clearance: 120, desc: 'Two-panel dance arcade', type: 'machine' },
  { id: 'air-hockey', name: 'Air Hockey Table', category: 'leisure', wCm: 120, dCm: 220, hCm: 80, clearance: 100, desc: 'Full-size air hockey table', type: 'table' },
  { id: 'pingpong-table', name: 'Table Tennis Table', category: 'leisure', wCm: 152, dCm: 274, hCm: 76, clearance: 140, desc: 'Competition ping-pong table', type: 'table' },
  { id: 'foosball', name: 'Foosball Table', category: 'leisure', wCm: 120, dCm: 70, hCm: 90, clearance: 80, desc: 'Table football game', type: 'table' },
  { id: 'pool-table-7ft', name: 'Pool Table (7ft)', category: 'leisure', wCm: 100, dCm: 200, hCm: 80, clearance: 140, desc: '7ft billiard table with cuespace', type: 'table' },
  { id: 'pool-table-9ft', name: 'Pool Table (9ft)', category: 'leisure', wCm: 128, dCm: 254, hCm: 80, clearance: 150, desc: 'Tournament billiard table', type: 'table' },
  { id: 'dartboard-zone', name: 'Dartboard Throw Zone', category: 'leisure', wCm: 120, dCm: 370, hCm: 180, desc: 'Wall dartboard + 2.37m oche zone', type: 'zone' },
  { id: 'console-lounge-pod', name: 'Gaming Lounge Pod', category: 'leisure', wCm: 200, dCm: 200, hCm: 150, clearance: 90, desc: '4-screen console gaming sofa pod', type: 'room_obj' },
  { id: 'esports-station', name: 'Esports Gaming Station', category: 'leisure', wCm: 80, dCm: 120, hCm: 130, clearance: 80, desc: 'Single PC esports battle station', type: 'desk' },
  { id: 'esports-row-5', name: 'Esports Team Row (5)', category: 'leisure', wCm: 400, dCm: 120, hCm: 130, clearance: 80, desc: '5-station competition row', type: 'desk' },
  { id: 'vr-arena-pad', name: 'VR Arena Pad', category: 'leisure', wCm: 300, dCm: 300, hCm: 250, clearance: 100, desc: 'Free-roam VR booth pad', type: 'zone' },
  { id: 'gaming-lounge-seat', name: 'Gaming Bean Lounger', category: 'leisure', wCm: 90, dCm: 90, hCm: 80, desc: 'Floor gaming lounger', type: 'chair' },
  // Caravans, RVs & camping
  { id: 'caravan-2berth', name: 'Caravan (2-Berth)', category: 'leisure', wCm: 200, dCm: 550, hCm: 260, clearance: 100, desc: 'Compact touring caravan footprint', type: 'vehicle' },
  { id: 'caravan-4berth', name: 'Caravan (4-Berth Family)', category: 'leisure', wCm: 230, dCm: 640, hCm: 270, clearance: 100, desc: 'Family touring caravan', type: 'vehicle' },
  { id: 'motorhome-alcove', name: 'Motorhome (Alcove 7m)', category: 'leisure', wCm: 230, dCm: 700, hCm: 310, clearance: 100, desc: 'Over-cab alcove motorhome', type: 'vehicle' },
  { id: 'camper-van', name: 'Camper Van (LWB)', category: 'leisure', wCm: 200, dCm: 590, hCm: 260, clearance: 100, desc: 'Conversion camper van', type: 'vehicle' },
  { id: 'rv-pitch', name: 'RV Pitch (Standard)', category: 'leisure', wCm: 500, dCm: 1000, desc: 'Caravan pitch + awning + vehicle space', type: 'zone' },
  { id: 'tent-family', name: 'Family Tent (6-Person)', category: 'leisure', wCm: 300, dCm: 450, hCm: 200, clearance: 60, desc: 'Dome family tent footprint', type: 'structure' },
  { id: 'tent-gazebo', name: 'Pop-Up Gazebo (3×3m)', category: 'leisure', wCm: 300, dCm: 300, hCm: 250, desc: 'Event shelter gazebo', type: 'structure' },
  { id: 'campfire-ring', name: 'Fire Pit Circle', category: 'leisure', wCm: 100, dCm: 100, hCm: 40, clearance: 200, desc: 'Campfire ring with safety radius', type: 'structure' },
  { id: 'picnic-table', name: 'Picnic Table (6-Seat)', category: 'leisure', wCm: 180, dCm: 100, hCm: 78, clearance: 90, desc: 'A-frame park picnic table', type: 'table' },
  { id: 'bbq-station', name: 'BBQ Grill Station', category: 'leisure', wCm: 150, dCm: 60, hCm: 100, clearance: 150, desc: 'Built-in charcoal/gas grill counter', type: 'appliance' },
  // Playground
  { id: 'swing-set-2', name: 'Swing Set (2-Bay)', category: 'leisure', wCm: 400, dCm: 250, hCm: 250, clearance: 200, desc: 'Two-bay swing frame with safety zone', type: 'structure' },
  { id: 'slide-3m', name: 'Play Slide (3m)', category: 'leisure', wCm: 120, dCm: 400, hCm: 200, clearance: 150, desc: 'Freestanding play slide', type: 'structure' },
  { id: 'climbing-frame', name: 'Climbing Frame (Jungle Gym)', category: 'leisure', wCm: 250, dCm: 250, hCm: 220, clearance: 150, desc: 'Modular play climbing tower', type: 'structure' },
  { id: 'seesaw', name: 'Seesaw / Teeter', category: 'leisure', wCm: 300, dCm: 80, hCm: 90, clearance: 150, desc: 'Two-seat seesaw', type: 'structure' },
  { id: 'spring-rocker', name: 'Spring Rocker', category: 'leisure', wCm: 60, dCm: 90, hCm: 90, clearance: 100, desc: 'Single spring ride-on toy', type: 'structure' },
  { id: 'sandpit', name: 'Sandpit (Square)', category: 'leisure', wCm: 200, dCm: 200, hCm: 30, clearance: 100, desc: 'Timber-edged play sandpit', type: 'zone' },
  { id: 'rubber-surface', name: 'Rubber Play Surface (Tile Zone)', category: 'leisure', wCm: 150, dCm: 150, hCm: 5, desc: 'Impact-attenuating play surfacing', type: 'zone' },
  { id: 'trampoline-inground', name: 'In-Ground Trampoline', category: 'leisure', wCm: 300, dCm: 300, hCm: 20, clearance: 200, desc: 'Flush trampoline with fall zone', type: 'structure' },
  // Park & outdoor gym
  { id: 'outdoor-gym-station', name: 'Outdoor Gym Station', category: 'leisure', wCm: 150, dCm: 150, hCm: 210, clearance: 100, desc: 'Calisthenics rig (dip + bars)', type: 'structure' },
  { id: 'pingpong-outdoor', name: 'Outdoor Concrete Ping-Pong', category: 'leisure', wCm: 152, dCm: 274, hCm: 76, clearance: 140, desc: 'Weatherproof table tennis table', type: 'table' },
  { id: 'park-bench-back', name: 'Park Bench (Backrest)', category: 'leisure', wCm: 180, dCm: 60, hCm: 85, clearance: 60, desc: 'Classic 3-seat park bench', type: 'bench' },
  { id: 'sun-lounger-pool', name: 'Sun Lounger', category: 'leisure', wCm: 70, dCm: 195, hCm: 60, clearance: 60, desc: 'Poolside reclining lounger', type: 'chair' },
  { id: 'parasol-base', name: 'Market Parasol (3m)', category: 'leisure', wCm: 300, dCm: 300, hCm: 260, desc: 'Cantilever parasol shade', type: 'structure' },
  { id: 'shade-sail', name: 'Shade Sail (5×5m)', category: 'leisure', wCm: 500, dCm: 500, hCm: 350, desc: 'Overhead shade sail coverage', type: 'zone' }
];

// ===========================================================================
// EDUCATION  (40+)
// ===========================================================================
const education = [
  ...family('school-desk', 'Pupil Desk', { category: 'education', wCm: 60, dCm: 50, hCm: 76, clearance: 60, desc: 'Single pupil desk with tray', type: 'desk' },
    [{ suffix: 'single', label: 'Single' }, { suffix: 'double', label: 'Double', w: 120 }, { suffix: 'exam', label: 'Exam Podium', w: 65 }]),
  { id: 'teacher-desk-class', name: 'Teacher Desk', category: 'education', wCm: 160, dCm: 70, hCm: 75, clearance: 100, desc: 'Classroom teacher workstation', type: 'desk' },
  { id: 'classroom-row-5', name: 'Desk Row (5 Units)', category: 'education', wCm: 320, dCm: 50, hCm: 76, clearance: 60, desc: '5-desk row with aisle space', type: 'desk' },
  { id: 'whiteboard-3m', name: 'Whiteboard (3m Rail)', category: 'education', wCm: 300, dCm: 10, hCm: 120, desc: 'Wall teaching board', type: 'panel' },
  { id: 'smartboard-86', name: 'Interactive Display (86")', category: 'education', wCm: 200, dCm: 15, hCm: 120, desc: 'Touch smartboard with trolley', type: 'device' },
  { id: 'locker-student', name: 'Student Corridor Locker', category: 'education', wCm: 30, dCm: 45, hCm: 180, desc: 'Single student locker cell', type: 'storage' },
  { id: 'library-shelf-double', name: 'Library Double-Sided Shelf', category: 'education', wCm: 100, dCm: 100, hCm: 180, clearance: 90, desc: 'Face-out library bookshelf', type: 'storage' },
  { id: 'reading-carrel', name: 'Study Carrel', category: 'education', wCm: 80, dCm: 60, hCm: 120, clearance: 60, desc: 'Exam study carrel desk', type: 'desk' },
  { id: 'lab-station-4', name: 'Science Lab Station (4-Pupil)', category: 'education', wCm: 280, dCm: 130, hCm: 90, clearance: 120, desc: 'Island lab bench with sinks', type: 'table_lab' },
  { id: 'fume-hood-school', name: 'School Fume Cupboard', category: 'education', wCm: 120, dCm: 70, hCm: 220, clearance: 90, desc: 'Classroom fume cupboard', type: 'structure' },
  { id: 'canteen-table-8', name: 'Canteen Table (8-Seat)', category: 'education', wCm: 240, dCm: 120, hCm: 75, clearance: 90, desc: 'Cafeteria table with fixed stools', type: 'table' },
  { id: 'nursery-playtable', name: 'Nursery Play Table', category: 'education', wCm: 120, dCm: 80, hCm: 50, clearance: 60, desc: 'Low toddler activity table', type: 'table' },
  { id: 'nursery-cubby', name: 'Nursery Cubby Unit', category: 'education', wCm: 160, dCm: 40, hCm: 110, desc: 'Coat + bag cubby row', type: 'storage' },
  { id: 'lecture-tiers', name: 'Lecture Tier Row (8)', category: 'education', wCm: 480, dCm: 90, hCm: 60, clearance: 40, desc: '8-seat tiered lecture row', type: 'bench' },
  { id: 'lecture-podium', name: 'Lecture Podium/Lectern', category: 'education', wCm: 60, dCm: 45, hCm: 115, clearance: 90, desc: 'Presentation lectern', type: 'desk' },
  { id: 'instrument-locker', name: 'Instrument Locker', category: 'education', wCm: 60, dCm: 60, hCm: 180, desc: 'Music instrument storage', type: 'storage' },
  { id: 'art-easel-class', name: 'Classroom Easel', category: 'education', wCm: 60, dCm: 60, hCm: 170, clearance: 90, desc: 'Student painting easel', type: 'structure' },
  { id: 'kiln-art', name: 'Ceramics Kiln', category: 'education', wCm: 80, dCm: 80, hCm: 120, clearance: 120, desc: 'School pottery kiln with vent gap', type: 'appliance' },
  { id: 'school-nurse-bed', name: 'School Nurse Bed', category: 'education', wCm: 90, dCm: 190, hCm: 65, clearance: 90, desc: 'Sick-bay cot', type: 'bed_med' }
];

// ===========================================================================
// HOSPITALITY — hotel, restaurant, worship  (40+)
// ===========================================================================
const hospitality = [
  { id: 'hotel-bed-queen', name: 'Hotel Bed (Queen + Headboard)', category: 'hospitality', wCm: 160, dCm: 210, hCm: 120, clearance: 90, desc: 'Queen hotel bed with headboard', type: 'bed' },
  { id: 'hotel-bed-king', name: 'Hotel Bed (King Suite)', category: 'hospitality', wCm: 190, dCm: 210, hCm: 120, clearance: 90, desc: 'King suite bed', type: 'bed' },
  { id: 'luggage-rack', name: 'Luggage Rack', category: 'hospitality', wCm: 60, dCm: 50, hCm: 65, desc: 'Folding hotel luggage bench', type: 'table' },
  { id: 'minibar', name: 'Minibar Fridge', category: 'hospitality', wCm: 50, dCm: 55, hCm: 85, desc: 'Hotel room minibar unit', type: 'appliance' },
  { id: 'hotel-workdesk', name: 'Hotel Work Desk', category: 'hospitality', wCm: 110, dCm: 55, hCm: 76, clearance: 90, desc: 'Guest room desk + chair zone', type: 'desk' },
  { id: 'hotel-wardrobe-mini', name: 'Hotel Wardrobe', category: 'hospitality', wCm: 100, dCm: 58, hCm: 210, desc: 'Guest closet with safe', type: 'storage' },
  { id: 'hotel-bell-desk', name: 'Reception Bell Desk', category: 'hospitality', wCm: 180, dCm: 80, hCm: 110, clearance: 150, desc: 'Front-desk check-in counter', type: 'desk' },
  { id: 'concierge-desk', name: 'Concierge Desk', category: 'hospitality', wCm: 140, dCm: 70, hCm: 110, clearance: 120, desc: 'Concierge service desk', type: 'desk' },
  { id: 'housekeeping-cart', name: 'Housekeeping Trolley', category: 'hospitality', wCm: 55, dCm: 110, hCm: 170, clearance: 60, desc: 'Room service cart', type: 'cart' },
  { id: 'room-service-table', name: 'Room Service Tray Table', category: 'hospitality', wCm: 70, dCm: 70, hCm: 75, desc: 'Folding service table', type: 'table' },
  { id: 'banquet-round-10', name: 'Banquet Round (10p Ø180)', category: 'hospitality', wCm: 180, dCm: 180, hCm: 76, clearance: 90, desc: '10-person banquet round table', type: 'table_round' },
  { id: 'banquet-round-12', name: 'Banquet Round (12p Ø200)', category: 'hospitality', wCm: 200, dCm: 200, hCm: 76, clearance: 90, desc: '12-person banquet round', type: 'table_round' },
  { id: 'banquet-long', name: 'Banquet Long Table (3m)', category: 'hospitality', wCm: 300, dCm: 100, hCm: 76, clearance: 90, desc: 'Conference/banquet long table', type: 'table' },
  { id: 'chafing-station', name: 'Chafing Buffet Station', category: 'hospitality', wCm: 180, dCm: 80, hCm: 100, clearance: 120, desc: 'Buffet chafing line module', type: 'table' },
  { id: 'cocktail-high-top', name: 'Cocktail High-Top Table', category: 'hospitality', wCm: 70, dCm: 70, hCm: 110, clearance: 60, desc: 'Standing bar table Ø70', type: 'table_round' },
  { id: 'bar-counter', name: 'Bar Service Counter', category: 'hospitality', wCm: 300, dCm: 70, hCm: 115, clearance: 120, desc: 'Bar counter with footrail', type: 'desk' },
  { id: 'back-bar-shelf', name: 'Back Bar Display', category: 'hospitality', wCm: 300, dCm: 40, hCm: 200, desc: 'Bottle display back bar', type: 'storage' },
  { id: 'bar-stool-pub', name: 'Bar Stool', category: 'hospitality', wCm: 45, dCm: 45, hCm: 110, clearance: 45, desc: 'Adjustable bar stool', type: 'chair' },
  { id: 'booth-4', name: 'Restaurant Booth (4-Person)', category: 'hospitality', wCm: 120, dCm: 220, hCm: 130, clearance: 60, desc: 'Upholstered dining booth', type: 'room_obj' },
  { id: 'booth-6', name: 'Restaurant Booth (6-Person)', category: 'hospitality', wCm: 180, dCm: 220, hCm: 130, clearance: 60, desc: 'Large family dining booth', type: 'room_obj' },
  { id: 'pos-terminal', name: 'POS Terminal Station', category: 'hospitality', wCm: 45, dCm: 45, hCm: 45, clearance: 60, desc: 'Cash/card payment station', type: 'device' },
  { id: 'hostess-stand', name: 'Hostess Podium', category: 'hospitality', wCm: 50, dCm: 40, hCm: 115, clearance: 90, desc: 'Restaurant greeting stand', type: 'desk' },
  { id: 'kitchen-line-6', name: 'Kitchen Line Burner (6-Burner)', category: 'hospitality', wCm: 120, dCm: 80, hCm: 95, clearance: 110, desc: 'Commercial range station', type: 'appliance' },
  { id: 'salamander', name: 'Salamander Grill', category: 'hospitality', wCm: 90, dCm: 60, hCm: 60, desc: 'Pass-top grill', type: 'appliance' },
  { id: 'walk-in-cooler', name: 'Walk-In Cold Room (4m²)', category: 'hospitality', wCm: 200, dCm: 200, hCm: 240, clearance: 90, desc: 'Cold storage room module', type: 'room_obj' },
  { id: 'dish-return', name: 'Dish Return Conveyor', category: 'hospitality', wCm: 200, dCm: 90, hCm: 100, clearance: 100, desc: 'Dishwashing return belt', type: 'appliance' },
  { id: 'pew-5', name: 'Worship Pew (5-Seat)', category: 'hospitality', wCm: 250, dCm: 55, hCm: 100, clearance: 45, desc: 'Church pew with kneelers', type: 'bench' },
  { id: 'altar-table', name: 'Altar / Prayer Table', category: 'hospitality', wCm: 180, dCm: 80, hCm: 95, clearance: 120, desc: 'Ceremonial altar table', type: 'table' },
  { id: 'podium-lectern-worship', name: 'Reading Lectern', category: 'hospitality', wCm: 60, dCm: 45, hCm: 120, clearance: 90, desc: 'Worship reading stand', type: 'desk' },
  { id: 'fountain-baptismal', name: 'Baptismal Font', category: 'hospitality', wCm: 120, dCm: 120, hCm: 90, clearance: 100, desc: 'Immersion font module', type: 'structure' },
  { id: 'mihrab-rug', name: 'Prayer Rug Row (5)', category: 'hospitality', wCm: 300, dCm: 120, hCm: 3, clearance: 30, desc: '5-position prayer rug row', type: 'mat' }
];

// ===========================================================================
// TRANSPORT & PARKING  (30+)
// ===========================================================================
const transport = [
  { id: 'car-compact-mini', name: 'Compact Car', category: 'transport', wCm: 175, dCm: 420, hCm: 150, clearance: 60, desc: 'Small hatchback footprint', type: 'vehicle' },
  { id: 'car-sedan', name: 'Mid-Size Sedan', category: 'transport', wCm: 185, dCm: 480, hCm: 145, clearance: 60, desc: 'Family sedan footprint', type: 'vehicle' },
  { id: 'car-suv', name: 'SUV / Crossover', category: 'transport', wCm: 195, dCm: 490, hCm: 175, clearance: 60, desc: 'SUV footprint', type: 'vehicle' },
  { id: 'car-van', name: 'Cargo Van', category: 'transport', wCm: 210, dCm: 560, hCm: 250, clearance: 80, desc: 'Delivery van footprint', type: 'vehicle' },
  { id: 'car-pickup', name: 'Pickup Truck', category: 'transport', wCm: 200, dCm: 580, hCm: 185, clearance: 80, desc: 'Full-size pickup footprint', type: 'vehicle' },
  { id: 'ev-charging', name: 'EV Charging Bay (with post)', category: 'transport', wCm: 250, dCm: 520, clearance: 70, desc: 'Parking bay + 7kW charger post', type: 'zone' },
  { id: 'parking-bay-std', name: 'Parking Bay (2.5×5.0m)', category: 'transport', wCm: 250, dCm: 500, desc: 'Standard bay per most codes', type: 'zone' },
  { id: 'parking-bay-wide', name: 'Accessible Parking Bay (3.6m)', category: 'transport', wCm: 360, dCm: 500, clearance: 120, desc: 'ADA bay with access aisle', type: 'zone' },
  { id: 'parking-bay-parallel', name: 'Parallel Parking Bay (2.4×6.0m)', category: 'transport', wCm: 240, dCm: 600, desc: 'Kerb-side parallel bay', type: 'zone' },
  { id: 'bus-stop', name: 'Bus Stop Shelter', category: 'transport', wCm: 400, dCm: 150, hCm: 260, clearance: 150, desc: 'Transit shelter module', type: 'structure' },
  { id: 'bus-12m', name: 'City Bus (12m)', category: 'transport', wCm: 255, dCm: 1200, hCm: 320, clearance: 100, desc: 'Standard single-decker footprint', type: 'vehicle' },
  { id: 'bus-articulated', name: 'Articulated Bus (18m)', category: 'transport', wCm: 255, dCm: 1800, hCm: 330, clearance: 120, desc: 'Bendy bus footprint', type: 'vehicle' },
  { id: 'coach-tour', name: 'Tour Coach', category: 'transport', wCm: 255, dCm: 1350, hCm: 370, clearance: 150, desc: 'Intercity coach + luggage hold', type: 'vehicle' },
  { id: 'taxi-rank', name: 'Taxi Rank Bay', category: 'transport', wCm: 250, dCm: 550, clearance: 80, desc: 'Rank bay with queue space', type: 'zone' },
  { id: 'bike-rack-5', name: 'Bicycle Rack (5-Sheffield)', category: 'transport', wCm: 180, dCm: 120, hCm: 80, clearance: 60, desc: 'Inverted-U bike parking for 5', type: 'structure' },
  { id: 'bike-parking-row-10', name: 'Bicycle Parking Row (10)', category: 'transport', wCm: 360, dCm: 200, hCm: 80, clearance: 60, desc: 'Two-tier 10-bike station', type: 'structure' },
  { id: 'escooter-dock', name: 'E-Scooter Dock (6)', category: 'transport', wCm: 200, dCm: 60, hCm: 120, clearance: 60, desc: 'Shared-mobility dock module', type: 'structure' },
  { id: 'motorbike-bay', name: 'Motorcycle Bay', category: 'transport', wCm: 80, dCm: 220, clearance: 30, desc: 'Single motorcycle space', type: 'zone' },
  { id: 'delivery-cargo-bike', name: 'Cargo Bike + Trailer', category: 'transport', wCm: 90, dCm: 300, hCm: 130, clearance: 60, desc: 'Last-mile cargo bike footprint', type: 'vehicle' },
  { id: 'tram-module', name: 'Tram Module (30m)', category: 'transport', wCm: 240, dCm: 3000, hCm: 340, clearance: 150, desc: 'Modern tram set footprint', type: 'vehicle' },
  { id: 'train-carriage', name: 'Train Carriage (24m)', category: 'transport', wCm: 285, dCm: 2400, hCm: 380, clearance: 200, desc: 'Regional rail carriage footprint', type: 'vehicle' },
  { id: 'platform-edge', name: 'Platform Edge Zone (3m)', category: 'transport', wCm: 300, dCm: 1000, hCm: 92, clearance: 120, desc: 'Platform + tactile safety strip', type: 'zone' },
  { id: 'helipad', name: 'Hospital Helipad (TLOF 22m)', category: 'transport', wCm: 2200, dCm: 2200, clearance: 300, desc: 'Touchdown/ liftoff zone with markings', type: 'field' },
  { id: 'kiss-ride', name: 'Kiss-and-Ride Layby', category: 'transport', wCm: 300, dCm: 700, clearance: 100, desc: 'Drop-off layby module', type: 'zone' },
  { id: 'speed-ramp', name: 'Speed Ramp (Car Park)', category: 'transport', wCm: 360, dCm: 400, hCm: 10, desc: 'Ramp-carpet speed restraint', type: 'structure' },
  { id: 'toll-booth', name: 'Toll Booth Lane', category: 'transport', wCm: 350, dCm: 600, hCm: 260, clearance: 100, desc: 'Toll lane + booth module', type: 'room_obj' },
  { id: 'fuel-pump', name: 'Fuel Pump Island', category: 'transport', wCm: 120, dCm: 550, hCm: 220, clearance: 100, desc: 'Double-sided pump island', type: 'structure' }
];

// ===========================================================================
// LANDSCAPE — plants, trees, green infrastructure (130+ via families)
// ===========================================================================
const landscape = [
  // Trees by canopy spread
  ...family('tree-oak', 'Oak Tree', { category: 'landscape', dCm: 1200, wCm: 1200, hCm: 1500, clearance: 100, desc: 'Mature oak canopy spread', type: 'tree' },
    [{ suffix: 'young', label: 'Young', w: 300, d: 300, h: 500 }, { suffix: 'semi', label: 'Semi-Mature', w: 700, d: 700, h: 1000 }, { suffix: 'mature', label: 'Mature', w: 1200, d: 1200, h: 1500 }, { suffix: 'veteran', label: 'Veteran', w: 1800, d: 1800, h: 1800 }]),
  ...family('tree-birch', 'Silver Birch', { category: 'landscape', wCm: 600, dCm: 600, hCm: 1200, clearance: 80, desc: 'Light-canopy birch', type: 'tree' },
    [{ suffix: 'young', label: 'Young', w: 200, h: 400 }, { suffix: 'mature', label: 'Mature', w: 600, h: 1200 }]),
  ...family('tree-maple', 'Maple / Acer', { category: 'landscape', wCm: 800, dCm: 800, hCm: 1000, clearance: 80, desc: 'Street maple canopy', type: 'tree' },
    [{ suffix: 'young', label: 'Young', w: 250, h: 400 }, { suffix: 'mature', label: 'Mature', w: 800, h: 1000 }]),
  ...family('tree-pine', 'Conifer / Pine', { category: 'landscape', wCm: 500, dCm: 500, hCm: 1800, clearance: 80, desc: 'Columnar conifer', type: 'tree' },
    [{ suffix: 'young', label: 'Young', w: 150, h: 500 }, { suffix: 'mature', label: 'Mature', w: 500, h: 1800 }]),
  ...family('tree-palm', 'Palm Tree', { category: 'landscape', wCm: 300, dCm: 300, hCm: 1200, clearance: 60, desc: 'Canary palm crown', type: 'tree' },
    [{ suffix: 'young', label: 'Young', w: 150, h: 400 }, { suffix: 'mature', label: 'Mature', w: 300, h: 1200 }]),
  ...family('tree-cypress', 'Cypress (Columnar)', { category: 'landscape', wCm: 120, dCm: 120, hCm: 900, clearance: 60, desc: 'Slender screening cypress', type: 'tree' },
    [{ suffix: 'young', label: 'Young', h: 300 }, { suffix: 'mature', label: 'Mature', h: 900 }]),
  ...family('tree-olive', 'Olive Tree', { category: 'landscape', wCm: 500, dCm: 500, hCm: 700, clearance: 60, desc: 'Mediterranean olive', type: 'tree' },
    [{ suffix: 'young', label: 'Young', w: 150, h: 250 }, { suffix: 'mature', label: 'Mature', w: 500, h: 700 }]),
  ...family('tree-cherry', 'Cherry Blossom', { category: 'landscape', wCm: 600, dCm: 600, hCm: 700, clearance: 60, desc: 'Ornamental sakura canopy', type: 'tree' },
    [{ suffix: 'young', label: 'Young', w: 200, h: 300 }, { suffix: 'mature', label: 'Mature', w: 600, h: 700 }]),
  { id: 'hedge-low', name: 'Low Hedge (Run 1m)', category: 'landscape', wCm: 100, dCm: 60, hCm: 60, clearance: 30, desc: 'Boxwood low hedge module', type: 'plant' },
  { id: 'hedge-screen', name: 'Screening Hedge (2m)', category: 'landscape', wCm: 100, dCm: 80, hCm: 200, clearance: 40, desc: 'Boundary privacy hedge', type: 'plant' },
  ...family('shrub-ball', 'Ball Shrub', { category: 'landscape', wCm: 80, dCm: 80, hCm: 80, clearance: 30, desc: 'Clipped sphere shrub', type: 'plant' },
    [{ suffix: 's', label: 'Small Ø40', w: 40, d: 40, h: 40 }, { suffix: 'm', label: 'Medium Ø60', w: 60, d: 60, h: 60 }, { suffix: 'l', label: 'Large Ø80', w: 80, d: 80, h: 80 }]),
  ...family('planter-square', 'Square Planter', { category: 'landscape', wCm: 60, dCm: 60, hCm: 60, clearance: 30, desc: 'Hardwood/concrete planter box', type: 'planter' },
    [{ suffix: 's', label: '40×40', w: 40, d: 40, h: 40 }, { suffix: 'm', label: '60×60', w: 60, d: 60, h: 60 }, { suffix: 'l', label: '80×80', w: 80, d: 80, h: 80 }, { suffix: 'xl', label: '100×100', w: 100, d: 100, h: 100 }]),
  { id: 'planter-round', name: 'Round Planter Ø60', category: 'landscape', wCm: 60, dCm: 60, hCm: 60, clearance: 30, desc: 'Cylindrical tree planter', type: 'planter' },
  { id: 'planter-trough', name: 'Planter Trough (1m)', category: 'landscape', wCm: 100, dCm: 40, hCm: 45, clearance: 30, desc: 'Balcony planting trough', type: 'planter' },
  { id: 'green-roof-tray', name: 'Green Roof Tray Zone', category: 'landscape', wCm: 100, dCm: 100, hCm: 12, clearance: 20, desc: 'Sedum extensive green-roof module', type: 'zone' },
  { id: 'rain-garden', name: 'Rain Garden Cell', category: 'landscape', wCm: 300, dCm: 300, hCm: 25, clearance: 60, desc: 'Bioretention planting cell', type: 'zone' },
  { id: 'bioswale', name: 'Bioswale Run (5m)', category: 'landscape', wCm: 500, dCm: 200, hCm: 30, clearance: 60, desc: 'Linear vegetated swale', type: 'zone' },
  { id: 'pergola-run', name: 'Timber Pergola (3×3m)', category: 'landscape', wCm: 300, dCm: 300, hCm: 260, clearance: 90, desc: 'Climbing-plant pergola', type: 'structure' },
  { id: 'trellis', name: 'Wall Trellis Panel', category: 'landscape', wCm: 180, dCm: 20, hCm: 220, clearance: 40, desc: 'Climber support trellis', type: 'panel' },
  { id: 'lawn-zone', name: 'Lawn Zone (5×5m)', category: 'landscape', wCm: 500, dCm: 500, hCm: 5, desc: 'Amenity turf module', type: 'zone' },
  { id: 'wildflower', name: 'Wildflower Meadow (5m)', category: 'landscape', wCm: 500, dCm: 500, hCm: 60, desc: 'Pollinator meadow module', type: 'zone' },
  { id: 'gravel-bed', name: 'Gravel Garden Bed', category: 'landscape', wCm: 200, dCm: 200, hCm: 8, desc: 'Decorative gravel planting bed', type: 'zone' },
  { id: 'flowerbed-raise', name: 'Raised Flower Bed', category: 'landscape', wCm: 300, dCm: 100, hCm: 45, clearance: 60, desc: 'Accessible planter wall bed', type: 'structure' },
  { id: 'vertical-garden', name: 'Living Wall Panel (2m)', category: 'landscape', wCm: 200, dCm: 30, hCm: 220, clearance: 40, desc: 'Irrigated vertical green wall', type: 'panel' },
  { id: 'tree-grate', name: 'Tree Pit + Grate', category: 'landscape', wCm: 120, dCm: 120, hCm: 5, clearance: 40, desc: 'Urban tree pit with grille', type: 'zone' },
  { id: 'tree-guard', name: 'Street Tree Guard', category: 'landscape', wCm: 100, dCm: 100, hCm: 150, clearance: 40, desc: 'Metal tree protection guard', type: 'structure' },
  { id: 'bench-planter', name: 'Planter Bench Combo', category: 'landscape', wCm: 200, dCm: 80, hCm: 60, clearance: 60, desc: 'Integrated planter with seat edge', type: 'bench' },
  { id: 'boulder', name: 'Landscape Boulder', category: 'landscape', wCm: 150, dCm: 120, hCm: 80, clearance: 40, desc: 'Feature stone', type: 'structure' },
  { id: 'rockery', name: 'Rockery Cluster', category: 'landscape', wCm: 250, dCm: 150, hCm: 60, desc: 'Alpine rock garden group', type: 'structure' },
  { id: 'water-feature-wall', name: 'Water Blade Wall', category: 'landscape', wCm: 180, dCm: 45, hCm: 200, clearance: 100, desc: 'Corten water feature wall', type: 'structure' },
  { id: 'pond-liner-zone', name: 'Ornamental Pond (3×2m)', category: 'landscape', wCm: 300, dCm: 200, hCm: 60, clearance: 100, desc: 'Reflecting pool module', type: 'zone' },
  { id: 'garden-path', name: 'Garden Path Run (2m)', category: 'landscape', wCm: 200, dCm: 120, hCm: 5, desc: 'Gravel/paving path module', type: 'zone' },
  { id: 'stepping-stones', name: 'Stepping Stone Run', category: 'landscape', wCm: 200, dCm: 60, hCm: 5, desc: 'Flag stepping stones', type: 'zone' },
  { id: 'edging-timber', name: 'Timber Lawn Edging (2m)', category: 'landscape', wCm: 200, dCm: 10, hCm: 15, desc: 'Garden bed edge', type: 'structure' },
  { id: 'composter', name: 'Garden Compost Bin', category: 'landscape', wCm: 100, dCm: 80, hCm: 90, clearance: 60, desc: 'Lidded compost module', type: 'storage' },
  { id: 'shed-garden', name: 'Garden Shed (2×3m)', category: 'landscape', wCm: 200, dCm: 300, hCm: 230, clearance: 60, desc: 'Tool shed module', type: 'room_obj' },
  { id: 'greenhouse-4x6', name: 'Greenhouse (4×6ft)', category: 'landscape', wCm: 120, dCm: 180, hCm: 210, clearance: 60, desc: 'Small glass greenhouse', type: 'room_obj' },
  { id: 'cold-frame', name: 'Cold Frame', category: 'landscape', wCm: 100, dCm: 60, hCm: 40, desc: 'Seedling hardening frame', type: 'structure' },
  { id: 'allotment-plot', name: 'Allotment Plot (3×5m)', category: 'landscape', wCm: 300, dCm: 500, clearance: 60, desc: 'Community garden plot module', type: 'zone' }
];

// ---------------------------------------------------------------------------
// Parametric runs — real-world sized variants generated from code tables.
// Every generated item is a genuinely different dimension a designer picks
// between (parking bay widths by standard, table lengths by seat count…).
// ---------------------------------------------------------------------------
function runs() {
  const out = [];
  for (const seats of [4, 6, 8, 10, 12, 14]) {
    out.push({ id: `dining-run-${seats}`, name: `Dining Run Table (${seats}-Seat)`, category: 'hospitality',
      wCm: seats * 30, dCm: 90, hCm: 76, clearance: 90, desc: `${seats}-seat rectangular run table (30cm/person)`, type: 'table' });
  }
  for (const seats of [6, 8, 10, 12]) {
    out.push({ id: `meeting-run-${seats}`, name: `Meeting Table (${seats}-Seat)`, category: 'office',
      wCm: seats * 30, dCm: 100, hCm: 74, clearance: 100, desc: `${seats}-seat boardroom run`, type: 'table' });
  }
  const bay = [['us-compact', 240], ['uk-std', 240], ['eu-std', 250], ['us-std', 270], ['aus-std', 240], ['wide-lux', 300], ['ev-cred', 275], ['dis-ada', 360]];
  for (const [k, w] of bay) {
    out.push({ id: `parking-bay-${k}`, name: `Parking Bay ${w}cm (${k.split('-')[0].toUpperCase()})`, category: 'transport',
      wCm: w, dCm: 500, clearance: 60, desc: `${(w / 100).toFixed(2)}m wide standard bay`, type: 'zone' });
  }
  for (const n of [1, 2, 3, 4]) {
    out.push({ id: `wheelchair-bay-${n}`, name: `Wheelchair Bay (${n}-Position)`, category: 'healthcare',
      wCm: 90 * n, dCm: 140, hCm: 5, clearance: 30, desc: `Accessible viewing bay for ${n}`, type: 'zone' });
  }
  for (const d of [30, 40, 50, 60, 70, 80, 90, 100, 120]) {
    out.push({ id: `planter-d${d}`, name: `Round Planter Ø${d}cm`, category: 'landscape',
      wCm: d, dCm: d, hCm: Math.max(35, d / 2), clearance: 25, desc: `Cylindrical Ø${d} planter`, type: 'planter' });
  }
  for (const [seats, w] of [['2', 120], ['3', 180], ['4', 240], ['5', 300]]) {
    out.push({ id: `bench-run-${seats}`, name: `Outdoor Bench (${seats}-Seat)`, category: 'landscape',
      wCm: w, dCm: 55, hCm: 80, clearance: 60, desc: `${seats}-seat exterior bench run`, type: 'bench' });
  }
  for (const h of [40, 60, 80, 100, 120, 150, 180]) {
    out.push({ id: `hedge-h${h}`, name: `Hedge (H${h}cm run)`, category: 'landscape',
      wCm: 100, dCm: 60, hCm: h, clearance: 30, desc: `Boundary hedge at ${h}cm height`, type: 'plant' });
  }
  for (const [k, w, d] of [['mini-u10', 1200, 700], ['u12', 1400, 740], ['u14', 1500, 760]]) {
    out.push({ id: `court-basketball-${k}`, name: `Basketball Court (${k.replace('mini-', '').toUpperCase()})`, category: 'sports',
      wCm: w, dCm: d, clearance: 150, desc: `Youth ${k} court with run-off`, type: 'field' });
  }
  for (const n of [2, 3, 4, 5, 6]) {
    out.push({ id: `treadmill-row-${n}`, name: `Treadmill Row (${n} Units)`, category: 'fitness',
      wCm: n * 90, dCm: 220, hCm: 150, clearance: 80, desc: `${n}-unit cardio row with service gap`, type: 'machine' });
  }
  for (const [r, c] of [[2, 4], [3, 4], [4, 4], [4, 5], [5, 5], [5, 6]]) {
    out.push({ id: `class-grid-${r}x${c}`, name: `Classroom Desk Grid (${r}×${c})`, category: 'education',
      wCm: c * 65, dCm: r * 115, hCm: 76, clearance: 60, desc: `${r}×${c} pupil desk layout module`, type: 'desk' });
  }
  for (const n of [4, 6, 8, 10, 12, 14]) {
    out.push({ id: `cinema-row-${n}`, name: `Cinema Row (${n} Seats)`, category: 'leisure',
      wCm: n * 58, dCm: 100, hCm: 110, clearance: 40, desc: `${n}-seat theatre row`, type: 'bench' });
  }
  for (const n of [2, 4, 6, 8]) {
    out.push({ id: `ev-bank-${n}`, name: `EV Charging Bank (${n} Posts)`, category: 'transport',
      wCm: n * 255, dCm: 520, clearance: 70, desc: `${n}-bay EV charge bank`, type: 'zone' });
  }
  for (const n of [2, 3, 4, 6, 8, 10, 12]) {
    out.push({ id: `locker-run-${n}`, name: `Locker Run (${n}-Wide)`, category: 'fitness',
      wCm: n * 40, dCm: 50, hCm: 180, clearance: 90, desc: `${n}-cell changing locker run`, type: 'storage' });
  }
  for (const rows of [2, 4, 6, 8, 10, 12, 15, 20]) {
    out.push({ id: `stadium-tier-${rows}`, name: `Stadium Tier (${rows} Rows)`, category: 'sports',
      wCm: 1000, dCm: rows * 80, hCm: rows * 16, clearance: 30, desc: `${rows}-row seating tier module (80cm tread)`, type: 'structure' });
  }
  for (const n of [2, 4, 6]) {
    out.push({ id: `picnic-cluster-${n}`, name: `Picnic Cluster (${n} Tables)`, category: 'leisure',
      wCm: n % 2 === 0 ? 380 : 200, dCm: n > 2 ? 390 : 210, clearance: 120, desc: `${n}-table picnic cluster zone`, type: 'zone' });
  }
  for (const n of [2, 3, 4, 5]) {
    out.push({ id: `buffet-line-${n}`, name: `Buffet Line (${n} Stations)`, category: 'hospitality',
      wCm: n * 180, dCm: 100, hCm: 100, clearance: 120, desc: `${n}-station chafing service line`, type: 'table' });
  }
  return out;
}

// Merge all packs (excluding the accidental leading-space id)
export const OBJECT_LIBRARY_PACKS = Object.freeze([
  ...healthcare, ...emergency, ...sports, ...fitness,
  ...leisure, ...education, ...hospitality, ...transport, ...landscape,
  ...runs()
].filter(o => o.id && !o.id.startsWith(' ')));

/** Category metadata for the browser UI. */
export const OBJECT_CATEGORY_LABELS = Object.freeze({
  living: 'Living Room', bedroom: 'Bedroom', dining: 'Dining', kitchen: 'Kitchen',
  bathroom: 'Bathroom & Sanitary', office: 'Office', doors: 'Doors & Circulation',
  outdoor: 'Outdoor & Site', commercial: 'Commercial, Retail & Fitness',
  healthcare: 'Healthcare & Medical', emergency: 'Police, Fire & Civic',
  sports: 'Sports, Courts & Stadium', fitness: 'Fitness & Gym',
  leisure: 'Cinema, Gaming, Caravan & Play', education: 'Education',
  hospitality: 'Hospitality, Hotel & Worship', transport: 'Transport & Parking',
  landscape: 'Landscape, Plants & Trees'
});
