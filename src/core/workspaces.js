/** Primary navigation for the personal architecture companion. */
export const WORKSPACES = [
  {
    "id": "project",
    "number": "01",
    "label": "Project",
    "icon": "research",
    "mission": "Research, site observations, concepts and requirements in one project.",
    "tools": [
      {
        "toolId": "research_dashboard",
        "label": "Research",
        "desc": "Project-linked research snapshot: notes, references, decisions",
        "keywords": [
          "research",
          "dashboard",
          "notes",
          "overview",
          "takeaways",
          "decisions",
          "context"
        ],
        "aliases": [
          "research overview",
          "research home"
        ]
      },
      {
        "toolId": "research_library",
        "label": "References Library",
        "desc": "Precedents, case studies, materials, standards — saved to the project",
        "keywords": [
          "reference",
          "references",
          "precedent",
          "case study",
          "material",
          "typology",
          "library",
          "citation",
          "tags"
        ],
        "aliases": [
          "precedents",
          "case studies",
          "materials research"
        ]
      },
      {
        "toolId": "site_dashboard",
        "label": "Site Analysis",
        "desc": "Project-linked site snapshot with live sun quick-facts",
        "keywords": [
          "site",
          "dashboard",
          "overview",
          "snapshot",
          "context",
          "analysis"
        ],
        "aliases": [
          "site overview",
          "site analysis home"
        ]
      },
      {
        "toolId": "site_context",
        "label": "Site Context Worksheet",
        "desc": "Coordinates, climate, movement, views, opportunities & constraints",
        "keywords": [
          "site",
          "context",
          "worksheet",
          "coordinates",
          "climate",
          "movement",
          "access",
          "views",
          "opportunity",
          "opportunities",
          "constraint",
          "constraints",
          "bearing"
        ],
        "aliases": [
          "site notes",
          "site capture",
          "opportunities and constraints",
          "swot"
        ]
      },
      {
        "toolId": "sun_path",
        "label": "Sun Path & Shadow",
        "desc": "Sunrise, sunset, solar position, and shadow lengths — computed live",
        "keywords": [
          "sun",
          "solar",
          "sun path",
          "sunpath",
          "shadow",
          "shadows",
          "sunrise",
          "sunset",
          "azimuth",
          "altitude",
          "daylight",
          "solar noon"
        ],
        "aliases": [
          "solar analysis",
          "shadow calculator",
          "sun study",
          "solar position"
        ]
      },
      {
        "toolId": "survey",
        "label": "Survey Notebook",
        "desc": "Field measurements with provenance, verification, and image calibration",
        "keywords": [
          "survey",
          "measurement",
          "calibration",
          "provenance",
          "site",
          "field",
          "verify"
        ],
        "aliases": [
          "site measurement",
          "field notes"
        ]
      },
      {
        "toolId": "concept",
        "label": "Concept",
        "desc": "Connect findings and site implications to design drivers and narrative",
        "keywords": [
          "concept",
          "idea",
          "bubble",
          "narrative"
        ]
      },
      {
        "toolId": "requirements",
        "label": "Brief & Requirements",
        "desc": "Project brief, room requirements, adjacency, design intent",
        "keywords": [
          "brief",
          "requirements",
          "adjacency",
          "rooms",
          "program",
          "intent"
        ],
        "aliases": [
          "project brief",
          "program"
        ]
      },
      {
        "toolId": "projects",
        "label": "Projects",
        "desc": "Library, save, duplicates, snapshots",
        "keywords": [
          "project",
          "library",
          "snapshot",
          "save",
          "open",
          "duplicate"
        ],
        "aliases": [
          "project library",
          "open project"
        ]
      }
    ],
    "planned": []
  },
  {
    "id": "tools",
    "number": "02",
    "label": "Design Tools",
    "icon": "dimensions",
    "mission": "Deterministic measurements, furniture and architectural calculators.",
    "tools": [
      {
        "toolId": "converter",
        "label": "Scale Converter",
        "desc": "Paper ⇄ real world at any scale",
        "keywords": [
          "scale",
          "convert",
          "drawing",
          "real",
          "paper",
          "ratio"
        ],
        "shortcut": "workspace 1",
        "aliases": [
          "scaler"
        ]
      },
      {
        "toolId": "dimensions",
        "label": "Dimensions",
        "desc": "Quick, Schedule, Chain and Compare Scales",
        "keywords": [
          "dimension",
          "expression",
          "schedule",
          "chain",
          "compare",
          "quick"
        ],
        "aliases": [
          "measurement schedule",
          "running dimensions"
        ]
      },
      {
        "toolId": "furniture",
        "label": "Object Library",
        "desc": "Editable architectural CAD objects and planning references",
        "keywords": [
          "furniture",
          "clearance",
          "ada",
          "sofa",
          "bed",
          "desk",
          "door"
        ],
        "aliases": [
          "furniture library",
          "object library",
          "clearances"
        ]
      },
      {
        "toolId": "stairs",
        "label": "Stair Calculator",
        "desc": "Risers, goings, Blondel proportion, angle",
        "keywords": [
          "stair",
          "riser",
          "tread",
          "going",
          "blondel",
          "flight"
        ],
        "aliases": [
          "stairs",
          "staircase"
        ]
      },
      {
        "toolId": "ramps",
        "label": "Ramp Calculator",
        "desc": "Accessible ramp geometry and targets",
        "keywords": [
          "ramp",
          "accessibility",
          "1:12",
          "slope"
        ],
        "aliases": [
          "accessible ramp"
        ]
      },
      {
        "toolId": "slopes",
        "label": "Slope Analyzer",
        "desc": "General rise/run grading analysis",
        "keywords": [
          "slope",
          "grade",
          "gradient",
          "drainage",
          "terrain"
        ],
        "aliases": [
          "grading"
        ]
      },
      {
        "toolId": "reference",
        "label": "Reference Chart",
        "desc": "Printable scale ruler, benchmarks, tables",
        "keywords": [
          "reference",
          "ruler",
          "benchmark",
          "print",
          "neufert"
        ],
        "aliases": [
          "scale ruler",
          "reference sheet"
        ]
      },
      {
        "toolId": "standards_explorer",
        "label": "Standards Explorer",
        "desc": "Browse the live building-code engine: 7 jurisdictions with citations",
        "keywords": [
          "standards",
          "codes",
          "regulations",
          "building code",
          "jnbc",
          "sbc",
          "dubai",
          "ibc",
          "ada",
          "compliance",
          "jurisdiction"
        ],
        "aliases": [
          "code explorer",
          "regulations",
          "building codes"
        ]
      },
      {
        "toolId": "rescale",
        "label": "Rescaler",
        "desc": "Move a measurement from one scale to another",
        "keywords": [
          "rescale",
          "sheet",
          "transfer",
          "a to b"
        ],
        "aliases": [
          "sheet transfer"
        ]
      },
      {
        "toolId": "detector",
        "label": "Scale Finder",
        "desc": "Detect an unknown scale from paper + real sizes",
        "keywords": [
          "detect",
          "find",
          "unknown",
          "ratio"
        ],
        "aliases": [
          "scale detector",
          "unknown scale"
        ]
      },
      {
        "toolId": "area_volume",
        "label": "Area & Volume",
        "desc": "Scale areas (S²) and volumes (S³)",
        "keywords": [
          "area",
          "volume",
          "square",
          "cubic",
          "m2",
          "m3"
        ],
        "aliases": [
          "areavol",
          "area scaler"
        ]
      }
    ],
    "planned": []
  },
  {
    "id": "cad",
    "number": "03",
    "label": "CAD Tools",
    "icon": "cad",
    "mission": "Prepare dimensions and assets for AutoCAD, Rhino, SketchUp and GIS workflows.",
    "tools": [
      {
        "toolId": "cad_clipboard",
        "label": "CAD Clipboard",
        "desc": "CAD-ready copy formats for major tools",
        "keywords": [
          "cad",
          "clipboard",
          "autocad",
          "rhino",
          "revit",
          "sketchup"
        ],
        "aliases": [
          "copy cad",
          "paste cad"
        ]
      },
      {
        "toolId": "cad_handoff",
        "label": "CAD Handoff",
        "desc": "Target-specific payloads for Rhino / AutoCAD / SketchUp",
        "keywords": [
          "handoff",
          "send",
          "rhino",
          "autocad",
          "sketchup",
          "paste"
        ],
        "aliases": [
          "send to cad",
          "cad export"
        ]
      },
      {
        "toolId": "batch_cad",
        "label": "Batch CAD",
        "desc": "Bulk conversion for schedules and lists",
        "keywords": [
          "batch",
          "bulk",
          "table",
          "schedule"
        ],
        "aliases": [
          "bulk cad",
          "batch convert"
        ]
      },
      {
        "toolId": "imports",
        "label": "Importer",
        "desc": "CSV/TSV, DXF, SVG ingestion with review",
        "keywords": [
          "import",
          "csv",
          "tsv",
          "dxf",
          "svg",
          "ingest"
        ],
        "aliases": [
          "import file",
          "import schedule"
        ]
      }
    ],
    "planned": []
  },
  {
    "id": "documents",
    "number": "04",
    "label": "Documents",
    "icon": "project",
    "mission": "Compose research reports, case studies and architecture boards.",
    "tools": [
      {
        "toolId": "reports",
        "label": "Reports & Boards",
        "desc": "Compose, preview and export architecture documents",
        "keywords": [
          "pdf",
          "document",
          "report",
          "board",
          "case study"
        ]
      },
      {
        "toolId": "export",
        "label": "Export Center",
        "desc": "JSON, DXF, SVG, CSV, TSV, TXT with preview",
        "keywords": [
          "export",
          "download",
          "json",
          "dxf",
          "svg",
          "csv",
          "backup"
        ],
        "aliases": [
          "download",
          "export file"
        ]
      }
    ],
    "planned": []
  },
  {
    "id": "ai",
    "number": "05",
    "label": "AI Assistant",
    "icon": "ai",
    "mission": "Ask naturally for ideas, critique, project analysis or image interpretation.",
    "tools": [
      {
        "toolId": "ai",
        "label": "Assistant",
        "desc": "One job, one question, one validated answer",
        "keywords": [
          "ai",
          "studio",
          "critique",
          "tutor",
          "jury",
          "vision",
          "brutal"
        ],
        "aliases": [
          "ask ai",
          "copilot"
        ]
      }
    ],
    "planned": []
  },
  {
    "id": "settings",
    "number": "06",
    "label": "Settings",
    "icon": "architecture",
    "mission": "Choose an AI provider and models; refine advanced routing when needed.",
    "tools": [
      {
        "toolId": "ai_settings",
        "label": "AI Providers",
        "desc": "Providers, keys, model catalog, assignments",
        "keywords": [
          "ai",
          "provider",
          "api key",
          "gemini",
          "glm",
          "deepseek",
          "model"
        ],
        "aliases": [
          "ai settings",
          "ai providers"
        ]
      }
    ],
    "planned": []
  }
];
export const WORKSPACE_ORDER = WORKSPACES.map(w => w.id);
export const WORKFLOW_STEPS = WORKSPACES.map(w => ({id:w.id,label:w.label}));
export const NAV_TOOLS = (() => {
  const map = new Map();
  for (const ws of WORKSPACES) {
    for (const tool of ws.tools) {
      if (map.has(tool.toolId)) {
        throw new Error(`Tool "${tool.toolId}" is registered in more than one workspace`);
      }
      map.set(tool.toolId, { ...tool, workspace: ws.id, workspaceLabel: ws.label });
    }
  }
  return map;
})();

