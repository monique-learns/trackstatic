// Google Apps Script - Code.gs for TrackStatic

// --- Configuration ---
// Option 1: Get ID of the spreadsheet this script is bound to
const SPREADSHEET_ID = SpreadsheetApp.getActiveSpreadsheet().getId();
// Option 2: Or, hardcode your Spreadsheet ID if necessary (e.g., if script is standalone)
// const SPREADSHEET_ID = "YOUR_SPREADSHEET_ID_HERE";

const ACCOUNTS_SHEET_NAME = "Accounts";
const TRANSACTIONS_SHEET_NAME = "Transactions";
const PLANNED_TRANSACTIONS_SHEET_NAME = "PlannedTransactions"; // Reverted to user's original
const BUDGETS_SHEET_NAME = "Budgets";
const SAVED_STATEMENTS_SHEET_NAME = "SavedStatements"; // Reverted to user's original
const APP_SETTINGS_SHEET_NAME = "AppSettings";

// Define headers for each sheet. CRITICAL: These MUST match the column order in your Google Sheet.
// 'ID' (or 'Name' for AppSettings) is expected to be the first column for easier lookup.
const HEADERS_ACCOUNTS = [
  "ID",
  "Name",
  "Type",
  "Balance",
  "Currency",
  "StatementClosingDay",
  "PreferredPaymentDay",
  "Notes",
];
const HEADERS_TRANSACTIONS = [
  "ID",
  "Date",
  "Description",
  "Amount",
  "Nature",
  "CategoryValue",
  "AccountID",
  "FromAccountID",
  "ToAccountID",
  "LinkedStatementID",
  "Notes",
];
const HEADERS_PLANNED_TRANSACTIONS = [
  "ID",
  "Description",
  "Amount",
  "Nature",
  "CategoryValue",
  "DueDate",
  "RecurrenceType",
  "RecurrenceInterval",
  "RecurrenceDaysOfWeek",
  "RecurrenceEnds",
  "RecurrenceEndDate",
  "RecurrenceEndAfterOccurrences",
  "IsActive",
  "AccountID",
  "FromAccountID",
  "ToAccountID",
  "Notes",
];
const HEADERS_BUDGETS = ["ID", "Name", "StartDate", "EndDate"];
const HEADERS_SAVED_STATEMENTS = [
  "ID",
  "AccountID",
  "StartDate",
  "EndDate",
  "OpeningBalance",
  "ClosingBalance",
  "TotalDebits",
  "TotalCredits",
  "TransactionIDs",
  "TotalLinkedPaymentsAmount",
];
const HEADERS_APP_SETTINGS = ["Name", "Value"];

// --- Main Handlers ---

function doGet(e) {
  try {
    const action = e.parameter.action;
    let data;
    let output;

    switch (action) {
      case "getAccounts":
        data = getAllData(ACCOUNTS_SHEET_NAME, HEADERS_ACCOUNTS);
        break;
      case "getTransactions":
        data = getAllData(TRANSACTIONS_SHEET_NAME, HEADERS_TRANSACTIONS);
        break;
      case "getPlannedTransactions":
        data = getAllData(
          PLANNED_TRANSACTIONS_SHEET_NAME,
          HEADERS_PLANNED_TRANSACTIONS
        );
        break;
      case "getBudgets":
        data = getAllData(BUDGETS_SHEET_NAME, HEADERS_BUDGETS);
        break;
      case "getSavedStatements":
        data = getAllData(
          SAVED_STATEMENTS_SHEET_NAME,
          HEADERS_SAVED_STATEMENTS
        );
        break;
      case "getAppSettings":
        data = getAllData(APP_SETTINGS_SHEET_NAME, HEADERS_APP_SETTINGS);
        break;
      default:
        output = ContentService.createTextOutput(
          JSON.stringify({ error: "Invalid action for GET request: " + action })
        );
        output.setMimeType(ContentService.MimeType.JSON);
        return output; // Return 400 equivalent
    }
    output = ContentService.createTextOutput(JSON.stringify(data));
    output.setMimeType(ContentService.MimeType.JSON);
    return output;
  } catch (error) {
    Logger.log(
      "Error in doGet: " +
        error.toString() +
        (e.parameter ? " Params: " + JSON.stringify(e.parameter) : "")
    );
    let output = ContentService.createTextOutput(
      JSON.stringify({ error: "Server error in doGet: " + error.toString() })
    );
    output.setMimeType(ContentService.MimeType.JSON);
    return output; // Return 500 equivalent
  }
}

