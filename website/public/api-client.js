// DUO MESH API client — loaded globally via BaseLayout
const API_BASE = 'http://localhost:3000'

async function fetchAPI(path, init) {
  const res = await fetch(API_BASE + path, {
    headers: { 'Content-Type': 'application/json', ...(init && init.headers) },
    ...(init || {})
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.message || 'API error: ' + res.status)
  }
  return res.json()
}

window.api = {
  artists: {
    list: (page, search) =>
      fetchAPI('/api/artists?page=' + (page || 1) + '&pageSize=12' + (search ? '&search=' + encodeURIComponent(search) : '')),
    get: (id) => fetchAPI('/api/artists/' + id),
    getArtworks: (id, page) =>
      fetchAPI('/api/artists/' + id + '/artworks?page=' + (page || 1) + '&pageSize=20'),
  },
  artworks: {
    list: (params) => {
      var qs = new URLSearchParams()
      if (params) Object.keys(params).forEach(function(k) { if (params[k]) qs.set(k, params[k]) })
      return fetchAPI('/api/artworks?' + qs.toString())
    },
    get: (id) => fetchAPI('/api/artworks/' + id),
  },
  halls: {
    get: (slug) => fetchAPI('/api/halls/' + slug),
  },
  artKeys: {
    verify: (keyCode) => fetchAPI('/api/art-keys/' + keyCode),
  },
  search: {
    query: (q) => fetchAPI('/api/search?q=' + encodeURIComponent(q)),
  },
  inquiries: {
    create: (body) => fetchAPI('/api/inquiries', { method: 'POST', body: JSON.stringify(body) }),
  },
}
