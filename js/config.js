/* ==========================================================
   Settings you may want to change
   ========================================================== */

/* Where the sharing backend (the Worker in /worker) lives.
     ''  -> same site as this page (use this if the Worker is routed on your domain)
     or the full address with no trailing slash, for example
     'https://slidey-api.yourname.workers.dev'                                   */
const API_BASE = 'https://slidy.slidy-ppt.workers.dev/';

/* true  -> skip the home page and open the editor straight away.
   false -> show the home page first (this is how the deployed site works today). */
const DIRECT = false;
