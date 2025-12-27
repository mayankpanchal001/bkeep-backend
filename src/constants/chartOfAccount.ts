/**
 * Chart of Account constants
 */

export const CHART_OF_ACCOUNT_SAMPLE = {
  /**
   * Sample file filename
   */
  FILENAME: 'Bkeep_Chart_of_Accounts_Sample_File.xlsx',

  /**
   * XLSX content type
   */
  CONTENT_TYPE:
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',

  /**
   * Worksheet name
   */
  WORKSHEET_NAME: 'Chart of Accounts',

  /**
   * Column headers
   */
  HEADERS: [
    'Account Number',
    'Account Name',
    'Type',
    'Detail Type',
    'Opening Balance',
  ] as const,

  /**
   * Column widths (in characters)
   */
  COLUMN_WIDTHS: [
    { wch: 15 }, // Account Number
    { wch: 40 }, // Account Name
    { wch: 20 }, // Type
    { wch: 25 }, // Detail Type
    { wch: 18 }, // Opening Balance
  ] as const,

  /**
   * Instruction messages
   */
  INSTRUCTIONS: [
    'DO NOT IMPORT! DATA IS FOR SAMPLE PURPOSES ONLY.',
    '*Import opening balances for Balance Sheet accounts only',
    '*Line 5 is an example of a sub-account',
  ] as const,

  /**
   * Available fields for import mapping
   */
  IMPORT_FIELDS: [
    {
      key: 'accountNumber',
      label: 'Account Number',
      required: false,
    },
    {
      key: 'accountName',
      label: 'Account Name',
      required: true,
    },
    {
      key: 'accountType',
      label: 'Type',
      required: true,
    },
    {
      key: 'accountDetailType',
      label: 'Detail Type',
      required: false,
    },
    {
      key: 'openingBalance',
      label: 'Opening Balance',
      required: false,
    },
  ] as const,

  /**
   * Sample data for chart of accounts
   */
  SAMPLE_DATA: [
    {
      accountNumber: '112720',
      accountName: 'TD Canada Trust',
      type: 'asset',
      detailType: 'Chequing',
      openingBalance: '1000',
    },
    {
      accountNumber: '234325',
      accountName: 'Cash',
      type: 'asset',
      detailType: 'Cash',
      openingBalance: '25000',
    },
    {
      accountNumber: '3445',
      accountName: 'Property Plant & Equipment',
      type: 'asset',
      detailType: 'Other fixed assets',
      openingBalance: '',
    },
    {
      accountNumber: '1123',
      accountName: 'Property Plant & Equipment:Computer Equipment',
      type: 'asset',
      detailType: 'Other fixed assets',
      openingBalance: '15000',
    },
    {
      accountNumber: '',
      accountName: 'Cost of Materials',
      type: 'expense',
      detailType: 'Materials',
      openingBalance: '54000',
    },
    {
      accountNumber: '1000',
      accountName: 'Chequing',
      type: 'asset',
      detailType: 'Chequing',
      openingBalance: '5400',
    },
  ] as const,
} as const
