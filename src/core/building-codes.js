/**
 * Architecture Helping Hand - Building Codes & Standards Engine
 * Pure, deterministic building code compliance evaluator.
 *
 * Supports comprehensive Middle Eastern / Arabic national building codes:
 *  - Jordanian National Building Code (كودات البناء الوطني الأردني - كود 22 وكود 11)
 *  - Saudi Building Code (كود البناء السعودي - SBC 201 & SBC 1001)
 *  - Dubai Building Code (كود دبي للبناء - DBC 2021 & UAE Life Safety Code)
 *  - Egyptian Building Code (الكود المصري للبناء - قانون 119 وكود المعاقين)
 *  - Gulf Unified Building Code (كود البناء الخليجي الموحد - GBC)
 * Alongside international standards:
 *  - IBC & ADA Standards (US / International)
 *  - UK Building Regulations (Approved Documents K & M)
 */

export const BUILDING_CODES = Object.freeze({
  jnbc: Object.freeze({
    id: 'jnbc',
    flag: '🇯🇴',
    name: 'Jordanian National Building Code (كودات البناء الوطني الأردني)',
    shortName: 'Jordan JNBC (الأردن)',
    jurisdiction: 'Jordan (المملكة الأردنية الهاشمية)',
    citation: 'كود متطلبات المعوقين رقم 22 وكود الأمان من الحريق رقم 11',
    stair: Object.freeze({
      riserMinMm: 130,
      riserMaxMm: 175,
      riserOptimalMm: 160,
      treadMinMm: 280,
      treadResidentialMinMm: 260,
      blondelMinMm: 600,
      blondelMaxMm: 640,
      maxFlightRisers: 16,
      headroomMinMm: 2050,
      citation: 'كود رقم 22 بند 4-3 وكود 11 جدول 5-2'
    }),
    ramp: Object.freeze({
      maxSlopePercent: 8.33, // 1:12
      maxSlopeRatio: 12,
      preferredSlopePercent: 6.25, // 1:16
      preferredSlopeRatio: 16,
      maxRunRiseMeters: 0.75, // 750 mm before mandatory landing
      maxRunLengthMeters: 9.0, // 9.0 m max continuous run
      minLandingLengthMm: 1500,
      minLandingWidthMm: 1200,
      handrailRequiredRiseMm: 150,
      citation: 'كود متطلبات المعوقين رقم 22 بند 4-2'
    }),
    slope: Object.freeze({
      maxPedestrianWalkPercent: 5.0, // 1:20
      maxCrossSlopePercent: 2.0, // 1:50
      citation: 'كود 22 مسارات المشاة والأرصفة'
    })
  }),

  sbc: Object.freeze({
    id: 'sbc',
    flag: '🇸🇦',
    name: 'Saudi Building Code (كود البناء السعودي SBC 201/1001)',
    shortName: 'Saudi SBC (السعودية)',
    jurisdiction: 'Saudi Arabia (المملكة العربية السعودية)',
    citation: 'SBC 201 Section 1011 & SBC 1001 Section 405',
    stair: Object.freeze({
      riserMinMm: 100,
      riserMaxMm: 180,
      riserOptimalMm: 165,
      treadMinMm: 280,
      treadResidentialMinMm: 250,
      blondelMinMm: 600,
      blondelMaxMm: 640,
      maxFlightRisers: 18,
      headroomMinMm: 2050,
      citation: 'SBC 201 Sec 1011.5.2 & Sec 1011.3'
    }),
    ramp: Object.freeze({
      maxSlopePercent: 8.33, // 1:12
      maxSlopeRatio: 12,
      preferredSlopePercent: 6.25, // 1:16
      preferredSlopeRatio: 16,
      maxRunRiseMeters: 0.76, // 760 mm (30")
      maxRunLengthMeters: 9.14, // 30 ft
      minLandingLengthMm: 1500,
      minLandingWidthMm: 1000,
      handrailRequiredRiseMm: 150,
      citation: 'SBC 1001 Sec 405.2 & Sec 405.6'
    }),
    slope: Object.freeze({
      maxPedestrianWalkPercent: 5.0,
      maxCrossSlopePercent: 2.08, // 1:48
      citation: 'SBC 1001 Sec 403 Accessible Routes'
    })
  }),

  dbc: Object.freeze({
    id: 'dbc',
    flag: '🇦🇪',
    name: 'Dubai Building Code (كود دبي للبناء DBC 2021)',
    shortName: 'Dubai DBC (دبي/الإمارات)',
    jurisdiction: 'Dubai & UAE (دولة الإمارات العربية المتحدة)',
    citation: 'DBC 2021 Part B (Accessibility) & UAE Life Safety Ch. 4',
    stair: Object.freeze({
      riserMinMm: 150,
      riserMaxMm: 180,
      riserOptimalMm: 165,
      treadMinMm: 280,
      treadResidentialMinMm: 250,
      blondelMinMm: 600,
      blondelMaxMm: 640,
      maxFlightRisers: 18,
      headroomMinMm: 2100,
      citation: 'DBC 2021 Section B.4.3 & UAE Fire Code Table 4.1'
    }),
    ramp: Object.freeze({
      maxSlopePercent: 8.33, // 1:12
      maxSlopeRatio: 12,
      preferredSlopePercent: 5.0, // 1:20 optimal for People of Determination
      preferredSlopeRatio: 20,
      maxRunRiseMeters: 0.75, // 750 mm
      maxRunLengthMeters: 6.0, // 6.0 m preferred before landing
      minLandingLengthMm: 1800, // 1800 mm turning circle preferred
      minLandingWidthMm: 1200,
      handrailRequiredRiseMm: 150,
      citation: 'DBC 2021 Section B.4.2 (People of Determination)'
    }),
    slope: Object.freeze({
      maxPedestrianWalkPercent: 5.0,
      maxCrossSlopePercent: 2.0,
      citation: 'DBC 2021 Part B External Walkways'
    })
  }),

  ebc: Object.freeze({
    id: 'ebc',
    flag: '🇪🇬',
    name: 'Egyptian Building Code (الكود المصري للبناء قانون 119)',
    shortName: 'Egypt EBC (مصر)',
    jurisdiction: 'Egypt (جمهورية مصر العربية)',
    citation: 'اللائحة التنفيذية لقانون 119 وكود تصميم الفراغات لإتاحة المعاقين',
    stair: Object.freeze({
      riserMinMm: 150,
      riserMaxMm: 175,
      riserOptimalMm: 160,
      treadMinMm: 270,
      treadResidentialMinMm: 270,
      blondelMinMm: 600,
      blondelMaxMm: 640,
      maxFlightRisers: 14,
      headroomMinMm: 2100,
      citation: 'اللائحة التنفيذية لقانون 119 مادة 101'
    }),
    ramp: Object.freeze({
      maxSlopePercent: 8.33, // 1:12
      maxSlopeRatio: 12,
      preferredSlopePercent: 6.25, // 1:16
      preferredSlopeRatio: 16,
      maxRunRiseMeters: 0.75,
      maxRunLengthMeters: 6.0,
      minLandingLengthMm: 1500,
      minLandingWidthMm: 1200,
      handrailRequiredRiseMm: 150,
      citation: 'كود إتاحة المعاقين المصري باب 3'
    }),
    slope: Object.freeze({
      maxPedestrianWalkPercent: 5.0,
      maxCrossSlopePercent: 2.0,
      citation: 'كود المعاقين الأرصفة الخارجية'
    })
  }),

  gbc: Object.freeze({
    id: 'gbc',
    flag: '🌐',
    name: 'Gulf Unified Building Code (كود البناء الخليجي الموحد GBC)',
    shortName: 'Gulf GBC (الخليج)',
    jurisdiction: 'GCC Countries (دول مجلس التعاون الخليجي)',
    citation: 'كود البناء الخليجي الموحد - متطلبات المعمار والوصول الشامل',
    stair: Object.freeze({
      riserMinMm: 130,
      riserMaxMm: 180,
      riserOptimalMm: 165,
      treadMinMm: 280,
      treadResidentialMinMm: 250,
      blondelMinMm: 600,
      blondelMaxMm: 640,
      maxFlightRisers: 18,
      headroomMinMm: 2050,
      citation: 'كود البناء الخليجي المعماري فصل 10'
    }),
    ramp: Object.freeze({
      maxSlopePercent: 8.33,
      maxSlopeRatio: 12,
      preferredSlopePercent: 6.25,
      preferredSlopeRatio: 16,
      maxRunRiseMeters: 0.76,
      maxRunLengthMeters: 9.0,
      minLandingLengthMm: 1500,
      minLandingWidthMm: 1000,
      handrailRequiredRiseMm: 150,
      citation: 'كود البناء الخليجي - إمكانية الوصول'
    }),
    slope: Object.freeze({
      maxPedestrianWalkPercent: 5.0,
      maxCrossSlopePercent: 2.0,
      citation: 'كود البناء الخليجي - مسارات المشاة'
    })
  }),

  ibc_ada: Object.freeze({
    id: 'ibc_ada',
    flag: '🇺🇸',
    name: 'International & US ADA Standards (IBC / ADA)',
    shortName: 'IBC / ADA (International)',
    jurisdiction: 'International / United States',
    citation: 'IBC 2021 Section 1011 & 2010 ADA Standards Section 405',
    stair: Object.freeze({
      riserMinMm: 100, // 4"
      riserMaxMm: 178, // 7"
      riserOptimalMm: 165,
      treadMinMm: 280, // 11"
      treadResidentialMinMm: 254, // 10"
      blondelMinMm: 600,
      blondelMaxMm: 660,
      maxFlightRisers: 18,
      headroomMinMm: 2032, // 80"
      citation: 'IBC 2021 Sec 1011.5.2 & ADA 504.2'
    }),
    ramp: Object.freeze({
      maxSlopePercent: 8.33, // 1:12
      maxSlopeRatio: 12,
      preferredSlopePercent: 6.25, // 1:16
      preferredSlopeRatio: 16,
      maxRunRiseMeters: 0.76, // 30"
      maxRunLengthMeters: 9.14, // 30 ft
      minLandingLengthMm: 1524, // 60"
      minLandingWidthMm: 914, // 36"
      handrailRequiredRiseMm: 152, // 6"
      citation: '2010 ADA Standards Sec 405.2 & Sec 405.6'
    }),
    slope: Object.freeze({
      maxPedestrianWalkPercent: 5.0, // 1:20
      maxCrossSlopePercent: 2.08, // 1:48
      citation: 'ADA Sec 403.3 & 403.4'
    })
  }),

  uk_reg: Object.freeze({
    id: 'uk_reg',
    flag: '🇬🇧',
    name: 'UK Building Regs (Approved Documents K & M)',
    shortName: 'UK Part K/M (UK)',
    jurisdiction: 'United Kingdom (England & Wales)',
    citation: 'Approved Document K (Stairs) & Approved Document M (Access)',
    stair: Object.freeze({
      riserMinMm: 150,
      riserMaxMm: 170, // General access (utility/private up to 220 mm)
      riserOptimalMm: 160,
      treadMinMm: 250, // General access min 250 mm
      treadResidentialMinMm: 220,
      blondelMinMm: 550,
      blondelMaxMm: 700,
      maxFlightRisers: 16,
      headroomMinMm: 2000,
      citation: 'Approved Document K Table 1.1'
    }),
    ramp: Object.freeze({
      maxSlopePercent: 8.33, // 1:12 only for rise <= 333 mm; 1:15 for rise <= 500 mm
      maxSlopeRatio: 12,
      preferredSlopePercent: 5.0, // 1:20
      preferredSlopeRatio: 20,
      maxRunRiseMeters: 0.50, // 500 mm max rise per flight
      maxRunLengthMeters: 10.0,
      minLandingLengthMm: 1500,
      minLandingWidthMm: 1200,
      handrailRequiredRiseMm: 300,
      citation: 'Approved Document M Section 1.26'
    }),
    slope: Object.freeze({
      maxPedestrianWalkPercent: 5.0,
      maxCrossSlopePercent: 2.0,
      citation: 'Approved Document M External Approaches'
    })
  })
});

