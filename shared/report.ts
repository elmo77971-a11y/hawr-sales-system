export type ReportFilterInput = { from?: string; to?: string; sellerId?: string };
export function normalizeReportFilters(input: ReportFilterInput) { return { from: input.from || undefined, to: input.to || undefined, sellerId: input.sellerId && Number(input.sellerId) > 0 ? Number(input.sellerId) : undefined }; }
