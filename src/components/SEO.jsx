// SEO.jsx - Dynamic meta tags using react-helmet-async
import { Helmet } from 'react-helmet-async'

const defaultMeta = {
  title: 'Cosmos - Peer Learning Platform',
  description: 'Turn intent into progress. Join learning pods, ship daily proofs, and grow with peers who hold you accountable.',
  image: 'https://novaxtritan.github.io/Calypso/og.png',
  url: 'https://novaxtritan.github.io/Calypso'
}

export default function SEO({
  title,
  description,
  image,
  path = '',
  type = 'website'
}) {
  const meta = {
    title: title ? `${title} | Cosmos` : defaultMeta.title,
    description: description || defaultMeta.description,
    image: image || defaultMeta.image,
    url: `${defaultMeta.url}${path}`
  }

  return (
    <Helmet>
      <title>{meta.title}</title>
      <meta name="description" content={meta.description} />

      {/* Open Graph */}
      <meta property="og:title" content={meta.title} />
      <meta property="og:description" content={meta.description} />
      <meta property="og:image" content={meta.image} />
      <meta property="og:url" content={meta.url} />
      <meta property="og:type" content={type} />

      {/* Twitter */}
      <meta name="twitter:title" content={meta.title} />
      <meta name="twitter:description" content={meta.description} />
      <meta name="twitter:image" content={meta.image} />

      {/* Canonical */}
      <link rel="canonical" href={meta.url} />
    </Helmet>
  )
}