function doPost(e) {
  let output;
  try {
    if (!e || !e.postData || !e.postData.contents) {
      Logger.log(
        "Error in doPost: Invalid or missing e.postData.contents. Request details: " +
          JSON.stringify(e)
      );
      output = ContentService.createTextOutput(
        JSON.stringify({ error: "Invalid request: Missing post data." })
      );
      output.setMimeType(ContentService.MimeType.JSON);
      return output;
    }

    const requestBody = JSON.parse(e.postData.contents);
    const action = requestBody.action;
    const payload = requestBody.payload;
    let result;

    Logger.log(
      "doPost received action: " +
        action +
        ", Payload: " +
        JSON.stringify(payload)
    );

    if (!action) {
      output = ContentService.createTextOutput(
        JSON.stringify({ error: "Missing action" })
      );
      output.setMimeType(ContentService.MimeType.JSON);
      output.withHeaders({
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      });
      return output;
    }
    if (
      (action.startsWith("add") ||
        action.startsWith("update") ||
        action.startsWith("delete")) &&
      !payload
    ) {
      output = ContentService.createTextOutput(
        JSON.stringify({ error: "Missing payload for " + action })
      );
      output.setMimeType(ContentService.MimeType.JSON);
      return output;
    }

    // ID check for update/delete, specific for AppSettings using "Name"
    const isAppSettingsAction = action.toLowerCase().includes("appsetting");
    const idKey = isAppSettingsAction ? HEADERS_APP_SETTINGS[0] : "ID"; // "Name" or "ID"

    if (
      (action.startsWith("update") || action.startsWith("delete")) &&
      (!payload || !payload[idKey])
    ) {
      output = ContentService.createTextOutput(
        JSON.stringify({
          error: "Missing " + idKey + " in payload for " + action,
        })
      );
      output.setMimeType(ContentService.MimeType.JSON);
      return output;
    }

    switch (action) {
      // Add Actions
      case "addAccount":
        result = addData(ACCOUNTS_SHEET_NAME, payload, HEADERS_ACCOUNTS);
        break;
      case "addTransaction":
        result = addData(
          TRANSACTIONS_SHEET_NAME,
          payload,
          HEADERS_TRANSACTIONS
        );
        break;
      case "addPlannedTransaction":
        result = addData(
          PLANNED_TRANSACTIONS_SHEET_NAME,
          payload,
          HEADERS_PLANNED_TRANSACTIONS
        );
        break;
      case "addBudget":
        result = addData(BUDGETS_SHEET_NAME, payload, HEADERS_BUDGETS);
        break;
      case "addSavedStatement":
        result = addData(
          SAVED_STATEMENTS_SHEET_NAME,
          payload,
          HEADERS_SAVED_STATEMENTS
        );
        break;
      case "addAppSetting":
        result = addData(
          APP_SETTINGS_SHEET_NAME,
          payload,
          HEADERS_APP_SETTINGS
        );
        break;

      // Update Actions
      case "updateAccount":
        result = updateData(
          ACCOUNTS_SHEET_NAME,
          payload[HEADERS_ACCOUNTS[0]],
          payload,
          HEADERS_ACCOUNTS
        );
        break;
      case "updateTransaction":
        result = updateData(
          TRANSACTIONS_SHEET_NAME,
          payload[HEADERS_TRANSACTIONS[0]],
          payload,
          HEADERS_TRANSACTIONS
        );
        break;
      case "updatePlannedTransaction":
        result = updateData(
          PLANNED_TRANSACTIONS_SHEET_NAME,
          payload[HEADERS_PLANNED_TRANSACTIONS[0]],
          payload,
          HEADERS_PLANNED_TRANSACTIONS
        );
        break;
      case "updateBudget":
        result = updateData(
          BUDGETS_SHEET_NAME,
          payload[HEADERS_BUDGETS[0]],
          payload,
          HEADERS_BUDGETS
        );
        break;
      case "updateSavedStatement":
        result = updateData(
          SAVED_STATEMENTS_SHEET_NAME,
          payload[HEADERS_SAVED_STATEMENTS[0]],
          payload,
          HEADERS_SAVED_STATEMENTS
        );
        break;
      case "updateAppSetting":
        result = updateData(
          APP_SETTINGS_SHEET_NAME,
          payload[HEADERS_APP_SETTINGS[0]],
          payload,
          HEADERS_APP_SETTINGS
        );
        break;

      // Delete Actions
      case "deleteAccount":
        result = deleteData(
          ACCOUNTS_SHEET_NAME,
          payload[HEADERS_ACCOUNTS[0]],
          HEADERS_ACCOUNTS
        );
        break;
      case "deleteTransaction":
        result = deleteData(
          TRANSACTIONS_SHEET_NAME,
          payload[HEADERS_TRANSACTIONS[0]],
          HEADERS_TRANSACTIONS
        );
        break;
      case "deletePlannedTransaction":
        result = deleteData(
          PLANNED_TRANSACTIONS_SHEET_NAME,
          payload[HEADERS_PLANNED_TRANSACTIONS[0]],
          HEADERS_PLANNED_TRANSACTIONS
        );
        break;
      case "deleteBudget":
        result = deleteData(
          BUDGETS_SHEET_NAME,
          payload[HEADERS_BUDGETS[0]],
          HEADERS_BUDGETS
        );
        break;
      case "deleteSavedStatement":
        result = deleteData(
          SAVED_STATEMENTS_SHEET_NAME,
          payload[HEADERS_SAVED_STATEMENTS[0]],
          HEADERS_SAVED_STATEMENTS
        );
        break;
      case "deleteAppSetting":
        result = deleteData(
          APP_SETTINGS_SHEET_NAME,
          payload[HEADERS_APP_SETTINGS[0]],
          HEADERS_APP_SETTINGS
        );
        break;

      default:
        output = ContentService.createTextOutput(
          JSON.stringify({
            error: "Invalid action for POST request: " + action,
          })
        );
        output.setMimeType(ContentService.MimeType.JSON);
        return output;
    }
    output = ContentService.createTextOutput(JSON.stringify(result));
    output.setMimeType(ContentService.MimeType.JSON);
    output.withHeaders({
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    });
    return output;
  } catch (error) {
    Logger.log(
      "Error in doPost: " +
        error.toString() +
        " Raw Payload: " +
        (e && e.postData ? e.postData.contents : "N/A")
    );
    output = ContentService.createTextOutput(
      JSON.stringify({ error: "Server error in doPost: " + error.toString() })
    );
    output.setMimeType(ContentService.MimeType.JSON);
    return output;
  }
}

