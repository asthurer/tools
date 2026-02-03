
/**
 * SUPABASE CONFIGURATION
 * 
 * Replace these values with your actual Supabase project details.
 * These will be used as the primary connection source. 
 * If left empty, the app will attempt to use values saved in the browser's LocalStorage.
 */
export const SUPABASE_CONFIG = {
  URL: 'https://mevpmrswkravkqngflvi.supabase.co', 
  ANON_KEY: 'sb_publishable_PET-e9e6MiKhFCfNByedJw_TCpTSpzI', 
};

export const IS_CONFIGURED = () => {
  return (SUPABASE_CONFIG.URL !== '' && SUPABASE_CONFIG.ANON_KEY !== '') || 
         (localStorage.getItem('supabase_url') !== null && localStorage.getItem('supabase_key') !== null);
};
