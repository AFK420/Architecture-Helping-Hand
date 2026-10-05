import { pathToFileURL } from 'node:url';
/** Optional QA dependency stays separate from the frontend and unit suite. */
export async function loadReportTestBrowser() {
  const moduleURL=process.env.AHH_PLAYWRIGHT_MODULE?pathToFileURL(process.env.AHH_PLAYWRIGHT_MODULE).href:new URL('../../tools/report-runtime/node_modules/playwright/index.mjs',import.meta.url).href;
  const module=await import(moduleURL);
  const options={headless:true,...(process.env.AHH_CHROMIUM_PATH?{executablePath:process.env.AHH_CHROMIUM_PATH}:{})};
  try{return await module.chromium.launch(options);}catch(error){if(options.executablePath)throw error;return await module.chromium.launch({...options,channel:'msedge'});}
}