// --- Helper Functions ---

function getSheetAndHeaders(sheetName, expectedHeaders) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    throw new Error("Sheet not found: " + sheetName);
  }
  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();
  const idKey = expectedHeaders[0]; // e.g., "ID" or "Name"

  if (values.length === 0) {
    // Sheet is completely empty
    Logger.log(
      "Sheet '" +
        sheetName +
        "' is empty. Attempting to set headers: " +
        expectedHeaders.join(", ")
    );
    sheet.appendRow(expectedHeaders); // Add header row
    return {
      sheet: sheet,
      headers: expectedHeaders,
      values: [expectedHeaders],
      idColumnIndex: 0,
    }; // ID is always first
  }

  const actualHeaders = values[0];
  const idColumnIndex = actualHeaders.indexOf(idKey); // Find based on expected primary key

  if (idColumnIndex === -1) {
    Logger.log(
      idKey +
        " column not found in sheet: " +
        sheetName +
        ". Headers found: " +
        actualHeaders.join(", ") +
        ". Expected first header: " +
        idKey
    );
    // If the sheet wasn't empty but headers were wrong, attempt to set them.
    // This is a bit aggressive for a getSheetAndHeaders function.
    // Consider if this is the right place or if it should throw an error.
    // For now, let's assume if ID is missing, the headers are wrong and need to be set.
    // sheet.clearContents(); // Be careful with this!
    // sheet.appendRow(expectedHeaders);
    // return { sheet: sheet, headers: expectedHeaders, values: [expectedHeaders] , idColumnIndex: 0 };
    throw new Error(
      idKey +
        " column not found in sheet: " +
        sheetName +
        ". Please ensure '" +
        idKey +
        "' column exists and is correctly named as the first column."
    );
  }

  return {
    sheet: sheet,
    headers: actualHeaders,
    values: values,
    idColumnIndex: idColumnIndex,
  };
}

