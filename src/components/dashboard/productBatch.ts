export interface ProductNameSerialPair {
  productName: string;
  serialNumber: string;
}

const MULTI_VALUE_SEPARATOR = /[\r\n\t,;|]+/;
const SERIAL_VALUE_SEPARATOR = /[\s,;|]+/;

export const splitBatchValues = (value: string): string[] =>
  value
    .split(MULTI_VALUE_SEPARATOR)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

export const splitSerialValues = (value: string): string[] =>
  value
    .split(SERIAL_VALUE_SEPARATOR)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

export const expandProductNameSerialPairs = (
  productNameInput: string,
  serialNumberInput: string,
): { pairs: ProductNameSerialPair[]; error?: string } => {
  const productNames = splitBatchValues(productNameInput);
  const serialNumbers = splitSerialValues(serialNumberInput);

  if (productNames.length === 0) {
    return { pairs: [], error: "Product name is required" };
  }

  if (productNames.length > 1 && serialNumbers.length === 1) {
    return {
      pairs: [],
      error: "When using multiple product names, provide one serial per product or leave serial numbers empty",
    };
  }

  if (productNames.length > 1 && serialNumbers.length > 1 && productNames.length !== serialNumbers.length) {
    return {
      pairs: [],
      error: "Product name count and serial number count must match",
    };
  }

  if (productNames.length === 1 && serialNumbers.length > 1) {
    return {
      pairs: serialNumbers.map((serialNumber) => ({
        productName: productNames[0],
        serialNumber,
      })),
    };
  }

  if (productNames.length > 1) {
    return {
      pairs: productNames.map((productName, index) => ({
        productName,
        serialNumber: serialNumbers[index] || "",
      })),
    };
  }

  return {
    pairs: [
      {
        productName: productNames[0],
        serialNumber: serialNumbers[0] || "",
      },
    ],
  };
};
