# TrackStatic - Personal Finance Tracker

TrackStatic is a user-friendly personal finance application designed to help you manage your transactions, accounts, planned future payments, and budgets with ease. It features a clean, responsive interface and persists all data locally in your browser.

## Core Functionalities

### 1. Transaction Management

- **Record Transactions:** Add new financial transactions (income, expense, or transfer) through an intuitive dialog-based form.
- **Detailed Entry:** Each transaction captures:
  - A clear description.
  - The transaction amount (always entered as a positive value).
  - The date of the transaction (selectable via a calendar).
  - The nature of the transaction: Income, Expense, or Transfer (selected via radio buttons).
  - A relevant category for the transaction, complete with an associated icon (e.g., Food, Transportation, Salary).
  - Optional notes for any additional details.
- **Account Linking:**
  - **Income/Expense:** Link to a single account that is credited (income) or debited (expense). Account balances are automatically updated.
  - **Transfer:** Link to a 'From Account' and a 'To Account'. Balances of both accounts are updated accordingly. Payments to credit card statements can be explicitly linked to a specific statement ID.
- **Edit Transactions:** Modify existing transactions through a pre-filled dialog. Account balances are correctly adjusted upon update.
- **Delete Transactions:** Remove transactions with a confirmation dialog. Account balances are reverted.
- **Transaction History View:**
  - Displays all recorded transactions in a list of collapsible cards.
    - **Summary View (Collapsed):** Shows description, amount, and date.
    - **Detailed View (Expanded):** Reveals type, category (with icon), linked account(s), notes, and any linked statement details for transfers. An "Edit" and "Delete" button are accessible here.
  - **Filtering:** A collapsible section allows users to filter transactions by:
    - Description (text search).
    - Transaction Nature (Income, Expense, Transfer, All).
    - Category.
    - Date range (start and end dates).
    - Amount range (min and max).
    - An indicator shows if any filters are active, and a "Reset Filters" button is available.
  - **Sorting:** Transactions are sorted by date (most recent first).
  - **Scrollable List:** The history view becomes scrollable if it contains more than three items.
  - **Empty States:** Informative messages are displayed if no transactions exist or if active filters yield no results.

### 2. Account Management

- **Record Accounts:** Add new accounts (e.g., Bank Account, Credit Card, Cash, Investment Account) via a dialog form.
  - Captures: Account name, account type (with icon), optional notes.
  - For accounts that have statements (like credit cards or some bank accounts), users can set a **Statement Closing Day** (day of the month).
  - For credit cards, an optional **Preferred Payment Day** can be set.
  - Balance is initialized to 0 and automatically updated by linked transactions.
- **Edit Accounts:** Modify the name, type, notes, statement closing day, and preferred payment day of existing accounts.
- **Delete Accounts:** Remove accounts with a confirmation dialog.
  - Users are warned that associated transactions/planned transactions will not be deleted but may appear unlinked. Associated auto-generated statements are also removed.
- **Account Display:** Accounts are presented in a grid of cards.
  - Each card displays the account name (with icon), current balance, notes, and statement closing day if set.
  - Account balance color indicates positive or negative values.
  - A "View Statements" button is available if a statement closing day is set, opening a dialog to manage and view statements for that account.
- **Scrollable List:** The account grid becomes scrollable if it contains more than two accounts, with a fixed height for consistency.
- **Empty State:** A message is displayed if no accounts have been added.

### 3. Planned Transaction Management

- **Record Planned Transactions:** Schedule future or recurring transactions (income, expense, or transfer) through a comprehensive dialog form.
- **Detailed Entry:** Captures description, amount, nature, category, due/start date, and notes.
- **Account Linking:** Similar to actual transactions, planned income/expenses link to one account, and planned transfers link to 'From' and 'To' accounts.
- **Recurrence Options:**
  - **One-Time:** Default option for non-repeating transactions.
  - **Recurring:** Activated by a "Repeat Transaction" switch.
    - **Type:** Daily, Weekly, Monthly, Yearly.
    - **Interval:** "Every X" days, weeks, months, or years.
    - **Weekly Specifics:** If 'Weekly', users can select specific days of the week (e.g., Monday, Wednesday, Friday).
    - **End Conditions:** Configure when the recurrence stops:
      - "Never"
      - "On Date" (user selects a specific end date).
      - "After X occurrences" (user specifies a number of occurrences).
