// Cloudflare Pages: las direcciones viejas (rusticando.pages.dev y www) llevan al dominio propio,
// con redirección permanente (301) para que Google indexe una sola web.
const DOMAIN = 'rusticandouy.com';
const OLD_HOSTS = ['rusticando.pages.dev', 'www.' + DOMAIN];

export async function onRequest({ request, next }) {
  const url = new URL(request.url);
  if (OLD_HOSTS.includes(url.hostname)) {
    url.hostname = DOMAIN;
    url.protocol = 'https:';
    return Response.redirect(url.toString(), 301);
  }
  return next();
}