/** Default fallback code key */
export const DEFAULT_BUILDING_CODE_ID = 'jnbc';

/**
 * Retrieve a building code profile by ID. Falls back to default if invalid.
 * @param {string} codeId
 * @returns {object}
 */
export function getBuildingCode(codeId) {
  if (codeId && BUILDING_CODES[codeId]) {
    return BUILDING_CODES[codeId];
  }
  return BUILDING_CODES[DEFAULT_BUILDING_CODE_ID];
}

/**
 * List all available building codes.
 * @returns {Array<object>}
 */
export function listBuildingCodes() {
  return Object.values(BUILDING_CODES);
}

/**
 * Inspect a calculated stair result against a specific building code.
 *
 * @param {object} stairResult - Output model from calculateStair()
 * @param {string} codeId - Identifier of building code (e.g. 'jnbc', 'sbc')
 * @param {string} [buildingType='public'] - 'public' | 'residential'
 * @returns {object} Detailed compliance scorecard
 */
export function inspectStairCompliance(stairResult, codeId = 'jnbc', buildingType = 'public') {
  const code = getBuildingCode(codeId);
  const cfg = code.stair;

  if (!stairResult || !stairResult.geometry) {
    return {
      code,
      overallStatus: 'warn',
      summaryText: 'No stair geometry available to inspect.',
      summaryArabic: 'لا تتوفر بيانات هندسية للفحص.',
      checks: []
    };
  }

  const geom = stairResult.geometry;
  const riserMm = Math.round(geom.riserHeightMeters * 1000 * 10) / 10;
  const treadMm = Math.round(geom.treadDepthMeters * 1000 * 10) / 10;
  const blondelMm = Math.round(geom.blondelMeters * 1000 * 10) / 10;
  const riserCount = stairResult.risers?.count || 0;

  const minTreadAllowed = buildingType === 'residential' ? cfg.treadResidentialMinMm : cfg.treadMinMm;

  const checks = [];

  // 1. Riser Height Check
  let riserStatus = 'pass';
  let riserMessage = `Within standard range (${cfg.riserMinMm}–${cfg.riserMaxMm} mm)`;
  let riserArabic = `ضمن النطاق المعتمد (${cfg.riserMinMm}–${cfg.riserMaxMm} مم)`;
  if (riserMm > cfg.riserMaxMm) {
    riserStatus = 'fail';
    riserMessage = `Exceeds maximum allowable riser of ${cfg.riserMaxMm} mm`;
    riserArabic = `يتجاوز الحد الأقصى المسموح لارتفاع القائمة (${cfg.riserMaxMm} مم)`;
  } else if (riserMm < cfg.riserMinMm) {
    riserStatus = 'fail';
    riserMessage = `Below minimum allowable riser of ${cfg.riserMinMm} mm`;
    riserArabic = `أقل من الحد الأدنى المسموح لارتفاع القائمة (${cfg.riserMinMm} مم)`;
  }
  checks.push({
    key: 'riser',
    label: 'Riser Height (القائمة)',
    value: `${riserMm} mm`,
    rule: `${cfg.riserMinMm}–${cfg.riserMaxMm} mm`,
    status: riserStatus,
    note: riserMessage,
    noteArabic: riserArabic,
    citation: cfg.citation
  });

  // 2. Tread Depth / Going Check
  let treadStatus = 'pass';
  let treadMessage = `Meets minimum tread requirement (≥ ${minTreadAllowed} mm)`;
  let treadArabic = `يحقق الحد الأدنى لعمق النائمة (≥ ${minTreadAllowed} مم)`;
  if (treadMm < minTreadAllowed) {
    treadStatus = 'fail';
    treadMessage = `Less than minimum mandated tread of ${minTreadAllowed} mm`;
    treadArabic = `أقل من الحد الأدنى القانوني لعمق النائمة (${minTreadAllowed} مم)`;
  }
  checks.push({
    key: 'tread',
    label: 'Tread Depth / Going (النائمة)',
    value: `${treadMm} mm`,
    rule: `≥ ${minTreadAllowed} mm`,
    status: treadStatus,
    note: treadMessage,
    noteArabic: treadArabic,
    citation: cfg.citation
  });

  // 3. Ergonomic Stride (Blondel 2R + T) Check
  let blondelStatus = 'pass';
  let blondelMessage = `Optimal walking stride (${cfg.blondelMinMm}–${cfg.blondelMaxMm} mm)`;
  let blondelArabic = `خطوة سير مريحة ومتزنة (${cfg.blondelMinMm}–${cfg.blondelMaxMm} مم)`;
  if (blondelMm < cfg.blondelMinMm) {
    blondelStatus = 'warn';
    blondelMessage = `Stride is tighter than standard recommendation (${blondelMm} < ${cfg.blondelMinMm} mm)`;
    blondelArabic = `الخطوة ضيقة أو سريعة (${blondelMm} < ${cfg.blondelMinMm} مم)`;
  } else if (blondelMm > cfg.blondelMaxMm) {
    blondelStatus = 'warn';
    blondelMessage = `Stride is elongated or steep (${blondelMm} > ${cfg.blondelMaxMm} mm)`;
    blondelArabic = `الخطوة مجهدة أو واسعة (${blondelMm} > ${cfg.blondelMaxMm} مم)`;
  }
  checks.push({
    key: 'blondel',
    label: 'Ergonomic Stride (2R + T) (معادلة بلونديل)',
    value: `${blondelMm} mm`,
    rule: `${cfg.blondelMinMm}–${cfg.blondelMaxMm} mm`,
    status: blondelStatus,
    note: blondelMessage,
    noteArabic: blondelArabic,
    citation: 'Blondel / Universal Human Stride Standard'
  });

  // 4. Flight Length & Intermediate Landing Check
  let flightStatus = 'pass';
  let flightMessage = `Flight within maximum single run limit (≤ ${cfg.maxFlightRisers} risers)`;
  let flightArabic = `القلبة ضمن الحد الأقصى بدون استراحة (≤ ${cfg.maxFlightRisers} قائمة)`;
  if (riserCount > cfg.maxFlightRisers) {
    flightStatus = 'warn';
    flightMessage = `Mandatory landing required: exceeds ${cfg.maxFlightRisers} continuous risers`;
    flightArabic = `يتطلب استراحة وسطية إلزامية: تجاوز ${cfg.maxFlightRisers} قائمة متتالية`;
  }
  checks.push({
    key: 'flightCount',
    label: 'Continuous Flight Risers (عدد قوائم القلبة)',
    value: `${riserCount} Risers`,
    rule: `≤ ${cfg.maxFlightRisers} risers before landing`,
    status: flightStatus,
    note: flightMessage,
    noteArabic: flightArabic,
    citation: cfg.citation
  });

  // Determine Overall Status
  let overallStatus = 'pass';
  if (checks.some(c => c.status === 'fail')) {
    overallStatus = 'fail';
  } else if (checks.some(c => c.status === 'warn')) {
    overallStatus = 'warn';
  }

  let summaryText = '';
  let summaryArabic = '';
  if (overallStatus === 'pass') {
    summaryText = `Full Compliance with ${code.name}`;
    summaryArabic = `مطابق بالكامل لمتطلبات ${code.name}`;
  } else if (overallStatus === 'warn') {
    summaryText = `Conditional / Advisory Notice under ${code.shortName}`;
    summaryArabic = `مقبول مشروط / تنبيه بموجب ${code.shortName}`;
  } else {
    summaryText = `Non-Compliant / Violation under ${code.shortName}`;
    summaryArabic = `مخالف لمتطلبات ${code.shortName}`;
  }

  return {
    code,
    overallStatus,
    summaryText,
    summaryArabic,
    checks
  };
}