- **Active/Paused Status:** Planned transactions can be marked as active or paused using a switch in the form. This status is visually indicated in the list.
- **Edit Planned Transactions:** Modify all details of existing planned transactions, including recurrence rules and active status.
- **Delete Planned Transactions:** Remove planned transactions with a confirmation dialog.
- **Planned Transaction History View:**
  - Lists all scheduled transactions in collapsible cards.
  - Each card displays the planned transaction's details, including a descriptive summary of its recurrence rule (e.g., "Weekly on Mon, Wed, Fri, until Dec 31, 2024") and its active/paused status.
  - **Record as Actual:** An option on each planned transaction card allows the user to open the "Add New Transaction" dialog, pre-filled with the planned transaction's details, to easily record it as an actual transaction. This allows for adjustments (e.g., to the amount or date) before final recording.
  - **Sorting:** Planned transactions are sorted by their next due date.
  - **Scrollable List:** The list becomes scrollable if it contains more than three items.
  - **Empty State:** A message is displayed if no planned transactions are scheduled.

### 4. Budget Management

- **Create & Manage Budgets:** Define budgets by giving them a name and specifying a start and end date through a dialog form.
- **Budget Overview:** Budgets are displayed in a scrollable list of cards.
  - Each card shows the budget's name, its period (start to end date), and the calculated remaining balance for that period.
  - The remaining balance is derived from:
    - All _active planned_ income transactions scheduled within the budget's timeframe.
    - All _active planned_ expense transactions (for non-credit card accounts) scheduled within the budget's timeframe.
    - Projected payments for _credit card statements_ whose payment due dates (based on the card's 'Preferred Payment Day' and the statement's closing balance from saved statements) fall within the budget's timeframe.
  - Buttons for editing and deleting budgets are available on each card.
- **Budget Breakdown:**
  - A "View Breakdown" button on each budget card opens a detailed dialog.
  - The breakdown dialog lists:
    - Individual occurrences of planned income transactions within the budget period.
    - Individual occurrences of planned expense transactions (non-credit card) within the budget period.
    - Projected credit card statement payments (based on saved statements and preferred payment days for accounts) that fall within the budget period.
  - A summary at the bottom of the dialog shows Total Planned Income, Total Planned Expenses (split by non-credit card planned expenses and projected CC statement payments), and the Net Amount for the budget period.
- **Dynamic Calculation:** Budget figures are dynamically calculated based on the current set of active planned transactions, their recurrence rules, and relevant saved credit card statements.
- **Empty State:** A message is displayed if no budgets have been created.

### 5. Statement Management

- **App Start Date Setting:** Users can define an "App Start Date" in settings. This date is used as the historical anchor for auto-generating statements.
- **Automatic Statement Generation:**
  - When an account's "Statement Closing Day" is set and an "App Start Date" exists, the system automatically generates historical statements for that account from the app start month up to one year in the future from the current date.
  - The system performs a daily check (on app load if a 24-hour interval has passed since the last check) to ensure statements are generated.
- **Manual Statement Generation:**
  - From the "View Statements" dialog for an account (accessed via the account card), users can select a specific month/year and generate a statement if it doesn't already exist.
  - A button in "App Settings" allows users to manually trigger a check and generation of any missing statements across all eligible accounts.
- **Statement Data:** Each saved statement includes:
  - Account ID, Start Date, End Date.
  - Opening Balance, Closing Balance (calculated based on transactions before and within the period respectively).
  - List of all transactions that occurred strictly within the statement period, relevant to that account.
  - Total Debits and Total Credits for the period.
  - `totalLinkedPaymentsAmount`: The sum of all actual transaction payments explicitly linked by the user to _this specific statement_, regardless of when those payments were made. This is particularly relevant for credit card payments.
