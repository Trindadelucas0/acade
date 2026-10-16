import base from './playwright.config.js'
export default { ...base, use: { ...base.use, baseURL: 'http://localhost:4459', extraHTTPHeaders: { Origin: 'http://localhost:4459' } }, webServer: undefined }
