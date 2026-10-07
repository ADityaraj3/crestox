export function getCookie(cname : String) {
  if (typeof document === 'undefined') return '';
  var name = cname + '=';
  var decodedCookie = decodeURIComponent(document.cookie);
  var ca = decodedCookie.split(';');
  for (var i = 0; i < ca.length; i++) {
    var c = ca[i];
    while (c.charAt(0) === ' ') {
      c = c.substring(1);
    }
    if (c.indexOf(name) === 0) {
      return c.substring(name.length, c.length);
    }
  }
  return '';
}

/** Lifetime of the login cookie; matches the backend JWT expiry (24h). */
export const AUTH_TOKEN_COOKIE_DAYS = 1;

// SameSite keeps the cookie out of cross-site requests; Secure keeps it off
// plain-HTTP connections (skipped on http://localhost so local dev still works).
function cookieSecurityAttributes() {
  const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
  return ';SameSite=Lax' + (isHttps ? ';Secure' : '');
}

export function setCookie(cname : String, cvalue : String, exdays = AUTH_TOKEN_COOKIE_DAYS) {
  if (typeof document === 'undefined') return;
  var d = new Date();
  d.setTime(d.getTime() + exdays * 24 * 60 * 60 * 1000);
  var expires = 'expires=' + d.toUTCString();
  document.cookie = cname + '=' + cvalue + ";" + expires + ';path=/' + cookieSecurityAttributes();
}
export function clearCookie(cname : String) {
  setCookie(cname, '', -1);
}