function mapRowToObject(rowValues, headers) {
  const entry = {};
  headers.forEach((header, index) => {
    let value = rowValues[index];
    const lowerHeader = header.toLowerCase();

    if (value === undefined || value === null || value === "") {
      return;
    }

    if (lowerHeader.includes("date") && value instanceof Date) {
      value = value.toISOString();
    } else if (
      lowerHeader.includes("date") &&
      typeof value === "string" &&
      value.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
    ) {
      // Already ISO string, do nothing
    } else if (
      lowerHeader.includes("date") &&
      typeof value === "string" &&
      !isNaN(new Date(value).getTime())
    ) {
      value = new Date(value).toISOString(); // Try to parse if it's a parsable date string
    } else if (lowerHeader === "isactive" && typeof value === "boolean") {
      // value is already boolean
    } else if (
      (lowerHeader.includes("amount") ||
        lowerHeader.includes("balance") ||
        lowerHeader === "recurrenceinterval" ||
        lowerHeader === "recurrenceendafteroccurrences" ||
        lowerHeader === "statementclosingday" ||
        lowerHeader === "preferredpaymentday" ||
        lowerHeader === "totaldebits" ||
        lowerHeader === "totalcredits" ||
        lowerHeader === "openingbalance" ||
        lowerHeader === "closingbalance" ||
        lowerHeader === "totallinkedpaymentsamount") &&
      typeof value === "number"
    ) {
      value = parseFloat(value.toString());
    } else if (
      lowerHeader === "transactionids" &&
      typeof value === "string" &&
      value.length > 0
    ) {
      value = value.split(",");
    } else if (
      lowerHeader === "recurrencedaysofweek" &&
      typeof value === "string" &&
      value.length > 0
    ) {
      value = value.split(",").map(Number);
    }
    entry[header] = value;
  });
  return entry;
}

function getAllData(sheetName, expectedHeaders) {
  const { headers, values, idColumnIndex } = getSheetAndHeaders(
    sheetName,
    expectedHeaders
  );
  if (values.length < 2) return []; // Only headers or empty

  const idKey = headers[idColumnIndex]; // Get the actual name of the ID column from sheet headers
  const data = [];
  for (let i = 1; i < values.length; i++) {
    const entry = mapRowToObject(values[i], headers);
    if (entry[idKey]) {
      // Only include rows that have a value in the ID/Name column
      data.push(entry);
    }
  }
  return data;
}