- **Statement Viewing:**
  - Users can access a list of saved statements for an account via the "View Statements" button on the account card.
  - The "Statements" view in the bottom navigation allows selecting an account and then a specific saved statement to view its details _inline within the application_.
  - The statement detail view for credit cards shows:
    - Opening/Closing Balance, Total Debits/Credits for the period.
    - `Total Payments Linked`: The `totalLinkedPaymentsAmount` specifically for that statement.
    - `Remaining on Statement`: Calculated as `closingBalance + totalLinkedPaymentsAmount` (a positive value means the statement is paid off or overpaid).
    - A list of "Payments for Other Statements" (payments made from other accounts _to this credit card account_ _during this statement's period_ but explicitly linked to _other_ statement IDs).
    - A list of "Other Transactions" (all other transactions relevant to this account that occurred _within this statement's period_, such as purchases, fees, or income directly to the card if applicable).
- **Deleting Statements:** Statements can be deleted from the "View Statements" dialog for an account.

## Dashboard & Analytics

- **Financial Snapshot:** The dashboard provides a concise overview of your key financial figures.
- **Summary Cards:**
  - **Total Available Funds:** Displays the sum of all positive balances from your 'Bank Account', 'Cash', and 'Investment Account' types.
  - **Total Credit Card Debt:** Shows the sum of the absolute values of all negative balances from your 'Credit Card' accounts.
  - These two cards are displayed side-by-side for a compact view on all screen sizes, offering an at-a-glance summary of your assets and liabilities.

## Data Persistence

- **Local Storage:** All transaction, account, planned transaction, budget data, saved statements, app start date, and the last statement check timestamp are saved in the browser's `localStorage`. This allows data to persist between sessions on the same device and browser.

## User Interface & Experience

- **Navigation:** A sleek bottom navigation bar with icons allows easy switching between "Dashboard", "Transactions", "Accounts", "Planned", "Budgets", and "Statements" views. A settings icon is available in the header to access app-wide configurations like the "App Start Date".
- **Responsive Design:** The application is designed to be mobile-friendly, with UI elements adapting gracefully to various screen sizes.
- **Modern UI Components:** Built using ShadCN UI components for a clean, consistent, and professional look and feel.
- **Layout:**
  - A clear header displays the "TrackStatic" app logo and title, and a settings button.
  - Content for each main section is clearly demarcated.
  - Dialogs are used for adding and editing data, providing a focused user experience.
- **Visual Cues:**
  - Income amounts are styled with a success color.
  - Expense amounts are styled with a destructive color.
  - Transfer amounts are styled with an accent color.
  - Category and account type icons provide quick visual identification.
  - The active/paused status of planned transactions is clearly indicated.
- **User Feedback:** Toast notifications confirm actions like recording, updating, or deleting data, and for statement generation events.
- **Optimized Select Dropdowns:** Dropdown menus are configured to display a limited number of items at a time, with internal scrolling for longer lists.
- **Branding:** Features a distinct "TrackStatic" app logo and title in the header.

## Progressive Web App (PWA) Features

- **Installable:** The application includes a web app manifest (`manifest.json`) and necessary meta tags, allowing users to install it to their home screen on supported mobile and desktop devices.

## Technical Stack

- **Next.js (App Router):** For server-side rendering, routing, and overall application structure.
- **React:** For building the user interface with a component-based architecture.
- **ShadCN UI:** A collection of beautifully designed and accessible UI components.
- **Tailwind CSS:** A utility-first CSS framework for rapid UI development and styling.
- **TypeScript:** For static typing, improving code quality and maintainability.
- **Lucide React:** For a comprehensive set of clear and consistent icons.
- **Zod:** For schema declaration and validation.
- **React Hook Form:** For managing form state and validation.
- **Date-fns:** For robust date manipulation and formatting.

## Style Guidelines:

- Primary color: Moderate violet (#805AD5) to create a calm and trustworthy atmosphere.
- Background color: Very light violet (#F7F3FF), close to white, for a clean and fresh interface.
- Accent color: Sky blue (#56B4D3) for interactive elements and highlights, adding a touch of clarity.
- Body and headline font: 'Inter' (sans-serif) for a modern, readable, neutral design.
- Simple, geometric icons for transaction types and categories.
- Clean and intuitive layout with a focus on readability.
- Smooth transitions and subtle animations for user interactions.