/**
 * Inspect a calculated ramp result against a specific building code.
 *
 * @param {object} rampResult - Output model from calculateRamp()
 * @param {string} codeId - Identifier of building code (e.g. 'jnbc', 'sbc')
 * @returns {object} Detailed compliance scorecard
 */
export function inspectRampCompliance(rampResult, codeId = 'jnbc') {
  const code = getBuildingCode(codeId);
  const cfg = code.ramp;

  if (!rampResult || !rampResult.geometry) {
    return {
      code,
      overallStatus: 'warn',
      summaryText: 'No ramp geometry available to inspect.',
      summaryArabic: 'لا تتوفر بيانات هندسية للفحص.',
      checks: []
    };
  }

  const geom = rampResult.geometry;
  const slopePercent = Math.round(geom.slopePercent * 100) / 100;
  const ratioVal = Math.round(geom.ratio * 10) / 10;
  const riseMeters = geom.riseMeters;
  const runMeters = geom.runMeters;

  const checks = [];

  // 1. Ramp Slope / Incline Check
  let slopeStatus = 'pass';
  let slopeMessage = `Compliant accessible slope (≤ ${cfg.maxSlopePercent}% / 1:${cfg.maxSlopeRatio})`;
  let slopeArabic = `ميل مطابق ومقبول لإمكانية الوصول (≤ ${cfg.maxSlopePercent}% / 1:${cfg.maxSlopeRatio})`;
  if (slopePercent > cfg.maxSlopePercent + 0.05) {
    slopeStatus = 'fail';
    slopeMessage = `Steeper than legal maximum of ${cfg.maxSlopePercent}% (1:${cfg.maxSlopeRatio})`;
    slopeArabic = `أشد انحداراً من الحد القانوني الأقصى ${cfg.maxSlopePercent}% (1:${cfg.maxSlopeRatio})`;
  } else if (slopePercent <= cfg.preferredSlopePercent) {
    slopeStatus = 'pass';
    slopeMessage = `Optimal comfort slope for Universal Design / Wheelchair use (≤ ${cfg.preferredSlopePercent}%)`;
    slopeArabic = `ميل مثالي ومريح للغاية لحركة الكراسي المتحركة والوصول الشامل (≤ ${cfg.preferredSlopePercent}%)`;
  }
  checks.push({
    key: 'slope',
    label: 'Ramp Gradient / Slope (انحدار المنحدر)',
    value: `${slopePercent}% (1 : ${ratioVal})`,
    rule: `Max ${cfg.maxSlopePercent}% (1:${cfg.maxSlopeRatio}) · Ideal ≤ ${cfg.preferredSlopePercent}%`,
    status: slopeStatus,
    note: slopeMessage,
    noteArabic: slopeArabic,
    citation: cfg.citation
  });

  // 2. Single Run Rise Limit Check (Intermediate Landing Mandate)
  let riseStatus = 'pass';
  let riseMessage = `Rise within maximum single flight threshold (≤ ${cfg.maxRunRiseMeters * 1000} mm)`;
  let riseArabic = `الارتفاع ضمن الحد الأقصى للقلبة الواحدة (≤ ${cfg.maxRunRiseMeters * 1000} مم)`;
  let landingsNeeded = 0;
  if (riseMeters > cfg.maxRunRiseMeters) {
    riseStatus = 'warn';
    landingsNeeded = Math.ceil(riseMeters / cfg.maxRunRiseMeters) - 1;
    riseMessage = `Exceeds single run rise limit (${cfg.maxRunRiseMeters * 1000} mm). Requires ${landingsNeeded} intermediate landing(s).`;
    riseArabic = `يتجاوز أقصى ارتفاع للقلبة الواحدة (${cfg.maxRunRiseMeters * 1000} مم). يلزم توفير ${landingsNeeded} استراحة وسطية.`;
  }
  checks.push({
    key: 'riseLimit',
    label: 'Single Run Max Rise (أقصى ارتفاع للقلبة بدون استراحة)',
    value: `${Math.round(riseMeters * 1000)} mm`,
    rule: `≤ ${cfg.maxRunRiseMeters * 1000} mm before landing`,
    status: riseStatus,
    note: riseMessage,
    noteArabic: riseArabic,
    citation: cfg.citation
  });

  // 3. Continuous Run Length Check
  let runStatus = 'pass';
  let runMessage = `Run length within single flight limit (≤ ${cfg.maxRunLengthMeters} m)`;
  let runArabic = `طول الجريان ضمن الحد المسموح للقلبة (≤ ${cfg.maxRunLengthMeters} م)`;
  if (runMeters > cfg.maxRunLengthMeters) {
    runStatus = 'warn';
    runMessage = `Continuous run exceeds ${cfg.maxRunLengthMeters} m. Intermediate rest platform recommended.`;
    runArabic = `طول المنحدر يتجاوز ${cfg.maxRunLengthMeters} م. يوصى بفاصل استراحة لتقليل إجهاد المستخدم.`;
  }
  checks.push({
    key: 'runLength',
    label: 'Continuous Run Length (طول المنحدر المستمر)',
    value: `${runMeters.toFixed(2)} m`,
    rule: `≤ ${cfg.maxRunLengthMeters} m`,
    status: runStatus,
    note: runMessage,
    noteArabic: runArabic,
    citation: cfg.citation
  });

  // 4. Landing Size Requirement
  checks.push({
    key: 'landingSpecs',
    label: 'Mandatory Landing Dimensions (أبعاد الاستراحة المطلوبة)',
    value: `≥ ${cfg.minLandingLengthMm} × ${cfg.minLandingWidthMm} mm`,
    rule: `Min length ${cfg.minLandingLengthMm} mm (${code.id === 'dbc' ? '1800 mm turn' : '1500 mm turn'})`,
    status: 'pass',
    note: `Landings must be level (slope ≤ 2%) and unobstructed.`,
    noteArabic: `يجب أن تكون الاستراحة مستوية (الميل ≤ 2%) وخالية من أي عوائق.`,
    citation: cfg.citation
  });

  // 5. Handrail Mandate
  const handrailRequired = (riseMeters * 1000 >= cfg.handrailRequiredRiseMm) || (runMeters >= 1.8);
  checks.push({
    key: 'handrails',
    label: 'Continuous Handrails (الدرابزين المزدوج)',
    value: handrailRequired ? 'Mandatory (إلزامي على الجانبين)' : 'Recommended (مستحسن)',
    rule: `Required when rise ≥ ${cfg.handrailRequiredRiseMm} mm or run ≥ 1.8 m`,
    status: 'pass',
    note: `Continuous handrails on both sides at height 865–965 mm with 300 mm extensions.`,
    noteArabic: `درابزين مستمر على الجانبين بارتفاع 865–965 مم مع امتداد أفقي 300 مم.`,
    citation: cfg.citation
  });

  // Determine Overall Status
  let overallStatus = 'pass';
  if (checks.some(c => c.status === 'fail')) {
    overallStatus = 'fail';
  } else if (checks.some(c => c.status === 'warn')) {
    overallStatus = 'warn';
  }

  let summaryText = '';
  let summaryArabic = '';
  if (overallStatus === 'pass') {
    summaryText = `Full Compliance with ${code.name}`;
    summaryArabic = `مطابق بالكامل لمتطلبات ${code.name}`;
  } else if (overallStatus === 'warn') {
    summaryText = `Requires Landings / Advisory under ${code.shortName}`;
    summaryArabic = `يتطلب استراحة / تنبيه إشغالي بموجب ${code.shortName}`;
  } else {
    summaryText = `Non-Compliant / Gradient Violation under ${code.shortName}`;
    summaryArabic = `مخالف لمتطلبات الانحدار في ${code.shortName}`;
  }

  return {
    code,
    overallStatus,
    summaryText,
    summaryArabic,
    landingsNeeded,
    checks
  };
}

