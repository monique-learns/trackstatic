// src/lib/google-sheet-utils.ts

// Hardcoded Google Apps Script URL
const SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbz0h0iE9oPi6ek-ZVuoUFWR7VLLcCTAsWsbHdms2t77m7Rnkp8Ln9PRwv_oRSfhYMX-qQ/exec";

interface SheetResponse {
  success?: boolean;
  message?: string;
  error?: string;
  id?: string; // For add/update/delete responses confirming the ID
  data?: any; // For get all, often an array
  addedData?: any; // Specific data returned for add operations
  updatedData?: any; // Specific data returned for update operations
  rawResponse?: string; // For non-JSON success responses
}

/**
 * Generic GET request handler to fetch data from the Google Sheet.
 * @param action The action string for the Apps Script doGet function.
 * @returns Promise<any | null> Parsed JSON data or null on error.
 */
async function fetchDataFromSheet(action: string): Promise<any | null> {
  if (!SCRIPT_URL) {
    console.error(
      "Google Apps Script URL is not configured (SCRIPT_URL constant is empty)."
    );
    // alert("Google Apps Script URL is not configured."); // Consider user-facing feedback
    return null;
  }
  try {
    const response = await fetch(`${SCRIPT_URL}?action=${action}`, {
      method: "GET",
    });
    if (!response.ok) {
      const errorData: SheetResponse = await response
        .json()
        .catch(() => ({ error: "Unknown error fetching data" }));
      console.error(
        `Error fetching ${action}:`,
        response.status,
        errorData.error || response.statusText
      );
      // alert(`Error fetching ${action}: ${errorData.error || response.statusText}`);
      throw new Error(
        `HTTP error! status: ${response.status}, message: ${
          errorData.error || response.statusText
        }`
      );
    }
    return await response.json();
  } catch (error: any) {
    console.error(`Failed to fetch ${action}:`, error);
    // alert(`Failed to fetch ${action}: ${error.message}`);
    return null;
  }
}

/**
 * Generic POST request handler to send data to the Google Sheet.
 * @param action The action string for the Apps Script doPost function.
 * @param payload The data payload for the action.
 * @returns Promise<SheetResponse | null> Response from the Apps Script or null on error.
 */
async function postDataToSheet(
  action: string,
  payload: any
): Promise<SheetResponse | null> {
  if (!SCRIPT_URL) {
    console.error(
      "Google Apps Script URL is not configured (SCRIPT_URL constant is empty)."
    );
    // alert("Google Apps Script URL is not configured.");
    return null;
  }
  try {
    const response = await fetch(SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify({ action, payload }),
    });

    const responseText = await response.text();

    if (!response.ok) {
      let errorData: SheetResponse = {
        error: "Unknown error performing action",
      };
      try {
        errorData = JSON.parse(responseText);
      } catch (e) {
        console.warn("Response was not valid JSON:", responseText);
        errorData.error = responseText.substring(0, 200);
      }
      console.error(
        `Error performing ${action}:`,
        response.status,
        errorData.error || response.statusText
      );
      // alert(`Error performing ${action}: ${errorData.error || response.statusText}`);
      throw new Error(
        `HTTP error! status: ${response.status}, message: ${
          errorData.error || response.statusText
        }`
      );
    }

    try {
      return JSON.parse(responseText);
    } catch (e) {
      console.warn(
        `Response for ${action} was not valid JSON, but request was successful:`,
        responseText
      );
      return {
        success: true,
        message: "Action completed, but response was not standard JSON.",
        rawResponse: responseText,
      };
    }
  } catch (error: any) {
    console.error(`Failed to perform ${action}:`, error);
    // alert(`Failed to perform ${action}: ${error.message}`);
    return {
      error:
        error.message ||
        "Failed to perform action due to a network or script error.",
    };
  }
}

// --- Accounts ---
// Payload for addAccountToSheet: { "ID": "uuid", "Name": "...", "Type": "...", ... } // Keys should match HEADERS_ACCOUNTS in Code.gs
// Payload for updateAccountInSheet: { "ID": "existing-id", "Name": "new name", ... }
// Payload for deleteAccountFromSheet: { "ID": "id-to-delete" }
export async function getAccountsFromSheet() {
  return fetchDataFromSheet("getAccounts");
}
export async function addAccountToSheet(accountData: any) {
  return postDataToSheet("addAccount", accountData);
}
export async function updateAccountInSheet(accountData: any) {
  return postDataToSheet("updateAccount", accountData);
}
export async function deleteAccountFromSheet(accountId: string) {
  return postDataToSheet("deleteAccount", { ID: accountId });
}

