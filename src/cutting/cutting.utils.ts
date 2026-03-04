export function generateBundleCode(
  factoryCode: string,
  batchNo: string,
  sequence: number,
) {
  return `BND-${factoryCode}-${batchNo}-${String(sequence).padStart(3, '0')}`;
}