/**
 * Inspect general slope against pedestrian & vehicle classification under a building code.
 *
 * @param {object} slopeResult - Output model from calculateSlope()
 * @param {string} codeId - Identifier of building code
 * @returns {object} Scorecard
 */
export function inspectSlopeCompliance(slopeResult, codeId = 'jnbc') {
  const code = getBuildingCode(codeId);
  const cfg = code.slope;

  if (!slopeResult || !slopeResult.geometry) {
    return {
      code,
      overallStatus: 'warn',
      summaryText: 'No slope geometry available.',
      summaryArabic: 'لا تتوفر بيانات ميل للفحص.',
      checks: []
    };
  }

  const percent = slopeResult.geometry.percent;
  const checks = [];

  // Pedestrian Walkway Check
  let pedStatus = 'pass';
  let pedMsg = `Within standard accessible sidewalk/walkway limit (≤ ${cfg.maxPedestrianWalkPercent}%)`;
  let pedAr = `ضمن الحد المسموح للأرصفة ومسارات المشاة الميسرة (≤ ${cfg.maxPedestrianWalkPercent}%)`;
  if (percent > cfg.maxPedestrianWalkPercent) {
    pedStatus = 'warn';
    pedMsg = `Exceeds ${cfg.maxPedestrianWalkPercent}%: Must be classified and treated as an accessible ramp (requires handrails & landings)`;
    pedAr = `يتجاوز ${cfg.maxPedestrianWalkPercent}%: يصنف معمارياً كمنحدر ويلزمه اشتراطات المنحدرات والدرابزين`;
  }

  checks.push({
    key: 'pedestrian',
    label: 'Pedestrian Walkway Limit (مسار المشاة العادي)',
    value: `${percent.toFixed(2)}%`,
    rule: `≤ ${cfg.maxPedestrianWalkPercent}% (1:20)`,
    status: pedStatus,
    note: pedMsg,
    noteArabic: pedAr,
    citation: cfg.citation
  });

  // Cross-slope check
  checks.push({
    key: 'crossSlope',
    label: 'Sidewalk Drainage Cross-Slope (الميل العرضي لتصريف الأمطار)',
    value: 'Standard Target',
    rule: `Max ${cfg.maxCrossSlopePercent}%`,
    status: 'pass',
    note: `Maximum perpendicular cross-slope to prevent wheelchair tilt.`,
    noteArabic: `أقصى ميل عرضي لمنع انحراف الكراسي المتحركة وتصريف مياه الأمطار.`,
    citation: cfg.citation
  });

  const overallStatus = pedStatus === 'pass' ? 'pass' : 'warn';

  return {
    code,
    overallStatus,
    summaryText: overallStatus === 'pass' ? `Compliant Accessible Walkway under ${code.shortName}` : `Treated as Ramp under ${code.shortName}`,
    summaryArabic: overallStatus === 'pass' ? `مسار مشاة مطابق بموجب ${code.shortName}` : `يصنف كمنحدر بموجب ${code.shortName}`,
    checks
  };
}