/** All tool entries as an array (registry order). */
export const NAV_TOOL_LIST = Array.from(NAV_TOOLS.values());

/** toolId → workspace entry. */
export function workspaceOfTool(toolId) {
  const tool = NAV_TOOLS.get(toolId);
  if (!tool) return null;
  return WORKSPACES.find(w => w.id === tool.workspace) || null;
}

/** Workspace id → entry (or null). */
export function getWorkspace(id) {
  return WORKSPACES.find(w => w.id === id) || null;
}

/** Every tool id that has a live view (excludes home). */
export const ALL_TOOL_IDS = NAV_TOOL_LIST.map(t => t.toolId);

/**
 * Search hook: tokens match a tool's label, keywords, aliases, or workspace
 * label. Used by the command-palette bridge so "stairs" and "hospital" style
 * queries resolve through metadata, not hardcoded logic.
 */
export function searchTools(tokens) {
  if (!tokens || tokens.length === 0) return NAV_TOOL_LIST;
  const lower = tokens.map(t => String(t).toLowerCase());
  return NAV_TOOL_LIST.filter(tool => {
    const hay = [
      tool.label, tool.desc || '', tool.workspaceLabel,
      ...(tool.keywords || []), ...(tool.aliases || [])
    ].join(' ').toLowerCase();
    return lower.every(t => hay.includes(t));
  });
}

