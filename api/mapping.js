const SMARTSHEET_BASE_URL = "https://api.smartsheet.com/2.0";

const SHEETS = {
  project: "640707923496836",
  trade: "1204207632732036",
  cp: "2604809352859524",
  contractor: "7394677140443012",
  osm: "2325945716264836",
  department: "2888436108185476"
};

// Static because this was hardcoded in your original webpage
const design = {
  "Conceptual Design": { code: "CD", series: 1000 },
  "Schematic Design": { code: "SD", series: 2000 },
  "Design Development Plan": { code: "DDP", series: 3000 },
  "Building Permit Plans": { code: "BPP", series: 4000 },
  "Bid Plans": { code: "BP", series: 5000 },
  "For Construction Drawing": { code: "FCD", series: 6000 }
};

// Static because this was also hardcoded in your original webpage
const query = {
  "Construction": "Construction",
  "Design": "Design"
};

async function fetchSheet(sheetId) {
  const response = await fetch(`${SMARTSHEET_BASE_URL}/sheets/${sheetId}`, {
    headers: {
      Authorization: `Bearer ${process.env.SMARTSHEET_ACCESS_TOKEN}`,
      "Content-Type": "application/json"
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Smartsheet error for sheet ${sheetId}: ${errorText}`);
  }

  return response.json();
}

function sheetToMapping(sheet) {
  const columns = {};
  sheet.columns.forEach(col => {
    columns[col.id] = col.title;
  });

  const mapping = {};

  sheet.rows.forEach(row => {
    const record = {};

    row.cells.forEach(cell => {
      const columnName = columns[cell.columnId];
      record[columnName] = cell.displayValue ?? cell.value ?? "";
    });

    /*
      Expected Smartsheet table format:
      Name | Code

      Example:
      Project Name | Project Code
      Trade Name   | Trade Code

      This logic is flexible:
      - first column = label/name
      - second column = code/value
    */
    const values = Object.values(record);
    const name = values[0];
    const code = values[1];

    if (name && code) {
      mapping[String(name).trim()] = String(code).trim();
    }
  });

  return mapping;
}

export default async function handler(req, res) {
  try {
    const result = {};

    for (const [key, sheetId] of Object.entries(SHEETS)) {
      const sheet = await fetchSheet(sheetId);
      result[key] = sheetToMapping(sheet);
    }

    result.design = design;
    result.query = query;

    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");

    return res.status(200).json(result);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: "Failed to fetch Smartsheet mappings",
      details: error.message
    });
  }
}
