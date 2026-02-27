const REPORT_FILENAME_PATTERN = /^session_report_\d+\.md$/;

export function isValidReportFilename(filename) {
    return typeof filename === 'string' && REPORT_FILENAME_PATTERN.test(filename);
}

export { REPORT_FILENAME_PATTERN };
