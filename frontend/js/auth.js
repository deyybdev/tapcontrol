/* =============================================
   auth.js
   Auth guard — include in every page's <head>
   BEFORE utils.js. Redirects to login if no
   session exists.
   ============================================= */
(function () {
  const user = sessionStorage.getItem('tc_user');
  if (!user) {
    window.location.replace('login.html');
  }
})();