/**
 * Search the PLANNED tool lists too. Used by the landing pages so a search
 * for "sun path" honestly says "planned, Phase G" instead of nothing.
 */
export function searchPlannedTools(query) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return [];
  const tokens = q.split(/\s+/).filter(Boolean);
  const hits = [];
  for (const ws of WORKSPACES) {
    for (const p of ws.planned || []) {
      const hay = `${p.label} ${ws.label}`.toLowerCase();
      if (tokens.every(t => hay.includes(t))) hits.push({ ...p, workspace: ws.id, workspaceLabel: ws.label });
    }
  }
  return hits;
}

/** Workflow position helpers — previous/next workspace for landing guidance. */
export function workflowNeighbors(workspaceId) {
  const idx = WORKSPACE_ORDER.indexOf(workspaceId);
  if (idx === -1) return { prev: null, next: null };
  return {
    prev: idx > 0 ? WORKSPACES[idx - 1] : null,
    next: idx < WORKSPACES.length - 1 ? WORKSPACES[idx + 1] : null
  };
}

/**
 * Landing-page quick actions per workspace. Only REAL actions are listed —
 * entries whose handler is added in a later phase stay in `planned` instead.
 * `action` receives the same switchMode the app uses.
 */
export const WORKSPACE_ACTIONS = Object.fromEntries(WORKSPACES.map(ws => [ws.id, ws.tools.slice(0,3).map(t => ({id:`action-${t.toolId}`,label:`Open ${t.label}`,handler:t.toolId}))]));