// --- Transactions ---
// Payload for add: { "ID": "uuid", "Date": "iso-string", "Description": "...", ... } // Keys should match HEADERS_TRANSACTIONS
// Payload for update: { "ID": "existing-id", "Description": "new desc", ... }
// Payload for delete: { "ID": "id-to-delete" }
export async function getTransactionsFromSheet() {
  return fetchDataFromSheet("getTransactions");
}
export async function addTransactionToSheet(transactionData: any) {
  return postDataToSheet("addTransaction", transactionData);
}
export async function updateTransactionInSheet(transactionData: any) {
  return postDataToSheet("updateTransaction", transactionData);
}
export async function deleteTransactionFromSheet(transactionId: string) {
  return postDataToSheet("deleteTransaction", { ID: transactionId });
}

// --- Planned Transactions ---
// Payload for add: { "ID": "uuid", "Description": "...", ... } // Keys should match HEADERS_PLANNED_TRANSACTIONS
// Payload for update: { "ID": "existing-id", "Description": "new desc", ... }
// Payload for delete: { "ID": "id-to-delete" }
export async function getPlannedTransactionsFromSheet() {
  return fetchDataFromSheet("getPlannedTransactions");
}
export async function addPlannedTransactionToSheet(
  plannedTransactionData: any
) {
  return postDataToSheet("addPlannedTransaction", plannedTransactionData);
}
export async function updatePlannedTransactionInSheet(
  plannedTransactionData: any
) {
  return postDataToSheet("updatePlannedTransaction", plannedTransactionData);
}
export async function deletePlannedTransactionFromSheet(
  plannedTransactionId: string
) {
  return postDataToSheet("deletePlannedTransaction", {
    ID: plannedTransactionId,
  });
}

// --- Budgets ---
// Payload for add: { "ID": "uuid", "Name": "...", "StartDate": "iso-string", ... } // Keys should match HEADERS_BUDGETS
// Payload for update: { "ID": "existing-id", "Name": "new name", ... }
// Payload for delete: { "ID": "id-to-delete" }
export async function getBudgetsFromSheet() {
  return fetchDataFromSheet("getBudgets");
}
export async function addBudgetToSheet(budgetData: any) {
  return postDataToSheet("addBudget", budgetData);
}
export async function updateBudgetInSheet(budgetData: any) {
  return postDataToSheet("updateBudget", budgetData);
}
export async function deleteBudgetFromSheet(budgetId: string) {
  return postDataToSheet("deleteBudget", { ID: budgetId });
}

// --- Saved Statements ---
// Payload for add: { "ID": "uuid", "AccountID": "...", "StartDate": "iso-string", ... } // Keys should match HEADERS_SAVED_STATEMENTS
// Payload for update: { "ID": "existing-id", "OpeningBalance": "new balance", ... }
// Payload for delete: { "ID": "id-to-delete" }
export async function getSavedStatementsFromSheet() {
  return fetchDataFromSheet("getSavedStatements");
}
export async function addSavedStatementToSheet(statementData: any) {
  return postDataToSheet("addSavedStatement", statementData);
}
export async function updateSavedStatementInSheet(statementData: any) {
  return postDataToSheet("updateSavedStatement", statementData);
}
export async function deleteSavedStatementFromSheet(statementId: string) {
  return postDataToSheet("deleteSavedStatement", { ID: statementId });
}

// --- App Settings ---
// Payload for add: { "Name": "setting-name", "Value": "setting-value" } // Keys should match HEADERS_APP_SETTINGS
// Payload for update: { "Name": "setting-name", "Value": "new-value" }
// Payload for delete: { "Name": "setting-name-to-delete" }
export async function getAppSettingsFromSheet() {
  return fetchDataFromSheet("getAppSettings");
}
export async function addAppSettingToSheet(settingData: {
  Name: string;
  Value: any;
}) {
  return postDataToSheet("addAppSetting", settingData);
}
export async function updateAppSettingInSheet(settingData: {
  Name: string;
  Value: any;
}) {
  return postDataToSheet("updateAppSetting", settingData);
}
export async function deleteAppSettingFromSheet(settingName: string) {
  return postDataToSheet("deleteAppSetting", { Name: settingName });
}