function prepareRowData(payload, orderedSheetHeaders) {
  return orderedSheetHeaders.map((header) => {
    let value = payload[header]; // Payload keys MUST match sheet headers
    const lowerHeader = header.toLowerCase();

    if (lowerHeader.includes("date") && value && !(value instanceof Date)) {
      const parsedDate = new Date(value);
      if (!isNaN(parsedDate.getTime())) {
        value = parsedDate;
      } else {
        value = ""; // Invalid date string
      }
    } else if (lowerHeader === "recurrencedaysofweek" && Array.isArray(value)) {
      value = value.join(",");
    } else if (lowerHeader === "transactionids" && Array.isArray(value)) {
      value = value.join(",");
    } else if (typeof value === "boolean") {
      value = value; // Keep booleans as booleans for Sheets
    } else if (value === null || value === undefined) {
      value = ""; // Use "" for undefined/null to avoid issues in Sheets
    }
    return value;
  });
}

function addData(sheetName, payload, orderedHeaders) {
  const { sheet, headers: actualHeaders } = getSheetAndHeaders(
    sheetName,
    orderedHeaders
  ); // Use actualHeaders for preparing row
  const idKey = orderedHeaders[0]; // "ID" or "Name"

  if (!payload[idKey] && sheetName !== APP_SETTINGS_SHEET_NAME) {
    // AppSettings "Name" must be provided
    payload[idKey] = Utilities.getUuid();
  } else if (sheetName === APP_SETTINGS_SHEET_NAME && !payload[idKey]) {
    throw new Error("Payload for AppSettings must include '" + idKey + "'.");
  }

  const newRow = prepareRowData(payload, actualHeaders); // Prepare using actual sheet header order
  sheet.appendRow(newRow);
  return {
    success: true,
    message: "Data added successfully",
    id: payload[idKey],
    addedData: payload,
  };
}

function updateData(sheetName, idToUpdate, updateObject, orderedHeaders) {
  const { sheet, headers, values, idColumnIndex } = getSheetAndHeaders(
    sheetName,
    orderedHeaders
  );
  const idKey = headers[idColumnIndex]; // Actual ID column name from sheet

  if (idColumnIndex === -1)
    return { error: idKey + " column not found in sheet: " + sheetName };

  for (let i = 1; i < values.length; i++) {
    if (values[i][idColumnIndex] == idToUpdate) {
      // Use '==' for potential type coercion with sheet values
      const existingRowObject = mapRowToObject(values[i], headers);
      const updatedPayload = { ...existingRowObject, ...updateObject };

      const newRowSheetData = prepareRowData(updatedPayload, headers); // Use sheet's actual headers for order

      sheet.getRange(i + 1, 1, 1, headers.length).setValues([newRowSheetData]);
      return {
        success: true,
        message: "Data updated successfully",
        id: idToUpdate,
        updatedData: updatedPayload,
      };
    }
  }
  return {
    error: idKey + " not found for update: " + idToUpdate,
    id: idToUpdate,
  };
}

function deleteData(sheetName, idToDelete, orderedHeaders) {
  const { sheet, values, idColumnIndex } = getSheetAndHeaders(
    sheetName,
    orderedHeaders
  );
  const idKey = orderedHeaders[0]; // "ID" or "Name"

  if (idColumnIndex === -1)
    return { error: idKey + " column not found in sheet: " + sheetName };

  for (let i = values.length - 1; i > 0; i--) {
    // Iterate backwards, skip header
    if (values[i][idColumnIndex] == idToDelete) {
      // Use '=='
      sheet.deleteRow(i + 1); // Sheet rows are 1-indexed
      return {
        success: true,
        message: "Data deleted successfully",
        id: idToDelete,
      };
    }
  }
  return {
    error: idKey + " not found for deletion: " + idToDelete,
    id: idToDelete,
  };
}

function doOptions(e) {
  // This function is crucial for handling preflight requests from the browser.
  // It must return quickly with the correct CORS headers.
  const output = ContentService.createTextOutput(null);
  output.setMimeType(ContentService.MimeType.JSON); // Can be JSON or TEXT
  return output;
}
